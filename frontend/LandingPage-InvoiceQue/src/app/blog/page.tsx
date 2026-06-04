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
    slug: "portal-klien-invoicequ",
    title: "Portal Klien InvoiceQu: Berikan Kemudahan Transaksi untuk Klien Anda",
    excerpt: "Hadirkan halaman portal khusus bagi klien Anda untuk melihat riwayat tagihan, menyetujui penawaran, menandatanganinya secara online, dan membayar langsung.",
    category: "Fitur",
    categoryColor: "bg-red-500/20 text-red-400",
    date: "5 Jun 2026",
    readTime: "6 menit",
  },
  {
    slug: "client-intake-forms-otomatis",
    title: "Cara Otomatis Onboard Klien Baru Menggunakan Client Intake Forms",
    excerpt: "Dapatkan informasi kebutuhan proyek, file brief, dan data kontak dari calon klien secara otomatis dan rapi tanpa chat manual bolak-balik.",
    category: "Tutorial",
    categoryColor: "bg-blue-500/20 text-blue-400",
    date: "4 Jun 2026",
    readTime: "5 menit",
  },
  {
    slug: "kelola-pengeluaran-expenses-bisnis",
    title: "Pantau Pengeluaran & Profitabilitas Bisnis dengan Fitur Expenses",
    excerpt: "Jangan hanya mencatat pendapatan. Lacak setiap pengeluaran operasional bisnis Anda untuk mengetahui laba bersih yang sesungguhnya secara otomatis.",
    category: "Bisnis",
    categoryColor: "bg-emerald-500/20 text-emerald-400",
    date: "4 Jun 2026",
    readTime: "7 menit",
  },
  {
    slug: "brand-kit-invoice-kustom",
    title: "Kustomisasi Logo & Warna Invoice Anda dengan Fitur Brand Kits",
    excerpt: "Bangun reputasi profesional bisnis dengan menyelaraskan warna, logo, dan font kustom pada invoice serta Portal Klien.",
    category: "Tutorial",
    categoryColor: "bg-blue-500/20 text-blue-400",
    date: "25 Mei 2026",
    readTime: "6 menit",
  },
  {
    slug: "quotation-proposal-online",
    title: "Buat Proposal & Penawaran Harga Profesional Sekali Klik",
    excerpt: "Tingkatkan tingkat persetujuan proyek dengan membuat Quotation online yang interaktif dan dapat langsung disetujui klien.",
    category: "Panduan",
    categoryColor: "bg-purple-500/20 text-purple-400",
    date: "22 Mei 2026",
    readTime: "5 menit",
  },
  {
    slug: "penjadwalan-meeting-otomatis",
    title: "Integrasi Jadwal Meeting & Google Meet Otomatis Tanpa Ribet",
    excerpt: "Gabungkan pemesanan sesi konsultasi dengan pembuatan link Google Meet otomatis dan penagihan biaya pertemuan langsung.",
    category: "Fitur",
    categoryColor: "bg-red-500/20 text-red-400",
    date: "20 Mei 2026",
    readTime: "5 menit",
  },
  {
    slug: "kontrak-digital-tanda-tangan",
    title: "Kelola Kontrak Kerja Sama & Tanda Tangan Digital Secara Online",
    excerpt: "Buat perjanjian kerja sama (MoU) atau kontrak proyek, kirim ke klien, dan terima tanda tangan digital legal langsung dari Portal Klien.",
    category: "Panduan",
    categoryColor: "bg-purple-500/20 text-purple-400",
    date: "3 Jun 2026",
    readTime: "7 menit",
  },
  {
    slug: "fitur-time-tracking-freelancer",
    title: "Ubah Jam Kerja Menjadi Invoice Sekali Klik dengan Time Tracker",
    excerpt: "Pantau waktu kerja produktif Anda untuk setiap proyek klien dan konversikan lembar waktu menjadi invoice tagihan secara otomatis.",
    category: "Tutorial",
    categoryColor: "bg-blue-500/20 text-blue-400",
    date: "1 Jun 2026",
    readTime: "6 menit",
  },
  {
    slug: "fitur-chasers-reminder-otomatis",
    title: "Kirim Tagihan Tanpa Sungkan: Fitur Chasers Otomatis InvoiceQu",
    excerpt: "Lelah menagih klien yang telat bayar? Aktifkan fitur Chasers untuk mengirim pengingat tagihan otomatis secara terjadwal.",
    category: "Fitur",
    categoryColor: "bg-red-500/20 text-red-400",
    date: "28 Mei 2026",
    readTime: "5 menit",
  },
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
];const POSTS_PER_PAGE = 6;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function BlogPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page, 10) : 1;
  const validPage = isNaN(currentPage) || currentPage < 1 ? 1 : currentPage;

  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const paginatedPosts = posts.slice((validPage - 1) * POSTS_PER_PAGE, validPage * POSTS_PER_PAGE);

  return (
    <PageLayout
      title="Blog InvoiceQu"
      subtitle="Tips bisnis, update fitur, dan panduan terbaik seputar invoice dan manajemen keuangan."
      badge="BLOG"
      breadcrumbs={[{ label: "Blog" }]}
    >
      <div className="grid md:grid-cols-2 gap-6">
        {paginatedPosts.map((post) => (
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12 pb-6">
          {validPage > 1 ? (
            <Link
              href={`/blog?page=${validPage - 1}`}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-sm font-medium text-white/80 transition-all"
            >
              ← Sebelum
            </Link>
          ) : (
            <span className="px-4 py-2 rounded-xl border border-white/5 bg-white/5 text-sm font-medium text-white/20 cursor-not-allowed">
              ← Sebelum
            </span>
          )}

          {Array.from({ length: totalPages }, (_, i) => {
            const pageNum = i + 1;
            const isActive = pageNum === validPage;
            return (
              <Link
                key={pageNum}
                href={`/blog?page=${pageNum}`}
                className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-red-600 to-red-500 text-white font-bold shadow-md shadow-red-500/20"
                    : "border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white/85"
                }`}
              >
                {pageNum}
              </Link>
            );
          })}

          {validPage < totalPages ? (
            <Link
              href={`/blog?page=${validPage + 1}`}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-sm font-medium text-white/80 transition-all"
            >
              Berikut →
            </Link>
          ) : (
            <span className="px-4 py-2 rounded-xl border border-white/5 bg-white/5 text-sm font-medium text-white/20 cursor-not-allowed">
              Berikut →
            </span>
          )}
        </div>
      )}
    </PageLayout>
  );
}
