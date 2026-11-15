"use client";

import { Plus, X } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { AlertIcon } from "@/components/granja/risk-panel";
import { newEventId, type FarmEvent, type HazardKind } from "@/lib/granja-events";

const KINDS: HazardKind[] = ["frost", "heat", "drought", "heavyRain", "pests"];

/** Activar fenómenos sobre el año real: helada, ola de calor, sequía, lluvia intensa o plagas. */
export function HazardControls({ events, month, onChange }: { events: FarmEvent[]; month: number; onChange: (ev: FarmEvent[]) => void }) {
  const t = useT();
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale, { month: "long" });
  const months = Array.from({ length: 12 }, (_, m) => fmt.format(new Date(2025, m, 1)));

  const add = (kind: HazardKind) => {
    const rest = kind === "drought" ? events.filter((e) => e.kind !== "drought") : events; // una sola sequía
    onChange([...rest, { id: newEventId(), kind, month, intensity: kind === "drought" ? 0.3 : undefined }]);
  };
  const patch = (id: string, p: Partial<FarmEvent>) => onChange(events.map((e) => (e.id === id ? { ...e, ...p } : e)));

  return (
    <div className="flex flex-col gap-2">
      <span className="font-semibold">{t("granja.hazard.title")}</span>
      <p className="text-xs text-[var(--muted)]">{t("granja.hazard.hint")}</p>
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button key={k} type="button" onClick={() => add(k)} className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/5 px-2.5 py-1.5 text-xs font-semibold">
            <Plus size={12} />
            <AlertIcon kind={k} size={14} /> {t(`granja.alert.${k}.title`)}
          </button>
        ))}
      </div>
      {events.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/[.04] px-2.5 py-2 text-xs">
              <AlertIcon kind={e.kind} size={15} />
              <span className="font-semibold">{t(`granja.alert.${e.kind}.title`)}</span>
              <select value={e.month} onChange={(ev) => patch(e.id, { month: Number(ev.target.value) })} aria-label={t("granja.hazard.month")} className="rounded-lg border border-[var(--border)] bg-transparent px-1.5 py-1 capitalize">
                {months.map((m, i) => (
                  <option key={i} value={i}>
                    {e.kind === "drought" ? `${t("granja.hazard.from")} ${m}` : m}
                  </option>
                ))}
              </select>
              {e.kind === "drought" && (
                <label className="flex items-center gap-1">
                  −{Math.round((e.intensity ?? 0.3) * 100)}%
                  <input type="range" min={0.1} max={0.6} step={0.05} value={e.intensity ?? 0.3} onChange={(ev) => patch(e.id, { intensity: Number(ev.target.value) })} aria-label={t("granja.hazard.cut")} className="w-20" />
                </label>
              )}
              <button type="button" onClick={() => onChange(events.filter((x) => x.id !== e.id))} aria-label={t("granja.hazard.remove")} className="ml-auto h-6 w-6 rounded-full border border-[var(--border)]">
                <X size={12} className="mx-auto" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
