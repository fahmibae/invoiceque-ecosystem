"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useNotification } from "@/context/NotificationContext";
import { appLocales } from "@/lib/app-i18n";
import type { TranslationKey } from "@/lib/app-i18n";
import {
  Moon02Icon,
  Sun02Icon,
  Notification01Icon,
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
} from "hugeicons-react";

export default function QuickSettingsDropdown() {
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLanguage();
  const { unreadCount } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "language">("main");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setTimeout(() => setActiveTab("main"), 200);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    setIsOpen((v) => !v);
    if (isOpen) {
      setTimeout(() => setActiveTab("main"), 200);
    }
  };

  const currentLocale =
    appLocales.find((item) => item.code === locale) || appLocales[0];

  const localeFlag: Record<string, string> = {
    id: "🇮🇩",
    en: "🇺🇸",
    ms: "🇲🇾",
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 9-dot grid button (Google-style waffle icon) */}
      <button
        type="button"
        onClick={toggleDropdown}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent cursor-pointer transition-all duration-200 relative text-text-primary hover:bg-bg-hover active:bg-bg-secondary"
        aria-label={t("header.quickSettings")}
        title={t("header.quickSettings")}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <circle cx="4" cy="4" r="1.8" />
          <circle cx="10" cy="4" r="1.8" />
          <circle cx="16" cy="4" r="1.8" />
          <circle cx="4" cy="10" r="1.8" />
          <circle cx="10" cy="10" r="1.8" />
          <circle cx="16" cy="10" r="1.8" />
          <circle cx="4" cy="16" r="1.8" />
          <circle cx="10" cy="16" r="1.8" />
          <circle cx="16" cy="16" r="1.8" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-gradient-to-br from-red-600 to-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-sm shadow-red-500/30">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-[219] sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed left-3 right-3 top-16 z-[220] sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:w-[340px] overflow-hidden rounded-2xl border border-border-color bg-bg-card shadow-2xl shadow-black/10 dark:shadow-black/30 animate-fade-in">
            {/* ─── MAIN VIEW ─── */}
            {activeTab === "main" && (
              <div className="animate-fade-in">
                {/* Header */}
                <div className="px-4 py-3 border-b border-border-light">
                  <h3 className="text-sm font-bold text-text-primary">
                    {t("header.quickSettings")}
                  </h3>
                </div>

                {/* Grid items */}
                <div className="p-3 grid grid-cols-3 gap-2">
                  {/* Theme Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-bg-hover transition-all duration-200 cursor-pointer"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 border ${
                        theme === "dark"
                          ? "border-slate-800 text-white shadow-lg shadow-slate-950/25"
                          : "border-slate-200 text-black shadow-lg shadow-slate-50/25"
                      }`}
                    >
                      {theme === "light" ? (
                        <Sun02Icon width={20} height={20} />
                      ) : (
                        <Moon02Icon width={20} height={20} />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-text-secondary text-center leading-tight">
                      {theme === "light"
                        ? t("header.lightMode")
                        : t("header.darkMode")}
                    </span>
                  </button>

                  {/* Language Selector */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("language")}
                    className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-bg-hover transition-all duration-200 cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full border border-slate-200 dark:border-slate-800 text-black dark:text-white flex items-center justify-center shadow-lg shadow-slate-50/25 dark:shadow-slate-950/25">
                      <span className="text-lg leading-none">
                        {localeFlag[locale] || "🌐"}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-text-secondary text-center leading-tight">
                      {currentLocale.shortLabel}
                    </span>
                  </button>

                  {/* Notifications — direct link to /notifications page */}
                  <Link
                    href="/notifications"
                    onClick={() => setIsOpen(false)}
                    className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-bg-hover transition-all duration-200 cursor-pointer relative no-underline"
                  >
                    <div className="w-11 h-11 rounded-full border border-slate-200 dark:border-slate-800 text-black dark:text-white flex items-center justify-center relative shadow-lg shadow-slate-50/25 dark:shadow-slate-950/25">
                      <Notification01Icon width={20} height={20} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-white dark:bg-gray-900 rounded-full text-[10px] font-bold text-red-600 flex items-center justify-center border-2 border-red-500">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-text-secondary text-center leading-tight">
                      {t("header.notifications")}
                    </span>
                  </Link>
                </div>
              </div>
            )}

            {/* ─── LANGUAGE VIEW ─── */}
            {activeTab === "language" && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border-light">
                  <button
                    type="button"
                    onClick={() => setActiveTab("main")}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-bg-hover transition-colors"
                  >
                    <ArrowRight01Icon
                      width={16}
                      height={16}
                      className="rotate-180"
                    />
                  </button>
                  <h3 className="text-sm font-bold text-text-primary">
                    {t("language.chooseLanguage")}
                  </h3>
                </div>

                <div className="p-2">
                  {appLocales.map((item) => {
                    const active = item.code === locale;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setLocale(item.code);
                          setActiveTab("main");
                        }}
                        className={`flex w-full items-center gap-3 px-3 py-3 rounded-xl mb-2 text-left transition-all duration-200 ${
                          active
                            ? "bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800"
                            : "hover:bg-bg-hover"
                        }`}
                      >
                        <span className="text-xl">
                          {localeFlag[item.code] || "🌐"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm font-semibold ${active ? "text-red-600 dark:text-red-400" : "text-text-primary"}`}
                          >
                            {t(`language.${item.code}` as TranslationKey)}
                          </div>
                          <div className="text-[11px] text-text-tertiary">
                            {item.intlLocale}
                          </div>
                        </div>
                        {active && (
                          <CheckmarkCircle02Icon
                            width={18}
                            height={18}
                            className="text-red-500 shrink-0"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
