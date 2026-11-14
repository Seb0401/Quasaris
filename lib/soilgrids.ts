import majesSummary from "@/data/soilgrids/majes.json";

const summary = majesSummary;

export function getMajesSoilGridsReference(lat: number, lon: number) {
  const { minLat, maxLat, minLon, maxLon } = summary.aoi;
  if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) return null;

  const sand = summary.texture.sand["0-5cm"];
  const silt = summary.texture.silt["0-5cm"];
  const clay = summary.texture.clay["0-5cm"];
  const availableWater = summary.derived.availableWater0to30cm;

  return {
    dataset: summary.dataset,
    source: "https://soilgrids.org",
    attribution: summary.attribution,
    license: summary.license,
    retrievedAt: summary.retrievedAt,
    resolutionM: summary.resolutionM,
    coverage: summary.aoi,
    regionalPixelCount: summary.grid.validCells,
    surfaceTexturePercent: {
      sand: { q05: sand["Q0.05"].median, median: sand["Q0.5"].median, q95: sand["Q0.95"].median },
      silt: { q05: silt["Q0.05"].median, median: silt["Q0.5"].median, q95: silt["Q0.95"].median },
      clay: { q05: clay["Q0.05"].median, median: clay["Q0.5"].median, q95: clay["Q0.95"].median },
    },
    potentialAvailableWater0to30cmMm: {
      median: availableWater.median,
      spatialP10: availableWater.p10,
      spatialP90: availableWater.p90,
    },
    interpretation: summary.resolutionCaveat,
    waterCaveat: summary.derived.caveat,
    spatialSummary: summary.spatialSummary,
  };
}
