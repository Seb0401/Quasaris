"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import { MonthStrip } from "@/components/cards/rotation-card";
import { MapLegend } from "@/components/map/layer-controls";
import { MonthLegend, YearStrip } from "@/components/timemachine/year-strip";
import { setFarm, useFarm } from "@/lib/farm-store";
import { useSimulation } from "@/lib/use-simulation";
import { GIBS_LAYERS, layerTime } from "@/lib/gibs";
import type { RotationResult } from "@/lib/contract";

const ParcelMap = dynamic(() => import("@/components/map/parcel-map"), {
  ssr: false,
  loading: () => <div className="h-[38vh] min-h-60 w-full rounded-2xl bg-border animate-pulse" />,
});

const STEP_MS = 700; // 21 años ≈ 15 s: pensado para el video de 30 s

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function TiempoClient() {
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const data = useSimulation();
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const signed = new Intl.NumberFormat(locale, { maximumFractionDigits: 0, signDisplay: "exceptZero" });

  const years = useMemo(() => data?.rotations[0]?.byYear.map((y) => y.year) ?? [], [data]);
  const [year, setYear] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [month, setMonth] = useState(9);
  const [stripId, setStripId] = useState<string | null>(null);

  const current = year ?? years.at(-1) ?? 2025;

  // Reproducción: avanza un año cada STEP_MS y se detiene en el último.
  useEffect(() => {
    if (!playing || years.length === 0) return;
    const id = setInterval(() => {
      setYear((y) => {
        const i = years.indexOf(y ?? years[0]);
        if (i < 0 || i >= years.length - 1) {
          setPlaying(false);
          return years.at(-1)!;
        }
        return years[i + 1];
      });
    }, STEP_MS);
    return () => clearInterval(id);
  }, [playing, years]);

  if (!data || years.length === 0) {
    return <p className="py-12 text-center text-muted animate-pulse">🛰️ {t("comparar.loading")}</p>;
  }

  const results = farm.rotations.flatMap((rot) => {
    const r = data.rotations.find((x) => x.id === rot.id);
    return r ? [{ rot, r }] : [];
  });
  const strip = results.find((x) => x.rot.id === stripId) ?? results[0];
  const highlights = results.flatMap(({ rot, r }) => r.highlights.filter((h) => h.year === current).map((h) => ({ rot, h })));
  const allHighlightYears = [...new Set(data.rotations.flatMap((r) => r.highlights.map((h) => h.year)))].sort();
  const ndviTime = layerTime(GIBS_LAYERS.ndviMonthly, current, month);
  const monthNames = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(2025, i, 1)));

  const play = () => {
    if (current === years.at(-1)) setYear(years[0]);
    setPlaying((p) => !p);
  };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">🕰️ {t("tiempo.title")}</h1>
        <p className="text-sm text-muted">{t("tiempo.subtitle")}</p>
      </header>

      {data.source.power === "mock" && (
        <p className="rounded-lg border border-warn bg-warn/10 px-3 py-2 text-sm">🧪 {t("comparar.mockWarning")}</p>
      )}

      {/* Controles de año: pegajosos para que sigan a mano mientras se baja por las tarjetas */}
      <section className="sticky top-14 z-[900] -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b border-border flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={play}
            aria-label={playing ? t("tiempo.pause") : t("tiempo.play")}
            className="shrink-0 rounded-full bg-brand text-brand-ink px-4 py-2 font-semibold"
          >
            {playing ? `⏸ ${t("tiempo.pause")}` : `▶ ${t("tiempo.play")}`}
          </button>
          <span className="text-4xl font-bold tabular-nums leading-none" aria-live="polite">
            {current}
          </span>
        </div>
        <input
          type="range"
          min={years[0]}
          max={years.at(-1)}
          step={1}
          value={current}
          aria-label={t("tiempo.year")}
          onChange={(e) => {
            setPlaying(false);
            setYear(Number(e.target.value));
          }}
          className="w-full"
        />
        <div className="flex justify-between text-[11px] text-muted tabular-nums">
          <span>{years[0]}</span>
          {allHighlightYears.length > 0 && (
            <span className="flex gap-2">
              {allHighlightYears.map((y) => (
                <button key={y} type="button" onClick={() => (setPlaying(false), setYear(y))} className="font-semibold text-danger underline">
                  ⚠️ {y}
                </button>
              ))}
            </span>
          )}
          <span>{years.at(-1)}</span>
        </div>
      </section>

      {highlights.map(({ rot, h }) => (
        <p key={rot.id + h.key} className="rounded-lg bg-warn/15 px-3 py-2 text-sm">
          🕰️ <span className="font-semibold">{rot.name}:</span>{" "}
          {t(`explain.${h.key}`, { year: h.year, ...Object.fromEntries(Object.entries(h.params).map(([k, v]) => [k, n.format(v)])) })}
        </p>
      ))}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">🛰️ {t("tiempo.mapTitle", { year: current })}</h2>
          <select
            aria-label={t("tiempo.month")}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-sm capitalize"
          >
            {monthNames.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <ParcelMap lat={farm.lat} lon={farm.lon} onPick={(lat, lon) => setFarm({ lat, lon })} layer="ndviMonthly" time={ndviTime} className="h-[38vh] min-h-60 w-full rounded-2xl z-0" />
        <MapLegend layer="ndviMonthly" time={ndviTime} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">{t("tiempo.cardsTitle", { year: current })}</h2>
        {results.map(({ rot, r }) => (
          <YearCard key={rot.id} name={rot.name} isCurrent={rot.isCurrent} result={r} year={current} waterAvailable={farm.waterAvailableM3ha} n={n} signed={signed} />
        ))}
        <MonthLegend />
      </section>

      {strip && (
        <section className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold">🧮 {t("tiempo.stripTitle")}</h2>
            <p className="text-xs text-muted">{t("tiempo.stripHint")}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {results.map(({ rot }) => (
              <button
                key={rot.id}
                type="button"
                onClick={() => setStripId(rot.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${rot.id === strip.rot.id ? "border-brand bg-brand text-brand-ink" : "border-border"}`}
              >
                {rot.name}
              </button>
            ))}
          </div>
          <YearStrip byYear={strip.r.byYear} selected={current} waterAvailable={farm.waterAvailableM3ha} onSelect={(y) => (setPlaying(false), setYear(y))} />
          <MonthLegend />
        </section>
      )}
    </div>
  );
}

function YearCard({
  name,
  isCurrent,
  result,
  year,
  waterAvailable,
  n,
  signed,
}: {
  name: string;
  isCurrent: boolean;
  result: RotationResult;
  year: number;
  waterAvailable: number;
  n: Intl.NumberFormat;
  signed: Intl.NumberFormat;
}) {
  const t = useT();
  const y = result.byYear.find((b) => b.year === year);
  if (!y) return null;
  const waterMed = median(result.byYear.map((b) => b.waterM3ha));
  const incomeMed = median(result.byYear.map((b) => b.incomePEN));
  const dWater = y.waterM3ha - waterMed;
  const dIncome = y.incomePEN - incomeMed;
  const over = y.waterM3ha > waterAvailable;

  return (
    <article className={`rounded-2xl border bg-surface p-4 flex flex-col gap-3 ${over ? "border-danger" : "border-border"}`}>
      <header className="flex items-start justify-between gap-2">
        <div>
          {isCurrent && <span className="inline-block rounded-full bg-soil/15 text-soil text-xs font-semibold px-2 py-0.5 mb-1">{t("comparar.current")}</span>}
          <h3 className="font-semibold leading-tight">{name}</h3>
        </div>
        {over && <span className="shrink-0 rounded-full bg-danger/10 text-danger text-xs font-semibold px-2 py-1">💧 {t("tiempo.overWater")}</span>}
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <Stat label={`💧 ${t("comparar.water")} (m³/ha)`} value={n.format(y.waterM3ha)} delta={`${signed.format(dWater)} ${t("tiempo.vsNormal")}`} bad={dWater > 0} />
        <Stat label={`💰 ${t("comparar.income")} (S/ /ha)`} value={n.format(y.incomePEN)} delta={`${signed.format(dIncome)} ${t("tiempo.vsNormal")}`} bad={dIncome < 0} />
        <Stat label={`❄️ ${t("tiempo.frostDays")}`} value={String(y.frostDays)} bad={y.frostDays > 0} />
        <Stat label={`🔥 ${t("tiempo.heatDays")}`} value={String(y.heatDays)} bad={y.heatDays > 0} />
      </div>
      <MonthStrip months={y.months} labels />
    </article>
  );
}

function Stat({ label, value, delta, bad }: { label: string; value: string; delta?: string; bad?: boolean }) {
  return (
    <div className="rounded-xl bg-background p-2.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {delta && <div className={`text-[11px] tabular-nums ${bad ? "text-danger" : "text-ok"}`}>{delta}</div>}
    </div>
  );
}
