"use client";

import { usePathname } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";

/** Setup has its own navigation; other routes use the shared application shell. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onboarding = pathname.split("/")[2] === "onboarding";

  return (
    <>
      {!onboarding && <AppNav />}
      <main className={onboarding ? "app-main onboarding-main" : "app-main"}>{children}</main>
      {!onboarding && <AssistantDrawer />}
    </>
  );
}
