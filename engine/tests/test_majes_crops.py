"""Exercise new crop profiles through the real API, not only catalog membership."""
import json
import sys
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "api/py"))

from engine.crops import catalog
from engine.rotation import place
from engine.schema import Rotation, SimulateResponse
from index import app

NEW_IDS = ["alcachofa", "palta", "uva", "mandarina", "granada"]
RAW = json.loads((ROOT / "data/crops.json").read_text(encoding="utf-8"))
client = TestClient(app)


def test_new_crops_simulate_together_through_api():
    rotations = [{"id": crop, "name": crop, "isCurrent": i == 0,
                  "crops": [{"cropId": crop, "sowMonth": 4}]} for i, crop in enumerate(NEW_IDS)]
    payload = dict(lat=-16.36, lon=-72.19, soilTexture="arenoso", irrigation="goteo",
                   waterAvailableM3ha=15000, priorities=dict(water=.5, income=.5, soil=.5, risk=.5),
                   rotations=rotations, locale="en", includeClimate=True)
    response = client.post("/api/py/simulate", json=payload)
    assert response.status_code == 200, response.text
    result = SimulateResponse.model_validate(response.json())
    assert {r.id for r in result.rotations} == set(NEW_IDS)
    for r in result.rotations:
        assert len(r.byYear) == 21
        assert r.water.median > 0 and np.isfinite(r.income.median)
        assert all(len(y.monthlyWaterM3ha) == 12 for y in r.byYear)
        assert "review.cropAssumptions" in r.explain.reviewWithExpert
        if r.id != "alcachofa":
            assert "review.establishedOrchard" in r.explain.reviewWithExpert
            assert "bare" not in r.months


@pytest.mark.parametrize("crop_id", NEW_IDS[1:])
def test_orchard_curve_is_seasonal_year_round_and_not_rotated(crop_id):
    crop = catalog()[crop_id]
    curve = crop.kc_curve()
    assert len(curve) == 365
    assert len(set(curve)) > 1
    assert np.all(curve > 0)
    assert curve[0] == RAW["crops"][crop_id]["monthlyKc"][0]
    assert curve[181] == RAW["crops"][crop_id]["monthlyKc"][6]
    for mode in ["rotation", "association"]:
        rotation = Rotation(id="invalid", name="invalid", isCurrent=True, mode=mode,
                            crops=[dict(cropId=crop_id, sowMonth=1), dict(cropId="papa", sowMonth=5)])
        with pytest.raises(ValueError, match="orchards"):
            place(rotation)


def test_new_profiles_have_explicit_units_evidence_and_safe_harvests():
    for crop_id in NEW_IDS:
        crop = RAW["crops"][crop_id]
        assert set(crop["name"]) == set(crop["product"]) == set(crop["modelNote"]) == {"es", "en"}
        assert crop["evidenceStatus"] == "planning_assumption"
        assert crop["reviewedAt"] is None
        assert crop["sources"]["localPresence"].startswith("https://")
        if crop_id == "alcachofa":
            assert crop["harvestDays"] == sorted(set(crop["harvestDays"]))
            assert max(crop["harvestDays"]) < sum(crop["stagesDays"])
        else:
            assert len(crop["monthlyKc"]) == 12
            assert all(1 <= month <= 12 for month in crop["harvestMonths"])
