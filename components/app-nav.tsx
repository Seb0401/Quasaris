"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Bot, CalendarDays, ClipboardList, Combine, Clock3, Home, LayoutGrid, Tractor, Languages, MapPinned, Sparkles, Repeat2, Sprout, X } from "lucide-react";
import { useLocale, useT } from "@/components/i18n-provider";
import { QuasarisMark } from "@/components/brand/quasaris-mark";
import { ThemeSwitch } from "@/components/theme-switch";

const TABS = [
  { href: "", key: "home", icon: Home },
  { href: "parcela", key: "parcela", icon: MapPinned },
  { href: "comparar", key: "comparar", icon: BarChart3 },
  { href: "rotaciones", key: "rotaciones", icon: Repeat2, desktopOnly: true },
  { href: "recomendaciones", key: "recomendaciones", icon: Sprout, desktopOnly: true },
  { href: "tiempo", key: "tiempo", icon: Clock3 },
  { href: "granja", key: "granja", icon: Tractor },
  { href: "calendario", key: "calendario", icon: CalendarDays },
] as const;

/** Barra inferior del celular: 5 accesos directos + "Más" (el resto de pantallas en una hoja). */
const MOBILE_TABS = ["", "parcela", "comparar", "granja", "calendario"];
const MORE = [
  { href: "recomendaciones", icon: Sprout, es: ["Recomendaciones", "Abonos, microorganismos y equipos"], en: ["Recommendations", "Fertilisers, microbes and devices"] },
  { href: "tiempo", icon: Clock3, es: ["Máquina del tiempo", "Cómo te habría ido en 21 años"], en: ["Time machine", "How 21 past years would have gone"] },
  { href: "rotaciones", icon: Repeat2, es: ["Mis rotaciones", "Crea o cambia lo que siembras"], en: ["My rotations", "Create or change what you grow"] },
  { href: "agrupaciones", icon: Combine, es: ["Agrupaciones", "¿Qué cultivos van bien juntos?"], en: ["Crop groupings", "Which crops work well together?"] },
  { href: "plan", icon: ClipboardList, es: ["Mi plan", "Plan de la chacra para imprimir"], en: ["My plan", "A farm plan you can print"] },
  { href: "asistente", icon: Bot, es: ["Asistente", "Pregunta con tu voz o una foto"], en: ["Assistant", "Ask with your voice or a photo"] },
  { href: "aprende", icon: BookOpen, es: ["¿Qué significa?", "Las ideas clave en palabras simples"], en: ["What does it mean?", "Key ideas in plain words"] },
] as const;

export function AppNav() {
  const locale = useLocale();
  const t = useT();
  const pathname = usePathname();
  const rest = pathname.split("/").slice(2).join("/");
  const other = locale === "es" ? "en" : "es";
  const label = (key: string) => key === "home" ? (locale === "es" ? "Inicio" : "Home") : t(`nav.${key}`);
  // nombres cortos para la barra del celular (6 pestañas en una fila)
  const short = (key: string) => (key === "tiempo" ? (locale === "es" ? "Tiempo" : "Time") : key === "parcela" ? (locale === "es" ? "Parcela" : "Field") : key === "calendario" ? (locale === "es" ? "Calendario" : "Calendar") : label(key));
  const es = locale === "es";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((m) => rest.startsWith(m.href));

  // la hoja se cierra al cambiar de página; Escape también la cierra y el fondo no se desplaza mientras está abierta
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMoreOpen(false);
  }
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  return (
    <>
      <aside className="desktop-sidebar">
        <Link href={`/${locale}`} className="brand-lockup" aria-label="Quasaris">
          <QuasarisMark width={42} height={42} />
          <span><strong>QUASARIS</strong><small>Farm Twin</small></span>
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
        <Link href={`/${locale}/agrupaciones`} className="sidebar-secondary"><Combine size={18} />{t("group.title")}</Link>
        <Link href={`/${locale}/aprende`} className="sidebar-secondary"><BookOpen size={18} />{t("nav.aprende")}</Link>
        <div className="sidebar-prefs">
          <Link href={`/${other}${rest ? `/${rest}` : ""}`} className="language-switch" aria-label={t("app.language")}><Languages size={17} />{other.toUpperCase()}</Link>
          <ThemeSwitch />
        </div>
        <div className="mission-badge"><Sparkles size={16} /><span>{locale === "es" ? "Datos NASA · decisión local" : "NASA data · local decision"}</span></div>
      </aside>

      <header className="mobile-header">
        <Link href={`/${locale}`} className="brand-lockup"><QuasarisMark width={34} height={34} /><span><strong>QUASARIS</strong><small>Farm Twin</small></span></Link>
        <div className="mobile-header-actions">
          {rest.split("/")[0] !== "asistente" && (
            <button type="button" className="header-assistant" onClick={() => window.dispatchEvent(new Event("farmtwin:open-assistant"))} aria-label={es ? "Abrir el asistente IA" : "Open the AI assistant"}>
              <Sparkles size={17} /><span>{es ? "Asistente" : "Assistant"}</span>
            </button>
          )}
          <ThemeSwitch />
          <Link href={`/${other}${rest ? `/${rest}` : ""}`} className="language-switch" aria-label={t("app.language")}>{other.toUpperCase()}</Link>
        </div>
      </header>

      <nav className="mobile-bottom-nav" aria-label={es ? "Navegación principal" : "Main navigation"}>
        <ul>
          {TABS.filter((tab) => MOBILE_TABS.includes(tab.href)).map((tab) => {
            const Icon = tab.icon;
            const active = !moreOpen && (tab.href ? rest.startsWith(tab.href) : rest === "");
            return <li key={tab.key}><Link href={`/${locale}${tab.href ? `/${tab.href}` : ""}`} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><Icon size={21} /><span>{short(tab.key)}</span></Link></li>;
          })}
          <li>
            <button type="button" className={moreOpen || moreActive ? "active" : ""} aria-expanded={moreOpen} aria-controls="more-sheet" onClick={() => setMoreOpen((v) => !v)}>
              {moreOpen ? <X size={21} /> : <LayoutGrid size={21} />}<span>{es ? "Más" : "More"}</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <>
          <div className="more-backdrop" onClick={() => setMoreOpen(false)} aria-hidden />
          <div id="more-sheet" className="more-sheet" role="dialog" aria-modal="true" aria-label={es ? "Más secciones" : "More sections"}>
            <div className="more-sheet-head">
              <b>{es ? "Más secciones" : "More sections"}</b>
              <button type="button" className="more-close" onClick={() => setMoreOpen(false)} aria-label={es ? "Cerrar" : "Close"}><X size={18} /></button>
            </div>
            <ul className="more-grid">
              {MORE.map((m) => {
                const Icon = m.icon;
                const [name, hint] = es ? m.es : m.en;
                const active = rest.startsWith(m.href);
                return (
                  <li key={m.href}>
                    <Link href={`/${locale}/${m.href}`} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => setMoreOpen(false)}>
                      <span className="more-icon"><Icon size={20} /></span>
                      <span className="more-text"><b>{name}</b><small>{hint}</small></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
