"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BadgeDollarSign, Crosshair, Droplets, Leaf, LocateFixed, MapPin, ShieldAlert, Sprout } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { Reveal } from "@/components/motion/reveal";
import { setFarm, useFarm } from "@/lib/farm-store";
import type { Irrigation, Priorities, SoilTexture } from "@/lib/contract";

const ParcelMap = dynamic(() => import("@/components/map/parcel-map"), { ssr: false, loading: () => <div className="map-skeleton" /> });
const IRRIGATION: Irrigation[] = ["gravedad", "aspersion", "goteo"];
const SOILS: SoilTexture[] = ["arenoso", "franco", "arcilloso"];
const PRIORITIES = [{ key: "water" as keyof Priorities, icon: Droplets }, { key: "income" as keyof Priorities, icon: BadgeDollarSign }, { key: "soil" as keyof Priorities, icon: Leaf }, { key: "risk" as keyof Priorities, icon: ShieldAlert }];

function Choice<T extends string>({ value, options, label, onChange }: { value: T; options: T[]; label: (v: T) => string; onChange: (v: T) => void }) {
  return <div className="choice-grid">{options.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={`choice-button ${option === value ? "selected" : ""}`} aria-pressed={option === value}>{label(option)}</button>)}</div>;
}

export function ParcelaClient() {
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const [locating, setLocating] = useState(false);

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => { setFarm({ lat: position.coords.latitude, lon: position.coords.longitude }); setLocating(false); }, () => setLocating(false), { enableHighAccuracy: true, timeout: 10000 });
  };

  return <div className="dashboard-shell">
    <Reveal><header className="section-hero"><div><span className="panel-kicker"><MapPin size={15} /> QUASARIS / {locale === "es" ? "CONFIGURACIÓN" : "SETUP"}</span><h1>{t("parcela.title")}</h1><p>{t("parcela.hint")}</p></div></header></Reveal>
    <div className="workspace-layout">
      <Reveal className="map-column"><section className="workspace-card"><div className="panel-heading !p-0 !pb-3"><div><span className="panel-kicker">NASA GIBS · MODIS</span><h2 className="!mb-0">{locale === "es" ? "Ubica tu terreno" : "Locate your field"}</h2></div><button type="button" onClick={locate} disabled={locating} className="primary-action"><LocateFixed size={17} />{t("parcela.locate")}</button></div><ParcelMap lat={farm.lat} lon={farm.lon} onPick={(lat, lon) => setFarm({ lat, lon })} /><div className="map-help"><Crosshair size={17} />{t("parcela.selected")}: {farm.lat.toFixed(4)}, {farm.lon.toFixed(4)}</div></section></Reveal>
      <Reveal delay={90}><section className="workspace-card"><span className="panel-kicker">01 / {locale === "es" ? "PERFIL AGRÍCOLA" : "FARM PROFILE"}</span><h2>{t("parcela.resources")}</h2>
        <div className="grid gap-5"><label><span className="workspace-label"><Droplets size={17} />{t("parcela.water")}</span><input className="workspace-input" type="number" inputMode="numeric" min={0} step={500} value={farm.waterAvailableM3ha} onChange={(event) => setFarm({ waterAvailableM3ha: Number(event.target.value) || 0 })} /></label>
        <div><span className="workspace-label"><Crosshair size={17} />{t("parcela.irrigation")}</span><Choice value={farm.irrigation} options={IRRIGATION} label={(value) => t(`irrigation.${value}`)} onChange={(irrigation) => setFarm({ irrigation })} /></div>
        <div><span className="workspace-label"><Sprout size={17} />{t("parcela.soil")}</span><Choice value={farm.soilTexture} options={SOILS} label={(value) => t(`soil.${value}`)} onChange={(soilTexture) => setFarm({ soilTexture })} /></div></div>
      </section><section className="workspace-card mt-4"><span className="panel-kicker">02 / {locale === "es" ? "PREFERENCIAS" : "PREFERENCES"}</span><h2>{t("parcela.priorities")}</h2>{PRIORITIES.map(({ key, icon: Icon }) => <label key={key} className="priority-row"><span className="workspace-label !mb-0"><Icon size={16} />{t(`priority.${key}`)}</span><output>{Math.round(farm.priorities[key] * 100)}%</output><input type="range" min={0} max={1} step={0.05} value={farm.priorities[key]} onChange={(event) => setFarm({ priorities: { ...farm.priorities, [key]: Number(event.target.value) } })} /></label>)}<Link href={`/${locale}/comparar`} className="primary-action mt-3 w-full">{t("parcela.continue")}<ArrowRight size={18} /></Link></section></Reveal>
    </div>
  </div>;
}
