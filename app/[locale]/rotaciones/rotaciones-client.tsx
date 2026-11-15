"use client";

import Link from "next/link";
import { ArrowRight, Check, Combine, Plus, Repeat2, Star, Trash2, TriangleAlert, X } from "lucide-react";
import { evaluateGroup } from "@/lib/grouping";
import { useLocale, useT } from "@/components/i18n-provider";
import { Reveal } from "@/components/motion/reveal";
import { Badge, PageHeader } from "@/components/ui/kit";
import type { Rotation } from "@/lib/contract";
import { CATEGORIES, CROPS, FAMILY_COLOR, MONTH_START, cropName, cropSegments, cropsIn } from "@/lib/crop-calendar";
import { setFarm, useFarm } from "@/lib/farm-store";
import { MAX_CROPS, MAX_ROTATIONS, bareMonths, newRotationId, overlapDays } from "@/lib/rotation-utils";
import { rotationColor } from "@/lib/ui";

export function RotacionesClient() {
  const t = useT();
  const locale = useLocale();
  const es = locale === "es";
  const farm = useFarm();
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "short" });
  const months = MONTH_START.map((_, m) => fmtMonth.format(new Date(2025, m, 1)));

  const update = (id: string, patch: (r: Rotation) => Rotation) => setFarm({ rotations: farm.rotations.map((r) => (r.id === id ? patch(r) : r)) });
  const remove = (id: string) => setFarm({ rotations: farm.rotations.filter((r) => r.id !== id) });
  const setCurrent = (id: string) => setFarm({ rotations: farm.rotations.map((r) => ({ ...r, isCurrent: r.id === id })) });
  const add = () =>
    setFarm({
      rotations: [...farm.rotations, { id: newRotationId(), name: t("rotaciones.newName"), isCurrent: false, crops: [{ cropId: "haba", sowMonth: 8 }] }],
    });

  return (
    <div className="ui-page">
      <PageHeader icon={Repeat2} kicker={es ? "EDITOR" : "EDITOR"} title={t("rotaciones.title")} subtitle={t("rotaciones.subtitle")} />
      <div className="flex flex-wrap gap-3">
        {farm.rotations.length < MAX_ROTATIONS && <Link href={`/${locale}/onboarding`} className="ui-btn ui-btn-sm"><Plus size={14} />{es ? "Crear con guía" : "Create with a guide"}</Link>}
        <Link href={`/${locale}/agrupaciones`} className="ui-btn ui-btn-ghost ui-btn-sm"><Combine size={14} />{t("group.title")}</Link>
      </div>

      <div className="rotation-editor-grid">
        {farm.rotations.map((r, index) => {
          const overlap = r.mode === "association" ? 0 : overlapDays(r);
          const bare = bareMonths(r);
          const color = rotationColor(index);
          return (
            <Reveal key={r.id} delay={index * 80}>
              <article className="rotation-card rotation-editor" style={{ "--accent": color } as React.CSSProperties}>
                <div className="rotation-card-glow" aria-hidden />
                <div className="rotation-editor-head">
                  <i style={{ background: color }} />
                  <input value={r.name} onChange={(e) => update(r.id, (x) => ({ ...x, name: e.target.value.slice(0, 40) }))} aria-label={t("rotaciones.name")} className="ui-input rotation-name-input" />
                  {r.mode === "association" && <Badge tone="brand" icon={Combine}>{t("group.mode.association")}</Badge>}
                  {r.isCurrent ? (
                    <Badge tone="sky" icon={Star}>{t("comparar.current")}</Badge>
                  ) : (
                    <button type="button" onClick={() => setCurrent(r.id)} className="ui-btn ui-btn-ghost ui-btn-sm"><Star size={13} />{t("rotaciones.makeCurrent")}</button>
                  )}
                </div>

                {/* línea de tiempo */}
                <div className="rotation-timeline">
                  <div className="year-calendar-months" style={{ marginLeft: 0 }}>
                    {months.map((m, i) => <span key={i} className={bare.includes(i) ? "is-bare" : ""}>{m}</span>)}
                  </div>
                  {r.crops.map((rc, i) => {
                    const c = FAMILY_COLOR[CROPS[rc.cropId]?.family] ?? "var(--cyan)";
                    return (
                      <div key={i} className="cal-track">
                        {CROPS[rc.cropId] && cropSegments(rc).map((s, j) => (
                          <div key={j} className="cal-segment" style={{ left: `${(s.start / 365) * 100}%`, width: `${((s.end - s.start) / 365) * 100}%`, background: `linear-gradient(90deg, color-mix(in srgb, ${c} 55%, transparent), ${c})` }} />
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* cultivos */}
                <div className="crop-editor">
                  {r.crops.map((rc, i) => (
                    <div key={i} className="crop-editor-row">
                      <select value={rc.cropId} onChange={(e) => update(r.id, (x) => ({ ...x, crops: x.crops.map((c, k) => (k === i ? { ...c, cropId: e.target.value } : c)) }))} aria-label={t("rotaciones.crop")} className="ui-select">
                        {CATEGORIES.map((c) => (
                          <optgroup key={c} label={t(`group.category.${c}`)}>
                            {cropsIn(c).map((id) => <option key={id} value={id}>{cropName(id, locale)}</option>)}
                          </optgroup>
                        ))}
                      </select>
                      <select value={rc.sowMonth} disabled={Boolean(CROPS[rc.cropId]?.perennial)} onChange={(e) => update(r.id, (x) => ({ ...x, crops: x.crops.map((c, k) => (k === i ? { ...c, sowMonth: Number(e.target.value) } : c)) }))} aria-label={t("rotaciones.sowMonth")} className="ui-select capitalize">
                        {months.map((m, k) => <option key={k} value={k + 1}>{t("rotaciones.sow")} {m}</option>)}
                      </select>
                      <button type="button" onClick={() => update(r.id, (x) => ({ ...x, crops: x.crops.filter((_, k) => k !== i) }))} aria-label={t("rotaciones.removeCrop")} className="time-btn crop-remove"><X size={15} /></button>
                    </div>
                  ))}
                  {r.crops.length < MAX_CROPS && (
                    <button type="button" onClick={() => update(r.id, (x) => ({ ...x, crops: [...x.crops, { cropId: "cebolla", sowMonth: 3 }] }))} className="crop-add"><Plus size={15} />{t("rotaciones.addCrop")}</button>
                  )}
                </div>

                {r.crops.length > 0 && (() => {
                  const ev = evaluateGroup(r.crops, r.mode ?? "rotation", (id) => cropName(id, locale));
                  // un solo motivo que explique el veredicto: el detalle completo está en Agrupaciones
                  const pro = ev.pros[0] && { ...ev.pros[0], good: true };
                  const con = ev.cons[0] && { ...ev.cons[0], good: false };
                  const top = ev.verdict === "good" ? pro ?? con : con ?? pro;
                  return (
                    <div className="rotation-verdict">
                      <div>
                        <Badge tone={ev.verdict === "good" ? "ok" : ev.verdict === "fair" ? "warn" : "danger"}>{t(`group.verdict.${ev.verdict}`)} · {ev.score}</Badge>
                      </div>
                      {top && <p>{top.good ? <Check size={14} className="text-ok" /> : <X size={14} className="text-danger" />}{t(`group.point.${top.key}`, top.params)}</p>}
                    </div>
                  );
                })()}
                {overlap > 0 && <p className="ui-alert tone-warn"><TriangleAlert size={15} />{t("rotaciones.overlap", { days: overlap })}</p>}
                {bare.length > 0 && r.crops.length > 0 && <p className="ui-hint">{t("rotaciones.bare", { n: bare.length })}</p>}

                {!r.isCurrent && farm.rotations.length > 1 && (
                  <button type="button" onClick={() => remove(r.id)} className="rotation-delete"><Trash2 size={14} />{t("rotaciones.delete")}</button>
                )}
              </article>
            </Reveal>
          );
        })}

        {farm.rotations.length < MAX_ROTATIONS && (
          <button type="button" onClick={add} className="rotation-new"><span><Plus size={26} /></span>{t("rotaciones.add")}</button>
        )}
      </div>

      <Link href={`/${locale}/comparar`} className="ui-btn ui-btn-lg ui-btn-block">{t("parcela.continue")}<ArrowRight size={18} /></Link>
      <p className="ui-source">{t("rotaciones.hint")}</p>
    </div>
  );
}
