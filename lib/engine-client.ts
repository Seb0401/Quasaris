import type { SimulateRequest, SimulateResponse } from "@/lib/contract";
import mock from "@/data/mock_simulate.json";

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? "";
const DEFAULT_CACHE_KEY = "farmtwin.lastSimulation.v1";

type Options = { cacheKey?: string; fallback?: () => Promise<SimulateResponse> };

export function simulateMock(req: SimulateRequest): SimulateResponse {
  const data = mock as unknown as SimulateResponse;
  const ids = new Set(req.rotations.map(({ id }) => id));
  return {
    source: data.source,
    rotations: data.rotations.filter(({ id }) => ids.has(id)).map((rotation) => ({
      ...rotation,
      viable: rotation.water.median <= req.waterAvailableM3ha,
    })),
  };
}

// ---------- estado del motor (para avisar en pantalla cuando no hay cálculo real) ----------

/**
 * ok: el resultado en pantalla viene del motor con los datos actuales.
 * fallback: el motor no respondió (offline) o rechazó los datos (invalid) y se muestra
 *   el último resultado calculado con estos mismos datos (cache) o datos de ejemplo (example).
 */
export type EngineStatus = { state: "ok" } | { state: "fallback"; reason: "invalid" | "offline"; using: "cache" | "example" };

let status: EngineStatus = { state: "ok" };
const statusListeners = new Set<() => void>();

function setStatus(next: EngineStatus) {
  if (JSON.stringify(next) === JSON.stringify(status)) return;
  status = next;
  statusListeners.forEach((l) => l());
}

export function getEngineStatus(): EngineStatus {
  return status;
}

export function subscribeEngineStatus(l: () => void) {
  statusListeners.add(l);
  return () => {
    statusListeners.delete(l);
  };
}

/** Error del motor con el código HTTP, para distinguir datos rechazados (4xx) de motor caído. */
class EngineHttpError extends Error {
  constructor(readonly status: number) {
    super(`engine ${status}`);
  }
}

/**
 * Llama al motor Python. Si falla, solo reutiliza el último resultado guardado cuando corresponde
 * exactamente a estos mismos datos (uso sin red); si no, usa el respaldo o el ejemplo (mock).
 * En ambos casos deja el aviso en getEngineStatus() para que la pantalla no muestre como propios
 * números que no salieron de lo que ingresó el agricultor.
 */
export async function simulate(req: SimulateRequest, { cacheKey = DEFAULT_CACHE_KEY, fallback }: Options = {}): Promise<SimulateResponse> {
  const key = JSON.stringify(req);
  try {
    const res = await fetch(`${ENGINE_URL}/api/py/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: key,
    });
    if (!res.ok) throw new EngineHttpError(res.status);
    const data = (await res.json()) as SimulateResponse;
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ key, data }));
    } catch {}
    setStatus({ state: "ok" });
    return data;
  } catch (err) {
    const reason = err instanceof EngineHttpError && err.status >= 400 && err.status < 500 ? "invalid" : "offline";
    console.warn(`[FarmTwin] motor sin resultado (${reason}), usando respaldo`, err);
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) ?? "null") as { key?: string; data?: SimulateResponse } | null;
      if (cached?.key === key && cached.data) {
        setStatus({ state: "fallback", reason, using: "cache" });
        return cached.data;
      }
    } catch {}
    setStatus({ state: "fallback", reason, using: "example" });
    return fallback ? fallback() : (mock as unknown as SimulateResponse);
  }
}
