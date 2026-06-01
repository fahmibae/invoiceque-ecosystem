"use client";

import { useEffect, useRef, useState } from "react";
import { CheckmarkCircle02Icon, Globe02Icon } from "hugeicons-react";
import { appLocales } from "@/lib/app-i18n";
import { useLanguage } from "@/context/LanguageContext";

export default function LanguageSwitcher() {
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
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="h-10 min-w-10 flex items-center justify-center gap-1.5 rounded-md bg-bg-secondary border border-border-color px-2 text-xs font-bold text-text-primary cursor-pointer transition-all duration-150 hover:bg-bg-hover hover:border-red-300 hover:scale-105"
        aria-label={t("language.switcherLabel")}
        title={t("language.switcherLabel")}
      >
        <Globe02Icon width={18} height={18} />
        <span className="text-[11px] leading-none">
          {currentLocale.shortLabel}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-[220] mt-2 w-44 overflow-hidden rounded-lg border border-border-color bg-bg-secondary shadow-lg">
          <div className="border-b border-border-color px-3 py-2 text-[11px] font-bold uppercase tracking-[0.6px] text-text-tertiary">
            {t("language.chooseLanguage")}
          </div>
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
                className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? "bg-red-50 font-semibold text-red-600 dark:bg-red-900/20"
                    : "text-text-primary hover:bg-bg-hover hover:text-red-500"
                }`}
                aria-current={active ? "true" : undefined}
              >
                <span>{t(`language.${item.code}`)}</span>
                {active && <CheckmarkCircle02Icon width={16} height={16} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
