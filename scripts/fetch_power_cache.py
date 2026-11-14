"""Descarga y versiona en data/power_cache/ las celdas NASA POWER que rodean los puntos piloto.

Uso: python scripts/fetch_power_cache.py [inicio] [fin]   (por defecto 2005 2025)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from engine.power import load_cell, neighbor_cells, save_repo_cache  # noqa: E402

# Puntos piloto de la irrigación Majes (aprox.)
POINTS = {
    "el_pedregal": (-16.36, -72.19),
    "majes_norte": (-16.25, -72.30),
    "majes_sur": (-16.45, -72.10),
}

if __name__ == "__main__":
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 2005
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 2025
    cells = sorted({c for lat, lon in POINTS.values() for c in neighbor_cells(lat, lon)})
    for clat, clon in cells:
        data, origin = load_cell(clat, clon, start, end, timeout=120)
        if data is None:
            print(f"({clat}, {clon}): ERROR")
            continue
        path = save_repo_cache(data)
        print(f"({clat:+.2f}, {clon:+.3f}) elev {data['meta']['elevation']:.0f} m [{origin}] -> {path.name}")
