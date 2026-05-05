import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "Karir",
  description: "Bergabunglah dengan tim InvoiceQu! Lihat lowongan terbaru dan bangun karir di startup fintech Indonesia.",
  alternates: { canonical: "https://invoicequ.my.id/karir" },
};

const openings = [
  { title: "Senior Frontend Engineer", dept: "Engineering", loc: "Remote", type: "Full-time", tags: ["React", "Next.js", "TypeScript"] },
  { title: "Backend Engineer (Go)", dept: "Engineering", loc: "Remote", type: "Full-time", tags: ["Go", "PostgreSQL", "REST API"] },
  { title: "Product Designer", dept: "Design", loc: "Jakarta / Remote", type: "Full-time", tags: ["Figma", "UI/UX"] },
  { title: "Customer Success Manager", dept: "Customer Success", loc: "Jakarta", type: "Full-time", tags: ["SaaS", "CRM"] },
  { title: "Content Marketing Specialist", dept: "Marketing", loc: "Remote", type: "Full-time", tags: ["SEO", "Copywriting"] },
];

const perks = [
  { emoji: "🏠", title: "Remote-first", desc: "Kerja dari mana saja di Indonesia" },
  { emoji: "💰", title: "Gaji Kompetitif", desc: "Kompensasi di atas rata-rata industri" },
  { emoji: "📈", title: "Stock Options", desc: "Kesempatan memiliki saham perusahaan" },
  { emoji: "🏥", title: "Health Insurance", desc: "Asuransi kesehatan karyawan & keluarga" },
  { emoji: "📚", title: "Learning Budget", desc: "Budget tahunan untuk belajar" },
  { emoji: "🏖️", title: "Flexible Leave", desc: "Kebijakan cuti yang fleksibel" },
];

export default function KarirPage() {
  return (
    <PageLayout title="Bergabung dengan Kami" subtitle="Bangun karir Anda di startup fintech yang sedang berkembang pesat." badge="KARIR" breadcrumbs={[{ label: "Karir" }]}>
      <div className="mb-20">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Mengapa InvoiceQu?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {perks.map((p) => (
            <div key={p.title} className="glass-card rounded-xl p-5 text-center">
              <div className="text-3xl mb-3">{p.emoji}</div>
              <h3 className="text-sm font-bold text-white mb-1">{p.title}</h3>
              <p className="text-xs text-white/40">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Posisi Terbuka</h2>
        <div className="space-y-4">
          {openings.map((j) => (
            <div key={j.title} className="glass-card rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
              <div className="flex-1">
                <h3 className="text-base font-bold text-white mb-2 group-hover:text-red-400 transition-colors">{j.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/40 mb-3">
                  <span>{j.dept}</span><span>•</span><span>{j.loc}</span><span>•</span><span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{j.type}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {j.tags.map((t) => (<span key={t} className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-xs font-medium">{t}</span>))}
                </div>
              </div>
              <a href={`mailto:careers@invoicequ.my.id?subject=Lamaran: ${j.title}`} className="btn-primary !py-2.5 !px-5 !text-sm shrink-0">Lamar</a>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center glass rounded-xl p-6">
          <p className="text-sm text-white/50 mb-1">Tidak menemukan posisi yang cocok?</p>
          <p className="text-sm text-white/70">Kirim CV ke <a href="mailto:careers@invoicequ.my.id" className="text-red-400 font-semibold hover:underline">careers@invoicequ.my.id</a></p>
        </div>
      </div>
    </PageLayout>
  );
}
