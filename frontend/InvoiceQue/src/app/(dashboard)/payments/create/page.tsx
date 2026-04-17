'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './create-payment.module.css';

export default function CreatePaymentPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [expiryDate, setExpiryDate] = useState('');

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">🔗 Buat Payment Link</h1>
          <p className="page-subtitle">Buat link pembayaran untuk pelanggan Anda</p>
        </div>
        <Link href="/payments" className="btn btn-secondary">← Kembali</Link>
      </div>

      <div className={styles.createGrid}>
        <div className={styles.formSide}>
          <div className="card">
            <h3 className={styles.sectionTitle}>📝 Detail Payment Link</h3>
            <div className="form-group">
              <label className="form-label">Judul</label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: Web Development Package"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Deskripsi pembayaran..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Jumlah (Rp)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Kadaluarsa</label>
                <input
                  type="date"
                  className="form-input"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className={styles.sectionTitle}>⚙️ Pengaturan</h3>
            <div className={styles.optionRow}>
              <div>
                <div className={styles.optionTitle}>Multiple Payments</div>
                <div className={styles.optionDesc}>Izinkan link digunakan berkali-kali</div>
              </div>
              <label className={styles.toggle}>
                <input type="checkbox" defaultChecked />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
            <div className={styles.optionRow}>
              <div>
                <div className={styles.optionTitle}>Notifikasi Email</div>
                <div className={styles.optionDesc}>Kirim notifikasi setiap ada pembayaran</div>
              </div>
              <label className={styles.toggle}>
                <input type="checkbox" defaultChecked />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
            <div className={styles.optionRow}>
              <div>
                <div className={styles.optionTitle}>Redirect Setelah Bayar</div>
                <div className={styles.optionDesc}>Arahkan ke halaman thank you</div>
              </div>
              <label className={styles.toggle}>
                <input type="checkbox" />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            🔗 Buat Payment Link
          </button>
        </div>

        <div className={styles.previewSide}>
          <div className={`card ${styles.previewCard}`}>
            <div className={styles.previewLabel}>Preview</div>
            <div className={styles.previewContent}>
              <div className={styles.previewLogo}>IQ</div>
              <h3 className={styles.previewTitle}>{title || 'Judul Payment Link'}</h3>
              <p className={styles.previewDesc}>{description || 'Deskripsi pembayaran akan muncul di sini...'}</p>
              <div className={styles.previewAmount}>
                {amount > 0 ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount) : 'Rp 0'}
              </div>
              <div className={styles.previewBtnFake}>Bayar Sekarang</div>
              <div className={styles.previewPowered}>Powered by InvoiceQue</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
