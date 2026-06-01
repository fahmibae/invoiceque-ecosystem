"use client";

import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import TaskManagementSidebar from "./TaskManagementSidebar";
import TourGuide, { type TourStep } from "@/components/ui/TourGuide";
import { useLanguage } from "@/context/LanguageContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isTaskSidebarOpen, setIsTaskSidebarOpen] = React.useState(true);
  const [isTaskSidebarMobileOpen, setIsTaskSidebarMobileOpen] =
    React.useState(false);

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

  const tourSteps = React.useMemo<TourStep[]>(
    () => [
      {
        target: '[data-tour="nav-"]',
        title: t("tour.welcome.title"),
        description: t("tour.welcome.description"),
        placement: "right",
      },
      {
        target: '[data-tour="nav-invoices"]',
        title: t("tour.invoices.title"),
        description: t("tour.invoices.description"),
        placement: "right",
      },
      {
        target: '[data-tour="nav-quotations"]',
        title: t("tour.quotations.title"),
        description: t("tour.quotations.description"),
        placement: "right",
      },
      {
        target: '[data-tour="nav-clients"]',
        title: t("tour.clients.title"),
        description: t("tour.clients.description"),
        placement: "right",
      },
      {
        target: '[data-tour="nav-toolkit"]',
        title: t("tour.toolkit.title"),
        description: t("tour.toolkit.description"),
        placement: "left",
      },
      {
        target: '[data-tour="task-sidebar"]',
        title: t("tour.taskSidebar.title"),
        description: t("tour.taskSidebar.description"),
        placement: "left",
      },
      {
        target: '[data-tour="nav-reports"]',
        title: t("tour.reports.title"),
        description: t("tour.reports.description"),
        placement: "right",
      },
    ],
    [t],
  );

  return (
    <div
      className="flex min-h-screen w-full"
      style={
        {
          "--sidebar-width": isCollapsed ? "80px" : "260px",
          "--task-sidebar-width": isTaskSidebarOpen ? "76px" : "0px",
        } as React.CSSProperties
      }
    >
      <Sidebar
        isCollapsed={isCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileOpen={isMobileOpen}
        toggleMobileSidebar={toggleMobileSidebar}
      />
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

      <div className="flex-1 min-w-0 lg:ml-[var(--sidebar-width)] lg:mr-[var(--task-sidebar-width)] min-h-screen transition-[margin-left,margin-right] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ml-0 mr-0 w-full flex flex-col">
        <Header toggleMobileSidebar={toggleMobileSidebar} />
        <div
          data-gsap-page
          className="p-6 pt-[calc(var(--header-height)+24px)] w-full mx-auto max-lg:p-4 max-lg:pt-[calc(var(--header-height)+16px)] max-sm:p-3 max-sm:pt-[calc(var(--header-height)+12px)]"
        >
          {children}
        </div>
      </div>

      {/* Tour Guide - shows on first visit */}
      <TourGuide steps={tourSteps} storageKey="iq_tour_completed" />
    </div>
  );
}
