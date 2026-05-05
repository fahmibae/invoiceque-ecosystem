'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Crown,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/subscriptions', label: 'Subscriptions', icon: Crown },
  { href: '/dashboard/notifications', label: 'Notifikasi', icon: Bell },
  { href: '/dashboard/settings', label: 'Pengaturan', icon: Settings },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 pb-3 ">
        <div className="flex items-center gap-3">
          <img src="/images/invoiceque.svg" alt="InvoiceQu Logo" className="h-10 w-auto object-contain" />
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white truncate">Invoice<span className="text-red-400">Qu</span></h1>
              <p className="text-[13px] text-slate-400 font-semibold tracking-widest">Admin Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent mb-2" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 mt-auto">
        <div className="mx-2 h-px bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 mb-3" />

        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/4 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-600 to-rose-600 
              flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            {!isCollapsed && (
              <>
                <div className="min-w-0 text-left flex-1">
                  <p className="text-xs font-semibold text-white truncate">{user?.name || 'Admin'}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 glass-card p-2 space-y-1 z-50">
              <button
                onClick={() => { logout(); setUserMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl glass-card 
          flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <aside className={`
        hidden lg:flex flex-col fixed top-0 left-0 h-screen z-40
        bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border-r border-white/[0.04]
        transition-all duration-300
        ${isCollapsed ? 'w-[80px]' : 'w-[260px]'}
      `}>
        {sidebarContent}

        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/10
            flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
        >
          <Menu className="w-3 h-3" />
        </button>
      </aside>

      {/* Mobile sidebar */}
      <aside className={`
        lg:hidden flex flex-col fixed top-0 left-0 h-screen w-[280px] z-50
        bg-[#0e0e15] border-r border-white/[0.04]
        transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {sidebarContent}
      </aside>
    </>
  );
}
