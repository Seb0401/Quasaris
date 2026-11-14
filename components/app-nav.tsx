"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useT } from "@/components/i18n-provider";

const TABS = [
  { href: "parcela", icon: "📍" },
  { href: "comparar", icon: "⚖️" },
  { href: "tiempo", icon: "🕰️" },
  { href: "asistente", icon: "🎙️" },
  { href: "calendario", icon: "📅" },
] as const;

export function AppNav() {
  const locale = useLocale();
  const t = useT();
  const pathname = usePathname();
  const rest = pathname.split("/").slice(2).join("/");
  const other = locale === "es" ? "en" : "es";

  return (
    <>
      <header className="sticky top-0 z-[1000] bg-surface/90 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2 font-semibold">
            <span aria-hidden>🛰️🌱</span>
            <span>{t("app.name")}</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href={`/${locale}/aprende`} className="text-muted hover:text-foreground">
              {t("nav.aprende")}
            </Link>
            <Link
              href={`/${other}${rest ? `/${rest}` : ""}`}
              aria-label={t("app.language")}
              className="rounded-full border border-border px-3 py-1 font-medium uppercase"
            >
              {other}
            </Link>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 inset-x-0 z-[1000] bg-surface border-t border-border pb-[env(safe-area-inset-bottom)]">
        <ul className="max-w-3xl mx-auto grid grid-cols-5">
          {TABS.map((tab) => {
            const active = rest.startsWith(tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={`/${locale}/${tab.href}`}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[11px] leading-tight text-center ${
                    active ? "text-brand font-semibold" : "text-muted"
                  }`}
                >
                  <span className="text-xl" aria-hidden>
                    {tab.icon}
                  </span>
                  {t(`nav.${tab.href}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
