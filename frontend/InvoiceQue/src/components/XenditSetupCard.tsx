'use client';

import React, { useState, useEffect } from 'react';
import { xenditApi, type XenditAccount } from '@/lib/api';
import { Payment01Icon, Link04Icon, Alert01Icon, Delete02Icon } from 'hugeicons-react';

export default function XenditSetupCard() {
  const [account, setAccount] = useState<XenditAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');

  // Disconnect state
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState('');

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

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setDisconnectError('');
    try {
      await xenditApi.disconnect();
      setAccount(null);
      setShowDisconnectConfirm(false);
      setEmail('');
      setBusinessName('');
    } catch (err) {
      setDisconnectError(err instanceof Error ? err.message : 'Gagal memutuskan koneksi');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) return null;

  if (account) {
    return (
      <>
        <div className="bg-bg-card border-2 rounded-xl p-5 border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)] bg-emerald-50 dark:bg-emerald-900/10 mt-5">
          <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-border-light">
            <div className="text-[28px]"><Payment01Icon/></div>
            <div className="flex-1">
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

          {/* Disconnect Button */}
          <div className="mt-5 pt-4 border-t border-border-light">
            {disconnectError && (
              <div className="flex items-center gap-2 text-red-500 text-[13px] mb-3"><Alert01Icon size={16}/> {disconnectError}</div>
            )}
            <button
              type="button"
              onClick={() => setShowDisconnectConfirm(true)}
              className="flex items-center gap-2 text-[13px] font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              <Delete02Icon size={16}/>
              Putuskan Koneksi Xendit
            </button>
          </div>
        </div>

        {/* Disconnect Confirmation Modal */}
        {showDisconnectConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !disconnecting && setShowDisconnectConfirm(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div
              className="relative bg-bg-card rounded-xl border border-border-color shadow-2xl w-full max-w-md p-6 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 shrink-0">
                  <Alert01Icon size={22}/>
                </div>
                <div>
                  <h3 className="font-bold text-text-primary text-base">Putuskan Koneksi Xendit?</h3>
                </div>
              </div>

              <div className="text-sm text-text-secondary mb-2 leading-relaxed">
                Akun Xendit <strong className="text-text-primary">{account.account_email}</strong> ({account.business_name}) akan diputuskan dari InvoiceQu.
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-5">
                <div className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  <strong>⚠️ Perhatian:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Akun Xendit akan dilepas dari InvoiceQu</li>
                    <li>Pembayaran yang sedang berjalan tetap bisa diselesaikan</li>
                    <li>Anda bisa menghubungkan ulang akun ini kapan saja dengan email yang sama</li>
                  </ul>
                </div>
              </div>

              {disconnectError && (
                <div className="flex items-center gap-2 text-red-500 text-[13px] mb-3"><Alert01Icon size={14}/> {disconnectError}</div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDisconnectConfirm(false)}
                  disabled={disconnecting}
                  className="btn btn-secondary text-sm"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="btn text-sm px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {disconnecting ? 'Memutuskan...' : 'Ya, Putuskan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
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
