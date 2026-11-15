"use client";

import { createContext, useCallback, useContext } from "react";
import type { Locale } from "@/lib/contract";
import { getMessages, translate } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return useCallback(
    (key: string, params?: Record<string, string | number>) => translate(getMessages(locale), key, params),
    [locale],
  );
}
