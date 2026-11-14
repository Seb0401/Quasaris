"use client";

import { useLocale, useT } from "@/components/i18n-provider";
import { MONTH_COLOR } from "@/components/cards/rotation-card";
import type { YearResult } from "@/lib/contract";

/** "Tira de 21 años": filas = años, columnas = meses. Tocar una fila elige el año. */
export function HistoryGrid({ name, color, byYear, year, onPickYear }: { name: string; color: string; byYear: YearResult[]; year: number; onPickYear: (y: number) => void }) {
  const t = useT();
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(locale, { month: "narrow" });
  return (
    <figure className="history-grid">
      <figcaption style={{ color }}><i style={{ background: color }} />{name}</figcaption>
      <div className="history-months">
        {Array.from({ length: 12 }, (_, m) => <span key={m}>{fmt.format(new Date(2025, m, 1))}</span>)}
      </div>
      <div className="history-rows" role="list">
        {byYear.map((y, row) => (
          <button
            key={y.year}
            type="button"
            role="listitem"
            onClick={() => onPickYear(y.year)}
            aria-label={`${y.year}`}
            aria-current={y.year === year}
            className={y.year === year ? "active" : ""}
            style={{ animationDelay: `${row * 28}ms` }}
          >
            <em>{String(y.year).slice(2)}</em>
            {y.months.map((m, i) => <span key={i} style={{ background: MONTH_COLOR[m] }} title={`${y.year} · ${t(`month.${m}`)}`} />)}
          </button>
        ))}
      </div>
    </figure>
  );
}
