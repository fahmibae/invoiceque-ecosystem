"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  type AppLocale,
  type TranslationKey,
  defaultAppLocale,
  detectAppLocale,
  getAppLocaleMeta,
  isAppLocale,
  translate,
} from "@/lib/app-i18n";

const STORAGE_KEY = "invoiceque-locale";
const LANGUAGE_CHANGE_EVENT = "invoiceque-locale-change";

type TranslateFn = (
  key: TranslationKey,
  values?: Record<string, string | number>,
) => string;

interface LanguageContextType {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: TranslateFn;
  intlLocale: string;
  dir: "ltr" | "rtl";
}

const fallbackMeta = getAppLocaleMeta(defaultAppLocale);

const LanguageContext = createContext<LanguageContextType>({
  locale: defaultAppLocale,
  setLocale: () => {},
  t: (key, values) => translate(defaultAppLocale, key, values),
  intlLocale: fallbackMeta.intlLocale,
  dir: fallbackMeta.dir,
});

function readStoredLocale(): AppLocale {
  if (typeof window === "undefined") return defaultAppLocale;

  const storedLocale = localStorage.getItem(STORAGE_KEY);

  if (isAppLocale(storedLocale)) {
    return storedLocale;
  }

  return detectAppLocale(navigator.languages);
}

function subscribeToLocaleChange(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, callback);
  };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeToLocaleChange,
    readStoredLocale,
    () => defaultAppLocale,
  );

  useEffect(() => {
    const meta = getAppLocaleMeta(locale);

    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = meta.dir;
  }, [locale]);

  const setLocale = useCallback((nextLocale: AppLocale) => {
    localStorage.setItem(STORAGE_KEY, nextLocale);
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }, []);

  const t = useCallback<TranslateFn>(
    (key, values) => translate(locale, key, values),
    [locale],
  );

  const value = useMemo(() => {
    const meta = getAppLocaleMeta(locale);

    return {
      locale,
      setLocale,
      t,
      intlLocale: meta.intlLocale,
      dir: meta.dir,
    };
  }, [locale, setLocale, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
