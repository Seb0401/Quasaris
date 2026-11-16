"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowUpRight,
  DropletOff,
  Droplets,
  Earth,
  Layers3,
  Leaf,
  ShieldCheck,
  Sprout,
  Sun,
  Target,
  TrendingDown,
  WheatOff,
} from "lucide-react";

/**
 * Home: problemática → solución (panel del hero) y la sección de impacto (objetivo, alcance y metas).
 * Las cifras vienen de fuentes públicas citadas al pie de la sección; las metas son propuestas
 * frente a la rotación actual (alfalfa) y se validan con un agrónomo.
 */

const STEPS = 3; // 0 = sequía, 1 = cosechas perdidas, 2 = solución
const STEP_MS = 2800;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** true si el usuario pidió menos animación: se muestra todo a la vez, sin ciclo. */
function useReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
}

export function ImpactVisual({ locale }: { locale: string }) {
  const es = locale === "es";
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setStep((s) => (s + 1) % STEPS), STEP_MS);
    return () => window.clearInterval(id);
  }, [reduced]);

  // sin animación se ve todo a la vez: los dos problemas y la solución
  const state = (i: number) => (reduced ? "is-active" : step === i ? "is-active" : step === 2 && i < 2 ? "is-resolved" : "");
  // el detalle de cada cifra no ocupa espacio: queda para lectores de pantalla y como texto al pasar el mouse
  const drought = es ? "Represa Condoroma al 46 % de su capacidad (noviembre 2026); ya se recortó un 10 % el agua de riego" : "Condoroma reservoir at 46% of capacity (November 2026); irrigation water already cut by 10%";
  const loss = es ? "La producción agrícola de Arequipa cayó 13,1 % en el segundo trimestre de 2026" : "Arequipa's farm output fell 13.1% in Q2 2026";

  return (
    <div className="qx-signal-card qx-impact-card" role="group" aria-label={es ? "Del problema a la solución" : "From problem to solution"}>
      <header>
        <div><span className="qx-live-dot" /><small>{es ? "DEL PROBLEMA A LA SOLUCIÓN" : "FROM PROBLEM TO SOLUTION"}</small></div>
        <span>MAJES · AREQUIPA</span>
      </header>

      <div className={`qx-imp-stage ${reduced ? "is-static" : ""}`} data-step={step}>
        <svg className="qx-imp-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path className={`qx-imp-link ${state(0)} ${step === 2 || reduced ? "is-flowing" : ""}`} d="M25 26 C 25 55, 50 50, 50 70" />
          <path className={`qx-imp-link ${state(1)} ${step === 2 || reduced ? "is-flowing" : ""}`} d="M75 26 C 75 55, 50 50, 50 70" />
        </svg>

        <article className={`qx-imp-node qx-imp-problem tone-drought ${state(0)}`} aria-label={drought} title={drought}>
          <div className="qx-imp-badge"><DropletOff size={26} strokeWidth={1.7} /></div>
          <h3>{es ? "Sequía" : "Drought"}</h3>
          <strong>46 %</strong>
        </article>

        <article className={`qx-imp-node qx-imp-problem tone-loss ${state(1)}`} aria-label={loss} title={loss}>
          <div className="qx-imp-badge"><WheatOff size={26} strokeWidth={1.7} /></div>
          <h3>{es ? "Cosechas perdidas" : "Lost harvests"}</h3>
          <strong>{es ? "−13,1 %" : "−13.1%"}</strong>
        </article>

        <article className={`qx-imp-node qx-imp-solution ${state(2)}`} aria-label={es ? "Solución: Quasaris, gemelo digital de la chacra" : "Solution: Quasaris, a digital twin of the farm"}>
          <div className="qx-imp-farm">
            {/* la misma granja 3D del modo granja, en miniatura (public/images/farm-twin.webp) */}
            <Image src="/images/farm-twin.webp" alt="" fill sizes="(min-width: 1050px) 260px, 60vw" priority />
          </div>
          <h3 className="qx-imp-brand">QUASARIS</h3>
        </article>
      </div>

      <footer>
        <div className="qx-imp-dots" aria-hidden>{Array.from({ length: STEPS }, (_, i) => <i key={i} className={reduced || step === i ? "on" : ""} />)}</div>
        <Link href={`/${locale}/granja`} className="qx-farm-cta">{es ? "Abrir la granja" : "Open the farm"}<ArrowUpRight size={15} /></Link>
      </footer>
    </div>
  );
}

type Kpi = { icon: typeof Droplets; value: string; label: string; note: string };

export function ImpactSection({ locale }: { locale: string }) {
  const es = locale === "es";

  const scope = [
    { icon: Earth, level: es ? "ÁMBITO" : "SCOPE", title: es ? "Seguridad alimentaria" : "Food security", tags: es ? ["ODS 2 · Hambre cero", "Meta 2.4"] : ["SDG 2 · Zero hunger", "Target 2.4"], note: es ? "Dimensión de estabilidad: alimentos e ingresos que no se caen con el clima." : "Stability dimension: food and income that hold up against the climate." },
    { icon: Sprout, level: es ? "ÁREA" : "AREA", title: es ? "Agricultura climáticamente resiliente" : "Climate-resilient agriculture", tags: es ? ["Adaptación", "Productividad e ingresos"] : ["Adaptation", "Productivity and income"], note: es ? "Enfoque FAO de agricultura climáticamente inteligente." : "FAO climate-smart agriculture approach." },
    { icon: Droplets, level: es ? "SUBÁREA" : "SUB-AREA", title: es ? "Gestión del agua agrícola frente a la sequía" : "Agricultural water management under drought", tags: es ? ["ODS 6.4", "ODS 13.1"] : ["SDG 6.4", "SDG 13.1"], note: es ? "Regiones de riego con escasez de agua; piloto en Majes, replicable en el mundo." : "Water-scarce irrigated regions; piloted in Majes, replicable worldwide." },
  ];

  const kpis: Kpi[] = es
    ? [
        { icon: Droplets, value: "−20 %", label: "Agua por campaña", note: "m³/ha frente a la alfalfa actual" },
        { icon: ShieldCheck, value: "≥ 17/21", label: "Años en que el agua alcanza", note: "con 21 años reales de clima NASA" },
        { icon: WheatOff, value: "0", label: "Meses con cultivo seco", note: "por falta de agua, en un año típico" },
        { icon: TrendingDown, value: "−30 %", label: "Pérdida de ingreso en el peor año", note: "frente a la mediana" },
        { icon: Layers3, value: "100 %", label: "Chacra regada con la cuota", note: "o en descanso planificado, nunca perdida" },
        { icon: Sun, value: "≤ 1", label: "Mes con campo desnudo", note: "por año: menos erosión" },
        { icon: Leaf, value: "≥ 70", label: "Salud del suelo (/100)", note: "leguminosas y cobertura" },
      ]
    : [
        { icon: Droplets, value: "−20%", label: "Water per season", note: "m³/ha vs. today's alfalfa" },
        { icon: ShieldCheck, value: "≥ 17/21", label: "Years the water is enough", note: "over 21 real years of NASA climate" },
        { icon: WheatOff, value: "0", label: "Months with dried-out crops", note: "from lack of water, in a typical year" },
        { icon: TrendingDown, value: "−30%", label: "Income loss in the worst year", note: "vs. the median" },
        { icon: Layers3, value: "100%", label: "Field irrigated within the quota", note: "or planned fallow, never lost" },
        { icon: Sun, value: "≤ 1", label: "Month with bare soil", note: "per year: less erosion" },
        { icon: Leaf, value: "≥ 70", label: "Soil health (/100)", note: "legumes and cover" },
      ];

  const sources = [
    { label: "FAO", href: "https://www.fao.org/4/y4683e/y4683e07.htm" },
    { label: "ENAHO 2025 (Nutrients, 2026)", href: "https://doi.org/10.3390/nu18152528" },
    { label: es ? "Condoroma y SENAMHI (El Búho)" : "Condoroma and SENAMHI (El Búho)", href: "https://elbuho.pe/2026/11/alcanzara-el-agua-represas-de-arequipa-muestran-comportamientos-dispares-ante-posible-reduccion-de-lluvias-por-fenomeno-el-nino/" },
    { label: "INEI (Agraria.pe)", href: "https://agraria.pe/noticias/produccion-agropecuaria-nacional-disminuyo-2-0-en-el-segundo-43114" },
    { label: es ? "Cebolla de Arequipa (RPP)" : "Arequipa onion (RPP)", href: "https://rpp.pe/economia/economia/bloqueo-de-carreteras-arequipa-pierde-mas-de-15-millon-de-kilos-de-cebolla-diarios-que-pasa-con-la-papa-y-el-tomate-noticia-1645887" },
  ];

  return (
    <section className="qx-impact" id="qx-impact" aria-labelledby="qx-impact-title">
      <div className="qx-impact-inner">
        <div className="qx-impact-head">
          <div>
            <span className="qx-kicker"><Target size={14} /> {es ? "IMPACTO" : "IMPACT"}</span>
            <h2 id="qx-impact-title">{es ? <>Seguridad alimentaria <em>frente a la sequía.</em></> : <>Food security <em>in the face of drought.</em></>}</h2>
          </div>
          <p>
            {es
              ? "La agricultura de riego ocupa menos del 20 % de la tierra cultivada, pero produce cerca del 40 % de los alimentos del mundo. En Majes —70 % de la cebolla del Perú y primer distrito lechero— la represa Condoroma está al 46 %, ya se recortó un 10 % el agua de riego y el agro de Arequipa cayó 13,1 %. Sin ver el riesgo, las cosechas se secan a medio ciclo."
              : "Irrigated agriculture covers under 20% of cropland yet grows about 40% of the world's food. In Majes —70% of Peru's onions and its top dairy district— the Condoroma reservoir is at 46%, irrigation water has already been cut by 10% and Arequipa's farm output fell 13.1%. Without seeing the risk, crops dry out mid-season."}
          </p>
        </div>

        <div className="qx-impact-global" aria-label={es ? "Por qué es un problema global" : "Why it is a global problem"}>
          <div><strong>&lt;20{es ? " %" : "%"}</strong><span>{es ? "de la tierra cultivada del mundo es de riego" : "of the world's cropland is irrigated"}</span></div>
          <div><strong>40{es ? " %" : "%"}</strong><span>{es ? "de los alimentos del mundo sale de ella" : "of the world's food comes from it"}</span></div>
          <div><strong>70{es ? " %" : "%"}</strong><span>{es ? "del agua dulce extraída va a la agricultura" : "of freshwater withdrawals go to farming"}</span></div>
          <div className="qx-impact-global-note"><Earth size={16} /> {es ? "NASA POWER y SRTM cubren todo el planeta: la solución se replica en cualquier zona de riego." : "NASA POWER and SRTM cover the whole planet: the solution replicates to any irrigated region."}</div>
        </div>

        <div className="qx-impact-grid">
          <article className="qx-impact-objective">
            <span className="qx-impact-label"><Target size={15} /> {es ? "OBJETIVO" : "OBJECTIVE"}</span>
            <p>
              {es
                ? "Que cada agricultor elija, antes de sembrar, rotaciones que quepan en el agua que realmente tendrá —con 21 años de clima real de la NASA, ajustado a su altitud y calculado con FAO-56— para evitar cosechas perdidas y estabilizar su ingreso."
                : "Help every farmer choose, before planting, rotations that fit the water they will really have —using 21 years of real NASA climate, adjusted to their altitude and computed with FAO-56— to avoid lost harvests and stabilize their income."}
            </p>
          </article>

          <ol className="qx-impact-scope">
            {scope.map(({ icon: Icon, level, title, tags, note }) => (
              <li key={level}>
                <div className="qx-scope-icon"><Icon size={19} /></div>
                <div>
                  <small>{level}</small>
                  <h3>{title}</h3>
                  <p>{note}</p>
                  <div className="qx-scope-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="qx-kpi-head">
          <div>
            <span className="qx-impact-label"><ShieldCheck size={15} /> {es ? "METAS · KPI" : "GOALS · KPIs"}</span>
            <h3>{es ? "Lo que FarmTwin busca mejorar" : "What FarmTwin aims to improve"}</h3>
          </div>
          <p>{es ? "Frente a la rotación actual (alfalfa), medido con el propio motor sobre 21 años reales." : "Against today's rotation (alfalfa), measured by the engine itself over 21 real years."}</p>
        </div>

        <ul className="qx-kpi-grid">
          {kpis.map(({ icon: Icon, value, label, note }) => (
            <li key={label}>
              <Icon size={18} className="qx-kpi-icon" aria-hidden />
              <strong>{value}</strong>
              <span>{label}</span>
              <small>{note}</small>
            </li>
          ))}
        </ul>

        <p className="qx-impact-foot">
          {es ? "Metas propuestas, a validar con un agrónomo y en campo. Fuentes: " : "Proposed goals, to be validated with an agronomist and in the field. Sources: "}
          {sources.map((s, i) => (
            <span key={s.href}>
              <a href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a>{i < sources.length - 1 ? " · " : "."}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
