import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "Keamanan",
  description: "Pelajari bagaimana InvoiceQu melindungi data dan transaksi bisnis Anda dengan standar keamanan industri.",
  alternates: { canonical: "https://invoicequ.my.id/keamanan" },
};

const features = [
  { icon: "🔐", title: "Enkripsi End-to-End", desc: "Semua data dienkripsi menggunakan TLS 1.3 saat transit dan AES-256 saat disimpan." },
  { icon: "🛡️", title: "Autentikasi Multi-Faktor", desc: "2FA tersedia untuk semua akun menggunakan authenticator app atau SMS." },
  { icon: "🏗️", title: "Infrastruktur Aman", desc: "Hosting di data center tier-3 dengan redundansi dan failover otomatis." },
  { icon: "📋", title: "Audit Log", desc: "Semua aktivitas akun dicatat untuk transparansi dan keamanan." },
  { icon: "🔄", title: "Backup Otomatis", desc: "Backup harian otomatis dengan retensi 30 hari dan disaster recovery plan." },
  { icon: "👁️", title: "Monitoring 24/7", desc: "Tim keamanan kami memantau sistem secara real-time untuk mendeteksi ancaman." },
  { icon: "🧪", title: "Penetration Testing", desc: "Pengujian keamanan rutin oleh pihak ketiga independen." },
  { icon: "📜", title: "Compliance", desc: "Mematuhi standar keamanan data dan regulasi privasi Indonesia." },
];

export default function KeamananPage() {
  return (
    <PageLayout title="Keamanan" subtitle="Data bisnis Anda adalah prioritas utama kami. Pelajari langkah-langkah keamanan yang kami terapkan." badge="KEAMANAN" breadcrumbs={[{ label: "Keamanan" }]}>
      <div className="grid sm:grid-cols-2 gap-5 mb-16">
        {features.map((f) => (
          <div key={f.title} className="glass-card rounded-xl p-6">
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
            <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Report */}
      <div className="glass rounded-2xl p-8 text-center">
        <h2 className="text-xl font-bold text-white mb-3">Menemukan Kerentanan?</h2>
        <p className="text-sm text-white/50 mb-6">Kami menghargai laporan keamanan dari komunitas. Jika Anda menemukan kerentanan, laporkan secara bertanggung jawab.</p>
        <a href="mailto:security@invoicequ.my.id" className="btn-primary">Laporkan Kerentanan</a>
      </div>
    </PageLayout>
  );
}
