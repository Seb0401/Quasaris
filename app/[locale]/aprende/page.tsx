import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getMessages } from "@/lib/i18n";

/** "¿Qué significa?": cada término en dos líneas, con un ejemplo de Majes. Los textos viven en messages/*.json (aprende.*). */
const TOPICS = [
  { key: "et", icon: "☀️" },
  { key: "kc", icon: "🌿" },
  { key: "ndvi", icon: "🛰️" },
  { key: "soilMoisture", icon: "💧" },
  { key: "waterBalance", icon: "⚖️" },
  { key: "frost", icon: "❄️" },
  { key: "range", icon: "📊" },
  { key: "satGround", icon: "📡" },
] as const;

type Topic = { title: string; text: string; example: string; source: string };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const m = getMessages(locale);
  const a = m.aprende as unknown as Record<string, Topic> & { title: string; intro: string; exampleLabel: string; sourceLabel: string; back: string };

  return (
    <div className="dashboard-shell">
      <header className="section-hero">
        <div>
          <span className="panel-kicker">
            <BookOpen size={16} /> QUASARIS / {locale === "es" ? "GLOSARIO" : "GLOSSARY"}
          </span>
          <h1>{a.title}</h1>
          <p>{a.intro}</p>
        </div>
      </header>

      <nav aria-label={a.title} className="mt-4 flex flex-wrap gap-2">
        {TOPICS.map(({ key, icon }) => (
          <a key={key} href={`#${key}`} className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm">
            {icon} {a[key].title}
          </a>
        ))}
      </nav>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {TOPICS.map(({ key, icon }) => {
          const topic = a[key];
          return (
            <article id={key} key={key} className="scroll-mt-20 rounded-2xl border border-border bg-surface p-4 flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <span className="text-2xl" aria-hidden>
                  {icon}
                </span>
                {topic.title}
              </h2>
              <p className="leading-snug">{topic.text}</p>
              <p className="rounded-lg bg-background px-3 py-2 text-sm">
                <span className="font-semibold">{a.exampleLabel}: </span>
                {topic.example}
              </p>
              <p className="text-xs text-muted">
                {a.sourceLabel}: {topic.source}
              </p>
            </article>
          );
        })}
      </div>

      <div className="mt-5 flex justify-center">
        <Link href={`/${locale}/comparar`} className="rounded-full bg-brand text-brand-ink px-5 py-3 font-semibold">
          {a.back} →
        </Link>
      </div>
    </div>
  );
}
