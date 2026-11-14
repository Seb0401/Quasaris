"use client";

import { useLocale, useT } from "@/components/i18n-provider";
import { setFarm, useFarm } from "@/lib/farm-store";
import type { Rotation, RotationCrop } from "@/lib/contract";
import cropsData from "@/data/crops.json";
import rotationsMajes from "@/data/rotations_majes.json";

type CropInfo = { name: { es: string; en: string } };
const CROPS = cropsData.crops as Record<string, CropInfo>;
const CROP_IDS = Object.keys(CROPS);
const MAX_ROTATIONS = 5;
const MAX_CROPS = 4;

function autoName(crops: RotationCrop[], locale: "es" | "en") {
  return crops.map((c) => CROPS[c.cropId]?.name[locale] ?? c.cropId).join(" · ");
}

/** Editor de rotaciones: cambiar cultivos y meses de siembra, agregar o quitar alternativas. */
export function RotationEditor({ onClose }: { onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const farm = useFarm();
  const months = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2025, i, 1)));

  const update = (id: string, fn: (r: Rotation) => Rotation) =>
    setFarm({ rotations: farm.rotations.map((r) => (r.id === id ? fn(r) : r)) });

  // Si el nombre era el automático, se actualiza con los cultivos; si el agricultor lo escribió, se respeta.
  const setCrops = (rot: Rotation, crops: RotationCrop[]) =>
    update(rot.id, (r) => ({ ...r, crops, name: r.name === autoName(r.crops, locale) ? autoName(crops, locale) : r.name }));

  const addRotation = () => {
    const crops: RotationCrop[] = [{ cropId: "cebolla", sowMonth: 3 }, { cropId: "haba", sowMonth: 9 }];
    setFarm({ rotations: [...farm.rotations, { id: `custom_${Date.now().toString(36)}`, name: autoName(crops, locale), isCurrent: false, crops }] });
  };

  return (
    <section className="rounded-2xl border border-brand bg-surface p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">✏️ {t("editor.title")}</h2>
        <button type="button" onClick={onClose} className="rounded-full bg-brand text-brand-ink px-4 py-1.5 text-sm font-semibold">
          {t("editor.done")}
        </button>
      </div>

      {farm.rotations.map((rot) => (
        <div key={rot.id} className="rounded-xl bg-background p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {rot.isCurrent && <span className="shrink-0 rounded-full bg-soil/15 text-soil text-xs font-semibold px-2 py-0.5">{t("comparar.current")}</span>}
            <input
              aria-label={t("editor.name")}
              value={rot.name}
              onChange={(e) => update(rot.id, (r) => ({ ...r, name: e.target.value }))}
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-medium"
            />
            {!rot.isCurrent && (
              <button
                type="button"
                aria-label={t("editor.remove")}
                onClick={() => setFarm({ rotations: farm.rotations.filter((r) => r.id !== rot.id) })}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-danger"
              >
                🗑️
              </button>
            )}
          </div>

          <ol className="flex flex-col gap-2">
            {rot.crops.map((c, i) => (
              <li key={i} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
                <span className="text-xs text-muted w-4 text-right">{i + 1}.</span>
                <select
                  aria-label={t("editor.crop")}
                  value={c.cropId}
                  onChange={(e) => setCrops(rot, rot.crops.map((x, j) => (j === i ? { ...x, cropId: e.target.value } : x)))}
                  className="rounded-lg border border-border bg-surface px-2 py-2 text-sm"
                >
                  {CROP_IDS.map((id) => (
                    <option key={id} value={id}>
                      {CROPS[id].name[locale]}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("editor.sowMonth")}
                  value={c.sowMonth}
                  onChange={(e) => setCrops(rot, rot.crops.map((x, j) => (j === i ? { ...x, sowMonth: Number(e.target.value) } : x)))}
                  className="rounded-lg border border-border bg-surface px-2 py-2 text-sm capitalize"
                >
                  {months.map((m, k) => (
                    <option key={k} value={k + 1}>
                      🌱 {m}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={t("editor.removeCrop")}
                  disabled={rot.crops.length <= 1}
                  onClick={() => setCrops(rot, rot.crops.filter((_, j) => j !== i))}
                  className="rounded-lg px-2 py-2 text-muted disabled:opacity-30"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>

          {rot.crops.length < MAX_CROPS && (
            <button
              type="button"
              onClick={() => setCrops(rot, [...rot.crops, { cropId: "haba", sowMonth: ((rot.crops.at(-1)?.sowMonth ?? 1) + 3) % 12 || 12 }])}
              className="self-start text-sm font-medium text-brand"
            >
              + {t("editor.addCrop")}
            </button>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {farm.rotations.length < MAX_ROTATIONS && (
          <button type="button" onClick={addRotation} className="rounded-full border border-brand text-brand px-4 py-2 text-sm font-semibold">
            + {t("editor.addRotation")}
          </button>
        )}
        <button
          type="button"
          onClick={() => setFarm({ rotations: rotationsMajes.rotations as Rotation[] })}
          className="rounded-full border border-border px-4 py-2 text-sm text-muted"
        >
          ↺ {t("editor.reset")}
        </button>
      </div>
      <p className="text-xs text-muted">{t("editor.note")}</p>
    </section>
  );
}
