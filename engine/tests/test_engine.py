"""Tests del motor: ET0 contra FAO-56 y comportamiento de la simulación con el caché de Majes."""

import json
import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from engine.crops import catalog  # noqa: E402
from engine.et0 import extraterrestrial_radiation, hargreaves, penman_monteith  # noqa: E402
from engine.power import get_climate  # noqa: E402
from engine.rotation import place  # noqa: E402
from engine.schema import Rotation, SimulateRequest  # noqa: E402
from engine.simulate import climate_weeks, run  # noqa: E402

ROTATIONS = json.loads((ROOT / "data" / "rotations_majes.json").read_text(encoding="utf-8"))["rotations"]


def req(**kw):
    base = dict(
        lat=-16.36,
        lon=-72.19,
        soilTexture="arenoso",
        irrigation="goteo",
        waterAvailableM3ha=15000,
        priorities=dict(water=0.5, income=0.5, soil=0.5, risk=0.5),
        rotations=ROTATIONS,
        locale="es",
    )
    base.update(kw)
    return SimulateRequest(**base)


# --- FAO-56 ---


def test_ra_fao56_ejemplo_8():
    # Ejemplo 8: 20°S, 3 de septiembre (día 246) → Ra = 32.2 MJ m⁻² día⁻¹
    assert extraterrestrial_radiation(-20, 246) == pytest.approx(32.2, abs=0.1)


def test_penman_monteith_fao56_ejemplo_18():
    # Ejemplo 18: Bruselas, 6 de julio. ET0 = 3.9 mm/día
    et0 = penman_monteith(tmax=21.5, tmin=12.3, rs=22.07, u2=2.078, lat_deg=50.80, elevation_m=100, doy=187, ea=1.409)
    assert float(et0) == pytest.approx(3.9, abs=0.1)


def test_hargreaves_razonable():
    et0 = hargreaves(tmax=26.6, tmin=14.8, lat_deg=-16.36, doy=1)
    assert 3.5 < float(et0) < 6.5


# --- cultivos y calendario ---


def test_curva_kc_respeta_etapas():
    papa = catalog()["papa"]
    curve = papa.kc_curve()
    assert curve.size == sum(papa.stages)
    assert curve[0] == papa.kc_ini
    assert curve.max() == pytest.approx(papa.kc_mid)
    assert curve[-1] == pytest.approx(papa.kc_end)


def test_alfalfa_cubre_todo_el_ano():
    _, kc, owner = place(Rotation(**ROTATIONS[0]))
    assert (owner >= 0).all() and kc.min() > 0


# --- clima y fusión ---


def test_fusion_vertical_majes():
    c = get_climate(-16.36, -72.19, 2005, 2025, elevation_m=1409, live=False)
    assert c.method == "blend"
    assert sorted(cell["elevation"] for cell in c.cells)[0] < 1409 < sorted(cell["elevation"] for cell in c.cells)[1]
    assert sum(cell["weight"] for cell in c.cells) == pytest.approx(1)
    assert len(c.years) == 21


# --- simulación ---


def test_simulacion_cumple_contrato_y_es_rapida():
    res = run(req())
    assert res.source.power == "cache"
    assert {r.id for r in res.rotations} == {r["id"] for r in ROTATIONS}
    for r in res.rotations:
        assert len(r.byYear) == 21
        assert r.water.p10 <= r.water.median <= r.water.p90
        assert 0 <= r.score <= 1


def test_goteo_usa_menos_agua_que_gravedad():
    goteo = {r.id: r.water.median for r in run(req(irrigation="goteo")).rotations}
    grav = {r.id: r.water.median for r in run(req(irrigation="gravedad")).rotations}
    assert all(goteo[k] < grav[k] for k in goteo)


def test_agua_insuficiente_marca_no_viable():
    res = run(req(waterAvailableM3ha=1000))
    assert not any(r.viable for r in res.rotations)


def test_prioridad_agua_favorece_la_rotacion_que_menos_gasta():
    res = run(req(priorities=dict(water=1, income=0, soil=0, risk=0)))
    best = max(res.rotations, key=lambda r: r.score)
    assert best.water.median == min(r.water.median for r in res.rotations)


def test_cultivo_desconocido_falla():
    bad = [{"id": "x", "name": "x", "isCurrent": True, "crops": [{"cropId": "quinua_marciana", "sowMonth": 1}]}]
    with pytest.raises(ValueError):
        run(req(rotations=bad))


def test_climatologia_semanal():
    weeks = climate_weeks(-16.36, -72.19).weeks
    assert len(weeks) == 52
    et0 = np.array([w.et0MeanMm for w in weeks])
    assert 2 < et0.min() < et0.max() < 7
