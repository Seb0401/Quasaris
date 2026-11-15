"use client";

import "./calendar.css";

import { useEffect, useState } from "react";
import { ArrowDown, CalendarDays, CalendarRange, CloudOff, CloudSun, Database, Info, RefreshCw, Sprout, Sun } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { CropIcon, FrostIcon, HeatIcon, SoilIcon, WaterIcon } from "@/components/icons/farm-icons";
import { Reveal } from "@/components/motion/reveal";
import { CountUp, HeroStat, Meter, PageHeader, Panel, Segmented } from "@/components/ui/kit";
import type { ClimateResponse } from "@/lib/contract";
import { cropName, cropOnDay, CROPS, cropSegments, cycleDays, dayOfYear, FAMILY_COLOR, MONTH_START, weekOf, weekOutlook } from "@/lib/crop-calendar";
import { useFarm } from "@/lib/farm-store";
import { rotationColor } from "@/lib/ui";
import { useToday } from "@/lib/use-today";

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? "";
const CACHE_KEY = "farmtwin.climate.v1";
const cropColor = (cropId: string) => FAMILY_COLOR[CROPS[cropId]?.family] ?? "#63def2";

function useClimate(lat: number, lon: number) {
  const [result, setResult] = useState<{ key: string; data: ClimateResponse | null; cached: boolean } | null>(null);
  const key = `${CACHE_KEY}:${lat},${lon}`;
  useEffect(() => {
    let cancelled = false;
    const valid = (value: ClimateResponse) => Array.isArray(value?.weeks) && value.weeks.length === 52 && value.weeks.every((w) => Number.isFinite(w.pFrost) && Number.isFinite(w.pHeat) && Number.isFinite(w.et0MeanMm));
    fetch(`${ENGINE_URL}/api/py/climate?lat=${lat}&lon=${lon}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: ClimateResponse) => {
        if (!valid(d)) throw new Error("Invalid climate data");
        try {
          localStorage.setItem(key, JSON.stringify(d));
        } catch {}
        if (!cancelled) setResult({ key, data: d, cached: false });
      })
      .catch(() => {
        let data: ClimateResponse | null = null;
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached) as ClimateResponse;
            if (valid(parsed)) data = parsed;
          }
        } catch {}
        if (!cancelled) setResult({ key, data, cached: !!data });
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lon, key]);
  return result?.key === key ? result : null;
}

function heat(p: number, color: string) {
  return p <= 0 ? "rgba(255,255,255,.04)" : `color-mix(in srgb, ${color} ${Math.round(25 + p * 75)}%, transparent)`;
}

export function CalendarioClient() {
  const t = useT();
  const locale = useLocale();
  const es = locale === "es";
  const farm = useFarm();
  const climateResult = useClimate(farm.lat, farm.lon);
  const climate = climateResult?.data;
  const copy = es ? {
    subtitle: "Revisa el ciclo aproximado de los cultivos de tu rotación y el clima histórico de la parcela.",
    timing: "Las fechas son aproximadas: solo se conoce el mes de siembra y las duraciones deben validarse localmente.",
    sow: "Siembra", duration: "duración aprox.", days: "días", unknown: "Cultivo sin datos de duración", allYear: "Cultivo perenne: presente todo el año; los cortes no están programados.",
    historical: "Clima histórico de esta semana", frost: "Años con mínima ≤ 2 °C", heat: "Años con máxima ≥ 30 °C", disclaimer: "Datos históricos de 2005–2025: porcentaje de años con al menos un día que superó el umbral general en esta semana. No es pronóstico ni probabilidad de daño para un cultivo.",
    unavailable: "No se pudieron cargar los datos climáticos. Los ciclos de cultivo siguen disponibles.", cached: "Usando datos climáticos guardados para esta ubicación.",
    water: "Demanda bruta aproximada de agua para siete días", waterNote: "Estimación histórica basada en ET0, etapa del cultivo y eficiencia de riego; no incluye lluvia ni indica el agua asignada. No es una instrucción de riego.",
    noRotation: "No hay rotaciones disponibles.", noActive: "No hay cultivos programados esta semana.",
  } : {
    subtitle: "Review approximate crop cycles in your rotation and historical climate for the parcel.",
    timing: "Dates are approximate: only the planting month is known and durations require local validation.",
    sow: "Planting", duration: "approx. duration", days: "days", unknown: "Crop duration unavailable", allYear: "Perennial crop: present year-round; cuttings are not scheduled.",
    historical: "Historical climate this week", frost: "Years with low ≤ 2 °C", heat: "Years with high ≥ 30 °C", disclaimer: "Historical data from 2005–2025: percentage of years with at least one day reaching the general threshold in this week. This is not a forecast or a crop-specific probability of damage.",
    unavailable: "Climate data could not be loaded. Crop cycles are still available.", cached: "Using saved climate data for this location.",
    water: "Approximate gross water demand for seven days", waterNote: "Historical estimate based on ET0, crop stage and irrigation efficiency; excludes rainfall and does not represent your water allocation. It is not an irrigation instruction.",
    noRotation: "No rotations available.", noActive: "No crops are scheduled this week.",
  };
  const [rotationId, setRotationId] = useState<string | null>(null);
  const [view, setView] = useState<"cycle" | "months">("cycle");
  const rotation = farm.rotations.find((r) => r.id === rotationId) ?? farm.rotations.find((r) => r.isCurrent) ?? farm.rotations[0];
  const now = useToday();
  const today = now ? dayOfYear(now) : null;
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "short" });
  const fmtMonthLong = new Intl.DateTimeFormat(locale, { month: "long" });
  const fmtDay = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });

  const outlook = climate && rotation && today !== null ? weekOutlook(rotation.crops, climate.weeks, farm.irrigation, farm.soilTexture, today) : null;
  const active = today !== null && rotation ? rotation.crops.map((crop) => cropOnDay(crop, today)).filter((crop) => crop !== null) : [];
  const anyFrost = climate?.weeks.some((w) => w.pFrost > 0);
  const anyHeat = climate?.weeks.some((w) => w.pHeat > 0);
  const maxEt0 = climate ? Math.max(...climate.weeks.map((w) => w.et0MeanMm)) : 1;
  const currentCrop = active[0];
  const cropProgress = currentCrop && !CROPS[currentCrop.cropId]?.perennial ? Math.min(100, Math.round((currentCrop.dayInCycle / cycleDays(currentCrop.cropId)) * 100)) : null;
  const nextSowing = today === null ? undefined : rotation?.crops.filter((c) => CROPS[c.cropId] && !CROPS[c.cropId].perennial).map((c) => ({ ...c, inDays: (MONTH_START[c.sowMonth - 1] - today + 365) % 365 })).sort((a, b) => a.inDays - b.inDays)[0];
  const nextText = nextSowing ? `${es ? "Preparar siembra de" : "Prepare to plant"} ${cropName(nextSowing.cropId, locale)}` : es ? "Revisar el plan de cultivo" : "Review the crop plan";
  const week = climate && today !== null ? climate.weeks[weekOf(today)] : null;

  return (
    <div className="ui-page">
      <PageHeader icon={CalendarDays} kicker={es ? "CALENDARIO AGRÍCOLA" : "FARM CALENDAR"} title={es ? "Mi calendario agrícola" : "My farm calendar"} subtitle={copy.subtitle}>
        <HeroStat icon={Sun} label={es ? "HOY" : "TODAY"}><span className="capitalize">{now ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(now) : "—"}</span></HeroStat>
        <HeroStat icon={Sprout} label={es ? "EN EL CAMPO" : "IN THE FIELD"} tone="lime">{currentCrop ? cropName(currentCrop.cropId, locale) : "—"}</HeroStat>
      </PageHeader>

      <div className="rotation-tabs" role="tablist" aria-label={es ? "Seleccionar rotación" : "Select rotation"}>
        {farm.rotations.map((r, i) => (
          <button key={r.id} type="button" role="tab" aria-selected={r.id === rotation?.id} onClick={() => setRotationId(r.id)} className={r.id === rotation?.id ? "active" : ""} style={{ "--accent": rotationColor(i) } as React.CSSProperties}>
            <i />{r.name}{r.isCurrent && <small>{es ? "Actual" : "Current"}</small>}
          </button>
        ))}
      </div>
      {!rotation && <p className="ui-alert tone-neutral"><Info size={16} />{copy.noRotation}</p>}

      <div className="calendar-layout">
        <div className="calendar-left">
          <div className="calendar-summary">
        <Reveal>
          <Panel kicker={es ? "CULTIVO EN ESTA FECHA" : "CROP AT THIS TIME"} icon={Sprout} className="cal-card">
            {currentCrop ? (
              <div className="crop-now" style={{ "--accent": cropColor(currentCrop.cropId) } as React.CSSProperties}>
                <span className="crop-now-icon"><CropIcon crop={currentCrop.cropId} size={38} /></span>
                <div className="min-w-0">
                  <h3>{active.map((c) => cropName(c.cropId, locale)).join(" · ")}</h3>
                  <p>{CROPS[currentCrop.cropId]?.perennial ? copy.allYear : t(`calendario.stage.${currentCrop.stage}`)}</p>
                </div>
              </div>
            ) : (
              <p className="ui-hint"><Info size={15} />{today === null ? "…" : copy.noActive}</p>
            )}
            {cropProgress !== null && currentCrop && (
              <div className="crop-progress">
                <div><span>{es ? "Progreso aproximado del ciclo" : "Approximate cycle progress"}</span><b><CountUp value={cropProgress} format={(v) => `${Math.round(v)}%`} /></b></div>
                <Meter value={cropProgress / 100} color={cropColor(currentCrop.cropId)} height={9} />
              </div>
            )}
          </Panel>
        </Reveal>

        <Reveal delay={80}>
          <Panel kicker={es ? "PRÓXIMA ACCIÓN" : "NEXT ACTION"} icon={CalendarRange} className="cal-card cal-next">
            <div className="crop-now" style={{ "--accent": nextSowing ? cropColor(nextSowing.cropId) : "#63def2" } as React.CSSProperties}>
              <span className="crop-now-icon">{nextSowing ? <CropIcon crop={nextSowing.cropId} size={38} /> : <CalendarRange size={32} />}</span>
              <div className="min-w-0">
                <h3>{nextText}</h3>
                <p>{nextSowing ? <>{copy.sow}: <span className="capitalize">{fmtMonthLong.format(new Date(2025, nextSowing.sowMonth - 1, 1))}</span> · {es ? `en unos ${nextSowing.inDays} días` : `in about ${nextSowing.inDays} days`}</> : copy.allYear}</p>
              </div>
            </div>
            <a href="#annual-calendar" className="ui-btn ui-btn-ghost ui-btn-sm self-start">{es ? "Ver calendario" : "View calendar"}<ArrowDown size={14} /></a>
          </Panel>
        </Reveal>

          </div>
        <Reveal delay={90}>
          <Panel
            id="annual-calendar"
            kicker={es ? "52 SEMANAS" : "52 WEEKS"}
            icon={CalendarDays}
            title={es ? "Calendario de rotación anual" : "Annual rotation calendar"}
            actions={<Segmented size="sm" value={view} onChange={setView} label={es ? "Vista" : "View"} options={[{ value: "cycle", label: es ? "Ciclo" : "Cycle" }, { value: "months", label: es ? "Meses" : "Months" }]} />}
          >
            <p className="ui-hint"><Info size={14} />{copy.timing}</p>
            <div className="cal-scroll">
              <div className="year-calendar" key={`${rotation?.id}-${view}`}>
                <div className="year-calendar-months">
                  {MONTH_START.map((_, m) => <span key={m}>{fmtMonth.format(new Date(2025, m, 1))}</span>)}
                </div>

                {rotation?.crops.map((rc, i) => {
                  const color = cropColor(rc.cropId);
                  const known = CROPS[rc.cropId] && Number.isInteger(rc.sowMonth) && rc.sowMonth >= 1 && rc.sowMonth <= 12;
                  return (
                    <div key={`${rc.cropId}-${i}`} className="cal-row">
                      <div className="cal-label-col">
                        <span className="cal-label"><CropIcon crop={rc.cropId} size={16} style={{ color }} />{cropName(rc.cropId, locale)}{CROPS[rc.cropId]?.fixesNitrogen && <em title={es ? "Fija nitrógeno" : "Fixes nitrogen"}>N</em>}</span>
                        {view === "cycle" && <small className="cal-detail">{!known ? copy.unknown : CROPS[rc.cropId].perennial ? (es ? "Todo el año" : "Year-round") : `${copy.sow}: ${fmtMonth.format(new Date(2025, rc.sowMonth - 1, 1))} · ${cycleDays(rc.cropId)} ${copy.days}`}</small>}
                      </div>
                      <div className="cal-track">
                        {cropSegments(rc).map((s, j) => (
                          <div key={j} className="cal-segment" style={{ left: `${(s.start / 365) * 100}%`, width: `${((s.end - s.start) / 365) * 100}%`, background: `linear-gradient(90deg, color-mix(in srgb, ${color} 55%, transparent), ${color})`, animationDelay: `${i * 120 + j * 60}ms` }}>
                            {view === "cycle" && s.stageBreaks.map((b) => <span key={b} style={{ left: `${((b - s.start) / (s.end - s.start)) * 100}%` }} />)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {climate && (
                  <div className="cal-climate">
                    <HeatRow icon={FrostIcon} label={t("calendario.frostRow")} values={climate.weeks.map((w) => heat(w.pFrost, "#5cc8f5"))} empty={!anyFrost ? t("calendario.never") : undefined} />
                    <HeatRow icon={HeatIcon} label={t("calendario.heatRow")} values={climate.weeks.map((w) => heat(w.pHeat, "#ff6b6b"))} empty={!anyHeat ? t("calendario.never") : undefined} />
                    <HeatRow icon={WaterIcon} label={t("calendario.et0Row")} values={climate.weeks.map((w) => heat(w.et0MeanMm / maxEt0, "#63def2"))} />
                    {climate.weeks[0]?.soilWetness !== undefined && (
                      <HeatRow icon={SoilIcon} label={t("calendario.soilRow")} values={climate.weeks.map((w) => heat(Math.max(0, Math.min(1, ((w.soilWetness ?? 0.3) - 0.3) / 0.4)), "#b9ff63"))} />
                    )}
                  </div>
                )}

                {today !== null && (
                  <div className="cal-today" style={{ left: `calc(var(--cal-label) + (100% - var(--cal-label)) * ${today / 365})` }}>
                    <span>{t("calendario.today")}</span>
                  </div>
                )}
              </div>
            </div>
            <p className="ui-source"><Database size={11} className="mr-1 inline" />{t("calendario.source")}</p>
          </Panel>
        </Reveal>
        </div>
        <div className="calendar-right">
        <Reveal>
          <Panel kicker={es ? "12 MESES" : "12 MONTHS"} icon={Sprout} title={es ? "Tu rotación anual" : "Your annual rotation"}>
            <p className="ui-hint">{es ? "Distribución de cultivos por mes" : "Crop schedule by month"}</p>
            <RotationWheel crops={rotation?.crops ?? []} locale={locale} today={today} />
          </Panel>
        </Reveal>
        <Reveal delay={160}>
          <Panel kicker={now ? fmtDay.format(now).toUpperCase() : (es ? "ESTA SEMANA" : "THIS WEEK")} icon={CloudSun} title={copy.historical} className="cal-card">
            {!climateResult ? (
              <div className="week-skeleton"><span className="ui-skeleton" /><span className="ui-skeleton" /></div>
            ) : !week ? (
              <p role="status" className="ui-alert tone-warn"><CloudOff size={16} />{copy.unavailable}</p>
            ) : (
              <>
                {climateResult.cached && <p className="ui-hint"><RefreshCw size={14} />{copy.cached}</p>}
                <div className="week-stats cols-2">
                  <div className="tone-sky"><FrostIcon size={18} /><small>{copy.frost}</small><strong>{pct.format(week.pFrost)}</strong></div>
                  <div className="tone-amber"><HeatIcon size={18} /><small>{copy.heat}</small><strong>{pct.format(week.pHeat)}</strong></div>
                </div>
                {outlook && active.length > 0 && (
                  <div className="water-insight">
                    <div>
                      <small>{copy.water}</small>
                      <strong><CountUp value={outlook.waterM3ha} format={(v) => n.format(v)} /> <em>m³/ha</em></strong>
                    </div>
                    <p>{copy.waterNote}</p>
                  </div>
                )}
                <p className="ui-source">{copy.disclaimer}</p>
              </>
            )}
          </Panel>
        </Reveal>
        </div>
      </div>
    </div>
  );
}

/** Rueda de 12 meses: cada sector toma el color del cultivo presente a mitad de mes. */
function RotationWheel({ crops, locale, today }: { crops: { cropId: string; sowMonth: number }[]; locale: "es" | "en"; today: number | null }) {
  const es = locale === "es";
  // coordenadas redondeadas: el servidor y el navegador deben generar exactamente el mismo SVG
  const point = (angle: number, radius: number) => [(140 + radius * Math.sin(angle)).toFixed(2), (140 - radius * Math.cos(angle)).toFixed(2)];
  const fmt = new Intl.DateTimeFormat(locale, { month: "short" });
  const currentMonth = today === null ? -1 : MONTH_START.reduce((acc, start, m) => (today >= start ? m : acc), 0);
  const used = Array.from(new Set(crops.map((c) => c.cropId)));
  const center = today === null ? null : crops.map((c) => cropOnDay(c, today)).find((c) => c !== null);

  return (
    <>
      <div className="wheel">
        <svg viewBox="0 0 280 280" role="img" aria-label={es ? "Ciclo anual aproximado, de enero a diciembre en sentido horario" : "Approximate annual cycle, January to December clockwise"}>
          {MONTH_START.map((start, month) => {
            const candidates = crops.map((crop) => ({ crop, day: cropOnDay(crop, start + 14) })).filter((item) => item.day).sort((a, b) => b.day!.kc - a.day!.kc);
            const cropId = candidates[0]?.crop.cropId;
            const a = (month / 12) * Math.PI * 2;
            const b = ((month + 1) / 12) * Math.PI * 2;
            const p = point(a, 132);
            const q = point(b, 132);
            const label = point((a + b) / 2, 106);
            const isNow = month === currentMonth;
            return (
              <g key={month} className="wheel-sector" style={{ animationDelay: `${month * 45}ms` }}>
                <path d={`M140 140 L${p[0]} ${p[1]} A132 132 0 0 1 ${q[0]} ${q[1]} Z`} fill={cropId ? cropColor(cropId) : "rgba(255,255,255,.06)"} fillOpacity={cropId ? (isNow ? 1 : 0.62) : 1} stroke="#0b2230" strokeWidth="3" />
                <text x={label[0]} y={label[1]} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight={isNow ? 800 : 600} fill={cropId ? "#0a2216" : "#8aa5ad"}>{fmt.format(new Date(2025, month, 1))}</text>
              </g>
            );
          })}
          <circle cx="140" cy="140" r="70" fill="#0b2230" stroke="rgba(136,214,224,.22)" strokeWidth="1.5" />
        </svg>
        <div className="wheel-center">
          <span style={{ color: center ? cropColor(center.cropId) : "var(--muted)" }}><CropIcon crop={center?.cropId ?? null} size={30} /></span>
          <small>{es ? "Rotación" : "Rotation"}</small>
          <strong>{es ? "1 año" : "1 year"}</strong>
        </div>
      </div>
      <ul className="wheel-legend">
        {used.map((cropId) => (
          <li key={cropId}><i style={{ background: cropColor(cropId) }} /><CropIcon crop={cropId} size={17} />{cropName(cropId, locale)}</li>
        ))}
      </ul>
      <p className="ui-source">{es ? "Vista aproximada a mitad de cada mes. Si hay solapamiento, se muestra el cultivo de mayor demanda relativa de agua." : "Approximate mid-month view. Overlapping crops show the crop with the highest relative water demand."}</p>
    </>
  );
}

function HeatRow({ icon: Icon, label, values, empty }: { icon: (p: { size?: number }) => React.JSX.Element; label: string; values: string[]; empty?: string }) {
  return (
    <div className="cal-row">
      <span className="cal-label muted"><Icon size={14} />{label}{empty && <em className="ok">{empty}</em>}</span>
      <div className="heat-row" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
        {values.map((v, i) => <span key={i} style={{ background: v, animationDelay: `${i * 12}ms` }} />)}
      </div>
    </div>
  );
}
