import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "Dokumentasi",
  description: "Dokumentasi lengkap InvoiceQu — panduan penggunaan, konfigurasi, dan referensi teknis.",
  alternates: { canonical: "https://invoicequ.my.id/dokumentasi" },
};

const sections = [
  {
    title: "Panduan Pengguna", icon: "📖", items: [
      { name: "Pengenalan InvoiceQu", desc: "Overview fitur dan cara kerja platform" },
      { name: "Membuat Akun", desc: "Registrasi dan setup profil bisnis awal" },
      { name: "Dashboard Overview", desc: "Memahami metrik dan navigasi dashboard" },
      { name: "Mengelola Invoice", desc: "Buat, edit, kirim, dan lacak invoice" },
    ]
  },
  {
    title: "Payment Link", icon: "💳", items: [
      { name: "Membuat Payment Link", desc: "Cara generate dan share payment link" },
      { name: "Konfigurasi Gateway", desc: "Setup Xendit, Midtrans, dan lainnya" },
      { name: "Webhook & Callback", desc: "Menerima notifikasi pembayaran otomatis" },
      { name: "Status & Tracking", desc: "Monitor status pembayaran real-time" },
    ]
  },
  {
    title: "Manajemen Klien", icon: "👥", items: [
      { name: "Tambah & Edit Klien", desc: "Mengelola database klien Anda" },
      { name: "Riwayat Transaksi", desc: "Lihat semua transaksi per klien" },
      { name: "Import/Export Data", desc: "Bulk import klien dari CSV/Excel" },
      { name: "Segmentasi Klien", desc: "Kategorisasi klien berdasarkan kriteria" },
    ]
  },
  {
    title: "API Reference", icon: "⚙️", items: [
      { name: "Authentication", desc: "API Key dan OAuth 2.0 setup" },
      { name: "Invoice Endpoints", desc: "CRUD operations untuk invoice" },
      { name: "Payment Endpoints", desc: "Payment link dan status API" },
      { name: "Webhooks", desc: "Event-driven notification setup" },
    ]
  },
];

export default function DokumentasiPage() {
  return (
    <PageLayout title="Dokumentasi" subtitle="Panduan lengkap untuk memaksimalkan penggunaan InvoiceQu." badge="DOKUMENTASI" breadcrumbs={[{ label: "Dokumentasi" }]}>
      <div className="space-y-8">
        {sections.map((sec) => (
          <div key={sec.title}>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>{sec.icon}</span> {sec.title}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {sec.items.map((item) => (
                <div key={item.name} className="glass-card !transform-none rounded-xl p-5 cursor-pointer group">
                  <h3 className="text-sm font-bold text-white mb-1 group-hover:text-red-400 transition-colors">{item.name}</h3>
                  <p className="text-xs text-white/40">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
