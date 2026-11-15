"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCheck, CircleHelp, Leaf, MapPin, Plus, Repeat2, Sparkles, Sprout, Trash2, TriangleAlert, X } from "lucide-react";
import { useLocale } from "@/components/i18n-provider";
import { QuasarisMark } from "@/components/brand/quasaris-mark";
import { ThemeSwitch } from "@/components/theme-switch";
import { CropIcon } from "@/components/icons/farm-icons";
import type { Rotation, RotationCrop } from "@/lib/contract";
import { CROPS, FAMILY_COLOR, MONTH_START, cropName, cropSegments, cycleDays } from "@/lib/crop-calendar";
import { setFarm, useFarm } from "@/lib/farm-store";
import { MAX_CROPS, MAX_ROTATIONS, newRotationId, overlapDays } from "@/lib/rotation-utils";
import "./onboarding.css";

const STARTERS: { id: string; crops: RotationCrop[] }[] = [
  { id: "onion", crops: [{ cropId: "cebolla", sowMonth: 3 }, { cropId: "haba", sowMonth: 8 }] },
  { id: "potato", crops: [{ cropId: "papa", sowMonth: 4 }, { cropId: "maiz_chala", sowMonth: 9 }] },
  { id: "custom", crops: [{ cropId: "haba", sowMonth: 8 }] },
];

export function OnboardingClient() {
  const locale = useLocale();
  const es = locale === "es";
  const farm = useFarm();
  const [step, setStep] = useState(0);
  const [starter, setStarter] = useState("onion");
  const [crops, setCrops] = useState<RotationCrop[]>(STARTERS[0].crops);
  const [name, setName] = useState<string | null>(null);
  const [makeCurrent, setMakeCurrent] = useState(true);
  const [saved, setSaved] = useState<Rotation | null>(null);
  const saving = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const steps = es ? ["Cultivos", "Calendario", "Revisión"] : ["Crops", "Calendar", "Review"];
  const titles = es
    ? ["Elige tus cultivos.", "Organiza tu calendario.", "Revisa tu rotación."]
    : ["Choose your crops.", "Plan your planting calendar.", "Review your rotation."];
  const hints = es
    ? ["Elige un punto de partida. Podrás cambiar cada cultivo en el siguiente paso.", "Elige qué sembrar y cuándo. La vista previa se actualiza contigo.", "Revisa tu plan y guárdalo. Siempre podrás ajustarlo después."]
    : ["Choose a starting point. You can change every crop in the next step.", "Choose what to plant and when. Your preview grows with you.", "Give your plan a name and save it. You can always fine-tune it later."];
  const monthNames = MONTH_START.map((_, i) => new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(2025, i, 1)));
  const autoName = crops.map((c) => cropName(c.cropId, locale)).join(" · ").slice(0, 40);
  const rotation: Rotation = { id: "preview", name: name ?? autoName, crops, isCurrent: makeCurrent, mode: "rotation" };
  const overlap = overlapDays(rotation);
  const full = farm.rotations.length >= MAX_ROTATIONS;
  const valid = crops.length > 0 && overlap === 0;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [step, saved]);

  function updateCrop(index: number, patch: Partial<RotationCrop>) {
    setCrops((previous) => previous.map((crop, i) => i === index ? { ...crop, ...patch } : crop));
  }

  function addCrop() {
    // Find a month with room for a short crop, including across December.
    const cropId = "arveja";
    const sowMonth = MONTH_START.findIndex((_, i) => overlapDays({ ...rotation, crops: [...crops, { cropId, sowMonth: i + 1 }] }) === 0) + 1;
    setCrops((previous) => [...previous, { cropId, sowMonth: sowMonth || 1 }]);
  }

  function save() {
    if (saving.current || full || !valid || !rotation.name.trim()) return;
    saving.current = true;
    const created = { ...rotation, id: newRotationId(), name: rotation.name.trim() };
    setFarm({ rotations: [...farm.rotations.map((r) => makeCurrent ? { ...r, isCurrent: false } : r), created] });
    setSaved(created);
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-topbar">
        <Link href={`/${locale}`} className="brand-lockup" aria-label="Quasaris"><QuasarisMark width={34} height={34} /><span><strong>QUASARIS</strong><small>Farm Twin</small></span></Link>
        <span className="onboarding-topbarTitle">{es ? "Nueva rotación" : "New rotation"}</span>
        <div className="onboarding-topbarActions">
          <ThemeSwitch />
          <Link href={`/${es ? "en" : "es"}/onboarding`} className="onboarding-language" aria-label={es ? "Switch to English" : "Cambiar a español"}>{es ? "EN" : "ES"}</Link>
          <Link href={`/${locale}`} className="onboarding-exit" aria-label={es ? "Salir de la configuración" : "Exit setup"}><span>{es ? "Salir" : "Exit setup"}</span><X size={17} /></Link>
        </div>
      </div>

      <div className="onboarding-layout">
        <aside className="onboarding-story">
          <span className="ai-mark" title="Illustration generated with ChatGPT">AI-generated image</span>
          <div className="onboarding-storyTop"><Repeat2 size={18} /><span>{es ? "PLANIFICA TU PRÓXIMA CAMPAÑA" : "PLAN YOUR NEXT SEASON"}</span></div>
          <div className="onboarding-storyCopy">
            <span className="onboarding-eyebrow">{es ? "TU PARCELA. TU PLAN." : "YOUR LAND. YOUR PLAN."}</span>
            <h1>{es ? <>Una nueva<br />campaña.<br /><em>Un mejor plan.</em></> : <>A new season.<br />A clearer<br /><em>plan.</em></>}</h1>
            <p>{es ? "Define tus cultivos y sus tiempos. Construye una rotación que puedas revisar, comparar y mejorar." : "Bring your crops and timing together. Build a rotation you can review, compare and refine."}</p>
          </div>
          <ol className="onboarding-steps" aria-label={es ? "Pasos de creación" : "Creation steps"}>
            {steps.map((label, i) => (
              <li key={label} data-active={!saved && step === i} data-done={!!saved || step > i}>
                <button type="button" disabled={!!saved || i > step} onClick={() => setStep(i)} aria-current={!saved && i === step ? "step" : undefined}>
                  <span>{saved || step > i ? <Check size={16} /> : `0${i + 1}`}</span>
                  <b>{label}</b>
                  {!saved && i === step && <i />}
                </button>
              </li>
            ))}
          </ol>
          <div className="onboarding-storyNote"><Leaf size={17} /><span>{es ? "Una rotación alterna cultivos en la misma parcela a lo largo del año." : "A rotation alternates crops on the same field throughout the year."}</span></div>
        </aside>

        <section className="onboarding-workspace" aria-label={es ? "Crear una rotación" : "Create a rotation"}>
          {saved ? (
            <div className="onboarding-success">
              <div className="onboarding-successIcon"><CheckCheck size={38} /></div>
              <span className="onboarding-eyebrow">{es ? "LA PRIMERA DE MUCHAS" : "THE FIRST OF MANY"}</span>
              <h2 ref={heading} tabIndex={-1}>{es ? "Tu rotación está lista." : "Your rotation is ready."}</h2>
              <p>{es ? <>Guardamos <strong>{saved.name}</strong> en tus rotaciones. Tu próxima campaña ya tiene un punto de partida.</> : <><strong>{saved.name}</strong> is now in your rotations. Your next season has a starting point.</>}</p>
              <div className="onboarding-savedCrops">{saved.crops.map((c, i) => <span key={i}><CropIcon crop={c.cropId} size={25} />{cropName(c.cropId, locale)}</span>)}</div>
              <Link className="ui-btn ui-btn-lg" href={`/${locale}/rotaciones`}>{es ? "Ver mi rotación" : "View my rotation"}<ArrowRight size={17} /></Link>
              <Link className="onboarding-textLink" href={`/${locale}/comparar`}>{es ? "Comparar con otras rotaciones" : "Compare with other rotations"}</Link>
              <small>{es ? "Guardada en este dispositivo." : "Saved on this device."}</small>
            </div>
          ) : full ? (
            <div className="onboarding-success">
              <div className="onboarding-successIcon"><Sprout size={35} /></div>
              <h2 ref={heading} tabIndex={-1}>{es ? "Tu colección está completa." : "Your collection is full."}</h2>
              <p>{es ? `Puedes guardar hasta ${MAX_ROTATIONS} rotaciones. Elimina una alternativa en el editor para crear otra.` : `You can save up to ${MAX_ROTATIONS} rotations. Remove an alternative in the editor to make room for another.`}</p>
              <Link href={`/${locale}/rotaciones`} className="ui-btn">{es ? "Gestionar mis rotaciones" : "Manage my rotations"}<ArrowRight size={16} /></Link>
            </div>
          ) : (
            <form className="onboarding-form" onSubmit={(event) => { event.preventDefault(); if (step < 2) { if (step === 0 || valid) setStep(step + 1); } else save(); }}>
              <header className="onboarding-header">
                <div className="onboarding-stepLabel"><span>{es ? `PASO 0${step + 1} / 03` : `STEP 0${step + 1} / 03`}</span><span>{es ? "CONFIGURACIÓN DE ROTACIÓN" : "ROTATION SETUP"}</span></div>
                <div className="onboarding-progress" aria-hidden><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
                <h2 ref={heading} tabIndex={-1}>{titles[step]}</h2>
                <p>{hints[step]}</p>
              </header>

              <div className="onboarding-content" key={step}>
                {step === 0 && (
                  <div className="onboarding-starters">
                    {STARTERS.map((option) => (
                      <button key={option.id} type="button" aria-pressed={starter === option.id} className="onboarding-starter" data-selected={starter === option.id} onClick={() => { setStarter(option.id); setCrops(option.crops); }}>
                        <span className="onboarding-starterIcon">{option.id === "custom" ? <Plus size={25} /> : option.crops.map((c) => <CropIcon key={c.cropId} crop={c.cropId} size={28} />)}</span>
                        <span className="onboarding-starterCopy">
                          <b>{option.id === "custom" ? (es ? "A mi manera" : "Start my own") : option.crops.map((c) => cropName(c.cropId, locale)).join(" + ")}</b>
                          <small>{option.id === "custom" ? (es ? "Empieza con un cultivo y construye tu plan." : "Begin with one crop and build from there.") : option.crops.map((c) => `${cropName(c.cropId, locale)} · ${monthNames[c.sowMonth - 1]}`).join(" → ")}</small>
                        </span>
                        <span className="onboarding-radio" aria-hidden>{starter === option.id && <Check size={13} />}</span>
                      </button>
                    ))}
                    <p className="onboarding-note"><CircleHelp size={16} />{es ? "Son ejemplos para empezar, no recomendaciones para tu parcela." : "These are starting examples, not recommendations for your field."}</p>
                  </div>
                )}

                {step === 1 && (
                  <div className="onboarding-cropEditor">
                    {crops.map((crop, i) => (
                      <div className="onboarding-cropRow" key={i}>
                        <span className="onboarding-cropNumber">{String(i + 1).padStart(2, "0")}</span>
                        <label>{es ? "Cultivo" : "Crop"}<select value={crop.cropId} onChange={(e) => updateCrop(i, { cropId: e.target.value })} className="ui-select" aria-label={`${es ? "Cultivo" : "Crop"} ${i + 1}`}>{Object.keys(CROPS).map((id) => <option value={id} key={id}>{cropName(id, locale)}</option>)}</select></label>
                        <label>{es ? "Siembra" : "Plant in"}<select className="ui-select" value={crop.sowMonth} disabled={!!CROPS[crop.cropId].perennial} onChange={(e) => updateCrop(i, { sowMonth: Number(e.target.value) })} aria-label={`${es ? "Mes de siembra" : "Planting month"} ${i + 1}`}>{monthNames.map((m, j) => <option key={j} value={j + 1}>{m}</option>)}</select></label>
                        <button type="button" className="onboarding-remove" disabled={crops.length === 1} aria-label={`${es ? "Quitar" : "Remove"} ${cropName(crop.cropId, locale)} ${i + 1}`} onClick={() => setCrops((previous) => previous.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                      </div>
                    ))}
                    {crops.length < MAX_CROPS && <button className="onboarding-addCrop" type="button" onClick={addCrop}><Plus size={16} />{es ? "Añadir otro cultivo" : "Add another crop"}<span>{crops.length}/{MAX_CROPS}</span></button>}
                    {overlap > 0 ? <p className="onboarding-warning" role="status"><TriangleAlert size={17} />{es ? `Los cultivos se superponen ${overlap} días. Ajusta los meses para sembrar uno después de otro.` : `Your crops overlap by ${overlap} days. Adjust planting months so they grow one after another.`}</p> : <p className="onboarding-note"><Check size={16} />{es ? "Sin superposiciones. Cada cultivo tiene su momento." : "No overlaps. Every crop has its own time to grow."}</p>}
                    {crops.some((c) => CROPS[c.cropId].perennial) && <p className="onboarding-note">{es ? "Los cultivos permanentes ocupan todo el año; no necesitan un mes de siembra." : "Perennial crops occupy the full year and do not need a planting month."}</p>}
                  </div>
                )}

                {step === 2 && (
                  <div className="onboarding-details">
                    <label className="onboarding-nameLabel" htmlFor="rotation-name">{es ? "Nombre de tu rotación" : "Your rotation’s name"}</label>
                    <input id="rotation-name" className="ui-input" value={name ?? autoName} required maxLength={40} onChange={(e) => setName(e.target.value)} aria-describedby="rotation-name-hint" />
                    <small id="rotation-name-hint">{es ? "Algo que te ayude a reconocerla. Máximo 40 caracteres." : "Something you’ll recognize. Up to 40 characters."}</small>
                    <label className="onboarding-currentChoice"><input type="checkbox" checked={makeCurrent} onChange={(e) => setMakeCurrent(e.target.checked)} /><span><b>{es ? "Usar como mi rotación actual" : "Use as my current rotation"}</b><small>{es ? "Aparecerá seleccionada en tu calendario." : "It will be selected in your calendar."}</small></span></label>
                    <div className="onboarding-fieldNote"><MapPin size={17} /><span><b>{es ? "Tu parcela actual" : "Your current field"}</b><small>{farm.lat.toFixed(3)}, {farm.lon.toFixed(3)} · {new Intl.NumberFormat(locale).format(farm.waterAvailableM3ha)} m³/ha</small></span></div>
                    <p className="onboarding-note">{es ? "Puedes ajustar la ubicación, el agua y el suelo desde Mi parcela después de guardar." : "You can adjust location, water and soil in My field after saving."}</p>
                  </div>
                )}

                {step > 0 && <div className="onboarding-preview">
                  <div className="onboarding-previewHead"><span><CalendarDays size={15} />{es ? "TU AÑO, DE UN VISTAZO" : "YOUR YEAR AT A GLANCE"}</span><span>{es ? "VISTA PREVIA" : "LIVE PREVIEW"}</span></div>
                  <div className="onboarding-months">{monthNames.map((m, i) => <span key={i} title={m}>{m.slice(0, 1)}</span>)}</div>
                  {crops.map((crop, i) => <div className="onboarding-timelineRow" key={i}>
                    <div className="onboarding-track" aria-hidden>{cropSegments(crop).map((segment, j) => <i key={j} style={{ left: `${segment.start / 365 * 100}%`, width: `${(segment.end - segment.start) / 365 * 100}%`, background: FAMILY_COLOR[CROPS[crop.cropId].family] ?? "var(--cyan)" }} />)}</div>
                    <div className="onboarding-trackLabel"><span><CropIcon crop={crop.cropId} size={16} />{cropName(crop.cropId, locale)}</span><span>{CROPS[crop.cropId].perennial ? (es ? "Todo el año" : "Year-round") : `${monthNames[crop.sowMonth - 1]} · ~${cycleDays(crop.cropId)} ${es ? "días" : "days"}`}</span></div>
                  </div>)}
                  <small className="onboarding-estimate">{es ? "Duración estimada de los cultivos; puede variar según las condiciones locales." : "Estimated crop durations may vary with local conditions."}</small>
                </div>}
              </div>

              <footer className="onboarding-footer">
                {step > 0 ? <button type="button" onClick={() => setStep(step - 1)} className="onboarding-back"><ArrowLeft size={16} />{es ? "Atrás" : "Back"}</button> : <span className="onboarding-footerHint">{es ? "Paso 1 de 3" : "Step 1 of 3"}</span>}
                <button className="ui-btn" type="submit" disabled={(step > 0 && !valid) || (step === 2 && !rotation.name.trim())}>{step === 2 ? (es ? "Crear mi rotación" : "Create my rotation") : (es ? "Continuar" : "Continue")}{step === 2 ? <Sparkles size={16} /> : <ArrowRight size={16} />}</button>
              </footer>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
