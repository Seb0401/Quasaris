"use client";

import { useT } from "@/components/i18n-provider";

import { GOAL_ICON, TrophyIcon } from "@/components/icons/farm-icons";
import { Sprout } from "lucide-react";

export function Tutorial({ onClose }: { onClose: () => void }) {
  const t = useT();
  const steps = ["paint", "year", "play"] as const;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
      <div className="flex max-w-sm flex-col gap-3 rounded-3xl bg-white p-5 text-[#1f2a1f] shadow-xl">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Sprout size={22} className="text-[#2f6b3a]" /> {t("granja.tutorial.title")}
        </h2>
        <ol className="flex flex-col gap-2 text-sm">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2f6b3a] font-bold text-white">{i + 1}</span>
              <span>{t(`granja.tutorial.${s}`)}</span>
            </li>
          ))}
        </ol>
        <button type="button" onClick={onClose} className="rounded-full bg-[#2f6b3a] px-5 py-3 font-semibold text-white">
          {t("granja.tutorial.go")}
        </button>
      </div>
    </div>
  );
}

const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 97) % 100,
  delay: (i % 9) * 0.12,
  color: ["#f2c037", "#6dbb7a", "#4f9fd8", "#e06a4f", "#b07cc6"][i % 5],
}));

export function Celebration({ medals, onClose }: { medals: string[]; onClose: () => void }) {
  const t = useT();
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-black/35 p-4">
      <style>{`@keyframes ft-fall{0%{top:-4%;transform:rotate(0)}100%{top:104%;transform:rotate(540deg)}}`}</style>
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="pointer-events-none absolute h-3 w-2 rounded-sm"
          style={{ left: `${c.left}%`, top: "-4%", background: c.color, animation: `ft-fall 2.2s ${c.delay}s ease-in forwards` }}
        />
      ))}
      <div className="relative flex max-w-sm flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center text-[#1f2a1f] shadow-xl">
        <TrophyIcon size={56} className="text-[#7a5a10]" />
        <h2 className="text-xl font-bold">{t("granja.celebrate.title")}</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {medals.map((m) => (
            <span key={m} className="rounded-full bg-[#fff4d6] px-3 py-1 text-sm font-semibold">
              {(() => {
                const G = GOAL_ICON[m];
                return G ? <G size={15} className="mr-1 inline" /> : null;
              })()}
              {t(`granja.goal.${m}`)}
            </span>
          ))}
        </div>
        <button type="button" onClick={onClose} className="rounded-full bg-[#2f6b3a] px-5 py-3 font-semibold text-white">
          {t("granja.celebrate.ok")}
        </button>
      </div>
    </div>
  );
}

let ctx: AudioContext | null = null;

/** Sonido de moneda sintetizado (sin archivos de audio). */
export function playCoin() {
  try {
    ctx ??= new AudioContext();
    const now = ctx.currentTime;
    [988, 1319].forEach((freq, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.08, now + i * 0.08 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.18);
      o.connect(g).connect(ctx!.destination);
      o.start(now + i * 0.08);
      o.stop(now + i * 0.08 + 0.2);
    });
  } catch {
    /* sin audio */
  }
}
