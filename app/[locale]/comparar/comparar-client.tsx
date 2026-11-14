"use client";

import Link from "next/link";
import { useLocale, useT } from "@/components/i18n-provider";
import { RotationCard } from "@/components/cards/rotation-card";
import { useFarm } from "@/lib/farm-store";
import { useSimulation } from "@/lib/use-simulation";
import { BarChart3, FlaskConical, LoaderCircle, Pencil, Satellite } from "lucide-react";
import { SoilIcon } from "@/components/icons/farm-icons";
import { Reveal } from "@/components/motion/reveal";

export function CompararClient() {
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const data = useSimulation();

  if (!data) {
    return <p className="flex items-center justify-center gap-2 py-12 text-center text-muted"><LoaderCircle size={19} className="animate-spin" />{t("comparar.loading")}</p>;
  }

  const byId = new Map(data.rotations.map((r) => [r.id, r]));

  return (
    <div className="dashboard-shell">
      <header className="section-hero"><div><span className="panel-kicker"><BarChart3 size={16} /> QUASARIS / {locale === "es" ? "ESCENARIOS" : "SCENARIOS"}</span><h1>{t("comparar.title")}</h1><p>{t("comparar.source", { from: data.source.period[0], to: data.source.period[1] })}</p></div></header>
      <div className="compare-intro mt-4">
        <Link href={`/${locale}/rotaciones`} className="mb-2 inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm font-medium">
          <Pencil size={14} /> {t("rotaciones.edit")}
        </Link>
        {data.source.rootZoneWetness && (
          <p>
            <SoilIcon size={14} className="mr-1 inline" />
            {t("comparar.soilWetness", {
              pct: `${Math.round((data.source.rootZoneWetness.reduce((a, b) => a + b, 0) / 12) * 100)}%`,
              min: `${Math.round(Math.min(...data.source.rootZoneWetness) * 100)}%`,
              max: `${Math.round(Math.max(...data.source.rootZoneWetness) * 100)}%`,
            })}
          </p>
        )}
        {data.source.elevationM !== undefined && (
          <p>
            <Satellite size={14} className="mr-1 inline" /> {t("comparar.fusion", { elev: Math.round(data.source.elevationM), n: data.source.cells?.length ?? 1 })}
          </p>
        )}
      </div>
      {data.source.power === "mock" && (
        <p className="flex items-center gap-2 rounded-lg border border-warn bg-warn/10 px-3 py-2 text-sm"><FlaskConical size={17} />{t("comparar.mockWarning")}</p>
      )}
      <div className="compare-grid">{farm.rotations.map((rot, index) => {
        const res = byId.get(rot.id);
        return res ? <Reveal key={rot.id} delay={index * 90}><RotationCard rotation={rot} result={res} /></Reveal> : null;
      })}</div>
    </div>
  );
}
