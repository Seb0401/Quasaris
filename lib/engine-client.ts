import type { SimulateRequest, SimulateResponse } from "@/lib/contract";
import mock from "@/data/mock_simulate.json";
import presets from "@/data/rotations_palette.json";
import { CROPS } from "@/lib/crop-calendar";

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? "";
const DEFAULT_CACHE_KEY = "farmtwin.lastSimulation.v2";

type Options = { cacheKey?: string; fallback?: () => Promise<SimulateResponse> };

export function simulateMock(req: SimulateRequest, snapshot = mock as unknown as SimulateResponse): SimulateResponse {
  const signature = (r: SimulateRequest["rotations"][number]) => JSON.stringify([r.mode ?? "rotation", r.crops.map((c) => ({ cropId: c.cropId, sowMonth: CROPS[c.cropId]?.perennial ? 1 : c.sowMonth }))]);
  return {
    source: { ...snapshot.source, power: "mock" },
    rotations: req.rotations.flatMap((requested) => {
      const preset = (presets.rotations as SimulateRequest["rotations"]).find((r) => signature(r) === signature(requested));
      const result = preset && snapshot.rotations.find((r) => r.id === preset.id);
      return result ? [{ ...result, id: requested.id }] : [];
    }),
  };
}

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
      localStorage.setItem(cacheKey, JSON.stringify({ request: JSON.stringify(req), data }));
    } catch {}
    return data;
  } catch (err) {
    console.warn("[FarmTwin] motor no disponible, usando respaldo", err);
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const saved = JSON.parse(cached);
        if (saved.request === JSON.stringify(req) && Array.isArray(saved.data?.rotations)) return saved.data as SimulateResponse;
      }
    } catch {}
    const snapshot = fallback ? await fallback() : (await import("@/data/mock_granja.json")).default as unknown as SimulateResponse;
    return simulateMock(req, snapshot);
  }
}
