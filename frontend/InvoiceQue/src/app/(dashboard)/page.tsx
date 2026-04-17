'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { dashboardApi, invoiceApi, type DashboardStats, type Invoice, type RevenueChartItem } from '@/lib/api';
import { formatCurrency, getStatusColor } from '@/lib/utils';
import UsageIndicator from '@/components/UsageIndicator';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, invoicesRes, chartRes] = await Promise.all([
          dashboardApi.getStats(),
          invoiceApi.list(undefined, 0, 5),
          dashboardApi.getRevenueChart(6),
        ]);
        setStats(statsRes);
        setRecentInvoices(invoicesRes.data || []);
        setRevenueData(chartRes || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Memuat dashboard...
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

  const maxRevenue = Math.max(...revenueData.map((d) => d.revenue), 1);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Selamat datang kembali! Berikut ringkasan bisnis Anda.</p>
        </div>
        <Link href="/invoices/create" className="btn btn-primary">
          <span>＋</span> Buat Invoice
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid stagger-children">
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>💰</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Pendapatan</span>
            <span className={styles.statValue}>{formatCurrency(stats?.totalRevenue ?? 0)}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>📄</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Invoice</span>
            <span className={styles.statValue}>{stats?.totalInvoices ?? 0}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>⏳</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Belum Dibayar</span>
            <span className={styles.statValue}>{formatCurrency(stats?.pendingAmount ?? 0)}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>🔗</div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Payment Links Aktif</span>
            <span className={styles.statValue}>{stats?.activePaymentLinks ?? 0}</span>
          </div>
        </div>
      </div>

      <div className={styles.dashGrid}>
        {/* Revenue Chart */}
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>📈 Grafik Pendapatan</h3>
            <span className={styles.cardPeriod}>6 Bulan Terakhir</span>
          </div>
          <div className={styles.chart}>
            {revenueData.map((d, i) => (
              <div key={i} className={styles.chartBar}>
                <div className={styles.chartBarWrap}>
                  <div
                    className={styles.bar}
                    style={{ height: `${maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0}%` }}
                  >
                    <div className={styles.barTooltip}>
                      {formatCurrency(d.revenue)}
                    </div>
                  </div>
                </div>
                <span className={styles.chartLabel}>{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`card ${styles.actionsCard}`}>
          <h3 className={styles.cardTitle}>⚡ Aksi Cepat</h3>
          <div className={styles.actions}>
            <Link href="/invoices/create" className={styles.actionItem}>
              <div className={styles.actionIcon} style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)' }}>📄</div>
              <span>Buat Invoice Baru</span>
            </Link>
            <Link href="/payments/create" className={styles.actionItem}>
              <div className={styles.actionIcon} style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>🔗</div>
              <span>Buat Payment Link</span>
            </Link>
            <Link href="/clients/create" className={styles.actionItem}>
              <div className={styles.actionIcon} style={{ background: 'linear-gradient(135deg, #059669, #34D399)' }}>👤</div>
              <span>Tambah Klien</span>
            </Link>
            <Link href="/settings" className={styles.actionItem}>
              <div className={styles.actionIcon} style={{ background: 'linear-gradient(135deg, #D97706, #FBBF24)' }}>⚙️</div>
              <span>Pengaturan</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Usage Indicator */}
      <UsageIndicator />

      {/* Recent Invoices */}
      <div className={`card ${styles.recentCard}`}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>📋 Invoice Terbaru</h3>
          <Link href="/invoices" className={styles.viewAll}>Lihat Semua →</Link>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>No. Invoice</th>
                <th>Klien</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                    Belum ada invoice. <Link href="/invoices/create" style={{ color: 'var(--primary)' }}>Buat invoice pertama →</Link>
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link href={`/invoices/${inv.id}`} className="table-link">
                        {inv.number}
                      </Link>
                    </td>
                    <td>{inv.client_name}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(inv.total)}</td>
                    <td>
                      <span className={`badge ${getStatusColor(inv.status)}`}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{inv.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
