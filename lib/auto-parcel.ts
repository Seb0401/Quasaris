/**
 * Selector inteligente de parcela: el agricultor toca un punto y se intenta reconocer el contorno
 * del campo en la imagen satelital (Esri World Imagery, la misma del mapa).
 *
 * 1. Se arma un mosaico de 3×3 teselas alrededor del punto (zoom 17, ~1 m por píxel).
 * 2. Crecimiento de región desde el punto: se suman píxeles de color parecido al del campo
 *    y se frena en los bordes (caminos, acequias, cercos, cambios de cultivo).
 * 3. Se prueba con varias sensibilidades y se elige la forma que más parece una chacra:
 *    rectangular, compacta, de color parejo y no diminuta.
 * 4. El contorno se simplifica a pocas esquinas; si es casi rectangular, se ajusta a un rectángulo.
 * Si el campo no entra en el mosaico, se reintenta con zoom 16 (campos grandes).
 * Todo corre en el navegador; no se envía nada a otro servidor.
 */
import type { LatLon } from "./geo";

const TILE = 256;
const GRID = 3; // mosaico de 3×3 teselas
const SIZE = TILE * GRID;
const TILE_URL = (z: number, x: number, y: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

export type DetectResult =
  | { ok: true; points: LatLon[]; zoom: number }
  | { ok: false; reason: "edge" | "small" | "load" | "unclear" };

type Pt = [number, number];
export type Mask = { w: number; h: number; data: Uint8Array };
type Prep = { img: Float32Array; grad: Float32Array; sortedGrad: Float32Array };

/* ---------- proyección Web Mercator ---------- */
const worldPx = (lat: number, lon: number, z: number) => {
  const s = TILE * 2 ** z;
  const sin = Math.sin((lat * Math.PI) / 180);
  return [((lon + 180) / 360) * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s] as const;
};
const pxToLatLon = (x: number, y: number, z: number): LatLon => {
  const s = TILE * 2 ** z;
  const lon = (x / s) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / s;
  return [(180 / Math.PI) * Math.atan(Math.sinh(n)), lon];
};

/* ---------- preparación de la imagen ---------- */

/** Suaviza la textura del cultivo (surcos, plantas) con un promedio de caja de 5×5 por canal. */
function smooth(rgba: Uint8ClampedArray, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h * 3);
  const r = 2;
  const tmp = new Float32Array(w * h);
  for (let c = 0; c < 3; c++) {
    for (let y = 0; y < h; y++) {
      let acc = 0, n = 0;
      for (let x = -r; x < w; x++) {
        if (x + r < w) { acc += rgba[(y * w + x + r) * 4 + c]; n++; }
        if (x - r - 1 >= 0) { acc -= rgba[(y * w + x - r - 1) * 4 + c]; n--; }
        if (x >= 0) tmp[y * w + x] = acc / n;
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0, n = 0;
      for (let y = -r; y < h; y++) {
        if (y + r < h) { acc += tmp[(y + r) * w + x]; n++; }
        if (y - r - 1 >= 0) { acc -= tmp[(y - r - 1) * w + x]; n--; }
        if (y >= 0) out[(y * w + x) * 3 + c] = acc / n;
      }
    }
  }
  return out;
}

/** Fuerza del borde en cada píxel (Sobel sobre la luminancia suavizada). */
function edges(img: Float32Array, w: number, h: number): Float32Array {
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = 0.3 * img[i * 3] + 0.59 * img[i * 3 + 1] + 0.11 * img[i * 3 + 2];
  const g = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1];
      const gy = L[i + w - 1] + 2 * L[i + w] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - w] - L[i - w + 1];
      g[i] = Math.hypot(gx, gy) / 4;
    }
  return g;
}

export function prepare(rgba: Uint8ClampedArray, w: number, h: number): Prep {
  const img = smooth(rgba, w, h);
  const grad = edges(img, w, h);
  return { img, grad, sortedGrad: Float32Array.from(grad).sort() };
}

/* ---------- región y morfología ---------- */

/**
 * Crece la región desde (sx, sy): entra un píxel si su color está cerca del promedio del campo
 * y si no está sobre un borde marcado. tolScale y edgeQ ajustan qué tan permisivo es.
 */
export function growRegion(prep: Prep, w: number, h: number, sx: number, sy: number, tolScale = 1, edgeQ = 0.8): Mask {
  const { img, grad, sortedGrad } = prep;
  // color semilla y su variación en una ventana de 9×9
  let m0 = 0, m1 = 0, m2 = 0, n = 0;
  for (let dy = -4; dy <= 4; dy++)
    for (let dx = -4; dx <= 4; dx++) {
      const x = sx + dx, y = sy + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = (y * w + x) * 3;
      m0 += img[i]; m1 += img[i + 1]; m2 += img[i + 2];
      n++;
    }
  m0 /= n; m1 /= n; m2 /= n;
  let spread = 0;
  for (let dy = -4; dy <= 4; dy++)
    for (let dx = -4; dx <= 4; dx++) {
      const x = sx + dx, y = sy + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = (y * w + x) * 3;
      spread += (img[i] - m0) ** 2 + (img[i + 1] - m1) ** 2 + (img[i + 2] - m2) ** 2;
    }
  spread = Math.sqrt(spread / n);
  const tol = Math.max(12, Math.min(48, (10 + spread * 2.2) * tolScale)); // tolerancia de color
  const edgeCut = Math.max(9, sortedGrad[Math.floor(sortedGrad.length * edgeQ)]);

  const mask = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  let s0 = m0 * 20, s1 = m1 * 20, s2 = m2 * 20, sn = 20; // promedio que se actualiza al crecer
  const start = sy * w + sx;
  mask[start] = 1;
  queue[tail++] = start;
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    const a0 = s0 / sn, a1 = s1 / sn, a2 = s2 / sn;
    for (let t = 0; t < 4; t++) {
      const j = t === 0 ? i - 1 : t === 1 ? i + 1 : t === 2 ? i - w : i + w;
      if (j < 0 || j >= w * h || mask[j]) continue;
      if (Math.abs((j % w) - x) > 1) continue; // no saltar de un extremo de la fila al otro
      const k = j * 3;
      const d = Math.hypot(img[k] - a0, img[k + 1] - a1, img[k + 2] - a2);
      // cerca del promedio actual y sin alejarse demasiado del color con que empezó (evita la deriva)
      const d0 = Math.hypot(img[k] - m0, img[k + 1] - m1, img[k + 2] - m2);
      if (d > tol || d0 > tol * 1.35 || grad[j] > edgeCut) continue;
      mask[j] = 1;
      queue[tail++] = j;
      s0 += img[k]; s1 += img[k + 1]; s2 += img[k + 2];
      sn++;
    }
  }
  return { w, h, data: mask };
}

/** Dilata o erosiona con un cuadrado de lado 2r+1 (imagen integral: tiempo lineal). */
function morph(mk: Mask, r: number, dilate: boolean): Mask {
  const { w, h, data } = mk;
  const W = w + 1;
  const I = new Int32Array(W * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += data[y * w + x];
      I[(y + 1) * W + x + 1] = I[y * W + x + 1] + row;
    }
  }
  const full = (2 * r + 1) ** 2;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const sum = I[y1 * W + x1] - I[y0 * W + x1] - I[y1 * W + x0] + I[y0 * W + x0];
      // fuera de la imagen cuenta como vacío: la erosión exige la caja completa
      out[y * w + x] = dilate ? (sum > 0 ? 1 : 0) : sum === full ? 1 : 0;
    }
  }
  return { w, h, data: out };
}

/** Inunda desde las semillas dadas sobre los píxeles donde pass(i) es verdadero. */
function flood(w: number, h: number, seeds: number[], pass: (i: number) => boolean): Uint8Array {
  const seen = new Uint8Array(w * h);
  const q: number[] = [];
  for (const s of seeds) if (!seen[s] && pass(s)) { seen[s] = 1; q.push(s); }
  while (q.length) {
    const i = q.pop()!;
    const x = i % w;
    for (let t = 0; t < 4; t++) {
      const j = t === 0 ? i - 1 : t === 1 ? i + 1 : t === 2 ? i - w : i + w;
      if (j < 0 || j >= w * h || seen[j] || !pass(j)) continue;
      if (Math.abs((j % w) - x) > 1) continue;
      seen[j] = 1;
      q.push(j);
    }
  }
  return seen;
}

/** Rellena los huecos internos (lo que no se alcanza desde el borde por fuera de la máscara). */
function fillHoles(mk: Mask): Mask {
  const { w, h, data } = mk;
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
  const outside = flood(w, h, border, (i) => !data[i]);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = outside[i] ? 0 : 1;
  return { w, h, data: out };
}

/** Se queda con la mancha conectada que contiene la semilla. */
function keepSeed(mk: Mask, sx: number, sy: number): Mask {
  const { w, h, data } = mk;
  return { w, h, data: flood(w, h, [sy * w + sx], (i) => data[i] === 1) };
}

/* ---------- contorno y geometría ---------- */

/** Contorno exterior (seguimiento de Moore) en píxeles. */
export function traceContour(mk: Mask): Pt[] {
  const { w, h, data } = mk;
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && data[y * w + x] === 1;
  let start = -1;
  for (let i = 0; i < w * h; i++) if (data[i]) { start = i; break; }
  if (start < 0) return [];
  const sx = start % w, sy = (start / w) | 0;
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const pts: Pt[] = [[sx, sy]];
  let cx = sx, cy = sy, dir = 7;
  for (let guard = 0; guard < w * h * 2; guard++) {
    let found = false;
    for (let k = 0; k < 8; k++) {
      const d = (dir + 6 + k) % 8; // empieza buscando a la izquierda de la dirección previa
      const nx = cx + dirs[d][0], ny = cy + dirs[d][1];
      if (at(nx, ny)) { cx = nx; cy = ny; dir = d; found = true; break; }
    }
    if (!found || (cx === sx && cy === sy)) break;
    pts.push([cx, cy]);
  }
  return pts;
}

/** Douglas-Peucker sobre una cadena abierta: índices que se conservan. */
function dpOpen(p: Pt[], eps: number): number[] {
  const keep = new Uint8Array(p.length);
  keep[0] = keep[p.length - 1] = 1;
  const stack: Pt[] = [[0, p.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [x1, y1] = p[a], [x2, y2] = p[b];
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((y2 - y1) * p[i][0] - (x2 - x1) * p[i][1] + x2 * y1 - y2 * x1) / len;
      if (d > md) { md = d; mi = i; }
    }
    if (mi > 0 && md > eps) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  const out: number[] = [];
  keep.forEach((v, i) => v && out.push(i));
  return out;
}

/** Douglas-Peucker para un anillo cerrado: se parte en el punto más lejano al primero. */
export function simplify(ring: Pt[], eps: number): Pt[] {
  if (ring.length < 4) return ring;
  let far = 0, fd = -1;
  for (let i = 1; i < ring.length; i++) {
    const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]);
    if (d > fd) { fd = d; far = i; }
  }
  const a = ring.slice(0, far + 1), b = [...ring.slice(far), ring[0]];
  return [...dpOpen(a, eps).slice(0, -1).map((i) => a[i]), ...dpOpen(b, eps).slice(0, -1).map((i) => b[i])];
}

/** Área de un anillo en px² (fórmula del lazo). */
const ringArea = (p: Pt[]) =>
  Math.abs(p.reduce((s, [x1, y1], i) => { const [x2, y2] = p[(i + 1) % p.length]; return s + x1 * y2 - x2 * y1; }, 0)) / 2;

function convexHull(p: Pt[]): Pt[] {
  const pts = [...p].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Pt[] = [], up: Pt[] = [];
  for (const q of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of pts.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

/** Rectángulo de área mínima (calibradores rotatorios sobre la envolvente convexa). */
function minRect(pts: Pt[]): Pt[] {
  const hull = convexHull(pts);
  let best: Pt[] = [], bestA = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const [x1, y1] = hull[i], [x2, y2] = hull[(i + 1) % hull.length];
    const a = Math.atan2(y2 - y1, x2 - x1), c = Math.cos(a), s = Math.sin(a);
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const [x, y] of hull) {
      const u = x * c + y * s, v = -x * s + y * c;
      minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v);
    }
    const area = (maxU - minU) * (maxV - minV);
    if (area < bestA) {
      bestA = area;
      const P = (u: number, v: number): Pt => [u * c - v * s, u * s + v * c];
      best = [P(minU, minV), P(maxU, minV), P(maxU, maxV), P(minU, maxV)];
    }
  }
  return best;
}

/* ---------- segmentación ---------- */

/** Una pasada con una sensibilidad dada: máscara limpia del campo que contiene la semilla. */
function segmentOnce(prep: Prep, w: number, h: number, sx: number, sy: number, tolScale: number, edgeQ: number) {
  const raw = growRegion(prep, w, h, sx, sy, tolScale, edgeQ);
  const filled = fillHoles(morph(morph(raw, 3, true), 3, false)); // cierre: une la textura del cultivo
  // apertura fuerte: corta los puentes finos por donde la región se escapa a un campo vecino
  let mk = keepSeed(morph(filled, 5, false), sx, sy);
  let r = 5;
  if (!mk.data[sy * w + sx]) { mk = keepSeed(morph(filled, 2, false), sx, sy); r = 2; }
  if (!mk.data[sy * w + sx]) { mk = keepSeed(filled, sx, sy); r = 0; }
  if (r) mk = morph(mk, r, true);
  for (let i = 0; i < w * h; i++) mk.data[i] &= filled.data[i];
  mk = keepSeed(mk, sx, sy);
  let area = 0, edge = false, mr = 0, mg = 0, mb = 0;
  const { img } = prep;
  for (let i = 0; i < w * h; i++) {
    if (!mk.data[i]) continue;
    area++;
    mr += img[i * 3]; mg += img[i * 3 + 1]; mb += img[i * 3 + 2];
    const x = i % w, y = (i / w) | 0;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
  }
  const n = area || 1;
  return { mk, area, edge, mean: [mr / n, mg / n, mb / n] };
}

/**
 * De la imagen a un polígono en píxeles. Prueba varias sensibilidades y se queda con la forma
 * que más parece una chacra: rectangular, compacta, de color parejo y no diminuta.
 */
export function segmentField(rgba: Uint8ClampedArray, w: number, h: number, sx: number, sy: number) {
  const prep = prepare(rgba, w, h);
  const { img } = prep;
  let best: { poly: Pt[]; area: number; score: number } | null = null;
  let sawEdge = false, sawUnclear = false;
  for (const edgeQ of [0.8, 0.9])
    for (const tolScale of [0.8, 1.15, 1.6, 2.2]) {
      const r = segmentOnce(prep, w, h, sx, sy, tolScale, edgeQ);
      if (r.area < 400) continue;
      if (r.edge) { sawEdge = true; continue; }
      const contour = traceContour(r.mk);
      const hullA = ringArea(convexHull(contour));
      const solidity = hullA > 0 ? Math.min(1, r.area / hullA) : 0;
      // calles y barrios dan formas ramificadas: no son un campo
      if (solidity < 0.8) { sawUnclear = true; continue; }
      const rect = minRect(contour);
      const rectness = Math.min(1, r.area / (ringArea(rect) || 1));
      // qué tan parejo es el color dentro (dos cultivos distintos juntos no son un campo)
      let dev = 0, cnt = 0;
      for (let i = 0; i < w * h; i += 7)
        if (r.mk.data[i]) { dev += Math.hypot(img[i * 3] - r.mean[0], img[i * 3 + 1] - r.mean[1], img[i * 3 + 2] - r.mean[2]); cnt++; }
      const homog = 1 / (1 + (dev / (cnt || 1) / 22) ** 2);
      const score = rectness * solidity * homog * (1 - Math.exp(-r.area / 3000));
      if (!best || score > best.score) {
        let poly: Pt[];
        if (rectness > 0.86) poly = rect; // casi rectangular: un rectángulo limpio
        else {
          let eps = 3;
          poly = simplify(contour, eps);
          while (poly.length > 14 && eps < 20) poly = simplify(contour, (eps += 2));
        }
        best = { poly, area: r.area, score };
      }
    }
  if (best) return { status: "ok" as const, poly: best.poly, area: best.area, score: best.score };
  return { status: sawEdge ? ("edge" as const) : sawUnclear ? ("unclear" as const) : ("small" as const) };
}

/* ---------- navegador: teselas → polígono ---------- */

async function loadMosaic(lat: number, lon: number, z: number, signal?: AbortSignal) {
  const [px, py] = worldPx(lat, lon, z);
  const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  const x0 = tx - 1, y0 = ty - 1;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  await Promise.all(
    Array.from({ length: GRID * GRID }, async (_, k) => {
      const dx = k % GRID, dy = Math.floor(k / GRID);
      const res = await fetch(TILE_URL(z, x0 + dx, y0 + dy), { mode: "cors", signal });
      if (!res.ok) throw new Error(`tile ${res.status}`);
      const bmp = await createImageBitmap(await res.blob());
      ctx.drawImage(bmp, dx * TILE, dy * TILE);
    }),
  );
  return {
    data: ctx.getImageData(0, 0, SIZE, SIZE).data,
    ox: x0 * TILE,
    oy: y0 * TILE,
    sx: Math.round(px - x0 * TILE),
    sy: Math.round(py - y0 * TILE),
  };
}

/** Deja respirar a la interfaz (el spinner) antes del cálculo pesado. */
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));

export async function detectParcel(lat: number, lon: number, signal?: AbortSignal): Promise<DetectResult> {
  let last: DetectResult = { ok: false, reason: "small" };
  for (const z of [17, 16]) {
    let mosaic;
    try {
      mosaic = await loadMosaic(lat, lon, z, signal);
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      return { ok: false, reason: "load" };
    }
    await nextFrame();
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    const r = segmentField(mosaic.data, SIZE, SIZE, mosaic.sx, mosaic.sy);
    if (r.status === "ok") {
      return { ok: true, zoom: z, points: r.poly.map(([x, y]) => pxToLatLon(mosaic.ox + x + 0.5, mosaic.oy + y + 0.5, z)) };
    }
    last = { ok: false, reason: r.status };
    if (r.status !== "edge") break; // solo un campo que no entra justifica alejarse
  }
  return last;
}
