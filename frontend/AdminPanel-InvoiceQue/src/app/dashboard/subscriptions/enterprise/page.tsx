'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Crown, Link2, Copy, Check, ExternalLink,
  User, Mail, Building2, Phone, Send, Sparkles, Clock, Tag, FileText,
} from 'lucide-react';
import { usersApi, type User as UserType } from '@/lib/api';

// ── Token encoder (same logic as landing page) ──
function encodeToken(data: { amount: number; label: string; desc: string; exp: number }): string {
  const json = JSON.stringify(data);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  const reversed = b64.split('').reverse().join('');
  return 'iq_' + reversed + '_ent';
}

function formatRupiah(val: string) {
  const num = val.replace(/\D/g, '');
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatRupiahNumber(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

const inputCls = 'w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all text-sm';

export default function EnterpriseLinkPage() {
  // Form state
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('Enterprise');
  const [desc, setDesc] = useState('');
  const [expDays, setExpDays] = useState('7');

  // User search
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Result
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Search users
  const searchUsers = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setUsers([]); return; }
    setLoadingUsers(true);
    try {
      const res = await usersApi.list(q, 1, 10);
      setUsers(res.data || []);
    } catch { setUsers([]); }
    finally { setLoadingUsers(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchUsers(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, searchUsers]);

  const handleSelectUser = (user: UserType) => {
    setSelectedUser(user);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount.replace(/\D/g, ''), 10);
    if (!numAmount || numAmount < 1000) {
      alert('Nominal harus lebih dari Rp 1.000');
      return;
    }

    const expTimestamp = Date.now() + parseInt(expDays) * 24 * 60 * 60 * 1000;
    const token = encodeToken({
      amount: numAmount,
      label: label || 'Enterprise',
      desc: desc || 'Paket Enterprise Custom',
      exp: expTimestamp,
    });

    const link = `https://invoicequ.my.id/checkout?plan=enterprise&token=${token}`;
    setGeneratedLink(link);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!selectedUser?.phone && !selectedUser) return;
    const phone = selectedUser?.phone?.replace(/\D/g, '') || '';
    const numAmount = parseInt(amount.replace(/\D/g, ''), 10);
    const msg = encodeURIComponent(
      `Halo ${selectedUser?.name || 'Kak'},\n\nBerikut link checkout untuk paket *${label}* senilai *${formatRupiahNumber(numAmount)}*/bulan:\n\n${generatedLink}\n\nLink berlaku ${expDays} hari. Silakan klik untuk melanjutkan pendaftaran.\n\nTerima kasih! 🙏\n- Tim InvoiceQue`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleSendEmail = () => {
    if (!selectedUser?.email) return;
    const numAmount = parseInt(amount.replace(/\D/g, ''), 10);
    const subject = encodeURIComponent(`Checkout Paket ${label} - InvoiceQue`);
    const body = encodeURIComponent(
      `Halo ${selectedUser?.name || ''},\n\nBerikut link checkout untuk paket ${label} senilai ${formatRupiahNumber(numAmount)}/bulan:\n\n${generatedLink}\n\nLink berlaku ${expDays} hari.\n\nTerima kasih!\nTim InvoiceQue`
    );
    window.open(`mailto:${selectedUser.email}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/dashboard/subscriptions" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Subscriptions
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            Generate Link Enterprise
          </h1>
          <p className="text-sm text-zinc-500 mt-1 ml-[52px]">Buat link checkout custom untuk klien Enterprise</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left: Form ── */}
        <div className="lg:col-span-3 space-y-5">
          {/* User Selection */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" /> Pilih User (Opsional)
            </h3>
            <p className="text-xs text-zinc-500">Cari user yang akan dikirim link checkout Enterprise.</p>

            {selectedUser ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {selectedUser.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{selectedUser.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{selectedUser.email}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-xs text-zinc-500 hover:text-rose-400 transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10">
                  Ganti
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  className={inputCls}
                  placeholder="Cari nama atau email user..."
                />
                {showDropdown && searchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-2 glass-card p-2 max-h-60 overflow-y-auto z-50 shadow-2xl">
                    {loadingUsers ? (
                      <div className="p-4 text-center text-xs text-zinc-500">Mencari...</div>
                    ) : users.length === 0 ? (
                      <div className="p-4 text-center text-xs text-zinc-500">User tidak ditemukan</div>
                    ) : (
                      users.map(u => (
                        <button key={u.id} onClick={() => handleSelectUser(u)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors text-left">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-white truncate">{u.name}</p>
                            <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Plan Configuration */}
          <form onSubmit={handleGenerate} className="glass-card p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" /> Konfigurasi Paket
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400">Nominal per Bulan (IDR) <span className="text-rose-400">*</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-sm font-medium">Rp</span>
                <input
                  type="text" required
                  value={formatRupiah(amount)}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  className={`${inputCls} pl-12 text-lg font-semibold`}
                  placeholder="500.000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" /> Label Paket
                </label>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} placeholder="Enterprise" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Berlaku (hari)
                </label>
                <select value={expDays} onChange={(e) => setExpDays(e.target.value)}
                  className={`${inputCls} cursor-pointer`}>
                  <option value="3" className="bg-[#18181b]">3 Hari</option>
                  <option value="7" className="bg-[#18181b]">7 Hari</option>
                  <option value="14" className="bg-[#18181b]">14 Hari</option>
                  <option value="30" className="bg-[#18181b]">30 Hari</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Deskripsi <span className="text-zinc-600">(opsional)</span>
              </label>
              <textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)}
                className={`${inputCls} resize-none`}
                placeholder="Paket Enterprise custom untuk PT ..." />
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3.5 text-sm">
              <Link2 className="w-4 h-4" /> Generate Link Checkout
            </button>
          </form>
        </div>

        {/* ── Right: Preview & Result ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Preview Card */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" /> Preview Paket
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Paket</span>
                <span className="font-semibold text-amber-400">{label || 'Enterprise'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Harga</span>
                <span className="font-bold text-white text-lg">
                  {amount ? formatRupiahNumber(parseInt(amount.replace(/\D/g, ''), 10) || 0) : 'Rp 0'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Periode</span>
                <span className="text-zinc-300">/ bulan</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Berlaku</span>
                <span className="text-zinc-300">{expDays} hari</span>
              </div>
              {selectedUser && (
                <>
                  <div className="h-px bg-white/6 my-1" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">User</span>
                    <span className="text-zinc-300 truncate ml-4">{selectedUser.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">Email</span>
                    <span className="text-zinc-300 truncate ml-4 text-xs">{selectedUser.email}</span>
                  </div>
                </>
              )}
              <div className="h-px bg-white/6 my-1" />
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">Fitur</p>
                {['Unlimited Invoice', 'Unlimited Klien', 'Unlimited Payment Link', 'API Access', 'Dedicated Support', 'SLA Agreement'].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-xs text-zinc-400">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Generated Link Result */}
          {generatedLink && (
            <div className="glass-card p-6 space-y-4 border-emerald-500/20 bg-emerald-500/[0.03]" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Check className="w-4 h-4" /> Link Berhasil Di-generate
              </div>

              <div className="bg-black/40 rounded-xl p-3 break-all text-xs text-zinc-400 font-mono leading-relaxed max-h-24 overflow-y-auto">
                {generatedLink}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleCopy}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-all cursor-pointer border-none">
                  {copied ? <><Check className="w-3.5 h-3.5" /> Tersalin!</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
                </button>
                <a href={generatedLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all">
                  <ExternalLink className="w-3.5 h-3.5" /> Preview
                </a>
              </div>

              {/* Send options */}
              <div className="space-y-2 pt-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Kirim ke User</p>
                {selectedUser?.phone && (
                  <button onClick={handleSendWhatsApp}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-emerald-700/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-700/30 transition-all cursor-pointer">
                    <Send className="w-3.5 h-3.5" /> Kirim via WhatsApp
                  </button>
                )}
                {selectedUser?.email && (
                  <button onClick={handleSendEmail}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-sky-700/20 text-sky-400 border border-sky-500/20 hover:bg-sky-700/30 transition-all cursor-pointer">
                    <Mail className="w-3.5 h-3.5" /> Kirim via Email
                  </button>
                )}
                {!selectedUser && (
                  <p className="text-[11px] text-zinc-600 text-center py-2">Pilih user terlebih dahulu untuk mengirim link langsung.</p>
                )}
              </div>

              <p className="text-[11px] text-zinc-600 text-center pt-1">
                Link berlaku {expDays} hari sejak di-generate.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
