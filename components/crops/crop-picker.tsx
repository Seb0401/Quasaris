"use client";

import { useId, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { Locale } from "@/lib/contract";
import { CATEGORIES, CROPS, cropName, cycleDays, type CropCategory } from "@/lib/crop-calendar";
import { CropArtwork } from "./crop-artwork";
import "./crop-picker.css";

const CATEGORY_NAMES: Record<Locale, Record<CropCategory | "all", string>> = {
  es: { all: "Todos", vegetable: "Hortalizas", grain: "Granos", legume: "Leguminosas", forage: "Forraje", fruit: "Frutales" },
  en: { all: "All crops", vegetable: "Vegetables", grain: "Grains", legume: "Legumes", forage: "Forage", fruit: "Fruit" },
};
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

type BrowserProps = {
  locale: Locale;
  selected?: Record<string, number>;
  onChoose: (cropId: string) => void;
  isOptionDisabled?: (cropId: string) => boolean;
  disabledHint?: string;
};

/** Shared visual catalog for choosing one crop or building a crop grouping. */
export function CropBrowser({ locale, selected = {}, onChoose, isOptionDisabled, disabledHint }: BrowserProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CropCategory | "all">("all");
  const es = locale === "es";
  const matches = Object.keys(CROPS).filter((id) => {
    const crop = CROPS[id];
    return (category === "all" || crop.category === category) && normalize(`${crop.name.es} ${crop.name.en} ${id.replaceAll("_", " ")}`).includes(normalize(query.trim()));
  });
  return (
    <div className="crop-browser">
      <label className="crop-search">
        <Search size={18} aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={es ? "Busca un cultivo…" : "Find a crop…"} aria-label={es ? "Buscar cultivos" : "Search crops"} autoComplete="off" />
      </label>
      <div className="crop-filters" role="group" aria-label={es ? "Filtrar por tipo de cultivo" : "Filter by crop type"}>
        {(["all", ...CATEGORIES] as const).map((id) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>{CATEGORY_NAMES[locale][id]}</button>)}
      </div>
      <div className="crop-browser-status" aria-live="polite">{matches.length} {es ? "cultivos" : "crops"}{query.trim() && <> · “{query.trim()}”</>}</div>
      {disabledHint && <p className="crop-browser-hint">{disabledHint}</p>}
      <div className="crop-choice-grid" role="group" aria-label={es ? "Elegir cultivo" : "Choose a crop"}>
        {matches.map((id) => {
          const crop = CROPS[id];
          const count = selected[id] ?? 0;
          return (
            <button key={id} type="button" className={`crop-choice ${count ? "is-selected" : ""}`} disabled={isOptionDisabled?.(id)} onClick={() => onChoose(id)} aria-label={`${cropName(id, locale)}${count ? `, ${es ? "elegido" : "selected"}${count > 1 ? ` ${count}` : ""}` : ""}`}>
              {count > 0 && <span className="crop-choice-check" aria-hidden="true">{count > 1 ? count : <Check size={13} strokeWidth={3} />}</span>}
              <span className="crop-choice-art"><CropArtwork crop={id} size={88} /></span>
              <strong>{cropName(id, locale)}</strong>
              <small>{crop.perennial ? (es ? "Permanente" : "Perennial") : `~${cycleDays(id)} ${es ? "días" : "days"}`}</small>
              <span className="crop-choice-category">{CATEGORY_NAMES[locale][crop.category]}</span>
            </button>
          );
        })}
      </div>
      {!matches.length && <p className="crop-browser-empty">{es ? "No encontramos ese cultivo. Prueba otro nombre o tipo." : "No crops found. Try another name or category."}<button type="button" onClick={() => { setQuery(""); setCategory("all"); }}>{es ? "Ver todos" : "Show all crops"}</button></p>}
    </div>
  );
}

type PickerProps = Omit<BrowserProps, "selected" | "onChoose"> & {
  value: string;
  onChange: (cropId: string) => void;
  label?: string;
};

/** Native modal supplies focus trapping, Escape and focus restoration without a custom widget. */
export function CropPicker({ value, onChange, locale, label, isOptionDisabled, disabledHint }: PickerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [session, setSession] = useState(0);
  const es = locale === "es";
  return (
    <div className="crop-select">
      <button type="button" className="crop-select-trigger" aria-label={`${label ?? (es ? "Cultivo" : "Crop")}: ${cropName(value, locale)}`} aria-haspopup="dialog" aria-controls={id} onClick={() => {
        setSession((n) => n + 1);
        dialog.current?.showModal();
        // The browser itself restores focus to this button when the dialog closes.
        requestAnimationFrame(() => dialog.current?.querySelector<HTMLInputElement>("input")?.focus());
      }}>
        <CropArtwork crop={value} size={46} />
        <span><strong>{cropName(value, locale)}</strong><small>{es ? "Elegir cultivo" : "Choose crop"}</small></span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <dialog ref={dialog} id={id} className="crop-picker-dialog" aria-labelledby={`${id}-title`} onKeyDown={(event) => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault(); }} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className="crop-picker-content">
          <header className="crop-picker-header">
            <div><span>QUASARIS / {es ? "CULTIVOS" : "CROPS"}</span><h2 id={`${id}-title`}>{es ? "¿Qué vas a cultivar?" : "What will you grow?"}</h2><p>{es ? "Reconócelo por su imagen y elige tu próximo cultivo." : "Find it by its picture and choose your next crop."}</p></div>
            <button type="button" className="crop-picker-close" aria-label={es ? "Cerrar selector de cultivos" : "Close crop picker"} onClick={() => dialog.current?.close()}><X size={20} /></button>
          </header>
          <CropBrowser key={session} locale={locale} selected={{ [value]: 1 }} isOptionDisabled={isOptionDisabled} disabledHint={disabledHint} onChoose={(cropId) => { onChange(cropId); dialog.current?.close(); }} />
        </div>
      </dialog>
    </div>
  );
}
