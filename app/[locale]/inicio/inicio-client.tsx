"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Scale } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { RecommendationCard } from "@/components/cards/recommendation-card";
import { ProfitIcon, SoilIcon, WaterIcon } from "@/components/icons/farm-icons";
import { RotationIcons } from "@/components/icons/rotation-icons";
import { QuasarisMark } from "@/components/brand/quasaris-mark";
import type { Irrigation, Priorities, SoilTexture } from "@/lib/contract";
import { efficiency } from "@/lib/crop-calendar";
import { MAJES, setFarm, useFarm } from "@/lib/farm-store";
import { recommend } from "@/lib/recommendation";
import { useSimulation } from "@/lib/use-simulation";

const ParcelMap = dynamic(() => import("@/components/map/parcel-map"), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-2xl bg-border" />,
});

const TYPICAL_WATER = 15000; // estimado para Majes (a validar con AUTODEMA)
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
  const farm = useFarm();
  const [step, setStep] = useState(0);
  const data = useSimulation();
  const n = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const profile = PROFILES.find((pr) => JSON.stringify(pr.p) === JSON.stringify(farm.priorities))?.id;
  const rec = data && step === 3 ? recommend(data, farm.rotations, farm) : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header className="flex items-center gap-3">
        <QuasarisMark width={44} height={44} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("wizard.kicker")}</p>
          <h1 className="text-2xl font-bold leading-tight">{t(`wizard.${STEPS[step]}.title`)}</h1>
        </div>
      </header>

      {/* progreso */}
      <ol className="grid grid-cols-4 gap-2" aria-label={t("wizard.kicker")}>
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => setStep(i)} className="flex w-full flex-col gap-1 text-left" aria-current={i === step ? "step" : undefined}>
              <span className={`h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-border"}`} />
              <span className={`flex items-center gap-1 text-[11px] ${i === step ? "font-semibold" : "text-muted"}`}>
                {i < step && <Check size={12} className="text-brand" />}
                {t(`wizard.${s}.short`)}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted">{t(`wizard.${STEPS[step]}.hint`)}</p>

      {step === 0 && (
        <section className="flex flex-col gap-3">
          <ParcelMap lat={farm.lat} lon={farm.lon} onPick={(lat, lon) => setFarm({ lat, lon })} className="h-80" />
          <button type="button" onClick={() => setFarm(MAJES)} className="self-start rounded-full border border-border px-3 py-1.5 text-xs font-semibold">
            {t("wizard.field.useMajes")}
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <WaterIcon /> {t("wizard.resources.water")}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              value={farm.waterAvailableM3ha}
              onChange={(e) => setFarm({ waterAvailableM3ha: Number(e.target.value) || 0 })}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-lg"
            />
            <button type="button" onClick={() => setFarm({ waterAvailableM3ha: TYPICAL_WATER })} className="self-start text-xs font-semibold text-brand">
              {t("wizard.resources.dontKnow", { m3: n.format(TYPICAL_WATER) })}
            </button>
          </div>

          <Choice
            title={t("wizard.resources.irrigation")}
            value={farm.irrigation}
            options={["gravedad", "aspersion", "goteo"] as Irrigation[]}
            label={(v) => t(`irrigation.${v}`)}
            sub={(v) => t("wizard.resources.eff", { eff: pct.format(efficiency(v, farm.soilTexture)) })}
            onChange={(irrigation) => setFarm({ irrigation })}
          />
          <Choice
            title={t("wizard.resources.soil")}
            value={farm.soilTexture}
            options={["arenoso", "franco", "arcilloso"] as SoilTexture[]}
            label={(v) => t(`soil.${v}`)}
            sub={(v) => t(`wizard.resources.soilHint.${v}`)}
            onChange={(soilTexture) => setFarm({ soilTexture })}
          />

          <div className="flex flex-col gap-2">
            <span className="font-semibold">{t("wizard.resources.current")}</span>
            <div className="grid gap-2">
              {farm.rotations.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setFarm({ rotations: farm.rotations.map((x) => ({ ...x, isCurrent: x.id === r.id })) })}
                  className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm ${r.isCurrent ? "border-brand bg-brand/5 font-semibold" : "border-border bg-surface"}`}
                >
                  <RotationIcons rotation={r} size={18} className="text-brand" />
                  <span className="flex-1">{r.name}</span>
                  {r.isCurrent && <Check size={16} className="text-brand" />}
                </button>
              ))}
            </div>
            <Link href={`/${locale}/rotaciones`} className="self-start text-xs font-semibold text-brand">
              {t("wizard.resources.other")}
            </Link>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="grid gap-3 sm:grid-cols-2">
          {PROFILES.map((pr) => (
            <button
              key={pr.id}
              type="button"
              onClick={() => setFarm({ priorities: pr.p })}
              className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left ${profile === pr.id ? "border-brand bg-brand/5" : "border-border bg-surface"}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-brand">
                <pr.Icon size={22} />
              </span>
              <span>
                <span className="block font-semibold">{t(`wizard.priorities.${pr.id}.title`)}</span>
                <span className="block text-sm text-muted">{t(`wizard.priorities.${pr.id}.text`)}</span>
              </span>
            </button>
          ))}
          <p className="text-xs text-muted sm:col-span-2">{t("wizard.priorities.fine")}</p>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-3">
          {rec ? (
            <RecommendationCard rec={rec} waterAvailable={farm.waterAvailableM3ha} />
          ) : (
            <p className="flex items-center justify-center gap-2 py-10 text-muted">
              <LoaderCircle size={18} className="animate-spin" /> {t("comparar.loading")}
            </p>
          )}
          <Link href={`/${locale}/comparar`} className="self-start text-sm font-semibold text-brand">
            {t("wizard.result.compare")}
          </Link>
        </section>
      )}

      <div className="flex items-center justify-between gap-3 pb-4">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-3 text-sm font-semibold disabled:opacity-40"
        >
          <ArrowLeft size={16} /> {t("wizard.back")}
        </button>
        {step < 3 && (
          <button type="button" onClick={() => setStep((s) => Math.min(3, s + 1))} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-ink">
            {step === 2 ? t("wizard.see") : t("wizard.next")} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function Choice<T extends string>({ title, value, options, label, sub, onChange }: { title: string; value: T; options: T[]; label: (v: T) => string; sub: (v: T) => string; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-semibold">{title}</span>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`flex flex-col items-start gap-0.5 rounded-xl border-2 px-3 py-2.5 text-left ${o === value ? "border-brand bg-brand/5" : "border-border bg-surface"}`}
          >
            <span className="text-sm font-semibold">{label(o)}</span>
            <span className="text-[11px] leading-tight text-muted">{sub(o)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
