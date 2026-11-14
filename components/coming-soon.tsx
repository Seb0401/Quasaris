import { getMessages } from "@/lib/i18n";

/** Marcador para secciones que aún construye otro flujo de trabajo (ver PLAN.md §7–8). */
export async function ComingSoon({ params, section, icon, owner }: { params: Promise<{ locale: string }>; section: string; icon: string; owner: string }) {
  const { locale } = await params;
  const m = getMessages(locale);
  const title = (m.nav as Record<string, string>)[section] ?? section;
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="text-6xl" aria-hidden>
        {icon}
      </span>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted">
        {m.soon.title} · {m.soon.text}
      </p>
      <p className="text-xs text-muted">({owner})</p>
    </div>
  );
}
