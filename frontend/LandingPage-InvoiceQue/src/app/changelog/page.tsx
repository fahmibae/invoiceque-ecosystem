import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Update terbaru, fitur baru, dan perbaikan di InvoiceQu. Lihat semua perubahan yang kami lakukan.",
  alternates: { canonical: "https://invoicequ.my.id/changelog" },
};

const releases = [
  { version: "2.4.0", date: "20 Apr 2026", tag: "Fitur Baru", tagColor: "bg-emerald-500/20 text-emerald-400", items: ["Dashboard Analytics v2 dengan grafik interaktif", "Export laporan ke CSV dan PDF", "Filter lanjutan di halaman invoice", "Dark mode untuk halaman payment link publik"] },
  { version: "2.3.0", date: "5 Apr 2026", tag: "Fitur Baru", tagColor: "bg-emerald-500/20 text-emerald-400", items: ["Integrasi WhatsApp untuk notifikasi", "Share payment link via WhatsApp, Email, SMS", "Kustomisasi branding pada invoice", "API rate limiting improvement"] },
  { version: "2.2.1", date: "25 Mar 2026", tag: "Perbaikan", tagColor: "bg-blue-500/20 text-blue-400", items: ["Fix: Kalkulasi PPN pada invoice multi-item", "Fix: Loading state di mobile dashboard", "Improvement: Kecepatan load halaman klien", "Fix: Export PDF encoding untuk karakter khusus"] },
  { version: "2.2.0", date: "10 Mar 2026", tag: "Fitur Baru", tagColor: "bg-emerald-500/20 text-emerald-400", items: ["Manajemen klien dengan riwayat transaksi", "Recurring invoice (invoice berulang)", "Pengingat otomatis untuk invoice overdue", "Google OAuth login"] },
  { version: "2.1.0", date: "20 Feb 2026", tag: "Fitur Baru", tagColor: "bg-emerald-500/20 text-emerald-400", items: ["Payment link dengan Xendit integration", "Real-time payment status tracking", "Webhook untuk notifikasi pembayaran", "Multi-currency support (IDR, USD)"] },
  { version: "2.0.0", date: "1 Feb 2026", tag: "Major Release", tagColor: "bg-red-500/20 text-red-400", items: ["Redesign total UI/UX dashboard", "App Router migration (Next.js 16)", "Performa 3x lebih cepat", "Subscription & billing system"] },
];

export default function ChangelogPage() {
  return (
    <PageLayout title="Changelog" subtitle="Semua update, fitur baru, dan perbaikan yang kami lakukan di InvoiceQu." badge="CHANGELOG" breadcrumbs={[{ label: "Changelog" }]}>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/5 hidden md:block" />
        <div className="space-y-8">
          {releases.map((r) => (
            <div key={r.version} className="relative md:pl-10">
              <div className="absolute left-0 top-2 w-[15px] h-[15px] rounded-full bg-red-500/20 border-2 border-red-500/50 hidden md:block" />
              <div className="glass-card rounded-xl p-6">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="text-base font-bold text-white font-mono">v{r.version}</span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${r.tagColor}`}>{r.tag}</span>
                  <span className="text-xs text-white/30">{r.date}</span>
                </div>
                <ul className="space-y-2">
                  {r.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/50">
                      <span className="text-red-400 mt-1">•</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
