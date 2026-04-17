'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { invoiceApi, type Invoice } from '@/lib/api';
import { formatCurrency, getStatusColor } from '@/lib/utils';
import styles from './invoices.module.css';

const statusFilters = ['Semua', 'draft', 'sent', 'paid', 'overdue', 'cancelled'];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const status = statusFilter === 'Semua' ? undefined : statusFilter;
        const res = await invoiceApi.list(status, 0, 50);
        setInvoices(res.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat invoice');
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, [statusFilter]);

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_name.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const totalAmount = filtered.reduce((sum, inv) => sum + inv.total, 0);

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Memuat data invoice...
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
          <h1 className="page-title">📄 Invoice</h1>
          <p className="page-subtitle">Kelola semua invoice Anda di sini</p>
        </div>
        <Link href="/invoices/create" className="btn btn-primary">
          <span>＋</span> Buat Invoice
        </Link>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total Invoice</span>
          <span className={styles.summaryValue}>{filtered.length}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total Nilai</span>
          <span className={styles.summaryValue}>{formatCurrency(totalAmount)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Sudah Bayar</span>
          <span className={styles.summaryValue} style={{ color: 'var(--success)' }}>
            {filtered.filter((i) => i.status === 'paid').length}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Overdue</span>
          <span className={styles.summaryValue} style={{ color: 'var(--danger)' }}>
            {filtered.filter((i) => i.status === 'overdue').length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Cari nomor invoice atau klien..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.statusTabs}>
          {statusFilters.map((s) => (
            <button
              key={s}
              className={`${styles.statusTab} ${statusFilter === s ? styles.statusTabActive : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'Semua' ? s : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>No. Invoice</th>
                <th>Klien</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Jatuh Tempo</th>
                <th>Dibuat</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/invoices/${inv.id}`} className="table-link">
                      {inv.number}
                    </Link>
                  </td>
                  <td>
                    <div className={styles.clientCell}>
                      <div className={styles.clientAvatar}>
                        {inv.client_name.split(' ').map((n) => n[0]).join('').substring(0,2)}
                      </div>
                      <div>
                        <div className={styles.clientName}>{inv.client_name}</div>
                        <div className={styles.clientEmail}>{inv.client_email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(inv.total)}</td>
                  <td>
                    <span className={`badge ${getStatusColor(inv.status)}`}>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{inv.due_date}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{inv.created_at}</td>
                  <td>
                    <Link href={`/invoices/${inv.id}`} className="btn btn-ghost btn-sm">
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card empty-state">
          <div className="empty-state-icon">📄</div>
          <h3 className="empty-state-title">Belum ada invoice</h3>
          <p className="empty-state-text">Buat invoice pertama Anda untuk memulai</p>
          <Link href="/invoices/create" className="btn btn-primary">Buat Invoice</Link>
        </div>
      )}
    </div>
  );
}
