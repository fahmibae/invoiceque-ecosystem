'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { clientApi, type Client } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import styles from './clients.module.css';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchClients = async (searchQuery?: string) => {
    try {
      const res = await clientApi.list(searchQuery || undefined, 1, 50);
      setClients(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat klien');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus klien ini?')) return;
    try {
      await clientApi.delete(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus klien');
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Memuat data klien...
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
          <h1 className="page-title">👥 Klien</h1>
          <p className="page-subtitle">Kelola data klien dan lihat riwayat transaksi</p>
        </div>
        <Link href="/clients/create" className="btn btn-primary">
          <span>＋</span> Tambah Klien
        </Link>
      </div>

      <div className={styles.searchBar}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Cari nama, perusahaan, atau email..."
          className={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.clientGrid}>
        {clients.map((client) => (
          <div key={client.id} className={`card ${styles.clientCard}`}>
            <div className={styles.clientHeader}>
              <div className={styles.avatar}>
                {client.name.split(' ').map((n) => n[0]).join('').substring(0,2)}
              </div>
              <div className={styles.clientMeta}>
                <h3 className={styles.clientName}>{client.name}</h3>
                <p className={styles.clientCompany}>{client.company}</p>
              </div>
            </div>
            <div className={styles.clientDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>📧</span>
                <span className={styles.detailText}>{client.email}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>📱</span>
                <span className={styles.detailText}>{client.phone}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>📍</span>
                <span className={styles.detailText}>{client.address}, {client.city}</span>
              </div>
            </div>
            <div className={styles.clientStats}>
              <div className={styles.clientStatItem}>
                <span className={styles.clientStatNum}>{client.total_invoices}</span>
                <span className={styles.clientStatLabel}>Invoice</span>
              </div>
              <div className={styles.clientStatItem}>
                <span className={styles.clientStatNum}>{formatCurrency(client.total_spent)}</span>
                <span className={styles.clientStatLabel}>Total Transaksi</span>
              </div>
            </div>
            <div className={styles.clientFooter}>
              <span className={styles.clientDate}>Bergabung: {new Date(client.created_at).toLocaleDateString('id-ID')}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(client.id)} style={{ color: 'var(--danger)' }}>Hapus</button>
                <Link href={`/clients/${client.id}`} className="btn btn-ghost btn-sm">Detail →</Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {clients.length === 0 && (
        <div className="card empty-state">
          <div className="empty-state-icon">👥</div>
          <h3 className="empty-state-title">Belum ada klien</h3>
          <p className="empty-state-text">Tambah klien pertama Anda untuk mulai membuat invoice</p>
          <Link href="/clients/create" className="btn btn-primary">Tambah Klien</Link>
        </div>
      )}
    </div>
  );
}
