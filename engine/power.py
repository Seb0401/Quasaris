"""Clima diario de NASA POWER (comunidad AG) con caché y fusión vertical guiada por SRTM.

Por qué hay fusión: la celda de POWER mide ~0.5° × 0.625° (~55 × 65 km) y su elevación es
un promedio. Alrededor de Majes, las celdas vecinas van de 835 m (costa, húmeda y nublada) a
3269 m (sierra). La parcela (1409 m según SRTM) queda entre dos celdas, así que interpolamos
día a día todas las variables entre las dos celdas que encierran su altitud:

    w = (z_parcela − z_baja) / (z_alta − z_baja)
    x = (1 − w) · x_baja + w · x_alta

Si ninguna pareja encierra la altitud, se usa la celda más cercana en altitud y se corrige la
temperatura con el gradiente estándar de −6.5 °C/km.

Cada celda pasa por engine/quality.py (formato, rangos, coherencia, picos, relleno de huecos)
antes de usarse; los años con demasiados datos rellenados se excluyen (Climate.excluded_years).

Orden de búsqueda por celda: memoria → data/power_cache/ (repo) → /tmp → API en vivo.
Si la API falla, se usa la celda en caché más cercana (source = "cache").
"""

from __future__ import annotations

import json
import math
import tempfile
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import httpx
import numpy as np

from engine.quality import DataFormatError, QualityReport, clean_power, validate_structure

try:  # en local: respeta los certificados del sistema (p. ej. antivirus que inspecciona TLS)
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / "data" / "power_cache"
TMP_DIR = Path(tempfile.gettempdir()) / "farmtwin_power"
API = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMS = ["T2M_MAX", "T2M_MIN", "ALLSKY_SFC_SW_DWN", "RH2M", "WS2M", "PRECTOTCORR", "GWETROOT"]
VARS = {"tmax": "T2M_MAX", "tmin": "T2M_MIN", "rs": "ALLSKY_SFC_SW_DWN", "rh": "RH2M", "u2": "WS2M", "rain": "PRECTOTCORR", "gwetroot": "GWETROOT"}
LAPSE_C_PER_M = -0.0065
DLAT, DLON = 0.5, 0.625  # rejilla MERRA-2 de POWER

_memory: dict[str, dict] = {}


@dataclass
class Climate:
    lat: float
    lon: float
    elevation_m: float
    source: str  # "live" | "cache"
    method: str  # "blend" | "single"
    cells: list[dict] = field(default_factory=list)  # [{lat, lon, elevation, weight}]
    year: np.ndarray = None  # type: ignore[assignment]
    doy: np.ndarray = None  # type: ignore[assignment]  1..365 (sin 29/2)
    month: np.ndarray = None  # type: ignore[assignment]
    tmax: np.ndarray = None  # type: ignore[assignment]
    tmin: np.ndarray = None  # type: ignore[assignment]
    rs: np.ndarray = None  # type: ignore[assignment]
    rh: np.ndarray = None  # type: ignore[assignment]
    u2: np.ndarray = None  # type: ignore[assignment]
    rain: np.ndarray = None  # type: ignore[assignment]
    gwetroot: np.ndarray | None = None  # None si la celda no trae GWETROOT (no se inventan ceros)
    quality: list[dict] = field(default_factory=list)  # QualityReport.summary() de cada celda usada
    excluded_years: list[int] = field(default_factory=list)  # años descartados por mala calidad

    @property
    def years(self) -> list[int]:
        return sorted(set(self.year.tolist()))


# ---------- rejilla y caché ----------


def cell_center(lat: float, lon: float) -> tuple[float, float]:
    return round(lat / DLAT) * DLAT, round(lon / DLON) * DLON


def neighbor_cells(lat: float, lon: float) -> list[tuple[float, float]]:
    """Las 4 celdas cuyos centros rodean el punto."""
    lats = {math.floor(lat / DLAT) * DLAT, math.ceil(lat / DLAT) * DLAT}
    lons = {math.floor(lon / DLON) * DLON, math.ceil(lon / DLON) * DLON}
    return [(a, b) for a in sorted(lats) for b in sorted(lons)]


def cache_name(clat: float, clon: float, start: int, end: int) -> str:
    return f"{clat:+.1f}_{clon:+.3f}_{start}_{end}.json"


def _read(path: Path) -> dict | None:
    """Lee una celda en caché; si el archivo está corrupto o mal formado, se ignora (DataFormatError es ValueError)."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        validate_structure(data)
        return data
    except (OSError, ValueError):
        return None


def _write(path: Path, data: dict) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    except OSError:
        pass  # sistema de archivos de solo lectura: queda en memoria


def _fetch_live(clat: float, clon: float, start: int, end: int, timeout: float) -> dict:
    r = httpx.get(
        API,
        params={
            "parameters": ",".join(PARAMS),
            "community": "AG",
            "latitude": clat,
            "longitude": clon,
            "start": f"{start}0101",
            "end": f"{end}1231",
            "format": "JSON",
        },
        timeout=timeout,
    )
    r.raise_for_status()
    payload = r.json()
    raw = payload["properties"]["parameter"]
    data = {
        "meta": {"lat": clat, "lon": clon, "elevation": payload["geometry"]["coordinates"][2], "start": start, "end": end},
        "parameter": {p: raw[p] for p in PARAMS if p in raw},
    }
    validate_structure(data)  # una respuesta mal formada no se guarda en caché
    return data


def load_cell(clat: float, clon: float, start: int, end: int, *, live: bool = True, timeout: float = 30.0) -> tuple[dict | None, str]:
    name = cache_name(clat, clon, start, end)
    if name in _memory:
        return _memory[name], "cache"
    for folder in (CACHE_DIR, TMP_DIR):
        data = _read(folder / name)
        if data:
            _memory[name] = data
            return data, "cache"
    if live:
        try:
            data = _fetch_live(clat, clon, start, end, timeout)
            _memory[name] = data
            _write(TMP_DIR / name, data)
            return data, "live"
        except (httpx.HTTPError, KeyError, ValueError):
            pass
    return None, "missing"


def _nearest_cached(lat: float, lon: float, start: int, end: int) -> dict | None:
    best, best_d = None, math.inf
    for path in list(CACHE_DIR.glob(f"*_{start}_{end}.json")) + list(TMP_DIR.glob(f"*_{start}_{end}.json")):
        data = _read(path)
        if data:
            d = math.hypot(data["meta"]["lat"] - lat, data["meta"]["lon"] - lon)
            if d < best_d:
                best, best_d = data, d
    return best


def save_repo_cache(data: dict) -> Path:
    m = data["meta"]
    path = CACHE_DIR / cache_name(m["lat"], m["lon"], m["start"], m["end"])
    _write(path, data)
    return path


# ---------- series ----------


_clean_memo: dict[tuple, tuple[list[date], dict[str, np.ndarray | None], QualityReport]] = {}


def _series(data: dict) -> tuple[list[date], dict[str, np.ndarray | None], QualityReport]:
    """Serie diaria validada y limpia (engine/quality.py), con nombres internos (tmax, tmin, …)."""
    m = data["meta"]
    key = (m["lat"], m["lon"], m.get("start"), m.get("end"), id(data))
    if key not in _clean_memo:
        cleaned = clean_power(data)
        out = {var: (None if cleaned.series[param] is None else cleaned.series[param].copy()) for var, param in VARS.items()}
        _clean_memo[key] = (cleaned.dates, out, cleaned.report)
    dates, out, report = _clean_memo[key]
    return dates, {k: (None if v is None else v.copy()) for k, v in out.items()}, report


def _mix(a: np.ndarray | None, b: np.ndarray | None, w: float) -> np.ndarray | None:
    return None if a is None or b is None else (1 - w) * a + w * b


def _calendar(dates: list[date]):
    year = np.array([d.year for d in dates])
    month = np.array([d.month for d in dates])
    doy = np.array([(d - date(d.year, 1, 1)).days + 1 - (1 if (d.month > 2 and d.year % 4 == 0) else 0) for d in dates])
    return year, month, doy


# ---------- API pública ----------


def get_climate(lat: float, lon: float, start: int, end: int, *, elevation_m: float | None = None, live: bool = True) -> Climate:
    cells = neighbor_cells(lat, lon)
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda c: load_cell(c[0], c[1], start, end, live=live), cells))
    loaded = [(d, s) for d, s in results if d is not None]
    source = "live" if any(s == "live" for _, s in loaded) else "cache"

    if not loaded:
        nearest = _nearest_cached(lat, lon, start, end)
        if nearest is None:
            raise LookupError("NASA POWER no disponible y sin caché")
        loaded = [(nearest, "cache")]

    # Validación y limpieza de cada celda: una celda que no se puede limpiar se descarta.
    usable = []
    for d, s in loaded:
        try:
            _series(d)
            usable.append((d, s))
        except DataFormatError:
            continue
    if not usable:
        raise LookupError("NASA POWER: ninguna celda pasó la validación de datos")
    loaded = usable

    by_elev = sorted(loaded, key=lambda x: x[0]["meta"]["elevation"])
    z = elevation_m

    # elegir la pareja más ajustada que encierre la altitud de la parcela
    pair = None
    if z is not None:
        best_span = math.inf
        for i, (lo, _) in enumerate(by_elev):
            for hi, _ in by_elev[i + 1 :]:
                zl, zh = lo["meta"]["elevation"], hi["meta"]["elevation"]
                if zl <= z <= zh and zh > zl and zh - zl < best_span:
                    pair, best_span = (lo, hi), zh - zl

    if pair:
        lo, hi = pair
        zl, zh = lo["meta"]["elevation"], hi["meta"]["elevation"]
        w = (z - zl) / (zh - zl)
        d_lo, s_lo, r_lo = _series(lo)
        d_hi, s_hi, r_hi = _series(hi)
        dates, s_lo, s_hi = _align(d_lo, s_lo, d_hi, s_hi)
        series = {k: _mix(s_lo[k], s_hi[k], w) for k in VARS}
        reports = [r_lo, r_hi]
        cell_info = [
            {"lat": lo["meta"]["lat"], "lon": lo["meta"]["lon"], "elevation": zl, "weight": round(1 - w, 3)},
            {"lat": hi["meta"]["lat"], "lon": hi["meta"]["lon"], "elevation": zh, "weight": round(w, 3)},
        ]
        method = "blend"
    else:
        ref = z if z is not None else by_elev[0][0]["meta"]["elevation"]
        one = min(loaded, key=lambda x: abs(x[0]["meta"]["elevation"] - ref) if z is not None else math.hypot(x[0]["meta"]["lat"] - lat, x[0]["meta"]["lon"] - lon))[0]
        dates, series, r_one = _series(one)
        reports = [r_one]
        zc = one["meta"]["elevation"]
        if z is not None:
            dt = LAPSE_C_PER_M * (z - zc)
            series["tmax"] = series["tmax"] + dt
            series["tmin"] = series["tmin"] + dt
        cell_info = [{"lat": one["meta"]["lat"], "lon": one["meta"]["lon"], "elevation": zc, "weight": 1.0}]
        method = "single"

    year, month, doy = _calendar(dates)

    # Años con demasiados datos rellenados en cualquiera de las celdas usadas: se excluyen,
    # salvo que no quede ninguno (entonces se conservan y queda el aviso en `quality`).
    bad = sorted({y for r in reports for y in r.bad_years})
    keep = ~np.isin(year, bad)
    if bad and keep.any():
        year, month, doy = year[keep], month[keep], doy[keep]
        series = {k: (None if v is None else v[keep]) for k, v in series.items()}
    else:
        bad = []

    return Climate(
        lat=lat,
        lon=lon,
        elevation_m=float(z if z is not None else cell_info[0]["elevation"]),
        source=source,
        method=method,
        cells=cell_info,
        year=year,
        doy=doy,
        month=month,
        quality=[r.summary() for r in reports],
        excluded_years=bad,
        **series,
    )


def _align(d_a: list[date], s_a: dict, d_b: list[date], s_b: dict) -> tuple[list[date], dict, dict]:
    """Recorta dos celdas a sus fechas comunes (por si una trae menos días que la otra)."""
    if d_a == d_b:
        return d_a, s_a, s_b
    common = sorted(set(d_a) & set(d_b))
    if not common:
        raise LookupError("NASA POWER: las celdas no comparten fechas")
    ia = {d: i for i, d in enumerate(d_a)}
    ib = {d: i for i, d in enumerate(d_b)}
    sel_a = np.array([ia[d] for d in common])
    sel_b = np.array([ib[d] for d in common])
    return (
        common,
        {k: (None if v is None else v[sel_a]) for k, v in s_a.items()},
        {k: (None if v is None else v[sel_b]) for k, v in s_b.items()},
    )
