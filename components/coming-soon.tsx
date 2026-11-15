import Link from "next/link";
import { getMessages } from "@/lib/i18n";
import { ArrowRight, BookOpen, CalendarDays, Clock3, MessageCircleMore, Orbit } from "lucide-react";

/** Marcador para secciones que aún construye otro flujo de trabajo (ver PLAN.md §7–8). */
export async function ComingSoon({ params, section, owner }: { params: Promise<{ locale: string }>; section: string; owner: string }) {
  const { locale } = await params;
  const m = getMessages(locale);
  const es = locale === "es";
  const title = (m.nav as Record<string, string>)[section] ?? section;
  const Icon = section === "tiempo" ? Clock3 : section === "calendario" ? CalendarDays : section === "asistente" ? MessageCircleMore : BookOpen;
  return (
    <div className="ui-page">
      <header className="ui-hero">
        <div className="ui-hero-photo" aria-hidden />
        <span className="ai-mark" title="Illustration generated with ChatGPT">AI-generated image</span>
        <div className="ui-hero-grid" aria-hidden />
        <div className="ui-hero-scan" aria-hidden />
        <div className="ui-hero-copy">
          <span className="ui-kicker"><Icon size={14} /> QUASARIS / {es ? "PRÓXIMAMENTE" : "COMING SOON"}</span>
          <h1>{title}</h1>
          <p>{m.soon.text}</p>
        </div>
      </header>
      <section className="ui-panel soon-panel">
        <div className="soon-orbit" aria-hidden>
          <Orbit size={120} strokeWidth={0.8} />
          <span><Icon size={30} /></span>
        </div>
        <h2>{m.soon.title}</h2>
        <p>{m.soon.text}</p>
        <small>{owner}</small>
        <Link href={`/${locale}/parcela`} className="ui-btn">{es ? "Mientras tanto, configura tu parcela" : "Meanwhile, set up your field"}<ArrowRight size={16} /></Link>
      </section>
    </div>
  );
}
