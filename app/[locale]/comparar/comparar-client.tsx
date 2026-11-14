"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BadgeDollarSign, BarChart3, Crown, Droplets, FlaskConical, Leaf, Mountain, PencilLine, Sprout, Satellite, ShieldAlert, Sparkles, Target, TriangleAlert } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { MonthLegend, RotationCard, type MetricScale } from "@/components/cards/rotation-card";
import { Reveal } from "@/components/motion/reveal";
import { CountUp, HeroStat, LoadingOrbit, PageHeader, Panel, ScoreRing } from "@/components/ui/kit";
import { useFarm } from "@/lib/farm-store";
import { useSimulation } from "@/lib/use-simulation";
import { rotationColor } from "@/lib/ui";
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
        subtitle={es ? `Cada rotación se simuló con el clima real de ${data.source.period[0]} a ${data.source.period[1]} sobre tu parcela. Aquí ves cuál conviene y por qué.` : `Each rotation was simulated with real climate from ${data.source.period[0]} to ${data.source.period[1]} over your field. Here is which one fits and why.`}
      >
        <HeroStat icon={Satellite} label="NASA POWER">{data.source.period[0]}–{data.source.period[1]}</HeroStat>
        {data.source.elevationM !== undefined && <HeroStat icon={Mountain} label={es ? "ALTITUD SRTM" : "SRTM ELEVATION"} tone="lime"><CountUp value={data.source.elevationM} format={(v) => `${n.format(v)} m`} /></HeroStat>}
        <HeroStat icon={Target} label={es ? "ESCENARIOS" : "SCENARIOS"} tone="amber">{rows.length}</HeroStat>
        {data.source.rootZoneWetness && (
          <HeroStat icon={Sprout} label={es ? "HUMEDAD SUELO" : "SOIL MOISTURE"} tone="sky">
            <CountUp value={(data.source.rootZoneWetness.reduce((a, b) => a + b, 0) / data.source.rootZoneWetness.length) * 100} format={(v) => `${Math.round(v)}%`} />
          </HeroStat>
        )}
      </PageHeader>

      <div className="compare-toolbar">
        {data.source.rootZoneWetness && (
          <p className="ui-hint"><Sprout size={14} />{t("comparar.soilWetness", {
            pct: `${Math.round((data.source.rootZoneWetness.reduce((a, b) => a + b, 0) / data.source.rootZoneWetness.length) * 100)}%`,
            min: `${Math.round(Math.min(...data.source.rootZoneWetness) * 100)}%`,
            max: `${Math.round(Math.max(...data.source.rootZoneWetness) * 100)}%`,
          })}</p>
        )}
        <Link href={`/${locale}/rotaciones`} className="ui-btn ui-btn-ghost ui-btn-sm"><PencilLine size={14} />{t("rotaciones.edit")}</Link>
      </div>

      {data.source.power === "mock" && <p className="ui-alert tone-warn"><FlaskConical size={16} />{t("comparar.mockWarning")}</p>}

      {best && current && <Verdict best={best} current={current} anyViable={viable.length > 0} />}

      <Reveal>
        <Panel kicker={es ? "CARA A CARA" : "HEAD TO HEAD"} icon={BarChart3} title={es ? "¿En qué gana cada rotación?" : "Where does each rotation win?"} actions={<div className="duel-legend">{rows.map((r) => <span key={r.rotation.id}><i style={{ background: r.color }} />{r.rotation.name}</span>)}</div>}>
          <div className="duel-grid">
            <Duel rows={rows} icon={Droplets} title={t("comparar.water")} hint={es ? "Menos es mejor" : "Lower is better"} pick={(r) => r.water.median} format={(v) => `${n.format(v)} m³`} lowerIsBetter limit={farm.waterAvailableM3ha} limitLabel={es ? "Tu agua" : "Your water"} />
            <Duel rows={rows} icon={BadgeDollarSign} title={t("comparar.income")} hint={es ? "Más es mejor · S/ por ha" : "Higher is better · S/ per ha"} pick={(r) => r.income.median} format={(v) => `S/ ${n.format(v)}`} />
            <Duel rows={rows} icon={Leaf} title={t("comparar.soilHealth")} hint={es ? "Más es mejor" : "Higher is better"} pick={(r) => r.soil * 100} format={(v) => `${Math.round(v)}/100`} max={100} />
            <Duel rows={rows} icon={ShieldAlert} title={es ? "Riesgo climático" : "Climate risk"} hint={es ? "Menos es mejor" : "Lower is better"} pick={(r) => r.risk.median * 100} format={(v) => `${Math.round(v)}%`} lowerIsBetter max={100} />
          </div>
        </Panel>
      </Reveal>

      <div className="section-title">
        <div>
          <span className="ui-kicker"><Sparkles size={13} /> {es ? "DETALLE POR ROTACIÓN" : "ROTATION DETAIL"}</span>
          <h2>{es ? "La evidencia completa" : "The full evidence"}</h2>
        </div>
        <MonthLegend />
      </div>

      <div className="compare-grid">
        {rows.map((row, index) => (
          <Reveal key={row.rotation.id} delay={index * 110}>
            <RotationCard rotation={row.rotation} result={row.result} color={row.color} recommended={row === best} scale={scale} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/** El resultado en una frase, con el puntaje y las diferencias contra lo que siembras hoy. */
function Verdict({ best, current, anyViable }: { best: Row; current: Row; anyViable: boolean }) {
  const t = useT();
  const locale = useLocale();
  const es = locale === "es";
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const same = best === current;
  const deltas = [
    { icon: Droplets, label: es ? "Agua" : "Water", value: best.result.water.median - current.result.water.median, format: (v: number) => `${n.format(Math.abs(v))} m³/ha`, good: (v: number) => v < 0 },
    { icon: BadgeDollarSign, label: es ? "Ingreso" : "Income", value: best.result.income.median - current.result.income.median, format: (v: number) => `S/ ${n.format(Math.abs(v))}`, good: (v: number) => v > 0 },
    { icon: Leaf, label: es ? "Suelo" : "Soil", value: (best.result.soil - current.result.soil) * 100, format: (v: number) => `${n.format(Math.abs(v))} pts`, good: (v: number) => v > 0 },
    { icon: ShieldAlert, label: es ? "Riesgo" : "Risk", value: (best.result.risk.median - current.result.risk.median) * 100, format: (v: number) => `${n.format(Math.abs(v))} pts`, good: (v: number) => v < 0 },
  ];

  return (
    <Reveal>
      <section className="verdict" style={{ "--accent": best.color } as React.CSSProperties}>
        <div className="verdict-aurora" aria-hidden />
        <div className="verdict-main">
          <ScoreRing value={Math.round(best.result.score * 100)} size={150} stroke={11} color={best.color} label={es ? "de 100" : "of 100"} />
          <div className="verdict-copy">
            <span className="ui-kicker"><Crown size={14} /> {anyViable ? (es ? "NUESTRA RECOMENDACIÓN" : "OUR RECOMMENDATION") : (es ? "LA MÁS CERCANA" : "THE CLOSEST OPTION")}</span>
            <h2>{best.rotation.name}</h2>
            <p>{t(`explain.${best.result.explain.whyKey}`)}</p>
            {!anyViable && (
              <p className="verdict-warning"><TriangleAlert size={16} />{es ? "Ninguna rotación alcanza con el agua que indicaste. Esta es la que mejor equilibra tus prioridades; prueba con más agua o riego por goteo." : "No rotation fits the water you entered. This one best balances your priorities; try more water or drip irrigation."}</p>
            )}
          </div>
        </div>

        <div className="verdict-deltas">
          <span className="ui-mini-title">{same ? (es ? "Ya siembras la mejor opción" : "You already plant the best option") : (es ? `Comparado con lo que siembras hoy (${current.rotation.name})` : `Compared with what you plant today (${current.rotation.name})`)}</span>
          <div className="delta-grid">
            {deltas.map(({ icon: Icon, label, value, format, good }) => {
              const neutral = Math.abs(value) < 0.5;
              const tone = same || neutral ? "neutral" : good(value) ? "good" : "bad";
              const Arrow = value > 0 ? ArrowUpRight : ArrowDownRight;
              return (
                <div key={label} className={`delta tone-${tone}`}>
                  <span><Icon size={15} />{label}</span>
                  <strong>{neutral || same ? "=" : <><Arrow size={16} /><CountUp value={value} format={format} /></>}</strong>
                  <small>{same || neutral ? (es ? "sin cambio" : "no change") : tone === "good" ? (es ? "mejora" : "better") : (es ? "empeora" : "worse")}</small>
                </div>
              );
            })}
          </div>
          <Link href={`/${locale}/tiempo`} className="ui-btn ui-btn-ghost">{es ? "Ver cómo le fue año por año" : "See how it did year by year"}<ArrowRight size={16} /></Link>
        </div>
      </section>
    </Reveal>
  );
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
