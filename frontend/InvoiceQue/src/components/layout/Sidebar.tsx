'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Home01Icon, GoogleDocIcon, Payment01Icon, UserGroupIcon, Settings01Icon, ArrowLeft01Icon, ArrowRight01Icon, MoneyBag02Icon, ChartIcon } from 'hugeicons-react'

const navItems = [
  { href: '/', label: 'Dashboard', Icon: Home01Icon },
  { href: '/invoices', label: 'Invoice', Icon: GoogleDocIcon, exact: true },
  { href: '/payments', label: 'Payment Links', Icon: Payment01Icon },
  { href: '/clients', label: 'Klien', Icon: UserGroupIcon },
  { href: '/reports', label: 'Laporan', Icon: ChartIcon },
  { href: '/settings', label: 'Pengaturan', Icon: Settings01Icon },
];

export default function Sidebar({ isCollapsed = false, toggleSidebar, isMobileOpen = false, toggleMobileSidebar }: { isCollapsed?: boolean, toggleSidebar?: () => void, isMobileOpen?: boolean, toggleMobileSidebar?: () => void }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const { user } = useAuth();

  // On mobile, the sidebar should always look expanded when open
  const effectivelyCollapsed = isCollapsed && typeof window !== 'undefined' && window.innerWidth >= 1024;

  const isActive = (href: string, exact?: boolean) => {
    if (href === '/') return pathname === '/';
    if (exact) return pathname === href || (pathname.startsWith(href + '/') && !navItems.some(n => n.href !== href && pathname.startsWith(n.href)));
    return pathname.startsWith(href);
  };

  return (
    <aside className={`fixed top-0 left-0 h-screen bg-bg-card border-r border-border-color flex flex-col z-[200] transition-all duration-300 overflow-visible w-[260px] lg:w-[var(--sidebar-width)] ${isMobileOpen ? 'translate-x-0' : 'max-lg:-translate-x-full'}`} data-theme={theme}>
      <button onClick={toggleSidebar} className="absolute -right-3 top-[30px] w-6 h-6 bg-bg-card border border-border-color rounded-full flex items-center justify-center cursor-pointer z-10 transition-all duration-150 text-text-primary shadow-sm hover:bg-bg-hover hover:scale-110 max-lg:hidden" aria-label="Toggle Sidebar">
        {effectivelyCollapsed ? <ArrowRight01Icon width={16} height={16} className='dark:text-white text-black' /> : <ArrowLeft01Icon width={16} height={16} className='dark:text-white text-black' />}
      </button>
      <div className="flex flex-col h-full overflow-x-hidden">
        <div className={`flex items-center gap-3 py-3 px-5 ${effectivelyCollapsed ? 'px-0 justify-center' : ''}`}>
          <img src="/images/invoiceque.svg" alt="InvoiceQu Logo" className={`${effectivelyCollapsed ? 'w-[32px] h-[32px]' : 'w-[42px] h-[42px]'} object-contain shrink-0}`} />
          <div className={`flex flex-col ${effectivelyCollapsed ? 'hidden' : ''}`}>
            <span className="font-extrabold text-lg tracking-tight text-black dark:text-white">Invoice<b className="bg-gradient-to-br from-red-600 to-red-500 bg-clip-text text-transparent">Qu</b></span>
            <span className="text-[11px] text-text-tertiary font-medium tracking-[0.5px]">SaaS Platform</span>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {/* <div className={`text-[11px] font-bold text-black dark:text-white tracking-[1px] py-2 px-3 mb-1 ${isCollapsed ? 'hidden' : ''}`}>MENU UTAMA</div> */}
          {navItems.map((item) => {
            const active = isActive(item.href, (item as any).exact);
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024 && toggleMobileSidebar) {
                    toggleMobileSidebar();
                  }
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-all duration-150 relative mb-[5px] group ${active
                  ? 'bg-red-50 text-red-600 font-semibold dark:bg-red-900/20'
                  : 'text-black dark:text-white hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20'
                  } ${effectivelyCollapsed ? 'px-3 justify-center' : ''}`}
              >
                <span className="flex items-center justify-center shrink-0">
                  <Icon className={active ? 'text-red-600' : 'text-black dark:text-white group-hover:text-red-600 dark:group-hover:text-red-500'} />
                </span>
                <span className={`flex-1 text-sm ${effectivelyCollapsed ? 'hidden' : ''}`}>{item.label}</span>
                {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-br from-red-600 to-red-500 rounded-l-[3px]" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
