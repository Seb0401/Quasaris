/**
 * Plain language for farmers: the same numbers the engine computes, said the way people talk.
 * - Water is shown against the farmer's own allocation ("uses 85% of your water"), not as m³/ha alone.
 * - "N of 21 years" becomes a frequency in words ("most years"), keeping the count in brackets.
 * - Figures are rounded ("about 18,400") and come with a margin taken from the 21 real years.
 */
import type { Locale, Stat } from "@/lib/contract";

const isEs = (l: Locale) => l === "es";

/** Rounds to a figure people can remember: 18,352 → 18,400; 7,712 → 7,700; 863 → 860. */
export function about(value: number, locale: Locale): string {
  const a = Math.abs(value);
  const step = a >= 1000 ? 100 : a >= 100 ? 10 : 1;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(value / step) * step);
}

export type YearsLevel = "all" | "almost" | "most" | "some" | "rare" | "never";

export function yearsLevel(n: number, total: number): YearsLevel {
  if (total <= 0 || n <= 0) return "never";
  if (n >= total) return "all";
  const share = n / total;
  return share >= 0.85 ? "almost" : share >= 0.5 ? "most" : share >= 0.2 ? "some" : "rare";
}

/** Short label for badges: "Enough most years". */
export function yearsBadge(n: number, total: number, locale: Locale): string {
  const es = isEs(locale);
  return {
    all: es ? "Alcanza todos los años" : "Enough every year",
    almost: es ? "Alcanza casi todos los años" : "Enough almost every year",
    most: es ? "Alcanza la mayoría de años" : "Enough most years",
    some: es ? "Alcanza solo algunos años" : "Enough only some years",
    rare: es ? "Casi nunca alcanza" : "Rarely enough",
    never: es ? "No alcanzó ningún año" : "Never enough",
  }[yearsLevel(n, total)];
}

/** Full sentence: "Your water would have been enough in most years (15 of the last 21)." */
export function yearsSentence(n: number, total: number, locale: Locale): string {
  const es = isEs(locale);
  const count = es ? `${n} de los últimos ${total}` : `${n} of the last ${total}`;
  return {
    all: es ? `Tu agua habría alcanzado todos los años (los últimos ${total}).` : `Your water would have been enough every year (all of the last ${total}).`,
    almost: es ? `Tu agua habría alcanzado casi todos los años (${count}).` : `Your water would have been enough almost every year (${count}).`,
    most: es ? `Tu agua habría alcanzado la mayoría de años (${count}).` : `Your water would have been enough in most years (${count}).`,
    some: es ? `Tu agua habría alcanzado solo algunos años (${count}).` : `Your water would have been enough only in some years (${count}).`,
    rare: es ? `Tu agua casi nunca habría alcanzado (${count} años).` : `Your water would rarely have been enough (${count} years).`,
    never: es ? `Tu agua no habría alcanzado en ninguno de los últimos ${total} años.` : `Your water would not have been enough in any of the last ${total} years.`,
  }[yearsLevel(n, total)];
}

/** How much of the farmer's water a need uses, in percent. */
export const shareOfWater = (need: number, have: number) => (have > 0 ? Math.round((need / have) * 100) : 0);

/** "Needs 22% more water than you have" or "Uses 85% of your water". */
export function waterVsYours(need: number, have: number, locale: Locale): string {
  const es = isEs(locale);
  const share = shareOfWater(need, have);
  if (share > 100) return es ? `Necesita ${share - 100}% más agua de la que tienes` : `Needs ${share - 100}% more water than you have`;
  return es ? `Usa el ${share}% de tu agua` : `Uses ${share}% of your water`;
}

/** Margin of error from the 21 real years: how far a typical year moves from the median, in percent. */
export function marginPct(stat: Stat): number {
  const m = Math.abs(stat.median);
  if (m < 1) return 0;
  return Math.max(1, Math.round(((stat.p90 - stat.p10) / 2 / m) * 100));
}

/** "Most years between S/ 17,000 and S/ 26,000." */
export function rangeSentence(stat: Stat, format: (v: number) => string, locale: Locale): string {
  return isEs(locale)
    ? `La mayoría de años, entre ${format(stat.p10)} y ${format(stat.p90)}.`
    : `Most years between ${format(stat.p10)} and ${format(stat.p90)}.`;
}

/** Harvest lost in a normal year, said as a share people can picture. */
export function lossSentence(fraction: number, locale: Locale): string {
  const es = isEs(locale);
  const pct = Math.round(fraction * 100);
  if (pct < 3) return es ? "En un año normal casi no se pierde cosecha." : "In a normal year almost no harvest is lost.";
  const oneIn = Math.round(1 / fraction);
  const picture = fraction <= 0.5 && oneIn >= 2 ? (es ? ` (más o menos 1 de cada ${oneIn} partes)` : ` (about 1 in every ${oneIn})`) : "";
  return es ? `En un año normal se pierde cerca del ${pct}% de la cosecha${picture}, por clima o falta de agua.` : `In a normal year about ${pct}% of the harvest is lost${picture}, to weather or lack of water.`;
}

/** A word for the 0–100 fit score. */
export function scoreWord(score: number, locale: Locale): string {
  const es = isEs(locale);
  return score >= 75 ? (es ? "Muy buena opción" : "Very good match")
    : score >= 60 ? (es ? "Buena opción" : "Good match")
    : score >= 40 ? (es ? "Opción regular" : "Fair match")
    : (es ? "Opción débil" : "Weak match");
}
