/**
 * Forma de la chacra en el modo granja: una rejilla de casillas cuadradas donde algunas quedan fuera
 * del terreno ("off"). La forma sale del contorno dibujado en el mapa y se puede editar en la granja
 * sumando casillas vecinas o quitando las del borde.
 */
import type { LatLon } from "@/lib/geo";

export const OFF = "off";

export type Shape = { cols: number; rows: number; tiles: string[] };

export const isOn = (id: string) => id !== OFF;
export const activeCount = (tiles: string[]) => tiles.reduce((a, id) => a + (isOn(id) ? 1 : 0), 0);

/** Número de lote (1, 2, 3…) de cada casilla, contando solo las que están dentro del terreno. */
export function lotNumbers(tiles: string[]): (number | null)[] {
  let k = 0;
  return tiles.map((id) => (isOn(id) ? ++k : null));
}

/** "Lotes 1–4, 7" a partir de índices de casilla (se saltan las casillas fuera del terreno). */
export function lotLabel(idx: number[], tiles: string[]): string {
  const lots = lotNumbers(tiles);
  const s = Array.from(new Set(idx.map((i) => lots[i]).filter((n): n is number => n !== null))).sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(i === j ? `${s[i]}` : `${s[i]}–${s[j]}`);
    i = j;
  }
  return out.join(", ");
}

function inside([x, y]: [number, number], poly: [number, number][]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Cuántas casillas conviene según el área: pocas en chacras chicas, a lo más 40 para que se vea bien. */
export function targetTiles(areaHa: number) {
  return Math.max(8, Math.min(40, Math.round(areaHa / 0.25)));
}

/**
 * Arma la rejilla con la forma del contorno: una casilla entra si su centro cae dentro del polígono.
 * El tamaño de casilla se ajusta para acercarse al número de casillas buscado. La fila 0 es el norte.
 */
export function shapeFromBoundary(pts: LatLon[], areaHa: number, fill: (i: number) => string): Shape & { haPerTile: number } {
  const lat0 = (pts.reduce((s, p) => s + p[0], 0) / pts.length) * (Math.PI / 180);
  const xy = pts.map(([la, lo]) => [6371008.8 * ((lo * Math.PI) / 180) * Math.cos(lat0), 6371008.8 * ((la * Math.PI) / 180)] as [number, number]);
  const minX = Math.min(...xy.map((p) => p[0]));
  const maxX = Math.max(...xy.map((p) => p[0]));
  const minY = Math.min(...xy.map((p) => p[1]));
  const maxY = Math.max(...xy.map((p) => p[1]));
  const target = targetTiles(areaHa);

  const raster = (side: number) => {
    const cols = Math.max(1, Math.ceil((maxX - minX) / side));
    const rows = Math.max(1, Math.ceil((maxY - minY) / side));
    // centra la rejilla sobre el contorno
    const ox = minX - (cols * side - (maxX - minX)) / 2;
    const oy = maxY + (rows * side - (maxY - minY)) / 2;
    const on: boolean[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) on.push(inside([ox + (c + 0.5) * side, oy - (r + 0.5) * side], xy));
    return { cols, rows, on, n: on.filter(Boolean).length };
  };

  let side = Math.sqrt((areaHa * 10000) / target);
  let best = raster(side);
  for (let k = 0; k < 12; k++) {
    if (best.n === target) break;
    side *= Math.sqrt(Math.max(best.n, 1) / target);
    const next = raster(side);
    if (Math.abs(next.n - target) < Math.abs(best.n - target) && next.n > 0) best = next;
  }
  if (best.n === 0) {
    const n = Math.max(1, target);
    const cols = Math.ceil(Math.sqrt(n));
    best = { cols, rows: Math.ceil(n / cols), on: Array.from({ length: cols * Math.ceil(n / cols) }, (_, i) => i < n), n };
  }
  const trimmed = trim({ cols: best.cols, rows: best.rows, tiles: best.on.map((v, i) => (v ? fill(i) : OFF)) });
  return { ...trimmed, haPerTile: areaHa / Math.max(activeCount(trimmed.tiles), 1) };
}

/** Quita filas y columnas del borde que quedaron sin ninguna casilla dentro del terreno. */
export function trim(s: Shape): Shape {
  const on = (r: number, c: number) => isOn(s.tiles[r * s.cols + c]);
  let r0 = 0;
  let r1 = s.rows - 1;
  let c0 = 0;
  let c1 = s.cols - 1;
  const rowEmpty = (r: number) => Array.from({ length: s.cols }, (_, c) => on(r, c)).every((v) => !v);
  const colEmpty = (c: number) => Array.from({ length: s.rows }, (_, r) => on(r, c)).every((v) => !v);
  while (r0 < r1 && rowEmpty(r0)) r0++;
  while (r1 > r0 && rowEmpty(r1)) r1--;
  while (c0 < c1 && colEmpty(c0)) c0++;
  while (c1 > c0 && colEmpty(c1)) c1--;
  const cols = c1 - c0 + 1;
  const rows = r1 - r0 + 1;
  const tiles: string[] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) tiles.push(s.tiles[r * s.cols + c]);
  return { cols, rows, tiles };
}

/** Casillas vecinas (fuera del terreno) que se pueden sumar. r y c pueden ser -1 o rows/cols (fuera de la rejilla). */
export function addableCells(s: Shape): { r: number; c: number }[] {
  const on = (r: number, c: number) => r >= 0 && c >= 0 && r < s.rows && c < s.cols && isOn(s.tiles[r * s.cols + c]);
  const out: { r: number; c: number }[] = [];
  for (let r = -1; r <= s.rows; r++)
    for (let c = -1; c <= s.cols; c++) {
      if (on(r, c)) continue;
      if (on(r - 1, c) || on(r + 1, c) || on(r, c - 1) || on(r, c + 1)) out.push({ r, c });
    }
  return out;
}

/** Suma una casilla vecina (agranda la rejilla si hace falta) o quita una del borde. */
export function toggleCell(s: Shape, r: number, c: number, rotationId: string): Shape {
  let { cols, rows, tiles } = s;
  // agrandar la rejilla cuando la casilla nueva cae fuera
  const addTop = r < 0 ? 1 : 0;
  const addLeft = c < 0 ? 1 : 0;
  const addBottom = r >= rows ? 1 : 0;
  const addRight = c >= cols ? 1 : 0;
  if (addTop || addLeft || addBottom || addRight) {
    const nc = cols + addLeft + addRight;
    const nr = rows + addTop + addBottom;
    const next = Array<string>(nc * nr).fill(OFF);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) next[(y + addTop) * nc + (x + addLeft)] = tiles[y * cols + x];
    tiles = next;
    cols = nc;
    rows = nr;
    r += addTop;
    c += addLeft;
  }
  const i = r * cols + c;
  const next = [...tiles];
  if (isOn(next[i])) {
    if (activeCount(next) <= 1) return s; // siempre queda al menos una casilla
    next[i] = OFF;
  } else next[i] = rotationId;
  return trim({ cols, rows, tiles: next });
}

/** Distancia (en casillas, 8 vecinos) a la casilla activa más cercana: sirve para el borde de pasto de la isla. */
export function groundCells(s: Shape, margin = 1): { r: number; c: number; edge: boolean }[] {
  const on = (r: number, c: number) => r >= 0 && c >= 0 && r < s.rows && c < s.cols && isOn(s.tiles[r * s.cols + c]);
  const ground = (r: number, c: number) => {
    for (let dr = -margin; dr <= margin; dr++) for (let dc = -margin; dc <= margin; dc++) if (on(r + dr, c + dc)) return true;
    return false;
  };
  const out: { r: number; c: number; edge: boolean }[] = [];
  for (let r = -margin; r < s.rows + margin; r++)
    for (let c = -margin; c < s.cols + margin; c++) {
      if (!ground(r, c)) continue;
      const edge = !ground(r - 1, c) || !ground(r + 1, c) || !ground(r, c - 1) || !ground(r, c + 1);
      out.push({ r, c, edge });
    }
  return out;
}
