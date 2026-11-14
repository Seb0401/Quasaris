import { tool } from "ai";
import { z } from "zod";
import type { SimulateRequest, SimulateResponse } from "@/lib/contract";
import { simulateMock } from "@/lib/engine-client";
import { getMessages } from "@/lib/i18n";

const priorities = z.object({
  water: z.number().min(0).max(1),
  income: z.number().min(0).max(1),
  soil: z.number().min(0).max(1),
  risk: z.number().min(0).max(1),
});
const water = z.number().min(0).max(1_000_000);

export const farmSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  soilTexture: z.enum(["arenoso", "franco", "arcilloso"]),
  irrigation: z.enum(["gravedad", "aspersion", "goteo"]),
  waterAvailableM3ha: water,
  priorities,
  rotations: z.array(z.object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(200),
    isCurrent: z.boolean(),
    crops: z.array(z.object({
      cropId: z.string().min(1).max(100),
      sowMonth: z.number().int().min(1).max(12),
    })).max(24),
  })).min(1).max(20),
});

async function simulate(farm: SimulateRequest, signal: AbortSignal): Promise<SimulateResponse> {
  const base = process.env.ENGINE_URL || process.env.NEXT_PUBLIC_ENGINE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:8000");
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/api/py/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(farm),
      cache: "no-store",
      signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    });
    if (!response.ok) throw new Error(`Engine returned ${response.status}`);
    return await response.json() as SimulateResponse;
  } catch {
    signal.throwIfAborted();
    return simulateMock(farm);
  }
}

export function chatTools(initialFarm: SimulateRequest, signal: AbortSignal) {
  let farm = initialFarm;
  let result: Promise<SimulateResponse> | undefined;
  let changed = false;
  const run = () => result ??= simulate(farm, signal);
  const terms = getMessages(farm.locale).assistant.glossary;

  return {
    simularRotacion: tool({
      description: "Get water, income, soil, risk, viability and evidence for the current parcel and its rotations. Call after changing parcel inputs to compare again.",
      inputSchema: z.object({ rotationId: z.string().max(100).optional() }),
      execute: async ({ rotationId }) => {
        const { waterAvailableM3ha, locale, rotations: planned } = farm;
        const { source, rotations } = await run();
        const labels = getMessages(locale).explain;
        const explain = (key: string) => labels[key as keyof typeof labels];
        return {
          source,
          waterAvailableM3ha,
          rotations: rotations.filter(({ id }) => !rotationId || id === rotationId).map((rotation) => ({
            id: rotation.id,
            name: planned.find(({ id }) => id === rotation.id)?.name ?? rotation.id,
            water: rotation.water,
            income: rotation.income,
            soil: rotation.soil,
            risk: rotation.risk,
            viable: rotation.viable,
            score: source.power === "mock" ? undefined : rotation.score,
            why: explain(rotation.explain.whyKey),
            evidence: source.power === "mock" ? [] : rotation.explain.evidence.map(explain).filter(Boolean),
            missing: rotation.explain.missing.map(explain).filter(Boolean),
            reviewWithExpert: rotation.explain.reviewWithExpert.map(explain).filter(Boolean),
          })),
        };
      },
    }),
    consultarAno: tool({
      description: "Get the engine's historical result for one year. Omit rotationId to compare all known rotations.",
      inputSchema: z.object({ year: z.number().int(), rotationId: z.string().max(100).optional() }),
      execute: async ({ year, rotationId }) => {
        const { source, rotations } = await run();
        return {
          source,
          results: rotations.filter(({ id }) => !rotationId || id === rotationId).flatMap((rotation) =>
            rotation.byYear.filter((item) => item.year === year).map((item) => ({
              rotationId: rotation.id,
              name: farm.rotations.find(({ id }) => id === rotation.id)?.name ?? rotation.id,
              ...item,
            })),
          ),
        };
      },
    }),
    explicarTermino: tool({
      description: "Look up a short, localized definition of a farming or satellite-data term.",
      inputSchema: z.object({
        term: z.enum(["et", "ndvi", "soilMoisture", "waterBalance", "frost", "satellite"]),
      }),
      execute: async ({ term }) => ({ definition: terms[term] }),
    }),
    cambiarPrioridades: tool({
      description: "Update priorities or the water budget for a change explicitly requested by the farmer. For '20% less water' pass waterChangePercent=-20. Omit fields that should stay as they are. Call once per turn.",
      inputSchema: z.object({
        priorities: priorities.partial().optional(),
        waterAvailableM3ha: water.optional(),
        waterChangePercent: z.number().min(-100).max(1000).optional(),
      }),
      execute: async (input) => {
        if (changed) return { error: "alreadyChanged" } as const;
        if (input.waterAvailableM3ha !== undefined && input.waterChangePercent !== undefined) {
          return { error: "chooseOneWaterInput" } as const;
        }
        const nextWater = input.waterChangePercent === undefined
          ? input.waterAvailableM3ha ?? farm.waterAvailableM3ha
          : Math.round(farm.waterAvailableM3ha * (1 + input.waterChangePercent / 100));
        if (!water.safeParse(nextWater).success) return { error: "invalidWater" } as const;
        const nextPriorities = { ...farm.priorities, ...input.priorities };
        changed = true;
        farm = { ...farm, waterAvailableM3ha: nextWater, priorities: nextPriorities };
        result = undefined;
        return { waterAvailableM3ha: nextWater, priorities: nextPriorities };
      },
    }),
  };
}
