"""Elevación del terreno (SRTM de NASA, ~90 m) vía la API pública de OpenTopoData.

Se usa para corregir la temperatura de la celda de NASA POWER (~50 km) a la altitud real
de la parcela. Si el servicio no responde, se devuelve None y el motor usa la elevación de la celda.
"""

from __future__ import annotations

import httpx

from engine.quality import validate_elevation

API = "https://api.opentopodata.org/v1/srtm90m"
_cache: dict[tuple[float, float], float | None] = {
    (-16.36, -72.19): 1409.0,  # El Pedregal, Majes (consultado el 2026-11-14)
}


def srtm_elevation(lat: float, lon: float, timeout: float = 4.0) -> float | None:
    key = (round(lat, 2), round(lon, 2))
    if key in _cache:
        return _cache[key]
    try:
        r = httpx.get(API, params={"locations": f"{lat},{lon}"}, timeout=timeout)
        r.raise_for_status()
        z = validate_elevation(r.json()["results"][0]["elevation"])  # None si no es un número válido
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
        z = None
    _cache[key] = z
    return z
