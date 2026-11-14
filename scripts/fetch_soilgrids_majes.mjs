/**
 * Descarga estadísticos del WCS de SoilGrids para el AOI de los puntos piloto
 * de Majes y los guarda como data/soilgrids/majes.json.
 *
 * Uso: node scripts/fetch_soilgrids_majes.mjs
 *
 * Es una referencia regional del modelo SoilGrids (250 m), no una medición
 * puntual del predio ni un dato de humedad actual.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fromArrayBuffer } from "geotiff";

const SOURCE = "https://maps.isric.org";
const WCS = "http://www.opengis.net/def/crs/EPSG/0/";
const OUTPUT = resolve("data/soilgrids/majes.json");
const NODATA = 0;
const SCALE_FACTOR = 10;
const DEPTHS = ["0-5cm", "5-15cm", "15-30cm"];

// Same pilot locations used by scripts/fetch_power_cache.py, with a small AOI margin.
const PILOT_POINTS = {
  el_pedregal: { lat: -16.36, lon: -72.19 },
  majes_norte: { lat: -16.25, lon: -72.3 },
  majes_sur: { lat: -16.45, lon: -72.1 },
};

const latitudes = Object.values(PILOT_POINTS).map(({ lat }) => lat);
const longitudes = Object.values(PILOT_POINTS).map(({ lon }) => lon);
const AOI = {
  minLat: Number((Math.min(...latitudes) - 0.01).toFixed(4)),
  maxLat: Number((Math.max(...latitudes) + 0.01).toFixed(4)),
  minLon: Number((Math.min(...longitudes) - 0.01).toFixed(4)),
  maxLon: Number((Math.max(...longitudes) + 0.01).toFixed(4)),
};

function coverageTasks() {
  const tasks = [];
  for (const property of ["sand", "silt", "clay"]) {
    for (const depth of DEPTHS) {
      for (const quantile of ["Q0.05", "Q0.5", "Q0.95"]) {
        tasks.push({ property, depth, quantile });
      }
    }
  }
  for (const property of ["wv0033", "wv1500"]) {
    for (const depth of DEPTHS) tasks.push({ property, depth, quantile: "Q0.5" });
  }
  return tasks;
}

async function fetchCoverage({ property, depth, quantile }) {
  const url = new URL(`/mapserv/${property}`, SOURCE);
  const params = {
    SERVICE: "WCS",
    VERSION: "2.0.1",
    REQUEST: "GetCoverage",
    COVERAGEID: `${property}_${depth}_${quantile}`,
    FORMAT: "GEOTIFF_INT16",
    SUBSETTINGCRS: `${WCS}4326`,
    OUTPUTCRS: `${WCS}152160`,
  };
  for (const [key, value] of Object.entries(params)) url.searchParams.append(key, value);
  url.searchParams.append("SUBSET", `Lat(${AOI.minLat},${AOI.maxLat})`);
  url.searchParams.append("SUBSET", `Long(${AOI.minLon},${AOI.maxLon})`);

  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  const body = await response.arrayBuffer();
  if (!response.ok || !response.headers.get("content-type")?.includes("image/tiff")) {
    const message = new TextDecoder().decode(body).slice(0, 500);
    throw new Error(`SoilGrids ${property}/${depth}/${quantile}: HTTP ${response.status}: ${message}`);
  }

  const tiff = await fromArrayBuffer(body);
  const image = await tiff.getImage();
  const [band] = await image.readRasters();
  return {
    values: Array.from(band, Number),
    width: image.getWidth(),
    height: image.getHeight(),
    bbox: image.getBoundingBox(),
  };
}

function summarize(rawValues, scaleFactor = SCALE_FACTOR) {
  const values = rawValues
    .filter((value) => Number.isFinite(value) && value !== NODATA)
    .map((value) => value / scaleFactor)
    .sort((a, b) => a - b);
  if (values.length === 0) throw new Error("SoilGrids no devolvió píxeles válidos dentro del AOI.");
  const at = (fraction) => values[Math.min(values.length - 1, Math.floor((values.length - 1) * fraction))];
  return {
    cells: values.length,
    min: values[0],
    p10: at(0.1),
    median: at(0.5),
    p90: at(0.9),
    max: values.at(-1),
  };
}

async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    }),
  );
  return results;
}

const tasks = coverageTasks();
const fetched = await mapWithConcurrency(tasks, 3, async (task) => ({
  ...task,
  raster: await fetchCoverage(task),
}));

const coverages = Object.fromEntries(
  fetched.map(({ property, depth, quantile, raster }) => [
    `${property}/${depth}/${quantile}`,
    raster,
  ]),
);
const grid = Object.values(coverages)[0];
for (const [coverageId, raster] of Object.entries(coverages)) {
  const sameSize = raster.width === grid.width && raster.height === grid.height;
  const sameBounds = raster.bbox.every((value, index) => Math.abs(value - grid.bbox[index]) < 0.01);
  if (!sameSize || !sameBounds) {
    throw new Error(`La cobertura ${coverageId} no coincide con la grilla del resto; no se calcularán diferencias entre capas.`);
  }
}

const texture = {};
for (const property of ["sand", "silt", "clay"]) {
  texture[property] = {};
  for (const depth of DEPTHS) {
    texture[property][depth] = Object.fromEntries(
      ["Q0.05", "Q0.5", "Q0.95"].map((quantile) => [
        quantile,
        summarize(coverages[`${property}/${depth}/${quantile}`].values),
      ]),
    );
  }
}

const waterRetention = {};
for (const property of ["wv0033", "wv1500"]) {
  waterRetention[property] = Object.fromEntries(
    DEPTHS.map((depth) => [
      depth,
      summarize(coverages[`${property}/${depth}/Q0.5`].values),
    ]),
  );
}

const profileCellCount = Math.min(
  ...DEPTHS.flatMap((depth) => [
    coverages[`wv0033/${depth}/Q0.5`].values.length,
    coverages[`wv1500/${depth}/Q0.5`].values.length,
  ]),
);
const availableWaterByCellMm = Array.from({ length: profileCellCount }, (_, cell) => {
  let waterMm = 0;
  for (const [index, depth] of DEPTHS.entries()) {
    const fieldCapacity = coverages[`wv0033/${depth}/Q0.5`].values[cell];
    const wiltingPoint = coverages[`wv1500/${depth}/Q0.5`].values[cell];
    if (fieldCapacity === NODATA || wiltingPoint === NODATA) return null;
    const thicknessMm = [50, 100, 150][index];
    waterMm += ((fieldCapacity - wiltingPoint) / SCALE_FACTOR / 100) * thicknessMm;
  }
  return waterMm;
}).filter((value) => Number.isFinite(value));

const availableWater = summarize(availableWaterByCellMm, 1);
for (const key of ["min", "p10", "median", "p90", "max"]) {
  availableWater[key] = Number(availableWater[key].toFixed(2));
}

const output = {
  dataset: "ISRIC SoilGrids 2.0",
  attribution: "ISRIC — World Soil Information",
  license: "CC BY 4.0",
  source: `${SOURCE}/mapserv (WCS 2.0.1)`,
  retrievedAt: new Date().toISOString(),
  resolutionM: 250,
  grid: {
    width: grid.width,
    height: grid.height,
    bounds: grid.bbox,
    crs: "EPSG:152160 (Goode Homolosine)",
    validCells: texture.sand["0-5cm"]["Q0.5"].cells,
  },
  aoi: AOI,
  pilotPoints: PILOT_POINTS,
  units: {
    sand: "% del peso del suelo; escala GeoTIFF 10",
    silt: "% del peso del suelo; escala GeoTIFF 10",
    clay: "% del peso del suelo; escala GeoTIFF 10",
    wv0033: "% de contenido volumétrico; escala GeoTIFF 10",
    wv1500: "% de contenido volumétrico; escala GeoTIFF 10",
    availableWater0to30cm: "mm de agua estimada entre 33 y 1500 kPa en 0–30 cm",
  },
  texture,
  waterRetention,
  derived: {
    availableWater0to30cm: availableWater,
    method: "Q0.5(wv0033) - Q0.5(wv1500), ponderado por espesor de las capas 0–5, 5–15 y 15–30 cm",
    caveat: "Estimación de retención potencial; no representa humedad actual ni agua disponible en el reservorio.",
  },
  spatialSummary: "Los estadísticos resumen los píxeles válidos del AOI; no son mediciones puntuales de cada predio.",
  resolutionCaveat: "SoilGrids se usa como contexto regional a 250 m. Verificar y corregir con muestras de campo antes de recomendaciones parcelarias.",
};

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`SoilGrids: ${fetched.length} coberturas descargadas; resultado guardado en ${OUTPUT}`);
