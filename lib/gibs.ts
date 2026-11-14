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
} as const;

export type GibsLayer = (typeof GIBS_LAYERS)[keyof typeof GIBS_LAYERS];

/** time: "AAAA-MM-DD" (para la capa mensual, el día 01 del mes). */
export function gibsUrl(layer: GibsLayer, time: string) {
  return `${GIBS_BASE}/${layer.id}/default/${time}/${layer.matrix}/{z}/{y}/{x}.png`;
}
