"use client";

import { useEffect, useState } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import { RotationCard } from "@/components/cards/rotation-card";
import { useFarm } from "@/lib/farm-store";
import { simulate } from "@/lib/engine-client";
import type { SimulateResponse } from "@/lib/contract";

export function CompararClient() {
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const [data, setData] = useState<SimulateResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      simulate({ ...farm, locale }).then((d) => !cancelled && setData(d));
    }, 250); // espera a que el agricultor deje de mover los controles
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [farm, locale]);

  if (!data) {
    return <p className="py-12 text-center text-muted animate-pulse">🛰️ {t("comparar.loading")}</p>;
  }

  const byId = new Map(data.rotations.map((r) => [r.id, r]));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{t("comparar.title")}</h1>
        <p className="text-xs text-muted">{t("comparar.source", { from: data.source.period[0], to: data.source.period[1] })}</p>
      </div>
      {data.source.power === "mock" && (
        <p className="rounded-lg border border-warn bg-warn/10 px-3 py-2 text-sm">🧪 {t("comparar.mockWarning")}</p>
      )}
      {farm.rotations.map((rot) => {
        const res = byId.get(rot.id);
        return res ? <RotationCard key={rot.id} rotation={rot} result={res} /> : null;
      })}
    </div>
  );
}
