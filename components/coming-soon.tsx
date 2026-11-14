import { getMessages } from "@/lib/i18n";
import { BookOpen, CalendarDays, Clock3, MessageCircleMore } from "lucide-react";

/** Marcador para secciones que aún construye otro flujo de trabajo (ver PLAN.md §7–8). */
export async function ComingSoon({ params, section, owner }: { params: Promise<{ locale: string }>; section: string; owner: string }) {
  const { locale } = await params;
  const m = getMessages(locale);
  const title = (m.nav as Record<string, string>)[section] ?? section;
  const Icon = section === "tiempo" ? Clock3 : section === "calendario" ? CalendarDays : section === "asistente" ? MessageCircleMore : BookOpen;
  return (
    <div className="panel-card mx-auto mt-10 flex max-w-2xl flex-col items-center gap-3 px-8 py-16 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-sky-400 to-emerald-500 text-white shadow-xl" aria-hidden><Icon size={38} /></span>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted">
        {m.soon.title} · {m.soon.text}
      </p>
      <p className="text-xs text-muted">({owner})</p>
    </div>
  );
}
