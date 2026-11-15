import Link from "next/link";
import { ArrowRight, BookOpen, ChartColumn, ChevronDown, Database, Droplets, Lightbulb, Mountain, RadioTower, Satellite, ShieldCheck } from "lucide-react";
import { CycleIcon, EvapoIcon, FrostIcon, GrowingIcon, SatelliteIcon, SoilIcon, WaterIcon } from "@/components/icons/farm-icons";
import { getMessages } from "@/lib/i18n";

/** Diez conceptos agrupados en tres temas; cada uno se abre al tocarlo para no saturar la página. */
const GROUPS = [
  { id: "water", Icon: Droplets, topics: [{ id: "et", Icon: EvapoIcon }, { id: "kc", Icon: GrowingIcon }, { id: "balance", Icon: WaterIcon }, { id: "soil", Icon: SoilIcon }] },
  { id: "space", Icon: Satellite, topics: [{ id: "ndvi", Icon: SatelliteIcon }, { id: "fusion", Icon: Mountain }, { id: "ground", Icon: RadioTower }] },
  { id: "decide", Icon: ShieldCheck, topics: [{ id: "frost", Icon: FrostIcon }, { id: "range", Icon: ChartColumn }, { id: "rotation", Icon: CycleIcon }] },
] as const;

type Topic = { title: string; short: string; text: string; how: string; source: string };
type Aprende = {
  title: string;
  subtitle: string;
  kicker: string;
  how: string;
  source: string;
  disclaimer: string;
  groups: Record<string, { title: string; text: string }>;
  topics: Record<string, Topic>;
};

export default async function AprendePage({ params }: PageProps<"/[locale]/aprende">) {
  const { locale } = await params;
  const m = getMessages(locale);
  const a = m.aprende as unknown as Aprende;

  return (
    <div className="ui-page">
      <header className="ui-hero">
        <div className="ui-hero-photo" aria-hidden />
        <span className="ai-mark" title="Illustration generated with ChatGPT">AI-generated image</span>
        <div className="ui-hero-grid" aria-hidden />
        <div className="ui-hero-scan" aria-hidden />
        <div className="ui-hero-copy">
          <span className="ui-kicker"><BookOpen size={14} /> QUASARIS / {a.kicker}</span>
          <h1>{a.title}</h1>
          <p>{a.subtitle}</p>
        </div>
      </header>

      <nav className="learn-groups" aria-label={a.title}>
        {GROUPS.map((g) => (
          <a key={g.id} href={`#${g.id}`}><g.Icon size={15} aria-hidden />{a.groups[g.id].title}</a>
        ))}
      </nav>

      {GROUPS.map((g) => (
        <section key={g.id} id={g.id} className="learn-section" aria-labelledby={`${g.id}-title`}>
          <header className="learn-section-head">
            <span aria-hidden><g.Icon size={19} /></span>
            <div>
              <h2 id={`${g.id}-title`}>{a.groups[g.id].title}</h2>
              <p>{a.groups[g.id].text}</p>
            </div>
          </header>
          <div className="learn-list">
            {g.topics.map((tp, i) => {
              const topic = a.topics[tp.id];
              return (
                <details key={tp.id} id={tp.id} className="topic-card" style={{ animationDelay: `${i * 60}ms` }}>
                  <summary>
                    <span className="topic-icon" aria-hidden><tp.Icon size={21} /></span>
                    <div>
                      <h3>{topic.title}</h3>
                      <p>{topic.short}</p>
                    </div>
                    <ChevronDown size={18} className="topic-chevron" aria-hidden />
                  </summary>
                  <div className="topic-body">
                    <p>{topic.text}</p>
                    <p className="topic-how"><Lightbulb size={15} /><span><b>{a.how}:</b> {topic.how}</span></p>
                    <p className="topic-source"><Database size={12} />{a.source}: {topic.source}</p>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}

      <p className="ui-source text-center">{a.disclaimer}</p>
      <Link href={`/${locale}/parcela`} className="ui-btn ui-btn-lg self-center">{m.home.start}<ArrowRight size={18} /></Link>
    </div>
  );
}
