"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, Tractor } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { ProfitIcon, ShieldIcon, SoilIcon, TargetIcon, WaterIcon } from "@/components/icons/farm-icons";
import { RotationIcons } from "@/components/icons/rotation-icons";
import type { Recommendation, Reason } from "@/lib/recommendation";

const REASON_ICON = { water: WaterIcon, income: ProfitIcon, soil: SoilIcon, risk: ShieldIcon };

export function RecommendationCard({ rec, waterAvailable }: { rec: Recommendation; waterAvailable: number }) {
  const t = useT();
  const locale = useLocale();
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });

  const reasonText = (r: Reason) =>
    r.kind === "water"
      ? t("reco.reason.water", { m3: n.format(r.value), pct: pct.format(rec.waterSavingPct) })
      : r.kind === "income"
        ? t("reco.reason.income", { pen: n.format(r.value) })
        : r.kind === "soil"
          ? t("reco.reason.soil", { pts: n.format(r.value * 100) })
          : t("reco.reason.risk", { pts: n.format(r.value * 100) });

  const tone = rec.verdict === "noneViable" ? "border-danger" : "border-brand";

  return (
    <section className={`flex flex-col gap-4 rounded-3xl border-2 ${tone} bg-surface p-5 shadow-sm`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${rec.verdict === "noneViable" ? "bg-danger/10 text-danger" : "bg-brand/10 text-brand"}`}>
          <TargetIcon size={24} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("reco.kicker")}</p>
          <h2 className="text-xl font-bold leading-tight">
            {rec.verdict === "keep" ? t("reco.keep") : rec.verdict === "noneViable" ? t("reco.noneViable") : t("reco.switch")}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold">
            <RotationIcons rotation={rec.bestRotation} size={20} className="text-brand" />
            {rec.bestRotation.name}
          </p>
        </div>
      </div>

      {rec.verdict === "noneViable" ? (
        <div className="flex flex-col gap-2 text-sm">
          <p>{t("reco.noneText", { need: n.format(rec.best.water.median), have: n.format(waterAvailable) })}</p>
          <ul className="flex flex-col gap-1.5">
            {rec.dripWaterM3ha !== null && (
              <li className="flex items-start gap-2 rounded-xl bg-background px-3 py-2">
                <WaterIcon size={18} className="mt-0.5 shrink-0" />
                {t("reco.tryDrip", { m3: n.format(rec.dripWaterM3ha) })}
              </li>
            )}
            {rec.plantableShare !== null && (
              <li className="flex items-start gap-2 rounded-xl bg-background px-3 py-2">
                <Tractor size={18} className="mt-0.5 shrink-0" />
                {t("reco.reduceArea", { pct: pct.format(rec.plantableShare) })}
              </li>
            )}
          </ul>
        </div>
      ) : (
        rec.current &&
        rec.verdict === "switch" && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Delta label={t("reco.water")} value={`${rec.waterSavingM3ha >= 0 ? "−" : "+"}${n.format(Math.abs(rec.waterSavingM3ha))}`} unit="m³/ha" good={rec.waterSavingM3ha >= 0} />
            <Delta label={t("reco.income")} value={`${rec.incomeDeltaPEN >= 0 ? "+" : "−"}S/ ${n.format(Math.abs(rec.incomeDeltaPEN))}`} unit="/ha" good={rec.incomeDeltaPEN >= 0} />
            <Delta label={t("reco.soil")} value={`${rec.soilDelta >= 0 ? "+" : "−"}${n.format(Math.abs(rec.soilDelta * 100))}`} unit="pts" good={rec.soilDelta >= 0} />
          </div>
        )
      )}

      {rec.reasons.length > 0 && rec.verdict !== "noneViable" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold">{t("reco.why")}</p>
          {rec.reasons.map((r) => {
            const I = REASON_ICON[r.kind];
            return (
              <p key={r.kind} className="flex items-start gap-2 text-sm">
                <I size={18} className="mt-0.5 shrink-0" />
                {reasonText(r)}
              </p>
            );
          })}
        </div>
      )}

      {rec.checks.length > 0 && (
        <div className="rounded-xl bg-background px-3 py-2 text-sm">
          <p className="flex items-center gap-1.5 font-semibold">
            <ClipboardCheck size={16} /> {t("reco.check")}
          </p>
          <ul className="mt-1 list-disc pl-5 text-muted">
            {rec.checks.map((k) => (
              <li key={k}>{t(`explain.${k}`)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href={`/${locale}/plan`} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink">
          {t("reco.toPlan")} <ArrowRight size={16} />
        </Link>
        <Link href={`/${locale}/granja`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-semibold">
          <Tractor size={16} /> {t("reco.toFarm")}
        </Link>
      </div>
      <p className="text-[11px] text-muted">{t("reco.source")}</p>
    </section>
  );
}

function Delta({ label, value, unit, good }: { label: string; value: string; unit: string; good: boolean }) {
  return (
    <div className="rounded-xl bg-background px-2 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${good ? "text-ok" : "text-danger"}`}>{value}</div>
      <div className="text-[10px] text-muted">{unit}</div>
    </div>
  );
}
