"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import { MonthStrip } from "@/components/cards/rotation-card";
import { HistoryGrid, StatusLegend } from "@/components/timemachine/history-grid";
import { YearChart, type Series } from "@/components/timemachine/water-chart";
import { setFarm, useFarm } from "@/lib/farm-store";
import { useSimulation } from "@/lib/use-simulation";
import { BadgeDollarSign, Clock3, Droplets, Flame, LoaderCircle, Pause, Play, Satellite, Snowflake } from "lucide-react";

const ParcelMap = dynamic(() => import("@/components/map/parcel-map"), {
  ssr: false,
  loading: () => <div className="h-56 w-full rounded-2xl bg-border animate-pulse" />,
});

const COLORS = ["var(--soil)", "var(--brand)", "var(--sky)", "var(--warn)", "var(--danger)"];
const PLAY_MS = 700;

/** NDVI mensual de GIBS: hay un hueco en abril de 2025. */
function ndviDate(year: number, month: number) {
  const m = year === 2025 && month === 4 ? 5 : month;
  return `${year}-${String(m).padStart(2, "0")}-01`;
}

export function TiempoClient() {
  const t = useT();
  const locale = useLocale();
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
      if (i >= years.length - 1) {
        setPlaying(false);
      } else {
        setYear(years[i + 1]);
      }
    }, PLAY_MS);
    return () => clearInterval(id);
  }, [playing, years]);

  if (!data) return <p className="flex items-center justify-center gap-2 py-12 text-center text-muted"><LoaderCircle className="animate-spin" size={19} />{t("comparar.loading")}</p>;

  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const rotations = farm.rotations
    .map((rot, i) => ({ rot, res: data.rotations.find((r) => r.id === rot.id), color: COLORS[i % COLORS.length] }))
    .filter((x): x is typeof x & { res: NonNullable<typeof x.res> } => Boolean(x.res));

  const series: Series[] = rotations.map(({ rot, res, color }) => ({
    id: rot.id,
    name: rot.name,
    color,
    byYear: res.byYear.map((y) => ({ year: y.year, value: metric === "water" ? y.waterM3ha : y.incomePEN })),
  }));

  const events = rotations.flatMap(({ rot, res }) => res.highlights.filter((h) => h.year === current).map((h) => ({ rot, h })));
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "short" });

  const play = () => {
    if (!playing && current === years[years.length - 1]) setYear(years[0]);
    setPlaying((p) => !p);
  };

  return (
    <div className="time-workspace flex flex-col gap-5">
      <header className="section-hero"><div>
        <span className="panel-kicker"><Clock3 size={16} /> QUASARIS / 2005—2025</span><h1>{t("tiempo.title")}</h1>
        <p>{t("tiempo.subtitle")}</p></div>
      </header>

      {/* Control de año */}
      <section className="time-controls flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={play}
          aria-label={playing ? t("tiempo.pause") : t("tiempo.play")}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-xl text-brand-ink"
        >
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="flex flex-1 flex-col">
          <input
            type="range"
            min={years[0]}
            max={years[years.length - 1]}
            step={1}
            value={current}
            onChange={(e) => {
              setPlaying(false);
              setYear(Number(e.target.value));
            }}
            aria-label={t("tiempo.year")}
            className="w-full"
          />
          <div className="flex justify-between text-[11px] text-muted">
            <span>{years[0]}</span>
            <span>{years[years.length - 1]}</span>
          </div>
        </div>
        <output className="w-16 text-right text-3xl font-bold tabular-nums">{current}</output>
      </section>

      {/* Eventos del año */}
      {events.length > 0 && (
        <section className="flex flex-col gap-2">
          {events.map(({ rot, h }) => (
            <p key={rot.id + h.key} className="rounded-xl bg-warn/15 px-3 py-2 text-sm">
              <span className="font-semibold">{rot.name}:</span>{" "}
              {t(`explain.${h.key}`, { year: h.year, ...Object.fromEntries(Object.entries(h.params).map(([k, v]) => [k, n.format(v)])) })}
            </p>
          ))}
        </section>
      )}

      {/* Rotaciones en el año elegido */}
      <section className="grid gap-3">
        {rotations.map(({ rot, res, color }) => {
          const y = res.byYear.find((b) => b.year === current);
          if (!y) return null;
          const over = y.waterM3ha > farm.waterAvailableM3ha;
          const pct = Math.min(100, (y.waterM3ha / Math.max(farm.waterAvailableM3ha, 1)) * 100);
          return (
            <article key={rot.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="truncate font-semibold" style={{ color }}>
                  {rot.name}
                </h2>
                <span className="flex shrink-0 items-center gap-1 text-sm tabular-nums"><BadgeDollarSign size={15} /> S/ {n.format(y.incomePEN)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1"><Droplets size={14} /> {n.format(y.waterM3ha)} m³/ha</span>
                  <span className={over ? "font-semibold text-danger" : "text-muted"}>
                    {over ? `+${n.format(y.waterM3ha - farm.waterAvailableM3ha)} ${t("tiempo.overLimit")}` : t("tiempo.withinLimit")}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                  <div className={`h-full rounded-full ${over ? "bg-danger" : "bg-sky"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <MonthStrip months={y.months} labels />
              {(y.frostDays > 0 || y.heatDays > 0) && (
                <p className="text-xs text-muted">
                  <Snowflake size={14} className="inline" /> {y.frostDays} · <Flame size={14} className="inline" /> {y.heatDays} {t("tiempo.stressDays")}
                </p>
              )}
            </article>
          );
        })}
      </section>

      {/* Gráfico por año */}
      <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{metric === "water" ? t("tiempo.waterChart") : t("tiempo.incomeChart")}</h2>
          <div className="flex rounded-full border border-border p-0.5 text-xs">
            {(["water", "income"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMetric(m)} className={`rounded-full px-3 py-1 ${metric === m ? "bg-brand text-brand-ink" : ""}`}>
                {m === "water" ? <Droplets size={14} className="inline" /> : <BadgeDollarSign size={14} className="inline" />} {t(`comparar.${m}`)}
              </button>
            ))}
          </div>
        </div>
        <YearChart
          series={series}
          year={current}
          limit={metric === "water" ? farm.waterAvailableM3ha : undefined}
          unit={metric === "water" ? "m³/ha" : "S/ /ha"}
          onPickYear={(y) => {
            setPlaying(false);
            setYear(y);
          }}
        />
        <div className="flex flex-wrap gap-3 text-xs">
          {series.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1">
              <span className="inline-block h-1 w-4 rounded" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </section>

      {/* Tira de 20 años */}
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3">
        <div>
          <h2 className="font-semibold">{t("tiempo.stripTitle")}</h2>
          <p className="text-xs text-muted">{t("tiempo.stripHint")}</p>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${rotations.length}, minmax(0, 1fr))` }}>
          {rotations.map(({ rot, res, color }) => (
            <HistoryGrid
              key={rot.id}
              name={rot.name}
              color={color}
              byYear={res.byYear}
              year={current}
              onPickYear={(y) => {
                setPlaying(false);
                setYear(y);
              }}
            />
          ))}
        </div>
        <StatusLegend />
      </section>

      {/* Mapa NDVI en el año elegido */}
      <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
        <div>
          <h2 className="font-semibold">
            <Satellite size={17} className="inline" /> {t("tiempo.ndviTitle")} · {fmtMonth.format(new Date(current, month - 1, 1))} {current}
          </h2>
          <p className="text-xs text-muted">{t("tiempo.ndviHint")}</p>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonth(m)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs capitalize ${m === month ? "border-brand bg-brand text-brand-ink" : "border-border"}`}
            >
              {fmtMonth.format(new Date(2025, m - 1, 1))}
            </button>
          ))}
        </div>
        <ParcelMap className="h-64" lat={farm.lat} lon={farm.lon} onPick={(lat, lon) => setFarm({ lat, lon })} ndviTime={ndviDate(current, month)} />
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span>{t("tiempo.ndviLow")}</span>
          <span className="h-2 flex-1 rounded-full" style={{ background: "linear-gradient(90deg,#a67c52,#e8d98a,#7fbf5f,#1f6b2a)" }} />
          <span>{t("tiempo.ndviHigh")}</span>
        </div>
      </section>
    </div>
  );
}
