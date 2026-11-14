import Link from "next/link";
import { BookOpen, ChartColumn, Mountain, RadioTower } from "lucide-react";
import { CycleIcon, EvapoIcon, FrostIcon, GrowingIcon, SatelliteIcon, SoilIcon, WaterIcon } from "@/components/icons/farm-icons";
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
  const a = m.aprende as unknown as { title: string; subtitle: string; how: string; source: string; disclaimer: string; topics: Record<string, Topic> };

  return (
    <div className="dashboard-shell flex flex-col gap-5">
      <header className="section-hero">
        <div>
          <span className="panel-kicker">
            <BookOpen size={16} /> QUASARIS / {locale === "es" ? "GLOSARIO" : "GLOSSARY"}
          </span>
          <h1>{a.title}</h1>
          <p>{a.subtitle}</p>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label={a.title}>
        {TOPICS.map((tp) => (
          <a key={tp.id} href={`#${tp.id}`} className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm">
            <tp.Icon size={15} className="mr-1 inline" /> {a.topics[tp.id].title}
          </a>
        ))}
      </nav>

      <div className="grid gap-3 md:grid-cols-2">
        {TOPICS.map((tp) => {
          const topic = a.topics[tp.id];
          return (
            <article key={tp.id} id={tp.id} className="flex scroll-mt-24 flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-brand">
                  <tp.Icon size={22} />
                </span>
                {topic.title}
              </h2>
              <p className="text-sm leading-relaxed">{topic.text}</p>
              <p className="rounded-xl bg-background px-3 py-2 text-sm">
                <span className="font-semibold">{a.how}: </span>
                {topic.how}
              </p>
              <p className="text-xs text-muted">
                {a.source}: {topic.source}
              </p>
            </article>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted">{a.disclaimer}</p>
      <Link href={`/${locale}/parcela`} className="self-center rounded-full bg-brand px-5 py-3 font-semibold text-brand-ink">
        {m.home.start} →
      </Link>
    </div>
  );
}
