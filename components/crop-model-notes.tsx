import type { Locale } from "@/lib/contract";
import { CROPS, cropName, isOrchard } from "@/lib/crop-calendar";

/** Visible wherever the new profiles affect a decision, including the printable plan. */
export function CropModelNotes({ cropIds, locale }: { cropIds: string[]; locale: Locale }) {
  const ids = [...new Set(cropIds)].filter((id) => CROPS[id]?.modelNote);
  if (!ids.length) return null;
  const es = locale === "es";
  return (
    <div>
    {ids.some(isOrchard) && <p className="mb-2 text-sm text-muted">{es ? "Frutales: estimación anual de un huerto ya en producción. No incluye instalación ni años juveniles." : "Fruit crops: annual estimate for an orchard already in production. Establishment and juvenile years are excluded."}</p>}
    <details className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-sm print:break-inside-avoid">
      <summary className="cursor-pointer font-semibold">
        {es ? "Perfiles de Majes: estimaciones por validar" : "Majes profiles: estimates to validate"}
        <span className="ml-2 font-normal">{ids.map((id) => cropName(id, locale)).join(" · ")}</span>
      </summary>
      <p className="mt-2 text-muted">{es ? "Confirma los supuestos antes de elegir un cultivo. Los calendarios y márgenes son orientativos." : "Confirm the assumptions before choosing a crop. Calendars and margins are indicative."}</p>
      {ids.map((id) => {
        const c = CROPS[id];
        const sources = Object.entries(c.sources ?? {}).filter(([, value]) => value.startsWith("https://"));
        return (
          <div key={id} className="mt-3 border-t border-border pt-3">
            <strong>{cropName(id, locale)}</strong>
            <p className="mt-1">{c.product?.[locale]}</p>
            <p className="mt-1 text-muted">{c.modelNote?.[locale]}</p>
            <p className="mt-1 text-muted">{es ? "Supuestos" : "Assumptions"}: {c.yieldTha} t/ha · {es ? "precio" : "price"} S/ {c.pricePENt}/t · {es ? "costo" : "cost"} S/ {c.costPENha}/ha.</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {sources.map(([key, url]) => <a key={key} href={url} target="_blank" rel="noreferrer" className="underline">{key === "kc" ? (es ? "Referencia de agua" : "Water reference") : key === "agronomy" ? (es ? "Manual del cultivo" : "Crop manual") : (es ? "Evidencia local del cultivo" : "Local crop evidence")}</a>)}
            </div>
          </div>
        );
      })}
    </details>
    </div>
  );
}
