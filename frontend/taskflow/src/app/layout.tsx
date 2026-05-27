import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider } from "@/context/SidebarContext";
import DashboardLayout from "@/components/DashboardLayout";

export const metadata: Metadata = {
  title: "TaskFlow - Freelancer Task Management",
  description: "Platform manajemen tugas untuk freelancer profesional. Kelola proyek, tugas, klien, dan waktu kerja Anda dengan mudah.",
  keywords: ["task management", "freelancer", "project management", "time tracking"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SidebarProvider>
            <DashboardLayout>
              {children}
            </DashboardLayout>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
