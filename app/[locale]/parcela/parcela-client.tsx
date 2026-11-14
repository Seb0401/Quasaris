"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import { setFarm, useFarm } from "@/lib/farm-store";
import type { Irrigation, Priorities, SoilTexture } from "@/lib/contract";
import { LayerSwitcher, MapLegend } from "@/components/map/layer-controls";
import { GIBS_LAYERS, layerTime, type GibsLayerKey } from "@/lib/gibs";

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
  const [locating, setLocating] = useState(false);
  const [layer, setLayer] = useState<GibsLayerKey | null>("ndviMonthly");
  const [month, setMonth] = useState("2025-09"); // septiembre: mayor contraste entre parcelas regadas y desierto
  const [y, mo] = month.split("-").map(Number);
  const time = layer ? layerTime(GIBS_LAYERS[layer], y, mo) : "";

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
        <LayerSwitcher value={layer} onChange={setLayer} />
        <ParcelMap lat={farm.lat} lon={farm.lon} onPick={(lat, lon) => setFarm({ lat, lon })} layer={layer} time={time} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">
            {t("parcela.selected")}: {farm.lat.toFixed(4)}, {farm.lon.toFixed(4)}
          </p>
          {layer && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">{t("map.date")}</span>
              <input
                type="month"
                min="2000-03"
                max="2026-10"
                value={month}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2 py-1"
              />
            </label>
          )}
        </div>
        <MapLegend layer={layer} time={time} />
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
