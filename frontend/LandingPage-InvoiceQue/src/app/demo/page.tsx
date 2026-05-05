import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "Lihat Demo",
  description: "Dapatkan akses demo aplikasi live InvoiceQu dengan mengisi form di bawah ini.",
  alternates: { canonical: "https://invoicequ.my.id/demo" },
};

export default function DemoPage() {
  return (
    <PageLayout
      title="Lihat Demo InvoiceQu"
      subtitle="Isi form di bawah ini dan kami akan segera mengirimkan akses ke demo aplikasi live ke email Anda."
      badge="DEMO APLIKASI"
      breadcrumbs={[{ label: "Lihat Demo" }]}
    >
      <div className="max-w-2xl mx-auto glass-card rounded-2xl p-8 mb-12">
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium text-white/80">Nama Lengkap <span className="text-red-400">*</span></label>
              <input type="text" id="fullName" required className="w-full bg-[#111113] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-white/80">Email Perusahaan <span className="text-red-400">*</span></label>
              <input type="email" id="email" required className="w-full bg-[#111113] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all" placeholder="john@perusahaan.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="companyName" className="text-sm font-medium text-white/80">Nama Perusahaan <span className="text-red-400">*</span></label>
              <input type="text" id="companyName" required className="w-full bg-[#111113] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all" placeholder="PT Maju Bersama" />
            </div>
            <div className="space-y-2">
              <label htmlFor="position" className="text-sm font-medium text-white/80">Jabatan <span className="text-red-400">*</span></label>
              <input type="text" id="position" required className="w-full bg-[#111113] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all" placeholder="CEO / Manager" />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="whatsapp" className="text-sm font-medium text-white/80">Nomor WhatsApp (Opsional)</label>
            <input type="tel" id="whatsapp" className="w-full bg-[#111113] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all" placeholder="081234567890" />
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium text-white/80">Apa yang ingin Anda ketahui dari InvoiceQu? (Opsional)</label>
            <textarea id="message" rows={4} className="w-full bg-[#111113] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all resize-none" placeholder="Ceritakan sedikit tentang kebutuhan perusahaan Anda..."></textarea>
          </div>

          <button type="submit" className="w-full btn-primary justify-center py-3 text-base mt-4">
            Kirim Permintaan Demo
          </button>

          <p className="text-xs text-center text-white/40 mt-4">
            Dengan mengirimkan form ini, Anda menyetujui <a href="/syarat-ketentuan" className="text-red-400 hover:text-red-300">Syarat & Ketentuan</a> serta <a href="/privasi" className="text-red-400 hover:text-red-300">Kebijakan Privasi</a> kami.
          </p>
        </form>
      </div>
    </PageLayout>
  );
}
