/**
 * Contrato entre la PWA (Next.js) y el motor (Python, api/py).
 * Debe coincidir campo por campo con engine/schema.py.
 * CONGELADO: cualquier cambio se acuerda con los responsables de A y B (ver PLAN.md §6).
 */

export type Locale = "es" | "en";
export type SoilTexture = "arenoso" | "franco" | "arcilloso";
export type Irrigation = "gravedad" | "aspersion" | "goteo";
export type MonthStatus = "ok" | "water_stress" | "climate_risk" | "bare";

export type Priorities = {
  water: number; // 0..1
  income: number;
  soil: number;
  risk: number;
};

export type RotationCrop = { cropId: string; sowMonth: number }; // sowMonth 1..12

export type Rotation = {
  id: string;
  name: string;
  isCurrent: boolean;
  crops: RotationCrop[];
};

// POST /api/py/simulate
export type SimulateRequest = {
  lat: number;
  lon: number;
  soilTexture: SoilTexture;
  irrigation: Irrigation;
  waterAvailableM3ha: number; // por campaña anual
  priorities: Priorities;
  rotations: Rotation[]; // [actual, ...alternativas]
  years?: [number, number]; // por defecto [2005, 2025]
  locale: Locale;
};

export type Stat = { median: number; p10: number; p90: number; unit: string };

export type YearResult = {
  year: number;
  waterM3ha: number;
  incomePEN: number;
  frostDays: number;
  heatDays: number;
  months: MonthStatus[]; // 12 elementos, ene..dic
};

export type Highlight = {
  year: number;
  key: string; // clave i18n, p. ej. "highlight.driestYear"
  params: Record<string, number>;
};

export type Explain = {
  whyKey: string;
  evidence: string[]; // claves i18n
  benefits: string[];
  missing: string[];
  reviewWithExpert: string[];
};

export type RotationResult = {
  id: string;
  viable: boolean;
  score: number; // 0..1
  water: Stat;
  income: Stat;
  soil: number; // 0..1
  risk: Stat;
  byYear: YearResult[]; // Máquina del tiempo
  months: MonthStatus[]; // 12 meses típicos
  highlights: Highlight[];
  explain: Explain;
};

export type SimulateResponse = {
  source: { power: "live" | "cache" | "mock"; period: [number, number] };
  rotations: RotationResult[];
};

// GET /api/py/climate?lat=&lon=
export type ClimateWeek = {
  week: number; // 1..52
  pFrost: number; // 0..1
  pHeat: number; // 0..1
  et0MeanMm: number;
};
export type ClimateResponse = { weeks: ClimateWeek[] };
