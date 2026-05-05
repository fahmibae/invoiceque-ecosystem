import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description: "Syarat dan ketentuan penggunaan layanan InvoiceQu. Baca sebelum menggunakan platform kami.",
  alternates: { canonical: "https://invoicequ.my.id/syarat-ketentuan" },
};

export default function SyaratPage() {
  return (
    <PageLayout title="Syarat & Ketentuan" subtitle="Terakhir diperbarui: 1 April 2026" badge="LEGAL" breadcrumbs={[{ label: "Syarat & Ketentuan" }]}>
      <div className="space-y-10 text-sm text-white/55 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-3">1. Penerimaan Syarat</h2>
          <p>Dengan mengakses dan menggunakan layanan InvoiceQu, Anda menyetujui untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak menyetujui syarat ini, harap jangan gunakan layanan kami.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">2. Deskripsi Layanan</h2>
          <p>InvoiceQu adalah platform SaaS yang menyediakan layanan pembuatan invoice, payment link, manajemen klien, dan pelaporan keuangan. Kami berhak untuk mengubah, menangguhkan, atau menghentikan fitur tertentu dengan pemberitahuan sebelumnya.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">3. Akun Pengguna</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Anda bertanggung jawab menjaga kerahasiaan kredensial akun Anda.</li>
            <li>Anda harus memberikan informasi yang akurat dan terkini saat mendaftar.</li>
            <li>Anda bertanggung jawab atas semua aktivitas yang terjadi di akun Anda.</li>
            <li>Anda harus berusia minimal 18 tahun untuk menggunakan layanan ini.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">4. Pembayaran & Langganan</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Biaya langganan ditagih sesuai dengan paket yang dipilih (bulanan/tahunan).</li>
            <li>Pembayaran tidak dapat dikembalikan kecuali dalam periode garansi 30 hari.</li>
            <li>Kami berhak mengubah harga dengan pemberitahuan 30 hari sebelumnya.</li>
            <li>Akun yang menunggak pembayaran dapat dinonaktifkan setelah pemberitahuan.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">5. Penggunaan yang Diperbolehkan</h2>
          <p className="mb-3">Anda setuju untuk tidak:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Menggunakan layanan untuk tujuan ilegal atau tidak sah.</li>
            <li>Mengirim spam atau konten yang melanggar hukum melalui platform.</li>
            <li>Mencoba mengakses sistem atau data yang bukan milik Anda.</li>
            <li>Menyalin, mendistribusikan, atau merekayasa balik perangkat lunak kami.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">6. Hak Kekayaan Intelektual</h2>
          <p>Semua konten, desain, kode, dan merek dagang di InvoiceQu adalah milik kami atau pemberi lisensi kami. Data yang Anda input ke dalam platform tetap menjadi milik Anda.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">7. Batasan Tanggung Jawab</h2>
          <p>InvoiceQu disediakan &quot;sebagaimana adanya&quot;. Kami tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau konsekuensial yang timbul dari penggunaan layanan kami.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">8. Penyelesaian Sengketa</h2>
          <p>Setiap sengketa akan diselesaikan melalui mediasi terlebih dahulu. Jika mediasi gagal, sengketa akan diselesaikan melalui arbitrase sesuai hukum Republik Indonesia.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">9. Perubahan Syarat</h2>
          <p>Kami berhak mengubah syarat ini kapan saja. Perubahan akan berlaku setelah dipublikasikan di halaman ini. Penggunaan berlanjut setelah perubahan berarti Anda menerima syarat yang diperbarui.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">10. Kontak</h2>
          <p>Untuk pertanyaan tentang syarat dan ketentuan ini, hubungi kami di <a href="mailto:legal@invoicequ.my.id" className="text-red-400 hover:underline">legal@invoicequ.my.id</a>.</p>
        </section>
      </div>
    </PageLayout>
  );
}
