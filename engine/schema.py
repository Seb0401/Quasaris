"""Contrato del motor. Debe coincidir campo por campo con lib/contract.ts.

CONGELADO: cualquier cambio se acuerda con los responsables de A y B (PLAN.md §6).
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field

Locale = Literal["es", "en"]
SoilTexture = Literal["arenoso", "franco", "arcilloso"]
Irrigation = Literal["gravedad", "aspersion", "goteo"]
MonthStatus = Literal["ok", "water_stress", "climate_risk", "bare"]


class Priorities(BaseModel):
    water: float = Field(ge=0, le=1)
    income: float = Field(ge=0, le=1)
    soil: float = Field(ge=0, le=1)
    risk: float = Field(ge=0, le=1)


class RotationCrop(BaseModel):
    cropId: str
    sowMonth: int = Field(ge=1, le=12)


class Rotation(BaseModel):
    id: str
    name: str
    isCurrent: bool
    crops: list[RotationCrop]


class SimulateRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    soilTexture: SoilTexture
    irrigation: Irrigation
    waterAvailableM3ha: float = Field(ge=0)
    priorities: Priorities
    rotations: list[Rotation] = Field(min_length=1)
    years: Optional[tuple[int, int]] = (2005, 2025)
    locale: Locale = "es"


class Stat(BaseModel):
    median: float
    p10: float
    p90: float
    unit: str


class YearResult(BaseModel):
    year: int
    waterM3ha: float
    incomePEN: float
    frostDays: int
    heatDays: int
    months: list[MonthStatus] = Field(min_length=12, max_length=12)


class Highlight(BaseModel):
    year: int
    key: str
    params: dict[str, float]


class Explain(BaseModel):
    whyKey: str
    evidence: list[str]
    benefits: list[str]
    missing: list[str]
    reviewWithExpert: list[str]


class RotationResult(BaseModel):
    id: str
    viable: bool
    score: float = Field(ge=0, le=1)
    water: Stat
    income: Stat
    soil: float = Field(ge=0, le=1)
    risk: Stat
    byYear: list[YearResult]
    months: list[MonthStatus] = Field(min_length=12, max_length=12)
    highlights: list[Highlight]
    explain: Explain


class Source(BaseModel):
    power: Literal["live", "cache", "mock"]
    period: tuple[int, int]


class SimulateResponse(BaseModel):
    source: Source
    rotations: list[RotationResult]


class ClimateWeek(BaseModel):
    week: int = Field(ge=1, le=53)
    pFrost: float = Field(ge=0, le=1)
    pHeat: float = Field(ge=0, le=1)
    et0MeanMm: float


class ClimateResponse(BaseModel):
    weeks: list[ClimateWeek]
