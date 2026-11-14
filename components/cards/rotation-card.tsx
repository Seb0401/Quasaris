"use client";

import { useT, useLocale } from "@/components/i18n-provider";
import type { MonthStatus, Rotation, RotationResult } from "@/lib/contract";

const MONTH_COLOR: Record<MonthStatus, string> = {
  ok: "bg-ok",
  water_stress: "bg-warn",
  climate_risk: "bg-danger",
  bare: "bg-bare",
};

export function MonthStrip({ months, labels }: { months: MonthStatus[]; labels?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale, { month: "narrow" });
  return (
    <div className="grid grid-cols-12 gap-0.5">
      {months.map((m, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div className={`h-4 w-full rounded-sm ${MONTH_COLOR[m]}`} title={t(`month.${m}`)} />
          {labels && <span className="text-[10px] text-muted">{fmt.format(new Date(2025, i, 1))}</span>}
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted tabular-nums">{sub}</div>}
    </div>
  );
}

export function RotationCard({ rotation, result }: { rotation: Rotation; result: RotationResult }) {
  const t = useT();
  const locale = useLocale();
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });

  const sections = [
    { title: t("comparar.evidence"), items: result.explain.evidence },
    { title: t("comparar.benefits"), items: result.explain.benefits },
    { title: t("comparar.missing"), items: result.explain.missing },
    { title: t("comparar.review"), items: result.explain.reviewWithExpert },
  ];

  return (
    <article className={`rounded-2xl border bg-surface p-4 flex flex-col gap-3 ${result.viable ? "border-border" : "border-danger"}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          {rotation.isCurrent && (
            <span className="inline-block rounded-full bg-soil/15 text-soil text-xs font-semibold px-2 py-0.5 mb-1">{t("comparar.current")}</span>
          )}
          <h2 className="text-lg font-semibold leading-tight">{rotation.name}</h2>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted">{t("comparar.score")}</div>
          <div className="text-2xl font-bold text-brand tabular-nums">{Math.round(result.score * 100)}</div>
        </div>
      </header>

      {!result.viable && <p className="rounded-lg bg-danger/10 text-danger text-sm font-semibold px-3 py-2">⛔ {t("comparar.notViable")}</p>}

      <div className="grid grid-cols-2 gap-2">
        <Metric
          label={`💧 ${t("comparar.water")} (m³/ha)`}
          value={n.format(result.water.median)}
          sub={t("comparar.range", { p10: n.format(result.water.p10), p90: n.format(result.water.p90) })}
        />
        <Metric
          label={`💰 ${t("comparar.income")} (S/ /ha)`}
          value={n.format(result.income.median)}
          sub={t("comparar.range", { p10: n.format(result.income.p10), p90: n.format(result.income.p90) })}
        />
        <Metric label={`🌱 ${t("comparar.soilHealth")}`} value={pct.format(result.soil)} />
        <Metric label={`⚠️ ${t("comparar.risk")}`} value={pct.format(result.risk.median)} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted">{t("comparar.months")}</span>
        <MonthStrip months={result.months} labels />
      </div>

      <p className="text-sm">
        <span className="font-semibold">{t("comparar.why")}: </span>
        {t(`explain.${result.explain.whyKey}`)}
      </p>

      {result.highlights.map((h) => (
        <p key={h.key + h.year} className="text-sm rounded-lg bg-warn/15 px-3 py-2">
          🕰️ {t(`explain.${h.key}`, { year: h.year, ...Object.fromEntries(Object.entries(h.params).map(([k, v]) => [k, n.format(v)])) })}
        </p>
      ))}

      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-brand">+ {t("comparar.evidence")} · {t("comparar.review")}</summary>
        <div className="mt-2 grid gap-3">
          {sections.map((s) => (
            <div key={s.title}>
              <div className="font-semibold">{s.title}</div>
              <ul className="list-disc pl-5 text-muted">
                {s.items.map((k) => (
                  <li key={k}>{t(`explain.${k}`)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </article>
  );
}
