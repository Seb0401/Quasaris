"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BadgeDollarSign, ChevronDown, ChevronUp, Droplet, Droplets, Layers, Leaf, MapPin, Scale, ShieldAlert, Sprout, Waves } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { CountUp, Meter, RangeInput } from "@/components/ui/kit";
import { moveFarm, setFarm, useFarm } from "@/lib/farm-store";
import type { Irrigation, Priorities, SoilTexture } from "@/lib/contract";
import { IRRIGATION_EFFICIENCY, effectiveEfficiency } from "@/lib/ui";
import { getMajesSoilGridsReference } from "@/lib/soilgrids";
import { useIsMobile } from "@/lib/use-media";
import { saveBoundary } from "@/lib/granja-store";

const ParcelMap = dynamic(() => import("@/components/map/parcel-map"), { ssr: false, loading: () => <div className="map-skeleton ui-skeleton h-full" /> });

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
type Section = "resources" | "soil" | "priorities";

/** Mi parcela como un mapa a pantalla completa, con la configuración en un panel flotante (estilo Google Maps). */
export function ParcelaClient() {
  const t = useT();
  const locale = useLocale();
  const es = locale === "es";
  const farm = useFarm();
  const soilReference = getMajesSoilGridsReference(farm.lat, farm.lon);
  const mobile = useIsMobile("(max-width: 1049px)");
  // en celular el panel empieza plegado para que se vea el mapa
  const [openState, setOpen] = useState<boolean | null>(null);
  const open = openState ?? !mobile;
  const [section, setSection] = useState<Section>("resources");
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const soilNumber = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const ha = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  const efficiency = effectiveEfficiency(farm.irrigation, farm.soilTexture);
  const usefulWater = farm.waterAvailableM3ha * efficiency;
  const totalWeight = PRIORITIES.reduce((sum, p) => sum + farm.priorities[p.key], 0) || 1;
  const top = [...PRIORITIES].sort((a, b) => farm.priorities[b.key] - farm.priorities[a.key])[0];
  const balanced = PRIORITIES.every((p) => Math.abs(farm.priorities[p.key] - farm.priorities[top.key]) < 0.001);

  const SECTIONS: { id: Section; icon: typeof Droplets; label: string }[] = [
    { id: "resources", icon: Droplets, label: es ? "Recursos" : "Resources" },
    { id: "soil", icon: Layers, label: es ? "Suelo" : "Soil" },
    { id: "priorities", icon: Scale, label: es ? "Prioridades" : "Priorities" },
  ];

  return (
    <div className="map-view">
      <h1 className="sr-only">{t("parcela.title")}</h1>
      <ParcelMap fill search lat={farm.lat} lon={farm.lon} onPick={moveFarm} boundary={farm.boundary} onBoundary={saveBoundary}>
        <aside className={`map-panel ${open ? "open" : ""}`} aria-label={t("parcela.title")}>
          <button type="button" className="map-panel-head" onClick={() => setOpen(!open)} aria-expanded={open}>
            <span className="map-panel-icon">
              <MapPin size={17} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <b>{t("parcela.title")}</b>
              <small>
                {farm.areaHa ? `${ha.format(farm.areaHa)} ha · ` : ""}
                {n.format(farm.waterAvailableM3ha)} m³/ha · {t(`irrigation.${farm.irrigation}`)} · {t(`soil.${farm.soilTexture}`)}
              </small>
            </span>
            {open ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>

          {open && (
            <>
              <div className="map-panel-tabs" role="tablist">
                {SECTIONS.map(({ id, icon: Icon, label }) => (
                  <button key={id} type="button" role="tab" aria-selected={section === id} className={section === id ? "active" : ""} onClick={() => setSection(id)}>
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              <div className="map-panel-body">
                {section === "resources" && (
                  <>
                    <div className="field-block">
                      <span className="ui-label">
                        <Droplets size={15} />
                        {t("parcela.water")}
                      </span>
                      <div className="ui-input-wrap">
                        <input className="ui-input" type="number" inputMode="numeric" min={0} step={500} value={farm.waterAvailableM3ha} onChange={(event) => setFarm({ waterAvailableM3ha: Number(event.target.value) || 0 })} />
                        <span>m³/ha</span>
                      </div>
                      <div className="preset-row">
                        {WATER_PRESETS.map((preset) => (
                          <button key={preset} type="button" className={farm.waterAvailableM3ha === preset ? "active" : ""} onClick={() => setFarm({ waterAvailableM3ha: preset })}>
                            {n.format(preset)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field-block">
                      <span className="ui-label">
                        <Waves size={15} />
                        {t("parcela.irrigation")}
                      </span>
                      <div className="option-cards">
                        {IRRIGATION.map(({ value, icon: Icon }) => (
                          <button key={value} type="button" className={`option-card ${farm.irrigation === value ? "active" : ""}`} aria-pressed={farm.irrigation === value} onClick={() => setFarm({ irrigation: value })}>
                            <Icon size={18} />
                            <b>{t(`irrigation.${value}`)}</b>
                            <small>
                              {Math.round(IRRIGATION_EFFICIENCY[value] * 100)}% {es ? "eficiente" : "efficient"}
                            </small>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field-block">
                      <span className="ui-label">
                        <Sprout size={15} />
                        {t("parcela.soil")}
                      </span>
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
                        <strong>
                          <CountUp value={usefulWater} format={(v) => n.format(v)} /> <em>m³/ha</em>
                        </strong>
                      </div>
                      <Meter value={efficiency} color="linear-gradient(90deg,#5cc8f5,#b9ff63)" height={10} />
                      <p>
                        {es
                          ? `Con riego por ${t(`irrigation.${farm.irrigation}`).toLowerCase()} en suelo ${t(`soil.${farm.soilTexture}`).toLowerCase()} se aprovecha cerca del ${Math.round(efficiency * 100)}% del agua; el resto se pierde por evaporación o filtración.`
                          : `With ${t(`irrigation.${farm.irrigation}`).toLowerCase()} irrigation on ${t(`soil.${farm.soilTexture}`).toLowerCase()} soil about ${Math.round(efficiency * 100)}% of the water is used; the rest is lost to evaporation or seepage.`}
                      </p>
                    </div>
                  </>
                )}

                {section === "soil" && (
                  <section className="soilgrids-insight" aria-labelledby="soilgrids-title">
                    <div>
                      <small>ISRIC SOILGRIDS · 250 M</small>
                      <h3 id="soilgrids-title">{t("parcela.soilgridsTitle")}</h3>
                      <p>{t("parcela.soilgridsDescription")}</p>
                    </div>
                    {soilReference ? (
                      <>
                        <dl className="soilgrids-stats">
                          {(["sand", "silt", "clay"] as const).map((property) => (
                            <div key={property}>
                              <dt>{t(`parcela.soilgrids.${property}`)}</dt>
                              <dd>{soilNumber.format(soilReference.surfaceTexturePercent[property].median)}%</dd>
                            </div>
                          ))}
                          <div>
                            <dt>{t("parcela.soilgrids.availableWater")}</dt>
                            <dd>{soilNumber.format(soilReference.potentialAvailableWater0to30cmMm.median)} mm</dd>
                          </div>
                        </dl>
                        <p>
                          {t("parcela.soilgrids.uncertainty", {
                            low: soilNumber.format(soilReference.surfaceTexturePercent.sand.q05),
                            high: soilNumber.format(soilReference.surfaceTexturePercent.sand.q95),
                            waterLow: soilNumber.format(soilReference.potentialAvailableWater0to30cmMm.spatialP10),
                            waterHigh: soilNumber.format(soilReference.potentialAvailableWater0to30cmMm.spatialP90),
                          })}
                        </p>
                        <p>{t("parcela.soilgrids.caveat")}</p>
                        <p>
                          {t("parcela.soilgrids.source")} ·{" "}
                          {t("parcela.soilgrids.updated", {
                            date: new Date(soilReference.retrievedAt).toLocaleDateString(locale, { timeZone: "UTC" }),
                          })}
                        </p>
                        <a href={soilReference.source} target="_blank" rel="noreferrer">
                          {t("parcela.soilgrids.openSource")}
                        </a>
                      </>
                    ) : (
                      <p>{t("parcela.soilgrids.outsideCoverage")}</p>
                    )}
                  </section>
                )}

                {section === "priorities" && (
                  <>
                    <p className="map-panel-lead">{t("parcela.priorities")}</p>
                    <div className="priority-list">
                      {PRIORITIES.map(({ key, icon: Icon, color }) => (
                        <label key={key} className="priority-row" style={{ "--p": color } as React.CSSProperties}>
                          <span className="priority-icon">
                            <Icon size={16} />
                          </span>
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
                      <p>
                        {balanced
                          ? es
                            ? "Todas tus prioridades pesan igual: buscaremos la rotación más equilibrada."
                            : "All your priorities weigh the same: we will look for the most balanced rotation."
                          : es
                            ? `Tu prioridad principal es “${t(`priority.${top.key}`).toLowerCase()}”. Las rotaciones que mejor lo cumplan subirán en el ranking.`
                            : `Your top priority is “${t(`priority.${top.key}`).toLowerCase()}”. Rotations that do it best will rank higher.`}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <div className="map-panel-foot">
            <p>
              {farm.areaHa
                ? es
                  ? `Tu terreno dibujado mide ${ha.format(farm.areaHa)} ha. La granja usará ese tamaño.`
                  : `Your drawn field is ${ha.format(farm.areaHa)} ha. Farm mode will use that size.`
                : es
                  ? "Toca el mapa o arrastra el pin. Con «Dibujar mi terreno» marcas sus esquinas."
                  : "Tap the map or drag the pin. Use “Draw my field” to mark its corners."}
            </p>
            <Link href={`/${locale}/comparar`} className="ui-btn">
              {t("parcela.continue")}
              <ArrowRight size={17} />
            </Link>
          </div>
        </aside>
      </ParcelMap>
    </div>
  );
}
