"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart3, Check, FolderOpen, Save, Trash2, X } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import type { Irrigation, Rotation, SimulateResponse, SoilTexture } from "@/lib/contract";
import { efficiency } from "@/lib/crop-calendar";
import { activeCount } from "@/lib/farm-shape";
import { scenarioYear, simulateYear, type YearSummary } from "@/lib/granja-sim";
import type { SavedPlan, Scenario } from "@/lib/granja-store";

const MAX_PLANS = 6;
const FUTURE: Scenario[] = ["typical", "dry", "nino"];

type Layout = { cols: number; rows: number; tiles: string[]; haPerTile: number };

type Props = {
  data: SimulateResponse;
  palette: Rotation[];
  plans: SavedPlan[];
  current: Layout;
  irrigation: Irrigation;
  soil: SoilTexture;
  waterAvailableM3ha: number;
  season: number;
  onSave: (name: string) => void;
  onLoad: (plan: SavedPlan) => void;
  onDelete: (id: string) => void;
};

/** Guardar la distribución actual, cargar una guardada y abrir la comparación entre años. */
export function PlansPanel(props: Props) {
  const t = useT();
  const locale = useLocale();
  const { plans, current, onSave, onLoad, onDelete } = props;
  const [name, setName] = useState("");
  const [comparing, setComparing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const n1 = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const full = plans.length >= MAX_PLANS;

  return (
    <section className="flex flex-col gap-3 text-sm">
      <p className="text-xs text-[var(--muted)]">{t("granja.plans.intro")}</p>
      <form
        className="farm-plan-save"
        onSubmit={(e) => {
          e.preventDefault();
          if (full) return;
          onSave(name.trim() || t("granja.plans.defaultName", { n: plans.length + 1 }));
          setName("");
          setJustSaved(true);
        }}
      >
        <input value={name} onChange={(e) => { setName(e.target.value.slice(0, 32)); setJustSaved(false); }} placeholder={t("granja.plans.defaultName", { n: plans.length + 1 })} aria-label={t("granja.plans.name")} className="ui-input" />
        <button type="submit" disabled={full} className="ui-btn ui-btn-sm">
          {justSaved ? <Check size={15} /> : <Save size={15} />}
          {justSaved ? t("granja.plans.saved") : t("granja.plans.save")}
        </button>
      </form>
      {full && <p className="text-[11px] text-[var(--muted)]">{t("granja.plans.full", { max: MAX_PLANS })}</p>}

      {plans.length === 0 ? (
        <p className="rounded-xl bg-white/[.04] px-3 py-2 text-xs text-[var(--muted)]">{t("granja.plans.empty")}</p>
      ) : (
        <ul className="farm-plan-list">
          {plans.map((p) => (
            <li key={p.id}>
              <div>
                <b>{p.name}</b>
                <small>{t("granja.plans.meta", { n: activeCount(p.tiles), ha: n1.format(activeCount(p.tiles) * p.haPerTile), irrigation: t(`irrigation.${p.irrigation}`) })}</small>
              </div>
              <button type="button" onClick={() => onLoad(p)} aria-label={t("granja.plans.load")} title={t("granja.plans.load")}><FolderOpen size={15} /></button>
              <button type="button" onClick={() => onDelete(p.id)} aria-label={t("granja.plans.delete")} title={t("granja.plans.delete")}><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={() => setComparing(true)} className="ui-btn ui-btn-ghost ui-btn-sm self-start">
        <BarChart3 size={15} />
        {t("granja.plans.compare")}
      </button>
      {/* el panel tiene backdrop-filter: la tabla se monta en <body> para cubrir toda la pantalla */}
      {comparing && createPortal(<CompareTable {...props} current={current} onClose={() => setComparing(false)} />, document.body)}
    </section>
  );
}

type Column = { key: string; year: number; label: string; sub: string; future: boolean };

function CompareTable({ data, palette, plans, current, irrigation, soil, waterAvailableM3ha, season, onClose }: Props & { onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const years = useMemo(() => (data.rotations[0]?.byYear ?? []).map((y) => y.year).sort((a, b) => a - b), [data]);
  const [picked, setPicked] = useState<number[]>(() => {
    const dry = scenarioYear(data, "dry");
    const nino = scenarioYear(data, "nino");
    return Array.from(new Set([dry, nino, years[years.length - 1]])).filter(Boolean).sort((a, b) => a - b);
  });
  const money = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "short" });

  const columns: Column[] = [
    ...picked.map((y) => ({ key: `p${y}`, year: y, label: String(y), sub: t("granja.plans.real"), future: false })),
    ...FUTURE.map((sc) => {
      const y = scenarioYear(data, sc);
      return { key: `f${sc}`, year: y, label: `${season} · ${t(`granja.scenario.${sc}.short`)}`, sub: t("granja.plans.modelled", { year: y }), future: true };
    }),
  ];
  const rows: { id: string; name: string; layout: Layout; irrigation: Irrigation }[] = [
    { id: "current", name: t("granja.plans.current"), layout: current, irrigation },
    ...plans.map((p) => ({ id: p.id, name: p.name, layout: p, irrigation: p.irrigation })),
  ];

  // cada plan en cada año: la misma simulación mes a mes de la granja (sin fenómenos agregados)
  const cells = (() => {
    const eff = efficiency(irrigation, soil);
    return rows.map((r) => {
      // otro sistema de riego: el mismo cultivo pide agua bruta = neta / eficiencia
      const water = waterAvailableM3ha * (efficiency(r.irrigation, soil) / eff);
      return columns.map((c) => {
        const { summary, alerts } = simulateYear(data, r.layout.tiles, r.layout.haPerTile, c.year, water, palette, []);
        const dry = alerts.find((a) => a.kind === "dry");
        return { summary, dryMonth: dry ? dry.month : null, alerts: alerts.filter((a) => a.kind !== "waterPeak").length };
      });
    });
  })();
  const best = columns.map((_, j) => Math.max(...cells.map((row) => row[j].summary.incomePEN)));

  return (
    <div className="farm-compare" role="dialog" aria-modal="true" aria-label={t("granja.plans.compareTitle")}>
      <div className="farm-compare-card">
        <header>
          <div>
            <b>{t("granja.plans.compareTitle")}</b>
            <small>{t("granja.plans.compareHint")}</small>
          </div>
          <button type="button" onClick={onClose} aria-label={t("granja.ui.close")}><X size={16} /></button>
        </header>
        <div className="farm-compare-years">
          <span>{t("granja.plans.pastYears")}</span>
          {years.map((y) => (
            <button
              key={y}
              type="button"
              aria-pressed={picked.includes(y)}
              className={picked.includes(y) ? "active" : ""}
              onClick={() => setPicked((p) => (p.includes(y) ? p.filter((x) => x !== y) : [...p, y].sort((a, b) => a - b).slice(-4)))}
            >
              {y}
            </button>
          ))}
        </div>
        <div className="farm-compare-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">{t("granja.plans.plan")}</th>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={c.future ? "is-future" : ""}>
                    {c.label}
                    <small>{c.sub}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <th scope="row">
                    {r.name}
                    <small>{t(`irrigation.${r.irrigation}`)}</small>
                  </th>
                  {cells[i].map((cell, j) => (
                    <td key={columns[j].key} className={cell.summary.incomePEN === best[j] && rows.length > 1 ? "is-best" : ""}>
                      <b>S/ {money.format(cell.summary.incomePEN)}</b>
                      <Water summary={cell.summary} dryMonth={cell.dryMonth} fmt={(m) => fmtMonth.format(new Date(2025, m, 1))} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[var(--muted)]">{t("granja.plans.note")}</p>
      </div>
    </div>
  );
}

function Water({ summary, dryMonth, fmt }: { summary: YearSummary; dryMonth: number | null; fmt: (m: number) => string }) {
  const t = useT();
  const pct = Math.round((summary.waterM3 / Math.max(summary.capacityM3, 1)) * 100);
  return dryMonth === null ? (
    <small className="is-ok">{t("granja.plans.waterOk", { pct })}</small>
  ) : (
    <small className="is-bad">{t("granja.plans.dryFrom", { month: fmt(dryMonth) })}</small>
  );
}
