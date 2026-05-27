'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleSidebar: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false, mobileOpen: false,
  toggleSidebar: () => {}, openMobile: () => {}, closeMobile: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleSidebar = () => setCollapsed(prev => !prev);
  const openMobile = () => setMobileOpen(true);
  const closeMobile = () => setMobileOpen(false);
  return (
    <SidebarContext.Provider value={{ collapsed, mobileOpen, toggleSidebar, openMobile, closeMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
