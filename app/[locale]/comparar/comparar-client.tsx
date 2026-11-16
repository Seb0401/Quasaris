"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronRight, Plus, BadgeDollarSign, BarChart3, Combine, Crown, Droplets, FlaskConical, Leaf, PencilLine, Repeat2, Satellite, ShieldAlert, Sparkles, Sprout, Target, TriangleAlert } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { MonthLegend, RotationCard, type MetricScale } from "@/components/cards/rotation-card";
import { ScoreBreakdown } from "@/components/cards/score-breakdown";
import { ImprovePlan } from "@/components/cards/improve-plan";
import { Reveal } from "@/components/motion/reveal";
import { CountUp, HeroStat, LoadingOrbit, PageHeader, Panel, ScoreRing } from "@/components/ui/kit";
import { useFarm } from "@/lib/farm-store";
import { useSimulation } from "@/lib/use-simulation";
import { rotationColor } from "@/lib/ui";
import { waterFit } from "@/lib/water-fit";
import { about, marginPct, scoreWord, shareOfWater, waterVsYours, yearsSentence } from "@/lib/plain";
import type { Rotation, RotationResult } from "@/lib/contract";
import { CropModelNotes } from "@/components/crop-model-notes";
import { CropArtwork } from "@/components/crops/crop-artwork";
import { cropName } from "@/lib/crop-calendar";

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
      <CropModelNotes cropIds={farm.rotations.flatMap((r) => r.crops.map((c) => c.cropId))} locale={locale} />

      <div className="compare-toolbar">
        <ol className="compare-steps">
          {(["pick", "duel", "detail"] as const).map((k, i) => (
            <li key={k}><a href={`#cmp-${k}`}><b>{i + 1}</b>{t(`comparar.steps.${k}`)}</a></li>
          ))}
        </ol>
        <Link href={`/${locale}/agrupaciones`} className="ui-btn ui-btn-ghost ui-btn-sm"><Combine size={14} />{t("group.title")}</Link>
      </div>


      {data.source.power === "mock" && <p className="ui-alert tone-warn"><FlaskConical size={16} />{t("comparar.mockWarning")}</p>}

      {best && current && <Verdict best={best} current={current} rows={rows} anyViable={viable.length > 0} all={rows.map((r) => r.result)} />}

      {current && <Reveal><ImprovePlan rows={rows} current={current} /></Reveal>}

      <section className="rot-cta">
        <span className="rot-cta-icon"><Repeat2 size={22} /></span>
        <div className="rot-cta-copy">
          <b>{es ? `Estás comparando ${rows.length} rotaciones` : `You are comparing ${rows.length} rotations`}</b>
          <p>{es ? "¿Siembras otra cosa o quieres probar otra combinación? Crea, cambia o marca cuál siembras hoy." : "Do you grow something else or want to try another combination? Create, change or mark the one you grow today."}</p>
        </div>
        <Link href={`/${locale}/rotaciones`} className="ui-btn"><PencilLine size={16} />{es ? "Gestionar mis rotaciones" : "Manage my rotations"}</Link>
      </section>

      <section className="rot-cta">
        <span className="rot-cta-icon"><Sprout size={22} /></span>
        <div className="rot-cta-copy">
          <b>{es ? "Abonos, microorganismos y dispositivos para tu parcela" : "Fertilisers, microorganisms and devices for your field"}</b>
          <p>{es ? "Recomendaciones según tu suelo, tu zona y los cultivos de cada rotación." : "Recommendations based on your soil, your area and the crops in each rotation."}</p>
        </div>
        <Link href={`/${locale}/recomendaciones`} className="ui-btn"><Sprout size={16} />{es ? "Ver recomendaciones" : "See recommendations"}</Link>
      </section>

      <Reveal>
        <Panel id="cmp-duel" kicker={es ? "CARA A CARA" : "HEAD TO HEAD"} icon={BarChart3} title={es ? "¿En qué gana cada rotación?" : "Where does each rotation win?"} actions={<div className="duel-legend">{rows.map((r) => <span key={r.rotation.id}><i style={{ background: r.color }} />{r.rotation.name}</span>)}</div>}>
          <div className="duel-grid">
            <Duel rows={rows} icon={Droplets} title={t("comparar.water")} hint={es ? "Cuánto de tu agua usa · menos es mejor" : "How much of your water it uses · lower is better"} pick={(r) => shareOfWater(r.water.median, farm.waterAvailableM3ha)} format={(v) => `${Math.round(v)}%`} lowerIsBetter limit={100} limitLabel={es ? "Tu agua" : "Your water"} />
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

/** Los cultivos de la rotación recomendada con sus ilustraciones, en el orden en que se siembran. */
function VerdictCrops({ rotation }: { rotation: Rotation }) {
  const locale = useLocale();
  const es = locale === "es";
  const together = rotation.mode === "association";
  // en orden de siembra; un mismo cultivo repetido se muestra una sola vez
  const crops = [...rotation.crops].sort((a, b) => (together ? 0 : a.sowMonth - b.sowMonth)).filter((c, i, all) => all.findIndex((x) => x.cropId === c.cropId) === i);
  if (!crops.length) return null;
  const month = (m: number) => new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(2025, m - 1, 1));
  const Sep = together ? Plus : ChevronRight;
  return (
    <ul className="verdict-crops" aria-label={together ? (es ? "Cultivos sembrados juntos" : "Crops grown together") : (es ? "Cultivos en orden de siembra" : "Crops in planting order")}>
      {crops.map((c, i) => (
        <li key={c.cropId}>
          {i > 0 && <Sep size={14} className="verdict-crops-sep" aria-hidden />}
          <span className="verdict-crop">
            <CropArtwork crop={c.cropId} size={46} />
            <span><b>{cropName(c.cropId, locale)}</b>{!together && <small>{es ? "Siembra" : "Sow"} {month(c.sowMonth)}</small>}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** El resultado en una frase, con el puntaje y lo que cambia frente a lo que siembras hoy, dicho en simple. */
function Verdict({ best, current, rows, anyViable, all }: { best: Row; current: Row; rows: Row[]; anyViable: boolean; all: RotationResult[] }) {
  const farm = useFarm();
  const fit = waterFit(best.result, farm.waterAvailableM3ha);
  const t = useT();
  const locale = useLocale();
  const es = locale === "es";
  const same = best === current;
  // si ya siembra la mejor, se compara con la siguiente opción para que las cifras digan algo
  const runnerUp = same ? [...rows].filter((r) => r !== best).sort((a, b) => b.result.score - a.result.score)[0] : undefined;
  const base = same ? runnerUp : current;

  return (
    <Reveal>
      <section className="verdict" id="cmp-pick" style={{ "--accent": best.color } as React.CSSProperties}>
        <div className="verdict-aurora" aria-hidden />
        <div className="verdict-main">
          <ScoreRing value={Math.round(best.result.score * 100)} size={150} stroke={11} color={best.color} label={scoreWord(Math.round(best.result.score * 100), locale)} />
          <div className="verdict-copy">
            <span className="ui-kicker"><Crown size={14} /> {anyViable ? (es ? "NUESTRA RECOMENDACIÓN" : "OUR RECOMMENDATION") : (es ? "LA MÁS CERCANA" : "THE CLOSEST OPTION")}</span>
            <h2>{best.rotation.name}</h2>
            <VerdictCrops rotation={best.rotation} />
            <p>{t(`explain.${best.result.explain.whyKey}`)}</p>
            {!anyViable && (
              <p className="verdict-warning"><TriangleAlert size={16} />{waterVsYours(best.result.water.median, farm.waterAvailableM3ha, locale)}. {yearsSentence(fit.yearsFit, fit.years, locale)} {es ? "Aun así es la que mejor cumple lo que te importa; con riego por goteo o sembrando un área más pequeña podría alcanzar." : "Even so, it is the one that best fits what matters to you; with drip irrigation or a smaller planted area it could fit."}</p>
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
                {plainDeltas(best.result, base.result, es, locale, farm.waterAvailableM3ha).map(({ icon: Icon, key, label, tone, statement, detail }) => (
                  <div key={key} className={`delta delta-plain tone-${tone}`}>
                    <span><Icon size={15} />{label}<em>{tone === "good" ? (es ? "mejora" : "better") : tone === "bad" ? (es ? "empeora" : "worse") : (es ? "igual" : "same")}</em></span>
                    <strong>{statement}</strong>
                    <small>{detail}</small>
                  </div>
                ))}
              </div>
              <p className="delta-note">
                <b>{es ? "¿Qué tan seguro es esto? " : "How sure is this? "}</b>
                {es
                  ? `Son estimados con el clima real de los últimos ${fit.years} años. De un año a otro, el agua cambia cerca de ±${marginPct(best.result.water)}% y la ganancia cerca de ±${marginPct(best.result.income)}%. Los precios y las cosechas son aproximados: confírmalos con tu técnico antes de decidir.`
                  : `These are estimates from the real weather of the last ${fit.years} years. From one year to the next, water moves by about ±${marginPct(best.result.water)}% and profit by about ±${marginPct(best.result.income)}%. Prices and harvests are approximate: confirm them with your technician before deciding.`}
              </p>
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
function plainDeltas(next: RotationResult, base: RotationResult, es: boolean, locale: "es" | "en", have: number): Plain[] {
  const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((Math.abs(a - b) / b) * 100));
  const s = (v: number) => shareOfWater(v, have);
  const out: Plain[] = [];

  const dw = next.water.median - base.water.median;
  const wSame = Math.abs(dw) < base.water.median * 0.01;
  out.push({
    key: "water", icon: Droplets, label: es ? "Agua" : "Water",
    tone: wSame ? "neutral" : dw < 0 ? "good" : "bad",
    statement: wSame ? (es ? "Usa casi la misma agua" : "Uses about the same water")
      : dw < 0 ? (es ? `Usa ${pct(next.water.median, base.water.median)}% menos agua` : `Uses ${pct(next.water.median, base.water.median)}% less water`)
      : (es ? `Usa ${pct(next.water.median, base.water.median)}% más agua` : `Uses ${pct(next.water.median, base.water.median)}% more water`),
    detail: wSame ? (es ? `Cerca del ${s(next.water.median)}% de tu agua` : `About ${s(next.water.median)}% of your water`)
      : (es ? `Pasa de usar el ${s(base.water.median)}% al ${s(next.water.median)}% de tu agua (cerca de ${about(Math.abs(dw), locale)} m³ ${dw < 0 ? "menos" : "más"} por hectárea al año)` : `From ${s(base.water.median)}% to ${s(next.water.median)}% of your water (about ${about(Math.abs(dw), locale)} m³ ${dw < 0 ? "less" : "more"} per hectare a year)`),
  });

  const di = next.income.median - base.income.median;
  const iSame = Math.abs(di) < Math.max(Math.abs(base.income.median) * 0.01, 50);
  out.push({
    key: "income", icon: BadgeDollarSign, label: es ? "Dinero" : "Money",
    tone: iSame ? "neutral" : di > 0 ? "good" : "bad",
    statement: iSame ? (es ? "Ganas casi lo mismo" : "You earn about the same")
      : di > 0 ? (es ? `Ganas cerca de S/ ${about(di, locale)} más por hectárea al año` : `You earn about S/ ${about(di, locale)} more per hectare a year`)
      : (es ? `Ganas cerca de S/ ${about(-di, locale)} menos por hectárea al año` : `You earn about S/ ${about(-di, locale)} less per hectare a year`),
    detail: es ? `De unos S/ ${about(base.income.median, locale)} a unos S/ ${about(next.income.median, locale)} al año (estimado)` : `From about S/ ${about(base.income.median, locale)} to about S/ ${about(next.income.median, locale)} a year (estimate)`,
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
    detail: es ? `En un año normal perderías cerca del ${r1}% de la cosecha, en vez del ${r0}%` : `In a normal year you would lose about ${r1}% of the harvest, instead of ${r0}%`,
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
