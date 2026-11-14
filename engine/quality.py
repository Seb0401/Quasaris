"""Validación y limpieza de los datos de entrada del motor (NASA POWER y SRTM).

Objetivo: que un dato mal formado o imposible no se convierta en un resultado falso
(una helada que no ocurrió, un "suelo seco" que es un valor faltante, un año exigente por un pico).

Pipeline de `clean_power(payload)`, en este orden:

  1. Estructura: `meta` (lat, lon, elevación numéricas y en rango) y `parameter` con las
     variables obligatorias. Si falla, se lanza `DataFormatError` y la celda se descarta.
  2. Fechas: claves AAAAMMDD válidas; se arma un calendario diario continuo (sin 29/2).
     Las fechas que faltan quedan como huecos.
  3. Tipos: solo números finitos (se aceptan números escritos como texto; no booleanos).
  4. Faltantes: los centinelas de POWER (−999, −9999) pasan a hueco.
  5. Rango físico por variable (p. ej. HR 0–100 %, radiación 0–45 MJ/m²/día).
  6. Coherencia física: Tmin ≤ Tmax y 3 % de Ra ≤ radiación ≤ Ra (radiación extraterrestre del día).
  7. Valores pegados: la misma lectura exacta 15 días o más seguidos (relleno o falla).
  8. Picos de temperatura: anomalía robusta frente a la mediana del mismo mes en los otros años
     (|x − mediana| > 6 · 1.4826 · MAD). Evita heladas o calores falsos por un solo valor.
     No se aplica a radiación, viento, humedad ni lluvia: ahí lo extremo suele ser real.
  9. Relleno: huecos de hasta 7 días por interpolación lineal; huecos más largos con la
     climatología del mismo día del año (mediana de los otros años).
 10. Años poco confiables: si más del 15 % de los días de un año en las variables clave
     tuvo que rellenarse, el año se marca en `bad_years` para que el motor lo excluya.

Cada paso cuenta lo que tocó en un `QualityReport`, para poder auditar y declarar la calidad.
"""

from __future__ import annotations

import math
import re
from dataclasses import asdict, dataclass, field
from datetime import date, timedelta

import numpy as np

from engine.et0 import extraterrestrial_radiation

REQUIRED = ("T2M_MAX", "T2M_MIN", "ALLSKY_SFC_SW_DWN", "RH2M", "WS2M", "PRECTOTCORR")
OPTIONAL = ("GWETROOT",)
SENTINELS = (-999.0, -9999.0)

# Límites físicos amplios (globales): solo descartan lo imposible, no lo raro.
RANGES: dict[str, tuple[float, float]] = {
    "T2M_MAX": (-60.0, 60.0),  # °C
    "T2M_MIN": (-70.0, 50.0),  # °C
    "ALLSKY_SFC_SW_DWN": (0.0, 45.0),  # MJ/m²/día (comunidad AG)
    "RH2M": (0.0, 100.0),  # %
    "WS2M": (0.0, 40.0),  # m/s
    "PRECTOTCORR": (0.0, 500.0),  # mm/día
    "GWETROOT": (0.0, 1.0),  # fracción
}

# Variables continuas donde tiene sentido buscar valores pegados.
# (La lluvia no: en Majes lo normal son meses enteros en 0 y aguaceros aislados.)
SMOOTH = ("T2M_MAX", "T2M_MIN", "ALLSKY_SFC_SW_DWN", "RH2M", "WS2M")
# Picos solo en temperatura: un valor suelto ahí fabrica una helada o un calor que no existió.
# La radiación no: sus valores bajos son días nublados reales (medido en las celdas de Majes);
# la radiación imposible ya la frenan los límites físicos frente a Ra.
SPIKE = ("T2M_MAX", "T2M_MIN")
# Escala mínima del MAD, para no marcar como pico una variación normal en una serie casi constante.
MAD_FLOOR = {"T2M_MAX": 0.5, "T2M_MIN": 0.5}
# Radiación en superficie: entre 3 % de Ra (cielo muy cubierto) y Ra (tope de la atmósfera).
RS_MIN_FRACTION_OF_RA = 0.03
# Variables que deciden si un año es confiable (sin ellas no hay ET0 ni riesgo climático).
CORE = ("T2M_MAX", "T2M_MIN", "ALLSKY_SFC_SW_DWN", "RH2M", "WS2M")

OUTLIER_K = 6.0
STUCK_RUN_DAYS = 15
SHORT_GAP_DAYS = 7
MAX_IMPUTED_FRACTION = 0.15

DATE_KEY = re.compile(r"^\d{8}$")


class DataFormatError(ValueError):
    """El payload no tiene la forma mínima para usarlo (se descarta la celda)."""


@dataclass
class VarReport:
    non_numeric: int = 0  # texto no numérico, booleanos, None, NaN o infinito
    missing: int = 0  # centinelas −999 / −9999 y fechas ausentes
    out_of_range: int = 0
    inconsistent: int = 0  # Tmin > Tmax o radiación > Ra
    stuck: int = 0
    outliers: int = 0
    interpolated: int = 0
    climatology_filled: int = 0

    @property
    def flagged(self) -> int:
        return self.non_numeric + self.missing + self.out_of_range + self.inconsistent + self.stuck + self.outliers


@dataclass
class QualityReport:
    lat: float | None = None
    lon: float | None = None
    days: int = 0
    first: str | None = None
    last: str | None = None
    invalid_date_keys: int = 0
    missing_dates: int = 0
    absent_optional: list[str] = field(default_factory=list)
    variables: dict[str, VarReport] = field(default_factory=dict)
    imputed_fraction_by_year: dict[int, float] = field(default_factory=dict)
    bad_years: list[int] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.bad_years and not self.warnings

    def summary(self) -> dict:
        d = asdict(self)
        d["flagged"] = {k: v.flagged for k, v in self.variables.items()}
        return d


@dataclass
class CleanSeries:
    dates: list[date]
    series: dict[str, np.ndarray | None]  # por nombre de parámetro POWER; None si falta un opcional
    report: QualityReport


# ---------- 1. estructura ----------


def _is_number(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def validate_structure(payload) -> None:
    """Comprueba la forma mínima del payload. Lanza DataFormatError si no sirve."""
    if not isinstance(payload, dict):
        raise DataFormatError("el payload no es un objeto")
    meta, params = payload.get("meta"), payload.get("parameter")
    if not isinstance(meta, dict) or not isinstance(params, dict):
        raise DataFormatError("faltan 'meta' o 'parameter'")
    for key, lo, hi in (("lat", -90, 90), ("lon", -180, 180), ("elevation", -430, 8850)):
        v = meta.get(key)
        if not _is_number(v) or not lo <= v <= hi:
            raise DataFormatError(f"meta.{key} inválido: {v!r}")
    missing = [p for p in REQUIRED if not isinstance(params.get(p), dict) or not params[p]]
    if missing:
        raise DataFormatError(f"faltan variables obligatorias: {missing}")


def validate_elevation(z) -> float | None:
    """Elevación SRTM: número finito dentro del rango terrestre; si no, None."""
    if isinstance(z, str):
        try:
            z = float(z)
        except ValueError:
            return None
    return float(z) if _is_number(z) and -430 <= z <= 8850 else None


# ---------- 2. fechas ----------


def _parse_key(k: str) -> date | None:
    if not isinstance(k, str) or not DATE_KEY.match(k):
        return None
    try:
        return date(int(k[:4]), int(k[4:6]), int(k[6:]))
    except ValueError:
        return None


def _calendar(params: dict, report: QualityReport) -> tuple[list[date], dict[date, str]]:
    keys: dict[date, str] = {}
    invalid = set()
    for p in REQUIRED:
        for k in params[p]:
            d = _parse_key(k)
            if d is None:
                invalid.add(k)
            else:
                keys[d] = k
    report.invalid_date_keys = len(invalid)
    if not keys:
        raise DataFormatError("ninguna fecha válida")
    first, last = min(keys), max(keys)
    days, d = [], first
    while d <= last:
        if not (d.month == 2 and d.day == 29):
            days.append(d)
        d += timedelta(days=1)
    report.missing_dates = sum(1 for d in days if d not in keys)
    report.days, report.first, report.last = len(days), first.isoformat(), last.isoformat()
    return days, keys


# ---------- 3–5. tipos, centinelas y rango ----------


def _to_float(v, rep: VarReport) -> float:
    if isinstance(v, str):
        try:
            v = float(v.strip())
        except ValueError:
            rep.non_numeric += 1
            return math.nan
    if not _is_number(v):
        rep.non_numeric += 1
        return math.nan
    v = float(v)
    if any(abs(v - s) < 1e-6 for s in SENTINELS):
        rep.missing += 1
        return math.nan
    return v


def _read_values(raw: dict, days: list[date], keys: dict[date, str], param: str, rep: VarReport) -> np.ndarray:
    out = np.full(len(days), np.nan)
    for i, d in enumerate(days):
        k = keys.get(d)
        if k is None or k not in raw:
            rep.missing += 1
            continue
        out[i] = _to_float(raw[k], rep)
    lo, hi = RANGES[param]
    bad = ~np.isnan(out) & ((out < lo) | (out > hi))
    rep.out_of_range += int(bad.sum())
    out[bad] = np.nan
    return out


# ---------- 6. coherencia física ----------


def _consistency(s: dict[str, np.ndarray], reps: dict[str, VarReport], lat: float, doy: np.ndarray) -> None:
    tmax, tmin = s["T2M_MAX"], s["T2M_MIN"]
    swapped = ~np.isnan(tmax) & ~np.isnan(tmin) & (tmin > tmax)
    if swapped.any():  # no se sabe cuál de las dos está mal: se descartan ambas
        reps["T2M_MAX"].inconsistent += int(swapped.sum())
        reps["T2M_MIN"].inconsistent += int(swapped.sum())
        tmax[swapped] = np.nan
        tmin[swapped] = np.nan
    rs = s["ALLSKY_SFC_SW_DWN"]
    ra = extraterrestrial_radiation(lat, doy)
    # más radiación en superficie que en el tope de la atmósfera, o casi nada de día: imposible
    impossible = ~np.isnan(rs) & ((rs > ra) | (rs < RS_MIN_FRACTION_OF_RA * ra))
    reps["ALLSKY_SFC_SW_DWN"].inconsistent += int(impossible.sum())
    rs[impossible] = np.nan


# ---------- 7. valores pegados ----------


def _stuck(a: np.ndarray, rep: VarReport) -> None:
    n, i = a.size, 0
    while i < n:
        if np.isnan(a[i]):
            i += 1
            continue
        j = i + 1
        while j < n and a[j] == a[i]:
            j += 1
        if j - i >= STUCK_RUN_DAYS:
            rep.stuck += j - i
            a[i:j] = np.nan
        i = j


# ---------- 8. picos ----------


def _outliers(a: np.ndarray, month: np.ndarray, param: str, rep: VarReport) -> None:
    for m in range(1, 13):
        sel = (month == m) & ~np.isnan(a)
        if sel.sum() < 30:
            continue
        vals = a[sel]
        med = np.median(vals)
        scale = max(1.4826 * np.median(np.abs(vals - med)), MAD_FLOOR[param])
        spike = sel & (np.abs(a - med) > OUTLIER_K * scale)
        rep.outliers += int(spike.sum())
        a[spike] = np.nan


# ---------- 9. relleno ----------


def _gap_runs(mask: np.ndarray) -> list[tuple[int, int]]:
    runs, i, n = [], 0, mask.size
    while i < n:
        if mask[i]:
            j = i
            while j < n and mask[j]:
                j += 1
            runs.append((i, j))
            i = j
        else:
            i += 1
    return runs


def _impute(a: np.ndarray, doy: np.ndarray, month: np.ndarray, rep: VarReport) -> np.ndarray:
    gaps = np.isnan(a)
    if not gaps.any():
        return gaps
    ok = ~gaps
    if not ok.any():
        raise DataFormatError("una variable no tiene ningún valor válido")
    idx = np.arange(a.size)
    linear = np.interp(idx, idx[ok], a[ok])
    clim_doy = {d: np.nanmedian(a[(doy == d) & ok]) if ((doy == d) & ok).any() else np.nan for d in np.unique(doy[gaps])}
    clim_month = {m: np.nanmedian(a[(month == m) & ok]) if ((month == m) & ok).any() else np.nan for m in np.unique(month[gaps])}
    overall = float(np.nanmedian(a[ok]))
    for i, j in _gap_runs(gaps):
        short = (j - i) <= SHORT_GAP_DAYS and i > 0 and j < a.size
        if short:
            a[i:j] = linear[i:j]
            rep.interpolated += j - i
        else:
            for k in range(i, j):
                v = clim_doy.get(doy[k], np.nan)
                if np.isnan(v):
                    v = clim_month.get(month[k], np.nan)
                a[k] = overall if np.isnan(v) else v
            rep.climatology_filled += j - i
    return gaps


# ---------- pipeline ----------


def clean_power(payload: dict) -> CleanSeries:
    """Valida y limpia un payload de NASA POWER ({meta, parameter}). Ver el docstring del módulo."""
    validate_structure(payload)
    meta, params = payload["meta"], payload["parameter"]
    report = QualityReport(lat=float(meta["lat"]), lon=float(meta["lon"]))
    days, keys = _calendar(params, report)

    year = np.array([d.year for d in days])
    month = np.array([d.month for d in days])
    doy = np.array([(d - date(d.year, 1, 1)).days + 1 - (1 if (d.month > 2 and d.year % 4 == 0) else 0) for d in days])

    present = [p for p in REQUIRED + OPTIONAL if isinstance(params.get(p), dict) and params[p]]
    report.absent_optional = [p for p in OPTIONAL if p not in present]
    reps = {p: VarReport() for p in present}
    series = {p: _read_values(params[p], days, keys, p, reps[p]) for p in present}

    _consistency(series, reps, report.lat, doy)
    for p in SMOOTH:
        _stuck(series[p], reps[p])
    for p in SPIKE:
        _outliers(series[p], month, p, reps[p])

    gap_masks = {p: _impute(series[p], doy, month, reps[p]) for p in present}

    # Años poco confiables: fracción de días rellenados en las variables clave (la peor manda).
    core_gaps = np.zeros(len(days), dtype=float)
    for p in CORE:
        core_gaps = np.maximum(core_gaps, gap_masks[p].astype(float))
    for y in np.unique(year):
        frac = float(core_gaps[year == y].mean())
        report.imputed_fraction_by_year[int(y)] = round(frac, 4)
        if frac > MAX_IMPUTED_FRACTION:
            report.bad_years.append(int(y))

    if report.invalid_date_keys:
        report.warnings.append(f"{report.invalid_date_keys} claves de fecha inválidas ignoradas")
    for p, r in reps.items():
        if r.flagged > 0.05 * len(days):
            report.warnings.append(f"{p}: {r.flagged} valores descartados ({r.flagged / len(days):.0%})")

    out: dict[str, np.ndarray | None] = {p: series.get(p) for p in REQUIRED + OPTIONAL}
    report.variables = reps
    return CleanSeries(dates=days, series=out, report=report)
