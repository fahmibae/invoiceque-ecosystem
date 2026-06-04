import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import IdleDetector from "@/components/IdleDetector";
import AntiInspect from "@/components/AntiInspect";
import Script from "next/script";

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
    default: "InvoiceQu",
    template: "%s | InvoiceQu",
  },
  description:
    "Kelola tugas, proyek, invoice, payment link, dan reminder pembayaran dalam satu workflow. Platform SaaS invoice modern untuk bisnis jasa Indonesia. Mulai gratis sekarang!",
  applicationName: "InvoiceQu",
  keywords: [
    "invoice online",
    "payment link",
    "invoice Indonesia",
    "buat invoice",
    "invoice gratis",
    "payment gateway",
    "manajemen tugas",
    "task management",
    "time tracking",
    "project billing",
    "task to invoice",
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
    title: "InvoiceQu",
    description:
      "Kelola tugas, proyek, invoice, payment link, dan reminder pembayaran dalam satu workflow. Platform SaaS invoice modern untuk bisnis jasa Indonesia.",
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
    title: "InvoiceQu",
    description:
      "Kelola tugas, invoice, payment link, dan pembayaran dalam satu workflow.",
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

// WebSite schema — sinyal utama agar Google menampilkan "InvoiceQu" sebagai nama situs di hasil pencarian
const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "InvoiceQu",
  alternateName: ["InvoiceQu Indonesia", "invoicequ"],
  url: "https://invoicequ.my.id",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://invoicequ.my.id/?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

// Organization schema — memperkuat brand identity di Google
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "InvoiceQu",
  url: "https://invoicequ.my.id",
  logo: "https://invoicequ.my.id/logo.png",
  sameAs: [],
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "InvoiceQu",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Platform SaaS modern untuk mengelola tugas, membuat invoice profesional, mengirim payment link, dan melacak pembayaran secara real-time.",
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
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="id" className={`${sora.variable} antialiased overflow-x-hidden`} suppressHydrationWarning>
      <head>
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-[#09090b] text-white font-[family-name:var(--font-sora)] overflow-x-hidden" suppressHydrationWarning>
        <IdleDetector />
        <AntiInspect />
        {children}
      </body>
    </html>
  );
}
