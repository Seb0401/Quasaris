import Link from "next/link";
import { ArrowRight, BookOpen, Database, Lightbulb } from "lucide-react";
import { getMessages } from "@/lib/i18n";

const TOPICS = [
  { id: "et", Icon: EvapoIcon },
  { id: "kc", Icon: GrowingIcon },
  { id: "balance", Icon: WaterIcon },
  { id: "ndvi", Icon: SatelliteIcon },
  { id: "soil", Icon: SoilIcon },
  { id: "frost", Icon: FrostIcon },
  { id: "fusion", Icon: Mountain },
  { id: "ground", Icon: RadioTower },
  { id: "range", Icon: ChartColumn },
  { id: "rotation", Icon: CycleIcon },
] as const;

type Topic = { title: string; text: string; how: string; source: string };

export default async function AprendePage({ params }: PageProps<"/[locale]/aprende">) {
  const { locale } = await params;
  const m = getMessages(locale);
  const es = locale === "es";
  const a = m.aprende as unknown as { title: string; subtitle: string; how: string; source: string; disclaimer: string; topics: Record<string, Topic> };

  return (
    <div className="ui-page">
      <header className="ui-hero">
        <div className="ui-hero-photo" aria-hidden />
        <div className="ui-hero-grid" aria-hidden />
        <div className="ui-hero-scan" aria-hidden />
        <div className="ui-hero-copy">
          <span className="ui-kicker"><BookOpen size={14} /> QUASARIS / {es ? "GLOSARIO" : "GLOSSARY"}</span>
          <h1>{a.title}</h1>
          <p>{a.subtitle}</p>
        </div>
      </header>

      <nav className="topic-chips" aria-label={a.title}>
        {TOPICS.map((tp) => (
          <a key={tp.id} href={`#${tp.id}`}><span aria-hidden>{tp.icon}</span>{a.topics[tp.id].title}</a>
        ))}
      </nav>

      <div className="topic-grid">
        {TOPICS.map((tp, i) => {
          const topic = a.topics[tp.id];
          return (
            <article key={tp.id} id={tp.id} className="topic-card" style={{ animationDelay: `${i * 60}ms` }}>
              <h2><span className="topic-icon" aria-hidden>{tp.icon}</span>{topic.title}</h2>
              <p>{topic.text}</p>
              <p className="topic-how"><Lightbulb size={15} /><span><b>{a.how}:</b> {topic.how}</span></p>
              <p className="topic-source"><Database size={12} />{a.source}: {topic.source}</p>
            </article>
          );
        })}
      </div>

      <p className="ui-source text-center">{a.disclaimer}</p>
      <Link href={`/${locale}/parcela`} className="ui-btn ui-btn-lg self-center">{m.home.start}<ArrowRight size={18} /></Link>
    </div>
  );
}
