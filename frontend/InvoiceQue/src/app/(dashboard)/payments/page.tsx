'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { paymentLinkApi, type PaymentLink } from '@/lib/api';
import { formatCurrency, getStatusColor } from '@/lib/utils';
import styles from './payments.module.css';

export default function PaymentsPage() {
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPaymentLinks() {
      try {
        const res = await paymentLinkApi.list(1, 50);
        setPaymentLinks(res.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat payment links');
      } finally {
        setLoading(false);
      }
    }
    fetchPaymentLinks();
  }, []);

  const filtered = paymentLinks.filter((pl) =>
    pl.title.toLowerCase().includes(search.toLowerCase()) ||
    pl.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = paymentLinks.reduce((sum, pl) => sum + pl.amount * pl.payments, 0);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus payment link ini?')) return;
    try {
      await paymentLinkApi.delete(id);
      setPaymentLinks((prev) => prev.filter((pl) => pl.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus');
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Memuat payment links...
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#EF4444', marginBottom: '16px' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Coba Lagi</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">🔗 Payment Links</h1>
          <p className="page-subtitle">Buat dan kelola link pembayaran Anda</p>
        </div>
        <Link href="/payments/create" className="btn btn-primary">
          <span>＋</span> Buat Payment Link
        </Link>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Links</span>
          <span className={styles.statValue}>{paymentLinks.length}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Link Aktif</span>
          <span className={styles.statValue} style={{ color: 'var(--success)' }}>
            {paymentLinks.filter((pl) => pl.status === 'active').length}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Klik</span>
          <span className={styles.statValue}>{paymentLinks.reduce((s, pl) => s + pl.clicks, 0)}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Pembayaran</span>
          <span className={styles.statValue}>{formatCurrency(totalRevenue)}</span>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchBar}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Cari payment link..."
          className={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Payment Link Cards */}
      <div className={styles.linkGrid}>
        {filtered.map((pl) => (
          <div key={pl.id} className={`card ${styles.linkCard}`}>
            <div className={styles.linkHeader}>
              <div className={styles.linkIconWrap}>
                <span className={styles.linkIcon}>🔗</span>
              </div>
              <span className={`badge ${getStatusColor(pl.status)}`}>
                {pl.status.charAt(0).toUpperCase() + pl.status.slice(1)}
              </span>
            </div>
            <h3 className={styles.linkTitle}>{pl.title}</h3>
            <p className={styles.linkDesc}>{pl.description}</p>
            <div className={styles.linkAmount}>{formatCurrency(pl.amount)}</div>
            <div className={styles.linkStats}>
              <div className={styles.linkStatItem}>
                <span className={styles.linkStatNum}>{pl.clicks}</span>
                <span className={styles.linkStatLabel}>Klik</span>
              </div>
              <div className={styles.linkStatItem}>
                <span className={styles.linkStatNum}>{pl.payments}</span>
                <span className={styles.linkStatLabel}>Pembayaran</span>
              </div>
              <div className={styles.linkStatItem}>
                <span className={styles.linkStatNum}>
                  {pl.clicks > 0 ? Math.round((pl.payments / pl.clicks) * 100) : 0}%
                </span>
                <span className={styles.linkStatLabel}>Konversi</span>
              </div>
            </div>
            <div className={styles.linkUrl}>
              <span className={styles.urlText}>{pl.url}</span>
              <button className={styles.copyBtn} title="Salin link" onClick={() => handleCopy(pl.url)}>📋</button>
            </div>
            <div className={styles.linkFooter}>
              <span className={styles.linkDate}>Dibuat: {new Date(pl.created_at).toLocaleDateString('id-ID')}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(pl.id)} style={{ color: 'var(--danger)', fontSize: 12 }}>Hapus</button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card empty-state">
          <div className="empty-state-icon">🔗</div>
          <h3 className="empty-state-title">Belum ada payment link</h3>
          <p className="empty-state-text">Buat payment link pertama Anda</p>
          <Link href="/payments/create" className="btn btn-primary">Buat Payment Link</Link>
        </div>
      )}
    </div>
  );
}
