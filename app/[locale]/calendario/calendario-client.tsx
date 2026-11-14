"use client";

import "./calendar.css";

import { useEffect, useState } from "react";
import { CalendarDays, Check, CloudSun, Leaf, MapPin, Sprout } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import type { ClimateResponse } from "@/lib/contract";
import { CROPS, MONTH_START, cropName, cropOnDay, cropSegments, cycleDays, dayOfYear, weekOf, weekOutlook } from "@/lib/crop-calendar";
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
  return p <= 0 ? "var(--background)" : `color-mix(in srgb, ${color} ${Math.round(20 + p * 80)}%, var(--background))`;
}

export function CalendarioClient() {
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const climateResult = useClimate(farm.lat, farm.lon);
  const climate = climateResult?.data;
  const copy = locale === "es" ? {
    subtitle: "Revisa el ciclo aproximado de los cultivos de tu rotación y el clima histórico de la parcela.",
    timing: "Las fechas son aproximadas: solo se conoce el mes de siembra y las duraciones deben validarse localmente.",
    sow: "Siembra", duration: "duración aproximada", days: "días", unknown: "Cultivo sin datos de duración", allYear: "Cultivo perenne: presente todo el año; los cortes no están programados.",
    historical: "Clima histórico de esta semana", frost: "Años con mínima ≤ 2 °C", heat: "Años con máxima ≥ 30 °C", disclaimer: "Datos históricos de 2005–2025. Porcentaje de años con al menos un día que superó el umbral general en esta semana. No es pronóstico ni probabilidad de daño para un cultivo.",
    unavailable: "No se pudieron cargar los datos climáticos. Los ciclos de cultivo siguen disponibles.", cached: "Usando datos climáticos guardados para esta ubicación.", loading: "Cargando datos climáticos…",
    water: "Demanda bruta aproximada de agua para siete días", waterNote: "Estimación histórica basada en ET0, etapa del cultivo y eficiencia de riego; no incluye lluvia ni indica el agua asignada. No es una instrucción de riego.",
    noRotation: "No hay rotaciones disponibles.", active: "Cultivos según la rotación esta semana", noActive: "No hay cultivos programados esta semana.",
  } : {
    subtitle: "Review approximate crop cycles in your rotation and historical climate for the parcel.",
    timing: "Dates are approximate: only the planting month is known and durations require local validation.",
    sow: "Planting", duration: "approximate duration", days: "days", unknown: "Crop duration unavailable", allYear: "Perennial crop: present year-round; cuttings are not scheduled.",
    historical: "Historical climate this week", frost: "Years with low ≤ 2 °C", heat: "Years with high ≥ 30 °C", disclaimer: "Historical data from 2005–2025. Percentage of years with at least one day reaching the general threshold in this week. This is not a forecast or a crop-specific probability of damage.",
    unavailable: "Climate data could not be loaded. Crop cycles are still available.", cached: "Using saved climate data for this location.", loading: "Loading climate data…",
    water: "Approximate gross water demand for seven days", waterNote: "Historical estimate based on ET0, crop stage and irrigation efficiency; excludes rainfall and does not represent your water allocation. It is not an irrigation instruction.",
    noRotation: "No rotations available.", active: "Crops scheduled this week", noActive: "No crops are scheduled this week.",
  };
  const [rotationId, setRotationId] = useState<string | null>(null);
  const [view, setView] = useState<"cycle" | "months">("cycle");
  const rotation = farm.rotations.find((r) => r.id === rotationId) ?? farm.rotations.find((r) => r.isCurrent) ?? farm.rotations[0];
  const now = useToday();
  const today = now ? dayOfYear(now) : null;
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "short" });
  const fmtDay = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" });

  const outlook = climate && rotation && today !== null ? weekOutlook(rotation.crops, climate.weeks, farm.irrigation, farm.soilTexture, today) : null;
  const active = today !== null && rotation ? rotation.crops.map((crop) => cropOnDay(crop, today)).filter((crop) => crop !== null) : [];
  const anyFrost = climate?.weeks.some((w) => w.pFrost > 0);
  const anyHeat = climate?.weeks.some((w) => w.pHeat > 0);
  const maxEt0 = climate ? Math.max(...climate.weeks.map((w) => w.et0MeanMm)) : 1;
  const currentCrop = active[0];
  const cropProgress = currentCrop && !CROPS[currentCrop.cropId]?.perennial ? Math.min(100, Math.round(currentCrop.dayInCycle / cycleDays(currentCrop.cropId) * 100)) : null;
  const nextSowing = today === null ? undefined : rotation?.crops.filter((c) => CROPS[c.cropId] && !CROPS[c.cropId].perennial).map((c) => ({ ...c, inDays: (MONTH_START[c.sowMonth - 1] - today + 365) % 365 })).sort((a, b) => a.inDays - b.inDays)[0];
  const nextText = nextSowing ? `${locale === "es" ? "Preparar siembra de" : "Prepare to plant"} ${cropName(nextSowing.cropId, locale)}` : locale === "es" ? "Revisar el plan de cultivo" : "Review the crop plan";

  return (
    <div className="farmer-calendar mx-auto flex max-w-[1380px] flex-col gap-5">
      <header className="relative isolate overflow-hidden rounded-[24px] bg-[#e9f3ee] px-6 py-6 sm:px-8 sm:py-7" style={{ backgroundImage: "linear-gradient(90deg, rgba(242,248,238,.99) 0%, rgba(242,248,238,.9) 32%, rgba(242,248,238,.2) 75%), url('/images/majes-fields.png')", backgroundSize: "cover", backgroundPosition: "center 57%" }}>
        <div className="relative max-w-xl">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[#397052]"><MapPin size={14} /> {locale === "es" ? "Tu parcela · Majes, Arequipa" : "Your parcel · Majes, Arequipa"}</p>
          <h1 className="text-[2rem] font-bold leading-[1.08] tracking-[-.045em] text-[#173a30] sm:text-5xl">{locale === "es" ? "Mi calendario agrícola" : "My farm calendar"}</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#496b60] sm:text-base">{copy.subtitle}</p>
        </div>
      </header>

      <section aria-label={locale === "es" ? "Seleccionar rotación" : "Select rotation"} className="rounded-[22px] border border-[#e0ebe2] bg-white p-4 shadow-[0_8px_24px_rgba(31,73,48,.04)] sm:flex sm:items-center sm:gap-5 sm:px-6">
        <div className="mb-3 flex shrink-0 items-center gap-3 sm:mb-0 sm:border-r sm:border-[#e4eee5] sm:pr-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf5e9] text-[#428e55]"><Leaf size={19} /></span>
          <div><p className="text-sm font-bold text-[#254a35]">{locale === "es" ? "Tus cultivos" : "Your crops"}</p><p className="text-xs text-[#799083]">{locale === "es" ? "Elige tu plan de siembra" : "Choose your planting plan"}</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
        {farm.rotations.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={r.id === rotation?.id}
            onClick={() => setRotationId(r.id)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 py-2 text-left text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#277e52] ${r.id === rotation?.id ? "border-[#267e4d] bg-[#e9f5e9] text-[#21673d]" : "border-[#e1ebe3] bg-[#fafcf9] text-[#526f5c] hover:border-[#9bc5a6] hover:bg-[#f1f8ef]"}`}
          >
            {r.id === rotation?.id && <Check size={15} strokeWidth={2.5} aria-hidden="true" />}
            <span>{r.name}</span>
            {r.isCurrent && <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-[#64816d]">{locale === "es" ? "Actual" : "Current"}</span>}
          </button>
        ))}
        </div>
      </section>
      {!rotation && <p>{copy.noRotation}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-[24px] border border-[#e0ebe2] bg-white p-6 shadow-[0_12px_35px_rgba(31,73,48,.07)] sm:p-7">
        <div className="flex items-start gap-4">
          <div aria-hidden="true" className="order-2 grid h-20 w-20 shrink-0 place-items-center text-6xl drop-shadow-md">{cropEmoji(currentCrop?.cropId ?? "")}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#476453]">{locale === "es" ? "Cultivo en esta fecha" : "Crop at this time"}</p>
            {currentCrop ? <><h2 className="mt-1 text-2xl font-bold tracking-tight text-[#173a30] sm:text-3xl">{active.map((c) => cropName(c.cropId, locale)).join(" · ")}</h2><p className="mt-1 text-sm text-[#71867a]">{CROPS[currentCrop.cropId]?.perennial ? copy.allYear : t(`calendario.stage.${currentCrop.stage}`)}</p></> : <p className="mt-2 text-base font-semibold text-[#315846]">{today === null ? "…" : copy.noActive}</p>}
          </div>
        </div>
        {cropProgress !== null && <div className="mt-6"><div className="mb-2 flex justify-between text-xs font-semibold text-[#547262]"><span>{locale === "es" ? "Progreso aproximado del ciclo" : "Approximate cycle progress"}</span><span>{cropProgress}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-[#e9efe9]"><div className="h-full rounded-full bg-[#53a75f]" style={{ width: `${cropProgress}%` }} /></div></div>}
      </section>
      <section className="flex flex-col justify-center rounded-[24px] border border-[#e0ebe2] bg-white p-4 shadow-[0_12px_35px_rgba(31,73,48,.07)]">
        <div className="flex h-full gap-3 rounded-2xl bg-gradient-to-br from-[#eff7e8] to-[#e0efd7] p-5"><CalendarDays className="shrink-0 text-[#408d48]" size={25} /><div><p className="text-xs font-semibold text-[#57735c]">{locale === "es" ? "Próxima acción" : "Next action"}</p><h2 className="mt-1 text-lg font-bold leading-tight text-[#173a30]">{nextText}</h2><p className="mt-2 text-xs leading-relaxed text-[#5f7866]">{nextSowing ? `${copy.sow}: ${fmtMonth.format(new Date(2025, nextSowing.sowMonth - 1, 1))}` : copy.allYear}</p><a href="#annual-calendar" className="mt-4 inline-flex min-h-9 items-center gap-2 text-xs font-bold text-[#267344]">{locale === "es" ? "Ver calendario →" : "View calendar →"}</a></div></div>
      </section>
      <section className="flex flex-col gap-3 rounded-[24px] border border-[#e0ebe2] bg-white p-6 shadow-[0_12px_35px_rgba(31,73,48,.07)] sm:p-7">
        <h2 className="text-lg font-semibold">
          <span className="flex items-center gap-2 text-[#173a30]"><CloudSun className="text-[#4da879]" size={22} /> {copy.historical}</span>
          <span className="mt-1 block text-xs font-normal text-muted">{now ? fmtDay.format(now) : ""}</span>
        </h2>
        {!climateResult ? <p className="text-sm text-muted">{copy.loading}</p> : !climate ? <p role="status" className="text-sm text-muted">{copy.unavailable}</p> : today !== null && (
          <div className="flex flex-col gap-1 text-sm">
            {climateResult.cached && <p>{copy.cached}</p>}
            <div className="grid grid-cols-2 gap-3 py-2"><div className="rounded-2xl bg-[#eef7f7] p-3"><span className="block text-xs text-[#64817d]">{copy.frost}</span><strong className="mt-1 block text-xl text-[#245d66]">{pct.format(climate.weeks[weekOf(today)].pFrost)}</strong></div><div className="rounded-2xl bg-[#fbf4e9] p-3"><span className="block text-xs text-[#927b5a]">{copy.heat}</span><strong className="mt-1 block text-xl text-[#9b6941]">{pct.format(climate.weeks[weekOf(today)].pHeat)}</strong></div></div>
            <p className="text-xs text-muted">{copy.disclaimer}</p>
            {outlook && active.length > 0 && <><p>{copy.water}: {n.format(outlook.waterM3ha)} m³/ha</p><p className="text-xs text-muted">{copy.waterNote}</p></>}
          </div>
        )}
      </section>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[24px] border border-[#e0ebe2] bg-white p-5 shadow-[0_12px_35px_rgba(31,73,48,.07)]">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#173a30]"><Sprout size={22} className="text-[#398c53]" />{locale === "es" ? "Tu rotación anual" : "Your annual rotation"}</h2>
          <p className="mt-1 text-xs text-muted">{locale === "es" ? "Distribución de cultivos por mes" : "Crop schedule by month"}</p>
          <RotationWheel crops={rotation?.crops ?? []} locale={locale} />
        </aside>
      <div className="flex min-w-0 flex-col gap-4">
      <section id="annual-calendar" className="flex scroll-mt-6 flex-col gap-6 rounded-[24px] border border-[#e0ebe2] bg-white p-6 shadow-[0_12px_35px_rgba(31,73,48,.07)] sm:p-7">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e9f5e9] text-[#398c53]"><CalendarDays size={22} /></div>
          <div><h2 className="text-xl font-bold tracking-tight text-[#173a30]">{locale === "es" ? "Calendario de rotación anual" : "Annual rotation calendar"}</h2>
          <p className="text-xs text-muted">{copy.timing}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 self-start rounded-full border border-[#dce8dc] bg-[#f3f7f1] p-1">{(["cycle", "months"] as const).map((mode) => <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)} className={`min-h-9 rounded-full px-4 text-xs font-semibold ${view === mode ? "bg-[#2d8145] text-white shadow-sm" : "text-[#58715e]"}`}>{mode === "cycle" ? locale === "es" ? "Vista del ciclo" : "Cycle view" : locale === "es" ? "Vista por meses" : "Monthly view"}</button>)}</div>

        <div className="overflow-x-auto pb-2"><div className="relative flex min-w-[570px] flex-col gap-4">
          <div className="grid grid-cols-12 gap-1 text-center text-[11px] font-semibold capitalize text-[#698375]">
            {MONTH_START.map((_, m) => (
              <span key={m} className="rounded-lg bg-[#f3f7f2] py-2">{fmtMonth.format(new Date(2025, m, 1))}</span>
            ))}
          </div>

          {rotation?.crops.map((rc, i) => (
            <div key={`${rc.cropId}-${i}`} className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-[#274b39]">
                <Leaf size={14} className="text-[#66a86f]" />
                {cropName(rc.cropId, locale)}
              </span>
              {view === "cycle" && <span className="text-xs text-muted">{!CROPS[rc.cropId] || !Number.isInteger(rc.sowMonth) || rc.sowMonth < 1 || rc.sowMonth > 12 ? copy.unknown : CROPS[rc.cropId].perennial ? copy.allYear : `${copy.sow}: ${fmtMonth.format(new Date(2025, rc.sowMonth - 1, 1))} · ${copy.duration}: ${cycleDays(rc.cropId)} ${copy.days}`}</span>}
              <div className="relative h-7 rounded-lg bg-[#f2f6f1]">
                {cropSegments(rc).map((s, j) => (
                  <div
                    key={j}
                    className="absolute inset-y-0 overflow-hidden rounded-lg opacity-80"
                    style={{ left: `${(s.start / 365) * 100}%`, width: `${((s.end - s.start) / 365) * 100}%`, background: FAMILY_COLOR[CROPS[rc.cropId]?.family] ?? "var(--brand)" }}
                  >
                    {view === "cycle" && s.stageBreaks.map((b) => (
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
        </div></div>
      </section>
      <div className="flex items-center gap-4 rounded-[24px] border border-[#dcebd7] bg-gradient-to-r from-[#e3f1d9] to-[#f6faf1] p-5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#d3eabc] text-[#3d8c38]"><Sprout size={29} /></span><div><h2 className="text-lg font-bold text-[#173a30]">{locale === "es" ? "¿Qué sigue?" : "What's next?"}</h2><p className="text-sm text-[#4b6b51]">{nextText}{nextSowing ? ` · ${fmtMonth.format(new Date(2025, nextSowing.sowMonth - 1, 1))}` : ""}</p></div></div>
      </div></div>

    </div>
  );
}

function cropEmoji(id: string) {
  return ({ papa: "🥔", cebolla: "🧅", maiz_chala: "🌽", haba: "🫛", alfalfa: "🌿" } as Record<string, string>)[id] ?? "🌱";
}

function RotationWheel({ crops, locale }: { crops: { cropId: string; sowMonth: number }[]; locale: "es" | "en" }) {
  const colors = ["#b7db96", "#dbc0e7", "#f7dc79", "#b5ded1", "#f0bf9b"];
  const point = (angle: number, radius: number) => [140 + radius * Math.sin(angle), 140 - radius * Math.cos(angle)];
  return <>
    <svg viewBox="0 0 280 280" className="mx-auto my-3 w-full max-w-[300px]" role="img" aria-label={locale === "es" ? "Ciclo anual aproximado, de enero a diciembre en sentido horario" : "Approximate annual cycle, January to December clockwise"}>
      {MONTH_START.map((start, month) => {
        const candidates = crops.map((crop, index) => ({ index, day: cropOnDay(crop, start + 14) })).filter((item) => item.day).sort((a, b) => b.day!.kc - a.day!.kc);
        const index = candidates[0]?.index;
        const a = month / 12 * Math.PI * 2;
        const b = (month + 1) / 12 * Math.PI * 2;
        const p = point(a, 130); const q = point(b, 130); const label = point((a + b) / 2, 108);
        return <g key={month}><path d={`M140 140 L${p[0]} ${p[1]} A130 130 0 0 1 ${q[0]} ${q[1]} Z`} fill={index === undefined ? "#edf1e9" : colors[index % colors.length]} stroke="white" strokeWidth="2" /><text x={label[0]} y={label[1]} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#36533d">{new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(2025, month, 1))}</text></g>;
      })}
      <circle cx="140" cy="140" r="72" fill="#fcfdf8" stroke="white" strokeWidth="5" />
      <text x="140" y="130" textAnchor="middle" fontSize="27">🌱</text>
      <text x="140" y="153" textAnchor="middle" fontSize="13" fill="#527057">{locale === "es" ? "Rotación" : "Rotation"}</text>
      <text x="140" y="176" textAnchor="middle" fontSize="23" fontWeight="700" fill="#173a30">{locale === "es" ? "1 año" : "1 year"}</text>
    </svg>
    <div className="flex flex-col gap-2">{crops.map((crop, index) => <div key={`${crop.cropId}-${index}`} className="flex items-center gap-2 rounded-xl bg-[#f8faf5] px-3 py-2 text-xs font-semibold text-[#3c5b43]"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[index % colors.length] }} /><span aria-hidden="true" className="text-xl">{cropEmoji(crop.cropId)}</span>{cropName(crop.cropId, locale)}</div>)}</div>
    <p className="mt-3 text-[10px] leading-relaxed text-muted">{locale === "es" ? "Vista aproximada a mitad de cada mes. Si hay solapamiento, se muestra el cultivo de mayor demanda relativa de agua." : "Approximate mid-month view. Overlapping crops show the crop with the highest relative water demand."}</p>
  </>;
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
