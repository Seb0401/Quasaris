"use client";

import { useEffect, useState } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import { PushCard } from "@/components/calendar/push-card";
import type { ClimateResponse } from "@/lib/contract";
import { CROPS, MONTH_START, cropName, cropSegments, dayOfYear, weekOutlook } from "@/lib/crop-calendar";
import { useFarm } from "@/lib/farm-store";
import { useToday } from "@/lib/use-today";

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? "";
const CACHE_KEY = "farmtwin.climate.v1";
const FAMILY_COLOR: Record<string, string> = {
  leguminosa: "var(--brand)",
  solanacea: "var(--soil)",
  aliacea: "#9b6bc4",
  graminea: "var(--warn)",
};

function useClimate(lat: number, lon: number) {
  const [data, setData] = useState<ClimateResponse | null>(null);
  useEffect(() => {
    let cancelled = false;
    const key = `${CACHE_KEY}:${lat.toFixed(2)},${lon.toFixed(2)}`;
    fetch(`${ENGINE_URL}/api/py/climate?lat=${lat}&lon=${lon}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: ClimateResponse) => {
        try {
          localStorage.setItem(key, JSON.stringify(d));
        } catch {}
        if (!cancelled) setData(d);
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem(key);
          if (cached && !cancelled) setData(JSON.parse(cached));
        } catch {}
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);
  return data;
}

function heat(p: number, color: string) {
  return p <= 0 ? "var(--background)" : `color-mix(in srgb, ${color} ${Math.round(20 + p * 80)}%, var(--background))`;
}

export function CalendarioClient() {
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const climate = useClimate(farm.lat, farm.lon);
  const [rotationId, setRotationId] = useState(() => farm.rotations.find((r) => r.isCurrent)?.id ?? farm.rotations[0]?.id);
  const rotation = farm.rotations.find((r) => r.id === rotationId) ?? farm.rotations[0];
  const now = useToday();
  const today = now ? dayOfYear(now) : null;
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "short" });
  const fmtDay = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" });

  const outlook = climate && rotation && today !== null ? weekOutlook(rotation.crops, climate.weeks, farm.irrigation, farm.soilTexture, today) : null;
  const anyFrost = climate?.weeks.some((w) => w.pFrost > 0);
  const anyHeat = climate?.weeks.some((w) => w.pHeat > 0);
  const maxEt0 = climate ? Math.max(...climate.weeks.map((w) => w.et0MeanMm)) : 1;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold">📅 {t("calendario.title")}</h1>
        <p className="text-sm text-muted">{t("calendario.subtitle")}</p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {farm.rotations.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRotationId(r.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${r.id === rotation?.id ? "border-brand bg-brand text-brand-ink" : "border-border bg-surface"}`}
          >
            {r.isCurrent ? `★ ${r.name}` : r.name}
          </button>
        ))}
      </div>

      {/* Esta semana */}
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold">
          {t("calendario.thisWeek")} · <span className="font-normal text-muted">{now ? fmtDay.format(now) : ""}</span>
        </h2>
        {!outlook ? (
          <p className="animate-pulse text-sm text-muted">🛰️ {t("comparar.loading")}</p>
        ) : outlook.active.length === 0 ? (
          <p className="text-sm">⬜ {t("calendario.bareNow")}</p>
        ) : (
          <>
            {outlook.active.map((c) => (
              <div key={c.cropId} className="flex items-start justify-between gap-3 rounded-xl bg-background p-3">
                <div>
                  <div className="font-semibold">{cropName(c.cropId, locale)}</div>
                  <div className="text-xs text-muted">
                    {CROPS[c.cropId]?.perennial ? t("calendario.perennial") : t(`calendario.stage.${c.stage}`)} · Kc {c.kc.toFixed(2)}
                    {c.daysToHarvest !== null && ` · ${t("calendario.harvestIn", { days: c.daysToHarvest })}`}
                  </div>
                </div>
                <div className="text-right text-xs">
                  {c.pFrost > 0 && <div className="text-sky">❄️ {pct.format(c.pFrost)}</div>}
                  {c.pHeat > 0 && <div className="text-danger">🔥 {pct.format(c.pHeat)}</div>}
                  {c.pFrost === 0 && c.pHeat === 0 && <div className="text-ok">✓ {t("calendario.noClimateRisk")}</div>}
                </div>
              </div>
            ))}
            <p className="text-sm">
              💧 {t("calendario.waterWeek", { m3: n.format(outlook.waterM3ha), et0: outlook.et0Mm.toFixed(1) })}
            </p>
          </>
        )}
      </section>

      {/* Calendario anual */}
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <div>
          <h2 className="text-lg font-semibold">{t("calendario.yearTitle")}</h2>
          <p className="text-xs text-muted">{t("calendario.yearHint")}</p>
        </div>

        <div className="relative flex flex-col gap-2">
          <div className="grid grid-cols-12 text-center text-[10px] capitalize text-muted">
            {MONTH_START.map((_, m) => (
              <span key={m}>{fmtMonth.format(new Date(2025, m, 1))}</span>
            ))}
          </div>

          {rotation?.crops.map((rc, i) => (
            <div key={`${rc.cropId}-${i}`} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium">
                {cropName(rc.cropId, locale)}
                {CROPS[rc.cropId]?.fixesNitrogen && " · N"}
              </span>
              <div className="relative h-5 rounded bg-background">
                {cropSegments(rc).map((s, j) => (
                  <div
                    key={j}
                    className="absolute inset-y-0 overflow-hidden rounded"
                    style={{ left: `${(s.start / 365) * 100}%`, width: `${((s.end - s.start) / 365) * 100}%`, background: FAMILY_COLOR[CROPS[rc.cropId]?.family] ?? "var(--brand)" }}
                  >
                    {s.stageBreaks.map((b) => (
                      <span key={b} className="absolute inset-y-0 w-px bg-background/70" style={{ left: `${((b - s.start) / (s.end - s.start)) * 100}%` }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {climate && (
            <>
              <Row label={`❄️ ${t("calendario.frostRow")}`} values={climate.weeks.map((w) => heat(w.pFrost, "var(--sky)"))} empty={!anyFrost ? t("calendario.never") : undefined} />
              <Row label={`🔥 ${t("calendario.heatRow")}`} values={climate.weeks.map((w) => heat(w.pHeat, "var(--danger)"))} empty={!anyHeat ? t("calendario.never") : undefined} />
              <Row label={`💧 ${t("calendario.et0Row")}`} values={climate.weeks.map((w) => heat(w.et0MeanMm / maxEt0, "var(--sky)"))} />
              {climate.weeks[0]?.soilWetness !== undefined && (
                <Row
                  label={`🟫 ${t("calendario.soilRow")}`}
                  values={climate.weeks.map((w) => heat(Math.max(0, Math.min(1, ((w.soilWetness ?? 0.3) - 0.3) / 0.4)), "var(--brand)"))}
                />
              )}
            </>
          )}

          {/* hoy */}
          {today !== null && (
          <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-foreground/70" style={{ left: `${(today / 365) * 100}%` }}>
            <span className="absolute -top-1 -translate-x-1/2 rounded bg-foreground px-1 text-[9px] text-background">{t("calendario.today")}</span>
          </div>
          )}
        </div>
        <p className="text-[11px] text-muted">{t("calendario.source")}</p>
      </section>

      {rotation && <PushCard profile={{ lat: farm.lat, lon: farm.lon, crops: rotation.crops, irrigation: farm.irrigation, soilTexture: farm.soilTexture }} />}
    </div>
  );
}

function Row({ label, values, empty }: { label: string; values: string[]; empty?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted">
        {label}
        {empty && <span className="ml-1 text-ok">· {empty}</span>}
      </span>
      <div className="grid h-3 gap-px" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
        {values.map((v, i) => (
          <span key={i} style={{ background: v }} />
        ))}
      </div>
    </div>
  );
}
