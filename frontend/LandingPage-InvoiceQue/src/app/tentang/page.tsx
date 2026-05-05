import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description:
    "Kenali InvoiceQu lebih dekat — misi, visi, dan tim di balik platform invoice #1 di Indonesia.",
  alternates: { canonical: "https://invoicequ.my.id/tentang" },
};

const values = [
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Inovasi",
    description: "Kami terus berinovasi untuk menghadirkan solusi terbaik bagi bisnis Indonesia.",
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Kepercayaan",
    description: "Keamanan dan privasi data pelanggan adalah prioritas utama kami.",
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Kolaborasi",
    description: "Kami percaya bahwa kerja sama tim menghasilkan produk yang lebih baik.",
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: "Dedikasi",
    description: "Setiap fitur yang kami bangun didasari oleh kebutuhan nyata pengguna.",
  },
];

const team = [
  { name: "Fahmi Bae", role: "Founder & CEO", avatar: "FB", color: "bg-red-500/20 text-red-400" },
  { name: "Rina Susanti", role: "Head of Product", avatar: "RS", color: "bg-blue-500/20 text-blue-400" },
  { name: "Eko Prasetyo", role: "Lead Engineer", avatar: "EP", color: "bg-emerald-500/20 text-emerald-400" },
  { name: "Dewi Lestari", role: "Head of Design", avatar: "DL", color: "bg-purple-500/20 text-purple-400" },
];

export default function TentangPage() {
  return (
    <PageLayout
      title="Tentang InvoiceQu"
      subtitle="Kami membangun platform invoice modern untuk membantu bisnis Indonesia tumbuh lebih cepat dan efisien."
      badge="TENTANG KAMI"
      breadcrumbs={[{ label: "Tentang Kami" }]}
    >
      {/* Story */}
      <div className="prose-section mb-20">
        <h2 className="text-2xl font-bold text-white mb-4">Cerita Kami</h2>
        <div className="space-y-4 text-white/50 leading-relaxed">
          <p>
            InvoiceQu lahir dari pengalaman langsung menghadapi kesulitan dalam mengelola invoice dan pembayaran untuk bisnis kecil dan menengah di Indonesia. Kami melihat bahwa proses invoicing yang seharusnya sederhana justru menjadi beban bagi banyak pengusaha.
          </p>
          <p>
            Didirikan pada tahun 2024, InvoiceQu hadir dengan misi sederhana: membuat pengelolaan invoice semudah mengirim pesan. Dengan teknologi modern dan pemahaman mendalam tentang kebutuhan bisnis lokal, kami membangun platform yang tidak hanya powerful, tapi juga intuitif.
          </p>
          <p>
            Saat ini, InvoiceQu telah dipercaya oleh ribuan bisnis dari berbagai industri — dari freelancer hingga perusahaan besar. Kami terus berkembang dan berinovasi untuk memberikan pengalaman terbaik bagi setiap pengguna.
          </p>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="grid md:grid-cols-2 gap-5 mb-20">
        <div className="glass-card rounded-2xl p-7">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-3">Visi</h3>
          <p className="text-sm text-white/50 leading-relaxed">
            Menjadi platform invoicing dan manajemen pembayaran terdepan di Asia Tenggara, membantu setiap bisnis mengelola keuangan dengan mudah dan efisien.
          </p>
        </div>
        <div className="glass-card rounded-2xl p-7">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-3">Misi</h3>
          <p className="text-sm text-white/50 leading-relaxed">
            Menyederhanakan proses invoicing dan pembayaran melalui teknologi modern, sehingga setiap bisnis — dari yang terkecil hingga terbesar — bisa fokus pada pertumbuhan.
          </p>
        </div>
      </div>

      {/* Values */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Nilai-Nilai Kami</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {values.map((value) => (
            <div key={value.title} className="glass-card rounded-2xl p-6">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
                {value.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{value.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{value.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Tim Kami</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {team.map((member) => (
            <div key={member.name} className="glass-card rounded-2xl p-6 text-center">
              <div className={`w-16 h-16 rounded-full ${member.color} flex items-center justify-center text-xl font-bold mx-auto mb-4`}>
                {member.avatar}
              </div>
              <h3 className="text-base font-bold text-white mb-1">{member.name}</h3>
              <p className="text-sm text-white/40">{member.role}</p>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
