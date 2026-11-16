"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";

/** Setup has its own navigation; other routes use the shared application shell. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const segment = pathname.split("/")[2] ?? "";
  const onboarding = segment === "onboarding";
  // en la página del asistente el botón flotante sobra; en el celular, Mi parcela tiene su propia hoja inferior
  const showAssistant = !onboarding && segment !== "asistente";

  return (
    <>
      {!onboarding && <AppNav />}
      <main className={onboarding ? "app-main onboarding-main" : "app-main"}>{children}</main>
      {showAssistant && <div className={`assistant-host route-${segment || "home"}`}><AssistantDrawer /></div>}
    </>
  );
}
