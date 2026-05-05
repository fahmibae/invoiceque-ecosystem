'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { paymentLinkApi, type UpdatePaymentLinkRequest } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { GoogleDocIcon, Settings01Icon, ArrowLeft02Icon, CheckmarkBadge01Icon, PauseCircleIcon } from 'hugeicons-react';

export default function EditPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState('IDR');
  const [status, setStatus] = useState('active');
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const link = await paymentLinkApi.get(params.id as string);
        setTitle(link.title);
        setDescription(link.description || '');
        setAmount(link.amount);
        setCurrency(link.currency || 'IDR');
        setStatus(link.status);
        setExpiryDate(link.expires_at ? link.expires_at.split('T')[0] : '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Judul wajib diisi');
      return;
    }
    if (amount <= 0) {
      setError('Jumlah harus lebih dari 0');
      return;
    }

    setError('');
    setSaving(true);
    try {
      const body: UpdatePaymentLinkRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        amount,
        status,
        expires_at: expiryDate ? new Date(expiryDate).toISOString() : undefined,
      };
      await paymentLinkApi.update(params.id as string, body);
      router.push(`/payments/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="animate-fade-in p-10 text-center text-text-secondary">Memuat data...</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2">
            <Link href="/payments" className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"><ArrowLeft02Icon /></Link>
            <h1 className="page-title">Edit Payment Link</h1>
          </div>
          <p className="page-subtitle">Ubah detail payment link Anda</p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="flex flex-col gap-5">
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light"><GoogleDocIcon /> Detail Payment Link</h3>
            <div className="form-group">
              <label className="form-label">Judul</label>
              <input type="text" className="form-input" placeholder="Judul payment link" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea className="form-input form-textarea" placeholder="Deskripsi pembayaran..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Jumlah ({currency})</label>
                <input type="number" className="form-input" min="0" value={amount} onChange={(e) => setAmount(parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Kadaluarsa</label>
                <input type="date" className="form-input" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light"><Settings01Icon /> Status</h3>
            <div className="form-group">
              <label className="form-label">Status Payment Link</label>
              <div className="flex gap-2">
                <button type="button" className={`btn flex items-center gap-2 ${status === 'active' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatus('active')}>
                  <CheckmarkBadge01Icon /> Aktif
                </button>
                <button type="button" className={`btn flex items-center gap-2 ${status === 'inactive' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatus('inactive')}>
                  <PauseCircleIcon /> Nonaktif
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-center gap-2">
            <button className="btn btn-primary btn-lg w-auto" onClick={handleSubmit} disabled={saving}>
              {saving ? ' Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <Link href={`/payments/${params.id}`} className="btn btn-secondary lg:w-auto text-center">
              Batal
            </Link>
          </div>
        </div>

        {/* Preview */}
        <div className="sticky top-[calc(var(--header-height)+24px)] max-lg:relative max-lg:top-0">
          <div className="card p-0 overflow-hidden">
            <div className="py-3 px-5 text-xs font-bold text-text-tertiary uppercase tracking-[0.5px] border-b border-border-light">Preview</div>
            <div className="px-6 py-8 flex flex-col items-center text-center">
              <div className="w-[50px] h-[50px] bg-gradient-to-br from-red-600 to-red-500 rounded-md flex items-center justify-center font-extrabold text-lg text-white mb-5">IQ</div>
              <h3 className="text-lg font-bold mb-2">{title || 'Judul Payment Link'}</h3>
              <p className="text-[13px] text-text-secondary mb-5 leading-[1.6]">{description || 'Deskripsi pembayaran...'}</p>
              <div className="text-[28px] font-black bg-gradient-to-br from-red-600 to-red-500 bg-clip-text text-transparent mb-6">
                {amount > 0 ? formatCurrency(amount, currency) : formatCurrency(0, currency)}
              </div>
              <div className={`w-full p-3.5 font-bold text-[15px] rounded-md text-center mb-4 cursor-default ${status === 'active' ? 'bg-gradient-to-br from-red-600 to-red-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                {status === 'active' ? 'Bayar Sekarang' : 'Link Nonaktif'}
              </div>
              <div className="text-[11px] text-text-tertiary">Powered by InvoiceQu</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
