'use client';

import { useCallback, useEffect, useRef, useState, type ElementType } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import {
  Alert01Icon,
  Analytics01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ChartIcon,
  GoogleDocIcon,
  Home01Icon,
  Link04Icon,
  Payment01Icon,
  SentIcon,
  UserGroup03Icon,
  UserGroupIcon,
  Task01Icon,
  Folder01Icon,
  Clock01Icon,
  Calendar03Icon,
  Wrench01Icon,
  SourceCodeIcon,
  CheckListIcon,
} from 'hugeicons-react';

type NavChild = {
  href: string;
  label: string;
  exact?: boolean;
};

type NavLink = NavChild & {
  Icon: ElementType;
  children?: NavChild[];
};

type NavGroup = {
  groupLabel: string;
  items: NavLink[];
};

type NavEntry = NavLink | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'groupLabel' in entry;
}

const navEntries: NavEntry[] = [
  {
    href: '/',
    label: 'Dashboard',
    Icon: Home01Icon,
  },
  {
    groupLabel: 'Penagihan',
    items: [
      {
        href: '/invoices',
        label: 'Invoice',
        Icon: GoogleDocIcon,
        children: [
          { href: '/invoices', label: 'Semua Invoice', exact: true },
          { href: '/invoices/outstanding', label: 'Invoice Belum Lunas' },
        ],
      },
      { href: '/quotations', label: 'Quotation', Icon: SentIcon },
      { href: '/payments', label: 'Payment Links', Icon: Payment01Icon },
    ],
  },
  {
    groupLabel: 'Klien',
    items: [
      { href: '/clients', label: 'Daftar Klien', Icon: UserGroupIcon },
      { href: '/portal', label: 'Client Portal', Icon: Link04Icon },
      { href: '/crm', label: 'CRM', Icon: UserGroup03Icon },
    ],
  },
  {
    groupLabel: 'Toolkit',
    items: [
      {
        href: '/toolkit',
        label: 'Toolkit Hub',
        Icon: Wrench01Icon,
        children: [
          { href: '/toolkit', label: 'Semua Tools', exact: true },
          { href: '/toolkit/expenses', label: 'Expense Tracker' },
          { href: '/toolkit/contracts', label: 'Contracts' },
          { href: '/toolkit/notes', label: 'Quick Notes' },
          { href: '/toolkit/snippets', label: 'Code Snippets' },
          { href: '/toolkit/checklists', label: 'Checklists' },
        ],
      },
    ],
  },
  {
    groupLabel: 'Koleksi & Analitik',
    items: [
      { href: '/chasers', label: 'Payment Chaser', Icon: Alert01Icon },
      { href: '/health', label: 'Health Score', Icon: Analytics01Icon },
      { href: '/reports', label: 'Laporan', Icon: ChartIcon },
    ],
  },
];

export default function Sidebar({ isCollapsed = false, toggleSidebar, isMobileOpen = false, toggleMobileSidebar }: { isCollapsed?: boolean, toggleSidebar?: () => void, isMobileOpen?: boolean, toggleMobileSidebar?: () => void }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [openDropdown, setOpenDropdown] = useState<string | null>(pathname.startsWith('/invoices') ? '/invoices' : null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  const dropdownContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dropdownButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const flyoutRef = useRef<HTMLDivElement | null>(null);

  // On mobile, the sidebar should always look expanded when open
  const effectivelyCollapsed = isCollapsed && typeof window !== 'undefined' && window.innerWidth >= 1024;

  // Calculate flyout position when dropdown opens in collapsed mode
  const updateFlyoutPos = useCallback((href: string) => {
    const btn = dropdownButtonRefs.current[href];
    if (btn && effectivelyCollapsed) {
      const rect = btn.getBoundingClientRect();
      setFlyoutPos({ top: rect.top, left: rect.right + 29 });
    } else {
      setFlyoutPos(null);
    }
  }, [effectivelyCollapsed]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!openDropdown) return;

      const container = dropdownContainerRefs.current[openDropdown];
      const clickedInsideContainer = container?.contains(event.target as Node);
      const clickedInsideFlyout = flyoutRef.current?.contains(event.target as Node);

      if (!clickedInsideContainer && !clickedInsideFlyout) {
        setOpenDropdown(null);
        setFlyoutPos(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const isActive = (href: string, exact?: boolean) => {
    if (href === '/') return pathname === '/';
    if (exact) return pathname === href || (pathname.startsWith(href + '/') && !navEntries.some(n => !isGroup(n) && n.href !== href && pathname.startsWith(n.href)));
    return pathname.startsWith(href);
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => isActive(item.href, item.exact) || item.children?.some(c => isActive(c.href, c.exact)));
  };

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const closeMobileSidebar = () => {
    if (window.innerWidth < 1024 && toggleMobileSidebar) {
      toggleMobileSidebar();
    }
  };

  const renderInlineDropdown = (children: NavChild[], parentHref: string) => (
    <div className="ml-6 mt-1 mb-2 space-y-1 border-l border-border-light pl-3">
      {children.map((child) => {
        const childActive = isActive(child.href, child.exact);
        return (
          <Link
            key={child.href}
            href={child.href}
            onClick={() => {
              setOpenDropdown(parentHref);
              closeMobileSidebar();
            }}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${childActive
              ? 'bg-red-50 text-red-600 font-semibold dark:bg-red-900/20'
              : 'text-text-secondary hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20'
              }`}
          >
            <span className="truncate">{child.label}</span>
          </Link>
        );
      })}
    </div>
  );

  const renderFlyoutDropdown = (children: NavChild[], parentLabel: string) => {
    if (!flyoutPos) return null;

    return createPortal(
      <div
        ref={flyoutRef}
        className="fixed w-[220px] rounded-lg border border-border-color bg-bg-card p-2 shadow-lg z-[320] animate-fade-in"
        style={{ top: flyoutPos.top, left: flyoutPos.left }}
        data-theme={theme}
      >
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.8px] text-text-tertiary">
          {parentLabel}
        </div>
        {children.map((child) => {
          const childActive = isActive(child.href, child.exact);
          return (
            <Link
              key={child.href}
              href={child.href}
              onClick={() => {
                setOpenDropdown(null);
                setFlyoutPos(null);
                closeMobileSidebar();
              }}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 mb-1 text-sm font-medium transition-colors duration-150 ${childActive
                ? 'bg-red-50 text-red-600 font-semibold dark:bg-red-900/20'
                : 'text-text-secondary hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20'
                }`}
            >
              <span className="truncate">{child.label}</span>
            </Link>
          );
        })}
      </div>,
      document.body
    );
  };

  const renderNavLink = (item: NavLink) => {
    const active = isActive(item.href, item.exact);
    const Icon = item.Icon;
    const hasDropdown = Boolean(item.children?.length);
    const isDropdownOpen = openDropdown === item.href;
    const dropdownActive = active || item.children?.some((child) => isActive(child.href, child.exact));

    if (hasDropdown && item.children) {
      return (
        <div key={item.href} ref={(el) => { dropdownContainerRefs.current[item.href] = el; }} className="relative mb-[2px]">
          <button
            type="button"
            ref={(el) => { dropdownButtonRefs.current[item.href] = el; }}
            onClick={() => {
              if (isDropdownOpen) {
                setOpenDropdown(null);
                setFlyoutPos(null);
              } else {
                setOpenDropdown(item.href);
                // Calculate flyout position after state update
                setTimeout(() => updateFlyoutPos(item.href), 0);
              }
            }}
            aria-expanded={isDropdownOpen}
            title={effectivelyCollapsed ? item.label : undefined}
            className={`w-full mb-2 flex items-center gap-3 px-4 py-4 rounded-md font-medium transition-all duration-150 relative group ${dropdownActive
              ? 'bg-red-50 text-red-600 font-semibold dark:bg-red-900/20'
              : 'text-black dark:text-white hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20'
              } ${effectivelyCollapsed ? 'px-3 justify-center' : ''}`}
          >
            <span className="flex items-center justify-center shrink-0">
              <Icon width={18} height={18} className={dropdownActive ? 'text-red-600' : 'text-black dark:text-white group-hover:text-red-600 dark:group-hover:text-red-500'} />
            </span>
            <span className={`flex-1 text-left text-[13px] ${effectivelyCollapsed ? 'hidden' : ''}`}>{item.label}</span>
            {!effectivelyCollapsed && (
              <ArrowDown01Icon
                width={14}
                height={14}
                className={`shrink-0 transition-transform duration-150 ${isDropdownOpen ? 'rotate-180 text-red-600' : 'text-text-tertiary group-hover:text-red-600'}`}
              />
            )}
            {dropdownActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-br from-red-600 to-red-500 rounded-l-[3px]" />}
          </button>
          {/* Inline dropdown for expanded sidebar */}
          {isDropdownOpen && !effectivelyCollapsed && renderInlineDropdown(item.children, item.href)}
          {/* Flyout dropdown for collapsed sidebar (rendered via portal) */}
          {isDropdownOpen && effectivelyCollapsed && renderFlyoutDropdown(item.children, item.label)}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => {
          closeMobileSidebar();
        }}
        title={effectivelyCollapsed ? item.label : undefined}
        className={`flex items-center gap-3 px-4 py-4 rounded-md font-medium transition-all duration-150 relative mb-2 group ${active
          ? 'bg-red-50 text-red-600 font-semibold dark:bg-red-900/20'
          : 'text-black dark:text-white hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20'
          } ${effectivelyCollapsed ? 'px-3 justify-center' : ''}`}
      >
        <span className="flex items-center justify-center shrink-0">
          <Icon width={18} height={18} className={active ? 'text-red-600' : 'text-black dark:text-white group-hover:text-red-600 dark:group-hover:text-red-500'} />
        </span>
        <span className={`flex-1 text-[13px] ${effectivelyCollapsed ? 'hidden' : ''}`}>{item.label}</span>
        {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-br from-red-600 to-red-500 rounded-l-[3px]" />}
      </Link>
    );
  };

  return (
    <aside className={`fixed top-0 left-0 h-screen bg-bg-card border-r border-border-color flex flex-col z-[200] transition-all duration-300 overflow-visible w-[260px] lg:w-[var(--sidebar-width)] ${isMobileOpen ? 'translate-x-0' : 'max-lg:-translate-x-full'}`} data-theme={theme}>
      <button onClick={toggleSidebar} className="absolute -right-3 top-[30px] w-6 h-6 bg-bg-card border border-border-color rounded-full flex items-center justify-center cursor-pointer z-10 transition-all duration-150 text-text-primary shadow-sm hover:bg-bg-hover hover:scale-110 max-lg:hidden" aria-label="Toggle Sidebar">
        {effectivelyCollapsed ? <ArrowRight01Icon width={16} height={16} className='dark:text-white text-black' /> : <ArrowLeft01Icon width={16} height={16} className='dark:text-white text-black' />}
      </button>
      <div className={`flex flex-col h-full ${effectivelyCollapsed ? 'overflow-visible' : 'overflow-x-hidden'}`}>
        <div className={`flex items-center gap-3 py-3 px-5 ${effectivelyCollapsed ? 'px-0 justify-center' : ''}`}>
          <Image src="/images/invoiceque.svg" alt="InvoiceQu Logo" width={42} height={42} priority className={`${effectivelyCollapsed ? 'h-[32px] w-[32px]' : 'h-[42px] w-[42px]'} shrink-0 object-contain`} />
          <div className={`flex flex-col ${effectivelyCollapsed ? 'hidden' : ''}`}>
            <span className="font-extrabold text-lg tracking-tight text-black dark:text-white">Invoice<b className="bg-gradient-to-br from-red-600 to-red-500 bg-clip-text text-transparent">Qu</b></span>
            <span className="text-[11px] text-text-tertiary font-medium tracking-[0.5px]">SaaS Platform</span>
          </div>
        </div>
        <nav className="flex-1 py-1 px-3 overflow-y-auto overflow-x-hidden">
          {navEntries.map((entry: NavEntry) => {
            if (isGroup(entry)) {
              const groupActive = isGroupActive(entry);
              const isGroupCollapsed = collapsedGroups[entry.groupLabel] ?? false;

              return (
                <div key={entry.groupLabel} className="mt-3 mb-1">
                  {!effectivelyCollapsed ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(entry.groupLabel)}
                      className="w-full flex items-center justify-between px-3 py-1.5 mb-1 group cursor-pointer"
                    >
                      <span className={`text-[11px] font-bold uppercase tracking-[1px] transition-colors ${groupActive ? 'text-red-600' : 'text-text-tertiary group-hover:text-text-secondary'}`}>
                        {entry.groupLabel}
                      </span>
                      <ArrowDown01Icon
                        width={12}
                        height={12}
                        className={`transition-transform duration-200 text-text-tertiary ${isGroupCollapsed ? '-rotate-90' : ''}`}
                      />
                    </button>
                  ) : (
                    <div className="w-full border-t border-border-light my-2" />
                  )}
                  {!isGroupCollapsed && entry.items.map(item => renderNavLink(item))}
                </div>
              );
            }

            return renderNavLink(entry);
          })}
        </nav>
      </div>
    </aside>
  );
}
