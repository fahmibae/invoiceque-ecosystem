'use client';
import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import { useSidebar } from '@/context/SidebarContext';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className="layout">
      <Sidebar />
      <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {children}
      </main>
    </div>
  );
}
