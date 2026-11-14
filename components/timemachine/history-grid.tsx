"use client";

import { useLocale, useT } from "@/components/i18n-provider";
import type { MonthStatus, YearResult } from "@/lib/contract";

const COLOR: Record<MonthStatus, string> = {
  ok: "var(--ok)",
  water_stress: "var(--warn)",
  climate_risk: "var(--danger)",
  bare: "var(--bare)",
};

/** "Tira de 20 años": filas = años, columnas = meses. Tocar una fila elige el año. */
export function HistoryGrid({ name, color, byYear, year, onPickYear }: { name: string; color: string; byYear: YearResult[]; year: number; onPickYear: (y: number) => void }) {
  const t = useT();
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale, { month: "narrow" });
  return (
    <figure className="flex min-w-0 flex-col gap-1">
      <figcaption className="truncate text-xs font-semibold" style={{ color }}>
        {name}
      </figcaption>
      <div className="grid grid-cols-12 gap-px text-center text-[9px] text-muted">
        {Array.from({ length: 12 }, (_, m) => (
          <span key={m}>{fmt.format(new Date(2025, m, 1))}</span>
        ))}
      </div>
      <div className="flex flex-col gap-px" role="list">
        {byYear.map((y) => (
          <button
            key={y.year}
            type="button"
            role="listitem"
            onClick={() => onPickYear(y.year)}
            aria-label={`${y.year}`}
            aria-current={y.year === year}
            className={`grid grid-cols-12 gap-px rounded-[2px] ${y.year === year ? "outline-2 outline-offset-1 outline-foreground" : ""}`}
          >
            {y.months.map((m, i) => (
              <span key={i} className="h-2.5" style={{ background: COLOR[m] }} title={`${y.year} · ${t(`month.${m}`)}`} />
            ))}
          </button>
        ))}
      </div>
    </figure>
  );
}

export function StatusLegend() {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
      {(Object.keys(COLOR) as MonthStatus[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: COLOR[s] }} />
          {t(`month.${s}`)}
        </span>
      ))}
    </div>
  );
}
