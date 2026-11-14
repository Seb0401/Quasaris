"use client";

import { useT } from "@/components/i18n-provider";
import { GIBS_LAYERS, MAP_LAYERS, type GibsLayerKey } from "@/lib/gibs";

const ICON: Record<GibsLayerKey, string> = {
  ndviMonthly: "🌿",
  ndvi16Day: "🌿",
  smapRootZone: "💧",
  trueColor: "🛰️",
};

/** Botones para elegir la capa NASA del mapa. */
export function LayerSwitcher({ value, onChange }: { value: GibsLayerKey | null; onChange: (k: GibsLayerKey | null) => void }) {
  const t = useT();
  const options: (GibsLayerKey | null)[] = [...MAP_LAYERS, null];
  return (
    <div role="radiogroup" aria-label={t("map.layers")} className="flex flex-wrap gap-2">
      {options.map((k) => {
        const active = k === value;
        return (
          <button
            key={k ?? "none"}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(k)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${active ? "border-brand bg-brand text-brand-ink" : "border-border bg-surface"}`}
          >
            {k ? `${ICON[k]} ${t(`map.layer.${k}`)}` : `🗺️ ${t("map.layer.none")}`}
          </button>
        );
      })}
    </div>
  );
}

/** Leyenda oficial de GIBS y una frase simple de cómo leer la capa. */
export function MapLegend({ layer, time }: { layer: GibsLayerKey | null; time: string }) {
  const t = useT();
  if (!layer) return null;
  const info = GIBS_LAYERS[layer];
  return (
    <div className="rounded-xl border border-border bg-surface p-3 flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">
          {ICON[layer]} {t(`map.layer.${layer}`)}
        </span>
        <span className="text-xs text-muted tabular-nums">
          {t("map.date")}: {info.step === "month" ? time.slice(0, 7) : time}
        </span>
      </div>
      <p className="text-muted leading-snug">{t(`map.read.${layer}`)}</p>
      {"legend" in info && info.legend && (
        // Leyenda SVG oficial de NASA GIBS (fondo blanco para que se lea también en modo oscuro)
        // eslint-disable-next-line @next/next/no-img-element
        <img src={info.legend} alt={t("map.legendAlt", { layer: t(`map.layer.${layer}`) })} className="w-full max-w-sm rounded bg-white p-1" loading="lazy" />
      )}
    </div>
  );
}
