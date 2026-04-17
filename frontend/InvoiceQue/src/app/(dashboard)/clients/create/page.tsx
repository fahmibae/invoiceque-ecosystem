'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api';

export default function CreateClientPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama klien wajib diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await clientApi.create({ name, email, phone, company, address, city });
      router.push('/clients');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan klien';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">👤 Tambah Klien Baru</h1>
          <p className="page-subtitle">Isi data klien untuk mempermudah pembuatan invoice</p>
        </div>
        <Link href="/clients" className="btn btn-secondary">← Kembali</Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border-light)' }}>
            📋 Informasi Klien
          </h3>

          {error && (
            <div style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 14 }}>
              ⚠️ {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nama Lengkap *</label>
              <input type="text" className="form-input" placeholder="Nama klien" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Perusahaan</label>
              <input type="text" className="form-input" placeholder="Nama perusahaan" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Telepon</label>
              <input type="tel" className="form-input" placeholder="+62 xxx xxxx xxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Alamat</label>
            <input type="text" className="form-input" placeholder="Alamat lengkap" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Kota</label>
            <input type="text" className="form-input" placeholder="Kota" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? '⏳ Menyimpan...' : '💾 Simpan Klien'}
          </button>
        </div>
      </form>
    </div>
  );
}
