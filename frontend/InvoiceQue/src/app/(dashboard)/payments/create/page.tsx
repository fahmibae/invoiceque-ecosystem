'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { paymentLinkApi, paypalApi, xenditApi, invoiceApi, type CreatePaymentLinkRequest, type Invoice, invoiceSettingsApi, type InvoiceSettingsData } from '@/lib/api';
import { GoogleDocIcon, Settings01Icon, Invoice01Icon, AlertCircleIcon, ArrowLeft02Icon, CreditCardIcon, Atm02Icon, Alert02Icon } from 'hugeicons-react';

const CURRENCIES = [
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'IDR' || currency === 'JPY' ? 0 : 2,
  }).format(amount);
}

/** Determines label for the invoice's outstanding amount */
function getInvoiceAmountLabel(inv: Invoice): string {
  if (inv.payment_type === 'dp' && inv.amount_remaining > 0 && inv.amount_paid > 0) {
    return `Sisa: ${formatCurrency(inv.amount_remaining, 'IDR')}`;
  }
  if (inv.payment_type === 'dp' && inv.amount_paid === 0) {
    return `DP: ${formatCurrency(inv.dp_amount, 'IDR')}`;
  }
  return formatCurrency(inv.total, 'IDR');
}

/** Returns the amount to pre-fill when selecting an invoice */
function getInvoiceFillAmount(inv: Invoice): number {
  if (inv.payment_type === 'dp' && inv.amount_remaining > 0 && inv.amount_paid > 0) {
    return inv.amount_remaining;
  }
  if (inv.payment_type === 'dp' && inv.amount_paid === 0) {
    return inv.dp_amount;
  }
  return inv.total;
}

/** Status badge color */
function statusBadge(status: string, paymentType: string, amountRemaining: number) {
  if (paymentType === 'dp' && amountRemaining > 0) {
    return { label: 'Sisa Bayar', cls: 'bg-amber-500/15 text-amber-600' };
  }
  switch (status) {
    case 'draft': return { label: 'Draft', cls: 'bg-gray-500/15 text-gray-500' };
    case 'sent': return { label: 'Terkirim', cls: 'bg-blue-500/15 text-blue-600' };
    case 'overdue': return { label: 'Overdue', cls: 'bg-red-500/15 text-red-500' };
    case 'partial': return { label: 'Bayar Sebagian', cls: 'bg-amber-500/15 text-amber-600' };
    default: return { label: status, cls: 'bg-gray-500/15 text-gray-500' };
  }
}

export default function CreatePaymentPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState('IDR');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasXendit, setHasXendit] = useState(false);
  const [hasPaypal, setHasPaypal] = useState(false);
  const [initialCompany, setInitialCompany] = useState('');
  const [logoCompany, setLogoCompany] = useState('');
  // Invoice linking
  const [linkableInvoices, setLinkableInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [accentColor, setAccentColor] = useState('');

  const loadSettings = async () => {
    try {
      const s = await invoiceSettingsApi.get();
      setInitialCompany(s.business_name.substring(0, 2).toUpperCase() || '');
      setLogoCompany(s.logo_url || '');
      setAccentColor(s.accent_color || 'primary');
    } catch {
      // Use defaults if API not available
    }
  };
  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Check available payment gateways
    xenditApi.getAccount().then(() => setHasXendit(true)).catch(() => { });
    paypalApi.getAccount().then(() => setHasPaypal(true)).catch(() => { });

    // Load invoices that can be linked
    invoiceApi.listLinkable()
      .then(res => setLinkableInvoices(res.data ?? []))
      .catch(() => setLinkableInvoices([]))
      .finally(() => setLoadingInvoices(false));
  }, []);

  /** When user picks an invoice, auto-fill title & amount */
  const handleInvoiceSelect = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    if (!invoiceId) {
      setSelectedInvoice(null);
      return;
    }
    const inv = linkableInvoices.find(i => i.id === invoiceId) ?? null;
    setSelectedInvoice(inv);
    if (inv) {
      const isRemainder = inv.payment_type === 'dp' && inv.amount_remaining > 0 && inv.amount_paid > 0;
      const isDpFirst = inv.payment_type === 'dp' && inv.amount_paid === 0;
      setTitle(
        isRemainder
          ? `Pelunasan Invoice ${inv.number} — ${inv.client_name}`
          : isDpFirst
            ? `Down Payment Invoice ${inv.number} — ${inv.client_name}`
            : `Pembayaran Invoice ${inv.number} — ${inv.client_name}`
      );
      setAmount(getInvoiceFillAmount(inv));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Judul payment link wajib diisi');
      return;
    }
    if (amount <= 0) {
      setError('Jumlah harus lebih dari 0');
      return;
    }

    setError('');
    setSaving(true);
    try {
      const body: CreatePaymentLinkRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        amount,
        currency,
        invoice_id: selectedInvoiceId || undefined,
        expires_at: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        payment_provider: paymentProvider || undefined,
        client_name: selectedInvoice?.client_name || undefined,
        client_email: selectedInvoice?.client_email || undefined,
      };
      await paymentLinkApi.create(body);
      router.push('/payments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat payment link');
    } finally {
      setSaving(false);
    }
  };

  const currencyInfo = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2">
            <Link href="/payments" className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"><ArrowLeft02Icon /></Link>
            <h1 className="page-title">Buat Payment Link</h1>
          </div>
          <p className="page-subtitle">Buat link pembayaran untuk pelanggan Anda</p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="flex flex-col gap-5">

          {/* ── Invoice Selector ── */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light">
              <Invoice01Icon /> Kaitkan dengan Invoice (Opsional)
            </h3>

            {loadingInvoices ? (
              <div className="text-sm text-text-tertiary animate-pulse">Memuat daftar invoice…</div>
            ) : linkableInvoices.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-600 text-[13px]">
                <AlertCircleIcon /> Tidak ada invoice yang perlu dibayar. Semua invoice sudah lunas!
              </div>
            ) : (
              <>
                <div className="form-group mb-0">
                  <label className="form-label">Pilih Invoice</label>
                  <select
                    className="form-input"
                    value={selectedInvoiceId}
                    onChange={e => handleInvoiceSelect(e.target.value)}
                  >
                    <option value="">— Tanpa invoice (payment link umum) —</option>
                    {linkableInvoices.map(inv => {
                      const badge = statusBadge(inv.status, inv.payment_type, inv.amount_remaining);
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.number} · {inv.client_name} · {getInvoiceAmountLabel(inv)} [{badge.label}]
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Selected invoice info card */}
                {selectedInvoice && (() => {
                  const badge = statusBadge(selectedInvoice.status, selectedInvoice.payment_type, selectedInvoice.amount_remaining);
                  const isDP = selectedInvoice.payment_type === 'dp';
                  const hasPartialPaid = isDP && selectedInvoice.amount_paid > 0;
                  return (
                    <div className="mt-3 p-3.5 rounded-lg bg-bg-secondary border border-border-light text-[13px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm">{selectedInvoice.number}</span>
                        <span className={`inline-block py-0.5 px-2.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-text-secondary mb-1">Klien: <span className="text-text-primary font-medium">{selectedInvoice.client_name}</span></div>
                      <div className="text-text-secondary mb-1">Total Invoice: <span className="text-text-primary font-medium">{formatCurrency(selectedInvoice.total, 'IDR')}</span></div>
                      {isDP && (
                        <>
                          <div className="text-text-secondary mb-1">
                            DP ({selectedInvoice.dp_percentage}%): <span className="text-text-primary font-medium">{formatCurrency(selectedInvoice.dp_amount, 'IDR')}</span>
                          </div>
                          {hasPartialPaid && (
                            <>
                              <div className="text-text-secondary mb-1">
                                Sudah dibayar: <span className="text-emerald-600 font-medium">{formatCurrency(selectedInvoice.amount_paid, 'IDR')}</span>
                              </div>
                              <div className="text-text-secondary">
                                Sisa tagihan: <span className="text-amber-600 font-bold">{formatCurrency(selectedInvoice.amount_remaining, 'IDR')}</span>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          {/* ── Detail Payment Link ── */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light"><GoogleDocIcon /> Detail Payment Link</h3>
            <div className="form-group">
              <label className="form-label">Judul</label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: Web Development Package"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Deskripsi</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Deskripsi pembayaran..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Mata Uang</label>
                <select
                  className="form-input"
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    if (e.target.value === 'IDR') {
                      setPaymentProvider(hasXendit ? 'xendit' : '');
                    } else {
                      setPaymentProvider(hasPaypal ? 'paypal' : '');
                    }
                  }}
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Jumlah ({currencyInfo.symbol})</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  step={currency === 'IDR' || currency === 'JPY' ? '1' : '0.01'}
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                />
                {selectedInvoice && (
                  <p className="text-[11px] text-text-tertiary mt-1">
                    💡 Otomatis diisi dari invoice. Anda bisa ubah jika perlu.
                  </p>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal Kadaluarsa</label>
              <input
                type="date"
                className="form-input"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          {/* Payment Provider Selection */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light"><Settings01Icon /> Metode Pembayaran</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {/* Xendit */}
              <label className={`flex flex-col items-center gap-2 py-4 px-3 border-2 rounded-lg cursor-pointer transition-all duration-150 hover:border-red-300 ${paymentProvider === 'xendit' ? '!border-red-500 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10' : 'border-border-color'
                } ${!hasXendit ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name="provider"
                  value="xendit"
                  checked={paymentProvider === 'xendit'}
                  onChange={(e) => setPaymentProvider(e.target.value)}
                  className="hidden"
                  disabled={!hasXendit}
                />
                <span className="text-2xl"><CreditCardIcon /></span>
                <span className="text-[13px] font-semibold">Xendit</span>
                <span className="text-[11px] text-text-tertiary">IDR, PHP</span>
                {!hasXendit && <span className="text-[10px] text-amber-600">Belum dikonfigurasi</span>}
              </label>

              {/* PayPal */}
              <label className={`flex flex-col items-center gap-2 py-4 px-3 border-2 rounded-lg cursor-pointer transition-all duration-150 hover:border-blue-300 ${paymentProvider === 'paypal' ? '!border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10' : 'border-border-color'
                } ${!hasPaypal ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name="provider"
                  value="paypal"
                  checked={paymentProvider === 'paypal'}
                  onChange={(e) => setPaymentProvider(e.target.value)}
                  className="hidden"
                  disabled={!hasPaypal}
                />
                <span className="text-2xl">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#003087"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" /></svg>
                </span>
                <span className="text-[13px] font-semibold">PayPal</span>
                <span className="text-[11px] text-text-tertiary">Multi-currency</span>
                {!hasPaypal && <span className="text-[10px] text-amber-600">Belum dikonfigurasi</span>}
              </label>

              {/* Manual */}
              <label className={`flex flex-col items-center gap-2 py-4 px-3 border-2 rounded-lg cursor-pointer transition-all duration-150 hover:border-gray-400 ${paymentProvider === '' || paymentProvider === 'manual' ? '!border-text-secondary bg-bg-secondary' : 'border-border-color'
                }`}>
                <input
                  type="radio"
                  name="provider"
                  value=""
                  checked={paymentProvider === '' || paymentProvider === 'manual'}
                  onChange={() => setPaymentProvider('')}
                  className="hidden"
                />
                <span className="text-2xl"><Atm02Icon /></span>
                <span className="text-[13px] font-semibold">Manual</span>
                <span className="text-[11px] text-text-tertiary">Transfer bank</span>
              </label>
            </div>

            {currency !== 'IDR' && !hasPaypal && (
              <div className="flex gap-2 items-center p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-400 text-[13px] mb-3">
                <Alert02Icon /> Untuk pembayaran {currency}, Anda perlu menghubungkan PayPal terlebih dahulu di <Link href="/settings" className="underline font-semibold">Pengaturan</Link>.
              </div>
            )}

            {/* Settings */}
            <div className="flex justify-between items-center py-3.5 border-b border-border-light last:border-b-0">
              <div>
                <div className="text-sm font-semibold mb-0.5">Multiple Payments</div>
                <div className="text-xs text-text-tertiary">Izinkan link digunakan berkali-kali</div>
              </div>
              <label className="relative inline-block w-12 h-[26px] shrink-0">
                <input type="checkbox" defaultChecked className="peer opacity-0 w-0 h-0" />
                <span className="absolute cursor-pointer inset-0 bg-border-color transition-all duration-150 rounded-full peer-checked:bg-gradient-to-br peer-checked:from-red-600 peer-checked:to-red-500 before:absolute before:content-[''] before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-white before:transition-all before:duration-150 before:rounded-full peer-checked:before:translate-x-[22px]"></span>
              </label>
            </div>
            <div className="flex justify-between items-center py-3.5 border-b border-border-light last:border-b-0">
              <div>
                <div className="text-sm font-semibold mb-0.5">Notifikasi Email</div>
                <div className="text-xs text-text-tertiary">Kirim notifikasi setiap ada pembayaran</div>
              </div>
              <label className="relative inline-block w-12 h-[26px] shrink-0">
                <input type="checkbox" defaultChecked className="peer opacity-0 w-0 h-0" />
                <span className="absolute cursor-pointer inset-0 bg-border-color transition-all duration-150 rounded-full peer-checked:bg-gradient-to-br peer-checked:from-red-600 peer-checked:to-red-500 before:absolute before:content-[''] before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-white before:transition-all before:duration-150 before:rounded-full peer-checked:before:translate-x-[22px]"></span>
              </label>
            </div>
            <div className="flex justify-between items-center py-3.5 border-b border-border-light last:border-b-0">
              <div>
                <div className="text-sm font-semibold mb-0.5">Redirect Setelah Bayar</div>
                <div className="text-xs text-text-tertiary">Arahkan ke halaman thank you</div>
              </div>
              <label className="relative inline-block w-12 h-[26px] shrink-0">
                <input type="checkbox" className="peer opacity-0 w-0 h-0" />
                <span className="absolute cursor-pointer inset-0 bg-border-color transition-all duration-150 rounded-full peer-checked:bg-gradient-to-br peer-checked:from-red-600 peer-checked:to-red-500 before:absolute before:content-[''] before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-white before:transition-all before:duration-150 before:rounded-full peer-checked:before:translate-x-[22px]"></span>
              </label>
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Membuat...' : 'Buat Payment Link'}
          </button>
        </div>

        <div className="sticky top-[calc(var(--header-height)+24px)] max-lg:relative max-lg:top-0">
          <div className="card p-0 overflow-hidden">
            <div className="py-3 px-5 text-xs font-bold text-text-tertiary uppercase tracking-[0.5px] border-b border-border-light">Preview</div>
            <div className="px-6 py-8 flex flex-col items-center text-center">
              {logoCompany ? <img src={logoCompany} alt="Logo" className="w-auto h-20 object-cover mb-5" /> :
                <div className="w-[50px] h-[50px] bg-gradient-to-br from-red-600 to-red-500 rounded-md flex items-center justify-center font-extrabold text-lg text-white mb-5">{initialCompany || "IQ"}</div>}
              {selectedInvoice && (
                <div className="mb-3 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                  Invoice #{selectedInvoice.number}
                </div>
              )}
              <h3 className="text-lg font-bold mb-2">{title || 'Judul Payment Link'}</h3>
              <p className="text-[13px] text-text-secondary mb-5 leading-[1.6]">{description || 'Deskripsi pembayaran akan muncul di sini...'}</p>
              <div className={`text-[28px] font-black bg-clip-text text-transparent mb-2 ${!accentColor ? 'bg-gradient-to-br from-red-600 to-red-500' : ''}`} style={accentColor ? { backgroundColor: accentColor } : {}}>
                {amount > 0
                  ? formatCurrency(amount, currency)
                  : `${currencyInfo.symbol} 0`}
              </div>
              {selectedInvoice?.payment_type === 'dp' && selectedInvoice.amount_remaining > 0 && selectedInvoice.amount_paid > 0 && (
                <div className="text-[12px] text-amber-600 font-medium mb-2">
                  Pelunasan dari total {formatCurrency(selectedInvoice.total, 'IDR')}
                </div>
              )}
              {paymentProvider && (
                <div className="mb-4">
                  <span className={`inline-block py-1 px-3 rounded-full text-xs font-bold ${paymentProvider === 'paypal' ? 'bg-blue-500/10 text-blue-600' : paymentProvider === 'xendit' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-500/10 text-gray-600'
                    }`}>
                    via {paymentProvider === 'paypal' ? 'PayPal' : paymentProvider === 'xendit' ? 'Xendit' : 'Manual'}
                  </span>
                </div>
              )}
              <div className={`w-full p-3.5 text-white font-bold text-[15px] rounded-md text-center mb-4 cursor-default ${!accentColor ? 'bg-gradient-to-br from-red-600 to-red-500' : ''}`} style={accentColor ? { backgroundColor: accentColor } : {}} >Bayar Sekarang</div>
              <div className="text-[11px] text-text-tertiary">Powered by InvoiceQu</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
