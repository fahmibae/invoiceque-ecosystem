import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "API Documentation",
  description: "Dokumentasi API InvoiceQue untuk developer. REST API untuk integrasi invoice, payment link, dan manajemen klien.",
  alternates: { canonical: "https://invoicequ.my.id/api-docs" },
};

const endpoints = [
  { method: "POST", path: "/api/v1/invoices", desc: "Buat invoice baru", color: "bg-emerald-500/20 text-emerald-400" },
  { method: "GET", path: "/api/v1/invoices", desc: "Daftar semua invoice", color: "bg-blue-500/20 text-blue-400" },
  { method: "GET", path: "/api/v1/invoices/:id", desc: "Detail invoice", color: "bg-blue-500/20 text-blue-400" },
  { method: "PUT", path: "/api/v1/invoices/:id", desc: "Update invoice", color: "bg-amber-500/20 text-amber-400" },
  { method: "DELETE", path: "/api/v1/invoices/:id", desc: "Hapus invoice", color: "bg-red-500/20 text-red-400" },
  { method: "POST", path: "/api/v1/payment-links", desc: "Buat payment link", color: "bg-emerald-500/20 text-emerald-400" },
  { method: "GET", path: "/api/v1/payment-links", desc: "Daftar payment link", color: "bg-blue-500/20 text-blue-400" },
  { method: "GET", path: "/api/v1/clients", desc: "Daftar klien", color: "bg-blue-500/20 text-blue-400" },
  { method: "POST", path: "/api/v1/clients", desc: "Tambah klien baru", color: "bg-emerald-500/20 text-emerald-400" },
];

export default function ApiDocsPage() {
  return (
    <PageLayout title="API Documentation" subtitle="REST API lengkap untuk mengintegrasikan InvoiceQu dengan sistem Anda." badge="API DOCS" breadcrumbs={[{ label: "API Docs" }]}>
      {/* Getting Started */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-white mb-4">Memulai</h2>
        <div className="glass-card rounded-xl p-6 space-y-4">
          <p className="text-sm text-white/50">Base URL untuk semua API request:</p>
          <code className="block bg-black/30 rounded-lg p-4 text-sm font-mono text-red-400 border border-white/5">https://api.invoicequ.my.id/v1</code>
          <p className="text-sm text-white/50">Autentikasi menggunakan API Key di header:</p>
          <code className="block bg-black/30 rounded-lg p-4 text-sm font-mono text-emerald-400 border border-white/5">Authorization: Bearer YOUR_API_KEY</code>
        </div>
      </div>

      {/* Endpoints */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-white mb-4">Endpoints</h2>
        <div className="space-y-2">
          {endpoints.map((ep, i) => (
            <div key={i} className="glass-card !transform-none rounded-xl p-4 flex items-center gap-4">
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono ${ep.color} min-w-[60px] text-center`}>{ep.method}</span>
              <code className="text-sm font-mono text-white/70 flex-1">{ep.path}</code>
              <span className="text-xs text-white/40 hidden sm:block">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Example */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Contoh Request</h2>
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">POST</span>
            <span className="text-xs text-white/50 font-mono">/api/v1/invoices</span>
          </div>
          <pre className="p-4 text-sm font-mono text-white/60 overflow-x-auto">{`curl -X POST https://api.invoicequ.my.id/v1/invoices \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "client_id": "cl_123",
    "items": [
      { "name": "Web Design", "qty": 1, "price": 5000000 }
    ],
    "due_date": "2026-05-01"
  }'`}</pre>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-white/40">Dokumentasi lengkap tersedia untuk pengguna paket Enterprise.</p>
        <a href="https://app.invoicequ.my.id/register?plan=enterprise" className="btn-primary mt-4 inline-flex">Hubungi Sales</a>
      </div>
    </PageLayout>
  );
}
