'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <div 
      className="flex min-h-screen w-full"
      style={{ '--sidebar-width': isCollapsed ? '80px' : '260px' } as React.CSSProperties}
    >
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} isMobileOpen={isMobileOpen} toggleMobileSidebar={toggleMobileSidebar} />
      
      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[190] lg:hidden backdrop-blur-sm"
          onClick={toggleMobileSidebar}
        />
      )}

      <div className="flex-1 min-w-0 lg:ml-[var(--sidebar-width)] min-h-screen transition-[margin-left] duration-200 ml-0 w-full flex flex-col">
        <Header toggleMobileSidebar={toggleMobileSidebar} />
        <div className="p-6 pt-[calc(var(--header-height)+24px)] max-w-[1400px] w-full mx-auto max-lg:p-4 max-lg:pt-[calc(var(--header-height)+16px)] max-sm:p-3 max-sm:pt-[calc(var(--header-height)+12px)]">
          {children}
        </div>
      </div>
    </div>
  );
}
