"""El mock y la API deben cumplir el contrato (engine/schema.py ↔ lib/contract.ts)."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "api" / "py"))

from fastapi.testclient import TestClient  # noqa: E402

from engine.schema import ClimateResponse, SimulateResponse  # noqa: E402
from index import app  # noqa: E402

client = TestClient(app)
ROTATIONS = json.loads((ROOT / "data" / "rotations_majes.json").read_text(encoding="utf-8"))["rotations"]
REQ = {
    "lat": -16.36,
    "lon": -72.19,
    "soilTexture": "arenoso",
    "irrigation": "gravedad",
    "waterAvailableM3ha": 14000,
    "priorities": {"water": 0.5, "income": 0.5, "soil": 0.5, "risk": 0.5},
    "rotations": ROTATIONS,
    "locale": "es",
}


def test_mock_cumple_contrato():
    data = json.loads((ROOT / "data" / "mock_simulate.json").read_text(encoding="utf-8"))
    SimulateResponse.model_validate(data)


def test_simulate():
    r = client.post("/api/py/simulate", json=REQ)
    assert r.status_code == 200
    data = SimulateResponse.model_validate(r.json())
    assert {x.id for x in data.rotations} == {x["id"] for x in ROTATIONS}
    assert all(len(x.byYear) >= 20 for x in data.rotations)


def test_simulate_rechaza_entrada_invalida():
    assert client.post("/api/py/simulate", json={**REQ, "lat": 200}).status_code == 422


def test_climate():
    r = client.get("/api/py/climate", params={"lat": -16.36, "lon": -72.19})
    assert r.status_code == 200
    assert len(ClimateResponse.model_validate(r.json()).weeks) == 52
