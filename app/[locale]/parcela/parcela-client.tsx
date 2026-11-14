"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import { setFarm, useFarm } from "@/lib/farm-store";
import type { Irrigation, Priorities, SoilTexture } from "@/lib/contract";
import { getMajesSoilGridsReference } from "@/lib/soilgrids";

const ParcelMap = dynamic(() => import("@/components/map/parcel-map"), {
  ssr: false,
  loading: () => <div className="h-[55vh] min-h-72 w-full rounded-2xl bg-border animate-pulse" />,
});

const IRRIGATION: Irrigation[] = ["gravedad", "aspersion", "goteo"];
const SOILS: SoilTexture[] = ["arenoso", "franco", "arcilloso"];
const PRIORITIES: { key: keyof Priorities; icon: string }[] = [
  { key: "water", icon: "💧" },
  { key: "income", icon: "💰" },
  { key: "soil", icon: "🌱" },
  { key: "risk", icon: "⚠️" },
];

function Choice<T extends string>({ value, options, label, onChange }: { value: T; options: T[]; label: (v: T) => string; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`rounded-xl border px-2 py-3 text-sm font-medium ${o === value ? "border-brand bg-brand text-brand-ink" : "border-border bg-surface"}`}
        >
          {label(o)}
        </button>
      ))}
    </div>
  );
}

export function ParcelaClient() {
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const soilReference = getMajesSoilGridsReference(farm.lat, farm.lon);
  const number = new Intl.NumberFormat(locale === "es" ? "es-PE" : "en-US", { maximumFractionDigits: 1 });
  const [locating, setLocating] = useState(false);

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setFarm({ lat: p.coords.latitude, lon: p.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("parcela.title")}</h1>
            <p className="text-sm text-muted">{t("parcela.hint")}</p>
          </div>
          <button type="button" onClick={locate} disabled={locating} className="shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium">
            📍 {t("parcela.locate")}
          </button>
        </div>
        <ParcelMap lat={farm.lat} lon={farm.lon} onPick={(lat, lon) => setFarm({ lat, lon })} />
        <p className="text-xs text-muted">
          {t("parcela.selected")}: {farm.lat.toFixed(4)}, {farm.lon.toFixed(4)} · {t("parcela.ndvi")}
        </p>
      </section>

      <section className="flex flex-col gap-5 rounded-2xl bg-surface border border-border p-4">
        <h2 className="text-xl font-semibold">{t("parcela.resources")}</h2>

        <label className="flex flex-col gap-2">
          <span className="font-medium">💧 {t("parcela.water")}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            value={farm.waterAvailableM3ha}
            onChange={(e) => setFarm({ waterAvailableM3ha: Number(e.target.value) || 0 })}
            className="rounded-xl border border-border bg-background px-4 py-3 text-lg"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="font-medium">🚿 {t("parcela.irrigation")}</span>
          <Choice value={farm.irrigation} options={IRRIGATION} label={(v) => t(`irrigation.${v}`)} onChange={(irrigation) => setFarm({ irrigation })} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-medium">🟫 {t("parcela.soil")}</span>
          <Choice value={farm.soilTexture} options={SOILS} label={(v) => t(`soil.${v}`)} onChange={(soilTexture) => setFarm({ soilTexture })} />
        </div>

        <section aria-labelledby="soilgrids-title" className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3">
          <div>
            <h3 id="soilgrids-title" className="font-semibold">{t("parcela.soilgridsTitle")}</h3>
            <p className="text-sm text-muted">{t("parcela.soilgridsDescription")}</p>
          </div>
          {soilReference ? (
            <>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {(["sand", "silt", "clay"] as const).map((property) => (
                  <div key={property} className="rounded-lg border border-border p-2">
                    <dt className="text-muted">{t(`parcela.soilgrids.${property}`)}</dt>
                    <dd className="font-semibold">{number.format(soilReference.surfaceTexturePercent[property].median)}%</dd>
                  </div>
                ))}
                <div className="rounded-lg border border-border p-2">
                  <dt className="text-muted">{t("parcela.soilgrids.availableWater")}</dt>
                  <dd className="font-semibold">{number.format(soilReference.potentialAvailableWater0to30cmMm.median)} mm</dd>
                </div>
              </dl>
              <p className="text-xs text-muted">
                {t("parcela.soilgrids.uncertainty", {
                  low: number.format(soilReference.surfaceTexturePercent.sand.q05),
                  high: number.format(soilReference.surfaceTexturePercent.sand.q95),
                  waterLow: number.format(soilReference.potentialAvailableWater0to30cmMm.spatialP10),
                  waterHigh: number.format(soilReference.potentialAvailableWater0to30cmMm.spatialP90),
                })}
              </p>
              <p className="text-xs text-muted">
                {t("parcela.soilgrids.caveat")} · {t("parcela.soilgrids.source")} · {t("parcela.soilgrids.updated", {
                  date: new Date(soilReference.retrievedAt).toLocaleDateString(locale === "es" ? "es-PE" : "en-US", { timeZone: "UTC" }),
                })}
              </p>
              <a href={soilReference.source} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand underline underline-offset-4">
                {t("parcela.soilgrids.openSource")}
              </a>
            </>
          ) : (
            <p className="text-sm text-muted">{t("parcela.soilgrids.outsideCoverage")}</p>
          )}
        </section>

        <div className="flex flex-col gap-3">
          <span className="font-medium">{t("parcela.priorities")}</span>
          {PRIORITIES.map(({ key, icon }) => (
            <label key={key} className="grid grid-cols-[1fr_auto] items-center gap-x-3">
              <span className="text-sm">
                {icon} {t(`priority.${key}`)}
              </span>
              <span className="text-sm tabular-nums text-muted">{Math.round(farm.priorities[key] * 100)}%</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={farm.priorities[key]}
                onChange={(e) => setFarm({ priorities: { ...farm.priorities, [key]: Number(e.target.value) } })}
                className="col-span-2 w-full"
              />
            </label>
          ))}
        </div>
      </section>

      <Link href={`/${locale}/comparar`} className="rounded-full bg-brand text-brand-ink px-5 py-4 text-center text-lg font-semibold">
        {t("parcela.continue")} →
      </Link>
    </div>
  );
}
