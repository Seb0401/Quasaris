"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUp, Check, ChevronDown, Combine, Save, Sprout, X } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { CropIcon, CycleIcon, SoilIcon } from "@/components/icons/farm-icons";
import { Badge, PageHeader, Panel } from "@/components/ui/kit";
import type { RotationCrop } from "@/lib/contract";
import { CROPS, MONTH_START, cropName } from "@/lib/crop-calendar";
import { CropBrowser } from "@/components/crops/crop-picker";
import { setFarm, useFarm } from "@/lib/farm-store";
import { evaluateGroup, type GroupMode, type Point } from "@/lib/grouping";
import { MAX_CROPS, MAX_ROTATIONS, newRotationId } from "@/lib/rotation-utils";
import { CropModelNotes } from "@/components/crop-model-notes";
import { isOrchard } from "@/lib/crop-calendar";

const PRESETS: { id: string; mode: GroupMode; crops: RotationCrop[] }[] = [
  { id: "threeSisters", mode: "association", crops: [{ cropId: "maiz_chala", sowMonth: 9 }, { cropId: "frijol", sowMonth: 9 }, { cropId: "zapallo", sowMonth: 9 }] },
  { id: "carrotOnion", mode: "association", crops: [{ cropId: "zanahoria", sowMonth: 4 }, { cropId: "cebolla", sowMonth: 4 }] },
  { id: "oatPea", mode: "association", crops: [{ cropId: "avena", sowMonth: 4 }, { cropId: "arveja", sowMonth: 4 }] },
  { id: "soilWater", mode: "rotation", crops: [{ cropId: "cebolla", sowMonth: 3 }, { cropId: "haba", sowMonth: 8 }, { cropId: "maiz_chala", sowMonth: 12 }] },
  { id: "quinoaFaba", mode: "rotation", crops: [{ cropId: "quinua", sowMonth: 4 }, { cropId: "haba", sowMonth: 10 }] },
  { id: "hungry", mode: "rotation", crops: [{ cropId: "papa", sowMonth: 4 }, { cropId: "maiz_chala", sowMonth: 9 }] },
];

const VERDICT_TONE = { good: "ok", fair: "warn", poor: "danger" } as const;
const SHOWN_REASONS = 4;

export function AgrupacionesClient() {
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const [mode, setMode] = useState<GroupMode>("rotation");
  const [crops, setCrops] = useState<RotationCrop[]>(PRESETS[3].crops);
  const [allReasons, setAllReasons] = useState(false);
  const [saved, setSaved] = useState(false);
  const names = (id: string) => cropName(id, locale);
  const ev = useMemo(() => evaluateGroup(crops, mode, (id) => cropName(id, locale)), [crops, mode, locale]);
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "long" });
  const months = MONTH_START.map((_, m) => fmtMonth.format(new Date(2025, m, 1)));
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });

  const change = (next: RotationCrop[]) => {
    setCrops(next);
    setSaved(false);
  };
  const add = (cropId: string) => {
    if (isOrchard(cropId)) {
      setMode("rotation");
      change([{ cropId, sowMonth: 1 }]);
      return;
    }
    if (crops.some((c) => isOrchard(c.cropId))) {
      change([{ cropId, sowMonth: 3 }]);
      return;
    }
    if (crops.length >= MAX_CROPS) return;
    change([...crops, { cropId, sowMonth: mode === "association" && crops[0] ? crops[0].sowMonth : 3 }]);
  };
  const setMonth = (i: number, sowMonth: number) =>
    change(crops.map((c, k) => (k === i || mode === "association" ? { ...c, sowMonth } : c)));
  const save = () => {
    if (farm.rotations.length >= MAX_ROTATIONS || crops.length === 0) return;
    setFarm({ rotations: [...farm.rotations, { id: newRotationId(), name: crops.map((c) => names(c.cropId)).join(mode === "association" ? " + " : " · "), isCurrent: false, crops, mode }] });
    setSaved(true);
  };

  // motivos a favor y en contra mezclados por peso: primero lo que más pesa
  const reasons: (Point & { good: boolean })[] = [...ev.pros.map((p) => ({ ...p, good: true })), ...ev.cons.map((p) => ({ ...p, good: false }))].sort((a, b) => b.weight - a.weight);
  const shown = allReasons ? reasons : reasons.slice(0, SHOWN_REASONS);
  const cover = ev.nitrogen.demandKg > 0 ? Math.min(1, ev.nitrogen.fixedKg / ev.nitrogen.demandKg) : 0;

  return (
    <div className="ui-page">
      <PageHeader icon={Combine} kicker={t("group.kicker")} title={t("group.title")} subtitle={t("group.subtitle")} />

      <div className="group-layout">
        <Panel className="group-builder">
          {/* 1. modo */}
          <h2 className="group-step"><span>1</span>{t("group.step1")}</h2>
          <div className="group-modes" role="radiogroup" aria-label={t("group.step1")}>
            {(["rotation", "association"] as GroupMode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                disabled={m === "association" && crops.some((c) => isOrchard(c.cropId))}
                onClick={() => {
                  setMode(m);
                  if (m === "association" && crops[0]) change(crops.map((c) => ({ ...c, sowMonth: crops[0].sowMonth })));
                  else setSaved(false);
                }}
                className={mode === m ? "is-active" : ""}
              >
                {m === "rotation" ? <CycleIcon size={22} /> : <Combine size={22} />}
                <span>
                  <b>{t(`group.mode.${m}`)}</b>
                  <small>{t(`group.mode.${m}Hint`)}</small>
                </span>
              </button>
            ))}
          </div>

          {/* 2. cultivos */}
          <h2 className="group-step">
            <span>2</span>{t("group.step2")}
            <em>{t("group.count", { n: crops.length, max: MAX_CROPS })}</em>
          </h2>
          <CropBrowser locale={locale} selected={Object.fromEntries(crops.map((c) => [c.cropId, crops.filter((other) => other.cropId === c.cropId).length]))} onChoose={add} isOptionDisabled={(id) => crops.length >= MAX_CROPS && !isOrchard(id)} />
          <p className="ui-hint">{locale === "es" ? "Los frutales se planifican como un huerto establecido por lote. Al elegir uno, se reemplaza la selección actual; los demás cultivos van en lotes separados." : "Fruit crops are planned as one established orchard per plot. Choosing one replaces the current selection; other crops belong on separate plots."}</p>

          {/* 3. grupo */}
          <CropModelNotes cropIds={crops.map((c) => c.cropId)} locale={locale} />
          <h2 className="group-step">
            <span>3</span>{t("group.step3")}
            {crops.length > 0 && <button type="button" className="group-clear" onClick={() => change([])}>{t("group.clear")}</button>}
          </h2>
          {crops.length === 0 && <p className="ui-hint">{t("group.emptyHint")}</p>}
          <ol className={`group-list ${mode === "association" ? "is-together" : ""}`}>
            {crops.map((c, i) => (
              <li key={i}>
                {mode === "rotation" && <span className="group-order">{i + 1}</span>}
                <CropIcon crop={c.cropId} size={22} className="text-brand" />
                <b>{names(c.cropId)}</b>
                {!CROPS[c.cropId]?.perennial && (mode === "rotation" || i === 0) && (
                  <select value={c.sowMonth} onChange={(e) => setMonth(i, Number(e.target.value))} aria-label={t("rotaciones.sowMonth")} className="ui-select capitalize">
                    {months.map((m, k) => <option key={k} value={k + 1}>{m}</option>)}
                  </select>
                )}
                {mode === "rotation" && i > 0 && (
                  <button type="button" className="time-btn" aria-label={t("group.moveUp", { crop: names(c.cropId) })} onClick={() => change(crops.map((x, k) => (k === i - 1 ? crops[i] : k === i ? crops[i - 1] : x)))}>
                    <ArrowUp size={14} />
                  </button>
                )}
                <button type="button" className="time-btn" aria-label={t("group.remove", { crop: names(c.cropId) })} onClick={() => change(crops.filter((_, k) => k !== i))}>
                  <X size={14} />
                </button>
              </li>
            ))}
          </ol>

          <div className="group-presets">
            <span>{t("group.presets")}</span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setMode(p.mode);
                  change(p.crops);
                }}
              >
                {p.mode === "rotation" ? <CycleIcon size={13} /> : <Combine size={13} />}
                {t(`group.preset.${p.id}`)}
              </button>
            ))}
          </div>
        </Panel>

        {/* resultado */}
        <Panel className={`group-result tone-${VERDICT_TONE[ev.verdict]}`}>
          <div className="group-verdict">
            <div className="group-score" style={{ "--score": `${ev.score * 3.6}deg` } as React.CSSProperties}>
              <span><b>{ev.score}</b><small>/100</small></span>
            </div>
            <div>
              <p className="ui-kicker">{t("group.result")}</p>
              <h2>{t(`group.verdict.${ev.verdict}`)}</h2>
              <div className="group-verdict-crops">
                {crops.map((c, i) => <CropIcon key={i} crop={c.cropId} size={18} />)}
              </div>
            </div>
          </div>

          <div>
            <h3 className="group-sub">{t("group.reasons")}</h3>
            <ul className="group-reasons">
              {shown.map((p, i) => (
                <li key={i} className={p.good ? "is-good" : "is-bad"}>
                  {p.good ? <Check size={15} /> : <X size={15} />}
                  <span>{t(`group.point.${p.key}`, p.params)}</span>
                </li>
              ))}
            </ul>
            {reasons.length > SHOWN_REASONS && (
              <button type="button" className="wizard-link" onClick={() => setAllReasons(!allReasons)}>
                {allReasons ? t("group.fewerReasons") : t("group.moreReasons", { n: reasons.length })}
              </button>
            )}
          </div>

          {crops.length > 0 && (
            <div className="group-nitrogen">
              <h3 className="group-sub"><SoilIcon size={15} /> {t("group.nTitle")}</h3>
              <div className="group-bar"><i style={{ width: `${cover * 100}%` }} /></div>
              <p>{ev.nitrogen.fixedKg > 0 ? t("group.nCover", { pct: pct.format(cover) }) : t("group.nNone")}{" "}
                {ev.nitrogen.balanceKg >= 0 ? t("group.nSurplus", { kg: ev.nitrogen.balanceKg }) : t("group.nNeed", { kg: -ev.nitrogen.balanceKg })}
              </p>
            </div>
          )}

          {ev.cares.length > 0 && (
            <details className="group-details">
              <summary><Sprout size={15} />{t("group.careTitle")}<ChevronDown size={16} className="group-chevron" /></summary>
              <div className="group-cares">
                {ev.cares.map((c, i) => (
                  <div key={i}>
                    <p><CropIcon crop={c.cropId} size={16} className="text-brand" /> {names(c.cropId)}</p>
                    <ul>
                      {c.keys.map((k) => <li key={k}>{t(`group.care.${k}`)}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          )}

          {crops.length > 0 && (
            <details className="group-details">
              <summary><Combine size={15} />{t("group.moreTitle")}<ChevronDown size={16} className="group-chevron" /></summary>
              <div className="group-chips">
                <Badge tone="neutral">P · {t(`group.level.${ev.phosphorus}`)}</Badge>
                <Badge tone="neutral">K · {t(`group.level.${ev.potassium}`)}</Badge>
                <Badge tone="neutral">{t("group.labor")} · {t(`group.level.${ev.labor}`)}</Badge>
                <Badge tone="neutral">N · {ev.nitrogen.demandKg} kg/ha</Badge>
              </div>
              {ev.sharedPests.length > 0 && (
                <p className="ui-hint"><b>{t("group.sharedPests")}:</b> {ev.sharedPests.map((p) => t(`group.pest.${p}`)).join(", ")}</p>
              )}
            </details>
          )}

          {mode === "rotation" ? (
            <div className="group-actions">
              <button type="button" onClick={save} disabled={saved || crops.length === 0 || farm.rotations.length >= MAX_ROTATIONS} className="ui-btn">
                {saved ? <Check size={16} /> : <Save size={16} />} {saved ? t("group.saved") : t("group.save")}
              </button>
              {saved && <Link href={`/${locale}/comparar`} className="ui-btn ui-btn-ghost">{t("group.toCompare")}<ArrowRight size={15} /></Link>}
              {farm.rotations.length >= MAX_ROTATIONS && <span className="ui-hint">{t("group.full")}</span>}
            </div>
          ) : (
            <p className="ui-hint">{t("group.associationNote")}</p>
          )}
          <p className="ui-source">{t("group.source")}</p>
        </Panel>
      </div>
    </div>
  );
}
