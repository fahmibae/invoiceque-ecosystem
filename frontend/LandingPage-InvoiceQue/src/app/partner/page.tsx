import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "Partner",
  description: "Jadilah partner InvoiceQu. Program kemitraan untuk reseller, integrator, dan agensi di Indonesia.",
  alternates: { canonical: "https://invoicequ.my.id/partner" },
};

const programs = [
  { title: "Reseller Partner", desc: "Jual InvoiceQu ke klien Anda dan dapatkan komisi recurring hingga 30% dari setiap subscription.", icon: "💼", benefits: ["Komisi 30% recurring", "Training & sertifikasi", "Material marketing", "Dashboard partner"] },
  { title: "Integration Partner", desc: "Integrasikan InvoiceQu dengan platform Anda melalui API. Ideal untuk software house & SaaS.", icon: "🔗", benefits: ["API access prioritas", "Co-marketing", "Technical support", "Revenue sharing"] },
  { title: "Agency Partner", desc: "Bantu klien Anda mengelola invoice & pembayaran. Cocok untuk agensi digital & konsultan.", icon: "🏢", benefits: ["Multi-client dashboard", "White-label option", "Dedicated support", "Priority onboarding"] },
];

export default function PartnerPage() {
  return (
    <PageLayout title="Program Kemitraan" subtitle="Tumbuh bersama InvoiceQu. Pilih program partner yang sesuai dengan bisnis Anda." badge="PARTNER" breadcrumbs={[{ label: "Partner" }]}>
      <div className="grid md:grid-cols-3 gap-5 mb-16">
        {programs.map((p) => (
          <div key={p.title} className="glass-card rounded-2xl p-7">
            <div className="text-4xl mb-4">{p.icon}</div>
            <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
            <p className="text-sm text-white/45 leading-relaxed mb-5">{p.desc}</p>
            <ul className="space-y-2">
              {p.benefits.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-white/60">
                  <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="text-center glass rounded-2xl p-8">
        <h2 className="text-xl font-bold text-white mb-3">Tertarik Menjadi Partner?</h2>
        <p className="text-sm text-white/50 mb-6">Hubungi tim partnership kami untuk informasi lebih lanjut.</p>
        <a href="mailto:partner@invoicequ.my.id" className="btn-primary">Hubungi Tim Partner</a>
      </div>
    </PageLayout>
  );
}
