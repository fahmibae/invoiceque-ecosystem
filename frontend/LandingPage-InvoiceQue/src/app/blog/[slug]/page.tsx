import { Metadata } from "next";
import PageLayout from "@/components/PageLayout";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface BlogPost {
  title: string;
  excerpt: string;
  category: string;
  categoryColor: string;
  date: string;
  readTime: string;
  content: React.ReactNode;
}

const blogPosts: Record<string, BlogPost> = {
  "portal-klien-invoicequ": {
    title: "Portal Klien InvoiceQu: Berikan Kemudahan Transaksi untuk Klien Anda",
    excerpt: "Hadirkan halaman portal khusus bagi klien Anda untuk melihat riwayat tagihan, menyetujui penawaran, menandatanganinya secara online, dan membayar langsung.",
    category: "Fitur",
    categoryColor: "bg-red-500/20 text-red-400",
    date: "5 Jun 2026",
    readTime: "6 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Dalam model bisnis konvensional, komunikasi keuangan dengan klien sering kali tersebar di berbagai tempat: invoice dikirim lewat email, bukti bayar dikirim via WhatsApp, sedangkan revisi kontrak dibahas melalui telepon. Hal ini memicu kebingungan dan meningkatkan potensi kehilangan data transaksi.
        </p>
        <p>
          InvoiceQu menyelesaikan masalah ini dengan menghadirkan **Portal Klien (Client Portal)**. Ini adalah sebuah halaman web interaktif khusus yang dipersonalisasi untuk setiap klien Anda, di mana mereka dapat mengelola seluruh dokumen keuangan mereka secara mandiri.
        </p>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Fitur Utama Portal Klien InvoiceQu</h2>
        <ul className="list-disc list-inside space-y-3 pl-4">
          <li><strong>Satu Dasbor untuk Semua Dokumen:</strong> Klien dapat melihat daftar seluruh invoice yang pernah diterbitkan, mengunduh file PDF, dan mencetak kuitansi tanda terima secara langsung.</li>
          <li><strong>Pembayaran Instan &amp; Aman:</strong> Integrasi tombol pembayaran digital memungkinkan klien membayar tagihan menggunakan QRIS, e-Wallet, Virtual Account, atau Kartu Kredit hanya dengan beberapa klik.</li>
          <li><strong>Persetujuan Quotation &amp; Kontrak Kerja:</strong> Sebelum proyek berjalan, klien dapat meninjau quotation, membubuhkan tanda tangan digital pada kontrak, dan secara instan merilis pesanan kerja langsung dari portal.</li>
        </ul>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Bagaimana Cara Klien Mengakses Portal?</h2>
        <p>
          Anda tidak perlu memberikan username atau password rumit untuk klien Anda. Setiap kali Anda mengirimkan invoice, quotation, atau kontrak, InvoiceQu akan melampirkan sebuah **tautan unik yang aman (secure unique token)**.
        </p>
        <p>
          Saat tautan tersebut diklik, klien akan langsung diarahkan ke halaman portal bermerek Anda (sesuai logo dan warna brand kit Anda) secara aman, tanpa memerlukan proses pendaftaran akun di pihak mereka.
        </p>

        <div className="p-5 rounded-xl border border-red-500/20 bg-red-500/5 my-6">
          <h3 className="text-base md:text-lg font-semibold text-red-400 mb-2">🚀 Tingkatkan Kepercayaan Klien</h3>
          <p className="text-xs md:text-sm text-white/60">
            Klien korporat sangat menyukai profesionalisme Portal Klien karena memudahkan tim keuangan mereka melakukan audit pembayaran dan mengunduh laporan secara mandiri tanpa perlu terus-menerus menghubungi Anda.
          </p>
        </div>
      </div>
    ),
  },
  "client-intake-forms-otomatis": {
    title: "Cara Otomatis Onboard Klien Baru Menggunakan Client Intake Forms",
    excerpt: "Dapatkan informasi kebutuhan proyek, file brief, dan data kontak dari calon klien secara otomatis dan rapi tanpa chat manual bolak-balik.",
    category: "Tutorial",
    categoryColor: "bg-blue-500/20 text-blue-400",
    date: "4 Jun 2026",
    readTime: "5 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Saat memulai kerja sama dengan klien baru, langkah pertama yang sering kali melelahkan adalah mengumpulkan data awal: deskripsi proyek, dokumen brief pendukung, anggaran yang tersedia, hingga informasi detail kontak penagihan mereka.
        </p>
        <p>
          Menanyakan hal ini satu per satu lewat obrolan chat sering kali berantakan dan rawan terlupakan. Dengan fitur **Client Intake Forms** dari InvoiceQu, Anda dapat mengotomatisasi seluruh proses pengumpulan informasi ini secara profesional.
        </p>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Apa itu Client Intake Form?</h2>
        <p>
          Client Intake Form adalah formulir pendaftaran online khusus yang dapat Anda sesuaikan pertanyaannya untuk dikirimkan kepada calon klien. Klien mengisi formulir tersebut, dan data mereka akan otomatis disinkronkan masuk ke dalam basis data CRM (Customer Relationship Management) InvoiceQu Anda.
        </p>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Langkah Menyiapkan Intake Form Pertama Anda</h2>
        <ol className="list-decimal list-inside space-y-3 pl-4">
          <li>Masuk ke Dashboard InvoiceQu dan pilih menu <strong>Toolkit &gt; Intake Forms</strong>.</li>
          <li>Klik <strong>Create Intake Form</strong> dan buat kuesioner kustom Anda (seperti nama bisnis, kebutuhan proyek, anggaran, deadline, dan kolom unggah file brief).</li>
          <li>Sesuaikan tampilan form dengan warna dan logo brand Anda melalui integrasi brand kit.</li>
          <li>Salin link formulir tersebut dan pasang di bio Instagram, situs portofolio, atau kirim langsung ke calon klien yang berminat bekerja sama.</li>
          <li>Setiap kali form diisi, Anda akan menerima email notifikasi dan profil kontak klien otomatis dibuat di dasbor Anda.</li>
        </ol>

        <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 my-6">
          <h3 className="text-base md:text-lg font-semibold text-blue-400 mb-2">🔥 Otomatisasi Alur Kerja Pro</h3>
          <p className="text-xs md:text-sm text-white/60">
            Begitu data intake form masuk, Anda bisa membuat Quotation penawaran harga secara instan dari profil klien yang sama hanya dengan satu klik di CRM InvoiceQu Anda.
          </p>
        </div>
      </div>
    ),
  },
  "kelola-pengeluaran-expenses-bisnis": {
    title: "Pantau Pengeluaran & Profitabilitas Bisnis dengan Fitur Expenses",
    excerpt: "Jangan hanya mencatat pendapatan. Lacak setiap pengeluaran operasional bisnis Anda untuk mengetahui laba bersih yang sesungguhnya secara otomatis.",
    category: "Bisnis",
    categoryColor: "bg-emerald-500/20 text-emerald-400",
    date: "4 Jun 2026",
    readTime: "7 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Sebuah bisnis bisa saja mencatatkan angka penjualan senilai puluhan juta rupiah, namun tetap mengalami kerugian jika pengeluaran operasionalnya tidak terkendali. Kunci utama keberhasilan keuangan jangka panjang adalah memantau margin keuntungan bersih secara ketat.
        </p>
        <p>
          InvoiceQu tidak hanya dirancang sebagai alat pembuat tagihan, melainkan juga sebuah sistem manajemen keuangan komprehensif. Melalui fitur **Expenses (Pelacak Pengeluaran)**, Anda dapat mencatat dan melacak setiap rupiah yang keluar dari kas bisnis Anda.
        </p>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Mengapa Perlu Melacak Pengeluaran Bisnis?</h2>
        <ul className="list-disc list-inside space-y-3 pl-4">
          <li><strong>Mengetahui Laba Bersih Akurat:</strong> Laporan dasbor Anda akan menghitung total pemasukan dikurangi pengeluaran, menyajikan angka profitabilitas riil.</li>
          <li><strong>Analisis Kategori Pengeluaran:</strong> Kategorikan pengeluaran Anda (seperti sewa server, biaya pemasaran, gaji freelancer, atau langganan software SaaS) untuk melihat pos anggaran mana yang paling boros.</li>
          <li><strong>Penyimpanan Bukti Fisik (Struk):</strong> Unggah foto struk/tanda terima langsung pada setiap catatan transaksi pengeluaran untuk memudahkan pelaporan pajak akhir tahun.</li>
        </ul>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Cara Mencatat Pengeluaran di InvoiceQu</h2>
        <ol className="list-decimal list-inside space-y-3 pl-4">
          <li>Masuk ke Dashboard Anda, buka menu <strong>Toolkit &gt; Expenses</strong>.</li>
          <li>Klik tombol <strong>Add Expense</strong>.</li>
          <li>Masukkan nominal pengeluaran, pilih kategori transaksi, dan tentukan tanggal pembayaran.</li>
          <li>Hubungkan pengeluaran tersebut dengan proyek klien spesifik jika pengeluaran tersebut ditujukan khusus untuk membiayai proyek mereka (memudahkan perhitungan margin proyek).</li>
          <li>Unggah struk digital pendukung dan simpan!</li>
        </ol>

        <p className="mt-6">
          Dengan memadukan penagihan invoice otomatis dan pencatatan pengeluaran yang disiplin, Anda akan memiliki kontrol penuh atas masa depan keuangan bisnis Anda.
        </p>
      </div>
    ),
  },
  "brand-kit-invoice-kustom": {
    title: "Kustomisasi Logo & Warna Invoice Anda dengan Fitur Brand Kits",
    excerpt: "Bangun reputasi profesional bisnis dengan menyelaraskan warna, logo, dan font kustom pada invoice serta Portal Klien.",
    category: "Tutorial",
    categoryColor: "bg-blue-500/20 text-blue-400",
    date: "25 Mei 2026",
    readTime: "6 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Kesan pertama (first impression) adalah segalanya dalam dunia bisnis. Ketika Anda mengirimkan sebuah invoice tagihan dengan format default polos berwarna abu-abu/hitam tanpa logo, klien Anda mungkin merasa itu adalah tagihan generik yang membosankan. 
        </p>
        <p>
          Sebaliknya, invoice yang memuat logo resmi perusahaan, menggunakan palet warna khas merek Anda, dan dilengkapi dengan font kustom akan meningkatkan kredibilitas bisnis Anda di mata klien.
        </p>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Mengenal Fitur Brand Kits di InvoiceQu</h2>
        <p>
          Untuk membantu bisnis Anda terlihat lebih profesional dan terpercaya, InvoiceQu menyediakan fitur **Brand Kits**. Melalui fitur ini, Anda dapat mendesain satu identitas visual yang seragam untuk diaplikasikan langsung pada:
        </p>
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>Desain PDF Invoice dan Quotation (penawaran harga).</li>
          <li>Halaman login Portal Klien kustom Anda.</li>
          <li>Kop surat surat jalan dan dokumen kuitansi tanda terima.</li>
          <li>Desain email notifikasi yang dikirimkan secara otomatis oleh sistem.</li>
        </ul>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Cara Melakukan Kustomisasi Brand Kit Anda</h2>
        <p>
          Anda hanya perlu mengatur identitas brand Anda sekali saja untuk digunakan pada semua dokumen selanjutnya:
        </p>
        <ol className="list-decimal list-inside space-y-3 pl-4">
          <li>Buka menu <strong>Toolkit &gt; Brand Kits</strong> di dashboard InvoiceQu Anda.</li>
          <li><strong>Unggah Logo:</strong> Upload logo bisnis Anda dalam format PNG transparan atau SVG beresolusi tinggi agar terlihat tajam pada file PDF.</li>
          <li><strong>Atur Palet Warna:</strong> Pilih warna utama (primary color) dan warna sekunder (secondary color) yang mewakili identitas brand Anda. Warna utama ini akan otomatis menghiasi border, header tabel, dan tombol bayar di Portal Klien.</li>
          <li><strong>Sesuaikan Typography:</strong> Pilih jenis font profesional yang disediakan oleh sistem (seperti Inter, Outfit, atau Roboto) untuk disesuaikan dengan estetika bisnis Anda.</li>
          <li>Simpan perubahan dan sistem akan langsung memperbarui seluruh template dokumen secara instan!</li>
        </ol>

        <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 my-6">
          <h3 className="text-base md:text-lg font-semibold text-blue-400 mb-2">💡 Tips Profesional: Gunakan Logo Transparan</h3>
          <p className="text-xs md:text-sm text-white/60">
            Hindari mengunggah logo dengan latar belakang (background) kotak putih padat di dalam brand kit. Menggunakan file PNG transparan akan mempermudah logo menyatu sempurna dengan skema warna header invoice Anda.
          </p>
        </div>
      </div>
    ),
  },
  "quotation-proposal-online": {
    title: "Buat Proposal & Penawaran Harga Profesional Sekali Klik",
    excerpt: "Tingkatkan tingkat persetujuan proyek dengan membuat Quotation online yang interaktif dan dapat langsung disetujui klien.",
    category: "Panduan",
    categoryColor: "bg-purple-500/20 text-purple-400",
    date: "22 Mei 2026",
    readTime: "5 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Sebelum invoice tagihan diterbitkan, proses negosiasi biasanya diawali dengan pengiriman penawaran harga (**Quotation**) atau proposal kerja sama. Membuat draf penawaran harga secara manual di Excel sering kali memakan waktu, belum lagi risiko salah ketik atau salah hitung harga diskon dan pajak.
        </p>
        <p>
          Melalui fitur **Quotation Online** dari InvoiceQu, Anda bisa membuat penawaran harga interaktif yang dikirim langsung lewat tautan web unik. Klien Anda dapat membaca rincian harga dan langsung menyetujuinya di tempat.
        </p>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Kelebihan Menggunakan Quotation Online</h2>
        <ul className="list-disc list-inside space-y-3 pl-4">
          <li><strong>Persetujuan Sekali Klik (One-Click Accept):</strong> Klien dapat menyetujui penawaran harga Anda secara instan di Portal Klien tanpa perlu mengirim email balasan manual atau melakukan tanda tangan fisik.</li>
          <li><strong>Konversi Otomatis ke Invoice:</strong> Begitu klien menyetujui Quotation Anda, sistem InvoiceQu memungkinkan Anda mengonversi penawaran tersebut menjadi Invoice tagihan riil hanya dengan satu tombol klik. Tidak perlu input ulang data!</li>
          <li><strong>Pelacakan Status Real-Time:</strong> Anda dapat melacak apakah klien sudah membuka, sedang membaca, atau sudah menyetujui draf Quotation yang dikirimkan.</li>
        </ul>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Cara Membuat Quotation Interaktif</h2>
        <ol className="list-decimal list-inside space-y-3 pl-4">
          <li>Masuk ke Dashboard InvoiceQu dan pilih menu <strong>Quotations</strong>.</li>
          <li>Klik tombol <strong>Create Quotation</strong>, lalu pilih klien sasaran Anda.</li>
          <li>Masukkan detail item jasa/barang, kuantitas, harga, serta persentase diskon atau pajak jika ada. Anda juga bisa menyertakan catatan (notes) syarat pengerjaan proyek.</li>
          <li>Kirim tautan Quotation aman tersebut melalui WhatsApp atau email otomatis dari sistem.</li>
        </ol>

        <p className="mt-6">
          Gunakan Quotation Online InvoiceQu hari ini untuk mempercepat siklus transaksi dari tahap perkenalan hingga pembayaran lunas!
        </p>
      </div>
    ),
  },
  "penjadwalan-meeting-otomatis": {
    title: "Integrasi Jadwal Meeting & Google Meet Otomatis Tanpa Ribet",
    excerpt: "Gabungkan pemesanan sesi konsultasi dengan pembuatan link Google Meet otomatis dan penagihan biaya pertemuan langsung.",
    category: "Fitur",
    categoryColor: "bg-red-500/20 text-red-400",
    date: "20 Mei 2026",
    readTime: "5 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Bagi para konsultan, tutor privat, penasihat keuangan, atau agensi kreatif, sesi meeting dengan klien adalah bagian integral dari bisnis. Menentukan waktu meeting yang cocok sering kali menjadi proses melelahkan dengan saling kirim pesan WhatsApp bolak-balik.
        </p>
        <p>
          Dengan fitur **Meetings &amp; Scheduler** dari InvoiceQu, Anda bisa mengatur ketersediaan waktu Anda, membiarkan klien memesan sesi langsung dari kalender online, dan secara otomatis menghasilkan link **Google Meet** untuk pertemuan tersebut.
        </p>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Fitur Kunci Pertemuan Terintegrasi</h2>
        <ul className="list-disc list-inside space-y-3 pl-4">
          <li><strong>Sinkronisasi Kalender Kerja:</strong> Hubungkan dengan kalender Google atau kalender internal InvoiceQu untuk mencegah jadwal bertabrakan (double booking).</li>
          <li><strong>Pembuatan Link Google Meet Instan:</strong> Sistem secara otomatis menghasilkan link Google Meet unik setiap kali klien memesan jadwal, lalu mengirimkan undangan ke email kedua belah pihak.</li>
          <li><strong>Penagihan Biaya Konsultasi Otomatis:</strong> Sesi meeting berbayar akan secara otomatis membuat draf tagihan/invoice yang harus dilunasi oleh klien sebelum link pertemuan dikirimkan atau setelah meeting berakhir sesuai aturan Anda.</li>
        </ul>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Bagaimana Cara Mengaktifkannya?</h2>
        <p>
          Ikuti panduan berikut untuk menyiapkan sistem booking Anda sendiri:
        </p>
        <ol className="list-decimal list-inside space-y-3 pl-4">
          <li>Masuk ke Dashboard dan navigasi ke menu <strong>Meetings &gt; Settings</strong>.</li>
          <li>Tentukan hari dan jam ketersediaan kerja Anda (misalnya: Senin-Jumat jam 09.00 - 17.00).</li>
          <li>Aktifkan integrasi **Google Calendar** dan **Google Meet** di halaman pengaturan integrasi pengembang.</li>
          <li>Bagikan link booking Anda di media sosial, tanda tangan email, atau kirim langsung ke calon klien Anda.</li>
        </ol>

        <p className="mt-6">
          Hemat waktu koordinasi rapat Anda dan maksimalkan produktivitas konsultasi berbayar Anda menggunakan platform Meetings InvoiceQu sekarang juga!
        </p>
      </div>
    ),
  },
  "kontrak-digital-tanda-tangan": {
    title: "Kelola Kontrak Kerja Sama & Tanda Tangan Digital Secara Online",
    excerpt: "Buat perjanjian kerja sama (MoU) atau kontrak proyek, kirim ke klien, dan terima tanda tangan digital legal langsung dari Portal Klien.",
    category: "Panduan",
    categoryColor: "bg-purple-500/20 text-purple-400",
    date: "3 Jun 2026",
    readTime: "7 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Sebelum memulai suatu proyek profesional, kesepakatan tertulis berupa surat perjanjian kerja sama atau kontrak adalah hal wajib. Kontrak melindungi hak Anda sebagai penyedia jasa dan menetapkan kewajiban klien. Namun, proses mencetak dokumen fisik, menandatanganinya secara manual, lalu memindai (scan) kembali sangat tidak efisien.
        </p>
        <p>
          Melalui fitur **Kontrak Digital &amp; Tanda Tangan Online** dari InvoiceQu, Anda kini dapat mengurus seluruh proses legalitas ini langsung di satu tempat secara paperless.
        </p>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Mengapa Kontrak Digital InvoiceQu Lebih Unggul?</h2>
        <ul className="list-disc list-inside space-y-3 pl-4">
          <li><strong>Terintegrasi dengan Tagihan:</strong> Kontrak dapat langsung dihubungkan dengan draf penawaran harga (Quotation) dan Invoice proyek yang bersangkutan.</li>
          <li><strong>Portal Klien Satu Pintu:</strong> Klien tidak perlu mengunduh aplikasi tambahan atau mendaftar akun. Mereka cukup mengklik link aman untuk membaca, menyetujui, dan menandatangani kontrak langsung dari browser mereka.</li>
          <li><strong>Tanda Tangan Digital yang Sah:</strong> Tanda tangan dibubuhkan secara elektronik dengan perekaman data audit trail (IP address, tanggal, waktu) guna memastikan keabsahan kesepakatan.</li>
        </ul>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Cara Kerja Kontrak Digital InvoiceQu</h2>
        <p>
          Proses pembuatan hingga persetujuan kontrak dapat diselesaikan hanya dengan beberapa langkah sederhana:
        </p>
        <ol className="list-decimal list-inside space-y-3 pl-4">
          <li><strong>Buat Draf Kontrak:</strong> Gunakan menu <i>Contracts</i> di dalam dashboard Anda. Tuliskan deskripsi pekerjaan, nilai proyek, termin pembayaran, serta pasal-pasal perjanjian.</li>
          <li><strong>Kirim ke Klien:</strong> Masukkan email klien atau salin tautan unik kontrak untuk dikirim melalui WhatsApp.</li>
          <li><strong>Tanda Tangan Klien:</strong> Klien akan membuka Portal Klien, membaca detail kontrak, dan membubuhkan tanda tangan mereka secara digital dengan menggambar atau mengetik nama mereka.</li>
          <li><strong>Selesai &amp; Diarsipkan:</strong> Setelah ditandatangani, kedua belah pihak akan menerima salinan PDF kontrak resmi dan status proyek otomatis berubah menjadi aktif.</li>
        </ol>

        <div className="p-5 rounded-xl border border-purple-500/20 bg-purple-500/5 my-6">
          <h3 className="text-base md:text-lg font-semibold text-purple-400 mb-2">💡 Tips Keamanan Hukum</h3>
          <p className="text-xs md:text-sm text-white/60">
            Pastikan Anda selalu menuliskan cakupan pekerjaan (scope of work) dengan sedetail mungkin serta konsekuensi keterlambatan pembayaran di dalam kontrak Anda sebelum dikirimkan untuk ditandatangani.
          </p>
        </div>
      </div>
    ),
  },
  "fitur-time-tracking-freelancer": {
    title: "Ubah Jam Kerja Menjadi Invoice Sekali Klik dengan Time Tracker",
    excerpt: "Pantau waktu kerja produktif Anda untuk setiap proyek klien dan konversikan lembar waktu menjadi invoice tagihan secara otomatis.",
    category: "Tutorial",
    categoryColor: "bg-blue-500/20 text-blue-400",
    date: "1 Jun 2026",
    readTime: "6 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Bagi freelancer, desainer grafis, penulis, konsultan hukum, atau software engineer independen, waktu adalah aset berharga yang bernilai uang. Masalahnya, sering kali kita kesulitan menghitung berapa jam waktu produktif yang sebenarnya dihabiskan untuk menyelesaikan satu revisi atau satu modul proyek.
        </p>
        <p>
          Dengan fitur **Time Tracking terintegrasi** di InvoiceQu, Anda tidak hanya bisa mencatat jam kerja secara presisi, tetapi juga dapat menagih waktu kerja tersebut langsung ke dalam invoice secara otomatis.
        </p>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Keuntungan Menggunakan Time Tracker Terintegrasi</h2>
        <ul className="list-disc list-inside space-y-3 pl-4">
          <li><strong>Pencatatan Presisi:</strong> Jalankan timer saat mulai bekerja dan matikan saat beristirahat atau selesai. Anda juga bisa menambahkan catatan aktivitas secara manual untuk setiap entri waktu.</li>
          <li><strong>Transparansi Klien:</strong> Kirimkan detail timesheet (lembar waktu) terperinci bersama dengan invoice Anda, sehingga klien tahu persis untuk apa saja mereka membayar Anda.</li>
          <li><strong>Konversi Instan ke Invoice:</strong> Cukup pilih entri waktu yang belum ditagih, lalu klik tombol "Generate Invoice". Sistem akan otomatis mengalikan total jam kerja dengan tarif per jam Anda.</li>
        </ul>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Panduan Menagih Jam Kerja Anda</h2>
        <p>
          Ikuti langkah-langkah praktis di bawah ini untuk mulai menggunakan fitur Time Tracker:
        </p>
        <ol className="list-decimal list-inside space-y-3 pl-4">
          <li>Buka menu <strong>Time Tracking</strong> di sidebar dashboard InvoiceQu.</li>
          <li>Masukkan deskripsi tugas yang sedang Anda kerjakan dan pilih proyek klien yang sesuai.</li>
          <li>Klik <strong>Start Timer</strong> untuk mulai merekam waktu kerja Anda secara real-time.</li>
          <li>Klik <strong>Stop Timer</strong> setelah pekerjaan Anda selesai.</li>
          <li>Ketika proyek siap ditagih, klik <strong>Generate Invoice</strong> pada daftar pencatatan jam kerja untuk membuat draf invoice secara instan.</li>
        </ol>

        <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 my-6">
          <h3 className="text-base md:text-lg font-semibold text-blue-400 mb-2">⏱️ Hubungkan dengan VS Code Extension Kami!</h3>
          <p className="text-xs md:text-sm text-white/60">
            Apakah Anda seorang developer? Gunakan extension resmi **InvoiceQu Coder Timer Tracker** di VS Code untuk merekam waktu koding Anda secara otomatis dan menyinkronkannya langsung ke dashboard InvoiceQu tanpa perlu membuka browser.
          </p>
        </div>
      </div>
    ),
  },
  "fitur-chasers-reminder-otomatis": {
    title: "Kirim Tagihan Tanpa Sungkan: Fitur Chasers Otomatis InvoiceQu",
    excerpt: "Lelah menagih klien yang telat bayar? Aktifkan fitur Chasers untuk mengirim pengingat tagihan otomatis secara terjadwal.",
    category: "Fitur",
    categoryColor: "bg-red-500/20 text-red-400",
    date: "28 Mei 2026",
    readTime: "5 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Menagih uang hasil jerih payah Anda sendiri terkadang terasa canggung atau sungkan. Terlebih jika klien terus mengulur waktu pembayaran dari tanggal jatuh tempo yang disepakati. Masalah piutang macet ini adalah salah satu penyebab utama terganggunya arus kas usaha kecil.
        </p>
        <p>
          InvoiceQu hadir dengan solusi terbaik: **Chasers (Sistem Pengingat Tagihan Otomatis)**. Biarkan asisten digital kami yang melakukan tugas menagih klien secara sopan namun profesional, sepenuhnya berjalan di latar belakang secara otomatis.
        </p>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Bagaimana Cara Kerja Fitur Chasers?</h2>
        <p>
          Fitur Chasers memungkinkan Anda membuat serangkaian aturan (rules) pengingat berbasis waktu. Contoh skenario pengingat yang paling efektif adalah:
        </p>
        <ul className="list-disc list-inside space-y-3 pl-4">
          <li><strong>3 Hari Sebelum Jatuh Tempo:</strong> Pengingat ramah memberitahukan bahwa tanggal jatuh tempo pembayaran akan segera tiba.</li>
          <li><strong>Hari Jatuh Tempo (Due Date):</strong> Pemberitahuan formal bahwa tagihan jatuh tempo hari ini beserta link pembayaran sekali klik.</li>
          <li><strong>3 Hari Setelah Jatuh Tempo:</strong> Pengingat tegas bahwa invoice telah melewati batas waktu bayar (overdue) dan memohon kerja samanya untuk segera menyelesaikan pembayaran.</li>
        </ul>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Manfaat Utama Menggunakan Chasers</h2>
        <ul className="list-disc list-inside space-y-3 pl-4">
          <li><strong>Hemat Waktu Berharga Anda:</strong> Tidak perlu lagi memeriksa kalender satu per satu untuk melihat invoice mana yang mendekati batas waktu lalu mengirim email penagihan secara manual.</li>
          <li><strong>Menjaga Hubungan Baik dengan Klien:</strong> Klien tidak akan merasa tersinggung karena pesan dikirimkan secara otomatis oleh sistem, bukan penagihan personal yang bernada menuntut.</li>
          <li><strong>Pembayaran Lebih Cepat:</strong> Data internal kami menunjukkan bahwa invoice dengan fitur pengingat otomatis diaktifkan dibayar 3x lebih cepat dibandingkan tagihan tanpa pengingat.</li>
        </ul>

        <p className="mt-6">
          Aktifkan fitur Chasers hari ini di pengaturan invoice Anda untuk membebaskan diri Anda dari stres menagih klien, dan mulailah menikmati kelancaran arus kas bisnis yang sesungguhnya!
        </p>
      </div>
    ),
  },
  "cara-membuat-invoice-profesional": {
    title: "Cara Membuat Invoice Profesional dalam 5 Menit",
    excerpt: "Panduan lengkap membuat invoice yang terlihat profesional dan meningkatkan tingkat pembayaran dari klien Anda.",
    category: "Tutorial",
    categoryColor: "bg-blue-500/20 text-blue-400",
    date: "20 Apr 2026",
    readTime: "5 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Invoice bukan sekadar lembaran tagihan. Bagi bisnis jasa, freelancer, maupun UMKM, invoice adalah cerminan profesionalisme Anda di hadapan klien. Invoice yang didesain secara rapi, jelas, dan memuat informasi yang lengkap berpotensi besar mempercepat pencairan pembayaran Anda.
        </p>
        
        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Elemen Penting dalam Invoice Profesional</h2>
        <p>
          Untuk membuat invoice yang tidak menimbulkan kebingungan bagi klien Anda, pastikan dokumen Anda memiliki komponen-komponen berikut:
        </p>
        <ul className="list-disc list-inside space-y-3 pl-4">
          <li><strong>Header yang Jelas:</strong> Tambahkan logo bisnis Anda, nama usaha, alamat kontak, dan alamat email profesional di bagian atas.</li>
          <li><strong>Informasi Detail Klien:</strong> Tuliskan nama perusahaan klien, nama kontak penanggung jawab, serta alamat penagihan mereka dengan akurat.</li>
          <li><strong>Nomor &amp; Tanggal Invoice:</strong> Gunakan format penomoran yang konsisten (misal: <code>INV/2026/001</code>) dan cantumkan tanggal diterbitkannya invoice tersebut.</li>
          <li><strong>Rincian Pekerjaan (Line Items):</strong> Jelaskan secara rinci jasa atau barang yang dibeli, kuantitas, harga satuan, dan total harga per baris.</li>
          <li><strong>Instruksi Pembayaran:</strong> Berikan opsi bank transfer, virtual account, atau payment link secara jelas agar klien tahu persis ke mana harus membayar.</li>
        </ul>

        <div className="p-5 rounded-xl border border-red-500/20 bg-red-500/5 my-6">
          <h3 className="text-base md:text-lg font-semibold text-red-400 mb-2">💡 Tips Cepat: Sediakan Opsi Pembayaran Digital</h3>
          <p className="text-xs md:text-sm text-white/60">
            Klien cenderung menunda pembayaran jika mereka harus menyalin nomor rekening bank secara manual. Dengan menggunakan platform seperti InvoiceQu yang terintegrasi dengan Payment Gateway, klien bisa membayar sekali klik lewat QRIS atau Virtual Account pilihan mereka.
          </p>
        </div>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Cara Membuat Invoice Menggunakan InvoiceQu</h2>
        <p>
          Melalui platform InvoiceQu, Anda tidak perlu lagi mendesain template dari nol di Google Docs atau Excel. Cukup ikuti 3 langkah mudah ini:
        </p>
        <ol className="list-decimal list-inside space-y-3 pl-4">
          <li>Masuk ke Dashboard InvoiceQu dan klik tombol <strong>"Buat Invoice"</strong>.</li>
          <li>Pilih klien Anda dari kontak, isi rincian jasa, dan tentukan tenggat waktu (due date).</li>
          <li>Klik <strong>"Kirim"</strong> untuk langsung membagikan invoice via email, WhatsApp, atau membagikan tautan portal klien instan secara otomatis.</li>
        </ol>

        <p className="mt-6">
          Dengan invoice yang terstruktur baik, Anda dapat membangun citra profesional sekaligus menjaga kelancaran cash flow bisnis Anda. Mulai terapkan hari ini!
        </p>
      </div>
    ),
  },
  "tips-mengelola-cashflow": {
    title: "7 Tips Mengelola Cash Flow untuk UMKM",
    excerpt: "Cash flow adalah nyawa bisnis. Pelajari cara mengelolanya dengan efektif agar bisnis Anda tetap sehat.",
    category: "Bisnis",
    categoryColor: "bg-emerald-500/20 text-emerald-400",
    date: "15 Apr 2026",
    readTime: "8 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Banyak bisnis pemula yang bangkrut bukan karena produknya tidak laku, melainkan karena kehabisan kas siap pakai (cash). Memiliki pembukuan penjualan yang tinggi di atas kertas tidak berguna jika uang tunainya belum masuk ke rekening Anda saat tagihan operasional tiba. 
        </p>
        <p>
          Berikut adalah 7 strategi taktis untuk mengelola cash flow bisnis Anda agar tetap stabil dan sehat:
        </p>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Catat Arus Kas Masuk &amp; Keluar Secara Real-time</h2>
        <p>
          Jangan menunggu akhir bulan untuk mencatat transaksi keuangan. Lakukan pencatatan harian untuk mendeteksi secara dini apabila pengeluaran bulanan Anda mulai membengkak melampaui rata-rata historis.
        </p>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Segera Terbitkan Tagihan (Invoice)</h2>
        <p>
          Semakin lambat Anda mengirimkan invoice ke klien, semakin lambat uang Anda akan cair. Terbitkan invoice segera setelah milestone proyek tercapai atau barang dikirimkan.
        </p>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">3. Terapkan Sistem Uang Muka (DP)</h2>
        <p>
          Untuk proyek bernilai besar dengan jangka waktu pengerjaan yang lama, mintalah Down Payment sebesar 30% - 50% di muka. Ini berguna untuk membiayai operasional proyek tanpa harus menguras kas utama bisnis Anda.
        </p>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">4. Permudah Cara Bayar Klien</h2>
        <p>
          Jangan membatasi pilihan pembayaran hanya ke satu rekening bank transfer manual. Sediakan opsi pembayaran modern seperti Virtual Account dan QRIS. Klien menyukai kemudahan pembayaran yang instan dan aman.
        </p>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">5. Pisahkan Rekening Pribadi dan Bisnis</h2>
        <p>
          Ini adalah kesalahan paling fatal yang sering dilakukan pelaku UMKM. Campur aduk keuangan pribadi dengan bisnis mempersulit Anda menilai profitabilitas dan kesehatan bisnis yang sebenarnya.
        </p>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">6. Gunakan Sistem Pengingat Tagihan Otomatis</h2>
        <p>
          Menagih pembayaran tertunggak secara manual bisa menyita waktu dan merusak hubungan personal dengan klien. Manfaatkan fitur invoice auto-reminder dari InvoiceQu yang secara sopan mengirimkan email pengingat sebelum dan sesudah tenggat waktu.
        </p>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">7. Siapkan Dana Cadangan Operasional</h2>
        <p>
          Miliki dana darurat yang setara dengan 3 hingga 6 bulan biaya operasional tetap bisnis Anda. Dana ini berfungsi sebagai bantalan penopang ketika kondisi pasar sedang lesu atau terjadi penundaan bayar klien skala besar.
        </p>
      </div>
    ),
  },
  "payment-link-vs-invoice": {
    title: "Payment Link vs Invoice: Kapan Menggunakan Masing-Masing?",
    excerpt: "Kedua metode memiliki kelebihan dan kekurangan. Pelajari kapan sebaiknya menggunakan payment link dan kapan menggunakan invoice.",
    category: "Panduan",
    categoryColor: "bg-purple-500/20 text-purple-400",
    date: "10 Apr 2026",
    readTime: "6 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Dalam era digital, pebisnis memiliki beragam pilihan untuk menagih pembayaran. Dua metode yang paling populer digunakan adalah **Invoice** dan **Payment Link (Link Pembayaran)**.
        </p>
        <p>
          Meskipun keduanya berfungsi untuk menerima dana, kegunaan praktis dan target pasarnya sangat berbeda. Mari kita bedah perbedaannya agar Anda tidak salah pilih metode.
        </p>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Mengenal Lebih Dekat: Invoice</h2>
        <p>
          Invoice adalah dokumen tagihan formal yang berisi rincian item, kuantitas, harga, kalkulasi pajak, serta syarat pembayaran (Term of Payment). Invoice biasanya memiliki tenggat waktu pembayaran (misal: Net 15 atau Net 30).
        </p>
        <p className="font-semibold text-white mt-4">Kapan menggunakan Invoice?</p>
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>Transaksi B2B (Business-to-Business) skala menengah hingga besar.</li>
          <li>Klien korporat yang membutuhkan dokumen resmi untuk proses approval keuangan mereka.</li>
          <li>Pekerjaan berbasis proyek, jasa konsultasi, atau penjualan barang secara grosir.</li>
          <li>Ketika ada kebutuhan pencatatan pajak resmi (seperti PPN dan PPh).</li>
        </ul>

        <h2 className="text-xl md:text-2xl font-bold text-white mt-8 mb-4">Mengenal Lebih Dekat: Payment Link</h2>
        <p>
          Payment Link adalah sebuah tautan URL sekali pakai atau berulang yang mengarahkan pembeli langsung ke halaman pembayaran instan gateway. Begitu diklik, pembeli langsung dihadapkan pada pilihan QRIS, e-Wallet, atau Kartu Kredit untuk membayar saat itu juga.
        </p>
        <p className="font-semibold text-white mt-4">Kapan menggunakan Payment Link?</p>
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li>Penjualan langsung ke pelanggan retail (B2C).</li>
          <li>Transaksi cepat melalui chat WhatsApp, Instagram DM, atau Telegram.</li>
          <li>Pembayaran tiket event, webinar, deposit pemesanan instan, atau penjualan produk fisik tunggal.</li>
          <li>Ketika produk/jasa memiliki harga tetap dan harus dibayar lunas seketika sebelum pengiriman.</li>
        </ul>

        <div className="p-5 rounded-xl border border-purple-500/20 bg-purple-500/5 my-6">
          <h3 className="text-base md:text-lg font-semibold text-purple-400 mb-2">📊 Kesimpulan Singkat</h3>
          <p className="text-xs md:text-sm text-white/60">
            Gunakan **Invoice** apabila transaksi Anda membutuhkan termin pembayaran (kredit tempo) atau detail rincian legal formal. Gunakan **Payment Link** jika Anda ingin transaksi berjalan cepat tanpa administrasi rumit sekali bayar selesai.
          </p>
        </div>
      </div>
    ),
  },
  "fitur-baru-dashboard-analytics": {
    title: "Fitur Baru: Dashboard Analytics yang Lebih Powerful",
    excerpt: "Kami meluncurkan dashboard analytics baru dengan grafik interaktif, filter lanjutan, dan export laporan otomatis.",
    category: "Update",
    categoryColor: "bg-red-500/20 text-red-400",
    date: "5 Apr 2026",
    readTime: "3 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Kami selalu mendengarkan masukan dari para pengguna setia InvoiceQu. Salah satu permintaan terbesar adalah hadirnya visualisasi data yang lebih mendalam untuk mempermudah analisis performa keuangan bulanan.
        </p>
        <p>
          Hari ini, kami sangat senang memperkenalkan **Dashboard Analytics Baru** yang dirancang khusus untuk mempermudah pengambilan keputusan bisnis Anda.
        </p>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">Apa Saja yang Baru di Dashboard Analytics?</h2>
        
        <h3 className="text-lg font-semibold text-white mt-6 mb-2">1. Visualisasi Tren Pendapatan Interaktif</h3>
        <p>
          Grafik garis baru kini mendukung interaksi hover untuk melihat rincian pendapatan harian, mingguan, dan bulanan secara terperinci. Anda dapat membandingkan performa kuartal berjalan dengan kuartal sebelumnya secara berdampingan.
        </p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">2. Statistik Waktu Rata-Rata Pembayaran (Average Time to Pay)</h3>
        <p>
          Dapatkan insight berharga mengenai seberapa cepat rata-rata klien membayar tagihan Anda sejak invoice dikirimkan. Ini sangat penting untuk mendeteksi klien mana yang sering menunda pembayaran.
        </p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">3. Pemantau Piutang Belum Tertagih (Aging Invoices)</h3>
        <p>
          Lihat tagihan Anda yang masuk kategori belum dibayar berdasarkan umur piutang (0-30 hari, 31-60 hari, hingga di atas 90 hari) untuk menyusun prioritas penagihan yang lebih tertarget.
        </p>

        <h3 className="text-lg font-semibold text-white mt-6 mb-2">4. Ekspor Laporan Sekali Klik</h3>
        <p>
          Kini Anda dapat mengunduh laporan analisis keuangan dalam format PDF berkualitas tinggi untuk presentasi rapat internal, atau format CSV/XLSX untuk diproses di software spreadsheet eksternal.
        </p>

        <p className="mt-8">
          Fitur Dashboard Analytics baru ini sudah tersedia secara otomatis untuk seluruh pengguna premium InvoiceQu. Silakan login ke akun Anda sekarang untuk mencobanya!
        </p>
      </div>
    ),
  },
  "integrasi-xendit": {
    title: "Panduan Lengkap Integrasi Xendit di InvoiceQu",
    excerpt: "Langkah demi langkah mengintegrasikan payment gateway Xendit untuk menerima pembayaran otomatis dari invoice Anda.",
    category: "Tutorial",
    categoryColor: "bg-blue-500/20 text-blue-400",
    date: "1 Apr 2026",
    readTime: "10 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Xendit adalah salah satu payment gateway terkemuka di Indonesia yang mendukung penerimaan pembayaran instan melalui berbagai kanal seperti Virtual Account (BCA, Mandiri, BRI, BNI), QRIS, e-Wallet (OVO, DANA, LinkAja), hingga minimarket.
        </p>
        <p>
          Dengan menyambungkan akun Xendit Anda ke InvoiceQu, status tagihan invoice Anda akan otomatis terupdate menjadi **Lunas (Paid)** secara real-time setiap kali klien melakukan pembayaran, tanpa perlu verifikasi manual lagi.
        </p>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">Langkah 1: Siapkan Akun Xendit Anda</h2>
        <p>
          Jika belum memiliki akun, silakan daftar terlebih dahulu di situs resmi Xendit dan selesaikan proses aktivasi bisnis (KTP/akta perusahaan). Setelah akun aktif, Anda bisa beralih ke dashboard integrasi.
        </p>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">Langkah 2: Buat API Key di Dashboard Xendit</h2>
        <ol className="list-decimal list-inside space-y-2 pl-4">
          <li>Masuk ke Dashboard Xendit Anda.</li>
          <li>Buka menu <strong>Settings &gt; Developer &gt; API Keys</strong>.</li>
          <li>Klik <strong>Create Secret Key</strong>.</li>
          <li>Beri nama kunci tersebut (misalnya: "InvoiceQu Integration").</li>
          <li>Beri izin akses <strong>Read &amp; Write</strong> pada kolom Money In.</li>
          <li>Salin Secret Key yang muncul (simpan dengan aman karena kunci ini hanya diperlihatkan sekali).</li>
        </ol>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">Langkah 3: Masukkan API Key ke InvoiceQu</h2>
        <ol className="list-decimal list-inside space-y-2 pl-4">
          <li>Login ke akun InvoiceQu Anda.</li>
          <li>Buka halaman <strong>Pengaturan &gt; Integrasi &gt; Xendit</strong>.</li>
          <li>Tempelkan Secret Key yang telah Anda salin sebelumnya pada kolom yang tersedia.</li>
          <li>Simpan pengaturan Anda.</li>
        </ol>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">Langkah 4: Konfigurasi Webhook Callback (Otomatisasi)</h2>
        <p>
          Agar status invoice otomatis berubah menjadi Lunas, Xendit perlu mengirim sinyal pemberitahuan ke InvoiceQu:
        </p>
        <ol className="list-decimal list-inside space-y-2 pl-4">
          <li>Salin <strong>URL Callback</strong> yang tertera di halaman Integrasi InvoiceQu Anda.</li>
          <li>Kembali ke Dashboard Xendit, lalu masuk ke menu <strong>Settings &gt; Developer &gt; Webhooks</strong>.</li>
          <li>Tempelkan URL tersebut ke kolom <strong>Invoices (Paid &amp; Expired)</strong>.</li>
          <li>Klik tombol Test and Save.</li>
        </ol>

        <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 my-6">
          <h3 className="text-base md:text-lg font-semibold text-blue-400 mb-2">🎉 Selamat! Integrasi Anda Selesai</h3>
          <p className="text-xs md:text-sm text-white/60">
            Sekarang, setiap kali Anda membuat invoice baru, klien akan melihat tombol pembayaran digital. Saat mereka membayar, sistem InvoiceQu akan langsung mengupdate datanya secara otomatis dan mengirimkan tanda terima lunas ke email klien Anda.
          </p>
        </div>
      </div>
    ),
  },
  "pajak-invoice-indonesia": {
    title: "Memahami Pajak Invoice di Indonesia: PPN & PPh",
    excerpt: "Panduan lengkap tentang kewajiban pajak terkait invoice, termasuk perhitungan PPN dan PPh untuk bisnis.",
    category: "Bisnis",
    categoryColor: "bg-emerald-500/20 text-emerald-400",
    date: "25 Mar 2026",
    readTime: "12 menit",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-sm md:text-base">
        <p>
          Bagi para pelaku bisnis dan freelancer yang beroperasi di Indonesia, urusan pajak di dalam invoice sering kali membingungkan. Padahal, pemahaman yang benar mengenai kewajiban pajak invoice sangat penting untuk menghindari sanksi administrasi di kemudian hari.
        </p>
        <p>
          Dua jenis pajak utama yang paling sering dicantumkan dan diperhitungkan di dalam invoice jasa adalah **PPN (Pajak Pertambahan Nilai)** dan **PPh (Pajak Penghasilan)**.
        </p>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">1. Pajak Pertambahan Nilai (PPN)</h2>
        <p>
          PPN adalah pajak yang dikenakan atas konsumsi barang kena pajak atau jasa kena pajak. Saat ini, tarif standar PPN di Indonesia adalah **11%**.
        </p>
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li><strong>Siapa yang memungut?</strong> Hanya perusahaan atau wajib pajak yang sudah dikukuhkan sebagai Pengusaha Kena Pajak (PKP). Jika bisnis Anda belum berstatus PKP, Anda tidak berhak memungut PPN.</li>
          <li><strong>Bagaimana pencatatannya?</strong> PPN ditambahkan di atas nilai dasar barang/jasa (DPP) sehingga memperbesar jumlah tagihan yang harus dibayar klien.</li>
        </ul>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Pajak Penghasilan (PPh)</h2>
        <p>
          Untuk transaksi jasa, PPh yang paling sering terlibat adalah PPh Pasal 23 (untuk badan usaha) atau PPh Pasal 21 (untuk individu/freelancer). Berbeda dengan PPN yang sifatnya menambahkan nominal tagihan, PPh jasa ini umumnya bersifat **potongan**.
        </p>
        <ul className="list-disc list-inside space-y-2 pl-4">
          <li><strong>Bagaimana ketentuannya?</strong> Klien Anda (pembayar) akan memotong sebagian kecil pembayaran mereka untuk disetorkan langsung ke kas negara sebagai pajak penghasilan Anda.</li>
          <li><strong>Berapa tarifnya?</strong> PPh Pasal 23 untuk jasa umumnya bertarif **2%** jika Anda memiliki NPWP, dan **4%** jika Anda tidak memiliki NPWP.</li>
          <li><strong>Bukti Potong:</strong> Klien wajib memberikan dokumen Bukti Potong PPh kepada Anda sebagai bukti bahwa pajak Anda telah dipotong dan disetorkan ke negara. Bukti potong ini dapat Anda gunakan sebagai pengurang pajak di akhir tahun pajak.</li>
        </ul>

        <h2 className="text-xl font-bold text-white mt-8 mb-4">Contoh Simulasi Perhitungan Pajak Jasa</h2>
        <p>
          Misalkan Anda memiliki sebuah proyek jasa desain senilai **Rp 10.000.000 (DPP)** untuk klien berbadan hukum, dan bisnis Anda sudah PKP serta memiliki NPWP:
        </p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 font-mono text-xs md:text-sm space-y-2">
          <div>Dasar Pengenaan Pajak (DPP)  : Rp 10.000.000</div>
          <div>PPN (11% x Rp 10.000.000)      : +Rp  1.100.000</div>
          <div className="border-b border-white/10 pb-2">Jumlah Invoice Sebelum PPh     :  Rp 11.100.000</div>
          <div>Potongan PPh 23 (2% x Rp 10.000.000) : -Rp    200.000</div>
          <div className="font-bold text-emerald-400 pt-2">Uang yang Diterima di Rekening :  Rp 10.900.000</div>
        </div>

        <p className="mt-6">
          Gunakan fitur pengaturan pajak fleksibel di InvoiceQu untuk memasukkan PPN dan mengkalkulasikan potongan PPh secara otomatis pada setiap dokumen tagihan Anda tanpa perlu kalkulator eksternal.
        </p>
      </div>
    ),
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const post = blogPosts[resolvedParams.slug];
  
  if (!post) {
    return {
      title: "Artikel Tidak Ditemukan",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `https://invoicequ.my.id/blog/${resolvedParams.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const resolvedParams = await params;
  const post = blogPosts[resolvedParams.slug];

  if (!post) {
    notFound();
  }

  return (
    <PageLayout
      title={post.title}
      subtitle={`${post.date} • ${post.readTime} membaca`}
      badge={post.category.toUpperCase()}
      breadcrumbs={[
        { label: "Blog", href: "/blog" },
        { label: post.title },
      ]}
    >
      <article className="glass-card rounded-3xl p-8 md:p-12 mb-8 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Post Content */}
        <div className="prose prose-invert max-w-none">
          {post.content}
        </div>
        
        {/* Footer actions */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <Link href="/blog" className="btn-secondary !py-2.5 !px-5 !text-sm">
            ← Kembali ke Blog
          </Link>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40">Bagikan artikel:</span>
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(post.title + " - https://invoicequ.my.id/blog/" + resolvedParams.slug)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors"
            >
              WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent("https://invoicequ.my.id/blog/" + resolvedParams.slug)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-semibold transition-colors"
            >
              Twitter / X
            </a>
          </div>
        </div>
      </article>
      
      {/* SaaS CTA */}
      <div className="glass-card rounded-3xl p-8 text-center bg-gradient-to-br from-red-950/20 to-neutral-900 border-red-500/20">
        <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
          Kelola Invoice Bisnis Anda Lebih Mudah &amp; Cepat
        </h3>
        <p className="text-sm text-white/50 max-w-xl mx-auto mb-6">
          Gabung bersama ribuan UMKM dan Freelancer di Indonesia yang menghemat waktu penagihan bulanan hingga 80% menggunakan InvoiceQu.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="https://app.invoicequ.my.id/register" className="btn-primary">
            Mulai Gratis Sekarang
          </a>
          <Link href="/" className="btn-secondary">
            Pelajari Fitur →
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
