import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import IdleDetector from "@/components/IdleDetector";
import AntiInspect from "@/components/AntiInspect";

const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "InvoiceQu - SaaS Invoice & Payment Link Platform",
  description: "Platform invoice dan payment link modern untuk bisnis Indonesia. Buat, kirim, dan lacak invoice dengan mudah.",
  keywords: "invoice, payment link, SaaS, bisnis, Indonesia",
};

import { GoogleOAuthProvider } from '@react-oauth/google';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={sora.variable}>
      <body className={sora.className}>
        <IdleDetector />
        <AntiInspect />
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "placeholder-client-id"}>
          <AuthProvider>
            <NotificationProvider>
              <ThemeProvider>
                {children}
              </ThemeProvider>
            </NotificationProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
