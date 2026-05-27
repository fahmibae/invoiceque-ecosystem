'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import TaskManagementSidebar from './TaskManagementSidebar';
import TourGuide, { type TourStep } from '@/components/ui/TourGuide';

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="nav-"]',
    title: '👋 Selamat Datang di InvoiceQu!',
    description: 'Ini adalah Dashboard utama kamu. Di sini kamu bisa melihat ringkasan bisnis, invoice terbaru, dan statistik pendapatan.',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-invoices"]',
    title: '📄 Kelola Invoice',
    description: 'Buat, kirim, dan lacak semua invoice kamu di sini. Kamu juga bisa melihat invoice yang belum lunas.',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-quotations"]',
    title: '📝 Quotation & Penawaran',
    description: 'Buat penawaran harga profesional untuk calon klien. Setelah deal, langsung convert jadi invoice!',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-clients"]',
    title: '👥 Database Klien',
    description: 'Simpan data semua klien kamu. Dari kontak, alamat, hingga riwayat transaksi — semua ada di sini.',
    placement: 'right',
  },
  {
    target: '[data-tour="nav-toolkit"]',
    title: '🧰 Toolkit Hub',
    description: 'Koleksi tools freelancer: Expense Tracker, Contracts, Rate Cards, Intake Forms, Notes, dan banyak lagi!',
    placement: 'right',
  },
  {
    target: '[data-tour="task-sidebar"]',
    title: '✅ Task & Project Management',
    description: 'Sidebar kanan ini untuk mengelola tugas. Ada Kanban board, task list, project tracker, time tracking, dan kalender — semua dalam satu tempat!',
    placement: 'left',
  },
  {
    target: '[data-tour="nav-reports"]',
    title: '📊 Laporan & Analitik',
    description: 'Lihat insight bisnis kamu — pendapatan, klien terbaik, dan tren. Buat keputusan berdasarkan data!',
    placement: 'right',
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isTaskSidebarOpen, setIsTaskSidebarOpen] = React.useState(true);
  const [isTaskSidebarMobileOpen, setIsTaskSidebarMobileOpen] = React.useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const toggleTaskSidebar = () => {
    setIsTaskSidebarOpen(!isTaskSidebarOpen);
  };

  const toggleTaskSidebarMobile = () => {
    setIsTaskSidebarMobileOpen(!isTaskSidebarMobileOpen);
  };

  return (
    <div
      className="flex min-h-screen w-full"
      style={{
        '--sidebar-width': isCollapsed ? '80px' : '260px',
        '--task-sidebar-width': isTaskSidebarOpen ? '76px' : '0px',
      } as React.CSSProperties}
    >
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} isMobileOpen={isMobileOpen} toggleMobileSidebar={toggleMobileSidebar} />
      <TaskManagementSidebar
        isDesktopOpen={isTaskSidebarOpen}
        isMobileOpen={isTaskSidebarMobileOpen}
        onToggleDesktop={toggleTaskSidebar}
        onToggleMobile={toggleTaskSidebarMobile}
      />

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[190] lg:hidden backdrop-blur-sm"
          onClick={toggleMobileSidebar}
        />
      )}
      {isTaskSidebarMobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[250] lg:hidden backdrop-blur-[1px]"
          onClick={toggleTaskSidebarMobile}
        />
      )}

      <div className="flex-1 min-w-0 lg:ml-[var(--sidebar-width)] lg:mr-[var(--task-sidebar-width)] min-h-screen transition-[margin-left,margin-right] duration-200 ml-0 mr-0 w-full flex flex-col">
        <Header toggleMobileSidebar={toggleMobileSidebar} />
        <div data-gsap-page className="p-6 pt-[calc(var(--header-height)+24px)] w-full mx-auto max-lg:p-4 max-lg:pt-[calc(var(--header-height)+16px)] max-sm:p-3 max-sm:pt-[calc(var(--header-height)+12px)]">
          {children}
        </div>
      </div>

      {/* Tour Guide - shows on first visit */}
      <TourGuide steps={TOUR_STEPS} storageKey="iq_tour_completed" />
    </div>
  );
}

