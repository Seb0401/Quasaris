"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Orbit, Satellite } from "lucide-react";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ------------------------------------------------------------------ números */

/** Número que cuenta desde su valor anterior (o desde 0 al montarse) hasta el nuevo. */
export function CountUp({ value, format = (v) => Math.round(v).toString(), duration = 950 }: { value: number; format?: (v: number) => string; duration?: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    const instant = prefersReducedMotion();
    let frame = 0;
    const tick = (now: number) => {
      const t = instant ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = origin + (value - origin) * eased;
      setShown(next);
      from.current = next;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className="tabular-nums">{format(shown)}</span>;
}

/* ------------------------------------------------------------------ contenedores */

/** Encabezado de sección con foto, rejilla y barrido de escaneo. */
export function PageHeader({ icon: Icon, kicker, title, subtitle, children }: { icon: LucideIcon; kicker: string; title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="ui-hero">
      <div className="ui-hero-photo" aria-hidden />
      <div className="ui-hero-grid" aria-hidden />
      <div className="ui-hero-scan" aria-hidden />
      <div className="ui-hero-copy">
        <span className="ui-kicker"><Icon size={14} /> QUASARIS / {kicker}</span>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="ui-hero-aside">{children}</div>}
    </header>
  );
}

/** Dato destacado dentro del encabezado. */
export function HeroStat({ icon: Icon, label, children, tone = "cyan" }: { icon: LucideIcon; label: string; children: React.ReactNode; tone?: string }) {
  return (
    <div className={`ui-hero-stat tone-${tone}`}>
      <span className="ui-hero-stat-icon"><Icon size={16} /></span>
      <span><small>{label}</small><strong>{children}</strong></span>
    </div>
  );
}

/** Tarjeta de vidrio con un foco de luz que sigue al puntero. */
export function Panel({ kicker, title, icon: Icon, actions, children, className = "", id }: { kicker?: string; title?: React.ReactNode; icon?: LucideIcon; actions?: React.ReactNode; children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  const onMove = (event: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${event.clientX - box.left}px`);
    el.style.setProperty("--my", `${event.clientY - box.top}px`);
  };
  return (
    <section ref={ref} id={id} className={`ui-panel ${className}`} onPointerMove={onMove}>
      {(kicker || title || actions) && (
        <header className="ui-panel-head">
          <div className="min-w-0">
            {kicker && <span className="ui-panel-kicker">{Icon && <Icon size={13} />}{kicker}</span>}
            {title && <h2>{title}</h2>}
          </div>
          {actions && <div className="ui-panel-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ controles */

export function Segmented<T extends string>({ value, options, onChange, label, size = "md" }: { value: T; options: { value: T; label: React.ReactNode; icon?: LucideIcon }[]; onChange: (v: T) => void; label?: string; size?: "sm" | "md" }) {
  return (
    <div className={`ui-seg ${size === "sm" ? "sm" : ""}`} role="radiogroup" aria-label={label}>
      {options.map(({ value: v, label: text, icon: Icon }) => (
        <button key={v} type="button" role="radio" aria-checked={v === value} className={v === value ? "active" : ""} onClick={() => onChange(v)}>
          {Icon && <Icon size={14} />}{text}
        </button>
      ))}
    </div>
  );
}

/** Slider con la parte recorrida rellena de color. */
export function RangeInput({ value, min, max, step, onChange, label, color = "var(--brand)" }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; label: string; color?: string }) {
  const fill = ((value - min) / Math.max(max - min, 1e-9)) * 100;
  return (
    <input
      className="ui-range"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{ "--fill": `${fill}%`, "--range-color": color } as React.CSSProperties}
    />
  );
}

/* ------------------------------------------------------------------ visualización */

/** Anillo de puntaje 0..100 que se dibuja al aparecer. */
export function ScoreRing({ value, size = 112, stroke = 9, color = "var(--brand)", label }: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="ui-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: "var(--tint-3)" }} strokeWidth={stroke} />
        <circle
          className="ui-ring-arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ "--c": c } as React.CSSProperties}
        />
      </svg>
      <span className="ui-ring-value">
        <strong style={{ fontSize: size * 0.3 }}><CountUp value={value} /></strong>
        {label && <small>{label}</small>}
      </span>
    </div>
  );
}

/** Barra horizontal 0..1 que crece al aparecer. */
export function Meter({ value, color = "var(--brand)", height = 8, marker }: { value: number; color?: string; height?: number; marker?: number }) {
  return (
    <div className="ui-meter" style={{ height }}>
      <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color.includes("gradient") ? color : `linear-gradient(90deg, color-mix(in srgb, ${color} 70%, transparent), ${color})` }} />
      {marker !== undefined && <b style={{ left: `${Math.max(0, Math.min(1, marker)) * 100}%` }} />}
    </div>
  );
}

export function Badge({ tone = "neutral", icon: Icon, children }: { tone?: "neutral" | "ok" | "warn" | "danger" | "brand" | "sky"; icon?: LucideIcon; children: React.ReactNode }) {
  return <span className={`ui-badge tone-${tone}`}>{Icon && <Icon size={12} />}{children}</span>;
}

/* ------------------------------------------------------------------ estados */

export function LoadingOrbit({ label }: { label: string }) {
  return (
    <div className="ui-loading" role="status">
      <div className="ui-loading-orbit" aria-hidden>
        <Orbit size={64} strokeWidth={1} />
        <span><Satellite size={16} /></span>
      </div>
      <p>{label}</p>
      <div className="ui-loading-bars" aria-hidden><i /><i /><i /></div>
    </div>
  );
}
