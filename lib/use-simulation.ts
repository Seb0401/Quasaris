"use client";

import { useEffect, useState } from "react";
import type { SimulateResponse } from "@/lib/contract";
import { simulate } from "@/lib/engine-client";
import { useFarm } from "@/lib/farm-store";
import { useLocale } from "@/components/i18n-provider";

const inflight = new Map<string, Promise<SimulateResponse>>();

/** Simula con el estado actual del agricultor. Comparte resultados entre pantallas. */
export function useSimulation(debounceMs = 250): SimulateResponse | null {
  const farm = useFarm();
  const locale = useLocale();
  const [data, setData] = useState<SimulateResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const req = { ...farm, locale };
    const key = JSON.stringify(req);
    const timer = setTimeout(() => {
      let p = inflight.get(key);
      if (!p) {
        p = simulate(req);
        inflight.set(key, p);
        if (inflight.size > 20) inflight.delete(inflight.keys().next().value!);
      }
      p.then((d) => !cancelled && setData(d));
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [farm, locale, debounceMs]);

  return data;
}
