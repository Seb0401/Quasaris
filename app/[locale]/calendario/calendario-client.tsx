"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CalendarRange, CheckCircle2, CloudOff, Droplets, Flame, Leaf, Snowflake, Sprout, Sun } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { PushCard } from "@/components/calendar/push-card";
import { Reveal } from "@/components/motion/reveal";
import { Badge, CountUp, HeroStat, PageHeader, Panel } from "@/components/ui/kit";
import type { ClimateResponse } from "@/lib/contract";
import { CROPS, MONTH_START, cropName, cropSegments, dayOfYear, weekOutlook } from "@/lib/crop-calendar";
import { useFarm } from "@/lib/farm-store";
import { CropIcon } from "@/components/icons/farm-icons";
import { useToday } from "@/lib/use-today";
import { rotationColor } from "@/lib/ui";

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? "";
const CACHE_KEY = "farmtwin.climate.v1";
const FAMILY_COLOR: Record<string, string> = {
  leguminosa: "#b9ff63",
  solanacea: "#e39a5d",
  aliacea: "#b69cff",
  graminea: "#f6b94c",
};

function useClimate(lat: number, lon: number) {
  const [data, setData] = useState<ClimateResponse | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const key = `${CACHE_KEY}:${lat.toFixed(2)},${lon.toFixed(2)}`;
    fetch(`${ENGINE_URL}/api/py/climate?lat=${lat}&lon=${lon}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: ClimateResponse) => {
        try {
          localStorage.setItem(key, JSON.stringify(d));
        } catch {}
        if (!cancelled) {
          setData(d);
          setFailed(false);
        }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem(key);
          if (cancelled) return;
          if (cached) setData(JSON.parse(cached));
          else setFailed(true);
        } catch {
          if (!cancelled) setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);
  return { data, failed };
}

function heat(p: number, color: string) {
  return p <= 0 ? "rgba(255,255,255,.04)" : `color-mix(in srgb, ${color} ${Math.round(25 + p * 75)}%, transparent)`;
}

export function CalendarioClient() {
  const t = useT();
  const locale = useLocale();
  const es = locale === "es";
  const farm = useFarm();
  const { data: climate, failed: climateFailed } = useClimate(farm.lat, farm.lon);
  const [rotationId, setRotationId] = useState(() => farm.rotations.find((r) => r.isCurrent)?.id ?? farm.rotations[0]?.id);
  const rotation = farm.rotations.find((r) => r.id === rotationId) ?? farm.rotations[0];
  const now = useToday();
  const today = now ? dayOfYear(now) : null;
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "short" });
  const fmtDay = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });

  const outlook = climate && rotation && today !== null ? weekOutlook(rotation.crops, climate.weeks, farm.irrigation, farm.soilTexture, today) : null;
  const anyFrost = climate?.weeks.some((w) => w.pFrost > 0);
  const anyHeat = climate?.weeks.some((w) => w.pHeat > 0);
  const maxEt0 = climate ? Math.max(...climate.weeks.map((w) => w.et0MeanMm)) : 1;
  const maxRisk = outlook ? Math.max(0, ...outlook.active.map((c) => Math.max(c.pFrost, c.pHeat))) : 0;

  return (
    <div className="ui-page">
      <PageHeader icon={CalendarDays} kicker={es ? "CALENDARIO VIVO" : "LIVE CALENDAR"} title={t("calendario.title")} subtitle={t("calendario.subtitle")}>
        <HeroStat icon={Sun} label={es ? "HOY" : "TODAY"}><span className="capitalize">{now ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(now) : "—"}</span></HeroStat>
        <HeroStat icon={Droplets} label={es ? "RIEGO 7 DÍAS" : "7-DAY WATER"} tone="sky">{outlook ? <CountUp value={outlook.waterM3ha} format={(v) => `${n.format(v)} m³/ha`} /> : "—"}</HeroStat>
      </PageHeader>

      <div className="rotation-tabs" role="tablist" aria-label={es ? "Rotación" : "Rotation"}>
        {farm.rotations.map((r, i) => (
          <button key={r.id} type="button" role="tab" aria-selected={r.id === rotation?.id} onClick={() => setRotationId(r.id)} className={r.id === rotation?.id ? "active" : ""} style={{ "--accent": rotationColor(i) } as React.CSSProperties}>
            <i />{r.name}{r.isCurrent && <small>{t("comparar.current")}</small>}
          </button>
        ))}
      </div>

      <div className="calendar-layout">
        <Reveal>
          <Panel kicker={es ? "ESTA SEMANA" : "THIS WEEK"} icon={Sprout} title={<span className="first-cap">{now ? fmtDay.format(now) : t("calendario.thisWeek")}</span>}>
            {!outlook && climateFailed ? (
              <p className="ui-alert tone-warn"><CloudOff size={16} />{es ? "No pudimos conectar con el motor de clima. Revisa tu conexión: el calendario de siembra de abajo sigue disponible." : "We could not reach the climate engine. Check your connection: the planting calendar below is still available."}</p>
            ) : !outlook ? (
              <div className="week-skeleton"><span className="ui-skeleton" /><span className="ui-skeleton" /><span className="ui-skeleton" /></div>
            ) : (
              <>
                <div className="week-stats">
                  <div className="tone-sky"><Droplets size={17} /><small>{es ? "Riego estimado" : "Estimated irrigation"}</small><strong><CountUp value={outlook.waterM3ha} format={(v) => n.format(v)} /> <em>m³/ha</em></strong></div>
                  <div className="tone-amber"><Sun size={17} /><small>{es ? "Evaporación (ET0)" : "Evaporation (ET0)"}</small><strong>{outlook.et0Mm.toFixed(1)} <em>mm/{es ? "día" : "day"}</em></strong></div>
                  <div className={maxRisk > 0 ? "tone-danger" : "tone-ok"}>{maxRisk > 0 ? <Snowflake size={17} /> : <CheckCircle2 size={17} />}<small>{es ? "Riesgo climático" : "Climate risk"}</small><strong>{maxRisk > 0 ? pct.format(maxRisk) : (es ? "Bajo" : "Low")}</strong></div>
                </div>

                {outlook.active.length === 0 ? (
                  <p className="ui-alert tone-neutral"><Leaf size={16} />{t("calendario.bareNow")}</p>
                ) : (
                  <ul className="crop-list">
                    {outlook.active.map((c) => (
                      <li key={c.cropId} style={{ "--accent": FAMILY_COLOR[CROPS[c.cropId]?.family] ?? "var(--cyan)" } as React.CSSProperties}>
                        <span className="crop-icon"><CropIcon crop={c.cropId} size={20} /></span>
                        <div className="min-w-0 flex-1">
                          <b>{cropName(c.cropId, locale)}</b>
                          <small>{CROPS[c.cropId]?.perennial ? t("calendario.perennial") : t(`calendario.stage.${c.stage}`)} · Kc {c.kc.toFixed(2)}{c.daysToHarvest !== null && ` · ${t("calendario.harvestIn", { days: c.daysToHarvest })}`}</small>
                        </div>
                        <div className="crop-risks">
                          {c.pFrost > 0 && <Badge tone="sky" icon={Snowflake}>{pct.format(c.pFrost)}</Badge>}
                          {c.pHeat > 0 && <Badge tone="danger" icon={Flame}>{pct.format(c.pHeat)}</Badge>}
                          {c.pFrost === 0 && c.pHeat === 0 && <Badge tone="ok" icon={CheckCircle2}>{t("calendario.noClimateRisk")}</Badge>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="ui-hint"><Droplets size={14} />{t("calendario.waterWeek", { m3: n.format(outlook.waterM3ha), et0: outlook.et0Mm.toFixed(1) })}</p>
              </>
            )}
          </Panel>
        </Reveal>

        <Reveal delay={90}>
          {rotation && <PushCard profile={{ lat: farm.lat, lon: farm.lon, crops: rotation.crops, irrigation: farm.irrigation, soilTexture: farm.soilTexture }} />}
        </Reveal>
      </div>

      <Reveal>
        <Panel kicker={es ? "52 SEMANAS" : "52 WEEKS"} icon={CalendarRange} title={t("calendario.yearTitle")}>
          <p className="ui-hint">{t("calendario.yearHint")}</p>
          <div className="year-calendar" key={rotation?.id}>
            <div className="year-calendar-months">
              {MONTH_START.map((_, m) => <span key={m}>{fmtMonth.format(new Date(2025, m, 1))}</span>)}
            </div>

            {rotation?.crops.map((rc, i) => {
              const color = FAMILY_COLOR[CROPS[rc.cropId]?.family] ?? "var(--cyan)";
              return (
                <div key={`${rc.cropId}-${i}`} className="cal-row">
                  <span className="cal-label"><i style={{ background: color }} />{cropName(rc.cropId, locale)}{CROPS[rc.cropId]?.fixesNitrogen && <em title={es ? "Fija nitrógeno" : "Fixes nitrogen"}>N</em>}</span>
                  <div className="cal-track">
                    {cropSegments(rc).map((s, j) => (
                      <div key={j} className="cal-segment" style={{ left: `${(s.start / 365) * 100}%`, width: `${((s.end - s.start) / 365) * 100}%`, background: `linear-gradient(90deg, color-mix(in srgb, ${color} 55%, transparent), ${color})`, animationDelay: `${i * 120 + j * 60}ms` }}>
                        {s.stageBreaks.map((b) => <span key={b} style={{ left: `${((b - s.start) / (s.end - s.start)) * 100}%` }} />)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {climate && (
              <div className="cal-climate">
                <HeatRow icon={Snowflake} label={t("calendario.frostRow")} values={climate.weeks.map((w) => heat(w.pFrost, "#5cc8f5"))} empty={!anyFrost ? t("calendario.never") : undefined} />
                <HeatRow icon={Flame} label={t("calendario.heatRow")} values={climate.weeks.map((w) => heat(w.pHeat, "#ff6b6b"))} empty={!anyHeat ? t("calendario.never") : undefined} />
                <HeatRow icon={Droplets} label={t("calendario.et0Row")} values={climate.weeks.map((w) => heat(w.et0MeanMm / maxEt0, "#63def2"))} />
                {climate.weeks[0]?.soilWetness !== undefined && (
                  <HeatRow icon={Sprout} label={t("calendario.soilRow")} values={climate.weeks.map((w) => heat(Math.max(0, Math.min(1, ((w.soilWetness ?? 0.3) - 0.3) / 0.4)), "#b9ff63"))} />
                )}
              </div>
            )}

            {today !== null && (
              <div className="cal-today" style={{ left: `calc(var(--cal-label) + (100% - var(--cal-label)) * ${today / 365})` }}>
                <span>{t("calendario.today")}</span>
              </div>
            )}
          </div>
          <p className="ui-source">{t("calendario.source")}</p>
        </Panel>
      </Reveal>
    </div>
  );
}

function HeatRow({ icon: Icon, label, values, empty }: { icon: typeof Snowflake; label: string; values: string[]; empty?: string }) {
  return (
    <div className="cal-row">
      <span className="cal-label muted"><Icon size={13} />{label}{empty && <em className="ok">{empty}</em>}</span>
      <div className="heat-row" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
        {values.map((v, i) => <span key={i} style={{ background: v, animationDelay: `${i * 12}ms` }} />)}
      </div>
    </div>
  );
}
