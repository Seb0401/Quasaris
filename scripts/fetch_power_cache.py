"""Descarga y guarda en data/power_cache/ el clima NASA POWER de los puntos piloto de Majes.

Uso: python scripts/fetch_power_cache.py [inicio] [fin]   (por defecto 2005 2025)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from engine.power import fetch_daily, save_cache  # noqa: E402

# Puntos piloto (aprox.). Agregar más parcelas de la irrigación Majes si hace falta.
POINTS = {
    "el_pedregal": (-16.36, -72.19),
}

if __name__ == "__main__":
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 2005
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 2025
    for name, (lat, lon) in POINTS.items():
        data, origin = fetch_daily(lat, lon, start, end, timeout=120)
        if origin == "live":
            path = save_cache(lat, lon, start, end, data)
            days = len(next(iter(data.values())))
            print(f"{name}: {days} días -> {path.name}")
        else:
            print(f"{name}: ya estaba en caché")
