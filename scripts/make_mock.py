"""Genera data/mock_simulate.json: respuesta FALSA pero válida según el contrato.

Sirve para que la PWA y el asistente avancen antes de que el motor real esté listo.
Las cifras son inventadas (deterministas). No usar en la demo final.

Uso: python scripts/make_mock.py
"""

import json
import random
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from engine.schema import SimulateResponse  # noqa: E402

YEARS = list(range(2005, 2026))
DRY_YEARS = {2016: 1.18, 2023: 1.12, 2010: 1.07}
FROST_YEARS = {2007: 9, 2013: 7, 2021: 6}

PROFILES = {
    # id: (agua base m3/ha, ingreso base PEN/ha, suelo, meses desnudos, meses sensibles a helada)
    "actual": (16000, 9000, 0.62, [], []),
    "ingreso": (13500, 15500, 0.38, [2, 7], [6, 7, 8]),
    "suelo_agua": (11800, 12500, 0.74, [7], [6, 7]),
}

EXPLAIN = {
    "actual": {
        "whyKey": "why.current",
        "evidence": ["evidence.power20y", "evidence.et0High"],
        "benefits": ["benefit.forage", "benefit.nitrogen"],
        "missing": ["missing.waterAllocation"],
        "reviewWithExpert": ["review.alfalfaAge"],
    },
    "ingreso": {
        "whyKey": "why.income",
        "evidence": ["evidence.power20y", "evidence.frostWinter"],
        "benefits": ["benefit.income", "benefit.pestCycle"],
        "missing": ["missing.prices"],
        "reviewWithExpert": ["review.potatoFrost", "review.market"],
    },
    "suelo_agua": {
        "whyKey": "why.soilWater",
        "evidence": ["evidence.power20y", "evidence.legumeN"],
        "benefits": ["benefit.water", "benefit.nitrogen", "benefit.organicMatter"],
        "missing": ["missing.fabaYield"],
        "reviewWithExpert": ["review.legumeVariety"],
    },
}


def pct(values, q):
    s = sorted(values)
    return s[round(q * (len(s) - 1))]


def build():
    rng = random.Random(42)
    available = 14000
    rotations = []
    for rid, (water, income, soil, bare, frost_sensitive) in PROFILES.items():
        by_year = []
        for y in YEARS:
            dry = DRY_YEARS.get(y, 1.0)
            frost = FROST_YEARS.get(y, rng.randint(0, 3))
            w = water * dry * rng.uniform(0.95, 1.05)
            inc = income * rng.uniform(0.85, 1.1) - (frost * 600 if frost_sensitive else 0)
            months = []
            for m in range(1, 13):
                if m in bare:
                    months.append("bare")
                elif m in frost_sensitive and frost >= 6:
                    months.append("climate_risk")
                elif dry > 1.1 and m in (9, 10, 11):
                    months.append("water_stress")
                else:
                    months.append("ok")
            by_year.append(
                {
                    "year": y,
                    "waterM3ha": round(w),
                    "incomePEN": round(inc),
                    "frostDays": frost,
                    "heatDays": rng.randint(0, 4),
                    "months": months,
                }
            )
        ws = [r["waterM3ha"] for r in by_year]
        incs = [r["incomePEN"] for r in by_year]
        risk_years = [1.0 if "climate_risk" in r["months"] or "water_stress" in r["months"] else 0.0 for r in by_year]
        driest = max(by_year, key=lambda r: r["waterM3ha"])
        median_w = statistics.median(ws)
        typical = ["bare" if m in bare else "ok" for m in range(1, 13)]
        rotations.append(
            {
                "id": rid,
                "viable": median_w <= available,
                "score": 0.0,
                "water": {"median": median_w, "p10": pct(ws, 0.1), "p90": pct(ws, 0.9), "unit": "m3/ha"},
                "income": {"median": statistics.median(incs), "p10": pct(incs, 0.1), "p90": pct(incs, 0.9), "unit": "PEN/ha"},
                "soil": soil,
                "risk": {"median": statistics.mean(risk_years), "p10": 0, "p90": 1, "unit": "fraction"},
                "byYear": by_year,
                "months": typical,
                "highlights": [
                    {
                        "year": driest["year"],
                        "key": "highlight.driestYear",
                        "params": {"extraM3ha": round(driest["waterM3ha"] - median_w)},
                    }
                ],
                "explain": EXPLAIN[rid],
            }
        )
    # puntaje simple con prioridades iguales, solo para el mock
    wmax = max(r["water"]["median"] for r in rotations)
    imax = max(r["income"]["median"] for r in rotations)
    for r in rotations:
        a = 1 - r["water"]["median"] / wmax + 0.3
        i = r["income"]["median"] / imax
        r["score"] = round(min(1, max(0, (a + i + r["soil"] + (1 - r["risk"]["median"])) / 4)), 3)
    return {"source": {"power": "mock", "period": [YEARS[0], YEARS[-1]]}, "rotations": rotations}


if __name__ == "__main__":
    data = SimulateResponse.model_validate(build()).model_dump(mode="json")
    out = ROOT / "data" / "mock_simulate.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"OK -> {out} ({len(data['rotations'])} rotaciones, {len(YEARS)} años)")
