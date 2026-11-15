/**
 * Íconos propios de Quasaris FarmTwin.
 * Estilo: línea redondeada (trazo 1.75 en 24×24) + un acento de color de la marca.
 * El trazo usa currentColor; el acento usa --icon-accent (o el color por defecto de cada ícono).
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number; accent?: string };

function Svg({ size = 20, accent, children, style, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ ...(accent ? ({ "--icon-accent": accent } as React.CSSProperties) : null), ...style }}
      {...rest}
    >
      {children}
    </svg>
  );
}

const A = (fallback: string) => `var(--icon-accent, ${fallback})`;

// ---------------------------------------------------------------- cultivos

export function AlfalfaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21v-9" />
      <path d="M12 14c-3 0-5-2-5.5-4.5C9 9.5 11.5 11 12 14z" />
      <path d="M12 12c3 0 5-2 5.5-4.5C15 7.5 12.5 9 12 12z" />
      <circle cx="9" cy="5" r="1.6" fill={A("#8e6ac8")} stroke="none" />
      <circle cx="12" cy="3.8" r="1.6" fill={A("#8e6ac8")} stroke="none" />
      <circle cx="15" cy="5" r="1.6" fill={A("#8e6ac8")} stroke="none" />
    </Svg>
  );
}

export function PotatoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 9.5c1.6-3.6 7.6-4.6 10.4-1.6 2.6 2.8 1.6 8.6-2.6 10.2-4.4 1.6-9.2-1.2-8.8-5 .1-1.3.4-2.4 1-3.6z" fill={A("#e2c08d")} fillOpacity={0.35} />
      <circle cx="10" cy="11" r=".6" fill="currentColor" />
      <circle cx="14.5" cy="13.5" r=".6" fill="currentColor" />
      <circle cx="11" cy="15.5" r=".6" fill="currentColor" />
    </Svg>
  );
}

export function OnionIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 9c3.8 2 5.5 4.6 5.5 7a5.5 5.5 0 0 1-11 0c0-2.4 1.7-5 5.5-7z" fill={A("#c9627a")} fillOpacity={0.3} />
      <path d="M12 9V3" />
      <path d="M12 6c-1.5-1.5-3-2-4-2" />
      <path d="M12 6c1.5-1.5 3-2 4-2" />
      <path d="M12 12c-1.2 1.6-1.6 3.4-1.2 6" />
    </Svg>
  );
}

export function CornIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3c2.2 2 3 5.5 3 9s-1 6.5-3 8c-2-1.5-3-4.5-3-8s.8-7 3-9z" fill={A("#f1c232")} fillOpacity={0.4} />
      <path d="M10 8h4M9.5 11.5h5M9.6 15h4.8" />
      <path d="M9 13c-2.5 1-4 3.5-4 7 2.5-.5 5-2 6-4.5" />
      <path d="M15 13c2.5 1 4 3.5 4 7-2.5-.5-5-2-6-4.5" />
    </Svg>
  );
}

export function FavaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 17c0-6 4-11 11-12 1.5 0 3 1.2 3 2.8C19 14 13 19 7 19c-1.2 0-2-.8-2-2z" fill={A("#5f9a4a")} fillOpacity={0.3} />
      <circle cx="9.5" cy="14.5" r="1.4" />
      <circle cx="12.5" cy="11.5" r="1.4" />
      <circle cx="15.3" cy="8.6" r="1.4" />
    </Svg>
  );
}

export function BeanIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 6c3-2 8-1 9.5 2.5 1.5 3.5-.5 6-3 6.5-2 .4-2.5 1.5-3 3-.8 2.4-4.5 2.6-6 0C3.8 14.6 4.5 8.4 8 6z" fill={A("#b5523b")} fillOpacity={0.3} />
      <path d="M10 10c1.5-.8 3.5-.6 4.5.6" />
    </Svg>
  );
}

export function QuinoaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21v-8" />
      <path d="M12 16c-2 0-3.5-1-4-3" />
      <path d="M12 3c2.6 1.8 3.6 4.4 3.2 7.2-.3 2-1.6 3-3.2 3s-2.9-1-3.2-3C8.4 7.4 9.4 4.8 12 3z" fill={A("#b5334f")} fillOpacity={0.35} />
      <circle cx="11" cy="7" r=".7" fill="currentColor" />
      <circle cx="13" cy="9" r=".7" fill="currentColor" />
      <circle cx="11.6" cy="10.6" r=".7" fill="currentColor" />
    </Svg>
  );
}

export function GarlicIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 8c4.2 1.8 6 4.4 6 7a6 6 0 0 1-12 0c0-2.6 1.8-5.2 6-7z" fill={A("#e9dcc4")} fillOpacity={0.45} />
      <path d="M12 8V3" />
      <path d="M12 10c-1.6 1.6-2.2 4-1.8 7.5" />
      <path d="M12 10c1.6 1.6 2.2 4 1.8 7.5" />
    </Svg>
  );
}

export function CarrotIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8.5 9.5l6 6c-3.5 3.5-8 5.5-10 5.5 0-2 2-6.5 4-11.5z" fill={A("#e8792b")} fillOpacity={0.4} />
      <path d="M14.5 9.5c.5-2 2-4.5 4-5.5" />
      <path d="M14.5 9.5c2-.5 4.5-.3 6 .5" />
      <path d="M14.5 9.5c-.2-2 .3-4.5 1.3-6" />
      <path d="M7.2 14l1.6 1.2M5.9 17.2l1.4 1" />
    </Svg>
  );
}

export function PeaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 15c3-6 9-9 16-9-1 6-7 12-14 12-1.2 0-2-1.2-2-3z" fill={A("#6fae4a")} fillOpacity={0.3} />
      <circle cx="9" cy="14" r="1.6" />
      <circle cx="12.5" cy="11.5" r="1.6" />
      <circle cx="16" cy="9" r="1.6" />
    </Svg>
  );
}

export function WheatIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21V8" />
      <path d="M12 8c-1.6-.8-2.2-2.4-2-4 1.6.6 2.2 2.2 2 4zM12 8c1.6-.8 2.2-2.4 2-4-1.6.6-2.2 2.2-2 4z" fill={A("#d9b65a")} fillOpacity={0.5} />
      <path d="M12 12.5c-1.8-.6-2.8-2-2.8-3.8 1.8.4 2.8 1.8 2.8 3.8zM12 12.5c1.8-.6 2.8-2 2.8-3.8-1.8.4-2.8 1.8-2.8 3.8z" fill={A("#d9b65a")} fillOpacity={0.5} />
      <path d="M12 17c-1.8-.6-2.8-2-2.8-3.8 1.8.4 2.8 1.8 2.8 3.8zM12 17c1.8-.6 2.8-2 2.8-3.8-1.8.4-2.8 1.8-2.8 3.8z" fill={A("#d9b65a")} fillOpacity={0.5} />
    </Svg>
  );
}

export function BarleyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21v-9" />
      <path d="M12 12c-1.2-1-1.6-2.6-1.2-4.2 1.2.8 1.6 2.4 1.2 4.2zM12 12c1.2-1 1.6-2.6 1.2-4.2-1.2.8-1.6 2.4-1.2 4.2zM12 8.2c-.9-1-1.1-2.5-.6-3.8.9.8 1.1 2.4.6 3.8zM12 8.2c.9-1 1.1-2.5.6-3.8-.9.8-1.1 2.4-.6 3.8z" fill={A("#c9a84a")} fillOpacity={0.5} />
      <path d="M10.8 7.8L8 3M13.2 7.8L16 3M10.8 11.5L7 6.5M13.2 11.5L17 6.5" strokeWidth={1} />
    </Svg>
  );
}

export function OatIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21V4" />
      <path d="M12 7c-2 0-3.5 1-4 3M12 7c2 0 3.5 1 4 3M12 12c-2 0-3.5 1-4 3M12 12c2 0 3.5 1 4 3" />
      <ellipse cx="7.6" cy="11" rx="1.2" ry="1.8" fill={A("#a3c96b")} fillOpacity={0.6} />
      <ellipse cx="16.4" cy="11" rx="1.2" ry="1.8" fill={A("#a3c96b")} fillOpacity={0.6} />
      <ellipse cx="7.6" cy="16" rx="1.2" ry="1.8" fill={A("#a3c96b")} fillOpacity={0.6} />
      <ellipse cx="16.4" cy="16" rx="1.2" ry="1.8" fill={A("#a3c96b")} fillOpacity={0.6} />
    </Svg>
  );
}

export function SquashIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 8c4.5 0 8 2.6 8 6s-3.5 6-8 6-8-2.6-8-6 3.5-6 8-6z" fill={A("#e89a2c")} fillOpacity={0.35} />
      <path d="M12 8c-1.6 1.6-2.2 3.8-2.2 6s.6 4.4 2.2 6M12 8c1.6 1.6 2.2 3.8 2.2 6s-.6 4.4-2.2 6" />
      <path d="M12 8c0-2 .8-3.4 2.4-4.4" />
    </Svg>
  );
}

export function TomatoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 8c4.4 0 7 2.8 7 6.2S16 20 12 20s-7-2.4-7-5.8S7.6 8 12 8z" fill={A("#d8382f")} fillOpacity={0.35} />
      <path d="M12 8V4.5" />
      <path d="M12 8.2l-3-1.6M12 8.2l3-1.6M12 8.2l-1.6 2.2M12 8.2l1.6 2.2" />
    </Svg>
  );
}

export function PaprikaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 8c2.5-.6 5 0 5.6 2.6.8 3.6-1 8-5.2 10.4-.6-3-1.6-5-2.2-7.2C6.5 11 6.8 8.5 9 8z" fill={A("#a8231b")} fillOpacity={0.4} />
      <path d="M11 8c0-2 .8-3.4 2.4-4.4" />
      <path d="M8.6 8.4c.8-.9 2.4-1 3.8-.4" />
    </Svg>
  );
}

export function FallowIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 17c3-2 6-2 9 0s6 2 9 0" />
      <path d="M3 12.5c3-2 6-2 9 0s6 2 9 0" stroke={A("#a97c55")} />
      <path d="M3 8c3-2 6-2 9 0s6 2 9 0" />
    </Svg>
  );
}

export function ArtichokeIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 21v-5M6 9l6-6 6 6-2 6H8z" fill={A("#719d7d")} fillOpacity={0.5} /><path d="m6 9 6 4 6-4M8 5l4 8 4-8M8 18l4 2 4-2" /></Svg>;
}

export function AvocadoIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 3c-3 0-3 5-5 7-5 6-2 11 5 11s10-5 5-11c-2-2-2-7-5-7Z" fill={A("#78b64b")} fillOpacity={0.4} /><circle cx="12" cy="15" r="3" fill="#a7794b" /></Svg>;
}

export function GrapeIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 6V2m0 3c2-3 5-3 7-2-1 3-4 4-7 2" /><g fill={A("#a174c4")} fillOpacity={0.6}><circle cx="8" cy="9" r="3" /><circle cx="15" cy="9" r="3" /><circle cx="8" cy="15" r="3" /><circle cx="15" cy="15" r="3" /><circle cx="11.5" cy="20" r="2.5" /></g></Svg>;
}

export function MandarinIcon(p: IconProps) {
  return <Svg {...p}><path d="M12 7V3m0 2c2-3 5-3 7-2-1 3-4 4-7 2" /><ellipse cx="12" cy="14" rx="8" ry="7" fill={A("#ef9a28")} fillOpacity={0.55} /><path d="M8 11c-2 1-2 4-1 6" /></Svg>;
}

export function PomegranateIcon(p: IconProps) {
  return <Svg {...p}><path d="m9 7-1-4 4 2 4-2-1 4" /><circle cx="12" cy="14" r="8" fill={A("#c64c62")} fillOpacity={0.45} /><path d="M12 9v10M7 12h2m-2 4h2m6-4h2m-2 4h2" /></Svg>;
}

export const CROP_ICON: Record<string, (p: IconProps) => React.JSX.Element> = {
  alcachofa: ArtichokeIcon,
  palta: AvocadoIcon,
  uva: GrapeIcon,
  mandarina: MandarinIcon,
  granada: PomegranateIcon,
  alfalfa: AlfalfaIcon,
  papa: PotatoIcon,
  cebolla: OnionIcon,
  maiz_chala: CornIcon,
  haba: FavaIcon,
  frijol: BeanIcon,
  quinua: QuinoaIcon,
  ajo: GarlicIcon,
  zanahoria: CarrotIcon,
  arveja: PeaIcon,
  trigo: WheatIcon,
  cebada: BarleyIcon,
  avena: OatIcon,
  zapallo: SquashIcon,
  tomate: TomatoIcon,
  paprika: PaprikaIcon,
};

export function CropIcon({ crop, ...p }: IconProps & { crop: string | null }) {
  const C = (crop && CROP_ICON[crop]) || FallowIcon;
  return <C {...p} />;
}

// ---------------------------------------------------------------- factores y clima

export function WaterIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3c3.5 4.2 6 7.6 6 10.8A6 6 0 0 1 6 13.8C6 10.6 8.5 7.2 12 3z" fill={A("#3d8fd6")} fillOpacity={0.3} />
      <path d="M9.2 14.2a2.8 2.8 0 0 0 2.8 2.8" />
    </Svg>
  );
}

export function ThermoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0z" />
      <circle cx="12" cy="17" r="1.8" fill={A("#e06a4f")} stroke="none" />
      <path d="M12 15V9" stroke={A("#e06a4f")} />
    </Svg>
  );
}

export function SoilIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 10h18" />
      <path d="M3 10v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8" fill={A("#a97c55")} fillOpacity={0.25} />
      <path d="M12 10V6m0 0c-1.2-1.6-3-2-4.5-1.5M12 6c1.2-1.6 3-2 4.5-1.5" />
      <path d="M7 14h.01M12 16h.01M16.5 13.5h.01" strokeWidth={2.4} />
    </Svg>
  );
}

export function ProfitIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <ellipse cx="12" cy="7" rx="7" ry="3" fill={A("#f2c037")} fillOpacity={0.35} />
      <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
      <path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    </Svg>
  );
}

export function FrostIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
      <path d="M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" stroke={A("#4f9fd8")} />
    </Svg>
  );
}

export function HeatIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" fill={A("#f0a43c")} fillOpacity={0.45} />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </Svg>
  );
}

export function RainIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 14a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 7a3.5 3.5 0 0 1 .5 7z" />
      <path d="M8.5 17.5 7.5 20M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5" stroke={A("#3d8fd6")} />
    </Svg>
  );
}

export function DroughtIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 19h18" />
      <path d="M5 19l2-4 3 2 2-5 3 3 2-3 2 7" stroke={A("#c98a3a")} />
      <circle cx="17" cy="6" r="2.5" />
    </Svg>
  );
}

export function EvapoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 20v-6" />
      <path d="M12 16c-2.5 0-4-1.5-4.5-3.5 2 0 4 .8 4.5 3.5zM12 16c2.5 0 4-1.5 4.5-3.5-2 0-4 .8-4.5 3.5z" fill={A("#5fa84a")} fillOpacity={0.3} />
      <path d="M8 8c0-1.2 1-1.2 1-2.4S8 4.4 8 3.2M12 9c0-1.2 1-1.2 1-2.4S12 5.4 12 4.2M16 8c0-1.2 1-1.2 1-2.4S16 4.4 16 3.2" stroke={A("#3d8fd6")} />
    </Svg>
  );
}

export function ReservoirIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M4 12c2 1 4 1 6 0s4-1 6 0 3 .8 4 .5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill={A("#3d8fd6")} fillOpacity={0.35} stroke="none" />
      <path d="M4 12c2 1 4 1 6 0s4-1 6 0 3 .8 4 .5" />
    </Svg>
  );
}

export function SatelliteIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)" />
      <path d="M8.5 8.5 5 5M15.5 15.5 19 19" />
      <path d="M3 7l4-4M17 21l4-4" stroke={A("#4f9fd8")} />
      <path d="M14 20a6 6 0 0 0 6-6" />
    </Svg>
  );
}

export function CalendarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M8 14h3v3H8z" fill={A("#5fa84a")} fillOpacity={0.5} />
    </Svg>
  );
}

// ---------------------------------------------------------------- etapas del cultivo

export function SproutIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 20v-7" />
      <path d="M12 13c-3.5 0-5.5-2-6-5 3.5 0 5.5 2 6 5zM12 13c3.5 0 5.5-2 6-5-3.5 0-5.5 2-6 5z" fill={A("#8fd36a")} fillOpacity={0.4} />
      <path d="M8 20h8" />
    </Svg>
  );
}

export function GrowingIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21V5" />
      <path d="M12 9c-3 0-5-1.6-5.5-4 3 0 5 1.6 5.5 4zM12 13c3 0 5-1.6 5.5-4-3 0-5 1.6-5.5 4zM12 17c-3 0-5-1.6-5.5-4 3 0 5 1.6 5.5 4z" fill={A("#5fa84a")} fillOpacity={0.35} />
    </Svg>
  );
}

export function FlowerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21v-8" />
      <circle cx="12" cy="4.6" r="2.1" />
      <circle cx="15.4" cy="8" r="2.1" />
      <circle cx="12" cy="11.4" r="2.1" />
      <circle cx="8.6" cy="8" r="2.1" />
      <circle cx="12" cy="8" r="1.6" fill={A("#f2c037")} stroke="none" />
      <path d="M12 17c-2.5 0-4-1.2-4.5-3 2.5 0 4 1.2 4.5 3z" />
    </Svg>
  );
}

export function HarvestIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 11h16l-1.6 8.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8z" fill={A("#c99e6e")} fillOpacity={0.35} />
      <path d="M8 11a4 4 0 0 1 8 0" />
      <path d="M8 15h8M9 18h6" />
    </Svg>
  );
}

export const STAGE_ICON = { sprout: SproutIcon, grow: GrowingIcon, flower: FlowerIcon, harvest: HarvestIcon };

// ---------------------------------------------------------------- metas

export function TargetIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.2" fill={A("#e06a4f")} stroke="none" />
    </Svg>
  );
}

export function ShieldIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6z" fill={A("#5fa84a")} fillOpacity={0.25} />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  );
}

export function CycleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 12a8 8 0 0 1-13.7 5.6M4 12a8 8 0 0 1 13.7-5.6" />
      <path d="M17.7 3v3.6h-3.6M6.3 21v-3.6h3.6" stroke={A("#5fa84a")} />
    </Svg>
  );
}

export function MedalIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 3h8l-2 6h-4z" />
      <circle cx="12" cy="15" r="5.5" fill={A("#f2c037")} fillOpacity={0.4} />
      <path d="m12 12.5.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z" />
    </Svg>
  );
}

export function TrophyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" fill={A("#f2c037")} fillOpacity={0.4} />
      <path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.7M17 6h2.5a2.5 2.5 0 0 1-2.6 3.7M12 14v3M8.5 20h7M9.5 17h5" />
    </Svg>
  );
}

export const GOAL_ICON: Record<string, (p: IconProps) => React.JSX.Element> = {
  waterFits: WaterIcon,
  save20: MedalIcon,
  healthySoil: SoilIcon,
  coveredSoil: ShieldIcon,
  beatIncome: ProfitIcon,
  diversity: CycleIcon,
};

// ---------------------------------------------------------------- herramientas de la granja

export function BrushIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.5 4.5 19.5 9.5 11 18l-5-5z" />
      <path d="M6 13c-2 0-3 1.5-3 3.5S2.5 20 2.5 20c3 0 5.5-1 5.5-3.5" fill={A("#5fa84a")} fillOpacity={0.45} />
    </Svg>
  );
}

export function LayersIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m12 3 9 5-9 5-9-5z" fill={A("#4f9fd8")} fillOpacity={0.25} />
      <path d="m3 12.5 9 5 9-5M3 16.5l9 5 9-5" />
    </Svg>
  );
}

export function LabIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" />
      <path d="M7.2 15h9.6l1.7 3.2a.9.9 0 0 1-.8 1.3H6.3a.9.9 0 0 1-.8-1.3z" fill={A("#8e6ac8")} fillOpacity={0.4} stroke="none" />
    </Svg>
  );
}
