"""Genera data/mock_simulate.json: una foto del motor REAL para Majes con los valores por defecto.

La PWA lo usa como último respaldo cuando no hay red ni resultado guardado.
Uso: python scripts/make_mock.py   (requiere el caché de data/power_cache/)
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from engine.schema import SimulateRequest  # noqa: E402
from engine.simulate import run  # noqa: E402

# Debe coincidir con DEFAULT en lib/farm-store.ts
DEFAULTS = dict(
    lat=-16.36,
    lon=-72.19,
    soilTexture="arenoso",
    irrigation="aspersion",
    waterAvailableM3ha=15000,
    priorities=dict(water=0.5, income=0.5, soil=0.5, risk=0.5),
    locale="es",
)

if __name__ == "__main__":
    rotations = json.loads((ROOT / "data" / "rotations_majes.json").read_text(encoding="utf-8"))["rotations"]
    res = run(SimulateRequest(**DEFAULTS, rotations=rotations)).model_dump(mode="json", exclude_none=True)
    out = ROOT / "data" / "mock_simulate.json"
    out.write_text(json.dumps(res, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"OK -> {out.name} ({len(res['rotations'])} rotaciones, fuente {res['source']['power']}/{res['source'].get('method')})")
