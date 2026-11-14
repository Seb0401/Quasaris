"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  CloudSun,
  Droplets,
  Gauge,
  Layers3,
  Leaf,
  MapPin,
  Orbit,
  Satellite,
  ScanLine,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { useLocale } from "@/components/i18n-provider";
import { setFarm, useFarm } from "@/lib/farm-store";
import { simulate } from "@/lib/engine-client";
import type { RotationResult, SimulateResponse } from "@/lib/contract";

const ParcelMap = dynamic(() => import("@/components/map/parcel-map"), {
  ssr: false,
  loading: () => <div className="map-skeleton"><ScanLine size={32} /></div>,
});

const ROTATION_COLORS = ["#39a9ff", "#f4ae3d", "#63c778", "#9b7cff"];

function format(locale: string, value: number) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}
function KpiCard({ icon: Icon, label, value, suffix, trend, tone }: { icon: typeof Droplets; label: string; value: string; suffix?: string; trend: string; tone: string }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <span className="kpi-glow" aria-hidden />
      <div className="kpi-icon"><Icon size={19} /></div>
      <div>
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{value}<span>{suffix}</span></p>
      </div>
      <p className="kpi-trend">{trend}</p>
    </article>
  );
}

function SourcePill({ children }: { children: React.ReactNode }) {
  return <span className="source-pill"><Satellite size={14} />{children}</span>;
}

export function DashboardClient() {
  const locale = useLocale();
  const es = locale === "es";
  const farm = useFarm();
  const [data, setData] = useState<SimulateResponse | null>(null);
  const [year, setYear] = useState(2020);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(() => { setScrollY(window.scrollY); frame = 0; }); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    simulate({ ...farm, locale }).then((result) => !cancelled && setData(result));
    return () => { cancelled = true; };
  }, [farm, locale]);

  const results = useMemo(() => data?.rotations ?? [], [data]);
  const recommended = useMemo<RotationResult | null>(() => {
    const viable = results.filter((item) => item.viable);
    return [...(viable.length ? viable : results)].sort((a, b) => b.score - a.score)[0] ?? null;
  }, [results]);
  const current = results.find((item) => item.id === "actual") ?? results[0];

  const comparison = results.map((item, index) => {
    const name = farm.rotations.find((rotation) => rotation.id === item.id)?.name ?? item.id;
    return {
      name: name.replace(" permanente", "").replace("Cebolla · ", ""),
      water: Math.round(item.water.median),
      income: Math.round(item.income.median / 10),
      score: Math.round(item.score * 100) * 80,
      fill: ROTATION_COLORS[index % ROTATION_COLORS.length],
    };
  });

  const history = (recommended?.byYear ?? []).map((item) => ({
    year: item.year,
    water: item.waterM3ha,
    income: Math.max(0, item.incomePEN),
    active: item.year === year,
  }));
  const selectedYear = recommended?.byYear.find((item) => item.year === year) ?? recommended?.byYear[0];
  const waterDelta = current && recommended ? Math.round(current.water.median - recommended.water.median) : 0;
  const incomeDelta = current && recommended ? Math.round(recommended.income.median - current.income.median) : 0;

  return (
    <div className="dashboard-shell">
      <Reveal>
        <section className="mission-hero">
          <div className="hero-photo" style={{ transform: `translate3d(0, ${Math.min(scrollY * .22, 100)}px, 0) scale(1.12)` }} aria-hidden />
          <div className="mission-copy">
            <div className="eyebrow"><Orbit size={16} /> QUASARIS · FARM INTELLIGENCE</div>
            <h1>{es ? "Decide antes de sembrar" : "Decide before you plant"}</h1>
            <p>{es ? "Convierte 21 años de observación satelital en una decisión clara para tu parcela." : "Turn 21 years of satellite observation into a clear decision for your field."}</p>
            <div className="hero-actions">
              <Link href={`/${locale}/parcela`} className="primary-action">
                <MapPin size={18} /> {es ? "Configurar parcela" : "Set up field"} <ArrowRight size={17} />
              </Link>
              <Link href={`/${locale}/comparar`} className="secondary-action">
                <Layers3 size={18} /> {es ? "Ver escenarios" : "View scenarios"}
              </Link>
            </div>
          </div>
          <div className="hero-scan" aria-hidden><Satellite size={19} /><span>NASA POWER · MODIS · SRTM</span></div>
        </section>
      </Reveal>

      <Reveal delay={80} className="source-row">
        <SourcePill>NASA POWER</SourcePill><SourcePill>MODIS NDVI</SourcePill><SourcePill>SRTM</SourcePill>
        <span className="live-status"><span />{es ? "Caché científico disponible" : "Scientific cache available"}</span>
      </Reveal>

      <section className="dashboard-grid">
        <Reveal className="map-panel panel-card" delay={100}>
          <div className="panel-heading">
            <div><span className="panel-kicker">{es ? "OBSERVACIÓN" : "OBSERVATION"}</span><h2>{es ? "Mi parcela · Majes" : "My field · Majes"}</h2></div>
            <span className="coordinate-chip">{farm.lat.toFixed(3)}, {farm.lon.toFixed(3)}</span>
          </div>
          <ParcelMap lat={farm.lat} lon={farm.lon} onPick={(lat, lon) => setFarm({ lat, lon })} compact />
        </Reveal>

        <Reveal className="kpi-grid" delay={160}>
          <KpiCard icon={Droplets} label={es ? "Agua estimada" : "Estimated water"} value={recommended ? format(locale, recommended.water.median) : "—"} suffix=" m³/ha" trend={waterDelta > 0 ? `${format(locale, waterDelta)} ${es ? "menos vs. actual" : "less vs. current"}` : es ? "Calculando escenario" : "Calculating scenario"} tone="tone-water" />
          <KpiCard icon={BadgeDollarSign} label={es ? "Ingreso estimado" : "Estimated income"} value={recommended ? `S/ ${format(locale, recommended.income.median)}` : "—"} trend={incomeDelta >= 0 ? `+S/ ${format(locale, incomeDelta)} ${es ? "vs. actual" : "vs. current"}` : es ? "Prioriza estabilidad" : "Prioritizes stability"} tone="tone-income" />
          <KpiCard icon={Leaf} label={es ? "Salud del suelo" : "Soil health"} value={recommended ? `${Math.round(recommended.soil * 100)}` : "—"} suffix=" /100" trend={es ? "Cobertura y diversidad" : "Cover and diversity"} tone="tone-soil" />
          <KpiCard icon={ShieldAlert} label={es ? "Riesgo climático" : "Climate risk"} value={recommended ? `${Math.round(recommended.risk.median * 100)}%` : "—"} trend={es ? "Rango interanual visible" : "Visible yearly range"} tone="tone-risk" />
        </Reveal>

        <Reveal className="comparison-panel panel-card" delay={180}>
          <div className="panel-heading">
            <div><span className="panel-kicker">{es ? "ESCENARIOS" : "SCENARIOS"}</span><h2>{es ? "Comparación de rotaciones" : "Rotation comparison"}</h2></div>
            <Link href={`/${locale}/comparar`} className="text-action">{es ? "Detalle" : "Details"}<ArrowRight size={15} /></Link>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} barGap={4} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="water-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4fc3ff" /><stop offset="1" stopColor="#1d74e8" /></linearGradient>
                  <linearGradient id="income-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd05a" /><stop offset="1" stopColor="#e78924" /></linearGradient>
                  <linearGradient id="score-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#85df80" /><stop offset="1" stopColor="#2e9f66" /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(114,135,156,.18)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#607489", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8293a4", fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid rgba(80,110,140,.16)", boxShadow: "0 18px 50px rgba(16,42,67,.16)" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="water" name={es ? "Agua m³/ha" : "Water m³/ha"} fill="url(#water-bar)" radius={[7, 7, 2, 2]} animationDuration={1100} />
                <Bar dataKey="income" name={es ? "Ingreso ÷10" : "Income ÷10"} fill="url(#income-bar)" radius={[7, 7, 2, 2]} animationDuration={1350} />
                <Bar dataKey="score" name={es ? "Puntaje ×80" : "Score ×80"} fill="url(#score-bar)" radius={[7, 7, 2, 2]} animationDuration={1550} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rotation-pills">
            {results.map((result, index) => (
              <span key={result.id} className="rotation-pill"><i style={{ background: ROTATION_COLORS[index] }} />{farm.rotations.find((rotation) => rotation.id === result.id)?.name ?? result.id}<b>{Math.round(result.score * 100)}</b>{result.viable && <CheckCircle2 size={14} />}</span>
            ))}
          </div>
        </Reveal>

        <Reveal className="timeline-panel panel-card" delay={220}>
          <div className="panel-heading">
            <div><span className="panel-kicker">{es ? "MÁQUINA DEL TIEMPO" : "TIME MACHINE"}</span><h2>2005—2025</h2></div>
            <span className="year-chip">{year}</span>
          </div>
          <div className="history-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 8, right: 5, left: -28, bottom: 0 }}>
                <defs><linearGradient id="history-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3bb8ff" stopOpacity=".54" /><stop offset="1" stopColor="#3bb8ff" stopOpacity="0" /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(114,135,156,.16)" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: "#8293a4", fontSize: 10 }} minTickGap={22} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8293a4", fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 14, border: "none", boxShadow: "0 18px 45px rgba(16,42,67,.18)" }} />
                <Area type="monotone" dataKey="water" stroke="#238fe3" strokeWidth={3} fill="url(#history-water)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <input aria-label={es ? "Año de simulación" : "Simulation year"} type="range" min={2005} max={2025} value={year} onChange={(event) => setYear(Number(event.target.value))} />
          <div className="year-insight">
            <CloudSun size={19} />
            <span>{selectedYear ? `${year}: ${format(locale, selectedYear.waterM3ha)} m³/ha · ${selectedYear.frostDays} ${es ? "días de helada" : "frost days"}` : es ? "Cargando historia climática" : "Loading climate history"}</span>
          </div>
          <div className="month-heatmap" aria-label={es ? "Riesgo mensual" : "Monthly risk"}>
            {(selectedYear?.months ?? Array.from({ length: 12 }, () => "ok")).map((status, index) => <span key={index} data-status={status} title={status} />)}
          </div>
        </Reveal>

        <Reveal className="recommendation-panel panel-card" delay={250}>
          <div className="recommendation-orbit"><Gauge size={25} /><span>{recommended ? Math.round(recommended.score * 100) : "—"}</span></div>
          <span className="panel-kicker">{es ? "MEJOR AJUSTE" : "BEST FIT"}</span>
          <h2>{farm.rotations.find((rotation) => rotation.id === recommended?.id)?.name ?? (es ? "Analizando rotaciones" : "Analyzing rotations")}</h2>
          <p>{es ? "Balancea el agua disponible, el ingreso, la salud del suelo y el riesgo climático según tus prioridades." : "Balances available water, income, soil health and climate risk using your priorities."}</p>
          <div className="recommendation-evidence"><Sparkles size={17} />{es ? "Explicación basada en el motor, no generada al azar" : "Explanation comes from the engine, not random generation"}</div>
          <Link href={`/${locale}/comparar`} className="primary-action compact">{es ? "Explorar recomendación" : "Explore recommendation"}<ArrowRight size={17} /></Link>
        </Reveal>
      </section>
    </div>
  );
}

