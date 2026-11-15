"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import type { Irrigation, SimulateRequest, SimulateResponse, SoilTexture } from "@/lib/contract";
import { cropName, efficiency } from "@/lib/crop-calendar";
import { moveFarm, setFarm, useFarm } from "@/lib/farm-store";
import { FARM_SIZES, SCENARIOS, WARM_DELTA, editShape, newPlanId, resizeFarm, resizeFarmToArea, saveBoundary, setGranja, shapeFarmFromBoundary, useGranja, type Scenario } from "@/lib/granja-store";
import { OFF, activeCount, isOn, lotLabel, lotNumbers } from "@/lib/farm-shape";
import { fixFor, type Fix } from "@/lib/granja-fixes";
import { useToday } from "@/lib/use-today";
import {
  BASELINE_ID,
  LENS_RAMP,
  buildPalette,
  evaluateGoals,
  lensColor,
  nextSeason,
  notableYears,
  oddsKey,
  riskOdds,
  rotationColor,
  scenarioYear,
  simulateYear,
  tileFactors,
  type Lens,
  type Odds,
  type TileState,
} from "@/lib/granja-sim";
import { useSimulation } from "@/lib/use-simulation";
import { useIsMobile } from "@/lib/use-media";
import { SKY_GRADIENT, type Weather } from "@/components/granja/farm-scene";
import { Celebration, Tutorial, playCoin } from "@/components/granja/overlays";
import { AlertIcon } from "@/components/granja/risk-panel";
import { PlansPanel } from "@/components/granja/plans-panel";
import { HazardControls } from "@/components/granja/hazard-controls";
import { ENSO_YEARS, type FarmAlert } from "@/lib/granja-events";
import { Reveal } from "@/components/motion/reveal";
import { LoadingOrbit, PageHeader, Panel, RangeInput } from "@/components/ui/kit";
import { CircleHelp, CloudSun, Droplets, Gamepad2, Grid2x2Plus, History, Layers, Rocket, SlidersHorizontal, Sprout, Waves, Wand2, FolderKanban } from "lucide-react";
import { BarChart3, Check, ChevronLeft, ChevronRight, Eye, Flag, MapPin, Pause, Play, RotateCcw, SkipBack, Tractor, Undo2, Volume2, VolumeX, X } from "lucide-react";
import { BrushIcon, CropIcon, DroughtIcon, EvapoIcon, FrostIcon, GOAL_ICON, HeatIcon, MedalIcon, ProfitIcon, RainIcon, ReservoirIcon, SoilIcon, STAGE_ICON, ThermoIcon, WaterIcon } from "@/components/icons/farm-icons";
import { RotationIcons } from "@/components/icons/rotation-icons";

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
const SCENARIO_ICON: Record<Scenario, (p: { size?: number; className?: string }) => React.JSX.Element> = {
  typical: (p) => <CloudSun size={p.size} className={p.className} />,
  dry: DroughtIcon,
  nino: (p) => <Waves size={p.size} className={p.className} />,
  warm: HeatIcon,
};
const LENSES: { id: Lens; Icon: (p: { size?: number }) => React.JSX.Element }[] = [
  { id: "crop", Icon: (p) => <CropIcon crop="maiz_chala" {...p} /> },
  { id: "water", Icon: WaterIcon },
  { id: "temp", Icon: ThermoIcon },
  { id: "soil", Icon: SoilIcon },
  { id: "income", Icon: ProfitIcon },
];
type Tab = "sow" | "climate" | "whatif" | "goals" | "plans";
const TABS: { id: Tab; Icon: (p: { size?: number }) => React.JSX.Element }[] = [
  { id: "sow", Icon: BrushIcon },
  { id: "climate", Icon: ThermoIcon },
  { id: "whatif", Icon: (p) => <SlidersHorizontal size={p.size} /> },
  { id: "goals", Icon: (p) => <Flag size={p.size} /> },
  { id: "plans", Icon: (p) => <FolderKanban size={p.size} /> },
];
const SEV = { low: 1, med: 2, high: 3 } as const;

/**
 * Detecta WebGL UNA sola vez. Antes se llamaba en cada render y cada llamada creaba un contexto WebGL
 * nuevo: tras unos toques el navegador llegaba a su límite y eliminaba el contexto de la granja 3D.
 */
let webglSupport: boolean | null = null;
function hasWebGL() {
  if (webglSupport !== null) return webglSupport;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    webglSupport = Boolean(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext(); // libera el contexto de prueba
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}
const webglStore = { sub: () => () => {}, get: hasWebGL, server: () => true };
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
  const ha = activeCount(granja.tiles) * granja.haPerTile;

  const es = useLocale() === "es";
  return (
    <div className="ui-page">
      <PageHeader icon={Gamepad2} kicker={es ? "MODO GRANJA" : "FARM MODE"} title={t("granja.title")} subtitle={t("granja.zoneHint")} />
      <div className="parcel-layout">
        <Reveal className="parcel-map-col">
          <Panel kicker={es ? "PASO 1" : "STEP 1"} icon={MapPin} title={es ? "Elige tu zona" : "Pick your zone"}>
            <ParcelMap
              lat={farm.lat}
              lon={farm.lon}
              onPick={moveFarm}
              compact
              boundary={farm.boundary}
              onBoundary={saveBoundary}
            />
          </Panel>
        </Reveal>
        <Reveal delay={90}>
          <Panel kicker={es ? "PASO 2" : "STEP 2"} icon={Tractor} title={t("granja.size")}>
            {farm.areaHa ? (
              <button type="button" onClick={() => (farm.boundary && farm.boundary.length >= 3 ? shapeFarmFromBoundary(farm.boundary, farm.areaHa!) : resizeFarmToArea(farm.areaHa!))} className={`option-card mb-2 w-full ${Math.abs(ha - farm.areaHa) < 0.01 ? "active" : ""}`}>
                <b>{t("granja.drawn", { ha: new Intl.NumberFormat(es ? "es" : "en", { maximumFractionDigits: 2 }).format(farm.areaHa) })}</b>
                <small>{t("granja.drawnHint")}</small>
              </button>
            ) : (
              <p className="ui-hint mb-2">{t("granja.drawTip")}</p>
            )}
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
  const palette = useMemo(() => buildPalette(farm.rotations, locale), [farm.rotations, locale]);
  const water = Math.round(farm.waterAvailableM3ha * granja.waterFactor);
  const scenario: Scenario = granja.scenario ?? "typical";
  const past = granja.mode === "past";
  // "más calor" = el año típico con +1,5 °C; el control de temperatura de "¿Y si…?" se suma encima
  const delta = granja.tempDelta + (!past && scenario === "warm" ? WARM_DELTA : 0);
  const extra = useMemo<Partial<SimulateRequest>>(
    () => ({ includeClimate: true, waterAvailableM3ha: water, scenario: delta ? { tempDeltaC: delta } : undefined }),
    [water, delta],
  );
  const today = useToday();
  const season = nextSeason(today);
  const data = useSimulation({ rotations: palette, cacheKey: "farmtwin.granja.sim.v3", fallback: fallbackGranja, extra });

  const [brush, setBrush] = useState<string>("suelo_agua");
  const [month, setMonth] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [lens, setLens] = useState<Lens>("crop");
  const mobile = useIsMobile();
  // en celular el panel empieza plegado para ver la granja completa
  const [panelState, setPanel] = useState<Tab | null | "auto">("auto");
  const panel: Tab | null = panelState === "auto" ? (mobile ? null : "sow") : panelState;
  const [lensOpen, setLensOpen] = useState(false);
  const [dismissed, setDismissed] = useState("");
  const [tool, setTool] = useState<"paint" | "view" | "shape">("paint");
  const paintMode = tool === "paint";
  const history = useRef<{ tiles: string[]; cols: number; rows: number }[]>([]);
  const remember = () => {
    history.current = [...history.current.slice(-29), { tiles: granja.tiles, cols: granja.cols, rows: granja.rows }];
  };
  const [closedAlerts, setClosedAlerts] = useState<string[]>([]);
  const [applied, setApplied] = useState<{ key: string; undo: () => void } | null>(null);

  // la próxima campaña se arma con un año real análogo al escenario elegido
  const year = useMemo(() => (past ? granja.year : data ? scenarioYear(data, scenario) : 2016), [data, scenario, past, granja.year]);
  const years = useMemo(() => (data ? notableYears(data) : []), [data]);
  // año que se muestra: el real (pasado) o la próxima campaña (futuro)
  const shownYear = past ? year : season;
  const viewKey = past ? `y${year}` : scenario;
  const sim = useMemo(
    () => (data ? simulateYear(data, granja.tiles, granja.haPerTile, year, water, palette, granja.events) : null),
    [data, granja.tiles, granja.haPerTile, year, water, palette, granja.events],
  );
  // en cuántos de los 21 años reales aparece cada riesgo con esta misma chacra
  const odds = useMemo(() => (data ? riskOdds(data, granja.tiles, granja.haPerTile, water, palette) : new Map<string, Odds>()), [data, granja.tiles, granja.haPerTile, water, palette]);
  const alerts = useMemo<FarmAlert[]>(() => {
    if (!sim) return [];
    const shown = sim.alerts.map((a) => {
      const k = oddsKey(a);
      const o = k ? odds.get(k) : undefined;
      return o ? { ...a, odds: { hits: o.hits, total: o.total } } : a;
    });
    const keys = new Set(shown.map(oddsKey));
    // riesgos que no tocan en este escenario pero sí en 1 de cada 4 años o más
    for (const [k, o] of past ? [] : odds) {
      if (keys.has(k) || k.startsWith("waterPeak") || o.hits / o.total < 0.25) continue;
      const kind = k === "dry" ? "dry" : "climate";
      const crops = Array.from(new Set(o.tiles.map((i) => sim.months[o.month]?.tiles[i]?.cropId).filter(Boolean) as string[]));
      shown.push({ month: o.month, kind, severity: o.hits / o.total >= 0.4 ? "med" : "low", tiles: o.tiles, crops, fromEvent: false, odds: { hits: o.hits, total: o.total }, possible: true });
    }
    return shown.sort((a, b) => a.month - b.month);
  }, [sim, odds, past]);
  const goals = useMemo(() => (sim ? evaluateGoals(sim.summary, activeCount(granja.tiles)) : []), [sim, granja.tiles]);
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
        if (start) history.current = [...history.current.slice(-29), { tiles: s.tiles, cols: s.cols, rows: s.rows }];
        if (s.tiles[i] === brush || !isOn(s.tiles[i])) return {};
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
    if (prev) setGranja(prev);
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
  const yearClimate = data.source.climateByYear?.find((c) => c.year === year);
  const clim = yearClimate?.months[month];

  // factores del gemelo digital por casilla (capas y ficha)
  const factors = snap.tiles.map((tile) => tileFactors(data, tile, year, month, granja.haPerTile, palette));
  const maxWater = Math.max(1, ...factors.map((f) => f.waterM3ha));
  const incomes = factors.map((f) => f.incomeYear);
  const tints = lens === "crop" ? undefined : factors.map((f) => lensColor(lens, f, maxWater, Math.max(...incomes), Math.min(...incomes)));

  const sel = selected !== null ? snap.tiles[selected] : null;
  const selF = selected !== null ? factors[selected] : null;
  const reset = () => {
    setPlaying(false);
    setMonth(0);
  };

  const effectivePaint = paintMode && panel === "sow" && selected === null;
  const shaping = tool === "shape" && panel === "sow" && selected === null;
  const lots = lotNumbers(granja.tiles);
  const nLots = activeCount(granja.tiles);
  const monthAlerts = alerts.filter((a) => a.month === month);
  const alertId = (a: FarmAlert) => `${viewKey}-${a.kind}-${a.month}`;
  // tarjetas en pantalla: lo de este mes y, desde el inicio, lo que vale para todo el año
  // "mes de alta demanda" es solo informativo: queda como punto en la línea de tiempo, no como tarjeta
  const cards = [...alerts.filter((a) => a.kind !== "waterPeak" && (a.month === month || (a.month === -1 && month === 0)))]
    .filter((a) => !closedAlerts.includes(alertId(a)))
    .sort((a, b) => SEV[b.severity] - SEV[a.severity]);
  const toastKey = `${viewKey}-${month}`;
  const alertByMonth = Array.from({ length: 12 }, (_, m) => alerts.filter((a) => a.month === m).reduce((mx, a) => Math.max(mx, SEV[a.severity]), 0));
  const fixCtx = { data, tiles: granja.tiles, palette, year, irrigation: farm.irrigation, waterAvailableM3ha: water };
  const rotName = (id?: string) => (id ? (id === "descanso" ? t("granja.fallow") : (palette.find((p) => p.id === id)?.name ?? id)) : "");
  const applyFix = (a: FarmAlert, fix: Fix) => {
    if (!fix.apply) return;
    const prevIrrigation = farm.irrigation;
    if (fix.apply.tiles) {
      remember();
      setGranja({ tiles: fix.apply.tiles });
    }
    if (fix.apply.irrigation) setFarm({ irrigation: fix.apply.irrigation });
    setClosedAlerts((c) => [...c, alertId(a)]);
    setApplied({
      key: alertId(a),
      undo: () => {
        if (fix.apply?.tiles) undo();
        if (fix.apply?.irrigation) setFarm({ irrigation: prevIrrigation });
        setClosedAlerts((c) => c.filter((k) => k !== alertId(a)));
        setApplied(null);
      },
    });
  };
  const showPanel = panel !== null || sel !== null;
  const togglePanel = (k: Tab) => {
    setSelected(null);
    setPanel(panel === k && selected === null ? null : k);
  };
  const closePanel = () => {
    setSelected(null);
    setPanel(null);
  };

  return (
    <div className={`farm-twin ${showPanel ? "has-panel" : ""}`} style={{ background: SKY_GRADIENT[weather] }}>
      {/* escena a pantalla completa */}
      <div className="farm-stage">
        {webgl ? (
          <FarmScene
            cols={granja.cols}
            rows={granja.rows}
            tiles={snap.tiles}
            reservoir={reservoir}
            weather={weather}
            harvestTiles={snap.harvests.map((h) => h.tile)}
            harvestKey={`${viewKey}-${month}`}
            selectedTile={selected}
            alertTiles={monthAlerts.flatMap((a) => a.tiles)}
            paintMode={effectivePaint}
            editShape={shaping}
            onEditCell={(r, c) => {
              remember();
              editShape(r, c, brush === OFF ? "actual" : brush);
            }}
            onPaint={paint}
            onSelect={(i) => {
              select(i);
            }}
            tints={tints}
          />
        ) : (
          <FlatFarm cols={granja.cols} tiles={snap.tiles} selected={selected} tints={tints} onTap={(i) => (effectivePaint ? paint(i, true) : select(i))} />
        )}
      </div>

      {/* secciones como chips flotantes (estilo Google Maps) */}
      <nav className="farm-chips" aria-label={t("granja.title")}>
        {TABS.map(({ id, Icon }) => (
          <button key={id} type="button" onClick={() => togglePanel(id)} aria-pressed={panel === id && !sel} className={`farm-chip ${panel === id && !sel ? "active" : ""}`}>
            <Icon size={15} />
            <span>{t(`granja.tab.${id}`)}</span>
          </button>
        ))}
      </nav>

      {/* estado del mes: discreto, arriba a la derecha */}
      <button type="button" className="farm-status" onClick={() => togglePanel("climate")} title={t("granja.tab.climate")}>
        <span className="farm-status-date capitalize">
          {fmtMonth.format(new Date(shownYear, month, 1))} {shownYear}
          {past ? <i>{ENSO_YEARS[year] ? t(`granja.enso.${ENSO_YEARS[year]}`) : t("granja.when.real")}</i> : <i>{t(`granja.scenario.${scenario}.short`)}</i>}
          {granja.tempDelta ? <i className="hot">{granja.tempDelta > 0 ? "+" : ""}{granja.tempDelta} °C</i> : null}
        </span>
        <span className="farm-status-row">
          <span className="farm-status-res" title={t("granja.reservoir")}>
            <ReservoirIcon size={14} />
            <span className="farm-status-bar">
              <span style={{ width: `${reservoir * 100}%`, background: reservoir < 0.15 ? "var(--danger)" : "#5cc8f5" }} />
            </span>
            <b className={reservoir <= 0 ? "text-[var(--danger-text)]" : ""}>{pct.format(reservoir)}</b>
          </span>
          <span>
            <ProfitIcon size={14} /> S/ {n.format(snap.incomePEN)}
          </span>
          {clim && (
            <span>
              <ThermoIcon size={14} /> {n1.format(clim.tmin)}–{n1.format(clim.tmax)}°
            </span>
          )}
        </span>
      </button>

      {/* herramientas: capas y sonido */}
      <div className="farm-tools">
        <div className="relative">
          <button type="button" className={`farm-round ${lensOpen || lens !== "crop" ? "active" : ""}`} onClick={() => setLensOpen((o) => !o)} aria-expanded={lensOpen} aria-label={t("granja.ui.layers")} title={t("granja.ui.layers")}>
            <Layers size={18} />
          </button>
          {lensOpen && (
            <div className="gm-popover farm-lens-pop" role="dialog" aria-label={t("granja.ui.layers")}>
              <div className="gm-pop-head">
                <b>{t("granja.ui.layers")}</b>
                <button type="button" onClick={() => setLensOpen(false)} aria-label={t("granja.ui.close")}>
                  <X size={15} />
                </button>
              </div>
              <div className="farm-lens-grid">
                {LENSES.map((l) => (
                  <button key={l.id} type="button" onClick={() => setLens(l.id)} aria-pressed={lens === l.id} className={lens === l.id ? "active" : ""}>
                    <span className="farm-lens-swatch" style={{ background: l.id === "crop" ? "rgba(185,255,99,.15)" : `linear-gradient(135deg,${LENS_RAMP[l.id].join(",")})` }}>
                      <l.Icon size={18} />
                    </span>
                    {t(`granja.lens.${l.id}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button type="button" onClick={() => setGranja((s) => ({ sound: !s.sound }))} aria-label={granja.sound ? "mute" : "sound"} className="farm-round">
          {granja.sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
      </div>
      {lens !== "crop" && !lensOpen && (
        <div className="farm-legend">
          <b>{t(`granja.lens.${lens}`)}</b>
          <div className="h-1.5 rounded-full" style={{ background: `linear-gradient(90deg,${LENS_RAMP[lens].join(",")})` }} />
          <div className="flex justify-between">
            <span>{t(`granja.legend.${lens}.low`)}</span>
            <span>{t(`granja.legend.${lens}.high`)}</span>
          </div>
        </div>
      )}

      {/* alertas en pantalla: qué pasa, qué lotes y qué cambiar (con botón para aplicarlo) */}
      {!shaping && (cards.length > 0 || applied) && (
        <div className="farm-alerts" role="region" aria-label={t("granja.risk.title")}>
          {applied && (
            <div className="farm-applied" role="status">
              <Check size={15} />
              <span>{t("granja.fix.applied")}</span>
              <button type="button" onClick={applied.undo}>{t("granja.undo")}</button>
              <button type="button" onClick={() => setApplied(null)} aria-label={t("granja.ui.close")}><X size={13} /></button>
            </div>
          )}
          {cards.slice(0, mobile ? 1 : 2).map((a) => (
            <AlertCard
              key={alertId(a)}
              alert={a}
              fix={fixFor(a, fixCtx)}
              lotsOf={(idx) => lotLabel(idx, granja.tiles)}
              rotName={rotName}
              monthName={a.month >= 0 ? fmtMonth.format(new Date(shownYear, a.month, 1)) : t("granja.risk.allYear")}
              more={cards.length - (mobile ? 1 : 2)}
              onApply={(fix) => applyFix(a, fix)}
              onClose={() => setClosedAlerts((c) => [...c, alertId(a)])}
            />
          ))}
        </div>
      )}
      {cards.length === 0 && !applied && !shaping && snap.events.length > 0 && dismissed !== toastKey && (
        <div className="farm-toast sev-low" role="status">
          <span className="farm-toast-main">
            <span>{t(`granja.event.${snap.events[0].kind}`, { n: snap.events[0].tiles })}</span>
          </span>
          <button type="button" onClick={() => setDismissed(toastKey)} aria-label={t("granja.ui.close")} className="farm-toast-x">
            <X size={13} />
          </button>
        </div>
      )}

      {/* línea de tiempo flotante */}
      <div className="farm-timeline">
        <button type="button" onClick={reset} aria-label={t("granja.reset")} className="farm-tl-btn">
          <SkipBack size={15} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (finished) setMonth(0);
            setPlaying((p) => !p);
          }}
          className="farm-tl-play"
        >
          {playing ? <Pause size={16} /> : finished ? <RotateCcw size={16} /> : <Play size={16} />}
          <span>{playing ? t("granja.pause") : finished ? t("granja.replay") : t("granja.play")}</span>
        </button>
        <button type="button" onClick={() => setMonth((m) => Math.max(0, m - 1))} aria-label="-1" className="farm-tl-btn">
          <ChevronLeft size={17} />
        </button>
        <div className="farm-tl-months">
          {Array.from({ length: 12 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setPlaying(false);
                setMonth(i);
              }}
              aria-label={fmtMonth.format(new Date(shownYear, i, 1))}
              aria-current={i === month}
              className={`${i === month ? "now" : ""} ${i < month ? "past" : ""}`}
            >
              <span>{fmtMonthShort.format(new Date(2025, i, 1))}</span>
              {alertByMonth[i] > 0 && <i className={`sev-${alertByMonth[i] === 3 ? "high" : alertByMonth[i] === 2 ? "med" : "low"}`} />}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setMonth((m) => Math.min(11, m + 1))} aria-label="+1" className="farm-tl-btn">
          <ChevronRight size={17} />
        </button>
      </div>

      {/* panel flotante: izquierda en escritorio, hoja inferior en móvil */}
      {showPanel && (
        <aside className="farm-panel" aria-label={sel ? t("granja.tile") : t(`granja.tab.${panel}`)}>
          <div className="farm-panel-head">
            <b>{sel ? `${t("granja.tile")} ${lots[selected!] ?? ""}` : t(`granja.tab.${panel}`)}</b>
            <button type="button" onClick={sel ? () => setSelected(null) : closePanel} aria-label={t("granja.ui.close")}>
              <X size={16} />
            </button>
          </div>
            <div className="farm-panel-body">
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
                          <span className="ml-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)]">
                            {(() => {
                              const S = STAGE_ICON[sel.stage];
                              return <S size={16} />;
                            })()}
                            {t(`granja.stage.${sel.stage}`)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        {t("granja.tile")} {lots[selected!]} · <span aria-hidden className="inline-block h-2 w-2 rounded-full align-middle" style={{ background: rotationColor(sel.rotationId) }} /> {palette.find((p) => p.id === sel.rotationId)?.name}
                      </div>
                    </div>
                  </div>
                  <p className="rounded-xl bg-[rgba(99,222,242,.07)] text-[var(--text-soft)] px-3 py-2">
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

              {!sel && panel === "sow" && (
                <section className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-full bg-[var(--tint-2)] p-0.5 text-xs font-semibold">
                      <button type="button" onClick={() => setTool("paint")} className={`rounded-full px-3 py-1.5 ${tool === "paint" ? "bg-[var(--brand)] text-[var(--brand-ink)]" : ""}`}>
                        <BrushIcon size={14} className="mr-1 inline" /> {t("granja.mode.paint")}
                      </button>
                      <button type="button" onClick={() => setTool("view")} className={`rounded-full px-3 py-1.5 ${tool === "view" ? "bg-[var(--brand)] text-[var(--brand-ink)]" : ""}`}>
                        <Eye size={14} className="mr-1 inline" /> {t("granja.mode.view")}
                      </button>
                      <button type="button" onClick={() => setTool("shape")} className={`rounded-full px-3 py-1.5 ${tool === "shape" ? "bg-[var(--brand)] text-[var(--brand-ink)]" : ""}`}>
                        <Grid2x2Plus size={14} className="mr-1 inline" /> {t("granja.mode.shape")}
                      </button>
                    </div>
                    <button type="button" onClick={undo} className="rounded-full bg-[var(--tint-2)] px-3 py-1.5 text-xs font-semibold">
                      <Undo2 size={14} className="mr-1 inline" /> {t("granja.undo")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        remember();
                        setGranja((s) => ({ tiles: s.tiles.map((id) => (isOn(id) ? brush : id)) }));
                      }}
                      className="rounded-full bg-[var(--tint-2)] px-3 py-1.5 text-xs font-semibold"
                    >
                      {t("granja.fillAll")}
                    </button>
                    <Link href={`/${locale}/agrupaciones`} className="rounded-full bg-[var(--tint-2)] px-3 py-1.5 text-xs font-semibold">
                      {t("rotaciones.create")}
                    </Link>
                  </div>
                  <p className="text-[11px] text-[var(--muted)]">
                    {tool === "shape"
                      ? t("granja.mode.shapeHint", { n: nLots, ha: n1.format(nLots * granja.haPerTile) })
                      : paintMode
                        ? t("granja.mode.paintHint")
                        : t("granja.mode.viewHint")}
                  </p>
                  <div className="farm-palette">
                    {palette.map((r) => {
                      const res = byId.get(r.id);
                      const active = brush === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setBrush(r.id);
                            setTool((tl) => (tl === "shape" ? "shape" : "paint"));
                          }}
                          className={`flex flex-col items-start gap-0.5 rounded-xl border-2 bg-[var(--inset)] px-2.5 py-2 text-left ${active ? "shadow-md" : "border-[var(--border)]"}`}
                          style={{ borderColor: active ? rotationColor(r.id) : undefined }}
                        >
                          <RotationIcons rotation={r} size={20} className="text-[var(--brand)]" />
                          <span className="line-clamp-2 text-xs font-semibold leading-tight">
                            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: rotationColor(r.id) }} />
                            {r.id === "descanso" ? t("granja.fallow") : r.name}
                          </span>
                          {res && (
                            <span className="text-[10px] text-[var(--muted)]">
                              <span className="inline-flex items-center gap-0.5">
                                <WaterIcon size={11} /> {n.format(res.water.median)}
                              </span>{" "}
                              ·{" "}
                              <span className="inline-flex items-center gap-0.5">
                                <ProfitIcon size={11} /> {n.format(res.income.median)}
                              </span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {!sel && panel === "climate" && (
                <section className="flex flex-col gap-2 text-sm">
                  <div className="farm-when" role="radiogroup" aria-label={t("granja.when.label")}>
                    {(["past", "future"] as const).map((md) => (
                      <button
                        key={md}
                        type="button"
                        role="radio"
                        aria-checked={granja.mode === md}
                        className={granja.mode === md ? "active" : ""}
                        onClick={() => {
                          setGranja({ mode: md });
                          reset();
                        }}
                      >
                        {md === "past" ? <History size={15} /> : <Rocket size={15} />}
                        {t(`granja.when.${md}`)}
                      </button>
                    ))}
                  </div>
                  {past ? (
                    <>
                      <p className="text-xs text-[var(--muted)]">{t("granja.when.pastIntro")}</p>
                      <div className="farm-years">
                        {years.map((y) => {
                          const I = y.tag ? TAG_ICON[y.tag] : null;
                          return (
                            <button
                              key={y.year}
                              type="button"
                              aria-pressed={y.year === year}
                              title={y.tag ? t(`granja.tag.${y.tag}`) : undefined}
                              className={y.year === year ? "active" : ""}
                              onClick={() => {
                                setGranja({ year: y.year });
                                reset();
                              }}
                            >
                              {I && <I size={12} />}
                              {y.year}
                              {ENSO_YEARS[y.year] && <em>{t(`granja.enso.${ENSO_YEARS[y.year]}`)}</em>}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                  <>
                  <p className="text-xs text-[var(--muted)]">{t("granja.scenario.intro", { season })}</p>
                  <div className="farm-scenarios">
                    {SCENARIOS.map((sc) => {
                      const I = SCENARIO_ICON[sc];
                      return (
                        <button
                          key={sc}
                          type="button"
                          aria-pressed={sc === scenario}
                          onClick={() => {
                            setGranja({ scenario: sc });
                            reset();
                          }}
                          className={sc === scenario ? "active" : ""}
                        >
                          <I size={18} />
                          <span>
                            <b>{t(`granja.scenario.${sc}.title`)}</b>
                            <small>{t(`granja.scenario.${sc}.text`)}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  </>
                  )}
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
                                aria-label={fmtMonth.format(new Date(shownYear, i, 1))}
                              >
                                <span className="w-full rounded-t" style={{ height: `${(mc.et0 / 7) * 44}px`, background: i === month ? "var(--brand)" : "rgba(92,200,245,.55)" }} />
                                <span className={`text-[9px] ${i === month ? "font-bold" : "text-[var(--muted)]"}`}>{fmtMonthShort.format(new Date(2025, i, 1))}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] text-[var(--muted)]">{past ? (granja.tempDelta ? t("granja.climate.scenario", { d: granja.tempDelta }) : t("granja.climate.real", { year })) : t("granja.scenario.basis", { year, delta: delta ? `${delta > 0 ? "+" : ""}${n1.format(delta)} °C` : "0 °C" })}</p>
                    </>
                  ) : (
                    <p className="text-xs text-[var(--muted)]">{t("comparar.loading")}</p>
                  )}
                </section>
              )}

              {!sel && panel === "whatif" && (
                <section className="flex flex-col gap-3 text-sm">
                  <p className="text-xs text-[var(--muted)]">{t("granja.whatif.text")}</p>
                  <label className="flex flex-col gap-1">
                    <span className="flex justify-between font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <ThermoIcon size={16} /> {t("granja.whatif.temp")}
                      </span>
                      <span className={granja.tempDelta > 0 ? "text-[var(--danger-text)]" : granja.tempDelta < 0 ? "text-[var(--sky)]" : ""}>
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
                  <p className="rounded-xl bg-[rgba(99,222,242,.07)] text-[var(--text-soft)] px-3 py-2 text-xs">
                    {t("granja.whatif.effect", {
                      eff: pct.format(efficiency(farm.irrigation, farm.soilTexture)),
                      water: n.format(sim.summary.waterM3),
                      cap: n.format(sim.summary.capacityM3),
                    })}
                  </p>
                  <HazardControls events={granja.events} month={month} onChange={(events) => setGranja({ events })} />
                  <button type="button" onClick={() => setGranja({ tempDelta: 0, waterFactor: 1, events: [] })} className="self-start rounded-full bg-[var(--tint-2)] px-4 py-2 text-xs font-semibold">
                    <RotateCcw size={13} className="mr-1 inline" /> {t("granja.whatif.reset")}
                  </button>
                </section>
              )}


              {!sel && panel === "plans" && (
                <PlansPanel
                  data={data}
                  palette={palette}
                  plans={granja.plans ?? []}
                  current={{ cols: granja.cols, rows: granja.rows, tiles: granja.tiles, haPerTile: granja.haPerTile }}
                  irrigation={farm.irrigation}
                  soil={farm.soilTexture}
                  waterAvailableM3ha={water}
                  season={season}
                  onSave={(name) =>
                    setGranja((st) => ({
                      plans: [...(st.plans ?? []), { id: newPlanId(), name, cols: st.cols, rows: st.rows, tiles: st.tiles, haPerTile: st.haPerTile, irrigation: farm.irrigation, savedAt: Date.now() }],
                    }))
                  }
                  onLoad={(pl) => {
                    remember();
                    setGranja({ cols: pl.cols, rows: pl.rows, tiles: pl.tiles, haPerTile: pl.haPerTile });
                    setFarm({ irrigation: pl.irrigation });
                  }}
                  onDelete={(id) => setGranja((st) => ({ plans: (st.plans ?? []).filter((x) => x.id !== id) }))}
                />
              )}

              {!sel && panel === "goals" && (
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
                        <span>{finished ? g.done ? <Check size={16} className="text-[var(--ok)]" /> : "—" : granja.badges.includes(g.id) ? <MedalIcon size={16} /> : null}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--tint-2)]">
                        <div className="h-full rounded-full bg-[var(--brand)] transition-all" style={{ width: `${g.progress * 100}%`, opacity: finished ? 1 : 0.45 }} />
                      </div>
                    </div>
                  ))}
                  {!finished && <p className="text-[11px] text-[var(--muted)]">{t("granja.goalsHint")}</p>}
                  {finished && (
                    <div className="mt-1 flex flex-col gap-1 rounded-xl border-2 border-[var(--brand)] bg-[rgba(185,255,99,.05)] p-3">
                      <b className="flex items-center gap-1">
                        <Flag size={15} /> {t("granja.resultTitle", { year: shownYear })}
                      </b>
                      <ResultRow label={`${t("comparar.water")} (m³)`} mine={sim.summary.waterM3} base={sim.summary.baseline.waterM3} lowerIsBetter />
                      <ResultRow label={`${t("comparar.income")} (S/)`} mine={sim.summary.incomePEN} base={sim.summary.baseline.incomePEN} />
                      <p className="text-[11px] text-[var(--muted)]">{t("granja.resultHint", { ha: n1.format(nLots * granja.haPerTile) })}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    <button type="button" onClick={() => setGranja({ zoneSet: false })} className="rounded-full bg-[var(--tint-2)] px-3 py-1.5">
                      <MapPin size={13} className="mr-1 inline" /> {t("granja.changeZone")}
                    </button>
                    <Link href={`/${locale}/comparar`} className="rounded-full bg-[var(--tint-2)] px-3 py-1.5">
                      <BarChart3 size={13} className="mr-1 inline" /> {t("granja.expert")}
                    </Link>
                  </div>
                  <p className="text-[10px] text-[var(--muted)]">{t("granja.source", { base: palette.find((p) => p.id === BASELINE_ID)?.name ?? "" })}</p>
                </section>
              )}
          </div>
        </aside>
      )}

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
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--tint-2)]">
          <div className="h-full rounded-full" style={{ width: `${Math.max(4, v * 100)}%`, background: color }} />
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] px-3 py-2">
      <div className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
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
      <span className={`text-xs font-semibold tabular-nums ${good ? "text-[var(--ok)]" : "text-[var(--danger-text)]"}`}>
        {diff > 0 ? "+" : ""}
        {Math.round(diff * 100)}%
      </span>
    </div>
  );
}

/** Respaldo sin WebGL: la misma granja en una cuadrícula 2D. */
function FlatFarm({ cols, tiles, selected, tints, onTap }: { cols: number; tiles: TileState[]; selected: number | null; tints?: (string | null)[]; onTap: (i: number) => void }) {
  const BG: Record<string, string> = { ok: "#6e4a2f", water_stress: "#7d5638", climate_risk: "#6f7f93", dry: "#cdb487", bare: "#8d6a48" , disease: "#5d4a63", pest: "#6f6232" };
  return (
    <div className="grid h-full w-full content-center gap-1.5 bg-[#d9c49b] p-6 pt-24 pb-20" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {tiles.map((tl, i) => tl.rotationId === OFF ? <span key={i} aria-hidden /> : (
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


/** Tarjeta de alerta en pantalla: qué pasa, con qué probabilidad, qué lotes y qué cambiar. */
function AlertCard({ alert, fix, lotsOf, rotName, monthName, more, onApply, onClose }: { alert: FarmAlert; fix: Fix; lotsOf: (idx: number[]) => string; rotName: (id?: string) => string; monthName: string; more: number; onApply: (fix: Fix) => void; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [why, setWhy] = useState(false);
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  // con muchos lotes sueltos, mejor decir cuántos son
  const label = (idx: number[]) => {
    const s = lotsOf(idx);
    return s.split(", ").length > 4 ? t("granja.risk.manyLots", { n: idx.length }) : t("granja.risk.lots", { lots: s });
  };
  const lots = alert.tiles.length ? label(alert.tiles) : "";
  const crops = alert.crops.map((c) => cropName(c, locale)).join(", ");
  const fixLots = fix.tiles.length ? (lotsOf(fix.tiles).split(", ").length > 4 ? t("granja.risk.nLots", { n: fix.tiles.length }) : t("granja.risk.inLots", { lots: lotsOf(fix.tiles) })) : "";
  return (
    <article className={`farm-alert sev-${alert.severity}`}>
      <header>
        <span className="farm-alert-icon"><AlertIcon kind={alert.kind} size={17} /></span>
        <div>
          <b>{t(`granja.alert.${alert.kind}.title`)}{alert.possible ? ` · ${t("granja.risk.possible")}` : ""}</b>
          <small><span className="capitalize">{monthName}</span>{alert.odds ? ` · ${t("granja.risk.odds", { hits: alert.odds.hits, total: alert.odds.total, pct: pct.format(alert.odds.hits / alert.odds.total) })}` : alert.fromEvent ? ` · ${t("granja.risk.simulated")}` : ""}</small>
        </div>
        <button type="button" onClick={onClose} aria-label={t("granja.ui.close")}><X size={14} /></button>
      </header>
      {(lots || crops) && <p className="farm-alert-where">{lots}{lots && crops ? " · " : ""}{crops}</p>}
      <p className="farm-alert-fix"><Wand2 size={14} /><span>{fix.key === "none" ? t(`granja.alert.${alert.kind}.action`) : t(`granja.fix.${fix.key}`, { lots: fixLots, from: rotName(fix.from), to: rotName(fix.to), month: monthName })}</span></p>
      {why && <p className="farm-alert-why">{t(`granja.alert.${alert.kind}.what`)}{alert.odds ? ` ${t("granja.risk.oddsWhy", { hits: alert.odds.hits, total: alert.odds.total })}` : ""}</p>}
      <footer>
        {fix.apply && <button type="button" className="farm-alert-apply" onClick={() => onApply(fix)}><Check size={14} />{t("granja.fix.apply")}</button>}
        <button type="button" className="farm-alert-why-btn" onClick={() => setWhy(!why)} aria-expanded={why}><CircleHelp size={14} />{t("granja.fix.why")}</button>
        {more > 0 && <span>+{more}</span>}
      </footer>
    </article>
  );
}
