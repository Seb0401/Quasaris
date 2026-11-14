"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUp, Check, Combine, Hand, Plus, Save, Sprout, X } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { CropIcon, CycleIcon, SoilIcon } from "@/components/icons/farm-icons";
import type { RotationCrop } from "@/lib/contract";
import { CROPS, MONTH_START, cropName } from "@/lib/crop-calendar";
import { setFarm, useFarm } from "@/lib/farm-store";
import { agronomy, evaluateGroup, type GroupMode } from "@/lib/grouping";
import { MAX_CROPS, MAX_ROTATIONS, newRotationId } from "@/lib/rotation-utils";

const PRESETS: { id: string; mode: GroupMode; crops: RotationCrop[] }[] = [
  { id: "milpa", mode: "association", crops: [{ cropId: "maiz_chala", sowMonth: 9 }, { cropId: "frijol", sowMonth: 9 }] },
  { id: "andean", mode: "association", crops: [{ cropId: "papa", sowMonth: 8 }, { cropId: "haba", sowMonth: 8 }] },
  { id: "careful", mode: "association", crops: [{ cropId: "cebolla", sowMonth: 3 }, { cropId: "haba", sowMonth: 3 }] },
  { id: "soilWater", mode: "rotation", crops: [{ cropId: "cebolla", sowMonth: 3 }, { cropId: "haba", sowMonth: 8 }, { cropId: "maiz_chala", sowMonth: 12 }] },
  { id: "hungry", mode: "rotation", crops: [{ cropId: "papa", sowMonth: 4 }, { cropId: "maiz_chala", sowMonth: 9 }] },
];

const VERDICT_STYLE = { good: "bg-ok/15 text-ok", fair: "bg-warn/20 text-[#8a6a10]", poor: "bg-danger/15 text-danger" };

export function AgrupacionesClient() {
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const [mode, setMode] = useState<GroupMode>("rotation");
  const [crops, setCrops] = useState<RotationCrop[]>(PRESETS[3].crops);
  const [saved, setSaved] = useState(false);
  const names = (id: string) => cropName(id, locale);
  const ev = useMemo(() => evaluateGroup(crops, mode, (id) => cropName(id, locale)), [crops, mode, locale]);
  const fmtMonth = new Intl.DateTimeFormat(locale, { month: "long" });
  const months = MONTH_START.map((_, m) => fmtMonth.format(new Date(2025, m, 1)));

  const add = (cropId: string) => {
    if (crops.length >= MAX_CROPS) return;
    const sowMonth = mode === "association" && crops[0] ? crops[0].sowMonth : 3;
    setCrops([...crops, { cropId, sowMonth }]);
    setSaved(false);
  };
  const update = (i: number, patch: Partial<RotationCrop>) => {
    setCrops(crops.map((c, k) => (k === i ? { ...c, ...patch } : mode === "association" && patch.sowMonth ? { ...c, sowMonth: patch.sowMonth } : c)));
    setSaved(false);
  };
  const save = () => {
    if (farm.rotations.length >= MAX_ROTATIONS || crops.length === 0) return;
    setFarm({ rotations: [...farm.rotations, { id: newRotationId(), name: crops.map((c) => names(c.cropId)).join(" · "), isCurrent: false, crops }] });
    setSaved(true);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Combine size={24} className="text-brand" /> {t("group.title")}
        </h1>
        <p className="text-sm text-muted">{t("group.subtitle")}</p>
      </header>

      {/* modo */}
      <div className="grid grid-cols-2 gap-2">
        {(["rotation", "association"] as GroupMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              if (m === "association" && crops[0]) setCrops(crops.map((c) => ({ ...c, sowMonth: crops[0].sowMonth })));
              setSaved(false);
            }}
            className={`flex items-start gap-2 rounded-2xl border-2 p-3 text-left ${mode === m ? "border-brand bg-brand/5" : "border-border bg-surface"}`}
          >
            {m === "rotation" ? <CycleIcon size={22} /> : <Combine size={22} />}
            <span>
              <span className="block font-semibold">{t(`group.mode.${m}`)}</span>
              <span className="block text-xs text-muted">{t(`group.mode.${m}Hint`)}</span>
            </span>
          </button>
        ))}
      </div>

      {/* ejemplos */}
      <div className="flex flex-wrap gap-2">
        <span className="self-center text-xs text-muted">{t("group.presets")}</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setMode(p.mode);
              setCrops(p.crops);
              setSaved(false);
            }}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold"
          >
            {t(`group.preset.${p.id}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        {/* armar el grupo */}
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">{t("group.pick")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(CROPS).map((id) => {
              const a = agronomy(id);
              return (
                <button key={id} type="button" onClick={() => add(id)} disabled={crops.length >= MAX_CROPS} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface p-2 text-center disabled:opacity-50">
                  <CropIcon crop={id} size={28} className="text-brand" />
                  <span className="text-xs font-semibold">{names(id)}</span>
                  {a && <span className="text-[10px] text-muted">{a.nFixKg > 0 ? t("group.fixes", { kg: a.nFixKg }) : t("group.needsN", { kg: a.nDemandKg })}</span>}
                  <Plus size={14} className="text-muted" />
                </button>
              );
            })}
          </div>

          <h2 className="mt-2 font-semibold">{mode === "rotation" ? t("group.orderRotation") : t("group.together")}</h2>
          {crops.length === 0 && <p className="text-sm text-muted">{t("group.emptyHint")}</p>}
          <ol className="flex flex-col gap-2">
            {crops.map((c, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                {mode === "rotation" && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-ink">{i + 1}</span>}
                <CropIcon crop={c.cropId} size={20} className="text-brand" />
                <span className="flex-1 text-sm font-semibold">{names(c.cropId)}</span>
                {!CROPS[c.cropId]?.perennial && (mode === "rotation" || i === 0) && (
                  <select value={c.sowMonth} onChange={(e) => update(i, { sowMonth: Number(e.target.value) })} aria-label={t("rotaciones.sowMonth")} className="rounded-lg border border-border bg-background px-2 py-1 text-xs capitalize">
                    {months.map((m, k) => (
                      <option key={k} value={k + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                )}
                {mode === "rotation" && i > 0 && (
                  <button type="button" aria-label="subir" onClick={() => setCrops(crops.map((x, k) => (k === i - 1 ? crops[i] : k === i ? crops[i - 1] : x)))} className="h-7 w-7 rounded-full border border-border">
                    <ArrowUp size={13} className="mx-auto" />
                  </button>
                )}
                <button type="button" aria-label={t("rotaciones.removeCrop")} onClick={() => setCrops(crops.filter((_, k) => k !== i))} className="h-7 w-7 rounded-full border border-border">
                  <X size={13} className="mx-auto" />
                </button>
              </li>
            ))}
          </ol>
        </section>

        {/* evaluación */}
        <section className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("group.result")}</p>
              <span className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-bold ${VERDICT_STYLE[ev.verdict]}`}>{t(`group.verdict.${ev.verdict}`)}</span>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tabular-nums">{ev.score}</div>
              <div className="text-[10px] text-muted">/ 100</div>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full" style={{ width: `${ev.score}%`, background: ev.verdict === "good" ? "var(--ok)" : ev.verdict === "fair" ? "var(--warn)" : "var(--danger)" }} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-ok">{t("group.pros")}</h3>
              <ul className="flex flex-col gap-1.5 text-sm">
                {ev.pros.length === 0 && <li className="text-muted">—</li>}
                {ev.pros.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Check size={15} className="mt-0.5 shrink-0 text-ok" /> {t(`group.point.${p.key}`, p.params)}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-semibold text-danger">{t("group.cons")}</h3>
              <ul className="flex flex-col gap-1.5 text-sm">
                {ev.cons.length === 0 && <li className="text-muted">—</li>}
                {ev.cons.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <X size={15} className="mt-0.5 shrink-0 text-danger" /> {t(`group.point.${p.key}`, p.params)}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* nutrientes */}
          <div className="rounded-2xl bg-background p-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <SoilIcon size={16} /> {t("group.nutrients")}
            </h3>
            <div className="mt-2 flex flex-col gap-1 text-xs">
              <div className="flex justify-between">
                <span>{t("group.nDemand")}</span>
                <span className="font-semibold tabular-nums">{ev.nitrogen.demandKg} kg/ha</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-danger/70" style={{ width: `${Math.min(100, ev.nitrogen.demandKg / 4)}%` }} />
              </div>
              <div className="flex justify-between">
                <span>{t("group.nFixed")}</span>
                <span className="font-semibold tabular-nums">{ev.nitrogen.fixedKg} kg/ha</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-ok" style={{ width: `${Math.min(100, ev.nitrogen.fixedKg / 4)}%` }} />
              </div>
              <p className="mt-1 text-muted">
                {ev.nitrogen.balanceKg >= 0 ? t("group.nSurplus", { kg: ev.nitrogen.balanceKg }) : t("group.nNeed", { kg: -ev.nitrogen.balanceKg })}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Chip label="P" value={t(`group.level.${ev.phosphorus}`)} />
                <Chip label="K" value={t(`group.level.${ev.potassium}`)} />
                <Chip label={t("group.labor")} value={t(`group.level.${ev.labor}`)} icon={<Hand size={12} />} />
              </div>
            </div>
          </div>

          {/* cuidados */}
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Sprout size={16} /> {t("group.cares")}
            </h3>
            <div className="mt-2 flex flex-col gap-2">
              {ev.cares.map((c, i) => (
                <div key={i} className="rounded-xl border border-border px-3 py-2">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <CropIcon crop={c.cropId} size={16} className="text-brand" /> {names(c.cropId)}
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-muted">
                    {c.keys.map((k) => (
                      <li key={k}>{t(`group.care.${k}`)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {ev.sharedPests.length > 0 && (
              <p className="mt-2 text-xs">
                <b>{t("group.sharedPests")}:</b> {ev.sharedPests.map((p) => t(`group.pest.${p}`)).join(", ")}
              </p>
            )}
          </div>

          {mode === "rotation" ? (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={save} disabled={saved || crops.length === 0 || farm.rotations.length >= MAX_ROTATIONS} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-ink disabled:opacity-50">
                {saved ? <Check size={15} /> : <Save size={15} />} {saved ? t("group.saved") : t("group.save")}
              </button>
              {saved && (
                <Link href={`/${locale}/comparar`} className="text-sm font-semibold text-brand">
                  {t("group.toCompare")}
                </Link>
              )}
              {farm.rotations.length >= MAX_ROTATIONS && <span className="text-xs text-muted">{t("group.full")}</span>}
            </div>
          ) : (
            <p className="text-xs text-muted">{t("group.associationNote")}</p>
          )}
          <p className="text-[11px] text-muted">{t("group.source")}</p>
        </section>
      </div>
    </div>
  );
}

function Chip({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5">
      {icon}
      <b>{label}</b> {value}
    </span>
  );
}
