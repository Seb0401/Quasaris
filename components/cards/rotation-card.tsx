"use client";

import { useT, useLocale } from "@/components/i18n-provider";
import type { MonthStatus, Rotation, RotationResult } from "@/lib/contract";
import { BadgeDollarSign, CheckCircle2, ChevronDown, Clock3, Crown, Droplets, Leaf, ShieldAlert, XCircle } from "lucide-react";
import { Badge, CountUp, Meter, ScoreRing } from "@/components/ui/kit";
import { waterFit } from "@/lib/water-fit";

export const MONTH_COLOR: Record<MonthStatus, string> = {
  ok: "var(--ok)",
  water_stress: "var(--warn)",
  climate_risk: "var(--danger)",
  bare: "var(--bare)",
};

/** 12 meses coloreados por estado; aparecen uno tras otro. */
export function MonthStrip({ months, labels }: { months: MonthStatus[]; labels?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale, { month: "narrow" });
  return (
    <div className="month-strip">
      {months.map((m, i) => (
        <div key={i} className="month-cell">
          <span className="month-bar" style={{ background: MONTH_COLOR[m], animationDelay: `${i * 45}ms` }} title={`${fmt.format(new Date(2025, i, 1))} · ${t(`month.${m}`)}`} />
          {labels && <small>{fmt.format(new Date(2025, i, 1))}</small>}
        </div>
      ))}
    </div>
  );
}

export function MonthLegend() {
  const t = useT();
  return (
    <div className="month-legend">
      {(Object.keys(MONTH_COLOR) as MonthStatus[]).map((s) => (
        <span key={s}><i style={{ background: MONTH_COLOR[s] }} />{t(`month.${s}`)}</span>
      ))}
    </div>
  );
}

export type MetricScale = { water: number; income: number; waterLimit: number };

export function RotationCard({ rotation, result, color, recommended, scale }: { rotation: Rotation; result: RotationResult; color: string; recommended?: boolean; scale: MetricScale }) {
  const t = useT();
  const locale = useLocale();
  const es = locale === "es";
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  const sections = [
    { title: t("comparar.evidence"), items: result.explain.evidence },
    { title: t("comparar.benefits"), items: result.explain.benefits },
    { title: t("comparar.missing"), items: result.explain.missing },
    { title: t("comparar.review"), items: result.explain.reviewWithExpert },
  ].filter((s) => s.items.length > 0);

  const fit = waterFit(result, scale.waterLimit);
  const overWater = fit.shortfallM3ha;
  const yearsFitText = t("comparar.yearsFit", { n: fit.yearsFit, total: fit.years });
  const rows = [
    {
      icon: Droplets,
      label: t("comparar.water"),
      value: <CountUp value={result.water.median} format={(v) => `${n.format(v)} m³/ha`} />,
      meter: result.water.median / scale.water,
      marker: scale.waterLimit / scale.water,
      color: "#5cc8f5",
      note: overWater > 0 ? `${t("comparar.shortfall", { m3: n.format(overWater) })} · ${yearsFitText}` : yearsFitText,
      bad: overWater > 0,
    },
    {
      icon: BadgeDollarSign,
      label: t("comparar.income"),
      value: <CountUp value={result.income.median} format={(v) => `S/ ${n.format(v)}`} />,
      meter: result.income.median / scale.income,
      color: "#f6b94c",
      note: es ? `entre S/ ${n.format(result.income.p10)} y S/ ${n.format(result.income.p90)} por ha` : `between S/ ${n.format(result.income.p10)} and S/ ${n.format(result.income.p90)} per ha`,
    },
    {
      icon: Leaf,
      label: t("comparar.soilHealth"),
      value: <CountUp value={result.soil * 100} format={(v) => `${Math.round(v)}/100`} />,
      meter: result.soil,
      color: "#b9ff63",
      note: result.soil >= 0.7 ? (es ? "Suelo bien cuidado" : "Well cared soil") : result.soil >= 0.5 ? (es ? "Cuidado moderado" : "Moderate care") : (es ? "Desgasta el suelo" : "Wears the soil"),
    },
    {
      icon: ShieldAlert,
      label: es ? "Riesgo climático" : "Climate risk",
      value: <CountUp value={result.risk.median * 100} format={(v) => `${Math.round(v)}%`} />,
      meter: result.risk.median,
      color: "#ff8a7a",
      note: es ? "pérdida típica por helada o calor" : "typical loss from frost or heat",
    },
  ];

  return (
    <article className={`rotation-card ${recommended ? "is-recommended" : ""}`} style={{ "--accent": color } as React.CSSProperties}>
      <div className="rotation-card-glow" aria-hidden />
      <header className="rotation-card-head">
        <div className="min-w-0">
          <div className="rotation-badges">
            {rotation.isCurrent && <Badge tone="sky">{t("comparar.current")}</Badge>}
            {recommended && <Badge tone="brand" icon={Crown}>{es ? "Recomendada" : "Recommended"}</Badge>}
            {result.viable ? <Badge tone={fit.yearsFit === fit.years ? "ok" : "warn"} icon={CheckCircle2}>{yearsFitText}</Badge> : <Badge tone="danger" icon={XCircle}>{t("comparar.shortfall", { m3: n.format(fit.shortfallM3ha) })}</Badge>}
          </div>
          <h3><i style={{ background: color }} />{rotation.name}</h3>
        </div>
        <ScoreRing value={Math.round(result.score * 100)} size={74} stroke={7} color={color} label={t("comparar.score")} />
      </header>

      <div className="rotation-metrics">
        {rows.map(({ icon: Icon, label, value, meter, marker, color: c, note, bad }) => (
          <div key={label} className="rotation-metric">
            <div className="rotation-metric-top">
              <span><Icon size={14} style={{ color: c }} />{label}</span>
              <strong>{value}</strong>
            </div>
            <Meter value={meter} color={c} height={6} marker={marker} />
            <small className={bad ? "is-bad" : ""}>{note}</small>
          </div>
        ))}
      </div>

      <div className="rotation-months">
        <span className="ui-mini-title">{t("comparar.months")}</span>
        <MonthStrip months={result.months} labels />
      </div>

      <p className="rotation-why"><b>{t("comparar.why")}:</b> {t(`explain.${result.explain.whyKey}`)}</p>

      {result.highlights.length > 0 && (
        <ul className="rotation-highlights">
          {result.highlights.map((h) => (
            <li key={h.key + h.year}>
              <Clock3 size={14} />
              <span>{t(`explain.${h.key}`, { year: h.year, ...Object.fromEntries(Object.entries(h.params).map(([k, v]) => [k, n.format(v)])) })}</span>
            </li>
          ))}
        </ul>
      )}

      {sections.length > 0 && (
        <details className="rotation-details">
          <summary>{t("comparar.evidence")} · {t("comparar.review")}<ChevronDown size={16} /></summary>
          <div className="rotation-details-body">
            {sections.map((s) => (
              <div key={s.title}>
                <b>{s.title}</b>
                <ul>{s.items.map((k) => <li key={k}>{t(`explain.${k}`)}</li>)}</ul>
              </div>
            ))}
          </div>
        </details>
      )}
    </article>
  );
}
