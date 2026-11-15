"use client";

import { useSyncExternalStore } from "react";
import { TriangleAlert } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { getEngineStatus, subscribeEngineStatus } from "@/lib/engine-client";

const OK = { state: "ok" } as const;

/** Aviso cuando lo que se ve no es un cálculo del motor con los datos actuales del agricultor. */
export function EngineStatusBanner() {
  const t = useT();
  const status = useSyncExternalStore(subscribeEngineStatus, getEngineStatus, () => OK);
  if (status.state === "ok") return null;
  const key = status.reason === "invalid" ? "app.engineInvalid" : status.using === "cache" ? "app.engineOfflineCache" : "app.engineOfflineExample";
  return (
    <div role="status" className="engine-status-banner sticky top-0 z-[1001] mx-auto flex max-w-3xl items-start gap-2 border-b border-warn/40 bg-[#2a2213] px-4 py-2 text-sm text-warn">
      <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
      <span>{t(key)}</span>
    </div>
  );
}
