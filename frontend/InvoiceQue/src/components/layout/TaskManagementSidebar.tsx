'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  ChartIcon,
  Clock01Icon,
  Folder01Icon,
  GoogleDocIcon,
  Task01Icon,
  DashboardCircleIcon
} from 'hugeicons-react';

interface TaskManagementSidebarProps {
  isDesktopOpen: boolean;
  isMobileOpen: boolean;
  onToggleDesktop: () => void;
  onToggleMobile: () => void;
}

const taskMenuItems = [
  { href: '/tasks/dashboard', label: 'Dashboard', Icon: DashboardCircleIcon, exact: true },
  { href: '/tasks', label: 'Kanban', Icon: Task01Icon, exact: true },
  { href: '/tasks/list', label: 'List', Icon: GoogleDocIcon },
  { href: '/projects', label: 'Proyek', Icon: Folder01Icon },
  { href: '/time-tracking', label: 'Timer', Icon: Clock01Icon },
  { href: '/calendar', label: 'Kalender', Icon: Calendar03Icon },
];

export default function TaskManagementSidebar({
  isDesktopOpen,
  isMobileOpen,
  onToggleDesktop,
  onToggleMobile,
}: TaskManagementSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderMenuItems = () => (
    <nav className="flex flex-1 flex-col items-center gap-2 px-2 py-4">
      {taskMenuItems.map(({ href, label, Icon, exact }) => {
        const active = isActive(href, exact);

        return (
          <Link
            key={href}
            href={href}
            className={`group flex w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-center transition-colors duration-150 ${
              active
                ? 'bg-red-50 text-red-600 dark:bg-red-900/20'
                : 'text-text-secondary hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20'
            }`}
            title={label}
            onClick={isMobileOpen ? onToggleMobile : undefined}
          >
            <Icon width={19} height={19} />
            <span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold leading-tight">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {!isDesktopOpen && (
        <button
          type="button"
          onClick={onToggleDesktop}
          className="group fixed right-0 top-1/2 z-[180] hidden h-14 w-[82px] translate-x-[42px] -translate-y-1/2 items-center justify-start gap-1 rounded-l-2xl border border-r-0 border-border-color bg-bg-card pl-3 text-text-primary shadow-md transition-[transform,border-color,background-color,color,box-shadow] duration-200 hover:translate-x-0 hover:border-red-300 hover:bg-red-50 hover:text-red-600 hover:shadow-lg focus-visible:translate-x-0 focus-visible:border-red-300 focus-visible:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 dark:hover:bg-red-900/20 lg:flex"
          aria-label="Tampilkan menu tugas"
          title="Tampilkan menu tugas"
        >
          <ArrowLeft01Icon width={18} height={18} />
          <span className="text-[11px] font-bold leading-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
            Tugas
          </span>
        </button>
      )}
      {!isMobileOpen && (
        <button
          type="button"
          onClick={onToggleMobile}
          className="fixed bottom-4 right-4 z-[180] flex h-11 w-11 items-center justify-center rounded-full border border-border-color bg-bg-card text-red-600 shadow-lg transition-all duration-150 hover:border-red-300 hover:bg-red-50 lg:hidden"
          aria-label="Tampilkan menu tugas"
          title="Tampilkan menu tugas"
        >
          <Task01Icon width={20} height={20} />
        </button>
      )}

      {isDesktopOpen && (
        <aside data-tour="task-sidebar" className="fixed right-0 top-0 z-[210] hidden h-screen w-[76px] flex-col border-l border-border-color bg-bg-card shadow-sm transition-transform duration-200 lg:flex">
          <button
            type="button"
            onClick={onToggleDesktop}
            className="absolute -left-3 top-[30px] hidden h-6 w-6 items-center justify-center rounded-full border border-border-color bg-bg-card text-text-primary shadow-sm transition-all duration-150 hover:bg-bg-hover hover:text-red-500 lg:flex"
            aria-label="Sembunyikan menu tugas"
            title="Sembunyikan menu tugas"
          >
            <ArrowRight01Icon width={16} height={16} />
          </button>

          <div className="flex h-[var(--header-height)] items-center justify-center border-b border-border-light px-2">
            <button
              type="button"
              onClick={onToggleDesktop}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
              aria-label="Sembunyikan menu tugas"
              title="Manajemen tugas"
            >
              <Task01Icon width={20} height={20} />
            </button>
          </div>

          {renderMenuItems()}
        </aside>
      )}

      {isMobileOpen && (
        <aside className="fixed right-0 top-0 z-[260] flex h-screen w-[76px] flex-col border-l border-border-color bg-bg-card shadow-xl transition-transform duration-200 lg:hidden">
          <div className="flex h-[var(--header-height)] items-center justify-center border-b border-border-light px-2">
            <button
              type="button"
              onClick={onToggleMobile}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
              aria-label="Sembunyikan menu tugas"
              title="Manajemen tugas"
            >
              <ArrowRight01Icon width={18} height={18} />
            </button>
          </div>
          {renderMenuItems()}
        </aside>
      )}
    </>
  );
}
