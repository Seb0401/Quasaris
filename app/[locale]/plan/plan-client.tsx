"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClipboardCheck, ClipboardList, LoaderCircle, Printer, Tractor, TriangleAlert } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { CalendarIcon, CropIcon, HarvestIcon, ProfitIcon, SoilIcon, SproutIcon, WaterIcon } from "@/components/icons/farm-icons";
import { RotationIcons } from "@/components/icons/rotation-icons";
import { CROPS, cropName, cropSegments } from "@/lib/crop-calendar";
import { useFarm } from "@/lib/farm-store";
import { buildPalette, rotationColor } from "@/lib/granja-sim";
import { useGranja } from "@/lib/granja-store";
import { buildPlan, harvestMonth, lotRanges } from "@/lib/plan";
import { recommend } from "@/lib/recommendation";
import { useSimulation } from "@/lib/use-simulation";

type Source = "farm" | "reco";

export function PlanClient() {
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const granja = useGranja();
  const palette = useMemo(() => buildPalette(farm.rotations), [farm.rotations]);
  const data = useSimulation({ rotations: palette, cacheKey: "farmtwin.plan.sim.v1" });
  const [source, setSource] = useState<Source>(granja.zoneSet ? "farm" : "reco");

  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const n1 = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "long" });
  const fmtShort = new Intl.DateTimeFormat(locale, { month: "short" });
  const monthName = (m: number) => fmtMonth.format(new Date(2025, m, 1));

  const rec = data ? recommend(data, farm.rotations, farm) : null;
  const tiles = source === "farm" || !rec ? granja.tiles : granja.tiles.map(() => rec.bestRotation.id);
  const plan = data ? buildPlan(data, palette, tiles, granja.haPerTile, farm.waterAvailableM3ha) : null;

  if (!data || !plan) {
    return (
      <p className="flex items-center justify-center gap-2 py-12 text-muted">
        <LoaderCircle size={18} className="animate-spin" /> {t("comparar.loading")}
      </p>
    );
  }

  const fits = plan.waterM3 <= plan.capacityM3;
  const maxMonth = Math.max(plan.monthlyQuotaM3, ...plan.monthlyM3);

  return (
    <div className="plan-print mx-auto flex max-w-4xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            <ClipboardList size={14} /> {t("plan.kicker")}
          </p>
          <h1 className="text-2xl font-bold">{t("plan.title", { ha: n1.format(plan.totalHa) })}</h1>
          <p className="text-sm text-muted">
            {t("plan.meta", {
              lat: farm.lat.toFixed(3),
              lon: farm.lon.toFixed(3),
              irrigation: t(`irrigation.${farm.irrigation}`),
              soil: t(`soil.${farm.soilTexture}`),
              water: n.format(farm.waterAvailableM3ha),
            })}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <div className="flex rounded-full border border-border bg-surface p-0.5 text-xs font-semibold">
            <button type="button" onClick={() => setSource("farm")} className={`rounded-full px-3 py-1.5 ${source === "farm" ? "bg-brand text-brand-ink" : ""}`}>
              {t("plan.fromFarm")}
            </button>
            <button type="button" onClick={() => setSource("reco")} className={`rounded-full px-3 py-1.5 ${source === "reco" ? "bg-brand text-brand-ink" : ""}`}>
              {t("plan.fromReco")}
            </button>
          </div>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-ink">
            <Printer size={16} /> {t("plan.print")}
          </button>
        </div>
      </header>

      {/* resumen */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={<WaterIcon size={20} />} label={t("plan.water")} value={`${n.format(plan.waterM3)} m³`} sub={t("plan.waterOf", { cap: n.format(plan.capacityM3) })} tone={fits ? "ok" : "bad"} />
        <Kpi icon={<ProfitIcon size={20} />} label={t("plan.income")} value={`S/ ${n.format(plan.incomePEN)}`} sub={t("plan.perYear")} />
        <Kpi icon={<SoilIcon size={20} />} label={t("plan.soil")} value={pct.format(plan.soil)} sub={t("plan.soilSub")} />
        <Kpi icon={<Tractor size={20} />} label={t("plan.lots")} value={`${tiles.length}`} sub={t("plan.lotSize", { ha: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(granja.haPerTile) })} />
      </section>
      {!fits && (
        <p className="flex items-start gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" /> {t("plan.notFit", { extra: n.format(plan.waterM3 - plan.capacityM3) })}
        </p>
      )}

      {/* lotes */}
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Tractor size={18} /> {t("plan.lotsTitle")}
        </h2>
        {plan.groups.map((g) => (
          <article key={g.rotation.id} className="break-inside-avoid rounded-2xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <span className="h-3 w-3 rounded-full" style={{ background: rotationColor(g.rotation.id) }} />
                <RotationIcons rotation={g.rotation} size={18} className="text-brand" />
                {g.rotation.id === "descanso" ? t("granja.fallow") : g.rotation.name}
              </h3>
              <span className="text-sm text-muted">
                {t("plan.lotList", { lots: lotRanges(g.tiles) })} · {n1.format(g.ha)} ha
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
              <span className="flex items-center gap-1">
                <WaterIcon size={15} /> {n.format(g.waterM3)} m³/{t("plan.year")}
              </span>
              <span className="flex items-center gap-1">
                <ProfitIcon size={15} /> S/ {n.format(g.incomePEN)}/{t("plan.year")}
              </span>
            </div>

            {g.rotation.crops.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                {g.rotation.crops.map((rc, i) => {
                  const hm = harvestMonth(rc.cropId, rc.sowMonth);
                  return (
                    <div key={i} className="flex flex-col gap-1">
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="flex items-center gap-1 font-semibold">
                          <CropIcon crop={rc.cropId} size={16} /> {cropName(rc.cropId, locale)}
                        </span>
                        {CROPS[rc.cropId]?.perennial ? (
                          <span className="text-muted">{t("plan.perennial")}</span>
                        ) : (
                          <>
                            <span className="flex items-center gap-1">
                              <SproutIcon size={14} /> {t("plan.sow")} {monthName(rc.sowMonth - 1)}
                            </span>
                            {hm !== null && (
                              <span className="flex items-center gap-1">
                                <HarvestIcon size={14} /> {t("plan.harvest")} {monthName(hm)}
                              </span>
                            )}
                          </>
                        )}
                      </p>
                      <div className="relative h-2.5 rounded bg-background">
                        {cropSegments(rc).map((s, j) => (
                          <span
                            key={j}
                            className="absolute inset-y-0 rounded"
                            style={{ left: `${(s.start / 365) * 100}%`, width: `${((s.end - s.start) / 365) * 100}%`, background: rotationColor(g.rotation.id) }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="grid grid-cols-12 text-center text-[9px] capitalize text-muted">
                  {Array.from({ length: 12 }, (_, m) => (
                    <span key={m}>{fmtShort.format(new Date(2025, m, 1))}</span>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </section>

      {/* agua mes a mes */}
      <section className="break-inside-avoid rounded-2xl border border-border bg-surface p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarIcon size={18} /> {t("plan.monthlyTitle")}
        </h2>
        <p className="text-xs text-muted">{t("plan.monthlyHint", { quota: n.format(plan.monthlyQuotaM3) })}</p>
        <div className="relative mt-3 h-32">
          <div className="flex h-full items-end gap-1">
            {plan.monthlyM3.map((v, m) => (
              <span
                key={m}
                title={`${n.format(v)} m³`}
                className="flex-1 rounded-t"
                style={{ height: `${(v / maxMonth) * 100}%`, background: v > plan.monthlyQuotaM3 * 1.05 ? "var(--danger)" : "var(--sky)" }}
              />
            ))}
          </div>
          <span className="absolute inset-x-0 border-t-2 border-dashed border-foreground/50" style={{ bottom: `${(plan.monthlyQuotaM3 / maxMonth) * 100}%` }} />
        </div>
        <div className="mt-1 flex gap-1">
          {plan.monthlyM3.map((v, m) => (
            <span key={m} className="flex-1 text-center text-[10px] capitalize leading-tight">
              {fmtShort.format(new Date(2025, m, 1))}
              <span className="block text-[9px] tabular-nums text-muted">{n1.format(v / 1000)}k</span>
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{t("plan.monthlyLegend")}</p>
      </section>

      {/* revisar */}
      <section className="break-inside-avoid grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <ClipboardCheck size={18} /> {t("plan.checks")}
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {plan.checks.map((k) => (
              <li key={k} className="flex items-start gap-2">
                <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded border border-border" />
                {t(`explain.${k}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <TriangleAlert size={18} /> {t("plan.missing")}
          </h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted">
            {plan.missing.map((k) => (
              <li key={k}>{t(`explain.${k}`)}</li>
            ))}
          </ul>
        </div>
      </section>

      <div className="no-print flex flex-wrap gap-2">
        <Link href={`/${locale}/granja`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold">
          <Tractor size={16} /> {t("plan.editFarm")}
        </Link>
        <Link href={`/${locale}/comparar`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold">
          {t("plan.backCompare")}
        </Link>
      </div>
      <p className="text-[11px] text-muted">{t("plan.source")}</p>
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "ok" | "bad" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        {icon} {label}
      </div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${tone === "bad" ? "text-danger" : tone === "ok" ? "text-ok" : ""}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  );
}
