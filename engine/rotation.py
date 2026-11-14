"""Simulación de rotaciones año por año (corazón de la Máquina del tiempo).

Para cada rotación y cada año real de NASA POWER:
  1. Calendario: cada cultivo se siembra el día 1 de su mes y ocupa su ciclo (FAO-56 tabla 11).
     La rotación se repite cada año; si un ciclo pasa de diciembre, continúa en enero.
  2. Agua: ETc = Kc × ET0 (Penman-Monteith). Por mes: riego neto = max(0, ETc − lluvia efectiva),
     riego bruto = neto / eficiencia. 1 mm = 10 m³/ha.
  3. Clima: días de helada (Tmin < umbral) y de calor (Tmax > umbral) durante cada cultivo.
  4. Ingreso: rendimiento × factor climático × factor agua × precio − costo.
Luego se resumen los 21 años en mediana y percentiles 10 y 90: la incertidumbre se muestra como rango.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from engine.crops import Crop, catalog
from engine.et0 import penman_monteith
from engine.power import Climate
from engine.schema import Rotation

# Eficiencia de aplicación (CONTEXTO_RETO.md §4) y ajuste por textura del suelo:
# en suelos arenosos se pierde más agua por percolación profunda con riego por gravedad.
EFFICIENCY = {"gravedad": 0.45, "aspersion": 0.75, "goteo": 0.90}
SOIL_FACTOR = {
    "arenoso": {"gravedad": 0.85, "aspersion": 0.95, "goteo": 1.0},
    "franco": {"gravedad": 1.0, "aspersion": 1.0, "goteo": 1.0},
    "arcilloso": {"gravedad": 1.05, "aspersion": 1.0, "goteo": 1.0},
}
FROST_PENALTY = 0.03  # pérdida de rendimiento por día de helada en el ciclo
HEAT_PENALTY = 0.01  # por día de calor extremo
MIN_YIELD_FACTOR = 0.3
MONTH_START = np.cumsum([0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30])  # índice 0-based del día 1 de cada mes
MONTH_OF_DAY = np.repeat(np.arange(12), [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])


@dataclass
class Placement:
    crop: Crop
    days: np.ndarray  # índices 0..364 que ocupa
    kc: np.ndarray  # Kc en esos días


def efficiency(irrigation: str, soil: str) -> float:
    return min(0.95, EFFICIENCY[irrigation] * SOIL_FACTOR[soil][irrigation])


def place(rotation: Rotation) -> tuple[list[Placement], np.ndarray, np.ndarray]:
    """Devuelve (cultivos ubicados, Kc diario de 365 días, índice de cultivo por día o −1 si está desnudo)."""
    cat = catalog()
    placements = []
    kc_year = np.zeros(365)
    owner = np.full(365, -1)
    for i, rc in enumerate(rotation.crops):
        crop = cat[rc.cropId]
        curve = crop.kc_curve()
        start = 0 if crop.perennial else int(MONTH_START[rc.sowMonth - 1])
        days = (start + np.arange(curve.size)) % 365
        placements.append(Placement(crop, days, curve))
        better = curve > kc_year[days]
        kc_year[days[better]] = curve[better]
        owner[days[better]] = i
    return placements, kc_year, owner


def effective_rain_monthly(p_mm: np.ndarray) -> np.ndarray:
    """Lluvia efectiva mensual, método USDA-SCS simplificado (FAO)."""
    return np.where(p_mm <= 250, p_mm * (125 - 0.2 * p_mm) / 125, 125 + 0.1 * p_mm)


def simulate_rotation(rotation: Rotation, clim: Climate, et0: np.ndarray, *, irrigation: str, soil: str, water_available: float) -> list[dict]:
    placements, kc_year, owner = place(rotation)
    eff = efficiency(irrigation, soil)
    monthly_allocation = water_available / 12
    cropped = owner >= 0
    results = []

    for y in clim.years:
        sel = clim.year == y
        if sel.sum() < 365:
            continue  # año incompleto
        order = np.argsort(clim.doy[sel])
        e0 = et0[sel][order][:365]
        tmax = clim.tmax[sel][order][:365]
        tmin = clim.tmin[sel][order][:365]
        rain = clim.rain[sel][order][:365]

        etc = kc_year * e0
        etc_m = np.bincount(MONTH_OF_DAY, weights=etc, minlength=12)
        rain_m = np.bincount(MONTH_OF_DAY, weights=rain, minlength=12)
        cropped_frac = np.bincount(MONTH_OF_DAY, weights=cropped.astype(float), minlength=12) / np.bincount(MONTH_OF_DAY, minlength=12)
        net_m = np.maximum(0.0, etc_m - effective_rain_monthly(rain_m) * cropped_frac)
        gross_m3 = net_m / eff * 10  # m³/ha por mes
        water = float(gross_m3.sum())
        water_factor = 1.0 if water <= water_available or water == 0 else max(MIN_YIELD_FACTOR, water_available / water)

        frost_by_day = np.zeros(365, dtype=bool)
        heat_by_day = np.zeros(365, dtype=bool)
        income = 0.0
        frost_total = heat_total = 0
        losses = []
        for pl in placements:
            f = tmin[pl.days] < pl.crop.t_frost_c
            h = tmax[pl.days] > pl.crop.t_heat_c
            frost_by_day[pl.days[f]] = True
            heat_by_day[pl.days[h]] = True
            nf, nh = int(f.sum()), int(h.sum())
            frost_total += nf
            heat_total += nh
            climate_factor = max(MIN_YIELD_FACTOR, 1 - FROST_PENALTY * nf - HEAT_PENALTY * nh)
            revenue_potential = pl.crop.yield_t_ha * pl.crop.price_pen_t
            income += revenue_potential * climate_factor * water_factor - pl.crop.cost_pen_ha
            losses.append((revenue_potential, 1 - climate_factor))

        total_rev = sum(r for r, _ in losses) or 1.0
        climate_loss = sum(r * loss for r, loss in losses) / total_rev

        months = []
        for m in range(12):
            in_m = MONTH_OF_DAY == m
            if cropped_frac[m] < 0.5:
                months.append("bare")
            elif (frost_by_day & in_m).sum() >= 1 or (heat_by_day & in_m).sum() >= 3:
                months.append("climate_risk")
            elif gross_m3[m] > 1.2 * monthly_allocation:
                months.append("water_stress")
            else:
                months.append("ok")

        results.append(
            {
                "year": int(y),
                "waterM3ha": round(water),
                "incomePEN": round(income),
                "frostDays": frost_total,
                "heatDays": heat_total,
                "months": months,
                "_climateLoss": climate_loss,
                "_grossMonthly": gross_m3,
            }
        )
    return results


def soil_score(rotation: Rotation, typical_months: list[str]) -> float:
    """Salud del suelo por reglas simples (0..1). Ver PLAN.md y CONTEXTO_RETO.md §4.7."""
    cat = catalog()
    crops = [cat[c.cropId] for c in rotation.crops]
    families = [c.family for c in crops]
    score = 0.4
    if any(c.fixes_nitrogen for c in crops):
        score += 0.2  # leguminosa: aporta nitrógeno
    distinct = len(set(families))
    score += 0.15 if distinct >= 3 else 0.08 if distinct == 2 else 0.0  # corta ciclos de plagas
    if any(c.perennial for c in crops):
        score += 0.15  # cobertura permanente, sin labranza
    depths = [c.root_depth_m for c in crops]
    if len(depths) > 1 and max(depths) - min(depths) >= 0.4:
        score += 0.05  # alterna raíces profundas y superficiales
    for a, b in zip(families, families[1:] + families[:1]):
        if a == b and len(families) > 1:
            score -= 0.1  # misma familia seguida
    score -= 0.05 * typical_months.count("bare")  # suelo desnudo: erosión y pérdida de materia orgánica
    return float(np.clip(score, 0, 1))


def compute_et0(clim: Climate) -> np.ndarray:
    return penman_monteith(clim.tmax, clim.tmin, clim.rs, clim.u2, clim.lat, clim.elevation_m, clim.doy, rh=clim.rh)
