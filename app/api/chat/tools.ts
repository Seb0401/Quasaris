import { tool } from "ai";
import { z } from "zod";
import type { SimulateRequest, SimulateResponse } from "@/lib/contract";
import { simulateMock } from "@/lib/engine-client";
import { getMessages } from "@/lib/i18n";
import { getMajesSoilGridsReference } from "@/lib/soilgrids";
import { CROPS, cropName, cropTiming } from "@/lib/crop-calendar";

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
    mode: z.enum(["rotation", "association"]).optional(),
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
    const snapshot = (await import("@/data/mock_granja.json")).default as unknown as SimulateResponse;
    return simulateMock(farm, snapshot);
  }
}

export function chatTools(initialFarm: SimulateRequest, signal: AbortSignal) {
  let farm = initialFarm;
  let result: Promise<SimulateResponse> | undefined;
  let changed = false;
  const run = () => result ??= simulate(farm, signal);
  const terms = getMessages(farm.locale).assistant.glossary;

  return {
    consultarCultivos: tool({
      description: "List crops actually available in Quasaris, or inspect one crop by ID. Returns product definitions and any model assumptions. Use before answering which crops are supported or describing a new Majes profile.",
      inputSchema: z.object({ cropId: z.string().max(100).optional() }),
      execute: async ({ cropId }) => ({
        available: !cropId || Boolean(CROPS[cropId]),
        crops: Object.entries(CROPS).filter(([id]) => !cropId || id === cropId).map(([id, crop]) => ({
          id,
          name: cropName(id, farm.locale),
          category: crop.category,
          perennial: Boolean(crop.perennial),
          product: crop.product?.[farm.locale],
          assumptions: crop.modelNote?.[farm.locale],
          sources: crop.sources,
        })),
      }),
    }),
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
            crops: (planned.find(({ id }) => id === rotation.id)?.crops ?? []).map((rc) => ({
              id: rc.cropId,
              name: cropName(rc.cropId, locale),
              product: CROPS[rc.cropId]?.product?.[locale],
              timing: cropTiming(rc, locale),
              assumptions: CROPS[rc.cropId]?.modelNote?.[locale],
            })),
            water: rotation.water,
            income: rotation.income,
            soil: rotation.soil,
            risk: rotation.risk,
            viable: rotation.viable,
            shortfallM3ha: Math.max(0, Math.round(rotation.water.median - waterAvailableM3ha)),
            yearsWithEnoughWater: `${rotation.byYear.filter((y) => y.waterM3ha <= waterAvailableM3ha).length} of ${rotation.byYear.length}`,
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
    consultarSueloRegional: tool({
      description: "Get the available ISRIC SoilGrids regional soil reference for the current field coordinates. Use for questions about soil texture, profile, or potential water retention. It is a 250 m regional model summary, not a field measurement or current soil moisture.",
      inputSchema: z.object({}),
      execute: async () => getMajesSoilGridsReference(farm.lat, farm.lon) ?? {
        available: false,
        reason: "No cached SoilGrids reference covers these coordinates.",
      },
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
