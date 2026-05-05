import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "Pusat Bantuan",
  description: "Temukan jawaban untuk pertanyaan Anda tentang InvoiceQu. Panduan, tutorial, dan cara menghubungi support.",
  alternates: { canonical: "https://invoicequ.my.id/bantuan" },
};

const categories = [
  { title: "Memulai", icon: "🚀", articles: ["Cara membuat akun InvoiceQu", "Setup profil bisnis", "Menambahkan klien pertama", "Membuat invoice pertama"] },
  { title: "Invoice", icon: "📄", articles: ["Membuat dan mengirim invoice", "Kustomisasi template invoice", "Menambahkan PPN/pajak", "Recurring invoice"] },
  { title: "Payment Link", icon: "🔗", articles: ["Membuat payment link", "Integrasi payment gateway", "Tracking status pembayaran", "Share ke WhatsApp/Email"] },
  { title: "Akun & Billing", icon: "👤", articles: ["Mengelola subscription", "Upgrade/downgrade paket", "Metode pembayaran", "Invoice subscription"] },
  { title: "Keamanan", icon: "🔒", articles: ["Mengaktifkan 2FA", "Reset password", "Mengelola sesi login", "Kebijakan data"] },
  { title: "Troubleshooting", icon: "🔧", articles: ["Invoice tidak terkirim", "Payment link error", "Masalah login", "Export gagal"] },
];

export default function BantuanPage() {
  return (
    <PageLayout title="Pusat Bantuan" subtitle="Temukan jawaban untuk pertanyaan Anda atau hubungi tim support kami." badge="BANTUAN" breadcrumbs={[{ label: "Pusat Bantuan" }]}>
      {/* Search */}
      <div className="mb-12">
        <div className="glass-card rounded-xl p-1">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Cari artikel bantuan..." className="w-full bg-transparent text-white placeholder:text-white/30 py-4 pl-12 pr-4 outline-none text-sm" />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
        {categories.map((cat) => (
          <div key={cat.title} className="glass-card rounded-xl p-6">
            <div className="text-2xl mb-3">{cat.icon}</div>
            <h3 className="text-base font-bold text-white mb-3">{cat.title}</h3>
            <ul className="space-y-2">
              {cat.articles.map((a) => (
                <li key={a} className="text-sm text-white/45 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-2">
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Contact Support */}
      <div className="glass rounded-2xl p-8 text-center">
        <h2 className="text-xl font-bold text-white mb-3">Masih Butuh Bantuan?</h2>
        <p className="text-sm text-white/50 mb-6">Tim support kami siap membantu Anda 24/7.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="mailto:support@invoicequ.my.id" className="btn-primary">Email Support</a>
          <a href="https://wa.me/6281234567890" className="btn-secondary">Chat WhatsApp</a>
        </div>
      </div>
    </PageLayout>
  );
}
