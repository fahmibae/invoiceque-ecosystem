'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api';
import { countries } from '@/lib/countries';
import { GoogleDocIcon, Alert01Icon, ArrowLeft02Icon, City02Icon, Mail01Icon, Building04Icon, SmartPhone01Icon, Location01Icon, User02Icon, Globe02Icon, LeftToRightListNumberIcon, Notebook01Icon, MoonLandingIcon } from 'hugeicons-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useSubscriptionUsage } from '@/hooks/useSubscriptionUsage';
import FeatureLimitLock from '@/components/subscription/FeatureLimitLock';

export default function CreateClientPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const subscription = useSubscriptionUsage();
  const clientLocked = subscription.isResourceLocked('clients');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clientLocked) {
      setError(subscription.limitMessage('clients'));
      return;
    }
    if (!name.trim()) {
      setError('Nama klien wajib diisi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await clientApi.create({ name, email, phone, company, address, city, state, country, zip, notes });
      router.push('/clients');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan klien';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!subscription.loading && clientLocked) {
    return (
      <FeatureLimitLock
        resource="clients"
        usage={subscription.usage}
        backHref="/clients"
        backLabel="Kembali ke Klien"
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2">
            <Link href="/clients" className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"><ArrowLeft02Icon /></Link>
            <h1 className="page-title">Tambah Klien Baru</h1>
          </div>
          <p className="page-subtitle">Isi data klien untuk mempermudah pembuatan invoice</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full">
        <div className="card">
          <h3 className="text-base flex items-center gap-2 font-bold mb-5 pb-3 border-b border-border-light">
            <GoogleDocIcon /> Informasi Klien
          </h3>

          {error && (
            <div className="flex items-center gap-2 py-3 px-4 mb-4 rounded-lg bg-red-500/10 text-red-500 text-sm">
              <Alert01Icon /> {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5"><User02Icon width={16} height={16} className="text-text-tertiary" /> Nama Lengkap *</label>
              <input type="text" className="form-input" placeholder="Nama klien" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5"><Building04Icon width={16} height={16} className="text-text-tertiary" /> Perusahaan</label>
              <input type="text" className="form-input" placeholder="Nama perusahaan" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5"><Mail01Icon width={16} height={16} className="text-text-tertiary" /> Email</label>
              <input type="email" className="form-input" placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5"><SmartPhone01Icon width={16} height={16} className="text-text-tertiary" /> Telepon</label>
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
            <label className="form-label flex items-center gap-1.5"><Location01Icon width={16} height={16} className="text-text-tertiary" /> Alamat</label>
            <textarea rows={3} className="form-input form-textarea" placeholder="Alamat lengkap" value={address} onChange={(e) => setAddress(e.target.value)}></textarea>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5"><City02Icon width={16} height={16} className="text-text-tertiary" /> Kota</label>
              <input type="text" className="form-input" placeholder="Kota" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5"><MoonLandingIcon width={16} height={16} className="text-text-tertiary" /> Provinsi</label>
              <input type="text" className="form-input" placeholder="Provinsi" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5"><LeftToRightListNumberIcon width={16} height={16} className="text-text-tertiary" /> Kode Pos</label>
              <input type="text" className="form-input" placeholder="Kode Pos" value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5"><Globe02Icon width={16} height={16} className="text-text-tertiary" /> Negara</label>
              <select className="form-input" value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">Pilih Negara</option>
                {countries.map(c => (
                  <option key={c.code} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label flex items-center gap-1.5"><Notebook01Icon width={16} height={16} className="text-text-tertiary" /> Catatan</label>
            <textarea rows={3} className="form-input form-textarea" placeholder="Catatan" value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-full mt-2" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Klien'}
          </button>
        </div>
      </form>
    </div>
  );
}
