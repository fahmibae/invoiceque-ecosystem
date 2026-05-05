import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Kebijakan privasi InvoiceQu — cara kami mengumpulkan, menggunakan, dan melindungi data Anda.",
  alternates: { canonical: "https://invoicequ.my.id/privasi" },
};

export default function PrivasiPage() {
  return (
    <PageLayout title="Kebijakan Privasi" subtitle="Terakhir diperbarui: 1 April 2026" badge="LEGAL" breadcrumbs={[{ label: "Kebijakan Privasi" }]}>
      <div className="space-y-10 text-sm text-white/55 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-3">1. Pendahuluan</h2>
          <p>InvoiceQu (&quot;kami&quot;, &quot;milik kami&quot;) berkomitmen untuk melindungi privasi pengguna (&quot;Anda&quot;). Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi pribadi Anda saat menggunakan layanan InvoiceQu.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">2. Informasi yang Kami Kumpulkan</h2>
          <p className="mb-3">Kami mengumpulkan informasi berikut:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong className="text-white/70">Informasi Akun:</strong> Nama, alamat email, nomor telepon, dan informasi bisnis saat Anda mendaftar.</li>
            <li><strong className="text-white/70">Data Transaksi:</strong> Invoice, payment link, dan riwayat pembayaran yang Anda buat melalui platform.</li>
            <li><strong className="text-white/70">Data Klien:</strong> Informasi klien yang Anda input untuk keperluan invoicing.</li>
            <li><strong className="text-white/70">Data Penggunaan:</strong> Log aktivitas, preferensi, dan interaksi Anda dengan platform.</li>
            <li><strong className="text-white/70">Data Teknis:</strong> Alamat IP, tipe browser, perangkat, dan informasi teknis lainnya.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">3. Penggunaan Informasi</h2>
          <p className="mb-3">Kami menggunakan informasi Anda untuk:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Menyediakan dan memelihara layanan InvoiceQu.</li>
            <li>Memproses transaksi dan mengirim notifikasi terkait.</li>
            <li>Meningkatkan pengalaman pengguna dan mengembangkan fitur baru.</li>
            <li>Mengirim informasi tentang update produk dan penawaran (dengan persetujuan Anda).</li>
            <li>Mematuhi kewajiban hukum dan regulasi yang berlaku.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">4. Perlindungan Data</h2>
          <p>Kami menerapkan langkah-langkah keamanan teknis dan organisasi yang sesuai untuk melindungi data pribadi Anda, termasuk enkripsi SSL/TLS, hashing password, kontrol akses berbasis peran, dan backup data rutin.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">5. Berbagi Data dengan Pihak Ketiga</h2>
          <p>Kami tidak menjual data pribadi Anda. Kami hanya berbagi data dengan pihak ketiga yang diperlukan untuk menyediakan layanan (misalnya payment gateway), dan hanya sesuai dengan kebijakan privasi mereka.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">6. Hak Pengguna</h2>
          <p className="mb-3">Anda memiliki hak untuk:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Mengakses dan mendapatkan salinan data pribadi Anda.</li>
            <li>Memperbarui atau memperbaiki data yang tidak akurat.</li>
            <li>Meminta penghapusan data pribadi Anda.</li>
            <li>Menarik persetujuan penggunaan data kapan saja.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">7. Cookie</h2>
          <p>Kami menggunakan cookie dan teknologi serupa untuk meningkatkan pengalaman pengguna, menganalisis trafik, dan personalisasi konten. Anda dapat mengatur preferensi cookie melalui pengaturan browser.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">8. Perubahan Kebijakan</h2>
          <p>Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu. Perubahan signifikan akan diberitahukan melalui email atau notifikasi di platform.</p>
        </section>
        <section>
          <h2 className="text-lg font-bold text-white mb-3">9. Kontak</h2>
          <p>Untuk pertanyaan tentang kebijakan privasi ini, hubungi kami di <a href="mailto:privacy@invoicequ.my.id" className="text-red-400 hover:underline">privacy@invoicequ.my.id</a>.</p>
        </section>
      </div>
    </PageLayout>
  );
}
