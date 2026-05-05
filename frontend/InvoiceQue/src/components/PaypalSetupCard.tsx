'use client';

import React, { useState, useEffect } from 'react';
import { paypalApi, type PaypalAccount } from '@/lib/api';
import { Link04Icon, Alert01Icon, Delete02Icon } from 'hugeicons-react';

export default function PaypalSetupCard() {
  const [account, setAccount] = useState<PaypalAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    paypalApi.getAccount()
      .then(setAccount)
      .catch(() => setAccount(null))
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Email PayPal tidak valid');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await paypalApi.connect(email);
      setAccount(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghubungkan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Yakin ingin melepas koneksi PayPal?')) return;
    setDeleting(true);
    try {
      await paypalApi.disconnect();
      setAccount(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal melepas');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return null;

  // ── Connected State ──
  if (account) {
    return (
      <div className="bg-bg-card border-2 rounded-xl p-5 border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 mt-5">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-border-light">
          <div className="flex items-center gap-3.5">
            <div className="text-[28px] text-blue-600">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/></svg>
            </div>
            <div>
              <div className="text-base font-bold text-text-primary mb-1">PayPal Terhubung</div>
              <div className="text-[13px] text-text-tertiary">Pembayaran internasional aktif</div>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={deleting}
            className="p-2 rounded-lg hover:bg-red-500/10 text-text-tertiary hover:text-red-500 transition-all cursor-pointer"
            title="Lepas koneksi PayPal"
          >
            <Delete02Icon size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-tertiary">Status</span>
            <span className="inline-block py-1 px-2.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600">✓ Active</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-tertiary">Email PayPal</span>
            <span className="font-semibold text-text-primary">{account.paypal_email}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-tertiary">Currency</span>
            <span className="font-semibold text-text-primary text-xs">USD, EUR, GBP, SGD, dll</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Setup State ──
  return (
    <div className="bg-bg-card border-2 rounded-xl p-5 border-border-color mt-5">
      <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-border-light">
        <div className="text-[28px] text-blue-600">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/></svg>
        </div>
        <div>
          <div className="text-base font-bold text-text-primary mb-1">Hubungkan PayPal</div>
          <div className="text-[13px] text-text-tertiary">Terima pembayaran internasional (USD, EUR, GBP, dll)</div>
        </div>
      </div>

      <div className="mb-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
        <div className="text-[13px] text-blue-700 dark:text-blue-400 leading-relaxed">
          💡 Cukup masukkan email PayPal Anda. Tidak perlu daftar PayPal Developer — pembayaran akan langsung masuk ke akun PayPal Anda.
        </div>
      </div>

      <form onSubmit={handleConnect}>
        <div className="form-group">
          <label className="form-label">Email PayPal</label>
          <input
            type="email"
            className="form-input"
            placeholder="email@paypal.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-[13px] mb-3"><Alert01Icon size={16}/> {error}</div>
        )}
        <button type="submit" className="flex items-center gap-2 btn btn-primary !bg-blue-600 hover:!bg-blue-700" disabled={submitting}>
          {submitting ? 'Menghubungkan...' : <><Link04Icon size={16}/> Hubungkan PayPal</>}
        </button>
      </form>
    </div>
  );
}
