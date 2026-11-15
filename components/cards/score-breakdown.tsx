"use client";

import Link from "next/link";
import { BadgeDollarSign, Droplets, Leaf, ShieldAlert, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import type { Priorities, RotationResult } from "@/lib/contract";

/** Mismo factor que engine/simulate.py (NON_VIABLE_PENALTY) cuando el agua no alcanza. */
const PENALTY = 0.6;
const KEYS = ["water", "income", "soil", "risk"] as const;
type Key = (typeof KEYS)[number];
const ICON = { water: Droplets, income: BadgeDollarSign, soil: Leaf, risk: ShieldAlert };
const COLOR: Record<Key, string> = { water: "#5cc8f5", income: "#f6b94c", soil: "#b9ff63", risk: "#ff8a7a" };

export type ScorePart = { key: Key; value: number; weight: number; points: number };

/**
 * Desarma el puntaje del motor en sus cuatro partes (engine/simulate.py):
 * agua e ingreso se miden frente a las otras rotaciones (la mejor = 1, la peor = 0),
 * suelo y riesgo son absolutos; se promedian con el peso de cada prioridad del agricultor.
 */
export function scoreParts(result: RotationResult, all: RotationResult[], priorities: Priorities): { parts: ScorePart[]; raw: number; penalized: boolean } {
  const w = all.map((r) => r.water.median);
  const inc = all.map((r) => r.income.median);
  // si todas empatan, la parte vale 1 (como _norm y _norm_inverse en el motor)
  const tie = (xs: number[]) => Math.max(...xs) - Math.min(...xs) < 1e-9;
  const rel = (v: number, xs: number[]) => (v - Math.min(...xs)) / (Math.max(...xs) - Math.min(...xs));
  const value: Record<Key, number> = {
    water: tie(w) ? 1 : 1 - rel(result.water.median, w),
    income: tie(inc) ? 1 : rel(result.income.median, inc),
    soil: result.soil,
    risk: 1 - result.risk.median,
  };
  let weights = KEYS.map((k) => priorities[k]);
  if (weights.every((x) => x === 0)) weights = [1, 1, 1, 1];
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = KEYS.map((k, i) => ({ key: k, value: value[k], weight: weights[i] / sum, points: (value[k] * weights[i] * 100) / sum }));
  return { parts, raw: parts.reduce((a, p) => a + p.points, 0), penalized: !result.viable };
}

const level = (w: number) => (w >= 0.3 ? "high" : w >= 0.18 ? "med" : w > 0 ? "low" : "off");

/** "¿Qué significa 55 de 100?": las cuatro partes, cuánto pesa cada una y cuántos puntos aporta. */
export function ScoreBreakdown({ result, all, priorities, compact }: { result: RotationResult; all: RotationResult[]; priorities: Priorities; compact?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const { parts, raw, penalized } = scoreParts(result, all, priorities);
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const score = Math.round(result.score * 100);

  return (
    <div className={`score-explain ${compact ? "is-compact" : ""}`}>
      {!compact && (
        <>
          <b className="score-explain-title">{t("comparar.fit.title", { score })}</b>
          <p className="score-explain-intro">{t("comparar.fit.intro")}</p>
        </>
      )}
      <div className="score-stack" role="img" aria-label={t("comparar.fit.title", { score })}>
        {parts.map((p) => (
          <i key={p.key} style={{ width: `${p.points * (penalized ? PENALTY : 1)}%`, background: COLOR[p.key] }} />
        ))}
      </div>
      <ul className="score-parts">
        {parts.map((p) => {
          const Icon = ICON[p.key];
          return (
            <li key={p.key}>
              <span className="score-part-name"><Icon size={14} style={{ color: COLOR[p.key] }} />{t(`comparar.fit.part.${p.key}`)}</span>
              <span className="score-part-bar"><i style={{ width: `${p.value * 100}%`, background: COLOR[p.key] }} /></span>
              <span className="score-part-note">{t(`comparar.fit.how.${p.key}`, { v: pct.format(p.value) })}</span>
              <span className={`score-part-weight w-${level(p.weight)}`}>{t(`comparar.fit.weight.${level(p.weight)}`)}</span>
              <b>+{n.format(p.points)}</b>
            </li>
          );
        })}
      </ul>
      {penalized && (
        <p className="score-penalty"><TriangleAlert size={14} />{t("comparar.fit.penalty", { raw: n.format(raw), score })}</p>
      )}
      {!compact && (
        <Link href={`/${locale}/parcela`} className="score-change"><SlidersHorizontal size={14} />{t("comparar.fit.change")}</Link>
      )}
    </div>
  );
}
