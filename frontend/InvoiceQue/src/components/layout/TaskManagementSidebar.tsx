"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/app-i18n";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Clock01Icon,
  Folder01Icon,
  GoogleDocIcon,
  Task01Icon,
  DashboardCircleIcon,
  UserGroup03Icon,
  Wrench01Icon,
} from "hugeicons-react";

interface TaskManagementSidebarProps {
  isDesktopOpen: boolean;
  isMobileOpen: boolean;
  onToggleDesktop: () => void;
  onToggleMobile: () => void;
}

const taskMenuItems = [
  {
    href: "/tasks/dashboard",
    labelKey: "nav.tasksDashboard",
    Icon: DashboardCircleIcon,
    exact: true,
  },
  { href: "/tasks", labelKey: "nav.kanban", Icon: Task01Icon, exact: true },
  { href: "/tasks/list", labelKey: "nav.checklist", Icon: GoogleDocIcon },
  { href: "/projects", labelKey: "nav.projects", Icon: Folder01Icon },
  { href: "/time-tracking", labelKey: "nav.timeTracking", Icon: Clock01Icon },
  { href: "/calendar", labelKey: "nav.calendar", Icon: Calendar03Icon },
  { href: "/meetings", labelKey: "nav.onlineMeetings", Icon: UserGroup03Icon },
  { href: "/toolkit", labelKey: "nav.toolkit", Icon: Wrench01Icon },
] satisfies Array<{
  href: string;
  labelKey: TranslationKey;
  Icon: typeof DashboardCircleIcon;
  exact?: boolean;
}>;

export default function TaskManagementSidebar({
  isDesktopOpen,
  isMobileOpen,
  onToggleDesktop,
  onToggleMobile,
}: TaskManagementSidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderMenuItems = () => (
    <nav className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-x-hidden overflow-y-auto px-2 py-4">
      {taskMenuItems.map(({ href, labelKey, Icon, exact }) => {
        const active = isActive(href, exact);
        const label = t(labelKey);

        return (
          <Link
            key={href}
            href={href}
            data-tour={
              href === "/toolkit"
                ? "nav-toolkit"
                : href === "/meetings"
                  ? "nav-meetings"
                  : undefined
            }
            className={`relative w-14 h-14 group flex items-center justify-center rounded-xl transition-colors duration-150 ${
              active
                ? "bg-white/20 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
           
            title={label}
            onClick={isMobileOpen ? onToggleMobile : undefined}
          > 
            <Icon width={19} height={19} />
            {active && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-l-[3px]" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop: expand trigger when collapsed */}
      <button
        type="button"
        onClick={onToggleDesktop}
        className={`group fixed right-0 top-1/2 z-[180] hidden h-14 w-[82px] translate-x-[42px] -translate-y-1/2 items-center justify-start gap-1 rounded-l-2xl border border-r-0 border-border-color bg-bg-card pl-3 text-red-600 shadow-md transition-all duration-300 ease-out hover:translate-x-0 hover:bg-red-50 hover:shadow-lg focus-visible:translate-x-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 dark:hover:bg-red-900/20 ${isDesktopOpen ? "lg:!hidden" : "lg:flex"}`}
        aria-label={t("nav.showTaskMenu")}
        title={t("nav.showTaskMenu")}
      >
        <ArrowLeft01Icon width={18} height={18} />
        <span className="text-[11px] font-bold leading-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
          {t("nav.tasks")}
        </span>
      </button>

      {/* Mobile: floating action button when closed */}
      {!isMobileOpen && (
        <button
          type="button"
          onClick={onToggleMobile}
          className="fixed bottom-4 right-4 z-[180] flex h-11 w-11 items-center justify-center rounded-full border border-border-color bg-bg-card text-red-600 shadow-lg transition-all duration-150 hover:bg-red-50 dark:hover:bg-red-900/20 lg:hidden"
          aria-label={t("nav.showTaskMenu")}
          title={t("nav.showTaskMenu")}
        >
          <Task01Icon width={20} height={20} />
        </button>
      )}

      {/* Desktop sidebar — always rendered, slides in/out */}
      <aside
        data-tour="task-sidebar"
        className={`fixed right-0 top-0 z-[210] hidden h-screen w-[76px] flex-col overflow-visible border-l border-white/10 bg-gradient-to-b from-red-950 via-red-900 to-red-800 shadow-sm lg:flex transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isDesktopOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-10 -right-10 w-[100px] h-[100px] rounded-full bg-white/5" />
          <div className="absolute bottom-[15%] -left-6 w-[80px] h-[80px] rounded-full bg-white/5" />
        </div>

        <button
          type="button"
          onClick={onToggleDesktop}
          className={`absolute -left-3 top-[30px] z-[230] hidden h-6 w-6 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition-all duration-200 hover:bg-red-50 hover:text-red-700 lg:flex ${
            isDesktopOpen
              ? "opacity-100 scale-100"
              : "opacity-0 scale-0 pointer-events-none"
          }`}
          aria-label={t("nav.hideTaskMenu")}
          title={t("nav.hideTaskMenu")}
        >
          <ArrowRight01Icon width={16} height={16} />
        </button>

        <div className="relative z-10 flex h-[var(--header-height)] items-center justify-center border-b border-white/15 px-2">
          <button
            type="button"
            onClick={onToggleDesktop}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white transition-colors hover:bg-white/30"
            aria-label={t("nav.hideTaskMenu")}
            title={t("nav.taskManagement")}
          >
            <Task01Icon width={20} height={20} />
          </button>
        </div>

        <div className="relative z-10 flex-1 flex flex-col min-h-0">
          {renderMenuItems()}
        </div>
      </aside>

      {/* Mobile sidebar — slides in from right */}
      <aside
        className={`fixed right-0 top-0 z-[260] flex h-screen w-[76px] flex-col overflow-hidden border-l border-white/10 bg-gradient-to-b from-red-950 via-red-900 to-red-800 shadow-xl lg:hidden transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isMobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-10 -right-10 w-[100px] h-[100px] rounded-full bg-white/5" />
          <div className="absolute bottom-[15%] -left-6 w-[80px] h-[80px] rounded-full bg-white/5" />
        </div>

        <div className="relative z-10 flex h-[var(--header-height)] items-center justify-center border-b border-white/15 px-2">
          <button
            type="button"
            onClick={onToggleMobile}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white transition-colors hover:bg-white/30"
            aria-label={t("nav.hideTaskMenu")}
            title={t("nav.taskManagement")}
          >
            <ArrowRight01Icon width={18} height={18} />
          </button>
        </div>
        <div className="relative z-10 flex-1 flex flex-col min-h-0">
          {renderMenuItems()}
        </div>
      </aside>
    </>
  );
}
