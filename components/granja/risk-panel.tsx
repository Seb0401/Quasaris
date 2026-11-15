"use client";

import { Bug, CloudRain, Mountain, ShieldAlert, Waves } from "lucide-react";
import { DroughtIcon, FrostIcon, HeatIcon, ReservoirIcon, WaterIcon } from "@/components/icons/farm-icons";
import type { AlertKind } from "@/lib/granja-events";

const ICON: Record<AlertKind, (p: { size?: number; className?: string }) => React.JSX.Element> = {
  frost: FrostIcon,
  heat: HeatIcon,
  drought: DroughtIcon,
  heavyRain: (p) => <CloudRain size={p.size} className={p.className} />,
  pests: (p) => <Bug size={p.size} className={p.className} />,
  dry: ReservoirIcon,
  climate: (p) => <ShieldAlert size={p.size} className={p.className} />,
  waterPeak: WaterIcon,
  monoculture: (p) => <Bug size={p.size} className={p.className} />,
  erosion: (p) => <Mountain size={p.size} className={p.className} />,
};

export function AlertIcon({ kind, size = 16, className }: { kind: AlertKind; size?: number; className?: string }) {
  const I = ICON[kind];
  return I ? <I size={size} className={className} /> : <Waves size={size} className={className} />;
}
