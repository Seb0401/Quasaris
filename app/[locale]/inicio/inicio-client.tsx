"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BarChart3, Check, Compass, LocateFixed, MapPin, Pencil, Scale, Sparkles } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { RecommendationCard } from "@/components/cards/recommendation-card";
import { ProfitIcon, SoilIcon, WaterIcon } from "@/components/icons/farm-icons";
import { RotationIcons } from "@/components/icons/rotation-icons";
import { LoadingOrbit, PageHeader } from "@/components/ui/kit";
import type { Irrigation, Priorities, SoilTexture } from "@/lib/contract";
import { efficiency } from "@/lib/crop-calendar";
import { MAJES, moveFarm, setFarm, useFarm } from "@/lib/farm-store";
import { recommend } from "@/lib/recommendation";
import { useSimulation } from "@/lib/use-simulation";

const ParcelMap = dynamic(() => import("@/components/map/parcel-map"), {
  ssr: false,
  loading: () => <div className="map-skeleton ui-skeleton" />,
});

const TYPICAL_WATER = 15000; // estimado para Majes (a validar con AUTODEMA)
const WATER_PRESETS = [8000, 12000, 15000, 20000];
const PROFILES: { id: string; p: Priorities; Icon: (p: { size?: number }) => React.JSX.Element }[] = [
  { id: "water", p: { water: 1, income: 0.35, soil: 0.35, risk: 0.5 }, Icon: WaterIcon },
  { id: "income", p: { water: 0.35, income: 1, soil: 0.3, risk: 0.5 }, Icon: ProfitIcon },
  { id: "soil", p: { water: 0.4, income: 0.35, soil: 1, risk: 0.5 }, Icon: SoilIcon },
  { id: "balanced", p: { water: 0.5, income: 0.5, soil: 0.5, risk: 0.5 }, Icon: (props) => <Scale size={props.size} /> },
];
const STEPS = ["field", "resources", "priorities", "result"] as const;

export function InicioClient() {
  const t = useT();
  const locale = useLocale();
  const es = locale === "es";
  const farm = useFarm();
  const [step, setStep] = useState(0);
  const [locating, setLocating] = useState(false);
  const data = useSimulation();
  const topRef = useRef<HTMLDivElement>(null);
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const profile = PROFILES.find((pr) => JSON.stringify(pr.p) === JSON.stringify(farm.priorities))?.id;
  const rec = data && step === 3 ? recommend(data, farm.rotations, farm) : null;
  const current = farm.rotations.find((r) => r.isCurrent);

  // al cambiar de paso, volver al inicio del contenido (importante en el celular)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const go = (i: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, i)));
  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFarm({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // lo que eligió en cada paso, para el riel lateral
  const summary = [
    `${farm.lat.toFixed(3)}, ${farm.lon.toFixed(3)}`,
    `${n.format(farm.waterAvailableM3ha)} m³/ha · ${t(`irrigation.${farm.irrigation}`)}`,
    profile ? t(`wizard.priorities.${profile}.title`) : es ? "Personalizado" : "Custom",
    rec ? rec.bestRotation.name : es ? "Pendiente" : "Pending",
  ];

  return (
    <div className="ui-page wizard">
      <PageHeader icon={Compass} kicker={t("wizard.kicker").toUpperCase()} title={es ? "Tu parcela en 4 pasos" : "Your field in 4 steps"} subtitle={es ? "Responde cuatro preguntas simples y te mostramos qué rotación conviene, con 21 años de datos de la NASA detrás." : "Answer four simple questions and we show you which rotation fits, backed by 21 years of NASA data."} />

      <div className="wizard-layout" ref={topRef}>
        {/* riel de pasos (PC) / barra de progreso (celular) */}
        <aside className="wizard-rail" aria-label={t("wizard.kicker")}>
          <div className="wizard-mobile-progress">
            <span>{es ? `Paso ${step + 1} de ${STEPS.length}` : `Step ${step + 1} of ${STEPS.length}`}</span>
            <b>{t(`wizard.${STEPS[step]}.short`)}</b>
            <div><i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
          </div>
          <ol>
            {STEPS.map((s, i) => (
              <li key={s} className={i === step ? "is-active" : i < step ? "is-done" : ""}>
                <button type="button" onClick={() => go(i)} aria-current={i === step ? "step" : undefined}>
                  <span className="wizard-step-num">{i < step ? <Check size={15} /> : i + 1}</span>
                  <span className="wizard-step-text">
                    <b>{t(`wizard.${s}.short`)}</b>
                    <small>{summary[i]}</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <p className="wizard-rail-note"><Sparkles size={14} />{es ? "Puedes volver a cualquier paso tocándolo." : "Tap any step to go back to it."}</p>
        </aside>

        {/* contenido del paso */}
        <section className="ui-panel wizard-panel">
          <div className="wizard-step" key={step}>
            <header className="wizard-step-head">
              <span className="ui-panel-kicker">{es ? `PASO ${step + 1}` : `STEP ${step + 1}`}</span>
              <h2>{t(`wizard.${STEPS[step]}.title`)}</h2>
              <p>{t(`wizard.${STEPS[step]}.hint`)}</p>
            </header>

            {step === 0 && (
              <div className="wizard-body">
                <ParcelMap lat={farm.lat} lon={farm.lon} onPick={moveFarm} compact />
                <div className="wizard-actions-row">
                  <button type="button" onClick={locate} disabled={locating} className="ui-btn ui-btn-ghost"><LocateFixed size={16} className={locating ? "animate-spin" : ""} />{es ? "Usar mi ubicación" : "Use my location"}</button>
                  <button type="button" onClick={() => setFarm(MAJES)} className="ui-btn ui-btn-ghost"><MapPin size={16} />{t("wizard.field.useMajes")}</button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="wizard-body">
                <div className="field-block">
                  <span className="ui-label"><WaterIcon size={16} />{t("wizard.resources.water")}</span>
                  <div className="ui-input-wrap">
                    <input type="number" inputMode="numeric" min={0} step={500} value={farm.waterAvailableM3ha} onChange={(e) => setFarm({ waterAvailableM3ha: Number(e.target.value) || 0 })} className="ui-input" />
                    <span>m³/ha</span>
                  </div>
                  <div className="preset-row">
                    {WATER_PRESETS.map((v) => <button key={v} type="button" className={farm.waterAvailableM3ha === v ? "active" : ""} onClick={() => setFarm({ waterAvailableM3ha: v })}>{n.format(v)}</button>)}
                  </div>
                  <button type="button" onClick={() => setFarm({ waterAvailableM3ha: TYPICAL_WATER })} className="wizard-link">{t("wizard.resources.dontKnow", { m3: n.format(TYPICAL_WATER) })}</button>
                </div>

                <Choice title={t("wizard.resources.irrigation")} value={farm.irrigation} options={["gravedad", "aspersion", "goteo"] as Irrigation[]} label={(v) => t(`irrigation.${v}`)} sub={(v) => t("wizard.resources.eff", { eff: pct.format(efficiency(v, farm.soilTexture)) })} onChange={(irrigation) => setFarm({ irrigation })} />
                <Choice title={t("wizard.resources.soil")} value={farm.soilTexture} options={["arenoso", "franco", "arcilloso"] as SoilTexture[]} label={(v) => t(`soil.${v}`)} sub={(v) => t(`wizard.resources.soilHint.${v}`)} onChange={(soilTexture) => setFarm({ soilTexture })} />

                <div className="field-block">
                  <span className="ui-label">{t("wizard.resources.current")}</span>
                  <div className="wizard-rotations">
                    {farm.rotations.map((r) => (
                      <button key={r.id} type="button" aria-pressed={r.isCurrent} onClick={() => setFarm({ rotations: farm.rotations.map((x) => ({ ...x, isCurrent: x.id === r.id })) })} className={`wizard-option ${r.isCurrent ? "active" : ""}`}>
                        <RotationIcons rotation={r} size={18} />
                        <span>{r.name}</span>
                        <i>{r.isCurrent && <Check size={14} />}</i>
                      </button>
                    ))}
                  </div>
                  <Link href={`/${locale}/rotaciones`} className="wizard-link"><Pencil size={13} />{t("wizard.resources.other")}</Link>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="wizard-body">
                <div className="wizard-profiles">
                  {PROFILES.map((pr) => (
                    <button key={pr.id} type="button" aria-pressed={profile === pr.id} onClick={() => setFarm({ priorities: pr.p })} className={`wizard-profile ${profile === pr.id ? "active" : ""}`}>
                      <span className="wizard-profile-icon"><pr.Icon size={24} /></span>
                      <span>
                        <b>{t(`wizard.priorities.${pr.id}.title`)}</b>
                        <small>{t(`wizard.priorities.${pr.id}.text`)}</small>
                      </span>
                      <i>{profile === pr.id && <Check size={14} />}</i>
                    </button>
                  ))}
                </div>
                <p className="ui-hint">{t("wizard.priorities.fine")}</p>
              </div>
            )}

            {step === 3 && (
              <div className="wizard-body">
                {rec ? (
                  <>
                    <div className="wizard-recap">
                      <span><MapPin size={13} />{farm.lat.toFixed(3)}, {farm.lon.toFixed(3)}</span>
                      <span><WaterIcon size={13} />{n.format(farm.waterAvailableM3ha)} m³/ha</span>
                      <span>{t(`irrigation.${farm.irrigation}`)} · {t(`soil.${farm.soilTexture}`)}</span>
                      {current && <span>{es ? "Hoy:" : "Today:"} {current.name}</span>}
                    </div>
                    <RecommendationCard rec={rec} waterAvailable={farm.waterAvailableM3ha} />
                    <Link href={`/${locale}/comparar`} className="ui-btn ui-btn-ghost self-start"><BarChart3 size={16} />{t("wizard.result.compare")}</Link>
                  </>
                ) : (
                  <LoadingOrbit label={t("comparar.loading")} />
                )}
              </div>
            )}
          </div>

          {/* navegación: fija abajo en el celular */}
          <div className="wizard-nav">
            <button type="button" onClick={() => go(step - 1)} disabled={step === 0} className="ui-btn ui-btn-ghost"><ArrowLeft size={16} />{t("wizard.back")}</button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => go(step + 1)} className="ui-btn">{step === 2 ? t("wizard.see") : t("wizard.next")}<ArrowRight size={16} /></button>
            ) : (
              <Link href={`/${locale}/comparar`} className="ui-btn">{es ? "Ver el detalle" : "See the detail"}<ArrowRight size={16} /></Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Choice<T extends string>({ title, value, options, label, sub, onChange }: { title: string; value: T; options: T[]; label: (v: T) => string; sub: (v: T) => string; onChange: (v: T) => void }) {
  return (
    <div className="field-block">
      <span className="ui-label">{title}</span>
      <div className="option-cards">
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={o === value} onClick={() => onChange(o)} className={`option-card ${o === value ? "active" : ""}`}>
            <b>{label(o)}</b>
            <small>{sub(o)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
