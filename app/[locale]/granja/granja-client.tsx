"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import type { Irrigation, SimulateRequest, SimulateResponse, SoilTexture } from "@/lib/contract";
import { cropName, efficiency } from "@/lib/crop-calendar";
import { setFarm, useFarm } from "@/lib/farm-store";
import { FARM_SIZES, resizeFarm, setGranja, useGranja } from "@/lib/granja-store";
import {
  BASELINE_ID,
  LENS_RAMP,
  buildPalette,
  evaluateGoals,
  lensColor,
  notableYears,
  rotationColor,
  simulateYear,
  tileFactors,
  type Lens,
  type TileState,
} from "@/lib/granja-sim";
import { useSimulation } from "@/lib/use-simulation";
import { SKY_GRADIENT, type Weather } from "@/components/granja/farm-scene";
import { Celebration, Tutorial, playCoin } from "@/components/granja/overlays";
import { Reveal } from "@/components/motion/reveal";
import { LoadingOrbit, PageHeader, Panel, RangeInput } from "@/components/ui/kit";
import { Droplets, Gamepad2, MapPin, Sprout, Tractor, Waves } from "lucide-react";

const FarmScene = dynamic(() => import("@/components/granja/farm-scene"), {
  ssr: false,
  loading: () => <div className="farm-scene-loading"><Tractor size={42} /></div>,
});
const ParcelMap = dynamic(() => import("@/components/map/parcel-map"), {
  ssr: false,
  loading: () => <div className="map-skeleton ui-skeleton" />,
});

const fallbackGranja = () => import("@/data/mock_granja.json").then((m) => m.default as unknown as SimulateResponse);
const STEP_MS = 1300;
const TAG_ICON = { driest: DroughtIcon, frost: FrostIcon, heat: HeatIcon, wettest: WaterIcon } as const;
const LENSES: { id: Lens; Icon: (p: { size?: number }) => React.JSX.Element }[] = [
  { id: "crop", Icon: (p) => <CropIcon crop="maiz_chala" {...p} /> },
  { id: "water", Icon: WaterIcon },
  { id: "temp", Icon: ThermoIcon },
  { id: "soil", Icon: SoilIcon },
  { id: "income", Icon: ProfitIcon },
];
type Tab = "sow" | "climate" | "whatif" | "goals";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
const webglStore = { sub: () => () => {}, get: () => hasWebGL(), server: () => true };
const demoStore = { sub: () => () => {}, get: () => new URLSearchParams(window.location.search).has("demo"), server: () => false };
// ?shot: capturas automáticas (sin tutorial)
const shotStore = { sub: () => () => {}, get: () => new URLSearchParams(window.location.search).has("shot"), server: () => false };

export function GranjaClient() {
  const granja = useGranja();
  // ?demo abre la granja directamente (útil para el pitch)
  const demo = useSyncExternalStore(demoStore.sub, demoStore.get, demoStore.server);
  return granja.zoneSet || demo ? <Farm /> : <ZoneStep />;
}

// ---------------------------------------------------------------- paso 1: zona

function ZoneStep() {
  const t = useT();
  const farm = useFarm();
  const granja = useGranja();
  const ha = granja.tiles.length * granja.haPerTile;

  const es = useLocale() === "es";
  return (
    <div className="ui-page">
      <PageHeader icon={Gamepad2} kicker={es ? "MODO GRANJA" : "FARM MODE"} title={t("granja.title")} subtitle={t("granja.zoneHint")} />
      <div className="parcel-layout">
        <Reveal className="parcel-map-col">
          <Panel kicker={es ? "PASO 1" : "STEP 1"} icon={MapPin} title={es ? "Elige tu zona" : "Pick your zone"}>
            <ParcelMap lat={farm.lat} lon={farm.lon} onPick={(lat, lon) => setFarm({ lat, lon })} compact />
          </Panel>
        </Reveal>
        <Reveal delay={90}>
          <Panel kicker={es ? "PASO 2" : "STEP 2"} icon={Tractor} title={t("granja.size")}>
            <div className="option-cards cols-4">
              {FARM_SIZES.map((s) => (
                <button key={s.ha} type="button" onClick={() => resizeFarm(s.ha)} className={`option-card ${Math.abs(ha - s.ha) < 0.01 ? "active" : ""}`}>
                  <b>{s.ha} ha</b>
                  <small>{s.cols * s.rows} {t("granja.tiles")}</small>
                </button>
              ))}
            </div>
            <div className="field-block mt-5">
              <span className="ui-label"><Droplets size={15} />{t("parcela.water")}</span>
              <div className="ui-input-wrap">
                <input type="number" inputMode="numeric" min={0} step={500} value={farm.waterAvailableM3ha} onChange={(e) => setFarm({ waterAvailableM3ha: Number(e.target.value) || 0 })} className="ui-input" />
                <span>m³/ha</span>
              </div>
            </div>
            <div className="field-block">
              <span className="ui-label"><Waves size={15} />{t("parcela.irrigation")}</span>
              <Chips value={farm.irrigation} options={["gravedad", "aspersion", "goteo"] as Irrigation[]} label={(v) => t(`irrigation.${v}`)} onChange={(irrigation) => setFarm({ irrigation })} />
            </div>
            <div className="field-block">
              <span className="ui-label"><Sprout size={15} />{t("parcela.soil")}</span>
              <Chips value={farm.soilTexture} options={["arenoso", "franco", "arcilloso"] as SoilTexture[]} label={(v) => t(`soil.${v}`)} onChange={(soilTexture) => setFarm({ soilTexture })} />
            </div>
            <button type="button" onClick={() => setGranja({ zoneSet: true })} className="ui-btn ui-btn-block ui-btn-lg">
              <Tractor size={20} />{t("granja.build")}
            </button>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}

function Chips<T extends string>({ value, options, label, onChange, small }: { value: T; options: T[]; label: (v: T) => string; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div className="option-cards">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} aria-pressed={o === value} className={`option-card ${small ? "is-small" : ""} ${o === value ? "active" : ""}`}>
          <b>{label(o)}</b>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- paso 2: el gemelo digital

function Farm() {
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const granja = useGranja();
  const webgl = useSyncExternalStore(webglStore.sub, webglStore.get, webglStore.server);
  const shot = useSyncExternalStore(shotStore.sub, shotStore.get, shotStore.server);
  const palette = useMemo(() => buildPalette(farm.rotations), [farm.rotations]);
  const water = Math.round(farm.waterAvailableM3ha * granja.waterFactor);
  const extra = useMemo<Partial<SimulateRequest>>(
    () => ({ includeClimate: true, waterAvailableM3ha: water, scenario: granja.tempDelta ? { tempDeltaC: granja.tempDelta } : undefined }),
    [water, granja.tempDelta],
  );
  const data = useSimulation({ rotations: palette, cacheKey: "farmtwin.granja.sim.v2", fallback: fallbackGranja, extra });

  const [brush, setBrush] = useState<string>("suelo_agua");
  const [month, setMonth] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [lens, setLens] = useState<Lens>("crop");
  const [tab, setTab] = useState<Tab>("sow");
  const [paintMode, setPaintMode] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const history = useRef<string[][]>([]);

  const sim = useMemo(
    () => (data ? simulateYear(data, granja.tiles, granja.haPerTile, granja.year, water, palette) : null),
    [data, granja.tiles, granja.haPerTile, granja.year, water, palette],
  );
  const years = useMemo(() => (data ? notableYears(data) : []), [data]);
  const goals = useMemo(() => (sim ? evaluateGoals(sim.summary, granja.tiles.length) : []), [sim, granja.tiles.length]);
  const finished = month === 11;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setMonth((m) => Math.min(11, m + 1)), STEP_MS);
    return () => clearInterval(id);
  }, [playing]);
  useEffect(() => {
    if (playing && month >= 11) {
      const id = setTimeout(() => setPlaying(false), 0);
      return () => clearTimeout(id);
    }
  }, [playing, month]);

  useEffect(() => {
    if (!finished || playing) return;
    const won = goals.filter((g) => g.done).map((g) => g.id);
    const fresh = won.filter((g) => !granja.badges.includes(g));
    if (fresh.length) setGranja((s) => ({ badges: Array.from(new Set([...s.badges, ...won])), lastWon: fresh }));
  }, [finished, playing, goals, granja.badges]);

  const harvestCount = sim?.months[month]?.harvests.length ?? 0;
  useEffect(() => {
    if (granja.sound && harvestCount > 0 && month > 0) playCoin();
  }, [month, harvestCount, granja.sound]);

  const paint = useCallback(
    (i: number, start: boolean) => {
      setGranja((s) => {
        if (start) history.current = [...history.current.slice(-29), s.tiles];
        if (s.tiles[i] === brush) return {};
        const tiles = [...s.tiles];
        tiles[i] = brush;
        return { tiles };
      });
    },
    [brush],
  );
  const select = useCallback((i: number) => setSelected((cur) => (cur === i ? null : i)), []);
  const undo = () => {
    const prev = history.current.pop();
    if (prev) setGranja({ tiles: prev });
  };

  if (!data || !sim) return <div className="ui-page"><LoadingOrbit label={t("comparar.loading")} /></div>;

  const snap = sim.months[month];
  const reservoir = Math.max(0, 1 - snap.waterUsedM3 / Math.max(snap.waterCapacityM3, 1));
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const n1 = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "long" });
  const fmtMonthShort = new Intl.DateTimeFormat(locale, { month: "narrow" });
  const kinds = snap.events.map((e) => e.kind);
  const weather: Weather = kinds.includes("dry") ? "dry" : kinds.includes("climate_risk") ? "frost" : kinds.includes("water_stress") ? "heat" : "clear";
  const byId = new Map(data.rotations.map((r) => [r.id, r]));
  const yearClimate = data.source.climateByYear?.find((c) => c.year === granja.year);
  const clim = yearClimate?.months[month];

  // factores del gemelo digital por casilla (capas y ficha)
  const factors = snap.tiles.map((tile) => tileFactors(data, tile, granja.year, month, granja.haPerTile, palette));
  const maxWater = Math.max(1, ...factors.map((f) => f.waterM3ha));
  const incomes = factors.map((f) => f.incomeYear);
  const tints = lens === "crop" ? undefined : factors.map((f) => lensColor(lens, f, maxWater, Math.max(...incomes), Math.min(...incomes)));

  const sel = selected !== null ? snap.tiles[selected] : null;
  const selF = selected !== null ? factors[selected] : null;
  const reset = () => {
    setPlaying(false);
    setMonth(0);
  };

  return (
    <div className="farm-twin" style={{ background: SKY_GRADIENT[weather] }}>
      {/* escena */}
      <div className="absolute inset-x-0 top-0 transition-[bottom] duration-300" style={{ bottom: collapsed ? 64 : "44%" }}>
        {webgl ? (
          <FarmScene
            cols={granja.cols}
            rows={granja.rows}
            tiles={snap.tiles}
            reservoir={reservoir}
            weather={weather}
            harvestTiles={snap.harvests.map((h) => h.tile)}
            harvestKey={`${granja.year}-${month}`}
            selectedTile={selected}
            paintMode={paintMode}
            onPaint={paint}
            onSelect={select}
            tints={tints}
          />
        ) : (
          <FlatFarm cols={granja.cols} tiles={snap.tiles} selected={selected} tints={tints} onTap={(i) => (paintMode ? paint(i, true) : select(i))} />
        )}
      </div>

      {/* HUD superior */}
      <div className="farm-hud">
        <div className="hud-card hud-reservoir">
          <div className="flex justify-between gap-2">
            <span>💧 {t("granja.reservoir")}</span>
            <span className={reservoir <= 0 ? "text-[#ff8f8f]" : ""}>{pct.format(reservoir)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${reservoir * 100}%`, background: reservoir < 0.15 ? "var(--danger)" : "#5cc8f5", boxShadow: "0 0 10px rgba(92,200,245,.6)" }} />
          </div>
        </div>
        <div className="hud-card">💰 S/ {n.format(snap.incomePEN)}</div>
        {clim && (
          <div className="hud-card">
            🌡️ {n1.format(clim.tmin)}–{n1.format(clim.tmax)} °C
          </div>
        )}
        <div className="hud-card hud-date capitalize">
          📅 {fmtMonth.format(new Date(granja.year, month, 1))} {granja.year}
          {granja.tempDelta ? <span className="ml-1 text-[#ff8f8f]">({granja.tempDelta > 0 ? "+" : ""}{granja.tempDelta} °C)</span> : null}
        </div>
      </div>

      {/* lentes */}
      <div className="farm-lenses">
        {LENSES.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLens(l.id)}
            title={t(`granja.lens.${l.id}`)}
            aria-pressed={lens === l.id}
            className={`farm-lens ${lens === l.id ? "active" : ""}`}
          >
            <l.Icon size={18} />
            {lens === l.id && <span>{t(`granja.lens.${l.id}`)}</span>}
          </button>
        ))}
        {lens !== "crop" && (
          <div className="farm-lens-legend">
            <div className="h-2 rounded-full" style={{ background: `linear-gradient(90deg,${LENS_RAMP[lens].join(",")})` }} />
            <div className="mt-1 flex justify-between">
              <span>{t(`granja.legend.${lens}.low`)}</span>
              <span>{t(`granja.legend.${lens}.high`)}</span>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setGranja((s) => ({ sound: !s.sound }))}
        aria-label={granja.sound ? "mute" : "sound"}
        className="hud-card hud-sound farm-sound"
      >
        {granja.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>

      {/* panel inferior */}
      <div className="farm-sheet">
        {snap.events.length > 0 && !collapsed && (
          <div className="farm-sheet-event">{t(`granja.event.${snap.events[0].kind}`, { n: snap.events[0].tiles })}</div>
        )}
        {/* tiempo */}
        <div className="flex items-center gap-2 px-3 pt-2">
          <button type="button" onClick={reset} aria-label={t("granja.reset")} className="time-btn farm-tbtn">
            ⏮
          </button>
          <button type="button" onClick={() => setMonth((m) => Math.max(0, m - 1))} aria-label="-1" className="time-btn farm-tbtn">
            ◀
          </button>
          <button
            type="button"
            onClick={() => {
              if (finished) setMonth(0);
              setPlaying((p) => !p);
            }}
            className="ui-btn flex-1 farm-play-btn"
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              {playing ? <Pause size={16} /> : finished ? <RotateCcw size={16} /> : <Play size={16} />}
              {playing ? t("granja.pause") : finished ? t("granja.replay") : t("granja.play")}
            </span>
          </button>
          <button type="button" onClick={() => setMonth((m) => Math.min(11, m + 1))} aria-label="+1" className="time-btn farm-tbtn">
            ▶
          </button>
          <button type="button" onClick={() => setCollapsed((c) => !c)} aria-label="panel" className="time-btn farm-tbtn">
            {collapsed ? "▴" : "▾"}
          </button>
        </div>

        {!collapsed && (
          <>
            {!sel && (
              <div className="mt-2 grid grid-cols-4 gap-1 px-3">
                {(["sow", "climate", "whatif", "goals"] as Tab[]).map((k) => (
                  <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-xl py-1.5 text-xs font-semibold ${tab === k ? "farm-tab active" : "farm-tab"}`}>
                    {t(`granja.tab.${k}`)}
                  </button>
                ))}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2">
              {/* ficha de casilla */}
              {sel && selF && (
                <section className="flex flex-col gap-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-bold">
                        <span className="inline-flex items-center gap-1.5">
                          <CropIcon crop={sel.cropId} size={20} />
                          {sel.cropId ? cropName(sel.cropId, locale) : t("granja.fallow")}
                        </span>
                        {sel.stage && (
                          <span className="ml-2 inline-flex items-center gap-1 text-sm font-medium text-[#2f6b3a]">
                            {(() => {
                              const S = STAGE_ICON[sel.stage];
                              return <S size={16} />;
                            })()}
                            {t(`granja.stage.${sel.stage}`)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        {t("granja.tile")} {selected! + 1} · <span style={{ color: rotationColor(sel.rotationId) }}>●</span> {palette.find((p) => p.id === sel.rotationId)?.name}
                      </div>
                    </div>
                    <button type="button" onClick={() => setSelected(null)} className="h-8 w-8 rounded-full bg-white/[.06]">
                      ✕
                    </button>
                  </div>
                  <p className="rounded-xl bg-[rgba(99,222,242,.07)] text-[#c8dde0] px-3 py-2">
                    <b>{t(`granja.status.${sel.status}`)}:</b> {t(`granja.why.${sel.status}`)}
                  </p>
                  <Factor
                    icon={<ThermoIcon size={18} />}
                    title={t("granja.sheet.temp")}
                    value={
                      selF.tminAbs !== null && selF.frostLimit !== null
                        ? t("granja.sheet.tempValue", { tmin: n1.format(selF.tminAbs), frost: selF.frostLimit, tmax: n1.format(selF.tmaxAbs ?? 0), heat: selF.heatLimit ?? 0 })
                        : "—"
                    }
                    bar={selF.tempStress}
                    bad
                  />
                  <Factor
                    icon={<WaterIcon size={18} />}
                    title={t("granja.sheet.water")}
                    value={t("granja.sheet.waterValue", { m3: n.format(selF.waterM3), m3ha: n.format(selF.waterM3ha), kc: selF.kc !== null ? n1.format(selF.kc) : "—" })}
                    bar={selF.waterM3ha / maxWater}
                  />
                  <Factor
                    icon={<SoilIcon size={18} />}
                    title={t("granja.sheet.soil")}
                    value={t("granja.sheet.soilValue", { soil: pct.format(selF.soilHealth), texture: t(`soil.${farm.soilTexture}`), eff: pct.format(efficiency(farm.irrigation, farm.soilTexture)) })}
                    bar={selF.soilHealth}
                  />
                  <Factor icon={<ProfitIcon size={18} />} title={t("granja.sheet.income")} value={`S/ ${n.format(selF.incomeYear)} ${t("granja.sheet.inYear")}`} />
                  <button type="button" onClick={() => paint(selected!, true)} className="rounded-full border-2 px-4 py-2 text-sm font-semibold" style={{ borderColor: rotationColor(brush) }}>
                    <BrushIcon size={16} className="mr-1 inline" /> {t("granja.sheet.paintThis", { name: palette.find((p) => p.id === brush)?.name ?? "" })}
                  </button>
                </section>
              )}

              {!sel && tab === "sow" && (
                <section className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-full bg-white/[.06] p-0.5 text-xs font-semibold">
                      <button type="button" onClick={() => setPaintMode(true)} className={`rounded-full px-3 py-1.5 ${paintMode ? "bg-[var(--brand)] text-[var(--brand-ink)]" : ""}`}>
                        🖌️ {t("granja.mode.paint")}
                      </button>
                      <button type="button" onClick={() => setPaintMode(false)} className={`rounded-full px-3 py-1.5 ${!paintMode ? "bg-[var(--brand)] text-[var(--brand-ink)]" : ""}`}>
                        🔍 {t("granja.mode.view")}
                      </button>
                    </div>
                    <button type="button" onClick={undo} className="rounded-full bg-white/[.06] px-3 py-1.5 text-xs font-semibold">
                      ↶ {t("granja.undo")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        history.current = [...history.current.slice(-29), granja.tiles];
                        setGranja((s) => ({ tiles: s.tiles.map(() => brush) }));
                      }}
                      className="rounded-full bg-white/[.06] px-3 py-1.5 text-xs font-semibold"
                    >
                      {t("granja.fillAll")}
                    </button>
                    <Link href={`/${locale}/rotaciones`} className="rounded-full bg-white/[.06] px-3 py-1.5 text-xs font-semibold">
                      {t("rotaciones.create")}
                    </Link>
                  </div>
                  <p className="text-[11px] text-[var(--muted)]">{paintMode ? t("granja.mode.paintHint") : t("granja.mode.viewHint")}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {palette.map((r) => {
                      const res = byId.get(r.id);
                      const active = brush === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setBrush(r.id);
                            setPaintMode(true);
                          }}
                          className={`flex w-36 shrink-0 flex-col items-start gap-0.5 rounded-xl border-2 bg-[rgba(3,14,22,.45)] px-2.5 py-2 text-left ${active ? "shadow-md" : "border-[var(--border)]"}`}
                          style={{ borderColor: active ? rotationColor(r.id) : undefined }}
                        >
                          <RotationIcons rotation={r} size={20} className="text-[#2f6b3a]" />
                          <span className="line-clamp-2 text-xs font-semibold leading-tight">
                            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: rotationColor(r.id) }} />
                            {r.id === "descanso" ? t("granja.fallow") : r.name}
                          </span>
                          {res && (
                            <span className="text-[10px] text-[var(--muted)]">
                              💧 {n.format(res.water.median)} · 💰 {n.format(res.income.median)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {!sel && tab === "climate" && (
                <section className="flex flex-col gap-2 text-sm">
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {years.map((y) => (
                      <button
                        key={y.year}
                        type="button"
                        onClick={() => {
                          setGranja({ year: y.year });
                          reset();
                        }}
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs tabular-nums ${y.year === granja.year ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-ink)]" : "border-[var(--border)] bg-white/5"}`}
                        title={y.tag ? t(`granja.tag.${y.tag}`) : undefined}
                      >
                        {y.tag ? (() => {
                          const I = TAG_ICON[y.tag];
                          return <I size={13} className="mr-0.5 inline" />;
                        })() : null}
                        {y.year}
                      </button>
                    ))}
                  </div>
                  {clim ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <Stat icon={<ThermoIcon size={18} />} label={t("granja.climate.temp")} value={`${n1.format(clim.tmin)} – ${n1.format(clim.tmax)} °C`} sub={t("granja.climate.extremes", { min: n1.format(clim.tminAbs), max: n1.format(clim.tmaxAbs) })} />
                        <Stat icon={<EvapoIcon size={14} />} label={t("granja.climate.et0")} value={`${n1.format(clim.et0)} mm/día`} sub={t("granja.climate.et0Sub", { m3: n.format(clim.et0 * 10) })} />
                        <Stat icon={<RainIcon size={14} />} label={t("granja.climate.rain")} value={`${n1.format(clim.rain)} mm`} />
                        <Stat icon={<SoilIcon size={18} />} label={t("granja.climate.soil")} value={pct.format(clim.soil)} sub={t("granja.climate.soilSub")} />
                      </div>
                      {yearClimate && (
                        <div>
                          <div className="mb-1 text-xs text-[var(--muted)]">{t("granja.climate.et0Year")}</div>
                          <div className="flex h-14 items-end gap-0.5">
                            {yearClimate.months.map((mc, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setMonth(i)}
                                className="flex flex-1 flex-col items-center justify-end gap-0.5"
                                aria-label={fmtMonth.format(new Date(granja.year, i, 1))}
                              >
                                <span className="w-full rounded-t" style={{ height: `${(mc.et0 / 7) * 44}px`, background: i === month ? "var(--brand)" : "rgba(92,200,245,.55)" }} />
                                <span className={`text-[9px] ${i === month ? "font-bold" : "text-[var(--muted)]"}`}>{fmtMonthShort.format(new Date(2025, i, 1))}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-[var(--muted)]">{granja.tempDelta ? t("granja.climate.scenario", { d: granja.tempDelta }) : t("granja.climate.real", { year: granja.year })}</p>
                    </>
                  ) : (
                    <p className="text-xs text-[var(--muted)]">{t("comparar.loading")}</p>
                  )}
                </section>
              )}

              {!sel && tab === "whatif" && (
                <section className="flex flex-col gap-3 text-sm">
                  <p className="text-xs text-[var(--muted)]">{t("granja.whatif.text")}</p>
                  <label className="flex flex-col gap-1">
                    <span className="flex justify-between font-semibold">
                      <span>🌡️ {t("granja.whatif.temp")}</span>
                      <span className={granja.tempDelta > 0 ? "text-[#ff8f8f]" : granja.tempDelta < 0 ? "text-[var(--sky)]" : ""}>
                        {granja.tempDelta > 0 ? "+" : ""}
                        {granja.tempDelta} °C
                      </span>
                    </span>
                    <RangeInput label={t("granja.whatif.temp")} min={-2} max={4} step={0.5} value={granja.tempDelta} color={granja.tempDelta > 0 ? "#ff8a7a" : "#5cc8f5"} onChange={(v) => setGranja({ tempDelta: v })} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="flex justify-between font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <WaterIcon size={16} /> {t("granja.whatif.water")}
                      </span>
                      <span>
                        {pct.format(granja.waterFactor)} · {n.format(water)} m³/ha
                      </span>
                    </span>
                    <RangeInput label={t("granja.whatif.water")} min={0.5} max={1.5} step={0.05} value={granja.waterFactor} color="#5cc8f5" onChange={(v) => setGranja({ waterFactor: v })} />
                  </label>
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <SoilIcon size={16} /> {t("granja.whatif.soil")}
                    </span>
                    <Chips small value={farm.soilTexture} options={["arenoso", "franco", "arcilloso"] as SoilTexture[]} label={(v) => t(`soil.${v}`)} onChange={(soilTexture) => setFarm({ soilTexture })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <WaterIcon size={16} /> {t("granja.whatif.irrigation")}
                    </span>
                    <Chips small value={farm.irrigation} options={["gravedad", "aspersion", "goteo"] as Irrigation[]} label={(v) => t(`irrigation.${v}`)} onChange={(irrigation) => setFarm({ irrigation })} />
                  </div>
                  <p className="rounded-xl bg-[rgba(99,222,242,.07)] text-[#c8dde0] px-3 py-2 text-xs">
                    {t("granja.whatif.effect", {
                      eff: pct.format(efficiency(farm.irrigation, farm.soilTexture)),
                      water: n.format(sim.summary.waterM3),
                      cap: n.format(sim.summary.capacityM3),
                    })}
                  </p>
                  <button type="button" onClick={() => setGranja({ tempDelta: 0, waterFactor: 1 })} className="self-start rounded-full bg-white/[.06] px-4 py-2 text-xs font-semibold">
                    ↺ {t("granja.whatif.reset")}
                  </button>
                </section>
              )}

              {!sel && tab === "goals" && (
                <section className="flex flex-col gap-2 text-sm">
                  {goals.map((g) => (
                    <div key={g.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className={g.done && finished ? "font-semibold" : ""}>
                          {(() => {
                            const G = GOAL_ICON[g.id];
                            return G ? <G size={16} className="mr-1 inline" /> : null;
                          })()}
                          {t(`granja.goal.${g.id}`)}
                        </span>
                        <span>{finished ? g.done ? <Check size={16} className="text-[#3f8f4f]" /> : "—" : granja.badges.includes(g.id) ? <MedalIcon size={16} /> : null}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]">
                        <div className="h-full rounded-full bg-[var(--brand)] transition-all" style={{ width: `${g.progress * 100}%`, opacity: finished ? 1 : 0.45 }} />
                      </div>
                    </div>
                  ))}
                  {!finished && <p className="text-[11px] text-[var(--muted)]">{t("granja.goalsHint")}</p>}
                  {finished && (
                    <div className="mt-1 flex flex-col gap-1 rounded-xl border-2 border-[var(--brand)] bg-[rgba(185,255,99,.05)] p-3">
                      <b>🏁 {t("granja.resultTitle", { year: granja.year })}</b>
                      <ResultRow label={`💧 ${t("comparar.water")} (m³)`} mine={sim.summary.waterM3} base={sim.summary.baseline.waterM3} lowerIsBetter />
                      <ResultRow label={`💰 ${t("comparar.income")} (S/)`} mine={sim.summary.incomePEN} base={sim.summary.baseline.incomePEN} />
                      <p className="text-[11px] text-[var(--muted)]">{t("granja.resultHint", { ha: n.format(granja.tiles.length * granja.haPerTile) })}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    <button type="button" onClick={() => setGranja({ zoneSet: false })} className="rounded-full bg-white/[.06] px-3 py-1.5">
                      📍 {t("granja.changeZone")}
                    </button>
                    <Link href={`/${locale}/comparar`} className="rounded-full bg-white/[.06] px-3 py-1.5">
                      📊 {t("granja.expert")}
                    </Link>
                  </div>
                  <p className="text-[10px] text-[var(--muted)]">{t("granja.source", { base: palette.find((p) => p.id === BASELINE_ID)?.name ?? "" })}</p>
                </section>
              )}
            </div>
          </>
        )}
      </div>

      {!granja.tutorialDone && !shot && <Tutorial onClose={() => setGranja({ tutorialDone: true })} />}
      {granja.lastWon.length > 0 && <Celebration medals={granja.lastWon} onClose={() => setGranja({ lastWon: [] })} />}
    </div>
  );
}

function Factor({ icon, title, value, bar, bad }: { icon: React.ReactNode; title: string; value: string; bar?: number; bad?: boolean }) {
  const v = Math.max(0, Math.min(1, bar ?? 0));
  const color = bad ? (v > 0.66 ? "#ff6b6b" : v > 0.33 ? "#f6b94c" : "#4fd39a") : "var(--brand)";
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[var(--border)] px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold">
          {icon} {title}
        </span>
      </div>
      <span className="text-xs">{value}</span>
      {bar !== undefined && (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]">
          <div className="h-full rounded-full" style={{ width: `${Math.max(4, v * 100)}%`, background: color }} />
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] px-3 py-2">
      <div className="text-[11px] text-[var(--muted)]">
        {icon} {label}
      </div>
      <div className="font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-[var(--muted)]">{sub}</div>}
    </div>
  );
}

function ResultRow({ label, mine, base, lowerIsBetter }: { label: string; mine: number; base: number; lowerIsBetter?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const diff = base !== 0 ? (mine - base) / Math.abs(base) : 0;
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 text-sm">
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{n.format(mine)}</span>
      <span className="text-xs text-[var(--muted)]">
        {t("granja.vsBaseline")} {n.format(base)}
      </span>
      <span className={`text-xs font-semibold tabular-nums ${good ? "text-[var(--ok)]" : "text-[#ff8f8f]"}`}>
        {diff > 0 ? "+" : ""}
        {Math.round(diff * 100)}%
      </span>
    </div>
  );
}

/** Respaldo sin WebGL: la misma granja en una cuadrícula 2D. */
function FlatFarm({ cols, tiles, selected, tints, onTap }: { cols: number; tiles: TileState[]; selected: number | null; tints?: (string | null)[]; onTap: (i: number) => void }) {
  const BG: Record<string, string> = { ok: "#6e4a2f", water_stress: "#7d5638", climate_risk: "#6f7f93", dry: "#cdb487", bare: "#8d6a48" };
  return (
    <div className="grid h-full w-full content-center gap-1.5 bg-[#d9c49b] p-6 pb-[45%]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {tiles.map((tl, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onTap(i)}
          className="flex aspect-square items-center justify-center rounded-lg border-4 text-2xl"
          style={{ background: tints?.[i] ?? BG[tl.status], borderColor: selected === i ? "#fff" : rotationColor(tl.rotationId) }}
        >
          <span className="text-white" style={{ transform: `scale(${0.6 + tl.growth * 0.6})` }}>{tl.cropId ? <CropIcon crop={tl.cropId} size={26} /> : null}</span>
        </button>
      ))}
    </div>
  );
}

