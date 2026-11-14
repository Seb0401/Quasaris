"use client";

import { Bug, CloudRain, Mountain, ShieldAlert, Waves } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { CropIcon, DroughtIcon, FrostIcon, HeatIcon, ReservoirIcon, WaterIcon } from "@/components/icons/farm-icons";
import type { AlertKind, FarmAlert } from "@/lib/granja-events";
import { lotRanges } from "@/lib/plan";

const ICON: Record<AlertKind, (p: { size?: number; className?: string }) => React.JSX.Element> = {
  frost: FrostIcon,
  heat: HeatIcon,
  drought: DroughtIcon,
  heavyRain: (p) => <CloudRain size={p.size} className={p.className} />,
  pests: (p) => <Bug size={p.size} className={p.className} />,
  dry: ReservoirIcon,
  climate: (p) => <ShieldAlert size={p.size} className={p.className} />,
  waterPeak: WaterIcon,
  monoculture: (p) => <Bug size={p.size} className={p.className} />,
  erosion: (p) => <Mountain size={p.size} className={p.className} />,
};
const SEVERITY = { high: "border-l-[#ff6b5f]", med: "border-l-[#ffc65c]", low: "border-l-[#7fd1ff]" };

export function AlertIcon({ kind, size = 16, className }: { kind: AlertKind; size?: number; className?: string }) {
  const I = ICON[kind];
  return I ? <I size={size} className={className} /> : <Waves size={size} className={className} />;
}

/** Pronóstico de riesgos del año (antes de simular) y registro de lo que pasó. */
export function RiskPanel({ alerts, month, onPickMonth }: { alerts: FarmAlert[]; month: number; onPickMonth: (m: number) => void }) {
  const t = useT();
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale, { month: "long" });
  const high = alerts.filter((a) => a.severity === "high").length;

  if (!alerts.length) return <p className="text-sm text-[var(--muted)]">{t("granja.risk.none")}</p>;

  return (
    <section className="flex flex-col gap-2 text-sm">
      <p className="text-xs text-[var(--muted)]">{t("granja.risk.summary", { n: alerts.length, high })}</p>
      {alerts.map((a, i) => (
        <button
          key={i}
          type="button"
          onClick={() => a.month >= 0 && onPickMonth(a.month)}
          className={`flex flex-col gap-1 rounded-xl border border-l-4 border-[var(--border)] bg-white/[.04] px-3 py-2 text-left ${SEVERITY[a.severity]} ${a.month === month ? "ring-1 ring-[var(--brand)]" : ""}`}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <AlertIcon kind={a.kind} /> {t(`granja.alert.${a.kind}.title`)}
            </span>
            <span className="shrink-0 text-xs capitalize text-[var(--muted)]">{a.month >= 0 ? fmt.format(new Date(2025, a.month, 1)) : t("granja.risk.allYear")}</span>
          </span>
          <span className="text-xs">{t(`granja.alert.${a.kind}.what`)}</span>
          {(a.tiles.length > 0 || a.crops.length > 0) && (
            <span className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              {a.tiles.length > 0 && <span>{t("granja.risk.lots", { lots: lotRanges(a.tiles) })}</span>}
              {a.crops.map((c) => (
                <CropIcon key={c} crop={c} size={14} />
              ))}
            </span>
          )}
          <span className="text-xs font-medium text-[var(--brand)]">{t(`granja.alert.${a.kind}.action`)}</span>
          {a.fromEvent && <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{t("granja.risk.simulated")}</span>}
        </button>
      ))}
    </section>
  );
}
