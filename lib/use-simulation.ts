"use client";

import { useEffect, useState } from "react";
import type { Rotation, SimulateResponse } from "@/lib/contract";
import { simulate } from "@/lib/engine-client";
import { useFarm } from "@/lib/farm-store";
import { useLocale } from "@/components/i18n-provider";

const inflight = new Map<string, Promise<SimulateResponse>>();

type Options = {
  debounceMs?: number;
  /** Rotaciones a simular en lugar de las del agricultor (p. ej. la paleta del modo granja). */
  rotations?: Rotation[];
  cacheKey?: string;
  fallback?: () => Promise<SimulateResponse>;
};

/** Simula con el estado actual del agricultor. Comparte resultados entre pantallas. */
export function useSimulation({ debounceMs = 250, rotations, cacheKey, fallback }: Options = {}): SimulateResponse | null {
  const farm = useFarm();
  const locale = useLocale();
  const [data, setData] = useState<SimulateResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const req = { ...farm, rotations: rotations ?? farm.rotations, locale };
    const key = JSON.stringify(req);
    const timer = setTimeout(() => {
      let p = inflight.get(key);
      if (!p) {
        p = simulate(req, { cacheKey, fallback });
        inflight.set(key, p);
        if (inflight.size > 20) inflight.delete(inflight.keys().next().value!);
      }
      p.then((d) => !cancelled && setData(d));
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [farm, locale, debounceMs, rotations, cacheKey, fallback]);

  return data;
}
