"""Catálogo de cultivos (data/crops.json) y curva diaria de Kc (FAO-56, fig. 25)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Crop:
    id: str
    family: str
    fixes_nitrogen: bool
    perennial: bool
    kc_ini: float
    kc_mid: float
    kc_end: float
    kc_avg: float | None
    stages: tuple[int, int, int, int]
    root_depth_m: float
    t_frost_c: float
    t_heat_c: float
    yield_t_ha: float
    price_pen_t: float
    cost_pen_ha: float

    @property
    def cycle_days(self) -> int:
        return 365 if self.perennial else sum(self.stages)

    def kc_curve(self) -> np.ndarray:
        """Kc diario desde la siembra hasta la cosecha."""
        if self.perennial:
            return np.full(365, self.kc_avg if self.kc_avg is not None else self.kc_mid)
        ini, dev, mid, late = self.stages
        return np.concatenate(
            [
                np.full(ini, self.kc_ini),
                np.linspace(self.kc_ini, self.kc_mid, dev, endpoint=False),
                np.full(mid, self.kc_mid),
                np.linspace(self.kc_mid, self.kc_end, late),
            ]
        )


@lru_cache
def companions() -> dict[frozenset, int]:
    """Efecto de asociar dos cultivos (-2..+2), de data/crops.json. '*' = con cualquier otro."""
    raw = json.loads((ROOT / "data" / "crops.json").read_text(encoding="utf-8")).get("companions", [])
    return {frozenset((c["a"], c["b"])): int(c["effect"]) for c in raw}


def companion_effect(a: str, b: str) -> int:
    table = companions()
    return table.get(frozenset((a, b)), table.get(frozenset((a, "*")), table.get(frozenset((b, "*")), 0)))


@lru_cache
def catalog() -> dict[str, Crop]:
    raw = json.loads((ROOT / "data" / "crops.json").read_text(encoding="utf-8"))["crops"]
    out = {}
    for cid, c in raw.items():
        out[cid] = Crop(
            id=cid,
            family=c["family"],
            fixes_nitrogen=c["fixesNitrogen"],
            perennial=c.get("perennial", False),
            kc_ini=c["kc"]["ini"],
            kc_mid=c["kc"]["mid"],
            kc_end=c["kc"]["end"],
            kc_avg=c.get("kcAvg"),
            stages=tuple(c["stagesDays"]),
            root_depth_m=c["rootDepthM"],
            t_frost_c=c["tFrostC"],
            t_heat_c=c["tHeatC"],
            yield_t_ha=c["yieldTha"],
            price_pen_t=c["pricePENt"],
            cost_pen_ha=c["costPENha"],
        )
    return out
