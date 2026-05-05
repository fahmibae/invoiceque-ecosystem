import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
});


export const metadata: Metadata = {
  title: "InvoiceQu Admin — Control Center",
  description: "Admin panel untuk mengelola seluruh ekosistem InvoiceQu. Monitor users, invoices, subscriptions, dan analytics.",
  keywords: "admin, invoicequ, management, dashboard",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${sora.variable}`}>
      <body className={sora.className} suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
