"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ErrorBar, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocale, useT } from "@/components/i18n-provider";
import type { Rotation, RotationResult } from "@/lib/contract";

type Metric = "water" | "income" | "score";

const COLOR: Record<Metric, string> = { water: "var(--sky)", income: "var(--soil)", score: "var(--brand)" };

/** Comparación visual de las rotaciones: barra = mediana de 20 años, bigote = rango p10–p90. */
export function CompareCharts({ rotations, results, waterAvailable }: { rotations: Rotation[]; results: RotationResult[]; waterAvailable: number }) {
  const t = useT();
  const locale = useLocale();
  const [metric, setMetric] = useState<Metric>("water");
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const byId = new Map(results.map((r) => [r.id, r]));

  const data = rotations.flatMap((rot) => {
    const r = byId.get(rot.id);
    if (!r) return [];
    const stat = metric === "water" ? r.water : metric === "income" ? r.income : null;
    const value = stat ? stat.median : Math.round(r.score * 100);
    return [
      {
        name: rot.name,
        value,
        range: stat ? [stat.median - stat.p10, stat.p90 - stat.median] : [0, 0],
        p10: stat?.p10,
        p90: stat?.p90,
        viable: r.viable,
      },
    ];
  });

  if (data.length === 0) return null;
  const unit = metric === "water" ? "m³/ha" : metric === "income" ? "S/ /ha" : "/100";

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">📊 {t("charts.title")}</h2>
        <div role="tablist" className="flex gap-1 rounded-full bg-background p-1">
          {(["water", "income", "score"] as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={metric === m}
              onClick={() => setMetric(m)}
              className={`rounded-full px-3 py-1 text-sm font-medium ${metric === m ? "bg-surface shadow-sm" : "text-muted"}`}
            >
              {t(`charts.${m}`)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 56 + data.length * 56 }} className="w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" tickFormatter={(v: number) => n.format(v)} stroke="var(--muted)" fontSize={11} />
            <YAxis type="category" dataKey="name" width={110} stroke="var(--muted)" fontSize={11} tickLine={false} />
            <Tooltip
              cursor={{ fill: "var(--background)" }}
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" }}
              formatter={(v, _k, item) => {
                const p = item.payload as { p10?: number; p90?: number };
                const base = `${n.format(Number(v))} ${unit}`;
                return [p.p10 !== undefined ? `${base} (${t("comparar.range", { p10: n.format(p.p10), p90: n.format(p.p90 ?? 0) })})` : base, t(`charts.${metric}`)];
              }}
            />
            {metric === "water" && (
              <ReferenceLine
                x={waterAvailable}
                stroke="var(--danger)"
                strokeDasharray="4 3"
                strokeWidth={2}
                label={{ value: t("charts.yourWater"), position: "top", fill: "var(--danger)", fontSize: 11 }}
              />
            )}
            <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={COLOR[metric]} fillOpacity={metric === "water" && !d.viable ? 0.45 : 1} />
              ))}
              {metric !== "score" && <ErrorBar dataKey="range" width={6} strokeWidth={1.5} stroke="var(--foreground)" direction="x" />}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted">{t(metric === "score" ? "charts.scoreNote" : "charts.note")}</p>
    </section>
  );
}
