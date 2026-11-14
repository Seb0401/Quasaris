"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import { RotationCard } from "@/components/cards/rotation-card";
import { CompareCharts } from "@/components/cards/compare-charts";
import { RotationEditor } from "@/components/cards/rotation-editor";
import { useFarm } from "@/lib/farm-store";
import { useSimulation } from "@/lib/use-simulation";

export function CompararClient() {
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const data = useSimulation();
  const [editing, setEditing] = useState(false);

  if (!data) {
    return <p className="py-12 text-center text-muted animate-pulse">🛰️ {t("comparar.loading")}</p>;
  }

  const byId = new Map(data.rotations.map((r) => [r.id, r]));
  const ranked = [...data.rotations].filter((r) => r.viable).sort((a, b) => b.score - a.score);
  const best = ranked[0] ? farm.rotations.find((r) => r.id === ranked[0].id) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("comparar.title")}</h1>
          <p className="text-xs text-muted">{t("comparar.source", { from: data.source.period[0], to: data.source.period[1] })}</p>
          {data.source.elevationM !== undefined && (
            <p className="text-xs text-muted">
              🛰️ {t("comparar.fusion", { elev: Math.round(data.source.elevationM), n: data.source.cells?.length ?? 1 })}
            </p>
          )}
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium">
            ✏️ {t("editor.open")}
          </button>
        )}
      </div>

      {data.source.power === "mock" && (
        <p className="rounded-lg border border-warn bg-warn/10 px-3 py-2 text-sm">🧪 {t("comparar.mockWarning")}</p>
      )}

      {best && (
        <p className="rounded-2xl bg-brand text-brand-ink px-4 py-3">
          <span className="text-sm opacity-80">{t("comparar.bestLabel")}</span>
          <br />
          <span className="text-lg font-semibold">⭐ {best.name}</span>
        </p>
      )}

      {editing && <RotationEditor onClose={() => setEditing(false)} />}

      <CompareCharts rotations={farm.rotations} results={data.rotations} waterAvailable={farm.waterAvailableM3ha} />

      {farm.rotations.map((rot) => {
        const res = byId.get(rot.id);
        return res ? (
          <RotationCard key={rot.id} rotation={rot} result={res} />
        ) : (
          <article key={rot.id} className="rounded-2xl border border-dashed border-border bg-surface p-4 text-sm">
            <h2 className="font-semibold">{rot.name}</h2>
            <p className="text-muted">⏳ {t("comparar.pending")}</p>
          </article>
        );
      })}

      <Link href={`/${locale}/tiempo`} className="rounded-full bg-brand text-brand-ink px-5 py-4 text-center text-lg font-semibold">
        🕰️ {t("comparar.toTimeMachine")} →
      </Link>
    </div>
  );
}
