"use client";

import { useLocale, useT } from "@/components/i18n-provider";
import { MONTH_COLOR } from "@/components/cards/rotation-card";
import type { MonthStatus, YearResult } from "@/lib/contract";

const STATUSES: MonthStatus[] = ["ok", "water_stress", "climate_risk", "bare"];

export function MonthLegend() {
  const t = useT();
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {STATUSES.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded-sm ${MONTH_COLOR[s]}`} aria-hidden />
          {t(`month.${s}`)}
        </li>
      ))}
    </ul>
  );
}

/**
 * "Tira de 20 años": filas = años, columnas = meses. Se ve de un vistazo qué tan estable es una rotación.
 * Tocar una fila salta a ese año.
 */
export function YearStrip({
  byYear,
  selected,
  waterAvailable,
  onSelect,
}: {
  byYear: YearResult[];
  selected: number;
  waterAvailable: number;
  onSelect: (year: number) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale, { month: "narrow" });

  return (
    <div className="flex flex-col gap-0.5" role="grid" aria-label={t("tiempo.stripTitle")}>
      <div className="grid grid-cols-[2.5rem_repeat(12,1fr)_1.25rem] gap-0.5 text-[10px] text-muted" role="row">
        <span />
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="text-center">
            {fmt.format(new Date(2025, i, 1))}
          </span>
        ))}
        <span />
      </div>
      {byYear.map((y) => {
        const active = y.year === selected;
        const over = y.waterM3ha > waterAvailable;
        return (
          <button
            key={y.year}
            type="button"
            role="row"
            aria-selected={active}
            onClick={() => onSelect(y.year)}
            className={`grid grid-cols-[2.5rem_repeat(12,1fr)_1.25rem] items-center gap-0.5 rounded ${active ? "ring-2 ring-foreground ring-offset-1 ring-offset-surface" : ""}`}
          >
            <span className={`text-[11px] tabular-nums text-left ${active ? "font-bold" : "text-muted"}`}>{y.year}</span>
            {y.months.map((m, i) => (
              <span key={i} className={`h-3 rounded-[2px] ${MONTH_COLOR[m]}`} title={`${y.year} · ${t(`month.${m}`)}`} />
            ))}
            <span className="text-[11px] text-center" title={over ? t("tiempo.overWater") : undefined}>
              {over ? "💧" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
