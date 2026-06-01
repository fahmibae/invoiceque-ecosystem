"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatTimer, useTimeTracking } from "@/context/TimeTrackingContext";
import {
  Clock01Icon,
  Logout02Icon,
  PauseIcon,
  PlayIcon,
  Search02Icon,
  Settings01Icon,
  StopIcon,
  User02Icon,
} from "hugeicons-react";
import GlobalSearch from "./GlobalSearch";
import QuickSettingsDropdown from "./QuickSettingsDropdown";

export default function Header({
  toggleMobileSidebar,
}: {
  toggleMobileSidebar?: () => void;
}) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const {
    activeSession,
    elapsedSeconds,
    isRunning,
    isSaving,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useTimeTracking();
  const [showMenu, setShowMenu] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "U";

  return (
    <header className="fixed top-0 right-0 left-[var(--sidebar-width)] lg:right-[var(--task-sidebar-width)] h-[var(--header-height)] bg-bg-primary/80 backdrop-blur-md border-b border-border-color flex items-center justify-between px-6 z-[150] transition-[left,right] duration-200 max-lg:left-0 max-sm:px-4">
      <div className="flex items-center gap-4 flex-1">
        <div className="hidden max-lg:flex items-center gap-2.5">
          <button
            onClick={toggleMobileSidebar}
            className="p-1 mr-1 text-text-primary hover:text-red-600 transition-colors cursor-pointer"
            aria-label={t("header.toggleMenu")}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/images/invoiceque.svg"
              alt="InvoiceQu Logo"
              className="w-[34px] h-[34px] object-contain shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-black dark:text-white leading-none mt-1">
                Invoice
                <b className="bg-gradient-to-br from-red-600 to-red-500 bg-clip-text text-transparent">
                  Qu
                </b>
              </span>
              <span className="text-[11px] text-text-tertiary font-medium tracking-[0.5px] mt-0.5">
                {t("common.appTagline")}
              </span>
            </div>
          </div>
        </div>
        <GlobalSearch mobileOpen={mobileSearchOpen} onCloseMobile={() => setMobileSearchOpen(false)} />
      </div>
      <div className="flex items-center gap-2">
        {activeSession && (
          <>
            <div className="hidden lg:flex items-center gap-2 rounded-md border border-border-color bg-bg-secondary px-2 py-1.5 text-text-primary shadow-sm">
              <Link
                href="/time-tracking"
                className="min-w-0 max-w-[260px] flex items-center gap-2 px-2 text-sm hover:text-red-500 transition-colors"
                title={activeSession.taskTitle}
              >
                <Clock01Icon
                  width={16}
                  height={16}
                  className="shrink-0 text-red-500"
                />
                <span className="max-w-[130px] truncate font-medium">
                  {activeSession.taskTitle}
                </span>
                <span className="font-mono text-xs font-bold tabular-nums">
                  {formatTimer(elapsedSeconds)}
                </span>
              </Link>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-md border border-border-light bg-bg-card text-text-primary hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50"
                onClick={isRunning ? pauseTimer : resumeTimer}
                disabled={isSaving}
                title={
                  isRunning ? t("header.pauseTimer") : t("header.resumeTimer")
                }
                aria-label={
                  isRunning ? t("header.pauseTimer") : t("header.resumeTimer")
                }
              >
                {isRunning ? (
                  <PauseIcon width={15} height={15} />
                ) : (
                  <PlayIcon width={15} height={15} />
                )}
              </button>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-md border border-border-light bg-bg-card text-text-primary hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50"
                onClick={() => {
                  void stopTimer();
                }}
                disabled={isSaving}
                title={t("header.stopAndSave")}
                aria-label={t("header.stopAndSave")}
              >
                <StopIcon width={15} height={15} />
              </button>
            </div>
            <Link
              href="/time-tracking"
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-md bg-bg-secondary border border-border-color text-lg cursor-pointer transition-all duration-150 relative text-text-primary hover:bg-bg-hover hover:border-red-300"
              title={`${activeSession.taskTitle} - ${formatTimer(elapsedSeconds)}`}
              aria-label={t("header.activeTimer")}
            >
              <Clock01Icon className="text-red-500" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            </Link>
          </>
        )}
        {/* Mobile search button — next to QuickSettings */}
        <button
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-bg-card border border-border-color text-text-primary hover:bg-bg-hover transition-all duration-150 cursor-pointer"
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Search"
        >
          <Search02Icon width={20} height={20} />
        </button>
        {/* Google-style Quick Settings (Theme + Language + Notifications) */}
        <QuickSettingsDropdown />
        <div className="relative" ref={menuRef}>
          <div
            className="ml-1 cursor-pointer relative flex items-center justify-center h-10"
            onClick={() => setShowMenu(!showMenu)}
          >
            <div className="w-[38px] h-[38px] bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center font-bold text-[13px] text-white transition-transform duration-150 hover:scale-110">
              {initials}
            </div>
            {showMenu && (
              <div className="absolute top-full right-0 mt-2 bg-bg-secondary border border-border-color rounded-lg shadow-lg min-w-[180px] z-[100] overflow-hidden">
                <div className="py-3 px-4 border-b border-border-color">
                  <div className="font-semibold text-sm text-text-primary">
                    {user?.name}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {user?.email}
                  </div>
                </div>
                <Link
                  href="/settings/profile"
                  onClick={() => setShowMenu(false)}
                  className="w-full py-2.5 px-4 border-b border-border-color bg-transparent cursor-pointer text-left text-sm flex items-center gap-2 text-text-primary hover:text-red-500 hover:bg-bg-hover transition-colors duration-200"
                >
                  <User02Icon width="18" height="18" />{" "}
                  {t("header.myProfile")}
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setShowMenu(false)}
                  className="w-full py-2.5 px-4 border-b border-border-color bg-transparent cursor-pointer text-left text-sm flex items-center gap-2 text-text-primary hover:text-red-500 hover:bg-bg-hover transition-colors duration-200"
                >
                  <Settings01Icon width="18" height="18" />{" "}
                  {t("header.settings")}
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 px-4 border-none bg-transparent cursor-pointer text-left text-sm flex items-center gap-2 text-text-primary hover:text-red-500 hover:bg-bg-hover transition-colors duration-200"
                >
                  <Logout02Icon width={18} height={18} /> {t("header.logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
