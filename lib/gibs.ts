/**
 * Capas de NASA GIBS (WMTS, EPSG:3857) listas para Leaflet. Solo para mostrar, no para calcular.
 * Identificadores verificados en WMTSCapabilities el 2026-11-14.
 */
export const GIBS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

export const GIBS_LAYERS = {
  /** NDVI mensual MODIS Terra, 2000-03 → presente (hueco en 2025-04). Nivel máx. 7. */
  ndviMonthly: { id: "MODIS_Terra_L3_NDVI_Monthly", matrix: "GoogleMapsCompatible_Level7", maxNativeZoom: 7 },
  /** NDVI 16 días MODIS Terra. Nivel máx. 9. */
  ndvi16Day: { id: "MODIS_Terra_L3_NDVI_16Day", matrix: "GoogleMapsCompatible_Level9", maxNativeZoom: 9 },
  /** Humedad del suelo en la zona de raíces, SMAP L4 (modelo + satélite), diaria desde 2015-03-31. Nivel máx. 6 (~9 km). */
  smapRootZone: { id: "SMAP_L4_Analyzed_Root_Zone_Soil_Moisture", matrix: "GoogleMapsCompatible_Level6", maxNativeZoom: 6 },
} as const;

export const SMAP_START = "2015-03-31";

/** Fecha válida para SMAP a partir de una fecha mensual de NDVI (AAAA-MM-01 → día 15; antes de 2015 usa la más antigua). */
export function smapDate(time: string) {
  const d = `${time.slice(0, 7)}-15`;
  return d < SMAP_START ? "2015-04-15" : d;
}

export type GibsLayer = (typeof GIBS_LAYERS)[keyof typeof GIBS_LAYERS];

/** time: "AAAA-MM-DD" (para la capa mensual, el día 01 del mes). */
export function gibsUrl(layer: GibsLayer, time: string) {
  return `${GIBS_BASE}/${layer.id}/default/${time}/${layer.matrix}/{z}/{y}/{x}.png`;
}
