"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import { MonthLegend, MonthStrip } from "@/components/cards/rotation-card";
import { HistoryGrid } from "@/components/timemachine/history-grid";
import { YearChart, type Series } from "@/components/timemachine/water-chart";
import { Badge, CountUp, HeroStat, LoadingOrbit, Meter, PageHeader, Panel, Segmented } from "@/components/ui/kit";
import { Reveal } from "@/components/motion/reveal";
import { moveFarm, useFarm } from "@/lib/farm-store";
import { useSimulation } from "@/lib/use-simulation";
import { rotationColor } from "@/lib/ui";
import { BadgeDollarSign, CalendarRange, Clock3, Droplets, Flame, History, LineChart, Pause, Play, Satellite, SkipBack, Snowflake, TriangleAlert } from "lucide-react";

const ParcelMap = dynamic(() => import("@/components/map/parcel-map"), {
  ssr: false,
  loading: () => <div className="map-skeleton ui-skeleton" />,
});

const PLAY_MS = 750;

/** NDVI mensual de GIBS: hay un hueco en abril de 2025. */
function ndviDate(year: number, month: number) {
  const m = year === 2025 && month === 4 ? 5 : month;
  return `${year}-${String(m).padStart(2, "0")}-01`;
}

export function TiempoClient() {
  const t = useT();
  const locale = useLocale();
  const es = locale === "es";
  const farm = useFarm();
  const data = useSimulation();
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState(10);
  const [playing, setPlaying] = useState(false);
  const [metric, setMetric] = useState<"water" | "income">("water");

  const years = useMemo(() => data?.rotations[0]?.byYear.map((y) => y.year) ?? [], [data]);
  const current = year ?? years[years.length - 1] ?? 2025;

  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    if (!playing || years.length === 0) return;
    const id = setInterval(() => {
      const i = years.indexOf(currentRef.current);
      if (i >= years.length - 1) setPlaying(false);
      else setYear(years[i + 1]);
    }, PLAY_MS);
    return () => clearInterval(id);
  }, [playing, years]);

  if (!data) return <div className="ui-page"><LoadingOrbit label={t("comparar.loading")} /></div>;

  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const rotations = farm.rotations
    .map((rot, i) => ({ rot, res: data.rotations.find((r) => r.id === rot.id), color: rotationColor(i) }))
    .filter((x): x is typeof x & { res: NonNullable<typeof x.res> } => Boolean(x.res));

  const series: Series[] = rotations.map(({ rot, res, color }) => ({
    id: rot.id,
    name: rot.name,
    color,
    byYear: res.byYear.map((y) => ({ year: y.year, value: metric === "water" ? y.waterM3ha : y.incomePEN })),
  }));

  // meses con problemas por año, promediando las rotaciones (alto = año difícil)
  const trouble = years.map((y) => {
    const counts = rotations.map(({ res }) => res.byYear.find((b) => b.year === y)?.months.filter((m) => m === "water_stress" || m === "climate_risk").length ?? 0);
    return counts.reduce((a, b) => a + b, 0) / Math.max(counts.length, 1);
  });
  const maxTrouble = Math.max(1, ...trouble);
  const minTrouble = Math.min(...trouble);
  const level = (v: number) => (maxTrouble - minTrouble < 0.01 ? 0.5 : (v - minTrouble) / (maxTrouble - minTrouble));
  const levelColor = (l: number) => (l > 0.66 ? "#ff6b6b" : l > 0.33 ? "#f6b94c" : "#4fd39a");
  const currentTrouble = trouble[years.indexOf(current)] ?? 0;
  const hardestYear = years[trouble.indexOf(Math.max(...trouble))];

  const events = rotations.flatMap(({ rot, res, color }) => res.highlights.filter((h) => h.year === current).map((h) => ({ rot, h, color })));
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "short" });

  const pick = (y: number) => {
    setPlaying(false);
    setYear(y);
  };
  const play = () => {
    if (!playing && current === years[years.length - 1]) setYear(years[0]);
    setPlaying((p) => !p);
  };

  return (
    <div className="ui-page">
      <PageHeader icon={Clock3} kicker={`${years[0]}—${years[years.length - 1]}`} title={t("tiempo.title")} subtitle={t("tiempo.subtitle")}>
        <HeroStat icon={CalendarRange} label={es ? "AÑOS SIMULADOS" : "SIMULATED YEARS"}>{years.length}</HeroStat>
        <HeroStat icon={TriangleAlert} label={es ? "AÑO MÁS DIFÍCIL" : "HARDEST YEAR"} tone="amber">{hardestYear}</HeroStat>
      </PageHeader>

      {/* consola de tiempo */}
      <section className="time-console">
        <div className="time-console-buttons">
          <button type="button" className="time-btn" onClick={() => pick(years[0])} aria-label={es ? "Ir al inicio" : "Go to start"}><SkipBack size={17} /></button>
          <button type="button" className={`time-play ${playing ? "is-playing" : ""}`} onClick={play} aria-label={playing ? t("tiempo.pause") : t("tiempo.play")}>
            {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </button>
        </div>
        <div className="time-console-track">
          <div className="year-bars" role="list" aria-label={es ? "Meses con problemas por año" : "Troubled months per year"}>
            {years.map((y, i) => (
              <button
                key={y}
                type="button"
                role="listitem"
                className={`${y === current ? "active" : ""} ${y < current ? "past" : ""}`}
                style={{ height: `${16 + level(trouble[i]) * 84}%`, "--bar": levelColor(level(trouble[i])), animationDelay: `${i * 30}ms` } as React.CSSProperties}
                onClick={() => pick(y)}
                title={`${y} · ${trouble[i].toFixed(1)} ${es ? "meses con problemas" : "troubled months"}`}
                aria-label={`${y}`}
              />
            ))}
          </div>
          <input type="range" className="ui-range time-range" min={years[0]} max={years[years.length - 1]} step={1} value={current} onChange={(e) => pick(Number(e.target.value))} aria-label={t("tiempo.year")} style={{ "--fill": `${((current - years[0]) / Math.max(years[years.length - 1] - years[0], 1)) * 100}%` } as React.CSSProperties} />
          <div className="time-console-scale"><span>{years[0]}</span><span>{es ? "Barras más altas y rojas = años con más meses de estrés por agua o clima" : "Taller, redder bars = years with more months of water or climate stress"}</span><span>{years[years.length - 1]}</span></div>
        </div>
        <div className="time-console-year">
          <small>{t("tiempo.year")}</small>
          <output key={current}>{current}</output>
          <span className={level(currentTrouble) > 0.66 ? "is-bad" : level(currentTrouble) <= 0.33 ? "is-good" : ""}>
            {level(currentTrouble) > 0.66 ? (es ? "Año difícil" : "Hard year") : level(currentTrouble) <= 0.33 ? (es ? "Año tranquilo" : "Calm year") : (es ? "Año normal" : "Normal year")}
          </span>
        </div>
      </section>

      {events.length > 0 && (
        <div className="event-list" key={`ev-${current}`}>
          {events.map(({ rot, h, color }) => (
            <p key={rot.id + h.key} className="event-item" style={{ "--accent": color } as React.CSSProperties}>
              <TriangleAlert size={16} />
              <span><b>{rot.name}:</b> {t(`explain.${h.key}`, { year: h.year, ...Object.fromEntries(Object.entries(h.params).map(([k, v]) => [k, n.format(v)])) })}</span>
            </p>
          ))}
        </div>
      )}

      {/* rotaciones en el año elegido */}
      <div className="year-cards">
        {rotations.map(({ rot, res, color }) => {
          const y = res.byYear.find((b) => b.year === current);
          if (!y) return null;
          const over = y.waterM3ha > farm.waterAvailableM3ha;
          const ratio = y.waterM3ha / Math.max(farm.waterAvailableM3ha, 1);
          return (
            <article key={rot.id} className="year-card" style={{ "--accent": color } as React.CSSProperties}>
              <header>
                <h3><i style={{ background: color }} />{rot.name}</h3>
                {over ? <Badge tone="danger">{es ? "Falta agua" : "Short on water"}</Badge> : <Badge tone="ok">{t("tiempo.withinLimit")}</Badge>}
              </header>
              <div className="year-card-stats">
                <div><small><BadgeDollarSign size={13} />{t("comparar.income")}</small><strong><CountUp value={y.incomePEN} format={(v) => `S/ ${n.format(v)}`} duration={600} /></strong></div>
                <div><small><Droplets size={13} />{t("comparar.water")}</small><strong><CountUp value={y.waterM3ha} format={(v) => `${n.format(v)} m³`} duration={600} /></strong></div>
              </div>
              <div className="year-card-water">
                <Meter value={Math.min(1, ratio / 1.4)} marker={1 / 1.4} color={over ? "var(--danger)" : "#5cc8f5"} height={8} />
                <small className={over ? "is-bad" : ""}>{over ? `+${n.format(y.waterM3ha - farm.waterAvailableM3ha)} ${t("tiempo.overLimit")}` : `${Math.round(ratio * 100)}% ${es ? "de tu agua disponible" : "of your available water"}`}</small>
              </div>
              <MonthStrip months={y.months} labels />
              <div className="year-card-foot">
                <span className={y.frostDays > 0 ? "is-cold" : ""}><Snowflake size={13} />{y.frostDays} {es ? "días de helada" : "frost days"}</span>
                <span className={y.heatDays > 0 ? "is-hot" : ""}><Flame size={13} />{y.heatDays} {es ? "días de calor" : "heat days"}</span>
              </div>
            </article>
          );
        })}
      </div>
      <MonthLegend />

      <div className="time-grid">
        <Reveal>
          <Panel
            kicker={es ? "TENDENCIA" : "TREND"}
            icon={LineChart}
            title={metric === "water" ? t("tiempo.waterChart") : t("tiempo.incomeChart")}
            actions={<Segmented size="sm" value={metric} onChange={setMetric} options={[{ value: "water", label: t("comparar.water"), icon: Droplets }, { value: "income", label: t("comparar.income"), icon: BadgeDollarSign }]} />}
          >
            <p className="ui-hint">{metric === "water" ? (es ? "Si una línea pasa la franja roja punteada, ese año no te habría alcanzado el agua. Toca el gráfico para viajar a ese año." : "If a line crosses the dashed red band, your water would not have been enough that year. Tap the chart to travel to that year.") : (es ? "Las caídas muestran años en que el clima redujo la cosecha. Toca el gráfico para viajar a ese año." : "Dips show years when climate cut the harvest. Tap the chart to travel to that year.")}</p>
            <YearChart series={series} year={current} limit={metric === "water" ? farm.waterAvailableM3ha : undefined} unit={metric === "water" ? "m³/ha" : "S/ /ha"} onPickYear={pick} />
            <div className="duel-legend">{series.map((s) => <span key={s.id}><i style={{ background: s.color }} />{s.name}</span>)}</div>
          </Panel>
        </Reveal>

        <Reveal delay={100}>
          <Panel kicker={es ? "21 AÑOS × 12 MESES" : "21 YEARS × 12 MONTHS"} icon={History} title={t("tiempo.stripTitle")}>
            <p className="ui-hint">{t("tiempo.stripHint")}</p>
            <div className="history-grids" style={{ gridTemplateColumns: `repeat(${rotations.length}, minmax(0, 1fr))` }}>
              {rotations.map(({ rot, res, color }) => <HistoryGrid key={rot.id} name={rot.name} color={color} byYear={res.byYear} year={current} onPickYear={pick} />)}
            </div>
          </Panel>
        </Reveal>
      </div>

      <Reveal>
        <Panel
          kicker="NASA MODIS · NDVI"
          icon={Satellite}
          title={<>{t("tiempo.ndviTitle")} · <span className="capitalize text-[var(--brand)]">{fmtMonth.format(new Date(current, month - 1, 1))} {current}</span></>}
        >
          <p className="ui-hint">{t("tiempo.ndviHint")}</p>
          <div className="month-chips">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <button key={m} type="button" onClick={() => setMonth(m)} className={m === month ? "active" : ""}>{fmtMonth.format(new Date(2025, m - 1, 1))}</button>
            ))}
          </div>
          <ParcelMap compact lat={farm.lat} lon={farm.lon} onPick={moveFarm} ndviTime={ndviDate(current, month)} />
        </Panel>
      </Reveal>
    </div>
  );
}
