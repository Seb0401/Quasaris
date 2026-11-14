import type { SimulateRequest, SimulateResponse } from "@/lib/contract";
import mock from "@/data/mock_simulate.json";

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? "";
const DEFAULT_CACHE_KEY = "farmtwin.lastSimulation.v1";

type Options = { cacheKey?: string; fallback?: () => Promise<SimulateResponse> };

/**
 * Llama al motor Python. Si falla (sin red o motor caído) usa el último resultado guardado
 * y, en último caso, una foto del motor real (mock).
 */
export async function simulate(req: SimulateRequest, { cacheKey = DEFAULT_CACHE_KEY, fallback }: Options = {}): Promise<SimulateResponse> {
  try {
    const res = await fetch(`${ENGINE_URL}/api/py/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`engine ${res.status}`);
    const data = (await res.json()) as SimulateResponse;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch {}
    return data;
  } catch (err) {
    console.warn("[FarmTwin] motor no disponible, usando respaldo", err);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached) as SimulateResponse;
    } catch {}
    return fallback ? fallback() : (mock as unknown as SimulateResponse);
  }
}
