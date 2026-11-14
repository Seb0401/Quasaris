import type { SimulateRequest, SimulateResponse } from "@/lib/contract";
import mock from "@/data/mock_simulate.json";

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? "";
const CACHE_KEY = "farmtwin.lastSimulation.v1";

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

/**
 * Llama al motor Python. Si falla (sin red o motor caído) usa el último resultado guardado
 * y, en último caso, el mock del contrato.
 */
export async function simulate(req: SimulateRequest): Promise<SimulateResponse> {
  try {
    const res = await fetch(`${ENGINE_URL}/api/py/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`engine ${res.status}`);
    const data = (await res.json()) as SimulateResponse;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {}
    return data;
  } catch (err) {
    console.warn("[FarmTwin] motor no disponible, usando respaldo", err);
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as SimulateResponse;
        if (data.source.power !== "mock") return data;
      }
    } catch {}
    return simulateMock(req);
  }
}
