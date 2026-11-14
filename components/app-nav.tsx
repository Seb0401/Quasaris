"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, CalendarDays, Clock3, Home, Tractor, Languages, MapPinned, Sparkles } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { SpaceLeafMark } from "@/components/brand/space-leaf-mark";

const TABS = [
  { href: "", key: "home", icon: Home },
  { href: "parcela", key: "parcela", icon: MapPinned },
  { href: "comparar", key: "comparar", icon: BarChart3 },
  { href: "tiempo", key: "tiempo", icon: Clock3 },
  { href: "granja", key: "granja", icon: Tractor },
  { href: "calendario", key: "calendario", icon: CalendarDays },
] as const;

export function AppNav() {
  const locale = useLocale();
  const t = useT();
  const pathname = usePathname();
  const rest = pathname.split("/").slice(2).join("/");
  const other = locale === "es" ? "en" : "es";
  const label = (key: string) => key === "home" ? (locale === "es" ? "Inicio" : "Home") : t(`nav.${key}`);
  // nombres cortos para la barra del celular (6 pestañas en una fila)
  const short = (key: string) => (key === "tiempo" ? (locale === "es" ? "Tiempo" : "Time") : key === "parcela" ? (locale === "es" ? "Parcela" : "Field") : label(key));

  return (
    <>
      <aside className="desktop-sidebar">
        <Link href={`/${locale}`} className="brand-lockup" aria-label="Quasaris">
          <SpaceLeafMark width={42} height={42} />
          <span><strong>QUASARIS</strong><small>Farm Intelligence</small></span>
        </Link>
        <p className="nav-section-label">{locale === "es" ? "MISIÓN" : "MISSION"}</p>
        <nav aria-label={locale === "es" ? "Navegación principal" : "Main navigation"}>
          <ul className="side-nav-list">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = tab.href ? rest.startsWith(tab.href) : rest === "";
              return <li key={tab.key}><Link href={`/${locale}${tab.href ? `/${tab.href}` : ""}`} className={active ? "active" : ""}><Icon size={19} /><span>{label(tab.key)}</span></Link></li>;
            })}
          </ul>
        </nav>
        <div className="sidebar-spacer" />
        <Link href={`/${locale}/aprende`} className="sidebar-secondary"><BookOpen size={18} />{t("nav.aprende")}</Link>
        <Link href={`/${other}${rest ? `/${rest}` : ""}`} className="language-switch" aria-label={t("app.language")}><Languages size={17} />{other.toUpperCase()}</Link>
        <div className="mission-badge"><Sparkles size={16} /><span>{locale === "es" ? "Datos NASA · decisión local" : "NASA data · local decision"}</span></div>
      </aside>

      <header className="mobile-header">
        <Link href={`/${locale}`} className="brand-lockup"><SpaceLeafMark width={34} height={34} /><span><strong>QUASARIS</strong><small>Farm Intelligence</small></span></Link>
        <Link href={`/${other}${rest ? `/${rest}` : ""}`} className="language-switch" aria-label={t("app.language")}>{other.toUpperCase()}</Link>
      </header>

      <nav className="mobile-bottom-nav">
        <ul>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.href ? rest.startsWith(tab.href) : rest === "";
            return <li key={tab.key}><Link href={`/${locale}${tab.href ? `/${tab.href}` : ""}`} className={active ? "active" : ""} aria-label={label(tab.key)}><Icon size={21} /><span>{short(tab.key)}</span></Link></li>;
          })}
        </ul>
      </nav>
    </>
  );
}
