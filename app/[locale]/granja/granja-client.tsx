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

const FarmScene = dynamic(() => import("@/components/granja/farm-scene"), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center text-4xl">🚜</div>,
});
const ParcelMap = dynamic(() => import("@/components/map/parcel-map"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-border" />,
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

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold">🎮 {t("granja.title")}</h1>
        <p className="text-sm text-muted">{t("granja.zoneHint")}</p>
      </header>
      <ParcelMap lat={farm.lat} lon={farm.lon} onPick={(lat, lon) => setFarm({ lat, lon })} className="h-72" />
      <p className="text-xs text-muted">
        📍 {farm.lat.toFixed(4)}, {farm.lon.toFixed(4)}
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t("granja.size")}</h2>
        <div className="grid grid-cols-4 gap-2">
          {FARM_SIZES.map((s) => (
            <button
              key={s.ha}
              type="button"
              onClick={() => resizeFarm(s.ha)}
              className={`rounded-xl border px-2 py-3 text-sm font-semibold ${Math.abs(ha - s.ha) < 0.01 ? "border-brand bg-brand text-brand-ink" : "border-border bg-surface"}`}
            >
              {s.ha} ha
              <span className="block text-[11px] font-normal opacity-80">
                {s.cols * s.rows} {t("granja.tiles")}
              </span>
            </button>
          ))}
        </div>
      </section>

      <label className="flex flex-col gap-2">
        <span className="font-semibold">💧 {t("parcela.water")}</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={500}
          value={farm.waterAvailableM3ha}
          onChange={(e) => setFarm({ waterAvailableM3ha: Number(e.target.value) || 0 })}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-lg"
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {(["gravedad", "aspersion", "goteo"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setFarm({ irrigation: v })}
            className={`rounded-xl border px-2 py-3 text-sm font-medium ${farm.irrigation === v ? "border-brand bg-brand text-brand-ink" : "border-border bg-surface"}`}
          >
            {t(`irrigation.${v}`)}
          </button>
        ))}
      </div>

      <button type="button" onClick={() => setGranja({ zoneSet: true })} className="rounded-full bg-brand px-5 py-4 text-lg font-semibold text-brand-ink">
        🚜 {t("granja.build")}
      </button>
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

  if (!data || !sim) return <p className="animate-pulse py-12 text-center text-muted">🛰️ {t("comparar.loading")}</p>;

  const snap = sim.months[month];
  const reservoir = Math.max(0, 1 - snap.waterUsedM3 / Math.max(snap.waterCapacityM3, 1));
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "long" });
  const kinds = snap.events.map((e) => e.kind);
  const weather: Weather = kinds.includes("dry") ? "dry" : kinds.includes("climate_risk") ? "frost" : kinds.includes("water_stress") ? "heat" : "clear";
  const byId = new Map(data.rotations.map((r) => [r.id, r]));
  const sel = selected !== null ? snap.tiles[selected] : null;

  const reset = () => {
    setPlaying(false);
    setMonth(0);
  };

  return (
    <div className="-mx-4 flex flex-col">
      {/* escena + HUD */}
      <div className="relative h-[58vh] min-h-80 w-full overflow-hidden transition-[background] duration-700" style={{ background: SKY_GRADIENT[weather] }}>
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

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start gap-2 p-3 text-sm font-semibold text-[#1f2a1f]">
          <div className="min-w-36 rounded-2xl bg-white/85 px-3 py-2 shadow-sm backdrop-blur">
            <div className="flex justify-between gap-2">
              <span>💧 {t("granja.reservoir")}</span>
              <span className={reservoir <= 0 ? "text-[#c0392b]" : ""}>{pct.format(reservoir)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#d8e6ef]">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${reservoir * 100}%`, background: reservoir < 0.15 ? "#c0392b" : "#2b6cb0" }} />
            </div>
          </div>
          <div className="rounded-2xl bg-white/85 px-3 py-2 shadow-sm backdrop-blur">💰 S/ {n.format(snap.incomePEN)}</div>
          <div className="rounded-2xl bg-white/85 px-3 py-2 shadow-sm backdrop-blur">🌱 {pct.format(sim.summary.soil)}</div>
          <div className="ml-auto rounded-2xl bg-white/85 px-3 py-2 capitalize shadow-sm backdrop-blur">
            📅 {fmtMonth.format(new Date(granja.year, month, 1))} {granja.year}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setGranja((s) => ({ sound: !s.sound }))}
          aria-label={granja.sound ? "mute" : "sound"}
          className="absolute right-3 top-16 rounded-full bg-white/85 px-2.5 py-1.5 text-sm shadow-sm"
        >
          {granja.sound ? "🔊" : "🔇"}
        </button>
        {!granja.tutorialDone && <Tutorial onClose={() => setGranja({ tutorialDone: true })} />}
        {granja.lastWon.length > 0 && <Celebration medals={granja.lastWon} onClose={() => setGranja({ lastWon: [] })} />}

        {snap.events.length > 0 && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col gap-1">
            {snap.events.map((e) => (
              <div key={e.kind} className="rounded-xl bg-[#1f2a1f]/85 px-3 py-2 text-sm text-white shadow">
                {t(`granja.event.${e.kind}`, { n: e.tiles })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4">
        {/* controles de tiempo */}
        <section className="flex items-center gap-2">
          <button type="button" onClick={reset} aria-label={t("granja.reset")} className="h-11 w-11 shrink-0 rounded-full border border-border bg-surface text-lg">
            ⏮
          </button>
          <button type="button" onClick={() => setMonth((m) => Math.max(0, m - 1))} aria-label="-1" className="h-11 w-11 shrink-0 rounded-full border border-border bg-surface text-lg">
            ◀
          </button>
          <button
            type="button"
            onClick={() => {
              if (finished) setMonth(0);
              setPlaying((p) => !p);
            }}
            className="h-11 flex-1 rounded-full bg-brand font-semibold text-brand-ink"
          >
            {playing ? `❚❚ ${t("granja.pause")}` : finished ? `↻ ${t("granja.replay")}` : `▶ ${t("granja.play")}`}
          </button>
          <button type="button" onClick={() => setMonth((m) => Math.min(11, m + 1))} aria-label="+1" className="h-11 w-11 shrink-0 rounded-full border border-border bg-surface text-lg">
            ▶
          </button>
        </section>

        {/* año real de NASA */}
        <section className="flex flex-col gap-1">
          <span className="text-xs text-muted">{t("granja.yearHint")}</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {years.map((y) => (
              <button
                key={y.year}
                type="button"
                onClick={() => {
                  setGranja({ year: y.year });
                  reset();
                }}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm tabular-nums ${y.year === granja.year ? "border-brand bg-brand text-brand-ink" : "border-border bg-surface"}`}
                title={y.tag ? t(`granja.tag.${y.tag}`) : undefined}
              >
                {y.tag ? `${TAG_ICON[y.tag]} ` : ""}
                {y.year}
              </button>
            ))}
          </div>
        </section>

        {/* paleta */}
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">🖌️ {t("granja.palette")}</h2>
            <button type="button" onClick={() => setGranja((s) => ({ tiles: s.tiles.map(() => brush) }))} className="text-xs font-medium text-brand">
              {t("granja.fillAll")}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PALETTE.map((r) => {
              const res = byId.get(r.id);
              const active = brush === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setBrush(r.id)}
                  className={`flex flex-col items-start gap-0.5 rounded-xl border-2 bg-surface px-3 py-2 text-left ${active ? "shadow-md" : "border-transparent"}`}
                  style={{ borderColor: active ? ROTATION_COLOR[r.id] : undefined }}
                >
                  <span className="text-lg leading-none">{rotationEmoji(r.id)}</span>
                  <span className="text-xs font-semibold leading-tight">
                    <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: ROTATION_COLOR[r.id] }} />
                    {r.id === "descanso" ? t("granja.fallow") : r.name}
                  </span>
                  {res && (
                    <span className="text-[10px] text-muted">
                      💧 {n.format(res.water.median)} · 💰 {n.format(res.income.median)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted">{t("granja.paletteHint")}</p>
        </section>

        {sel && (
          <section className="rounded-xl border border-border bg-surface p-3 text-sm">
            <b>
              {t("granja.tile")} {selected! + 1}
            </b>{" "}
            · {rotationEmoji(sel.rotationId)} {PALETTE.find((p) => p.id === sel.rotationId)?.name} ·{" "}
            {sel.cropId ? `${cropName(sel.cropId, locale)} (${pct.format(sel.growth)})` : t("granja.fallow")} · {t(`granja.status.${sel.status}`)}
          </section>
        )}

        {/* metas */}
        <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-semibold">🎯 {t("granja.goals")}</h2>
          {goals.map((g) => (
            <div key={g.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className={g.done && finished ? "font-semibold" : ""}>
                  {g.icon} {t(`granja.goal.${g.id}`)}
                </span>
                <span>{finished ? (g.done ? "✅" : "—") : granja.badges.includes(g.id) ? "🏅" : ""}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-background">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${g.progress * 100}%`, opacity: finished ? 1 : 0.45 }} />
              </div>
            </div>
          ))}
          {!finished && <p className="text-[11px] text-muted">{t("granja.goalsHint")}</p>}
        </section>

        {finished && (
          <section className="flex flex-col gap-2 rounded-2xl border-2 border-brand bg-surface p-4">
            <h2 className="text-lg font-bold">🏁 {t("granja.resultTitle", { year: granja.year })}</h2>
            <ResultRow label={`💧 ${t("comparar.water")} (m³)`} mine={sim.summary.waterM3} base={sim.summary.baseline.waterM3} lowerIsBetter />
            <ResultRow label={`💰 ${t("comparar.income")} (S/)`} mine={sim.summary.incomePEN} base={sim.summary.baseline.incomePEN} />
            <p className="text-xs text-muted">{t("granja.resultHint", { ha: n.format(granja.tiles.length * granja.haPerTile) })}</p>
          </section>
        )}

        <div className="flex flex-wrap gap-3 pb-2 text-sm">
          <button type="button" onClick={() => setGranja({ zoneSet: false })} className="rounded-full border border-border px-4 py-2">
            📍 {t("granja.changeZone")}
          </button>
          <Link href={`/${locale}/comparar`} className="rounded-full border border-border px-4 py-2">
            📊 {t("granja.expert")}
          </Link>
        </div>
        <p className="pb-2 text-[11px] text-muted">{t("granja.source", { base: PALETTE.find((p) => p.id === BASELINE_ID)?.name ?? "" })}</p>
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
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 text-sm">
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{n.format(mine)}</span>
      <span className="text-xs text-muted">
        {t("granja.vsBaseline")} {n.format(base)}
      </span>
      <span className={`text-xs font-semibold tabular-nums ${good ? "text-ok" : "text-danger"}`}>
        {diff > 0 ? "+" : ""}
        {Math.round(diff * 100)}%
      </span>
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
