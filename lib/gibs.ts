/**
 * Capas de NASA GIBS (WMTS, EPSG:3857) listas para Leaflet. Solo para mostrar, no para calcular.
 * Identificadores, niveles y rangos de fecha verificados en WMTSCapabilities el 2026-11-14.
 */
export const GIBS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
const LEGENDS = "https://gibs.earthdata.nasa.gov/legends";

export type GibsLayer = {
  id: string;
  matrix: string;
  maxNativeZoom: number;
  ext: "png" | "jpg";
  /** "month": se pide el día 01 del mes; "day": un día concreto. */
  step: "month" | "day";
  /** Primera y última fecha con datos (AAAA-MM-DD). */
  first: string;
  last: string;
  legend?: string;
  attribution: string;
};

export const GIBS_LAYERS = {
  /** NDVI mensual MODIS Terra, 2000-03 → 2026-10 (hueco en 2025-04). Nivel máx. 7. */
  ndviMonthly: {
    id: "MODIS_Terra_L3_NDVI_Monthly",
    matrix: "GoogleMapsCompatible_Level7",
    maxNativeZoom: 7,
    ext: "png",
    step: "month",
    first: "2000-03-01",
    last: "2026-10-01",
    legend: `${LEGENDS}/MODIS_L3_NDVI_H.svg`,
    attribution: "NDVI: NASA GIBS / MODIS Terra",
  },
  /** NDVI 16 días MODIS Terra. Nivel máx. 9. */
  ndvi16Day: {
    id: "MODIS_Terra_L3_NDVI_16Day",
    matrix: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    ext: "png",
    step: "day",
    first: "2000-03-05",
    last: "2026-10-16",
    legend: `${LEGENDS}/MODIS_L3_NDVI_H.svg`,
    attribution: "NDVI: NASA GIBS / MODIS Terra",
  },
  /** Humedad del suelo en zona de raíces, SMAP L4 (modelo + satélite), diaria desde 2015-03-31. Nivel máx. 6 (~9 km). */
  smapRootZone: {
    id: "SMAP_L4_Analyzed_Root_Zone_Soil_Moisture",
    matrix: "GoogleMapsCompatible_Level6",
    maxNativeZoom: 6,
    ext: "png",
    step: "day",
    first: "2015-03-31",
    last: "2026-11-10",
    legend: `${LEGENDS}/SMAP_Analyzed_Soil_Moisture_H.svg`,
    attribution: "Humedad del suelo: NASA GIBS / SMAP L4",
  },
  /** Color real MODIS Terra, diario. Nivel máx. 9. */
  trueColor: {
    id: "MODIS_Terra_CorrectedReflectance_TrueColor",
    matrix: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    ext: "jpg",
    step: "day",
    first: "2000-02-24",
    last: "2026-11-14",
    attribution: "Color real: NASA GIBS / MODIS Terra",
  },
} as const satisfies Record<string, GibsLayer>;

export type GibsLayerKey = keyof typeof GIBS_LAYERS;

/** Capas que el agricultor puede elegir en el mapa (orden del selector). */
export const MAP_LAYERS: GibsLayerKey[] = ["ndviMonthly", "smapRootZone", "trueColor"];

/** time: "AAAA-MM-DD" (para la capa mensual, el día 01 del mes). */
export function gibsUrl(layer: GibsLayer, time: string) {
  return `${GIBS_BASE}/${layer.id}/default/${time}/${layer.matrix}/{z}/{y}/{x}.${layer.ext}`;
}

/** Ajusta una fecha al rango de la capa y a su paso (mensual → día 01; evita el hueco de abril 2025 del NDVI). */
export function layerTime(layer: GibsLayer, year: number, month: number, day = 15): string {
  const mm = String(month).padStart(2, "0");
  let t = layer.step === "month" ? `${year}-${mm}-01` : `${year}-${mm}-${String(day).padStart(2, "0")}`;
  if (layer.id === GIBS_LAYERS.ndviMonthly.id && t === "2025-04-01") t = "2025-03-01";
  if (t < layer.first) t = layer.first;
  if (t > layer.last) t = layer.last;
  return t;
}
