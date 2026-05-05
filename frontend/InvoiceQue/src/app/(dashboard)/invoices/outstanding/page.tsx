'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { invoiceApi, paymentLinkApi, type Invoice, type CreatePaymentLinkRequest } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor, convertToIDR, fetchExchangeRates } from '@/lib/utils';
import Portal from '@/components/ui/Portal';
import {
  Search01Icon, MoneyBag02Icon, GoogleDocIcon, Payment01Icon,
  CheckmarkCircle01Icon, Loading01Icon, ArrowRight01Icon,
  LinkSquare01Icon, Cancel01Icon, ArrowLeft02Icon,
} from 'hugeicons-react';

export default function OutstandingInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [creatingLinkFor, setCreatingLinkFor] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);

  // Modal state for creating payment link
  const [showModal, setShowModal] = useState(false);
  const [modalInvoice, setModalInvoice] = useState<Invoice | null>(null);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [linkAmount, setLinkAmount] = useState(0);
  const [linkCurrency, setLinkCurrency] = useState('IDR');
  const [linkProvider, setLinkProvider] = useState('');

  useEffect(() => {
    fetchOutstanding();
    fetchExchangeRates().then(setExchangeRates);
  }, []);

  async function fetchOutstanding() {
    try {
      setLoading(true);
      // Fetch all invoices, then filter for partially_paid DP invoices
      const res = await invoiceApi.list(undefined, 0, 200);
      const outstanding = (res.data || []).filter(
        inv => inv.payment_type === 'dp' && inv.status === 'partially_paid' && inv.amount_remaining > 0
      );
      setInvoices(outstanding);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data invoice');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      inv =>
        inv.number.toLowerCase().includes(q) ||
        inv.client_name.toLowerCase().includes(q) ||
        inv.client_email?.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  // Stats
  const stats = useMemo(() => {
    const totalOutstanding = invoices.reduce((s, inv) => s + convertToIDR(inv.amount_remaining, inv.currency, exchangeRates ?? undefined, inv.exchange_rate_idr), 0);
    const totalPaid = invoices.reduce((s, inv) => s + convertToIDR(inv.amount_paid, inv.currency, exchangeRates ?? undefined, inv.exchange_rate_idr), 0);
    const totalInvoiceValue = invoices.reduce((s, inv) => s + convertToIDR(inv.total, inv.currency, exchangeRates ?? undefined, inv.exchange_rate_idr), 0);
    return { count: invoices.length, totalOutstanding, totalPaid, totalInvoiceValue };
  }, [invoices, exchangeRates]);

  function openCreateLinkModal(inv: Invoice) {
    setModalInvoice(inv);
    setLinkTitle(`Pelunasan Invoice ${inv.number} — ${inv.client_name}`);
    setLinkDescription(`Sisa pembayaran untuk ${inv.client_name}`);
    setLinkAmount(inv.amount_remaining);
    setLinkCurrency(inv.currency || 'IDR');
    setLinkProvider(inv.currency === 'USD' ? 'paypal' : '');
    setShowModal(true);
    setSuccessMsg('');
  }

  async function handleCreatePaymentLink() {
    if (!modalInvoice) return;
    setCreatingLinkFor(modalInvoice.id);
    try {
      const body: CreatePaymentLinkRequest = {
        title: linkTitle.trim(),
        description: linkDescription.trim() || undefined,
        amount: linkAmount,
        currency: linkCurrency,
        invoice_id: modalInvoice.id,
        payment_provider: linkProvider || undefined,
        client_name: modalInvoice.client_name,
        client_email: modalInvoice.client_email,
      };
      await paymentLinkApi.create(body);
      setShowModal(false);
      setSuccessMsg(`✅ Payment link untuk ${modalInvoice.number} berhasil dibuat!`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membuat payment link');
    } finally {
      setCreatingLinkFor(null);
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>Memuat invoice belum lunas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in p-10 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Coba Lagi</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Portal>
        {/* Create Payment Link Modal */}
        {showModal && modalInvoice && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-5" onClick={() => setShowModal(false)}>
            <div className="bg-bg-card w-full sm:max-w-[520px] sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden border border-border-color animate-fade-in max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <LinkSquare01Icon width={20} height={20} /> Buat Payment Link Pelunasan
                </h3>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors" onClick={() => setShowModal(false)}>
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
                {/* Invoice summary */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/80 to-amber-100/40 dark:from-amber-900/20 dark:to-amber-800/10 border border-amber-200/50 dark:border-amber-800/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-text-primary">{modalInvoice.number}</span>
                    <span className="inline-block py-0.5 px-2.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600">
                      Sisa Bayar
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[13px]">
                    <div>
                      <span className="text-text-tertiary">Klien</span>
                      <div className="font-semibold text-text-primary">{modalInvoice.client_name}</div>
                    </div>
                    <div>
                      <span className="text-text-tertiary">Total Invoice</span>
                      <div className="font-semibold text-text-primary">{formatCurrency(modalInvoice.total, modalInvoice.currency)}</div>
                    </div>
                    <div>
                      <span className="text-text-tertiary">Sudah Dibayar (DP {modalInvoice.dp_percentage}%)</span>
                      <div className="font-semibold text-emerald-600">{formatCurrency(modalInvoice.amount_paid, modalInvoice.currency)}</div>
                    </div>
                    <div>
                      <span className="text-text-tertiary">Sisa Tagihan</span>
                      <div className="font-bold text-amber-600 text-base">{formatCurrency(modalInvoice.amount_remaining, modalInvoice.currency)}</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-text-tertiary mb-1">
                      <span>Progress Pembayaran</span>
                      <span className="font-semibold">{Math.round((modalInvoice.amount_paid / modalInvoice.total) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-white/60 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${(modalInvoice.amount_paid / modalInvoice.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div className="form-group">
                  <label className="form-label">Judul Payment Link</label>
                  <input
                    type="text"
                    className="form-input"
                    value={linkTitle}
                    onChange={e => setLinkTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <textarea
                    className="form-input form-textarea"
                    rows={2}
                    value={linkDescription}
                    onChange={e => setLinkDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Mata Uang</label>
                    <select
                      className="form-input"
                      value={linkCurrency}
                      onChange={e => {
                        setLinkCurrency(e.target.value);
                        if (e.target.value === 'USD') setLinkProvider('paypal');
                        else if (linkProvider === 'paypal') setLinkProvider('');
                      }}
                    >
                      <option value="IDR">🇮🇩 IDR — Rupiah</option>
                      <option value="USD">🇺🇸 USD — Dollar</option>
                      <option value="EUR">🇪🇺 EUR — Euro</option>
                      <option value="GBP">🇬🇧 GBP — Pound</option>
                      <option value="SGD">🇸🇬 SGD — Sing Dollar</option>
                      <option value="MYR">🇲🇾 MYR — Ringgit</option>
                      <option value="JPY">🇯🇵 JPY — Yen</option>
                      <option value="AUD">🇦🇺 AUD — Aus Dollar</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Provider</label>
                    <select
                      className="form-input"
                      value={linkProvider}
                      onChange={e => setLinkProvider(e.target.value)}
                    >
                      <option value="">Auto (Xendit)</option>
                      <option value="xendit">Xendit</option>
                      <option value="paypal">PayPal</option>
                    </select>
                    <p className="text-[10px] text-text-tertiary mt-1">
                      {linkProvider === 'paypal' ? '💳 Mendukung multi-currency' : '🏦 Bank Transfer, E-Wallet, QRIS'}
                    </p>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah Tagihan ({linkCurrency})</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0}
                    value={linkAmount}
                    onChange={e => setLinkAmount(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-[11px] text-text-tertiary mt-1">
                    💡 Otomatis diisi dari sisa tagihan. Anda bisa ubah jika perlu.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>Batal</button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={handleCreatePaymentLink}
                  disabled={creatingLinkFor === modalInvoice.id || linkAmount <= 0}
                >
                  {creatingLinkFor === modalInvoice.id ? (
                    <><Loading01Icon width={16} height={16} className="animate-spin" /> Membuat...</>
                  ) : (
                    <><LinkSquare01Icon width={16} height={16} /> Buat Payment Link</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </Portal>

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title flex items-center gap-3">
            Sisa Pembayaran DP
          </h1>
          <p className="page-subtitle">Invoice dengan Down Payment yang belum dilunasi</p>
        </div>
        <Link href="/invoices" className="btn btn-secondary flex items-center gap-2">Semua Invoice</Link>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-600 text-sm font-medium animate-fade-in">
          {successMsg}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-sm:gap-2.5 mb-6">
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-amber-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}><GoogleDocIcon /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <span className="text-xs text-text-tertiary font-medium">Invoice Belum Lunas</span>
            <span className="text-xl font-extrabold text-text-primary tracking-tight">{stats.count}</span>
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-red-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}><MoneyBag02Icon /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <span className="text-xs text-text-tertiary font-medium">Total Belum Lunas</span>
            <span className="text-xl font-extrabold text-text-primary tracking-tight max-lg:text-base whitespace-nowrap overflow-hidden text-ellipsis">{formatCurrency(stats.totalOutstanding)}</span>
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-green-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}><CheckmarkCircle01Icon /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <span className="text-xs text-text-tertiary font-medium">Total DP Diterima</span>
            <span className="text-xl font-extrabold text-text-primary tracking-tight max-lg:text-base whitespace-nowrap overflow-hidden text-ellipsis">{formatCurrency(stats.totalPaid)}</span>
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-blue-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}><Payment01Icon /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <span className="text-xs text-text-tertiary font-medium">Nilai Total Invoice</span>
            <span className="text-xl font-extrabold text-text-primary tracking-tight max-lg:text-base whitespace-nowrap overflow-hidden text-ellipsis">{formatCurrency(stats.totalInvoiceValue)}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm opacity-50"><Search01Icon /></span>
          <input
            type="text"
            placeholder="Cari nomor invoice atau nama klien..."
            className="w-full py-3 pr-4 pl-11 border border-border-color rounded-md bg-bg-card text-text-primary text-sm outline-none transition-all duration-150 focus:border-amber-400 focus:ring-3 focus:ring-amber-500/10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Invoice Cards */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-4">
          {filtered.map(inv => {
            const paidPct = Math.round((inv.amount_paid / inv.total) * 100);
            const hasRemainingLink = !!inv.remaining_payment_link;
            return (
              <div
                key={inv.id}
                className="card relative overflow-hidden transition-all duration-200 hover:shadow-lg before:absolute before:top-0 before:inset-x-0 before:h-[3px] before:bg-gradient-to-r before:from-amber-500 before:to-amber-400"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                  {/* Left: Invoice Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <Link href={`/invoices/${inv.id}`} className="text-base font-bold text-red-600 hover:text-red-700 transition-colors no-underline">
                        {inv.number}
                      </Link>
                      <span className="inline-block py-0.5 px-2.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600">
                        Sisa Bayar
                      </span>
                      {inv.payment_type === 'dp' && (
                        <span className="inline-block py-0.5 px-2.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600">
                          DP {inv.dp_percentage}%
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-[38px] h-[38px] bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0">
                        {inv.client_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-text-primary">{inv.client_name}</div>
                        <div className="text-xs text-text-tertiary">{inv.client_email}</div>
                      </div>
                    </div>

                    {/* Payment Progress */}
                    <div className="flex items-center gap-4 text-[13px] mb-2">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-text-tertiary text-xs">Progress</span>
                          <span className="text-xs font-bold text-amber-600">{paidPct}%</span>
                        </div>
                        <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {inv.due_date && (
                      <div className="text-xs text-text-tertiary">
                        Jatuh tempo: <span className="font-medium text-text-secondary">{formatDate(inv.due_date)}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Amount Breakdown + Action */}
                  <div className="lg:w-[320px] shrink-0 flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2 p-3 bg-bg-secondary rounded-lg">
                      <div className="flex flex-col items-center gap-0.5 text-center">
                        <span className="text-[11px] text-text-tertiary font-medium">Total</span>
                        <span className="text-sm font-bold text-text-primary">{formatCurrency(inv.total, inv.currency)}</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 text-center">
                        <span className="text-[11px] text-text-tertiary font-medium">DP Dibayar</span>
                        <span className="text-sm font-bold text-emerald-600">{formatCurrency(inv.amount_paid, inv.currency)}</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 text-center">
                        <span className="text-[11px] text-text-tertiary font-medium">Sisa</span>
                        <span className="text-sm font-bold text-amber-600">{formatCurrency(inv.amount_remaining, inv.currency)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {hasRemainingLink ? (
                        <a
                          href={inv.remaining_payment_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary flex-1 text-sm"
                        >
                          <LinkSquare01Icon width={16} height={16} /> Lihat Link Pelunasan
                        </a>
                      ) : (
                        <button
                          className="btn btn-primary flex-1 text-sm"
                          onClick={() => openCreateLinkModal(inv)}
                          disabled={creatingLinkFor === inv.id}
                        >
                          {creatingLinkFor === inv.id ? (
                            <><Loading01Icon width={16} height={16} className="animate-spin" /> Membuat...</>
                          ) : (
                            <><Payment01Icon width={16} height={16} /> Buat Link Pelunasan</>
                          )}
                        </button>
                      )}
                      <Link href={`/invoices/${inv.id}`} className="btn btn-secondary text-sm shrink-0">
                        <ArrowRight01Icon width={16} height={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card flex flex-col justify-center items-center text-center py-16 px-5">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-full flex items-center justify-center mb-5">
            <CheckmarkCircle01Icon className="text-emerald-500" width={40} height={40} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Semua Invoice DP Sudah Lunas! 🎉</h3>
          <p className="text-sm text-text-secondary mb-6 max-w-md">
            Tidak ada invoice dengan Down Payment yang masih memiliki sisa pembayaran. Semua pembayaran telah dilunasi.
          </p>
          <Link href="/invoices" className="btn btn-primary">Lihat Semua Invoice</Link>
        </div>
      )}
    </div>
  );
}
