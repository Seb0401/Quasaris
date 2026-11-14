"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocale, useT } from "@/components/i18n-provider";

export type Series = { id: string; name: string; color: string; byYear: { year: number; value: number }[] };

/** Agua (o ingreso) por año para cada rotación, con el año elegido y el límite de agua marcados. */
export function YearChart({ series, year, limit, unit, onPickYear }: { series: Series[]; year: number; limit?: number; unit: string; onPickYear: (y: number) => void }) {
  const t = useT();
  const locale = useLocale();
  const n = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const years = series[0]?.byYear.map((p) => p.year) ?? [];
  const rows = years.map((y, i) => Object.fromEntries([["year", y], ...series.map((s) => [s.id, s.byYear[i]?.value])]));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={rows}
          margin={{ top: 8, right: 20, bottom: 0, left: -8 }}
          onClick={(e) => {
            const y = Number(e?.activeLabel);
            if (Number.isFinite(y)) onPickYear(y);
          }}
        >
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "var(--muted)" }} interval={4} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickFormatter={(v) => n.format(v)} width={44} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
          <Tooltip
            formatter={(v, name) => [`${new Intl.NumberFormat(locale).format(Number(v))} ${unit}`, series.find((s) => s.id === name)?.name ?? name]}
            labelStyle={{ fontWeight: 600 }}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
          />
          {limit !== undefined && (
            <ReferenceLine y={limit} stroke="var(--danger)" strokeDasharray="6 4" label={{ value: t("tiempo.available"), position: "insideTopRight", fontSize: 11, fill: "var(--danger)" }} />
          )}
          <ReferenceLine x={year} stroke="var(--foreground)" strokeOpacity={0.5} />
          {series.map((s) => (
            <Line key={s.id} type="monotone" dataKey={s.id} stroke={s.color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
