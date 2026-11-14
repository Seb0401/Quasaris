"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useLocale, useT } from "@/components/i18n-provider";
import type { SimulateResponse } from "@/lib/contract";
import { cropName } from "@/lib/crop-calendar";
import { setFarm, useFarm } from "@/lib/farm-store";
import { FARM_SIZES, resizeFarm, setGranja, useGranja } from "@/lib/granja-store";
import { BASELINE_ID, PALETTE, ROTATION_COLOR, evaluateGoals, notableYears, rotationEmoji, simulateYear, type TileState } from "@/lib/granja-sim";
import { useSimulation } from "@/lib/use-simulation";
import { SKY_GRADIENT, type Weather } from "@/components/granja/farm-scene";
import { Celebration, Tutorial, playCoin } from "@/components/granja/overlays";
import { Reveal } from "@/components/motion/reveal";
import { CountUp, LoadingOrbit, Meter, PageHeader, Panel } from "@/components/ui/kit";
import { BarChart3, Brush, Coins, Droplets, Flag, Gamepad2, MapPin, Pause, Play, RotateCcw, SkipBack, Sprout, StepBack, StepForward, Target, Tractor, Volume2, VolumeX, Waves } from "lucide-react";

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
const TAG_ICON = { driest: "🌵", frost: "❄️", heat: "🔥", wettest: "💧" } as const;

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
              <div className="option-cards">
                {(["gravedad", "aspersion", "goteo"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setFarm({ irrigation: v })} className={`option-card ${farm.irrigation === v ? "active" : ""}`}>
                    <b>{t(`irrigation.${v}`)}</b>
                  </button>
                ))}
              </div>
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

// ---------------------------------------------------------------- paso 2: la granja

function Farm() {
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const granja = useGranja();
  const webgl = useSyncExternalStore(webglStore.sub, webglStore.get, webglStore.server);
  const data = useSimulation({ rotations: PALETTE, cacheKey: "farmtwin.granja.sim.v1", fallback: fallbackGranja });

  const [brush, setBrush] = useState<string>("suelo_agua");
  const [month, setMonth] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const sim = useMemo(() => (data ? simulateYear(data, granja.tiles, granja.haPerTile, granja.year, farm.waterAvailableM3ha) : null), [data, granja.tiles, granja.haPerTile, granja.year, farm.waterAvailableM3ha]);
  const years = useMemo(() => (data ? notableYears(data) : []), [data]);
  const goals = useMemo(() => (sim ? evaluateGoals(sim.summary, granja.tiles.length) : []), [sim, granja.tiles.length]);
  const finished = month === 11;

  // avanzar los meses
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

  // medallas al terminar el año
  useEffect(() => {
    if (!finished || playing) return;
    const won = goals.filter((g) => g.done).map((g) => g.id);
    const fresh = won.filter((g) => !granja.badges.includes(g));
    if (fresh.length) setGranja((s) => ({ badges: Array.from(new Set([...s.badges, ...won])), lastWon: fresh }));
  }, [finished, playing, goals, granja.badges]);

  // sonido de moneda cuando hay cosecha en el mes
  const harvestCount = sim?.months[month]?.harvests.length ?? 0;
  useEffect(() => {
    if (granja.sound && harvestCount > 0 && month > 0) playCoin();
  }, [month, harvestCount, granja.sound]);

  const paint = useCallback(
    (i: number) => {
      setSelected(i);
      setGranja((s) => {
        if (s.tiles[i] === brush) return {};
        const tiles = [...s.tiles];
        tiles[i] = brush;
        return { tiles };
      });
    },
    [brush],
  );

  if (!data || !sim) return <div className="ui-page"><LoadingOrbit label={t("comparar.loading")} /></div>;

  const es = locale === "es";
  const snap = sim.months[month];
  const reservoir = Math.max(0, 1 - snap.waterUsedM3 / Math.max(snap.waterCapacityM3, 1));
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "long" });
  const fmtShort = new Intl.DateTimeFormat(locale, { month: "narrow" });
  const kinds = snap.events.map((e) => e.kind);
  const weather: Weather = kinds.includes("dry") ? "dry" : kinds.includes("climate_risk") ? "frost" : kinds.includes("water_stress") ? "heat" : "clear";
  const byId = new Map(data.rotations.map((r) => [r.id, r]));
  const sel = selected !== null ? snap.tiles[selected] : null;
  const won = goals.filter((g) => g.done).length;

  const reset = () => {
    setPlaying(false);
    setMonth(0);
  };

  return (
    <div className="ui-page farm-page">
      {/* escena + HUD */}
      <div className="farm-stage" style={{ background: SKY_GRADIENT[weather] }}>
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
            onTileTap={paint}
          />
        ) : (
          <FlatFarm cols={granja.cols} tiles={snap.tiles} selected={selected} onTap={paint} />
        )}

        <div className="farm-hud">
          <div className="hud-card hud-reservoir">
            <span><Droplets size={14} />{t("granja.reservoir")}<b className={reservoir <= 0.15 ? "is-bad" : ""}>{pct.format(reservoir)}</b></span>
            <Meter value={reservoir} color={reservoir < 0.15 ? "var(--danger)" : "#5cc8f5"} height={7} />
          </div>
          <div className="hud-card"><Coins size={14} /><CountUp value={snap.incomePEN} format={(v) => `S/ ${n.format(v)}`} duration={700} /></div>
          <div className="hud-card"><Sprout size={14} />{pct.format(sim.summary.soil)}</div>
          <div className="hud-card hud-date"><span className="capitalize">{fmtMonth.format(new Date(granja.year, month, 1))}</span> {granja.year}</div>
          <button type="button" className="hud-card hud-sound" onClick={() => setGranja((s) => ({ sound: !s.sound }))} aria-label={granja.sound ? (es ? "Silenciar" : "Mute") : (es ? "Activar sonido" : "Sound on")}>
            {granja.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>

        {!granja.tutorialDone && <Tutorial onClose={() => setGranja({ tutorialDone: true })} />}
        {granja.lastWon.length > 0 && <Celebration medals={granja.lastWon} onClose={() => setGranja({ lastWon: [] })} />}

        {snap.events.length > 0 && (
          <div className="farm-events">
            {snap.events.map((e) => <div key={`${month}-${e.kind}`} className="farm-event">{t(`granja.event.${e.kind}`, { n: e.tiles })}</div>)}
          </div>
        )}

        {/* línea de meses */}
        <div className="farm-months">
          {Array.from({ length: 12 }, (_, m) => (
            <button key={m} type="button" className={`${m === month ? "active" : ""} ${m < month ? "past" : ""}`} onClick={() => { setPlaying(false); setMonth(m); }} aria-label={fmtMonth.format(new Date(granja.year, m, 1))}>
              {fmtShort.format(new Date(granja.year, m, 1))}
            </button>
          ))}
        </div>
      </div>

      {/* controles de tiempo */}
      <section className="farm-controls">
        <button type="button" onClick={reset} aria-label={t("granja.reset")} className="time-btn"><SkipBack size={17} /></button>
        <button type="button" onClick={() => setMonth((m) => Math.max(0, m - 1))} aria-label={es ? "Mes anterior" : "Previous month"} className="time-btn"><StepBack size={17} /></button>
        <button
          type="button"
          onClick={() => {
            if (finished) setMonth(0);
            setPlaying((p) => !p);
          }}
          className={`ui-btn ui-btn-lg farm-play ${playing ? "is-playing" : ""}`}
        >
          {playing ? <><Pause size={18} fill="currentColor" />{t("granja.pause")}</> : finished ? <><RotateCcw size={18} />{t("granja.replay")}</> : <><Play size={18} fill="currentColor" />{t("granja.play")}</>}
        </button>
        <button type="button" onClick={() => setMonth((m) => Math.min(11, m + 1))} aria-label={es ? "Mes siguiente" : "Next month"} className="time-btn"><StepForward size={17} /></button>
      </section>

      <div className="farm-grid">
        <div className="farm-col">
          <Panel kicker={es ? "AÑO REAL · NASA" : "REAL YEAR · NASA"} icon={Flag} title={es ? "¿Qué año quieres jugar?" : "Which year do you want to play?"}>
            <p className="ui-hint">{t("granja.yearHint")}</p>
            <div className="month-chips">
              {years.map((y) => (
                <button
                  key={y.year}
                  type="button"
                  onClick={() => {
                    setGranja({ year: y.year });
                    reset();
                  }}
                  className={y.year === granja.year ? "active" : ""}
                  title={y.tag ? t(`granja.tag.${y.tag}`) : undefined}
                >
                  {y.tag ? `${TAG_ICON[y.tag]} ` : ""}{y.year}
                </button>
              ))}
            </div>
          </Panel>

          <Panel kicker={es ? "PALETA" : "PALETTE"} icon={Brush} title={t("granja.palette")} actions={<button type="button" onClick={() => setGranja((s) => ({ tiles: s.tiles.map(() => brush) }))} className="ui-btn ui-btn-ghost ui-btn-sm">{t("granja.fillAll")}</button>}>
            <div className="palette-grid">
              {PALETTE.map((r) => {
                const res = byId.get(r.id);
                const active = brush === r.id;
                return (
                  <button key={r.id} type="button" onClick={() => setBrush(r.id)} className={`palette-item ${active ? "active" : ""}`} style={{ "--accent": ROTATION_COLOR[r.id] } as React.CSSProperties}>
                    <span className="palette-emoji">{rotationEmoji(r.id)}</span>
                    <b>{r.id === "descanso" ? t("granja.fallow") : r.name}</b>
                    {res && <small><Droplets size={11} />{n.format(res.water.median)} · <Coins size={11} />{n.format(res.income.median)}</small>}
                  </button>
                );
              })}
            </div>
            <p className="ui-hint">{t("granja.paletteHint")}</p>
            {sel && (
              <p className="tile-info">
                <b>{t("granja.tile")} {selected! + 1}</b> · {rotationEmoji(sel.rotationId)} {PALETTE.find((p) => p.id === sel.rotationId)?.name} · {sel.cropId ? `${cropName(sel.cropId, locale)} (${pct.format(sel.growth)})` : t("granja.fallow")} · {t(`granja.status.${sel.status}`)}
              </p>
            )}
          </Panel>
        </div>

        <div className="farm-col">
          <Panel kicker={finished ? `${won}/${goals.length} ${es ? "LOGRADAS" : "ACHIEVED"}` : es ? "JUEGA EL AÑO PARA GANAR" : "PLAY THE YEAR TO WIN"} icon={Target} title={t("granja.goals")}>
            <ul className="goal-list">
              {goals.map((g) => {
                const done = g.done && finished;
                return (
                  <li key={g.id} className={done ? "is-done" : ""}>
                    <span className="goal-icon">{g.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="goal-top"><span>{t(`granja.goal.${g.id}`)}</span><b>{finished ? (g.done ? "✓" : "—") : granja.badges.includes(g.id) ? "🏅" : `${Math.round(g.progress * 100)}%`}</b></div>
                      <Meter value={g.progress} color={done ? "var(--brand)" : "rgba(185,255,99,.45)"} height={5} />
                    </div>
                  </li>
                );
              })}
            </ul>
            {!finished && <p className="ui-hint">{t("granja.goalsHint")}</p>}
          </Panel>

          {finished && (
            <Panel kicker={es ? "FIN DEL AÑO" : "END OF YEAR"} icon={Flag} title={t("granja.resultTitle", { year: granja.year })} className="farm-result">
              <ResultRow label={`${t("comparar.water")} (m³)`} mine={sim.summary.waterM3} base={sim.summary.baseline.waterM3} lowerIsBetter />
              <ResultRow label={`${t("comparar.income")} (S/)`} mine={sim.summary.incomePEN} base={sim.summary.baseline.incomePEN} />
              <p className="ui-hint">{t("granja.resultHint", { ha: n.format(granja.tiles.length * granja.haPerTile) })}</p>
            </Panel>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setGranja({ zoneSet: false })} className="ui-btn ui-btn-ghost"><MapPin size={15} />{t("granja.changeZone")}</button>
            <Link href={`/${locale}/comparar`} className="ui-btn ui-btn-ghost"><BarChart3 size={15} />{t("granja.expert")}</Link>
          </div>
          <p className="ui-source">{t("granja.source", { base: PALETTE.find((p) => p.id === BASELINE_ID)?.name ?? "" })}</p>
        </div>
      </div>
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
    <div className="result-row">
      <span>{label}</span>
      <strong><CountUp value={mine} format={(v) => n.format(v)} /></strong>
      <small>{t("granja.vsBaseline")} {n.format(base)}</small>
      <em className={good ? "is-good" : "is-bad"}>{diff > 0 ? "+" : ""}{Math.round(diff * 100)}%</em>
    </div>
  );
}

/** Respaldo sin WebGL: la misma granja en una cuadrícula 2D. */
function FlatFarm({ cols, tiles, selected, onTap }: { cols: number; tiles: TileState[]; selected: number | null; onTap: (i: number) => void }) {
  const BG: Record<string, string> = { ok: "#6e4a2f", water_stress: "#9a7448", climate_risk: "#6f7f93", dry: "#cdb487", bare: "#8d6a48" };
  const EMO: Record<string, string> = { alfalfa: "🌿", papa: "🥔", cebolla: "🧅", maiz_chala: "🌽", haba: "🫘", frijol: "🫘" };
  return (
    <div className="grid h-full w-full content-center gap-1.5 bg-[#d9c49b] p-6" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {tiles.map((tl, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onTap(i)}
          className="flex aspect-square items-center justify-center rounded-lg border-4 text-2xl"
          style={{ background: BG[tl.status], borderColor: selected === i ? "#fff" : ROTATION_COLOR[tl.rotationId] }}
        >
          <span style={{ transform: `scale(${0.5 + tl.growth * 0.6})` }}>{tl.cropId ? EMO[tl.cropId] : ""}</span>
        </button>
      ))}
    </div>
  );
}
