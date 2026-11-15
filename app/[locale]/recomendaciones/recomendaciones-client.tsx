"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bug, Cpu, Droplet, Droplets, FlaskConical, Gauge, Hexagon, Info, Layers, Leaf, MapPin, Microscope, Mountain, Repeat2,
  ShieldCheck, Snowflake, Sprout, Sun, Syringe, Target, Waves, type LucideIcon,
} from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { Reveal } from "@/components/motion/reveal";
import { Badge, HeroStat, LoadingOrbit, Meter, PageHeader, Panel } from "@/components/ui/kit";
import { useFarm } from "@/lib/farm-store";
import { useSimulation } from "@/lib/use-simulation";
import { rotationColor } from "@/lib/ui";
import { buildRecommendations, type Rec, type RecIcon } from "@/lib/recommendations";

const ICONS: Record<RecIcon, LucideIcon> = {
  nitrogen: Leaf, soil: Layers, phosphorus: FlaskConical, potassium: Hexagon, salt: Waves, microbe: Microscope, shield: ShieldCheck,
  bug: Bug, meter: Gauge, sensor: Droplets, drip: Droplet, frost: Snowflake, trap: Target, inject: Syringe,
};

export function RecomendacionesClient() {
  const t = useT();
  const locale = useLocale();
  const es = locale === "es";
  const farm = useFarm();
  const data = useSimulation();
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const currentId = farm.rotations.find((r) => r.isCurrent)?.id ?? farm.rotations[0]?.id;
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const selectedId = farm.rotations.some((r) => r.id === picked) ? picked : currentId;
  const rotation = farm.rotations.find((r) => r.id === selectedId);

  if (!data) return <div className="ui-page"><LoadingOrbit label={es ? "Preparando tus recomendaciones..." : "Preparing your recommendations..."} /></div>;
  if (!rotation) return <div className="ui-page"><p className="ui-alert tone-warn"><Info size={16} />{es ? "Primero crea una rotación." : "Create a rotation first."}</p></div>;

  const result = data.rotations.find((r) => r.id === rotation.id);
  const rec = buildRecommendations(
    { soil: farm.soilTexture, irrigation: farm.irrigation, rotation, result, sim: data, locale },
    (id) => t(`group.pest.${id}`),
  );
  const p = rec.profile;
  const zoneLabel = {
    coast: es ? "Costa y valles áridos" : "Coast and arid valleys",
    valley: es ? "Valle interandino" : "Inter-Andean valley",
    highland: es ? "Altiplano y puna" : "High plateau",
  }[p.zone];
  const N = rec.nitrogen;
  const nMax = Math.max(N.demandKg, N.fixedKg, 1);

  const chips: { icon: LucideIcon; label: string; value: string; tone?: string }[] = [
    { icon: Mountain, label: es ? "Zona" : "Zone", value: p.elevationM !== null ? `${zoneLabel} · ${n.format(p.elevationM)} m` : zoneLabel },
    { icon: Layers, label: es ? "Suelo" : "Soil", value: t(`soil.${p.soil}`) },
    { icon: Droplet, label: es ? "Riego" : "Irrigation", value: t(`irrigation.${p.irrigation}`) },
    ...(p.arid !== null ? [{ icon: Sun, label: es ? "Humedad natural" : "Natural moisture", value: p.arid ? (es ? "Árida: todo depende del riego" : "Arid: everything depends on irrigation") : (es ? "Con algo de humedad" : "Some natural moisture"), tone: p.arid ? "warn" : "ok" }] : []),
    { icon: Snowflake, label: es ? "Heladas" : "Frost", value: p.frostRisk ? (es ? "Hay riesgo" : "There is risk") : (es ? "Sin heladas en 21 años" : "No frost in 21 years"), tone: p.frostRisk ? "danger" : "ok" },
  ];

  const sections: { id: string; kicker: string; title: string; subtitle: string; icon: LucideIcon; tone: string; items: Rec[] }[] = [
    { id: "fert", kicker: es ? "NUTRICIÓN" : "NUTRITION", title: es ? "Abonos" : "Fertilisers", subtitle: es ? "Qué ponerle al suelo y cuándo, según tus cultivos y tu tipo de suelo." : "What to give the soil and when, based on your crops and soil type.", icon: Leaf, tone: "ok", items: rec.fertilizers },
    { id: "micro", kicker: es ? "BIOINSUMOS" : "BIO-INPUTS", title: es ? "Microorganismos" : "Microorganisms", subtitle: es ? "Bacterias y hongos buenos que alimentan la planta o la defienden de plagas." : "Beneficial bacteria and fungi that feed the plant or protect it from pests.", icon: Microscope, tone: "brand", items: rec.microbes },
    { id: "dev", kicker: es ? "EQUIPOS" : "EQUIPMENT", title: es ? "Dispositivos" : "Devices", subtitle: es ? "Herramientas sencillas para medir y decidir con datos en tu parcela." : "Simple tools to measure and decide with data on your field.", icon: Cpu, tone: "sky", items: rec.devices },
  ];

  return (
    <div className="ui-page">
      <PageHeader
        icon={Sprout}
        kicker={es ? "PARA TU PARCELA" : "FOR YOUR FIELD"}
        title={es ? "Recomendaciones" : "Recommendations"}
        subtitle={es ? "Abonos, microorganismos y dispositivos elegidos para tu suelo, tu zona y los cultivos de tu rotación." : "Fertilisers, microorganisms and devices chosen for your soil, your area and the crops in your rotation."}
      >
        <HeroStat icon={Leaf} label={es ? "ABONOS" : "FERTILISERS"}>{rec.fertilizers.length}</HeroStat>
        <HeroStat icon={Microscope} label={es ? "MICROORGANISMOS" : "MICROBES"} tone="amber">{rec.microbes.length}</HeroStat>
        <HeroStat icon={Cpu} label={es ? "DISPOSITIVOS" : "DEVICES"}>{rec.devices.length}</HeroStat>
      </PageHeader>

      <section className="reco-profile">
        <div className="reco-profile-head">
          <span className="reco-profile-icon"><MapPin size={20} /></span>
          <div>
            <b>{es ? "Así vemos tu parcela" : "How we see your field"}</b>
            <p>{es ? "Altitud SRTM y humedad del suelo NASA POWER, con el suelo y el riego que marcaste." : "SRTM elevation and NASA POWER soil moisture, with the soil and irrigation you chose."} <Link href={`/${locale}/parcela`}>{es ? "Cambiar" : "Change"}</Link></p>
          </div>
        </div>
        <ul className="reco-chips">
          {chips.map(({ icon: Icon, label, value, tone }) => (
            <li key={label} className={tone ? `tone-${tone}` : ""}><Icon size={15} /><span><small>{label}</small>{value}</span></li>
          ))}
        </ul>
      </section>

      <Panel kicker={es ? "ROTACIÓN" : "ROTATION"} icon={Repeat2} title={es ? "¿Para qué rotación?" : "For which rotation?"} actions={<Link href={`/${locale}/rotaciones`} className="ui-btn ui-btn-ghost ui-btn-sm">{es ? "Gestionar" : "Manage"}</Link>}>
        <div className="reco-rotations" role="radiogroup" aria-label={es ? "Rotación" : "Rotation"}>
          {farm.rotations.map((r, i) => (
            <button key={r.id} type="button" role="radio" aria-checked={r.id === rotation.id} className={r.id === rotation.id ? "active" : ""} onClick={() => setPicked(r.id)}>
              <i style={{ background: rotationColor(i) }} />{r.name}{r.isCurrent && <Badge tone="sky">{t("comparar.current")}</Badge>}
            </button>
          ))}
        </div>
        <div className="reco-nitrogen">
          <div className="reco-n-row"><span>{es ? "Nitrógeno que piden los cultivos" : "Nitrogen the crops need"}</span><strong>{n.format(N.demandKg)} kg/ha</strong></div>
          <Meter value={N.demandKg / nMax} color="var(--warn)" height={6} />
          <div className="reco-n-row"><span>{es ? "Nitrógeno que fijan las leguminosas" : "Nitrogen fixed by legumes"}</span><strong>{n.format(N.fixedKg)} kg/ha</strong></div>
          <Meter value={N.fixedKg / nMax} color="var(--ok)" height={6} />
          <p className={N.balanceKg < 0 ? "is-bad" : "is-good"}>
            {N.balanceKg < 0
              ? (es ? `Faltan ~${n.format(-N.balanceKg)} kg/ha: se cubren con abono o con una leguminosa en la rotación.` : `About ${n.format(-N.balanceKg)} kg/ha missing: cover it with fertiliser or a legume in the rotation.`)
              : (es ? "Las leguminosas cubren el nitrógeno de la rotación." : "Legumes cover the rotation's nitrogen.")}
          </p>
        </div>
      </Panel>

      {sections.map((s) => (
        <Reveal key={s.id}>
          <Panel id={`reco-${s.id}`} kicker={s.kicker} icon={s.icon} title={s.title} className={`reco-panel tone-${s.tone}`}>
            <p className="reco-sub">{s.subtitle}</p>
            {s.items.length ? (
              <div className="reco-grid">
                {s.items.map((item) => {
                  const Icon = ICONS[item.icon];
                  return (
                    <article key={item.id} className={`reco-card ${item.priority === "high" ? "is-high" : ""}`}>
                      <header>
                        <span className="reco-icon"><Icon size={18} /></span>
                        <b>{item.title}</b>
                      </header>
                      <p>{item.why}</p>
                      {item.how && <p className="reco-how"><span>{es ? "Cómo" : "How"}</span>{item.how}</p>}
                      {item.priority === "high" && <Badge tone="brand">{es ? "Prioridad" : "Priority"}</Badge>}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="ui-hint">{es ? "Nada especial para esta rotación." : "Nothing special for this rotation."}</p>
            )}
          </Panel>
        </Reveal>
      ))}

      <p className="ui-alert reco-note">
        <Info size={16} />
        {es
          ? "Son recomendaciones orientativas armadas con reglas agronómicas generales y tus datos. Usa productos registrados en SENASA, sigue la etiqueta y confirma dosis con un agrónomo o con INIA; un análisis de suelo afina mucho el abonado."
          : "These are guidance recommendations built from general agronomy rules and your data. Use products registered with SENASA (Peru's agricultural health authority), follow the label and confirm doses with an agronomist or INIA; a soil test sharpens fertiliser advice a lot."}
      </p>
    </div>
  );
}
