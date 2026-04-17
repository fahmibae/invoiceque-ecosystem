'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function CreateClientPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">👤 Tambah Klien Baru</h1>
          <p className="page-subtitle">Isi data klien untuk mempermudah pembuatan invoice</p>
        </div>
        <Link href="/clients" className="btn btn-secondary">← Kembali</Link>
      </div>

      <div>
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border-light)' }}>
            📋 Informasi Klien
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input type="text" className="form-input" placeholder="Nama klien" value={name} onChange={(e) => setName(e.target.value)} />
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
          <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }}>
            💾 Simpan Klien
          </button>
        </div>
      </div>
    </div>
  );
}
