"use client";

import Link from "next/link";
import { useLocale, useT } from "@/components/i18n-provider";
import type { Rotation } from "@/lib/contract";
import { CROPS, MONTH_START, cropName, cropSegments } from "@/lib/crop-calendar";
import { setFarm, useFarm } from "@/lib/farm-store";
import { CROP_EMOJI } from "@/lib/granja-sim";
import { MAX_CROPS, MAX_ROTATIONS, bareMonths, newRotationId, overlapDays } from "@/lib/rotation-utils";

const FAMILY_COLOR: Record<string, string> = { leguminosa: "var(--brand)", solanacea: "var(--soil)", aliacea: "#9b6bc4", graminea: "var(--warn)" };

export function RotacionesClient() {
  const t = useT();
  const locale = useLocale();
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
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold">✏️ {t("rotaciones.title")}</h1>
        <p className="text-sm text-muted">{t("rotaciones.subtitle")}</p>
      </header>

      {farm.rotations.map((r) => {
        const overlap = overlapDays(r);
        const bare = bareMonths(r);
        return (
          <article key={r.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2">
              <input
                value={r.name}
                onChange={(e) => update(r.id, (x) => ({ ...x, name: e.target.value.slice(0, 40) }))}
                aria-label={t("rotaciones.name")}
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-semibold"
              />
              {r.isCurrent ? (
                <span className="shrink-0 rounded-full bg-soil/15 px-2 py-1 text-xs font-semibold text-soil">★ {t("comparar.current")}</span>
              ) : (
                <button type="button" onClick={() => setCurrent(r.id)} className="shrink-0 rounded-full border border-border px-2 py-1 text-xs">
                  ★ {t("rotaciones.makeCurrent")}
                </button>
              )}
            </div>

            {/* línea de tiempo */}
            <div className="flex flex-col gap-1">
              <div className="grid grid-cols-12 text-center text-[10px] capitalize text-muted">
                {months.map((m, i) => (
                  <span key={i} className={bare.includes(i) ? "text-danger" : ""}>
                    {m}
                  </span>
                ))}
              </div>
              {r.crops.map((rc, i) => (
                <div key={i} className="relative h-4 rounded bg-background">
                  {CROPS[rc.cropId] &&
                    cropSegments(rc).map((s, j) => (
                      <div key={j} className="absolute inset-y-0 rounded" style={{ left: `${(s.start / 365) * 100}%`, width: `${((s.end - s.start) / 365) * 100}%`, background: FAMILY_COLOR[CROPS[rc.cropId].family] }} />
                    ))}
                </div>
              ))}
            </div>

            {/* cultivos */}
            <div className="flex flex-col gap-2">
              {r.crops.map((rc, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  <select
                    value={rc.cropId}
                    onChange={(e) => update(r.id, (x) => ({ ...x, crops: x.crops.map((c, k) => (k === i ? { ...c, cropId: e.target.value } : c)) }))}
                    aria-label={t("rotaciones.crop")}
                    className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
                  >
                    {Object.keys(CROPS).map((id) => (
                      <option key={id} value={id}>
                        {CROP_EMOJI[id] ?? "🌱"} {cropName(id, locale)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={rc.sowMonth}
                    disabled={Boolean(CROPS[rc.cropId]?.perennial)}
                    onChange={(e) => update(r.id, (x) => ({ ...x, crops: x.crops.map((c, k) => (k === i ? { ...c, sowMonth: Number(e.target.value) } : c)) }))}
                    aria-label={t("rotaciones.sowMonth")}
                    className="rounded-lg border border-border bg-background px-2 py-2 text-sm capitalize"
                  >
                    {months.map((m, k) => (
                      <option key={k} value={k + 1}>
                        {t("rotaciones.sow")} {m}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => update(r.id, (x) => ({ ...x, crops: x.crops.filter((_, k) => k !== i) }))}
                    aria-label={t("rotaciones.removeCrop")}
                    className="h-9 w-9 rounded-full border border-border text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {r.crops.length < MAX_CROPS && (
                <button
                  type="button"
                  onClick={() => update(r.id, (x) => ({ ...x, crops: [...x.crops, { cropId: "cebolla", sowMonth: 3 }] }))}
                  className="self-start rounded-full border border-dashed border-border px-3 py-1.5 text-sm"
                >
                  ＋ {t("rotaciones.addCrop")}
                </button>
              )}
            </div>

            {overlap > 0 && <p className="rounded-lg bg-warn/15 px-3 py-2 text-xs">⚠️ {t("rotaciones.overlap", { days: overlap })}</p>}
            {bare.length > 0 && r.crops.length > 0 && <p className="text-xs text-muted">⬜ {t("rotaciones.bare", { n: bare.length })}</p>}

            {!r.isCurrent && farm.rotations.length > 1 && (
              <button type="button" onClick={() => remove(r.id)} className="self-end text-xs text-danger">
                🗑 {t("rotaciones.delete")}
              </button>
            )}
          </article>
        );
      })}

      {farm.rotations.length < MAX_ROTATIONS && (
        <button type="button" onClick={add} className="rounded-2xl border-2 border-dashed border-border px-4 py-4 font-semibold">
          ＋ {t("rotaciones.add")}
        </button>
      )}

      <Link href={`/${locale}/comparar`} className="rounded-full bg-brand px-5 py-4 text-center text-lg font-semibold text-brand-ink">
        {t("parcela.continue")} →
      </Link>
      <p className="text-xs text-muted">{t("rotaciones.hint")}</p>
    </div>
  );
}
