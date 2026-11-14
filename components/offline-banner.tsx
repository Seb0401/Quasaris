"use client";

import { useT } from "@/components/i18n-provider";
import { useOffline } from "@/lib/use-offline";

export function OfflineBanner() {
  const t = useT();
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div role="status" className="sticky top-14 z-[999] bg-warn text-[#1f2a1f] text-sm font-medium text-center px-4 py-2">
      📴 {t("app.offline")}
    </div>
  );
}
