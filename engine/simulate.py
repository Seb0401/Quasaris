"""Orquestador: SimulateRequest → SimulateResponse (contrato en engine/schema.py)."""

from __future__ import annotations

from collections import Counter

import numpy as np

from engine.crops import catalog
from engine.elevation import srtm_elevation
from engine.power import Climate, get_climate
from engine.rotation import compute_et0, simulate_rotation, soil_score
from engine.schema import ClimateResponse, Rotation, SimulateRequest, SimulateResponse

SEVERITY = {"bare": 0, "ok": 1, "water_stress": 2, "climate_risk": 3}
FORAGE = {"alfalfa", "maiz_chala"}
CASH = {"papa", "cebolla"}
NON_VIABLE_PENALTY = 0.6
AGRO_FROST_C = 2.0  # Tmin a 2 m ≤ 2 °C → posible helada a nivel del cultivo
HEAT_C = 30.0
SOIL_DRY = 0.4  # GWETROOT medio por debajo de esto: suelo naturalmente seco, todo depende del riego


def _stat(values: list[float], unit: str) -> dict:
    a = np.asarray(values, dtype=float)
    return {"median": float(np.median(a)), "p10": float(np.percentile(a, 10)), "p90": float(np.percentile(a, 90)), "unit": unit}


def _typical_months(by_year: list[dict]) -> list[str]:
    out = []
    for m in range(12):
        counts = Counter(y["months"][m] for y in by_year)
        out.append(max(counts, key=lambda s: (counts[s], SEVERITY[s])))
    return out


def _norm_inverse(v: float, lo: float, hi: float) -> float:
    return 1.0 if hi - lo < 1e-9 else 1 - (v - lo) / (hi - lo)


def _norm(v: float, lo: float, hi: float) -> float:
    return 1.0 if hi - lo < 1e-9 else (v - lo) / (hi - lo)


def load_climate(lat: float, lon: float, years: tuple[int, int], elevation_m: float | None = None) -> Climate:
    z = elevation_m if elevation_m is not None else srtm_elevation(lat, lon)
    return get_climate(lat, lon, years[0], years[1], elevation_m=z)


def run(req: SimulateRequest) -> SimulateResponse:
    years = tuple(req.years or (2005, 2025))
    unknown = {c.cropId for r in req.rotations for c in r.crops} - set(catalog())
    if unknown:
        raise ValueError(f"cultivos desconocidos: {sorted(unknown)}")

    clim = load_climate(req.lat, req.lon, years)
    et0 = compute_et0(clim)

    raw = []
    for rot in req.rotations:
        by_year = simulate_rotation(rot, clim, et0, irrigation=req.irrigation, soil=req.soilTexture, water_available=req.waterAvailableM3ha)
        typical = _typical_months(by_year)
        water = _stat([y["waterM3ha"] for y in by_year], "m3/ha")
        income = _stat([y["incomePEN"] for y in by_year], "PEN/ha")
        risk_by_year = [
            max(y["_climateLoss"], 0.0 if y["waterM3ha"] <= req.waterAvailableM3ha else 1 - req.waterAvailableM3ha / y["waterM3ha"]) for y in by_year
        ]
        raw.append(
            {
                "rot": rot,
                "by_year": by_year,
                "typical": typical,
                "water": water,
                "income": income,
                "risk": _stat(risk_by_year, "fraction"),
                "risk_by_year": risk_by_year,
                "soil": soil_score(rot, typical),
                "viable": water["median"] <= req.waterAvailableM3ha,
            }
        )

    w_lo, w_hi = min(r["water"]["median"] for r in raw), max(r["water"]["median"] for r in raw)
    i_lo, i_hi = min(r["income"]["median"] for r in raw), max(r["income"]["median"] for r in raw)
    s_hi = max(r["soil"] for r in raw)
    pr = req.priorities
    weights = np.array([pr.water, pr.income, pr.soil, pr.risk])
    if weights.sum() == 0:
        weights = np.ones(4)

    rotations = []
    for r in raw:
        parts = np.array(
            [
                _norm_inverse(r["water"]["median"], w_lo, w_hi),
                _norm(r["income"]["median"], i_lo, i_hi),
                r["soil"],
                1 - r["risk"]["median"],
            ]
        )
        score = float(parts @ weights / weights.sum())
        if not r["viable"]:
            score *= NON_VIABLE_PENALTY
        flags = {
            "bestWater": r["water"]["median"] <= w_lo + 1e-6,
            "bestIncome": r["income"]["median"] >= i_hi - 1e-6,
            "bestSoil": r["soil"] >= s_hi - 1e-9,
        }
        rotations.append(
            {
                "id": r["rot"].id,
                "viable": r["viable"],
                "score": round(float(np.clip(score, 0, 1)), 3),
                "water": r["water"],
                "income": r["income"],
                "soil": round(r["soil"], 3),
                "risk": r["risk"],
                "byYear": [{k: v for k, v in y.items() if not k.startswith("_")} for y in r["by_year"]],
                "months": r["typical"],
                "highlights": _highlights(r),
                "explain": _explain(r["rot"], r, flags, clim),
            }
        )

    return SimulateResponse.model_validate(
        {
            "source": {
                "power": clim.source,
                "period": [clim.years[0], clim.years[-1]],
                "elevationM": round(clim.elevation_m),
                "method": clim.method,
                "cells": clim.cells,
                "rootZoneWetness": [round(float(clim.gwetroot[clim.month == m].mean()), 3) for m in range(1, 13)],
            },
            "rotations": rotations,
        }
    )


def _highlights(r: dict) -> list[dict]:
    by_year = r["by_year"]
    out = []
    driest = max(by_year, key=lambda y: y["waterM3ha"])
    extra = driest["waterM3ha"] - r["water"]["median"]
    if extra > 0:
        out.append({"year": driest["year"], "key": "highlight.driestYear", "params": {"extraM3ha": round(extra)}})
    worst = min(by_year, key=lambda y: y["incomePEN"])
    loss = r["income"]["median"] - worst["incomePEN"]
    if loss > 0.05 * max(abs(r["income"]["median"]), 1):
        out.append({"year": worst["year"], "key": "highlight.worstYear", "params": {"lossPEN": round(loss)}})
    problems = sum(1 for v in r["risk_by_year"] if v > 0.1)
    if problems:
        last = max(y["year"] for y, v in zip(by_year, r["risk_by_year"]) if v > 0.1)
        out.append({"year": last, "key": "highlight.problemYears", "params": {"count": problems, "total": len(by_year)}})
    return out


def _explain(rot: Rotation, r: dict, flags: dict, clim: Climate) -> dict:
    cat = catalog()
    crops = [cat[c.cropId] for c in rot.crops]
    ids = {c.id for c in crops}
    legume = any(c.fixes_nitrogen for c in crops)
    frost = sum(y["frostDays"] for y in r["by_year"])

    if rot.isCurrent:
        why = "why.current"
    elif flags["bestWater"]:
        why = "why.bestWater"
    elif flags["bestIncome"]:
        why = "why.bestIncome"
    elif flags["bestSoil"]:
        why = "why.bestSoil"
    else:
        why = "why.balanced"

    evidence = ["evidence.power20y", "evidence.et0"]
    if clim.method == "blend":
        evidence.append("evidence.fusion")
    evidence.append("evidence.frostYears" if frost else "evidence.noFrost")
    evidence.append("evidence.soilDry" if float(clim.gwetroot.mean()) < SOIL_DRY else "evidence.soilSeasonal")
    if legume:
        evidence.append("evidence.legumeN")

    benefits = []
    if flags["bestWater"]:
        benefits.append("benefit.water")
    if flags["bestIncome"]:
        benefits.append("benefit.income")
    if legume:
        benefits.append("benefit.nitrogen")
    if any(c.perennial for c in crops):
        benefits.append("benefit.cover")
    if len({c.family for c in crops}) >= 3:
        benefits.append("benefit.pestCycle")
    if ids & FORAGE:
        benefits.append("benefit.forage")

    missing = ["missing.waterAllocation", "missing.prices", "missing.localYield"]
    if clim.method == "blend":
        missing.append("missing.groundStation")

    review = []
    if not r["viable"]:
        review.append("review.waterShortage")
    if frost:
        review.append("review.frost")
    if legume and not any(c.perennial for c in crops):
        review.append("review.legumeVariety")
    if ids & CASH:
        review.append("review.market")
    if "alfalfa" in ids:
        review.append("review.alfalfaAge")
    review.append("review.sowingDates")

    return {"whyKey": why, "evidence": evidence, "benefits": benefits or ["benefit.baseline"], "missing": missing, "reviewWithExpert": review}


def climate_weeks(lat: float, lon: float, years: tuple[int, int] = (2005, 2025)) -> ClimateResponse:
    clim = load_climate(lat, lon, years)
    et0 = compute_et0(clim)
    week = np.minimum((clim.doy - 1) // 7, 51)
    n_years = len(clim.years)
    weeks = []
    for w in range(52):
        sel = week == w
        frost_years = len(set(clim.year[sel & (clim.tmin <= AGRO_FROST_C)].tolist()))
        heat_years = len(set(clim.year[sel & (clim.tmax >= HEAT_C)].tolist()))
        weeks.append(
            {
                "week": w + 1,
                "pFrost": round(frost_years / n_years, 3),
                "pHeat": round(heat_years / n_years, 3),
                "et0MeanMm": round(float(et0[sel].mean()), 2),
                "soilWetness": round(float(clim.gwetroot[sel].mean()), 3),
            }
        )
    return ClimateResponse.model_validate({"weeks": weeks})
