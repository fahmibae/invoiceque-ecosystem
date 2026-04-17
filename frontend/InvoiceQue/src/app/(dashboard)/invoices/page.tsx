'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { invoiceApi, type Invoice } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import styles from './invoices.module.css';

const statusFilters = ['Semua', 'draft', 'sent', 'paid', 'overdue', 'cancelled'];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const status = statusFilter === 'Semua' ? undefined : statusFilter;
      const res = await invoiceApi.list(status, 0, 50);
      setInvoices(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    setSelected(new Set());
  }, [statusFilter]);

  const filtered = invoices.filter((inv) => {
    const matchSearch =
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_name.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const totalAmount = filtered.reduce((sum, inv) => sum + inv.total, 0);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((inv) => inv.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Yakin ingin menghapus ${selected.size} invoice?`)) return;

    setBulkDeleting(true);
    try {
      await invoiceApi.bulkDelete(Array.from(selected));
      setSelected(new Set());
      await fetchInvoices();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus invoice');
    } finally {
      setBulkDeleting(false);
    }
  };

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
        <div style={{ display: 'flex', gap: 8 }}>
          {selected.size > 0 && (
            <button
              className="btn btn-secondary"
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? '⏳ Menghapus...' : `🗑️ Hapus ${selected.size} Invoice`}
            </button>
          )}
          <Link href="/invoices/create" className="btn btn-primary">
            <span>＋</span> Buat Invoice
          </Link>
        </div>
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
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>No. Invoice</th>
                <th>Klien</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Jatuh Tempo</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} style={selected.has(inv.id) ? { background: 'rgba(99,102,241,0.06)' } : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(inv.id)}
                      onChange={() => toggleSelect(inv.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
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
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{inv.due_date ? formatDate(inv.due_date) : '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Link href={`/invoices/${inv.id}`} className="btn btn-ghost btn-sm" title="Detail">
                        👁️
                      </Link>
                      {inv.status === 'draft' && (
                        <Link href={`/invoices/${inv.id}/edit`} className="btn btn-ghost btn-sm" title="Edit">
                          ✏️
                        </Link>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Download PDF"
                        onClick={() => invoiceApi.downloadPdf(inv.id, inv.number + '.pdf')}
                      >
                        📥
                      </button>
                    </div>
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
