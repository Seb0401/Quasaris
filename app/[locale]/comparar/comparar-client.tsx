"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, BadgeDollarSign, BarChart3, Combine, Crown, Droplets, FlaskConical, Leaf, PencilLine, Repeat2, Satellite, ShieldAlert, Sparkles, Target, TriangleAlert } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { MonthLegend, RotationCard, type MetricScale } from "@/components/cards/rotation-card";
import { ScoreBreakdown } from "@/components/cards/score-breakdown";
import { Reveal } from "@/components/motion/reveal";
import { CountUp, HeroStat, LoadingOrbit, PageHeader, Panel, ScoreRing } from "@/components/ui/kit";
import { useFarm } from "@/lib/farm-store";
import { useSimulation } from "@/lib/use-simulation";
import { rotationColor } from "@/lib/ui";
import { waterFit } from "@/lib/water-fit";
import type { Rotation, RotationResult } from "@/lib/contract";

type Row = { rotation: Rotation; result: RotationResult; color: string };

export function CompararClient() {
  const t = useT();
  const locale = useLocale();
  const es = locale === "es";
  const farm = useFarm();
  const data = useSimulation();
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  if (!data) return <div className="ui-page"><LoadingOrbit label={t("comparar.loading")} /></div>;

  const byId = new Map(data.rotations.map((r) => [r.id, r]));
  const rows: Row[] = farm.rotations.flatMap((rotation, index) => {
    const result = byId.get(rotation.id);
    return result ? [{ rotation, result, color: rotationColor(index) }] : [];
  });
  const viable = rows.filter((r) => r.result.viable);
  const best = [...(viable.length ? viable : rows)].sort((a, b) => b.result.score - a.result.score)[0];
  const current = rows.find((r) => r.rotation.isCurrent) ?? rows[0];
  const scale: MetricScale = {
    water: Math.max(farm.waterAvailableM3ha, ...rows.map((r) => r.result.water.p90)) * 1.05,
    income: Math.max(...rows.map((r) => r.result.income.p90)) * 1.05,
    waterLimit: farm.waterAvailableM3ha,
  };

  return (
    <div className="ui-page">
      <PageHeader
        icon={BarChart3}
        kicker={es ? "ESCENARIOS" : "SCENARIOS"}
        title={t("comparar.title")}
        subtitle={t("comparar.subtitle", { from: data.source.period[0], to: data.source.period[1], n: data.source.period[1] - data.source.period[0] + 1 })}
      >
        <HeroStat icon={Satellite} label="NASA POWER">{data.source.period[0]}–{data.source.period[1]}</HeroStat>
        <HeroStat icon={Target} label={es ? "ROTACIONES" : "ROTATIONS"} tone="amber">{rows.length}</HeroStat>
      </PageHeader>

      <div className="compare-toolbar">
        <ol className="compare-steps">
          {(["pick", "duel", "detail"] as const).map((k, i) => (
            <li key={k}><a href={`#cmp-${k}`}><b>{i + 1}</b>{t(`comparar.steps.${k}`)}</a></li>
          ))}
        </ol>
        <Link href={`/${locale}/agrupaciones`} className="ui-btn ui-btn-ghost ui-btn-sm"><Combine size={14} />{t("group.title")}</Link>
      </div>

      <section className="rot-cta">
        <span className="rot-cta-icon"><Repeat2 size={22} /></span>
        <div className="rot-cta-copy">
          <b>{es ? `Estás comparando ${rows.length} rotaciones` : `You are comparing ${rows.length} rotations`}</b>
          <p>{es ? "¿Siembras otra cosa o quieres probar otra combinación? Crea, cambia o marca cuál siembras hoy." : "Do you grow something else or want to try another combination? Create, change or mark the one you grow today."}</p>
        </div>
        <Link href={`/${locale}/rotaciones`} className="ui-btn"><PencilLine size={16} />{es ? "Gestionar mis rotaciones" : "Manage my rotations"}</Link>
      </section>

      {data.source.power === "mock" && <p className="ui-alert tone-warn"><FlaskConical size={16} />{t("comparar.mockWarning")}</p>}

      {best && current && <Verdict best={best} current={current} rows={rows} anyViable={viable.length > 0} all={rows.map((r) => r.result)} />}

      <Reveal>
        <Panel id="cmp-duel" kicker={es ? "CARA A CARA" : "HEAD TO HEAD"} icon={BarChart3} title={es ? "¿En qué gana cada rotación?" : "Where does each rotation win?"} actions={<div className="duel-legend">{rows.map((r) => <span key={r.rotation.id}><i style={{ background: r.color }} />{r.rotation.name}</span>)}</div>}>
          <div className="duel-grid">
            <Duel rows={rows} icon={Droplets} title={t("comparar.water")} hint={es ? "Por hectárea al año · menos es mejor" : "Per hectare per year · lower is better"} pick={(r) => r.water.median} format={(v) => `${n.format(v)} m³/ha`} lowerIsBetter limit={farm.waterAvailableM3ha} limitLabel={es ? "Tu agua" : "Your water"} />
            <Duel rows={rows} icon={BadgeDollarSign} title={t("comparar.income")} hint={es ? "Ganancia por hectárea al año · más es mejor" : "Profit per hectare per year · higher is better"} pick={(r) => r.income.median} format={(v) => `S/ ${n.format(v)}`} />
            <Duel rows={rows} icon={Leaf} title={t("comparar.soilHealth")} hint={es ? "Más es mejor" : "Higher is better"} pick={(r) => r.soil * 100} format={(v) => `${Math.round(v)}/100`} max={100} />
            <Duel rows={rows} icon={ShieldAlert} title={es ? "Cosecha que se pierde" : "Harvest lost"} hint={es ? "En un año normal · menos es mejor" : "In a normal year · lower is better"} pick={(r) => r.risk.median * 100} format={(v) => `${Math.round(v)}%`} lowerIsBetter max={100} />
          </div>
        </Panel>
      </Reveal>

      <div className="section-title" id="cmp-detail">
        <div>
          <span className="ui-kicker"><Sparkles size={13} /> {es ? "DETALLE POR ROTACIÓN" : "ROTATION DETAIL"}</span>
          <h2>{es ? "La evidencia completa" : "The full evidence"}</h2>
        </div>
        <MonthLegend />
      </div>

      <div className="compare-grid">
        {rows.map((row, index) => (
          <Reveal key={row.rotation.id} delay={index * 110}>
            <RotationCard rotation={row.rotation} result={row.result} color={row.color} recommended={row === best} scale={scale} all={rows.map((r) => r.result)} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/** El resultado en una frase, con el puntaje y lo que cambia frente a lo que siembras hoy, dicho en simple. */
function Verdict({ best, current, rows, anyViable, all }: { best: Row; current: Row; rows: Row[]; anyViable: boolean; all: RotationResult[] }) {
  const farm = useFarm();
  const fit = waterFit(best.result, farm.waterAvailableM3ha);
  const t = useT();
  const locale = useLocale();
  const es = locale === "es";
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const same = best === current;
  // si ya siembra la mejor, se compara con la siguiente opción para que las cifras digan algo
  const runnerUp = same ? [...rows].filter((r) => r !== best).sort((a, b) => b.result.score - a.result.score)[0] : undefined;
  const base = same ? runnerUp : current;

  return (
    <Reveal>
      <section className="verdict" id="cmp-pick" style={{ "--accent": best.color } as React.CSSProperties}>
        <div className="verdict-aurora" aria-hidden />
        <div className="verdict-main">
          <ScoreRing value={Math.round(best.result.score * 100)} size={150} stroke={11} color={best.color} label={t("comparar.fit.label")} />
          <div className="verdict-copy">
            <span className="ui-kicker"><Crown size={14} /> {anyViable ? (es ? "NUESTRA RECOMENDACIÓN" : "OUR RECOMMENDATION") : (es ? "LA MÁS CERCANA" : "THE CLOSEST OPTION")}</span>
            <h2>{best.rotation.name}</h2>
            <p>{t(`explain.${best.result.explain.whyKey}`)}</p>
            {!anyViable && (
              <p className="verdict-warning"><TriangleAlert size={16} />{t("comparar.shortfall", { m3: n.format(fit.shortfallM3ha) })} · {t("comparar.yearsFit", { n: fit.yearsFit, total: fit.years })}. {es ? "Es la opción que mejor equilibra tus prioridades; con riego por goteo o reduciendo el área sembrada podría alcanzar." : "It best balances your priorities; drip irrigation or a smaller planted area could make it fit."}</p>
            )}
            <details className="score-toggle">
              <summary>{t("comparar.fit.title", { score: Math.round(best.result.score * 100) })}<ChevronDown size={15} /></summary>
              <ScoreBreakdown result={best.result} all={all} priorities={farm.priorities} />
            </details>
          </div>
        </div>

        <div className="verdict-deltas">
          {base ? (
            <>
              <span className="ui-mini-title">
                {same
                  ? (es ? `Tu rotación actual ya es la mejor opción. Frente a la siguiente (${base.rotation.name}):` : `Your current rotation is already the best option. Compared with the next one (${base.rotation.name}):`)
                  : (es ? `Si cambias desde lo que siembras hoy (${base.rotation.name}):` : `If you switch from what you grow today (${base.rotation.name}):`)}
              </span>
              <div className="delta-grid">
                {plainDeltas(best.result, base.result, es, n).map(({ icon: Icon, key, label, tone, statement, detail }) => (
                  <div key={key} className={`delta delta-plain tone-${tone}`}>
                    <span><Icon size={15} />{label}<em>{tone === "good" ? (es ? "mejora" : "better") : tone === "bad" ? (es ? "empeora" : "worse") : (es ? "igual" : "same")}</em></span>
                    <strong>{statement}</strong>
                    <small>{detail}</small>
                  </div>
                ))}
              </div>
              <p className="delta-note">{es ? "Todas las cifras son por hectárea y por año: el valor típico de 21 años reales de clima. Precios y rendimientos son estimados; revísalos con tu técnico." : "All figures are per hectare and per year: the typical value over 21 real years of climate. Prices and yields are estimates; check them with your technician."}</p>
            </>
          ) : (
            <p className="delta-note">{es ? "Solo tienes una rotación. Agrega otra en «Gestionar mis rotaciones» para ver qué cambiaría." : "You only have one rotation. Add another in “Manage my rotations” to see what would change."}</p>
          )}
          <Link href={`/${locale}/tiempo`} className="ui-btn ui-btn-ghost">{es ? "Ver cómo le fue año por año" : "See how it did year by year"}<ArrowRight size={16} /></Link>
        </div>
      </section>
    </Reveal>
  );
}

type Plain = { key: string; icon: typeof Droplets; label: string; tone: "good" | "bad" | "neutral"; statement: string; detail: string };

/** Cuatro diferencias contadas como frases que entiende quien trabaja la chacra. */
function plainDeltas(next: RotationResult, base: RotationResult, es: boolean, n: Intl.NumberFormat): Plain[] {
  const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((Math.abs(a - b) / b) * 100));
  const out: Plain[] = [];

  const dw = next.water.median - base.water.median;
  const wSame = Math.abs(dw) < base.water.median * 0.01;
  out.push({
    key: "water", icon: Droplets, label: es ? "Agua" : "Water",
    tone: wSame ? "neutral" : dw < 0 ? "good" : "bad",
    statement: wSame ? (es ? "Usa casi la misma agua" : "Uses about the same water")
      : dw < 0 ? (es ? `Ahorras ${n.format(-dw)} m³ por hectárea al año` : `You save ${n.format(-dw)} m³ per hectare per year`)
      : (es ? `Necesitas ${n.format(dw)} m³ más por hectárea al año` : `You need ${n.format(dw)} m³ more per hectare per year`),
    detail: wSame ? (es ? `Alrededor de ${n.format(next.water.median)} m³ por hectárea` : `About ${n.format(next.water.median)} m³ per hectare`)
      : (es ? `${n.format(base.water.median)} → ${n.format(next.water.median)} m³ · ${pct(next.water.median, base.water.median)}% ${dw < 0 ? "menos" : "más"}` : `${n.format(base.water.median)} → ${n.format(next.water.median)} m³ · ${pct(next.water.median, base.water.median)}% ${dw < 0 ? "less" : "more"}`),
  });

  const di = next.income.median - base.income.median;
  const iSame = Math.abs(di) < Math.max(Math.abs(base.income.median) * 0.01, 50);
  out.push({
    key: "income", icon: BadgeDollarSign, label: es ? "Dinero" : "Money",
    tone: iSame ? "neutral" : di > 0 ? "good" : "bad",
    statement: iSame ? (es ? "Ganas casi lo mismo" : "You earn about the same")
      : di > 0 ? (es ? `Ganas S/ ${n.format(di)} más por hectárea al año` : `You earn S/ ${n.format(di)} more per hectare per year`)
      : (es ? `Ganas S/ ${n.format(-di)} menos por hectárea al año` : `You earn S/ ${n.format(-di)} less per hectare per year`),
    detail: es ? `S/ ${n.format(base.income.median)} → S/ ${n.format(next.income.median)} de ganancia estimada` : `S/ ${n.format(base.income.median)} → S/ ${n.format(next.income.median)} estimated profit`,
  });

  const s0 = Math.round(base.soil * 100), s1 = Math.round(next.soil * 100);
  out.push({
    key: "soil", icon: Leaf, label: es ? "Suelo" : "Soil",
    tone: s1 === s0 ? "neutral" : s1 > s0 ? "good" : "bad",
    statement: s1 === s0 ? (es ? "El suelo queda igual de sano" : "The soil stays as healthy") : s1 > s0 ? (es ? "El suelo queda más sano" : "The soil gets healthier") : (es ? "El suelo se desgasta más" : "The soil wears out more"),
    detail: es ? `Salud del suelo: ${s0} → ${s1} de 100` : `Soil health: ${s0} → ${s1} out of 100`,
  });

  const r0 = Math.round(base.risk.median * 100), r1 = Math.round(next.risk.median * 100);
  out.push({
    key: "risk", icon: ShieldAlert, label: es ? "Riesgo" : "Risk",
    tone: r1 === r0 ? "neutral" : r1 < r0 ? "good" : "bad",
    statement: r1 === r0 ? (es ? "El mismo riesgo de perder cosecha" : "The same risk of losing harvest") : r1 < r0 ? (es ? "Menos riesgo de perder cosecha" : "Less risk of losing harvest") : (es ? "Más riesgo de perder cosecha" : "More risk of losing harvest"),
    detail: es ? `En un año normal se pierde cerca del ${r1}% de la cosecha por clima o falta de agua (antes ${r0}%)` : `In a normal year about ${r1}% of the harvest is lost to weather or lack of water (before ${r0}%)`,
  });
  return out;
}

/** Barras horizontales de una métrica para todas las rotaciones; marca la ganadora. */
function Duel({ rows, icon: Icon, title, hint, pick, format, lowerIsBetter, max, limit, limitLabel }: { rows: Row[]; icon: typeof Droplets; title: string; hint: string; pick: (r: RotationResult) => number; format: (v: number) => string; lowerIsBetter?: boolean; max?: number; limit?: number; limitLabel?: string }) {
  const values = rows.map((r) => pick(r.result));
  const top = max ?? Math.max(...values, limit ?? 0) * 1.08;
  const winner = lowerIsBetter ? Math.min(...values) : Math.max(...values);
  return (
    <div className="duel">
      <div className="duel-head">
        <span><Icon size={15} />{title}</span>
        <small>{hint}</small>
      </div>
      <div className="duel-bars">
        {limit !== undefined && (
          <div className="duel-limit" style={{ "--r": limit / top } as React.CSSProperties}><span>{limitLabel}</span></div>
        )}
        {rows.map((r, i) => {
          const v = values[i];
          const win = v === winner;
          return (
            <div key={r.rotation.id} className={`duel-row ${win ? "is-winner" : ""}`}>
              <span className="duel-name" style={{ color: r.color }}>{r.rotation.name}</span>
              <div className="duel-track">
                <i style={{ width: `${Math.max(2, (v / top) * 100)}%`, background: `linear-gradient(90deg, color-mix(in srgb, ${r.color} 65%, transparent), ${r.color})`, animationDelay: `${i * 120}ms` }} />
              </div>
              <b><CountUp value={v} format={format} />{win && <Crown size={12} />}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}
