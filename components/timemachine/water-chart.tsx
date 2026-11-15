"use client";

import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocale, useT } from "@/components/i18n-provider";

export type Series = { id: string; name: string; color: string; byYear: { year: number; value: number }[] };

type TipProps = { active?: boolean; label?: number | string; payload?: { dataKey?: string | number; value?: number | string }[]; series: Series[]; unit: string; locale: string };

function ChartTip({ active, label, payload, series, unit, locale }: TipProps) {
  if (!active || !payload?.length) return null;
  const full = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  return (
    <div className="chart-tip">
      <b>{label}</b>
      {payload.map((p) => {
        const s = series.find((x) => x.id === p.dataKey);
        return s ? <span key={s.id}><i style={{ background: s.color }} />{s.name}<em>{full.format(Number(p.value))} {unit}</em></span> : null;
      })}
    </div>
  );
}

/** Agua (o ingreso) por año para cada rotación, con el año elegido y el límite de agua marcados. */
export function YearChart({ series, year, limit, unit, onPickYear }: { series: Series[]; year: number; limit?: number; unit: string; onPickYear: (y: number) => void }) {
  const t = useT();
  const locale = useLocale();
  const n = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const years = series[0]?.byYear.map((p) => p.year) ?? [];
  const rows = years.map((y, i) => Object.fromEntries([["year", y], ...series.map((s) => [s.id, s.byYear[i]?.value])]));
  const values = series.flatMap((s) => s.byYear.map((p) => p.value));
  const top = Math.max(...values, limit ?? 0);

  return (
    <div className="year-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: 14, right: 12, bottom: 0, left: -6 }}
          onClick={(e) => {
            const y = Number(e?.activeLabel);
            if (Number.isFinite(y)) onPickYear(y);
          }}
        >
          <defs>
            {series.map((s) => (
              <linearGradient key={s.id} id={`grad-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="var(--tint-3)" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--muted)" }} interval={3} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={(v) => n.format(v)} width={46} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
          <Tooltip content={<ChartTip series={series} unit={unit} locale={locale} />} cursor={{ stroke: "rgba(185,255,99,.35)", strokeWidth: 1 }} />
          {limit !== undefined && <ReferenceArea y1={limit} y2={top * 1.06} fill="var(--danger)" fillOpacity={0.07} ifOverflow="extendDomain" />}
          {limit !== undefined && (
            <ReferenceLine y={limit} stroke="var(--danger)" strokeDasharray="6 4" label={{ value: t("tiempo.available"), position: "insideTopLeft", fontSize: 11, fill: "var(--danger)" }} />
          )}
          <ReferenceLine x={year} stroke="var(--brand)" strokeOpacity={0.8} strokeWidth={1.5} label={{ value: String(year), position: "top", fontSize: 11, fill: "var(--brand)", fontWeight: 700 }} />
          {series.map((s) => (
            <Area key={`area-${s.id}`} type="monotone" dataKey={s.id} stroke="none" fill={`url(#grad-${s.id})`} isAnimationActive animationDuration={1100} legendType="none" tooltipType="none" activeDot={false} />
          ))}
          {series.map((s) => (
            <Line key={s.id} type="monotone" dataKey={s.id} stroke={s.color} strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive animationDuration={1300} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
