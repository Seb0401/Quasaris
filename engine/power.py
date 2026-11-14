"""Descarga de clima diario de NASA POWER (comunidad AG) con caché en disco.

Orden: caché versionado en data/power_cache/ → API en vivo → error.
La celda de POWER es de ~0.5° × 0.625°, por eso la clave de caché redondea las coordenadas.
"""

from __future__ import annotations

import json
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / "data" / "power_cache"
API = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMS = ["T2M_MAX", "T2M_MIN", "ALLSKY_SFC_SW_DWN", "RH2M", "WS2M", "PRECTOTCORR", "GWETROOT"]
MISSING = -999


def cache_key(lat: float, lon: float, start: int, end: int) -> str:
    return f"{round(lat * 2) / 2:+.1f}_{round(lon * 1.6) / 1.6:+.3f}_{start}_{end}.json"


def _parse(payload: dict) -> dict[str, dict[str, float | None]]:
    """Devuelve {parametro: {AAAAMMDD: valor}} con None en lugar de -999."""
    raw = payload["properties"]["parameter"]
    return {p: {d: (None if v == MISSING else v) for d, v in raw[p].items()} for p in PARAMS if p in raw}


def fetch_daily(lat: float, lon: float, start_year: int, end_year: int, *, live: bool = True, timeout: float = 25.0):
    """Devuelve (datos, origen) con origen en {"cache", "live"}."""
    path = CACHE_DIR / cache_key(lat, lon, start_year, end_year)
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8")), "cache"
    if not live:
        raise FileNotFoundError(path)
    r = httpx.get(
        API,
        params={
            "parameters": ",".join(PARAMS),
            "community": "AG",
            "latitude": lat,
            "longitude": lon,
            "start": f"{start_year}0101",
            "end": f"{end_year}1231",
            "format": "JSON",
        },
        timeout=timeout,
    )
    r.raise_for_status()
    return _parse(r.json()), "live"


def save_cache(lat: float, lon: float, start_year: int, end_year: int, data: dict) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / cache_key(lat, lon, start_year, end_year)
    path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    return path
