import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { AppShell } from "@/components/app-shell";
import { SwRegister } from "@/components/sw-register";
import { getMessages, isLocale, locales } from "@/lib/i18n";
import { THEME_SCRIPT } from "@/lib/theme";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const m = getMessages(locale);
  return {
    title: { default: `${m.app.name} · ${m.app.tagline}`, template: `%s · ${m.app.name}` },
    description: m.app.subtitle,
    applicationName: m.app.name,
    appleWebApp: { capable: true, title: m.app.name, statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: "#071b2f",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* aplica el tema guardado antes de pintar (ver lib/theme.ts) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="font-sans overflow-x-clip">
        <I18nProvider locale={locale}>
          <AppShell>{children}</AppShell>
          <SwRegister />
        </I18nProvider>
      </body>
    </html>
  );
}
