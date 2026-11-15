"use client";

import Link from "next/link";
import { ImpactSection, ImpactVisual } from "@/components/dashboard/impact";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  Check,
  ChevronDown,
  CloudRain,
  Droplets,
  Gauge,
  Leaf,
  MapPin,
  Orbit,
  Play,
  Satellite,
  ScanLine,
  ShieldCheck,
  Sparkles,
  SunMedium,
  TimerReset,
} from "lucide-react";
import { useLocale } from "@/components/i18n-provider";
import { useFarm } from "@/lib/farm-store";
import { simulate } from "@/lib/engine-client";
import type { RotationResult, SimulateResponse } from "@/lib/contract";


const FORMAT = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });

function Metric({ icon: Icon, label, value, note, tone }: { icon: typeof Droplets; label: string; value: string; note: string; tone: string }) {
  return (
    <article className={`qx-metric ${tone}`}>
      <div className="qx-metric-icon"><Icon size={18} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

export function DashboardClient() {
  const locale = useLocale();
  const es = locale === "es";
  const farm = useFarm();
  const [data, setData] = useState<SimulateResponse | null>(null);
  const [year, setYear] = useState(2020);
  const [stage, setStage] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let cancelled = false;
    simulate({ ...farm, locale }).then((result) => !cancelled && setData(result));
    return () => { cancelled = true; };
  }, [farm, locale]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        frame = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const results = useMemo(() => data?.rotations ?? [], [data]);
  const recommended = useMemo<RotationResult | null>(() => {
    const viable = results.filter((item) => item.viable);
    return [...(viable.length ? viable : results)].sort((a, b) => b.score - a.score)[0] ?? null;
  }, [results]);
  const current = results.find((item) => item.id === "actual") ?? results[0];
  const selectedYear = recommended?.byYear.find((item) => item.year === year);
  const waterDelta = current && recommended ? Math.max(0, Math.round(current.water.median - recommended.water.median)) : 0;
  const incomeDelta = current && recommended ? Math.round(recommended.income.median - current.income.median) : 0;
  const rotationName = farm.rotations.find((rotation) => rotation.id === recommended?.id)?.name ?? (es ? "Analizando escenarios" : "Analyzing scenarios");

  const stages = [
    {
      number: "01",
      title: es ? "Observar" : "Observe",
      kicker: es ? "Una parcela. 21 años." : "One field. 21 years.",
      body: es ? "Unificamos clima, relieve y vigor vegetal para revelar lo que una campaña aislada no puede mostrar." : "We combine climate, relief and plant vigor to reveal what one season alone cannot show.",
      icon: Satellite,
    },
    {
      number: "02",
      title: es ? "Simular" : "Simulate",
      kicker: es ? "Miles de futuros posibles." : "Thousands of possible futures.",
      body: es ? "Probamos rotaciones bajo la historia climática real de Majes y exponemos cada intercambio entre agua, ingreso y suelo." : "We test rotations against Majes' real climate history and expose every tradeoff between water, income and soil.",
      icon: TimerReset,
    },
    {
      number: "03",
      title: es ? "Decidir" : "Decide",
      kicker: es ? "Una recomendación explicable." : "One explainable recommendation.",
      body: es ? "La mejor alternativa aparece con evidencia, rango de riesgo y razones que puedes revisar antes de sembrar." : "The best alternative appears with evidence, a risk range and reasons you can review before planting.",
      icon: ShieldCheck,
    },
  ];
  const ActiveStageIcon = stages[stage].icon;

  return (
    <div className="qx-home">
      <section className="qx-hero">
        <div
          className="qx-hero-photo"
          style={{ transform: `translate3d(0, ${Math.min(scrollY * 0.16, 80)}px, 0) scale(1.08)` }}
          aria-hidden
        />
        <div className="qx-hero-grid" aria-hidden />
        <div className="qx-hero-glow" aria-hidden />

        <div className="qx-hero-topline">
          <span><i /> {es ? "INTELIGENCIA AGRÍCOLA SATELITAL" : "SATELLITE FARM INTELLIGENCE"}</span>
          <span>MAJES · AREQUIPA · PE</span>
        </div>

        <div className="qx-hero-layout">
          <div className="qx-hero-copy">
            <div className="qx-eyebrow"><Orbit size={17} /> QUASARIS FARM TWIN</div>
            <h1>
              {es ? <>El futuro de tu parcela, <em>antes de sembrar.</em></> : <>Your field&apos;s future, <em>before you plant.</em></>}
            </h1>
            <p>{es ? "Veintiún años de señales satelitales convertidos en una decisión agrícola clara, trazable y local." : "Twenty-one years of satellite signals transformed into a clear, traceable and local farming decision."}</p>
            <div className="qx-hero-actions">
              <Link href={`/${locale}/parcela`} className="qx-action-primary">
                <span>{es ? "Explorar mi parcela" : "Explore my field"}</span><ArrowUpRight size={19} />
              </Link>
              <button className="qx-action-ghost" onClick={() => document.getElementById("qx-story")?.scrollIntoView({ behavior: "smooth" })}>
                <Play size={15} fill="currentColor" /> {es ? "Ver cómo funciona" : "See how it works"}
              </button>
            </div>
            <div className="qx-trust-row">
              <div><Satellite size={16} /><span><b>NASA POWER</b><small>{es ? "Clima histórico" : "Historical climate"}</small></span></div>
              <div><ScanLine size={16} /><span><b>MODIS NDVI</b><small>{es ? "Vigor vegetal" : "Plant vigor"}</small></span></div>
              <div><Gauge size={16} /><span><b>SRTM</b><small>{es ? "Relieve" : "Terrain"}</small></span></div>
            </div>
          </div>

          {/* problemática → solución (components/dashboard/impact.tsx) */}
          <ImpactVisual locale={locale} />
        </div>

        <button className="qx-scroll-cue" onClick={() => document.getElementById("qx-story")?.scrollIntoView({ behavior: "smooth" })}>
          <span>{es ? "DESPLAZAR PARA EXPLORAR" : "SCROLL TO EXPLORE"}</span><ChevronDown size={17} />
        </button>
      </section>

      <section className="qx-proof-strip" aria-label={es ? "Cobertura de datos" : "Data coverage"}>
        <div><strong>21</strong><span>{es ? "años de memoria climática" : "years of climate memory"}</span></div>
        <div><strong>3</strong><span>{es ? "fuentes científicas conectadas" : "connected scientific sources"}</span></div>
        <div><strong>1</strong><span>{es ? "decisión explicada paso a paso" : "decision explained step by step"}</span></div>
        <div className="qx-proof-status"><i /> {es ? "Motor de simulación disponible" : "Simulation engine available"}</div>
      </section>

      <ImpactSection locale={locale} />

      <section className="qx-story" id="qx-story">
        <div className="qx-section-heading">
          <div>
            <span className="qx-kicker">{es ? "DEL ESPACIO AL SUELO" : "FROM SPACE TO SOIL"}</span>
            <h2>{es ? "Una decisión construida con evidencia." : "A decision built with evidence."}</h2>
          </div>
          <p>{es ? "No es otro tablero lleno de datos. Es una ruta visual que transforma señales complejas en una acción concreta." : "It is not another dashboard full of data. It is a visual path that transforms complex signals into a concrete action."}</p>
        </div>

        <div className="qx-story-shell">
          <div className="qx-stage-nav">
            {stages.map((item, index) => {
              const Icon = item.icon;
              return (
                <button key={item.number} className={stage === index ? "active" : ""} onClick={() => setStage(index)}>
                  <span>{item.number}</span><Icon size={19} /><b>{item.title}</b><ArrowRight size={17} />
                </button>
              );
            })}
          </div>

          <div className="qx-stage-visual" key={stage}>
            <div className="qx-stage-copy">
              <span className="qx-stage-number">{stages[stage].number}</span>
              <div className="qx-stage-icon"><ActiveStageIcon size={25} /></div>
              <h3>{stages[stage].kicker}</h3>
              <p>{stages[stage].body}</p>
              <Link href={stage === 0 ? `/${locale}/tiempo` : stage === 1 ? `/${locale}/comparar` : `/${locale}/parcela`}>
                {stage === 0 ? (es ? "Explorar la historia" : "Explore history") : stage === 1 ? (es ? "Comparar escenarios" : "Compare scenarios") : (es ? "Configurar mi parcela" : "Set up my field")}
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className={`qx-stage-art qx-stage-art-${stage}`}>
              <div className="qx-stage-orbit"><span /><span /><span /></div>
              <div className="qx-stage-land" />
              <div className="qx-stage-data qx-stage-data-one"><small>{stage === 0 ? "NDVI" : stage === 1 ? (es ? "ESCENARIOS" : "SCENARIOS") : "SCORE"}</small><strong>{stage === 0 ? "0.72" : stage === 1 ? "03" : recommended ? Math.round(recommended.score * 100) : "—"}</strong></div>
              <div className="qx-stage-data qx-stage-data-two"><small>{es ? "CONFIANZA" : "CONFIDENCE"}</small><strong>{recommended ? `${Math.round((1 - recommended.risk.median) * 100)}%` : "—"}</strong></div>
              <div className="qx-stage-sweep" />
            </div>
          </div>
        </div>
      </section>

      <section className="qx-decision">
        <div className="qx-decision-ambient" aria-hidden />
        <div className="qx-decision-heading">
          <div>
            <span className="qx-kicker"><Sparkles size={14} /> {es ? "DECISIÓN SUGERIDA" : "SUGGESTED DECISION"}</span>
            <h2>{rotationName}</h2>
          </div>
          <div className="qx-score-ring" style={{ "--score": `${recommended ? Math.round(recommended.score * 100) : 0}%` } as React.CSSProperties}>
            <span><strong>{recommended ? Math.round(recommended.score * 100) : "—"}</strong><small>/100</small></span>
          </div>
        </div>

        <div className="qx-decision-grid">
          <div className="qx-metrics">
            <Metric icon={Droplets} label={es ? "Agua estimada" : "Estimated water"} value={recommended ? `${FORMAT.format(recommended.water.median)} m³/ha` : "—"} note={waterDelta ? `${FORMAT.format(waterDelta)} ${es ? "menos vs. actual" : "less vs. current"}` : (es ? "Calculando" : "Calculating")} tone="water" />
            <Metric icon={BadgeDollarSign} label={es ? "Ingreso estimado" : "Estimated income"} value={recommended ? `S/ ${FORMAT.format(recommended.income.median)}` : "—"} note={incomeDelta >= 0 ? `+S/ ${FORMAT.format(incomeDelta)} ${es ? "vs. actual" : "vs. current"}` : (es ? "Prioriza estabilidad" : "Prioritizes stability")} tone="income" />
            <Metric icon={Leaf} label={es ? "Salud de suelo" : "Soil health"} value={recommended ? `${Math.round(recommended.soil * 100)}/100` : "—"} note={es ? "Cobertura + diversidad" : "Cover + diversity"} tone="soil" />
            <Metric icon={SunMedium} label={es ? "Riesgo climático" : "Climate risk"} value={recommended ? `${Math.round(recommended.risk.median * 100)}%` : "—"} note={es ? "Rango interanual visible" : "Visible yearly range"} tone="risk" />
          </div>

          <div className="qx-time-console">
            <div className="qx-console-head"><span><TimerReset size={16} /> {es ? "MÁQUINA DEL TIEMPO" : "TIME MACHINE"}</span><strong>{year}</strong></div>
            <div className="qx-year-line">
              {(recommended?.byYear ?? []).map((item) => <i key={item.year} className={item.year === year ? "active" : ""} style={{ height: `${22 + Math.min(54, item.frostDays * 2 + (item.waterM3ha % 36))}%` }} />)}
            </div>
            <input aria-label={es ? "Año de simulación" : "Simulation year"} type="range" min={2005} max={2025} value={year} onChange={(event) => setYear(Number(event.target.value))} />
            <div className="qx-console-result">
              <div><CloudRain size={18} /><span><small>{es ? "NECESIDAD HÍDRICA" : "WATER NEED"}</small><strong>{selectedYear ? `${FORMAT.format(selectedYear.waterM3ha)} m³/ha` : "—"}</strong></span></div>
              <div><SunMedium size={18} /><span><small>{es ? "DÍAS DE HELADA" : "FROST DAYS"}</small><strong>{selectedYear?.frostDays ?? "—"}</strong></span></div>
            </div>
            <p><Check size={15} /> {es ? "Explicación basada en el motor de simulación, no generada al azar." : "Explanation comes from the simulation engine, not random generation."}</p>
          </div>
        </div>

        <div className="qx-decision-cta">
          <p>{es ? "Revisa la evidencia, ajusta tus prioridades y compara cada escenario antes de comprometer una campaña." : "Review the evidence, adjust your priorities and compare every scenario before committing a season."}</p>
          <Link href={`/${locale}/comparar`}><span>{es ? "Abrir laboratorio de escenarios" : "Open scenario lab"}</span><ArrowRight size={19} /></Link>
        </div>
      </section>

      <section className="qx-final-cta">
        <div className="qx-final-photo" aria-hidden />
        <div className="qx-final-copy">
          <span className="qx-kicker"><MapPin size={14} /> {es ? "TU PARCELA ES EL PUNTO DE PARTIDA" : "YOUR FIELD IS THE STARTING POINT"}</span>
          <h2>{es ? "Haz visible lo que viene." : "Make what comes next visible."}</h2>
          <p>{es ? "Ubica tu parcela, define tus prioridades y deja que 21 años de evidencia trabajen a tu favor." : "Locate your field, define your priorities and let 21 years of evidence work in your favor."}</p>
          <Link href={`/${locale}/parcela`} className="qx-action-primary"><span>{es ? "Crear mi simulación" : "Create my simulation"}</span><ArrowUpRight size={19} /></Link>
        </div>
        <div className="qx-final-orbit" aria-hidden><Orbit size={160} /></div>
      </section>
    </div>
  );
}
