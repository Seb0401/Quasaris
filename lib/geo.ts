/** Geometría simple para parcelas pequeñas (unas pocas hectáreas). */

export type LatLon = [number, number];

const R = 6371008.8; // radio medio de la Tierra (m)

/** Área de un polígono en hectáreas (proyección equirectangular local; error < 0,1 % a escala de chacra). */
export function polygonAreaHa(pts: LatLon[]): number {
  if (pts.length < 3) return 0;
  const lat0 = (pts.reduce((s, p) => s + p[0], 0) / pts.length) * (Math.PI / 180);
  const xy = pts.map(([la, lo]) => [R * (lo * Math.PI) / 180 * Math.cos(lat0), (R * la * Math.PI) / 180]);
  let a = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2 / 10000;
}

/** Centro (promedio de vértices): suficiente para ubicar el clima de la parcela. */
export function centroid(pts: LatLon[]): LatLon {
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}
