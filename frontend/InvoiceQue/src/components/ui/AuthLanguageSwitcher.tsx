"use client";

import { useEffect, useRef, useState } from "react";
import { CheckmarkCircle02Icon } from "hugeicons-react";
import { appLocales } from "@/lib/app-i18n";
import type { TranslationKey } from "@/lib/app-i18n";
import { useLanguage } from "@/context/LanguageContext";

const localeFlag: Record<string, string> = {
  id: "🇮🇩",
  en: "🇺🇸",
  ms: "🇲🇾",
};

export default function AuthLanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const currentLocale =
    appLocales.find((item) => item.code === locale) || appLocales[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button — responsive: compact on mobile, full on desktop */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="h-9 sm:h-10 flex items-center gap-1.5 sm:gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-2.5 sm:px-3 text-white cursor-pointer transition-all duration-200 hover:bg-white/20 hover:border-white/30 hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
        aria-label={t("language.switcherLabel")}
        title={t("language.switcherLabel")}
      >
        <span className="text-base sm:text-lg leading-none">
          {localeFlag[locale] || "🌐"}
        </span>
        <span className="text-[11px] sm:text-xs font-bold leading-none">
          {currentLocale.shortLabel}
        </span>
        {/* Chevron */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 opacity-70 ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="fixed left-3 right-auto top-14 z-[320] sm:absolute sm:left-0 sm:top-full sm:mt-2 w-[200px] overflow-hidden rounded-xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/20 animate-fade-in">
          {/* Header */}
          <div className="px-3 py-2 border-b border-white/10">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.6px] text-white/60">
              {t("language.chooseLanguage")}
            </span>
          </div>

          {/* Options */}
          {appLocales.map((item) => {
            const active = item.code === locale;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setLocale(item.code);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-all duration-200 ${
                  active
                    ? "bg-white/20 text-white font-semibold"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
                aria-current={active ? "true" : undefined}
              >
                <span className="text-base sm:text-lg leading-none">
                  {localeFlag[item.code] || "🌐"}
                </span>
                <span className="flex-1 text-xs sm:text-sm">
                  {t(`language.${item.code}` as TranslationKey)}
                </span>
                {active && (
                  <CheckmarkCircle02Icon
                    width={16}
                    height={16}
                    className="text-white shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
