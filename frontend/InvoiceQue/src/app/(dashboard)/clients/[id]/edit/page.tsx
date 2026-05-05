'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { clientApi } from '@/lib/api';
import { User02Icon, Mail01Icon, SmartPhone01Icon, ArrowLeft02Icon, Building04Icon, Location01Icon, City02Icon } from 'hugeicons-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchClient() {
      try {
        if (!params.id) return;
        const client = await clientApi.get(params.id as string);
        setName(client.name || '');
        setEmail(client.email || '');
        setCompany(client.company || '');
        setPhone(client.phone || '');
        setAddress(client.address || '');
        setCity(client.city || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data klien');
      } finally {
        setLoading(false);
      }
    }
    fetchClient();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError('Nama dan Email wajib diisi');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await clientApi.update(params.id as string, {
        name,
        email,
        company,
        phone,
        address,
        city,
      });
      router.push(`/clients/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan klien');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>Memuat data klien...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full mx-auto">
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2">
            <Link href="/clients" className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"><ArrowLeft02Icon/></Link>
            <h1 className="page-title">Edit Klien</h1>
          </div>
          <p className="page-subtitle">Ubah informasi dan detail kontak klien</p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card relative overflow-hidden before:absolute before:top-0 before:inset-x-0 before:h-[3px] before:bg-gradient-to-r before:from-red-600 before:to-red-400">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
          
          <div className="md:col-span-2 mb-2 pb-2 border-b border-border-light">
            <h3 className="text-base font-bold flex items-center gap-2"><User02Icon className="text-red-600"/> Informasi Utama</h3>
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-1.5"><User02Icon width={16} height={16} className="text-text-tertiary" /> Nama Lengkap <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-1.5"><Mail01Icon width={16} height={16} className="text-text-tertiary" /> Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              className="form-input"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-1.5"><Building04Icon width={16} height={16} className="text-text-tertiary" /> Nama Perusahaan</label>
            <input
              type="text"
              className="form-input"
              placeholder="PT Contoh Sukses"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label flex items-center gap-1.5"><SmartPhone01Icon width={16} height={16} className="text-text-tertiary" /> Nomor Telepon</label>
            <PhoneInput
              international
              defaultCountry="ID"
              className="form-input flex items-center"
              placeholder="+62 xxx xxxx xxxx"
              value={phone}
              onChange={(val) => setPhone(val || '')}
            />
          </div>

          <div className="md:col-span-2 mb-2 pb-2 mt-4 border-b border-border-light">
            <h3 className="text-base font-bold flex items-center gap-2"><Location01Icon className="text-red-600"/> Alamat & Lokasi</h3>
          </div>

          <div className="form-group md:col-span-2">
            <label className="form-label flex items-center gap-1.5"><Location01Icon width={16} height={16} className="text-text-tertiary" /> Alamat Lengkap</label>
            <textarea
              className="form-input form-textarea min-h-[80px]"
              placeholder="Jl. Sudirman No. 123..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="form-group md:col-span-2">
            <label className="form-label flex items-center gap-1.5"><City02Icon width={16} height={16} className="text-text-tertiary" /> Kota / Kabupaten</label>
            <input
              type="text"
              className="form-input"
              placeholder="Jakarta Selatan"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="md:col-span-2 mt-4 pt-4 border-t border-border-color">
            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={saving}
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
