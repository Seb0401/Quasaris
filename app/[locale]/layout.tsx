import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { I18nProvider } from "@/components/i18n-provider";
import { AppNav } from "@/components/app-nav";
import { SwRegister } from "@/components/sw-register";
import { getMessages, isLocale, locales } from "@/lib/i18n";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
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
  themeColor: "#2f6b3a",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <I18nProvider locale={locale}>
          <AppNav />
          <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-4 pb-28">{children}</main>
          <SwRegister />
        </I18nProvider>
      </body>
    </html>
  );
}
