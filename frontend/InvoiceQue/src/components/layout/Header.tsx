'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { Sun02Icon, Moon02Icon, Notification01Icon, Logout02Icon } from 'hugeicons-react';
import GlobalSearch from './GlobalSearch';

export default function Header({ toggleMobileSidebar }: { toggleMobileSidebar?: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const { unreadCount } = useNotification();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="fixed top-0 right-0 left-[var(--sidebar-width)] h-[var(--header-height)] bg-bg-primary/80 backdrop-blur-md border-b border-border-color flex items-center justify-between px-6 z-[150] transition-[left] duration-200 max-lg:left-0 max-sm:px-4">
      <div className="flex items-center gap-4 flex-1">
        <div className="hidden max-lg:flex items-center gap-2.5">
          <button
            onClick={toggleMobileSidebar}
            className="p-1 mr-1 text-text-primary hover:text-red-600 transition-colors cursor-pointer"
            aria-label="Toggle Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <img src="/images/invoiceque.svg" alt="InvoiceQu Logo" className="w-[34px] h-[34px] object-contain shrink-0" />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-black dark:text-white leading-none mt-1">Invoice<b className="bg-gradient-to-br from-red-600 to-red-500 bg-clip-text text-transparent">Qu</b></span>
              <span className="text-[11px] text-text-tertiary font-medium tracking-[0.5px] mt-0.5">SaaS Platform</span>
            </div>
          </div>
        </div>
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-2">
        <button
          className="w-10 h-10 flex items-center justify-center rounded-md bg-bg-secondary border border-border-color text-lg cursor-pointer transition-all duration-150 relative text-text-primary hover:bg-bg-hover hover:border-red-300 hover:scale-105"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        >
          {theme === 'light' ? <Sun02Icon className='dark:text-white text-black' /> : <Moon02Icon className='dark:text-white text-black' />}
        </button>
        <Link href="/notifications" className="w-10 h-10 flex items-center justify-center rounded-md bg-bg-secondary border border-border-color text-lg cursor-pointer transition-all duration-150 relative text-text-primary hover:bg-bg-hover hover:border-red-300 hover:scale-105" title="Notifikasi">
          <Notification01Icon className='dark:text-white text-black' />
          {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-br from-red-600 to-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">{unreadCount}</span>}
        </Link>
        <div className="relative" ref={menuRef}>
          <div
            className="ml-1 cursor-pointer relative flex items-center justify-center h-10"
            onClick={() => setShowMenu(!showMenu)}
          >
            <div className="w-[38px] h-[38px] bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center font-bold text-[13px] text-white transition-transform duration-150 hover:scale-110">{initials}</div>
            {showMenu && (
              <div className="absolute top-full right-0 mt-2 bg-bg-secondary border border-border-color rounded-lg shadow-lg min-w-[180px] z-[100] overflow-hidden">
                <div className="py-3 px-4 border-b border-border-color">
                  <div className="font-semibold text-sm text-text-primary">{user?.name}</div>
                  <div className="text-xs text-text-secondary">{user?.email}</div>
                </div>
                <Link
                  href="/settings/profile"
                  onClick={() => setShowMenu(false)}
                  className="w-full py-2.5 px-4 border-b border-border-color bg-transparent cursor-pointer text-left text-sm flex items-center gap-2 text-text-primary hover:text-red-500 hover:bg-bg-hover transition-colors duration-200"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Profil Saya
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 px-4 border-none bg-transparent cursor-pointer text-left text-sm flex items-center gap-2 text-text-primary hover:text-red-500 hover:bg-bg-hover transition-colors duration-200"
                >
                  <Logout02Icon width={18} height={18} /> Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
