"""Motor de FarmTwin expuesto como FastAPI (función Python en Vercel).

Todas las rutas /api/py/* llegan aquí (rewrite en vercel.json).
Local: npm run dev:py  (uvicorn en :8000; Next reenvía /api/py/* en desarrollo).
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI  # noqa: E402

from engine.schema import ClimateResponse, SimulateRequest, SimulateResponse  # noqa: E402

app = FastAPI(title="FarmTwin engine", docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")

MOCK = ROOT / "data" / "mock_simulate.json"


@app.get("/api/py/health")
def health():
    return {"ok": True, "engine": "farmtwin", "python": sys.version.split()[0]}


@app.post("/api/py/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest):
    # TODO(flujo A): reemplazar por el motor real (POWER → ET0 → ETc → riego → puntaje).
    # Mientras tanto devuelve el mock filtrado a las rotaciones pedidas.
    data = json.loads(MOCK.read_text(encoding="utf-8"))
    ids = {r.id for r in req.rotations}
    data["rotations"] = [r for r in data["rotations"] if r["id"] in ids] or data["rotations"]
    for r in data["rotations"]:
        r["viable"] = r["water"]["median"] <= req.waterAvailableM3ha
    return data


@app.get("/api/py/climate", response_model=ClimateResponse)
def climate(lat: float, lon: float):
    # TODO(flujo A): climatología real por semana con NASA POWER.
    weeks = []
    for w in range(1, 53):
        winter = 22 <= w <= 34  # junio a agosto
        weeks.append({"week": w, "pFrost": 0.35 if winter else 0.02, "pHeat": 0.15 if w <= 10 or w >= 48 else 0.03, "et0MeanMm": 4.5 if winter else 6.0})
    return {"weeks": weeks}
