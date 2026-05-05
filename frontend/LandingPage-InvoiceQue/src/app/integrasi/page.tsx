import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "Integrasi",
  description: "Hubungkan InvoiceQu dengan tools favorit Anda — payment gateway, accounting software, dan lainnya.",
  alternates: { canonical: "https://invoicequ.my.id/integrasi" },
};

const integrations = [
  { name: "Xendit", category: "Payment Gateway", desc: "Terima pembayaran via transfer bank, e-wallet, kartu kredit, dan QRIS.", status: "Tersedia", color: "bg-blue-500/20 text-blue-400" },
  { name: "Paypal", category: "Payment Gateway", desc: "Payment gateway populer dengan berbagai metode pembayaran internasional.", status: "Tersedia", color: "bg-blue-500/20 text-blue-400" },
  { name: "WhatsApp", category: "Komunikasi", desc: "Kirim invoice dan notifikasi pembayaran langsung via WhatsApp.", status: "Tersedia", color: "bg-emerald-500/20 text-emerald-400" },
  { name: "Google Sheets", category: "Produktivitas", desc: "Sync data invoice dan pembayaran otomatis ke Google Sheets.", status: "Segera Hadir", color: "bg-amber-500/20 text-amber-400" },
  { name: "Jurnal.id", category: "Akuntansi", desc: "Sinkronisasi otomatis dengan software akuntansi Jurnal.id.", status: "Segera Hadir", color: "bg-amber-500/20 text-amber-400" },
  { name: "Zapier", category: "Otomasi", desc: "Hubungkan InvoiceQu dengan 5000+ aplikasi melalui Zapier.", status: "Segera Hadir", color: "bg-amber-500/20 text-amber-400" },
  { name: "Slack", category: "Komunikasi", desc: "Dapatkan notifikasi pembayaran dan update invoice di Slack.", status: "Segera Hadir", color: "bg-amber-500/20 text-amber-400" },
  { name: "BuatinAI", category: "AI Builder Invoice", desc: "Integrasi dengan AI Builder Invoice untuk membuat desain invoice otomatis.", status: "Direncanakan", color: "bg-purple-500/20 text-purple-400" },
];

export default function IntegrasiPage() {
  return (
    <PageLayout title="Integrasi" subtitle="Hubungkan InvoiceQu dengan tools favorit Anda untuk workflow yang lebih efisien." badge="INTEGRASI" breadcrumbs={[{ label: "Integrasi" }]}>
      <div className="grid sm:grid-cols-2 gap-5">
        {integrations.map((int) => (
          <div key={int.name} className="glass-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">{int.name}</h3>
              <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${int.color}`}>{int.status}</span>
            </div>
            <p className="text-xs text-white/40 mb-2">{int.category}</p>
            <p className="text-sm text-white/50 leading-relaxed">{int.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 text-center glass rounded-xl p-6">
        <p className="text-sm text-white/50 mb-1">Butuh integrasi khusus?</p>
        <p className="text-sm text-white/70">Hubungi kami di <a href="mailto:integrations@invoicequ.my.id" className="text-red-400 font-semibold hover:underline">integrations@invoicequ.my.id</a></p>
      </div>
    </PageLayout>
  );
}
