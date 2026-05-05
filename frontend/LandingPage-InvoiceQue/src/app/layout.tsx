import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import IdleDetector from "@/components/IdleDetector";
import AntiInspect from "@/components/AntiInspect";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#DC2626",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://invoicequ.my.id"),
  title: {
    default: "InvoiceQu — Platform Invoice & Payment Link #1 di Indonesia",
    template: "%s | InvoiceQu",
  },
  description:
    "Buat invoice profesional, kirim payment link instan, dan lacak pembayaran real-time. Platform SaaS invoice modern untuk bisnis Indonesia. Mulai gratis sekarang!",
  keywords: [
    "invoice online",
    "payment link",
    "invoice Indonesia",
    "buat invoice",
    "invoice gratis",
    "payment gateway",
    "faktur online",
    "kirim invoice",
    "lacak pembayaran",
    "SaaS invoice",
    "InvoiceQu",
    "invoice otomatis",
    "invoice digital",
    "pembayaran online",
  ],
  authors: [{ name: "InvoiceQu", url: "https://invoicequ.my.id" }],
  creator: "InvoiceQu",
  publisher: "InvoiceQu",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://invoicequ.my.id",
    siteName: "InvoiceQu",
    title: "InvoiceQu — Platform Invoice & Payment Link #1 di Indonesia",
    description:
      "Buat invoice profesional, kirim payment link instan, dan lacak pembayaran real-time. Platform SaaS invoice modern untuk bisnis Indonesia.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "InvoiceQu - Platform Invoice & Payment Link",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "InvoiceQu — Platform Invoice & Payment Link #1 di Indonesia",
    description:
      "Buat invoice profesional, kirim payment link instan, dan lacak pembayaran real-time.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://invoicequ.my.id",
  },
  category: "technology",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "InvoiceQu",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Platform SaaS modern untuk membuat invoice profesional, mengirim payment link, dan melacak pembayaran secara real-time.",
  url: "https://invoicequ.my.id",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "IDR",
    description: "Paket Gratis tersedia",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "1200",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${sora.variable} antialiased overflow-x-hidden`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-[#09090b] text-white font-[family-name:var(--font-inter)] overflow-x-hidden" suppressHydrationWarning>
        <IdleDetector />
        <AntiInspect />
        {children}
      </body>
    </html>
  );
}
