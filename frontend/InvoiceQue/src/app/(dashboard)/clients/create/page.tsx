'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api';
import { GoogleDocIcon, Alert01Icon, ArrowLeft02Icon } from 'hugeicons-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

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
          <div className="flex items-center gap-2">
            <Link href="/clients" className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"><ArrowLeft02Icon/></Link>
            <h1 className="page-title">Tambah Klien Baru</h1>
          </div>
          <p className="page-subtitle">Isi data klien untuk mempermudah pembuatan invoice</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full">
        <div className="card">
          <h3 className="text-base flex items-center gap-2 font-bold mb-5 pb-3 border-b border-border-light">
            <GoogleDocIcon/> Informasi Klien
          </h3>

          {error && (
            <div className="flex items-center gap-2 py-3 px-4 mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm">
               <Alert01Icon/> {error}
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
              <PhoneInput
                international
                defaultCountry="ID"
                className="form-input flex items-center"
                placeholder="+62 xxx xxxx xxxx"
                value={phone}
                onChange={(val) => setPhone(val || '')}
              />
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
          <button type="submit" className="btn btn-primary btn-lg w-full mt-2" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Klien'}
          </button>
        </div>
      </form>
    </div>
  );
}
