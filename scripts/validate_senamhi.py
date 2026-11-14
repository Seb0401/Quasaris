"""Valida el clima de NASA POWER (fusionado con SRTM) contra la estación SENAMHI Pampa de Majes.

Estación: PAMPA DE MAJES, código 116006 (convencional, MAP), lat −16.3357, lon −72.1525.
Fuente: https://www.senamhi.gob.pe/mapas/mapa-estaciones-2/ → buscar "Pampa de Majes" → tabla mensual.
El visor tiene verificación anti-bots, así que la descarga es MANUAL (una persona en el navegador).

Formato esperado: uno o más CSV en data/senamhi/ con encabezado
    fecha,tmax,tmin,hr,precip
    2023-01-01,27.4,12.1,58,0.0
(fecha AAAA-MM-DD; tmax/tmin en °C; hr en %; precip en mm; celdas vacías o "S/D" = sin dato).

Uso: python scripts/validate_senamhi.py
Salida: data/validation_senamhi.json y una tabla en consola para la diapositiva de "Validez".
"""

from __future__ import annotations

import csv
import json
import sys
from datetime import date
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from engine.elevation import srtm_elevation  # noqa: E402
from engine.et0 import hargreaves  # noqa: E402
from engine.power import get_climate  # noqa: E402

STATION = {"name": "PAMPA DE MAJES", "code": "116006", "lat": -16.3357, "lon": -72.1525}
SENAMHI_DIR = ROOT / "data" / "senamhi"
OUT = ROOT / "data" / "validation_senamhi.json"


def _num(v: str | None) -> float:
    try:
        return float(str(v).replace(",", ".").strip())
    except (TypeError, ValueError):
        return float("nan")


def load_station() -> dict[date, dict[str, float]]:
    rows: dict[date, dict[str, float]] = {}
    for path in sorted(SENAMHI_DIR.glob("*.csv")):
        with path.open(encoding="utf-8-sig") as f:
            for r in csv.DictReader(f):
                try:
                    d = date.fromisoformat(r["fecha"].strip())
                except (KeyError, ValueError):
                    continue
                rows[d] = {k: _num(r.get(k)) for k in ("tmax", "tmin", "hr", "precip")}
    return rows


def metrics(obs: np.ndarray, sim: np.ndarray) -> dict | None:
    ok = ~np.isnan(obs) & ~np.isnan(sim)
    if ok.sum() < 10:
        return None
    o, s = obs[ok], sim[ok]
    return {
        "n": int(ok.sum()),
        "bias": round(float(np.mean(s - o)), 2),
        "mae": round(float(np.mean(np.abs(s - o))), 2),
        "rmse": round(float(np.sqrt(np.mean((s - o) ** 2))), 2),
        "r": round(float(np.corrcoef(o, s)[0, 1]), 3),
        "meanObs": round(float(o.mean()), 2),
        "meanNasa": round(float(s.mean()), 2),
    }


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    station = load_station()
    if not station:
        print(f"No hay CSV en {SENAMHI_DIR}. Ver el formato en el encabezado de este script.")
        return 1
    years = sorted({d.year for d in station})
    start, end = max(min(years), 2005), min(max(years), 2025)
    z = srtm_elevation(STATION["lat"], STATION["lon"])
    clim = get_climate(STATION["lat"], STATION["lon"], 2005, 2025, elevation_m=z)

    index = {}
    for i, (y, doy) in enumerate(zip(clim.year, clim.doy)):
        index[(int(y), int(doy))] = i

    obs = {k: [] for k in ("tmax", "tmin", "precip")}
    sim = {k: [] for k in ("tmax", "tmin", "precip")}
    doys, lat_days = [], []
    for d, v in sorted(station.items()):
        if not (start <= d.year <= end) or (d.month == 2 and d.day == 29):
            continue
        doy = (d - date(d.year, 1, 1)).days + 1 - (1 if (d.month > 2 and d.year % 4 == 0) else 0)
        i = index.get((d.year, doy))
        if i is None:
            continue
        obs["tmax"].append(v["tmax"]); sim["tmax"].append(clim.tmax[i])  # noqa: E702
        obs["tmin"].append(v["tmin"]); sim["tmin"].append(clim.tmin[i])  # noqa: E702
        obs["precip"].append(v["precip"]); sim["precip"].append(clim.rain[i])  # noqa: E702
        doys.append(doy)
        lat_days.append(d)

    arr = {k: (np.array(obs[k], float), np.array(sim[k], float)) for k in obs}
    doy_arr = np.array(doys)
    # ET0 con Hargreaves en ambos lados (la estación no mide radiación ni viento)
    et0_obs = hargreaves(arr["tmax"][0], arr["tmin"][0], STATION["lat"], doy_arr)
    et0_sim = hargreaves(arr["tmax"][1], arr["tmin"][1], STATION["lat"], doy_arr)

    result = {
        "station": STATION,
        "period": [str(lat_days[0]) if lat_days else None, str(lat_days[-1]) if lat_days else None],
        "nasa": {"method": clim.method, "cells": clim.cells, "elevationM": clim.elevation_m},
        "daily": {
            "tmax": metrics(*arr["tmax"]),
            "tmin": metrics(*arr["tmin"]),
            "et0Hargreaves": metrics(et0_obs, et0_sim),
        },
        "precipTotalMm": {
            "station": round(float(np.nansum(arr["precip"][0])), 1),
            "nasa": round(float(np.nansum(arr["precip"][1])), 1),
        },
    }
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"SENAMHI {STATION['name']} ({STATION['code']}) vs NASA POWER [{clim.method}] | {result['period'][0]} -> {result['period'][1]}")
    print(f"{'variable':<16}{'n':>6}{'sesgo':>8}{'MAE':>7}{'RMSE':>7}{'r':>7}{'obs':>8}{'NASA':>8}")
    for k, m in result["daily"].items():
        if m:
            print(f"{k:<16}{m['n']:>6}{m['bias']:>8}{m['mae']:>7}{m['rmse']:>7}{m['r']:>7}{m['meanObs']:>8}{m['meanNasa']:>8}")
    print(f"lluvia total (mm): estación {result['precipTotalMm']['station']} · NASA {result['precipTotalMm']['nasa']}")
    print(f"-> {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
