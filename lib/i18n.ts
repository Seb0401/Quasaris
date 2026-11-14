import es from "@/messages/es.json";
import en from "@/messages/en.json";
import type { Locale } from "@/lib/contract";

export const locales = ["es", "en"] as const satisfies readonly Locale[];
export const defaultLocale: Locale = "es";

export type Messages = typeof es;
const dictionaries: Record<Locale, Messages> = { es, en };

export function isLocale(v: string): v is Locale {
  return (locales as readonly string[]).includes(v);
}

export function getMessages(locale: string): Messages {
  return dictionaries[isLocale(locale) ? locale : defaultLocale];
}

/** t("comparar.range", { p10: 1, p90: 2 }). Las claves de "explain" pueden contener puntos. */
export function translate(messages: Messages, key: string, params?: Record<string, string | number>): string {
  const [ns, ...rest] = key.split(".");
  const group = (messages as Record<string, Record<string, unknown>>)[ns];
  let value = group?.[rest.join(".")];
  if (value === undefined) {
    // clave anidada en explain: t("explain.why.current")
    value = rest.reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], group);
  }
  if (typeof value !== "string") return key;
  return params ? value.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`)) : value;
}
