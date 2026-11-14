import Link from "next/link";
import { getMessages } from "@/lib/i18n";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const m = getMessages(locale);

  const pillars = [
    { icon: "🕰️", title: m.home.pastTitle, text: m.home.pastText, href: "tiempo" },
    { icon: "🎙️", title: m.home.presentTitle, text: m.home.presentText, href: "asistente" },
    { icon: "📅", title: m.home.futureTitle, text: m.home.futureText, href: "calendario" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl bg-brand text-brand-ink p-6 flex flex-col gap-3">
        <p className="text-sm uppercase tracking-wider opacity-80">{m.app.tagline}</p>
        <h1 className="text-3xl font-bold leading-tight">{m.app.name}</h1>
        <p className="text-lg leading-snug">{m.app.subtitle}</p>
        <Link
          href={`/${locale}/parcela`}
          className="mt-2 self-start rounded-full bg-brand-ink text-brand px-5 py-3 text-base font-semibold"
        >
          {m.home.start} →
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {pillars.map((p) => (
          <Link
            key={p.href}
            href={`/${locale}/${p.href}`}
            className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-1 hover:border-brand"
          >
            <span className="text-3xl" aria-hidden>
              {p.icon}
            </span>
            <h2 className="font-semibold text-lg">{p.title}</h2>
            <p className="text-sm text-muted">{p.text}</p>
          </Link>
        ))}
      </section>

      <p className="text-xs text-muted text-center">{m.home.disclaimer}</p>
    </div>
  );
}
