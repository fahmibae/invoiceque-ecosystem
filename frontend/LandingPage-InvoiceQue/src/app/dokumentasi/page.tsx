"use client";

import React, { useState, useEffect, useMemo } from "react";
import PageLayout from "@/components/PageLayout";

// Comprehensive Detailed Document Contents mapping all InvoiceQu features
const docsContent: Record<
  string,
  {
    title: string;
    category: string;
    content: React.ReactNode;
  }
> = {
  // === Panduan Pengguna & Billing ===
  "pengenalan-invoicequ": {
    title: "Pengenalan InvoiceQu",
    category: "Panduan Pengguna & Billing",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Selamat datang di dokumentasi resmi <strong>InvoiceQu</strong>. InvoiceQu adalah ekosistem manajemen finansial terlengkap yang dirancang untuk freelancer, agensi, dan UKM di Indonesia. Platform ini mengintegrasikan penagihan otomatis, pelacakan waktu, CRM klien, manajemen proyek, dan analisis kesehatan bisnis dalam satu dashboard terpadu.
        </p>
        <p className="text-white/70 leading-relaxed">
          Tujuan utama InvoiceQu adalah mengeliminasi proses administratif yang memakan waktu lama, meminimalisir piutang macet, dan mempermudah pencatatan cash flow secara real-time.
        </p>
        
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 my-6">
          <h4 className="text-red-400 font-bold text-sm mb-2">🎯 Fitur Unggulan Ekosistem InvoiceQu:</h4>
          <ul className="list-disc pl-5 space-y-2 text-sm text-white/70">
            <li><strong>Automated Invoicing:</strong> Buat invoice profesional dalam hitungan detik dengan integrasi gerbang pembayaran otomatis.</li>
            <li><strong>Time Tracker & Hourly Billing:</strong> Catat jam kerja Anda dan konversi otomatis menjadi invoice untuk klien.</li>
            <li><strong>Client CRM & Project Management:</strong> Kelola kesepakatan (*deals*) dan pantau progress proyek langsung dari satu tempat.</li>
            <li><strong>Smart Payment Chasers:</strong> Otomatis kirim pengingat pembayaran ke klien via WhatsApp & Email.</li>
            <li><strong>Business Health Analytics:</strong> Pantau performa finansial, rasio profitabilitas, dan proyeksi arus kas.</li>
          </ul>
        </div>
      </div>
    ),
  },
  "membuat-akun": {
    title: "Membuat Akun & Setup Profil",
    category: "Panduan Pengguna & Billing",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Langkah pertama menggunakan InvoiceQu adalah mendaftar dan mengonfigurasi profil bisnis Anda. Informasi profil ini menjadi identitas resmi yang dicantumkan pada kop surat invoice.
        </p>
        
        <h3 className="text-lg font-bold text-white mt-8 mb-4">Langkah Pendaftaran:</h3>
        <ol className="list-decimal pl-5 space-y-3 text-white/70">
          <li>Buka halaman registrasi pada portal aplikasi InvoiceQu.</li>
          <li>Masukkan data Nama Lengkap, alamat Email bisnis, nomor WhatsApp, serta password yang aman.</li>
          <li>Lakukan verifikasi email dengan memasukkan kode OTP yang dikirimkan ke inbox Anda.</li>
          <li>Masuk ke dashboard untuk melengkapi profil organisasi, logo perusahaan, alamat fisik, NPWP, serta mata uang default yang digunakan.</li>
        </ol>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 my-6">
          <h4 className="text-white font-bold text-sm mb-2">💡 Tips Unggah Logo:</h4>
          <p className="text-xs text-white/50 leading-relaxed">
            Gunakan logo berformat PNG transparan dengan rasio 1:1 atau landscape maksimal 300px agar terlihat rapi pada template cetak invoice PDF dan halaman portal online klien.
          </p>
        </div>
      </div>
    ),
  },
  "dashboard-overview": {
    title: "Memahami Dashboard Utama",
    category: "Panduan Pengguna & Billing",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Dashboard utama adalah pusat kendali bisnis Anda. Dashboard menyajikan ringkasan visual instan mengenai kondisi piutang, pendapatan bersih, dan tugas-tugas aktif.
        </p>

        <h3 className="text-lg font-bold text-white mt-8 mb-4">Widget Informasi Utama:</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white/3 border border-white/5 rounded-xl p-4">
            <h5 className="text-white font-bold text-sm mb-1">💰 Pendapatan Bersih (Net Revenue)</h5>
            <p className="text-xs text-white/50">Total dana dari invoice yang telah sukses dilunasi setelah dipotong biaya gerbang pembayaran.</p>
          </div>
          <div className="bg-white/3 border border-white/5 rounded-xl p-4">
            <h5 className="text-white font-bold text-sm mb-1">📈 Piutang Aktif (Outstanding)</h5>
            <p className="text-xs text-white/50">Jumlah dana yang masih tertagih di klien dari invoice yang berstatus Sent atau Unpaid.</p>
          </div>
          <div className="bg-white/3 border border-white/5 rounded-xl p-4">
            <h5 className="text-white font-bold text-sm mb-1">⏰ Pelacakan Waktu Aktif</h5>
            <p className="text-xs text-white/50">Menampilkan timer berjalan dari tugas proyek aktif yang sedang Anda kerjakan.</p>
          </div>
          <div className="bg-white/3 border border-white/5 rounded-xl p-4">
            <h5 className="text-white font-bold text-sm mb-1">🗓️ Agenda Jatuh Tempo</h5>
            <p className="text-xs text-white/50">Kalender interaktif yang merangkum tanggal jatuh tempo tagihan terdekat dalam bulan berjalan.</p>
          </div>
        </div>
      </div>
    ),
  },
  "subscription-billing": {
    title: "Manajemen Paket & Billing",
    category: "Panduan Pengguna & Billing",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          InvoiceQu menawarkan skema paket berlangganan fleksibel yang dapat disesuaikan dengan skala operasional bisnis Anda. Anda dapat melakukan upgrade atau downgrade kapan saja dari menu <strong>Subscription</strong> di dashboard.
        </p>

        <h3 className="text-lg font-bold text-white mt-8 mb-4">Pilihan Paket Berlangganan:</h3>
        <div className="space-y-4">
          <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 text-xs">
            <h5 className="text-white font-bold text-sm mb-1">🆓 Paket Free</h5>
            <p className="text-white/60 mb-2">Gratis selamanya dengan batas pembuatan maksimal 5 invoice per bulan, 3 database klien, dan integrasi manual transfer bank.</p>
          </div>
          <div className="bg-zinc-950 border border-red-500/20 rounded-xl p-4 text-xs">
            <h5 className="text-red-400 font-bold text-sm mb-1">🔥 Paket Pro</h5>
            <p className="text-white/60 mb-2">Invoice tanpa batas, kelola hingga 50 klien, integrasi Payment Gateway (OVO, QRIS, VA), modul Time Tracking, dan pengingat tagihan WhatsApp otomatis.</p>
          </div>
          <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 text-xs">
            <h5 className="text-white font-bold text-sm mb-1">🏢 Paket Enterprise</h5>
            <p className="text-white/60 mb-2">Semua fitur Pro tanpa batas, multi-user/tim, custom domain untuk portal klien, prioritas support 24/7, serta akses API penuh.</p>
          </div>
        </div>
      </div>
    ),
  },

  // === Transaksi & Pembayaran ===
  "mengelola-invoice": {
    title: "Membuat & Mengelola Invoice",
    category: "Transaksi & Pembayaran",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Dengan editor invoice dinamis InvoiceQu, Anda bisa melahirkan dokumen tagihan yang profesional lengkap dengan breakdown pajak, diskon, dan opsi cicilan dalam hitungan detik.
        </p>
        
        <h3 className="text-lg font-bold text-white mt-8 mb-4">Langkah Pembuatan:</h3>
        <ol className="list-decimal pl-5 space-y-2 text-white/70 text-sm">
          <li>Masuk ke menu <strong>Invoices</strong> dan klik <strong>Buat Invoice Baru</strong>.</li>
          <li>Pilih klien dari daftar kontak atau buat kontak klien baru langsung dari modal.</li>
          <li>Tambahkan baris item pekerjaan: isi Deskripsi Layanan, Kuantitas, Harga Satuan, Pajak (PPN/PPH), dan diskon bila ada.</li>
          <li>Tentukan tanggal invoice dikeluarkan dan batas waktu pembayaran (Termin Jatuh Tempo).</li>
          <li>Pilih metode pembayaran yang diizinkan untuk tagihan ini (misal: VA BCA, QRIS, Mandiri Transfer).</li>
          <li>Klik <strong>Simpan & Kirim</strong> untuk langsung menembakkan invoice ke WhatsApp/Email klien.</li>
        </ol>
      </div>
    ),
  },
  "quotations-estimates": {
    title: "Penawaran Harga (Quotations & Estimates)",
    category: "Transaksi & Pembayaran",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Sebelum tagihan dibuat, Anda seringkali perlu mengajukan dokumen penawaran harga formal (*Quotation/Estimate*) kepada klien. Modul ini membantu Anda membuat proposal biaya terstruktur yang dapat disetujui klien secara digital.
        </p>
        
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 my-6">
          <h4 className="text-red-400 font-bold text-sm mb-2">⚡ Konversi Satu-Klik:</h4>
          <p className="text-xs text-white/70 leading-relaxed">
            Begitu klien menyetujui penawaran harga (*Approved*), Anda dapat menekan tombol <strong>Konversi ke Invoice</strong>. Sistem akan otomatis memindahkan seluruh item pekerjaan, rincian harga, dan data klien menjadi dokumen invoice siap tagih tanpa perlu mengetik ulang!
          </p>
        </div>
      </div>
    ),
  },
  "membuat-payment-link": {
    title: "Membuat Tautan Pembayaran (Payment Link)",
    category: "Transaksi & Pembayaran",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Tautan Pembayaran (*Payment Link*) sangat ideal untuk transaksi cepat tanpa perlu menerbitkan invoice terstruktur. Sangat cocok digunakan untuk penjualan produk instan, biaya berlangganan retainer bulanan, atau pendaftaran event.
        </p>
        <p className="text-white/70 leading-relaxed">
          Klien yang mengeklik tautan tersebut akan diarahkan ke halaman pembayaran bermerek bisnis Anda untuk menyelesaikan transaksi menggunakan opsi pembayaran instan yang aktif.
        </p>
      </div>
    ),
  },
  "konfigurasi-gateway": {
    title: "Konfigurasi Payment Gateway",
    category: "Transaksi & Pembayaran",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Hubungkan InvoiceQu dengan akun payment gateway resmi Anda (seperti Midtrans atau Xendit) untuk mengaktifkan konfirmasi pembayaran otomatis tanpa perlu verifikasi mutasi rekening secara manual.
        </p>
        
        <h3 className="text-lg font-bold text-white mt-8 mb-4">Panduan Hubungkan Midtrans:</h3>
        <ul className="list-disc pl-5 space-y-2 text-white/70 text-sm">
          <li>Salin <strong>Server Key</strong> dan <strong>Client Key</strong> dari dashboard Midtrans Anda (Settings &gt; Access Keys).</li>
          <li>Tempelkan ke kolom yang disediakan di halaman <strong>Settings &gt; Payment Gateways &gt; Midtrans</strong> pada dashboard InvoiceQu.</li>
          <li>Klik tombol <strong>Save & Test Connection</strong> untuk mengaktifkan sistem.</li>
        </ul>
      </div>
    ),
  },
  "webhook-callback": {
    title: "Webhook & Callback Konfigurasi",
    category: "Transaksi & Pembayaran",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Agar status invoice otomatis berubah menjadi <strong>Lunas (Paid)</strong> saat klien membayar melalui Virtual Account atau QRIS, Anda wajib mendaftarkan URL callback webhook InvoiceQu pada dashboard payment gateway Anda.
        </p>
        <p className="text-white/70 leading-relaxed">
          Gunakan URL webhook unik yang tercantum pada menu Integrasi Pembayaran di setelan dashboard Anda:
        </p>
        <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 my-4 font-mono text-xs text-red-300">
          https://api.invoicequ.my.id/v1/webhook/callback/YOUR_MERCHANT_TOKEN
        </div>
      </div>
    ),
  },
  "status-tracking": {
    title: "Pelacakan Status Tagihan",
    category: "Transaksi & Pembayaran",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Setiap invoice yang diterbitkan memiliki siklus status yang terperinci untuk memudahkan Anda memantau pos-pos dana yang belum cair.
        </p>
        
        <h3 className="text-lg font-bold text-white mt-8 mb-4">Daftar Status & Penjelasannya:</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-24 text-center py-1 rounded text-xs bg-zinc-700 text-white">Draft</span>
            <span className="text-xs text-white/60">Invoice baru selesai dibuat, belum dikirimkan atau dipublikasikan kepada klien.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-center py-1 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/20">Sent</span>
            <span className="text-xs text-white/60">Tagihan telah sukses terkirim ke WhatsApp/Email klien dan link pembayaran aktif.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-center py-1 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">Unpaid</span>
            <span className="text-xs text-white/60">Klien sudah membuka portal/tautan tagihan tetapi pembayaran belum dituntaskan.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-center py-1 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/20">Paid</span>
            <span className="text-xs text-white/60">Klien telah sukses melakukan pembayaran, status lunas, dan email resi otomatis terkirim.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-center py-1 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/20">Expired</span>
            <span className="text-xs text-white/60">Jatuh tempo pembayaran telah terlampaui dan klien tidak diizinkan lagi melakukan transfer.</span>
          </div>
        </div>
      </div>
    ),
  },

  // === Manajemen Klien & CRM ===
  "tambah-edit-klien": {
    title: "Mengelola Database Klien",
    category: "Manajemen Klien & CRM",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Modul Klien berfungsi sebagai buku alamat pusat bisnis Anda. Anda dapat menyimpan detail lengkap instansi, kontak personal penanggung jawab keuangan (PIC), hingga NPWP klien.
        </p>
        <p className="text-white/70 leading-relaxed">
          Setiap detail klien yang disimpan juga merangkum total tagihan seumur hidup (*Lifetime Billing*) dan total piutang aktif khusus untuk klien tersebut.
        </p>
      </div>
    ),
  },
  "riwayat-transaksi": {
    title: "Riwayat Transaksi Klien",
    category: "Manajemen Klien & CRM",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Ingin memeriksa riwayat pembayaran klien tertentu secara cepat? Buka profil klien, pilih tab <strong>Transaksi</strong>, dan Anda akan disajikan lini masa lengkap dari seluruh invoice, pembayaran sukses, serta status penawaran harga yang pernah dikirimkan kepada mereka.
        </p>
      </div>
    ),
  },
  "crm-deals": {
    title: "Customer Relationship Management (CRM)",
    category: "Manajemen Klien & CRM",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Sebelum sebuah transaksi resmi terjadi, Anda biasanya bernegosiasi dengan prospek klien. Modul CRM terintegrasi InvoiceQu membantu Anda mengelola pipeline penjualan melalui tampilan papan kanban (*Deals Board*).
        </p>
        
        <h3 className="text-lg font-bold text-white mt-8 mb-4">Tahapan Pipeline CRM Default:</h3>
        <div className="grid sm:grid-cols-4 gap-3 text-center text-xs">
          <div className="bg-white/5 p-3 rounded-lg border border-white/5">
            <div className="font-bold mb-1">Lead</div>
            <p className="text-white/40">Prospek masuk / kontak awal</p>
          </div>
          <div className="bg-white/5 p-3 rounded-lg border border-white/5">
            <div className="font-bold mb-1">Proposal</div>
            <p className="text-white/40">Pengajuan penawaran harga</p>
          </div>
          <div className="bg-white/5 p-3 rounded-lg border border-white/5">
            <div className="font-bold mb-1">Negotiation</div>
            <p className="text-white/40">Diskusi harga & termin</p>
          </div>
          <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-red-300">
            <div className="font-bold mb-1">Won</div>
            <p className="text-white/40">Kontrak gol & siap di-invoice</p>
          </div>
        </div>
      </div>
    ),
  },
  "segmentasi-klien": {
    title: "Segmentasi Klien",
    category: "Manajemen Klien & CRM",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Gunakan fitur Tagging/Segmentasi untuk melabeli klien berdasarkan karakteristik operasionalnya (misalnya: <code>VIP</code>, <code>Retainer Bulanan</code>, <code>Corporate</code>, atau <code>Luar Negeri</code>). Label ini berguna saat menyaring metrik laporan keuangan bulanan.
        </p>
      </div>
    ),
  },
  "import-export-data": {
    title: "Bulk Import & Export Data",
    category: "Manajemen Klien & CRM",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Anda tidak perlu memindahkan ratusan data klien secara manual satu per satu. Cukup unduh format template CSV dari menu Klien, lengkapi datanya di Excel, lalu unggah kembali untuk mengimpor seluruh klien Anda secara instan.
        </p>
      </div>
    ),
  },

  // === Manajemen Kerja & Waktu ===
  "manajemen-proyek": {
    title: "Manajemen Proyek",
    category: "Manajemen Kerja & Waktu",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Hubungkan tugas-tugas pekerjaan harian Anda langsung ke tagihan klien melalui modul Proyek. Di sini, Anda dapat membuat papan proyek kolaboratif, memantau tenggat waktu, dan mencatat pengeluaran yang dihabiskan khusus untuk proyek tersebut.
        </p>
      </div>
    ),
  },
  "tasks-milestones": {
    title: "Tugas & Milestones",
    category: "Manajemen Kerja & Waktu",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Pekerjaan besar lebih mudah dikelola ketika dibagi menjadi tugas-tugas kecil (*tasks*) dan tonggak pencapaian (*milestones*). Setiap milestone dapat dihubungkan dengan pembayaran termin (misal: Pembayaran ke-2 saat progress mencapai 50% milestone).
        </p>
      </div>
    ),
  },
  "time-tracking": {
    title: "Time Tracker & Billing Per Jam",
    category: "Manajemen Kerja & Waktu",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Bagi para profesional yang dibayar berdasarkan durasi kerja (*hourly rate* seperti desainer, developer, atau konsultan), fitur Time Tracker bawaan InvoiceQu sangat membantu.
        </p>
        
        <h3 className="text-lg font-bold text-white mt-8 mb-4">Cara Kerja Hourly Billing:</h3>
        <ol className="list-decimal pl-5 space-y-2 text-white/70 text-sm">
          <li>Pilih tugas proyek yang ingin dikerjakan, lalu klik tombol <strong>Mulai Timer (Start)</strong> pada dashboard atau VS Code Extension.</li>
          <li>Begitu pekerjaan selesai, tekan <strong>Stop</strong>. Sistem otomatis menyimpan catatan durasi pengerjaan.</li>
          <li>Saat menerbitkan invoice untuk klien tersebut, klik <strong>Impor Jam Kerja</strong>. Sistem akan menghitung biaya total berdasarkan tarif per jam (*hourly rate*) yang Anda tentukan secara akurat.</li>
        </ol>
      </div>
    ),
  },
  "meeting-scheduler": {
    title: "Meeting Scheduler dengan Klien",
    category: "Manajemen Kerja & Waktu",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Hindari proses bolak-balik chat yang melelahkan hanya untuk menjadwalkan rapat progress dengan klien. Gunakan penjadwal rapat (*Meeting Scheduler*) terintegrasi kami.
        </p>
        <p className="text-white/70 leading-relaxed">
          Hubungkan Google Calendar atau Outlook Anda, buat link jadwal luang Anda, bagikan ke klien, dan biarkan klien memesan slot rapat mereka sendiri. Tautan rapat Zoom atau Google Meet otomatis dibuat dan dikirim ke kedua belah pihak.
        </p>
      </div>
    ),
  },

  // === Pengingat & Otomatisasi ===
  "payment-chasers": {
    title: "Smart Payment Chasers (Pengingat Otomatis)",
    category: "Pengingat & Otomatisasi",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Payment Chasers adalah senjata andalan InvoiceQu untuk mengatasi keterlambatan pembayaran klien. Sistem akan bertindak sebagai asisten keuangan virtual Anda yang menagih secara otomatis sesuai jadwal yang ditentukan.
        </p>
        
        <h3 className="text-lg font-bold text-white mt-8 mb-4">Alur Pengingat Default:</h3>
        <ul className="space-y-3 text-sm text-white/70">
          <li className="flex gap-2">
            <span className="text-red-400 font-bold">1. Tiga Hari Sebelum Jatuh Tempo:</span>
            <span>Kirim email & WhatsApp berisi pemberitahuan sopan pengingat tanggal jatuh tempo terdekat.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-400 font-bold">2. Hari H Jatuh Tempo:</span>
            <span>Kirim tagihan langsung ke nomor WhatsApp utama klien dengan pesan penekanan pembayaran segera.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-400 font-bold">3. H+3 Terlambat Pembayaran:</span>
            <span>Kirim teguran keterlambatan otomatis beserta link pembayaran yang diperbarui dengan denda keterlambatan jika diaktifkan.</span>
          </li>
        </ul>
      </div>
    ),
  },
  "notifikasi-sistem": {
    title: "Notifikasi Sistem & Webhook Real-time",
    category: "Pengingat & Otomatisasi",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Dapatkan notifikasi instan di HP, email, atau browser desktop Anda setiap kali klien membuka email invoice Anda, mengeklik tautan pembayaran, atau saat dana pembayaran sukses ditransfer ke rekening penampungan.
        </p>
      </div>
    ),
  },

  // === Analitik & Toolkit ===
  "business-health": {
    title: "Business Health & Analytics",
    category: "Analitik & Toolkit",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Ketahui dengan pasti apakah bisnis Anda sedang merugi atau untung melalui dasbor analitik kesehatan bisnis (*Business Health Dashboard*).
        </p>
        
        <h3 className="text-lg font-bold text-white mt-8 mb-4">Grafik Analitik yang Tersedia:</h3>
        <ul className="list-disc pl-5 space-y-2 text-white/70 text-sm">
          <li><strong>Cash Flow Analysis:</strong> Grafik perbandingan uang masuk vs pengeluaran operasional setiap bulannya.</li>
          <li><strong>Rasio Umur Piutang (Aging Receivables):</strong> Mengelompokkan invoice belum dibayar berdasarkan durasi keterlambatan (0-30 hari, 31-60 hari, 60+ hari).</li>
          <li><strong>Proyeksi Pendapatan:</strong> Memperkirakan arus kas masuk bulan depan berdasarkan data invoice jatuh tempo terbitan aktif.</li>
        </ul>
      </div>
    ),
  },
  "laporan-ekspor": {
    title: "Laporan & Ekspor Data Pajak",
    category: "Analitik & Toolkit",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Mempermudah pelaporan pajak bulanan atau tahunan dengan modul ekspor data terintegrasi. Anda dapat mengunduh rekapan transaksi bersih, potongan PPh 23, serta tagihan PPN 11% dalam bentuk file Excel (XLSX) atau PDF resmi.
        </p>
      </div>
    ),
  },
  "toolkit-bisnis": {
    title: "Toolkit Bisnis (Alat Bantu Finansial)",
    category: "Analitik & Toolkit",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          InvoiceQu menyediakan berbagai modul asisten kecil (*Business Toolkit*) di dashboard untuk membantu kalkulasi finansial cepat sehari-hari:
        </p>
        
        <ul className="list-disc pl-5 space-y-2 text-white/70 text-sm">
          <li><strong>Kalkulator Pajak:</strong> Hitung instan PPN 11% atau PPh 23 dari nilai kotor tagihan proyek Anda.</li>
          <li><strong>Termin Calculator:</strong> Hitung otomatis tanggal jatuh tempo berdasarkan termin hari yang disepakati (misal: Net 45 dari tanggal 15 Juni).</li>
          <li><strong>PDF Generator Kilat:</strong> Bikin invoice sekali pakai untuk transaksi instan offline tanpa harus mendaftarkan klien ke database terlebih dahulu.</li>
        </ul>
      </div>
    ),
  },

  // === API & Developer ===
  "authentication": {
    title: "API Authentication",
    category: "API & Developer",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Gunakan API Key yang digenerate dari menu pengaturan pengembang di dashboard InvoiceQu untuk mengotorisasi request server-to-server.
        </p>
        <p className="text-white/70 leading-relaxed">
          Sertakan API Key tersebut pada header request HTTP Anda:
        </p>
        <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 my-4 font-mono text-xs text-red-300">
          Authorization: Bearer iq_live_your_secret_api_key
        </div>
      </div>
    ),
  },
  "invoice-endpoints": {
    title: "Invoice API Endpoints",
    category: "API & Developer",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Membuat dan melacak invoice langsung melalui endpoint REST API.
        </p>

        <h3 className="text-sm font-bold text-white mb-2">1. Buat Invoice Dinamis</h3>
        <div className="bg-zinc-950 border border-white/10 rounded-xl overflow-hidden text-xs mb-6">
          <div className="bg-white/5 px-4 py-2 font-mono flex items-center gap-2 border-b border-white/5">
            <span className="bg-green-500/20 text-green-400 font-bold px-2 py-0.5 rounded text-[10px]">POST</span>
            <span className="text-white">/v1/invoices</span>
          </div>
          <div className="p-4 space-y-2 font-mono text-[11px] text-red-300">
{`{
  "client_id": "cli_89231f23c",
  "items": [
    { "name": "Web Design", "qty": 1, "price": 5000000 }
  ],
  "due_date": "2026-06-30"
}`}
          </div>
        </div>

        <h3 className="text-sm font-bold text-white mb-2">2. Ambil Status Tagihan</h3>
        <div className="bg-zinc-950 border border-white/10 rounded-xl overflow-hidden text-xs">
          <div className="bg-white/5 px-4 py-2 font-mono flex items-center gap-2 border-b border-white/5">
            <span className="bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded text-[10px]">GET</span>
            <span className="text-white">/v1/invoices/:invoice_id</span>
          </div>
        </div>
      </div>
    ),
  },
  "payment-endpoints": {
    title: "Payment API Endpoints",
    category: "API & Developer",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Mengintegrasikan halaman transaksi e-commerce atau SaaS Anda langsung ke gerbang pembayaran online kami.
        </p>

        <h3 className="text-sm font-bold text-white mb-2">Membuat Payment Link Dinamis</h3>
        <div className="bg-zinc-950 border border-white/10 rounded-xl overflow-hidden text-xs">
          <div className="bg-white/5 px-4 py-2 font-mono flex items-center gap-2 border-b border-white/5">
            <span className="bg-green-500/20 text-green-400 font-bold px-2 py-0.5 rounded text-[10px]">POST</span>
            <span className="text-white">/v1/payments/create-link</span>
          </div>
          <div className="p-4 space-y-2 font-mono text-[11px] text-red-300">
{`{
  "amount": 150000,
  "currency": "IDR",
  "client_email": "developer@jasa.com",
  "description": "Pembayaran Layanan Cloud Hosting"
}`}
          </div>
        </div>
      </div>
    ),
  },
  "webhooks": {
    title: "Webhook API Events",
    category: "API & Developer",
    content: (
      <div className="space-y-6">
        <p className="text-white/70 leading-relaxed">
          Menerima notifikasi instan langsung di server Anda begitu terjadi pembaruan status pembayaran tagihan klien.
        </p>
        
        <h3 className="text-lg font-bold text-white mt-8 mb-4">Event Webhook yang Dikirim:</h3>
        <ul className="list-disc pl-5 space-y-2 text-white/70 text-sm">
          <li><code>invoice.sent</code> - Invoice terkirim ke email/WhatsApp klien.</li>
          <li><code>payment.completed</code> - Klien melunasi tagihannya secara instan.</li>
          <li><code>invoice.expired</code> - Batas termin waktu jatuh tempo terlewati tanpa pembayaran.</li>
        </ul>
      </div>
    ),
  },
};

// Sidebar structure grouping all documents under clean folders
const sections = [
  {
    title: "Panduan Pengguna & Billing",
    icon: "📖",
    items: [
      { name: "Pengenalan InvoiceQu", slug: "pengenalan-invoicequ", desc: "Overview fitur dan cara kerja platform" },
      { name: "Membuat Akun & Setup", slug: "membuat-akun", desc: "Registrasi dan setup profil bisnis awal" },
      { name: "Dashboard Overview", slug: "dashboard-overview", desc: "Memahami metrik dan navigasi dashboard" },
      { name: "Paket & Billing", slug: "subscription-billing", desc: "Penjelasan limitasi paket dan langganan" },
    ],
  },
  {
    title: "Transaksi & Pembayaran",
    icon: "💳",
    items: [
      { name: "Mengelola Invoice", slug: "mengelola-invoice", desc: "Buat, edit, kirim, dan lacak invoice" },
      { name: "Penawaran Harga", slug: "quotations-estimates", desc: "Buat Quotation dan konversi ke Invoice" },
      { name: "Membuat Payment Link", slug: "membuat-payment-link", desc: "Cara cepat terima uang via chat" },
      { name: "Konfigurasi Gateway", slug: "konfigurasi-gateway", desc: "Setup Xendit, Midtrans, dan lainnya" },
      { name: "Webhook & Callback", slug: "webhook-callback", desc: "Sinkronisasi pembayaran real-time" },
      { name: "Status & Tracking", slug: "status-tracking", desc: "Memahami tahapan status tagihan" },
    ],
  },
  {
    title: "Manajemen Klien & CRM",
    icon: "👥",
    items: [
      { name: "Tambah & Edit Klien", slug: "tambah-edit-klien", desc: "Mengelola database klien Anda" },
      { name: "Riwayat Transaksi", slug: "riwayat-transaksi", desc: "Lacak catatan pembayaran per klien" },
      { name: "CRM Deals Pipeline", slug: "crm-deals", desc: "Pantau prospek dan status negosiasi" },
      { name: "Segmentasi Klien", slug: "segmentasi-klien", desc: "Klasifikasikan klien berdasarkan tag" },
      { name: "Import & Export Data", slug: "import-export-data", desc: "Migrasi data klien menggunakan CSV" },
    ],
  },
  {
    title: "Manajemen Kerja & Waktu",
    icon: "⏰",
    items: [
      { name: "Manajemen Proyek", slug: "manajemen-proyek", desc: "Buat proyek dan hubungkan ke klien" },
      { name: "Tugas & Milestones", slug: "tasks-milestones", desc: "Bagi progress kerja dalam tugas" },
      { name: "Time Tracking", slug: "time-tracking", desc: "Catat jam kerja untuk hourly billing" },
      { name: "Meeting Scheduler", slug: "meeting-scheduler", desc: "Jadwalkan rapat bersama PIC klien" },
    ],
  },
  {
    title: "Pengingat & Otomatisasi",
    icon: "🤖",
    items: [
      { name: "Payment Chasers", slug: "payment-chasers", desc: "Pengingat tagihan WhatsApp otomatis" },
      { name: "Notifikasi Sistem", slug: "notifikasi-sistem", desc: "Notifikasi email dan in-app real-time" },
    ],
  },
  {
    title: "Analitik & Toolkit",
    icon: "📊",
    items: [
      { name: "Business Health", slug: "business-health", desc: "Analisis cash flow dan piutang macet" },
      { name: "Laporan & Pajak", slug: "laporan-ekspor", desc: "Unduh laporan untuk pelaporan pajak" },
      { name: "Toolkit Bisnis", slug: "toolkit-bisnis", desc: "Kalkulator PPN dan invoice kilat" },
    ],
  },
  {
    title: "API & Developer",
    icon: "⚙️",
    items: [
      { name: "Authentication", slug: "authentication", desc: "API Key dan Bearer token setup" },
      { name: "Invoice Endpoints", slug: "invoice-endpoints", desc: "CRUD operations untuk invoice" },
      { name: "Payment Endpoints", slug: "payment-endpoints", desc: "Payment link dan status API" },
      { name: "Webhooks", slug: "webhooks", desc: "Event-driven notification setup" },
    ],
  },
];

export default function DokumentasiPage() {
  const [activeSlug, setActiveSlug] = useState("pengenalan-invoicequ");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync hash in URL with activeSlug
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleHashChange = () => {
        const hash = window.location.hash.replace("#", "");
        if (hash && docsContent[hash]) {
          setActiveSlug(hash);
        }
      };

      // Set initial active slug on mount
      handleHashChange();

      window.addEventListener("hashchange", handleHashChange);
      return () => window.removeEventListener("hashchange", handleHashChange);
    }
  }, []);

  // Set active slug and update hash
  const handleDocClick = (slug: string) => {
    setActiveSlug(slug);
    setMobileMenuOpen(false);
    if (typeof window !== "undefined") {
      window.location.hash = slug;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Find flattened items list for next/prev navigation
  const flatItems = useMemo(() => {
    return sections.flatMap((sec) => sec.items);
  }, []);

  const activeIndex = useMemo(() => {
    return flatItems.findIndex((item) => item.slug === activeSlug);
  }, [activeSlug, flatItems]);

  const prevDoc = activeIndex > 0 ? flatItems[activeIndex - 1] : null;
  const nextDoc = activeIndex < flatItems.length - 1 ? flatItems[activeIndex + 1] : null;

  // Filtered sections for search input
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;

    return sections
      .map((sec) => {
        const matchingItems = sec.items.filter(
          (item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.desc.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return { ...sec, items: matchingItems };
      })
      .filter((sec) => sec.items.length > 0);
  }, [searchQuery]);

  const activeDoc = docsContent[activeSlug] || docsContent["pengenalan-invoicequ"];

  return (
    <PageLayout
      title="Dokumentasi Resmi"
      subtitle="Panduan lengkap, rincian fitur ekosistem, serta dokumentasi API teknis untuk memaksimalkan penggunaan InvoiceQu."
      badge="DOKUMENTASI"
      breadcrumbs={[{ label: "Dokumentasi" }]}
      wide={true}
    >
      <div className="flex flex-col lg:flex-row gap-8 relative items-start">
        {/* Floating mobile drawer toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-3 rounded-full shadow-lg shadow-red-900/30 transition-all text-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Menu Dokumen
        </button>

        {/* Backdrop for mobile drawer */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}

        {/* LEFT SIDEBAR */}
        <aside
          className={`
            fixed lg:sticky top-[96px] left-0 h-[calc(100vh-120px)] lg:h-auto overflow-y-auto lg:overflow-visible
            w-80 max-w-[85vw] lg:w-72 bg-[#09090b] lg:bg-transparent border-r border-white/5 lg:border-none p-6 lg:p-0
            z-45 transition-transform duration-300 lg:transform-none
            ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            fixed inset-y-0
          `}
        >
          {/* Search Input */}
          <div className="mb-6 relative">
            <input
              type="text"
              placeholder="Cari fitur / topik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-white/40 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <div className="space-y-6">
            {filteredSections.map((sec) => (
              <div key={sec.title}>
                <h3 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <span>{sec.icon}</span> {sec.title}
                </h3>
                <ul className="space-y-1">
                  {sec.items.map((item) => {
                    const isActive = item.slug === activeSlug;
                    return (
                      <li key={item.slug}>
                        <button
                          onClick={() => handleDocClick(item.slug)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex flex-col ${
                            isActive
                              ? "bg-red-600/10 border border-red-500/20 text-red-400 font-medium"
                              : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          <span>{item.name}</span>
                          <span className="text-[10px] text-white/30 mt-0.5 group-hover:text-white/40 hidden md:inline">
                            {item.desc}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {filteredSections.length === 0 && (
              <p className="text-sm text-white/40 text-center py-4">Tidak ada dokumentasi ditemukan.</p>
            )}
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <article className="flex-1 w-full bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-8 min-h-[500px] flex flex-col justify-between">
          <div>
            {/* Category Breadcrumb */}
            <div className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">
              {activeDoc.category}
            </div>

            {/* Document Title */}
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-6 border-b border-white/5 pb-4">
              {activeDoc.title}
            </h2>

            {/* Dynamic Content Block */}
            <div className="prose prose-invert max-w-none text-white/70">
              {activeDoc.content}
            </div>
          </div>

          {/* Next / Previous Document Nav */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between border-t border-white/5 pt-8 mt-12">
            {prevDoc ? (
              <button
                onClick={() => handleDocClick(prevDoc.slug)}
                className="flex-1 flex flex-col p-4 rounded-xl border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-all text-left"
              >
                <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1">Kembali</span>
                <span className="text-sm font-bold text-white flex items-center gap-1">
                  ← {prevDoc.name}
                </span>
              </button>
            ) : (
              <div className="flex-1 hidden sm:block" />
            )}

            {nextDoc ? (
              <button
                onClick={() => handleDocClick(nextDoc.slug)}
                className="flex-1 flex flex-col p-4 rounded-xl border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-all text-right items-end"
              >
                <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1">Selanjutnya</span>
                <span className="text-sm font-bold text-white flex items-center gap-1">
                  {nextDoc.name} →
                </span>
              </button>
            ) : (
              <div className="flex-1 hidden sm:block" />
            )}
          </div>
        </article>
      </div>
    </PageLayout>
  );
}
