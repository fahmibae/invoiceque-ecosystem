import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Tips bisnis, update fitur, dan panduan terbaik seputar invoice dan manajemen keuangan dari tim InvoiceQu.",
  alternates: { canonical: "https://invoicequ.my.id/blog" },
};

const posts = [
  {
    slug: "cara-membuat-invoice-profesional",
    title: "Cara Membuat Invoice Profesional dalam 5 Menit",
    excerpt: "Panduan lengkap membuat invoice yang terlihat profesional dan meningkatkan tingkat pembayaran dari klien Anda.",
    category: "Tutorial",
    categoryColor: "bg-blue-500/20 text-blue-400",
    date: "20 Apr 2026",
    readTime: "5 menit",
  },
  {
    slug: "tips-mengelola-cashflow",
    title: "7 Tips Mengelola Cash Flow untuk UMKM",
    excerpt: "Cash flow adalah nyawa bisnis. Pelajari cara mengelolanya dengan efektif agar bisnis Anda tetap sehat.",
    category: "Bisnis",
    categoryColor: "bg-emerald-500/20 text-emerald-400",
    date: "15 Apr 2026",
    readTime: "8 menit",
  },
  {
    slug: "payment-link-vs-invoice",
    title: "Payment Link vs Invoice: Kapan Menggunakan Masing-Masing?",
    excerpt: "Kedua metode memiliki kelebihan dan kekurangan. Pelajari kapan sebaiknya menggunakan payment link dan kapan menggunakan invoice.",
    category: "Panduan",
    categoryColor: "bg-purple-500/20 text-purple-400",
    date: "10 Apr 2026",
    readTime: "6 menit",
  },
  {
    slug: "fitur-baru-dashboard-analytics",
    title: "Fitur Baru: Dashboard Analytics yang Lebih Powerful",
    excerpt: "Kami meluncurkan dashboard analytics baru dengan grafik interaktif, filter lanjutan, dan export laporan otomatis.",
    category: "Update",
    categoryColor: "bg-red-500/20 text-red-400",
    date: "5 Apr 2026",
    readTime: "3 menit",
  },
  {
    slug: "integrasi-xendit",
    title: "Panduan Lengkap Integrasi Xendit di InvoiceQu",
    excerpt: "Langkah demi langkah mengintegrasikan payment gateway Xendit untuk menerima pembayaran otomatis dari invoice Anda.",
    category: "Tutorial",
    categoryColor: "bg-blue-500/20 text-blue-400",
    date: "1 Apr 2026",
    readTime: "10 menit",
  },
  {
    slug: "pajak-invoice-indonesia",
    title: "Memahami Pajak Invoice di Indonesia: PPN & PPh",
    excerpt: "Panduan lengkap tentang kewajiban pajak terkait invoice, termasuk perhitungan PPN dan PPh untuk bisnis.",
    category: "Bisnis",
    categoryColor: "bg-emerald-500/20 text-emerald-400",
    date: "25 Mar 2026",
    readTime: "12 menit",
  },
];

export default function BlogPage() {
  return (
    <PageLayout
      title="Blog InvoiceQu"
      subtitle="Tips bisnis, update fitur, dan panduan terbaik seputar invoice dan manajemen keuangan."
      badge="BLOG"
      breadcrumbs={[{ label: "Blog" }]}
    >
      <div className="grid md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <article key={post.slug} className="glass-card rounded-2xl overflow-hidden group">
            {/* Colored Top Bar */}
            <div className="h-1 bg-gradient-to-r from-red-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-7">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${post.categoryColor}`}>
                  {post.category}
                </span>
                <span className="text-xs text-white/30">{post.date}</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-3 group-hover:text-red-400 transition-colors leading-snug">
                <Link href={`/blog/${post.slug}`} className="hover:no-underline">
                  {post.title}
                </Link>
              </h2>
              <p className="text-sm text-white/45 leading-relaxed mb-4">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/30 flex items-center gap-1.5">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {post.readTime}
                </span>
                <Link href={`/blog/${post.slug}`} className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors">
                  Baca Selengkapnya →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageLayout>
  );
}
