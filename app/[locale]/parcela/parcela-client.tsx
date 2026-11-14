"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BadgeDollarSign, Crosshair, Droplet, Droplets, Gauge, Leaf, LocateFixed, MapPin, Mountain, Scale, ShieldAlert, Sprout, Waves } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { Reveal } from "@/components/motion/reveal";
import { CountUp, HeroStat, Meter, PageHeader, Panel, RangeInput } from "@/components/ui/kit";
import { setFarm, useFarm } from "@/lib/farm-store";
import type { Irrigation, Priorities, SoilTexture } from "@/lib/contract";
import { IRRIGATION_EFFICIENCY, effectiveEfficiency } from "@/lib/ui";

const ParcelMap = dynamic(() => import("@/components/map/parcel-map"), { ssr: false, loading: () => <div className="map-skeleton ui-skeleton" /> });

const IRRIGATION: { value: Irrigation; icon: typeof Droplets }[] = [
  { value: "gravedad", icon: Waves },
  { value: "aspersion", icon: Droplets },
  { value: "goteo", icon: Droplet },
];
const SOILS: { value: SoilTexture; grain: string }[] = [
  { value: "arenoso", grain: "sand" },
  { value: "franco", grain: "loam" },
  { value: "arcilloso", grain: "clay" },
];
const PRIORITIES: { key: keyof Priorities; icon: typeof Droplets; color: string }[] = [
  { key: "water", icon: Droplets, color: "#5cc8f5" },
  { key: "income", icon: BadgeDollarSign, color: "#f6b94c" },
  { key: "soil", icon: Leaf, color: "#b9ff63" },
  { key: "risk", icon: ShieldAlert, color: "#ff8a7a" },
];
const WATER_PRESETS = [8000, 12000, 15000, 20000];

export function ParcelaClient() {
  const t = useT();
  const locale = useLocale();
  const es = locale === "es";
  const farm = useFarm();
  const [locating, setLocating] = useState(false);
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => { setFarm({ lat: position.coords.latitude, lon: position.coords.longitude }); setLocating(false); }, () => setLocating(false), { enableHighAccuracy: true, timeout: 10000 });
  };

  const efficiency = effectiveEfficiency(farm.irrigation, farm.soilTexture);
  const usefulWater = farm.waterAvailableM3ha * efficiency;
  const totalWeight = PRIORITIES.reduce((sum, p) => sum + farm.priorities[p.key], 0) || 1;
  const top = [...PRIORITIES].sort((a, b) => farm.priorities[b.key] - farm.priorities[a.key])[0];
  const balanced = PRIORITIES.every((p) => Math.abs(farm.priorities[p.key] - farm.priorities[top.key]) < 0.001);

  return (
    <div className="ui-page">
      <PageHeader icon={MapPin} kicker={es ? "CONFIGURACIÓN" : "SETUP"} title={t("parcela.title")} subtitle={es ? "Ubica tu terreno y cuéntanos con qué recursos cuentas. Con eso simulamos 21 años de clima real sobre tu parcela." : "Locate your land and tell us your resources. We use them to simulate 21 years of real climate over your field."}>
        <HeroStat icon={Crosshair} label={es ? "COORDENADAS" : "COORDINATES"}>{farm.lat.toFixed(3)}, {farm.lon.toFixed(3)}</HeroStat>
        <HeroStat icon={Droplets} label={es ? "AGUA / CAMPAÑA" : "WATER / SEASON"} tone="sky"><CountUp value={farm.waterAvailableM3ha} format={(v) => `${n.format(v)} m³/ha`} /></HeroStat>
        <HeroStat icon={Gauge} label={es ? "EFICIENCIA" : "EFFICIENCY"} tone="lime"><CountUp value={efficiency * 100} format={(v) => `${Math.round(v)}%`} /></HeroStat>
      </PageHeader>

      <div className="parcel-layout">
        <Reveal className="parcel-map-col">
          <Panel
            kicker="NASA GIBS · MODIS · ESRI"
            icon={Mountain}
            title={es ? "Ubica tu terreno" : "Locate your field"}
            actions={<button type="button" onClick={locate} disabled={locating} className="ui-btn"><LocateFixed size={16} className={locating ? "animate-spin" : ""} />{t("parcela.locate")}</button>}
          >
            <ParcelMap lat={farm.lat} lon={farm.lon} onPick={(lat, lon) => setFarm({ lat, lon })} />
            <p className="ui-hint"><Crosshair size={15} />{es ? "Toca cualquier punto del mapa para mover tu parcela. El verde indica vegetación activa medida por satélite." : "Tap anywhere on the map to move your field. Green shows active vegetation measured by satellite."}</p>
          </Panel>
        </Reveal>

        <div className="parcel-side">
          <Reveal delay={80}>
            <Panel kicker={`01 / ${es ? "RECURSOS" : "RESOURCES"}`} icon={Droplets} title={t("parcela.resources")}>
              <div className="field-block">
                <span className="ui-label"><Droplets size={15} />{t("parcela.water")}</span>
                <div className="ui-input-wrap">
                  <input className="ui-input" type="number" inputMode="numeric" min={0} step={500} value={farm.waterAvailableM3ha} onChange={(event) => setFarm({ waterAvailableM3ha: Number(event.target.value) || 0 })} />
                  <span>m³/ha</span>
                </div>
                <div className="preset-row">
                  {WATER_PRESETS.map((preset) => (
                    <button key={preset} type="button" className={farm.waterAvailableM3ha === preset ? "active" : ""} onClick={() => setFarm({ waterAvailableM3ha: preset })}>{n.format(preset)}</button>
                  ))}
                </div>
              </div>

              <div className="field-block">
                <span className="ui-label"><Waves size={15} />{t("parcela.irrigation")}</span>
                <div className="option-cards">
                  {IRRIGATION.map(({ value, icon: Icon }) => (
                    <button key={value} type="button" className={`option-card ${farm.irrigation === value ? "active" : ""}`} aria-pressed={farm.irrigation === value} onClick={() => setFarm({ irrigation: value })}>
                      <Icon size={20} />
                      <b>{t(`irrigation.${value}`)}</b>
                      <small>{Math.round(IRRIGATION_EFFICIENCY[value] * 100)}% {es ? "eficiente" : "efficient"}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-block">
                <span className="ui-label"><Sprout size={15} />{t("parcela.soil")}</span>
                <div className="option-cards">
                  {SOILS.map(({ value, grain }) => (
                    <button key={value} type="button" className={`option-card ${farm.soilTexture === value ? "active" : ""}`} aria-pressed={farm.soilTexture === value} onClick={() => setFarm({ soilTexture: value })}>
                      <span className={`soil-swatch ${grain}`} aria-hidden />
                      <b>{t(`soil.${value}`)}</b>
                    </button>
                  ))}
                </div>
              </div>

              <div className="water-insight">
                <div>
                  <small>{es ? "Agua que realmente llega a la planta" : "Water that actually reaches the plant"}</small>
                  <strong><CountUp value={usefulWater} format={(v) => n.format(v)} /> <em>m³/ha</em></strong>
                </div>
                <Meter value={efficiency} color="linear-gradient(90deg,#5cc8f5,#b9ff63)" height={10} />
                <p>{es ? `Con riego por ${t(`irrigation.${farm.irrigation}`).toLowerCase()} en suelo ${t(`soil.${farm.soilTexture}`).toLowerCase()} se aprovecha cerca del ${Math.round(efficiency * 100)}% del agua; el resto se pierde por evaporación o filtración.` : `With ${t(`irrigation.${farm.irrigation}`).toLowerCase()} irrigation on ${t(`soil.${farm.soilTexture}`).toLowerCase()} soil about ${Math.round(efficiency * 100)}% of the water is used; the rest is lost to evaporation or seepage.`}</p>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={160}>
            <Panel kicker={`02 / ${es ? "PRIORIDADES" : "PRIORITIES"}`} icon={Scale} title={t("parcela.priorities")}>
              <div className="priority-list">
                {PRIORITIES.map(({ key, icon: Icon, color }) => (
                  <label key={key} className="priority-row" style={{ "--p": color } as React.CSSProperties}>
                    <span className="priority-icon"><Icon size={16} /></span>
                    <span className="priority-name">{t(`priority.${key}`)}</span>
                    <output>{Math.round(farm.priorities[key] * 100)}%</output>
                    <RangeInput label={t(`priority.${key}`)} min={0} max={1} step={0.05} value={farm.priorities[key]} color={color} onChange={(value) => setFarm({ priorities: { ...farm.priorities, [key]: value } })} />
                  </label>
                ))}
              </div>

              <div className="weight-mix">
                <small>{es ? "Así pesará cada objetivo en la recomendación" : "How much each goal weighs in the recommendation"}</small>
                <div className="weight-bar">
                  {PRIORITIES.map(({ key, color }) => (
                    <i key={key} style={{ flexGrow: farm.priorities[key] / totalWeight, background: color }} title={`${t(`priority.${key}`)} ${Math.round((farm.priorities[key] / totalWeight) * 100)}%`} />
                  ))}
                </div>
                <div className="weight-legend">
                  {PRIORITIES.map(({ key, color }) => (
                    <span key={key}><i style={{ background: color }} />{t(`priority.${key}`)} <b>{Math.round((farm.priorities[key] / totalWeight) * 100)}%</b></span>
                  ))}
                </div>
                <p>{balanced ? (es ? "Todas tus prioridades pesan igual: buscaremos la rotación más equilibrada." : "All your priorities weigh the same: we will look for the most balanced rotation.") : (es ? `Tu prioridad principal es “${t(`priority.${top.key}`).toLowerCase()}”. Las rotaciones que mejor lo cumplan subirán en el ranking.` : `Your top priority is “${t(`priority.${top.key}`).toLowerCase()}”. Rotations that do it best will rank higher.`)}</p>
              </div>

              <Link href={`/${locale}/comparar`} className="ui-btn ui-btn-block">{t("parcela.continue")}<ArrowRight size={18} /></Link>
            </Panel>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
