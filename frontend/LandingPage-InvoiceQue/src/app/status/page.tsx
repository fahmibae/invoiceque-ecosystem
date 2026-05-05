import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "Status Sistem",
  description: "Cek status operasional semua layanan InvoiceQu secara real-time.",
  alternates: { canonical: "https://invoicequ.my.id/status" },
};

const services = [
  { name: "Web Application", status: "Operational", uptime: "99.99%", color: "bg-emerald-500", textColor: "text-emerald-400" },
  { name: "API Gateway", status: "Operational", uptime: "99.98%", color: "bg-emerald-500", textColor: "text-emerald-400" },
  { name: "Payment Processing", status: "Operational", uptime: "99.99%", color: "bg-emerald-500", textColor: "text-emerald-400" },
  { name: "Invoice Generation", status: "Operational", uptime: "99.97%", color: "bg-emerald-500", textColor: "text-emerald-400" },
  { name: "Email Notifications", status: "Operational", uptime: "99.95%", color: "bg-emerald-500", textColor: "text-emerald-400" },
  { name: "WhatsApp Integration", status: "Operational", uptime: "99.90%", color: "bg-emerald-500", textColor: "text-emerald-400" },
  { name: "Database Cluster", status: "Operational", uptime: "99.99%", color: "bg-emerald-500", textColor: "text-emerald-400" },
  { name: "CDN & Static Assets", status: "Operational", uptime: "99.99%", color: "bg-emerald-500", textColor: "text-emerald-400" },
];

const incidents = [
  { date: "18 Apr 2026", title: "Penurunan performa API Gateway", desc: "Terjadi peningkatan latency pada API Gateway selama 15 menit. Masalah telah diselesaikan.", status: "Resolved", color: "text-emerald-400" },
  { date: "5 Apr 2026", title: "Maintenance terjadwal - Database upgrade", desc: "Maintenance terjadwal untuk upgrade database cluster. Downtime total: 3 menit.", status: "Completed", color: "text-blue-400" },
  { date: "20 Mar 2026", title: "Email notification delay", desc: "Terjadi keterlambatan pengiriman email notifikasi hingga 10 menit. Telah diperbaiki.", status: "Resolved", color: "text-emerald-400" },
];

export default function StatusPage() {
  return (
    <PageLayout title="Status Sistem" subtitle="Monitor status operasional semua layanan InvoiceQu secara real-time." badge="STATUS" breadcrumbs={[{ label: "Status Sistem" }]}>
      {/* Overall Status */}
      <div className="glass rounded-2xl p-6 mb-8 text-center border border-emerald-500/20">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-lg font-bold text-emerald-400">Semua Sistem Operasional</h2>
        </div>
        <p className="text-sm text-white/40">Terakhir diperbarui: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {/* Services */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-white mb-4">Layanan</h2>
        <div className="space-y-2">
          {services.map((s) => (
            <div key={s.name} className="glass-card !transform-none rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                <span className="text-sm font-medium text-white">{s.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/30 hidden sm:block">Uptime: {s.uptime}</span>
                <span className={`text-xs font-semibold ${s.textColor}`}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incident History */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Riwayat Insiden</h2>
        <div className="space-y-4">
          {incidents.map((inc, i) => (
            <div key={i} className="glass-card !transform-none rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white">{inc.title}</h3>
                <span className={`text-xs font-semibold ${inc.color}`}>{inc.status}</span>
              </div>
              <p className="text-xs text-white/40 mb-1">{inc.date}</p>
              <p className="text-sm text-white/50">{inc.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
