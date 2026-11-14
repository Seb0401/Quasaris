"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n-provider";
import { useFarm } from "@/lib/farm-store";
import { simulate } from "@/lib/engine-client";
import type { SimulateResponse } from "@/lib/contract";

/**
 * Pide la simulación al motor con el estado actual de la parcela.
 * Espera 250 ms a que el agricultor deje de mover los controles. Nunca falla: el cliente cae al respaldo.
 */
export function useSimulation(): SimulateResponse | null {
  const locale = useLocale();
  const farm = useFarm();
  const [data, setData] = useState<SimulateResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      simulate({ ...farm, locale }).then((d) => !cancelled && setData(d));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [farm, locale]);

  return data;
}
