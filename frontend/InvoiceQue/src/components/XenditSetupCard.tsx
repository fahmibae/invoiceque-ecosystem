'use client';

import React, { useState, useEffect } from 'react';
import { xenditApi, type XenditAccount } from '@/lib/api';
import { Payment01Icon, Link04Icon, Alert01Icon } from 'hugeicons-react';

export default function XenditSetupCard() {
  const [account, setAccount] = useState<XenditAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    xenditApi.getAccount()
      .then(setAccount)
      .catch(() => setAccount(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await xenditApi.setup(email, businessName);
      setAccount(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup gagal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  if (account) {
    return (
      <div className="bg-bg-card border-2 rounded-xl p-5 border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)] bg-emerald-50 dark:bg-emerald-900/10 mt-5">
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-border-light">
          <div className="text-[28px]"><Payment01Icon/></div>
          <div>
            <div className="text-base font-bold text-text-primary mb-1">Xendit Payment Gateway</div>
            <div className="text-[13px] text-text-tertiary">Terima pembayaran langsung ke rekening Anda</div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-tertiary">Status</span>
            <span className="inline-block py-1 px-2.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600">✓ Active</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-tertiary">Email</span>
            <span className="font-semibold text-text-primary">{account.account_email}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-tertiary">Bisnis</span>
            <span className="font-semibold text-text-primary">{account.business_name}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-tertiary">Platform Fee</span>
            <span className="font-semibold text-text-primary">{account.platform_fee_percent}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border-2 rounded-xl p-5 border-border-color mt-5">
      <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-border-light">
        <div className="text-[28px]"><Payment01Icon/></div>
        <div>
          <div className="text-base font-bold text-text-primary mb-1">Setup Xendit Payment</div>
          <div className="text-[13px] text-text-tertiary">Hubungkan akun Xendit untuk menerima pembayaran otomatis</div>
        </div>
      </div>
      <form onSubmit={handleSetup}>
        <div className="form-group">
          <label className="form-label">Email Bisnis</label>
          <input
            type="email"
            className="form-input"
            placeholder="email@bisnis.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Nama Bisnis</label>
          <input
            type="text"
            className="form-input"
            placeholder="PT. Nama Bisnis"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
          />
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-[13px] mb-3"><Alert01Icon/> {error}</div>
        )}
        <button type="submit" className="flex items-center gap-2 btn btn-primary" disabled={submitting}>
          {submitting ? 'Menghubungkan...' : <><Link04Icon/> Hubungkan Xendit</>}
        </button>
      </form>
    </div>
  );
}
