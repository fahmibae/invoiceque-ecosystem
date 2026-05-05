'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clientApi, invoiceApi, paymentLinkApi, xenditApi, paypalApi, type Client, type PaymentLink, invoiceSettingsApi, type InvoiceSettingsData } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { GoogleDocIcon, User02Icon, ArrowLeft02Icon, PackageIcon, MoneyBag02Icon, Payment02Icon, Link04Icon, CreditCardIcon, Atm02Icon, Copy01Icon, Tick02Icon, Cancel01Icon } from 'hugeicons-react';
import Portal from '@/components/ui/Portal';

interface LineItem {
  id: number;
  description: string;
  quantity: number;
  price: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, description: '', quantity: 1, price: 0 },
  ]);
  const [tax, setTax] = useState(10);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentType, setPaymentType] = useState<'full' | 'dp'>('full');
  const [dpPercentage, setDpPercentage] = useState(50);
  const [currency, setCurrency] = useState('IDR');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [companyInitial, setCompanyInitial] = useState('');
  const [logoCompany, setLogoCompany] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const hasLogo = !!logoCompany;
  const hasInitial = !!companyInitial;
  const hasAccent = !!accentColor;

  // Auto Payment Link states
  const [autoPaymentLink, setAutoPaymentLink] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState('');
  const [hasXendit, setHasXendit] = useState(false);
  const [hasPaypal, setHasPaypal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdPaymentLink, setCreatedPaymentLink] = useState<PaymentLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [savingStep, setSavingStep] = useState('');

  const loadSettings = async () => {
    try {
      const s = await invoiceSettingsApi.get();
      setCompanyInitial(s.business_name.substring(0, 2).toUpperCase() || '');
      setLogoCompany(s.logo_url || '');
      setAccentColor(s.accent_color || '');
    } catch {
      // Use defaults if API not available
    }
  };
  useEffect(() => {
    loadSettings();
    // Check available payment gateways
    xenditApi.getAccount().then(() => setHasXendit(true)).catch(() => { });
    paypalApi.getAccount().then(() => setHasPaypal(true)).catch(() => { });
  }, []);


  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await clientApi.list(undefined, 1, 100);
        setClients(res.data || []);
      } catch {
        // Silently fail — user can still type client info
      }
    }
    fetchClients();
  }, []);

  const addItem = () => {
    setItems([...items, { id: Date.now(), description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: number, field: keyof LineItem, value: string | number) => {
    setItems(items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxAmount = (subtotal * tax) / 100;
  const total = subtotal + taxAmount - discount;
  const dpAmount = paymentType === 'dp' ? Math.round(total * dpPercentage / 100) : 0;
  const remainingAmount = paymentType === 'dp' ? total - dpAmount : 0;

  const client = clients.find((c) => c.id === selectedClient);

  const handleSubmit = async (status: string) => {
    if (!selectedClient) {
      setError('Pilih klien terlebih dahulu');
      return;
    }
    if (!dueDate) {
      setError('Tanggal jatuh tempo wajib diisi');
      return;
    }
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      setError('Tambahkan minimal 1 item dengan deskripsi');
      return;
    }
    const invalidItem = validItems.find((i) => !i.description.trim() || i.quantity <= 0 || i.price <= 0);
    if (invalidItem) {
      setError('Setiap item harus memiliki deskripsi, jumlah > 0, dan harga > 0');
      return;
    }

    setError('');
    setSaving(true);
    try {
      setSavingStep('Menyimpan invoice...');
      const createdInvoice = await invoiceApi.create({
        client_id: selectedClient,
        client_name: client?.name || '',
        client_email: client?.email,
        items: items.filter((i) => i.description).map((i) => ({
          description: i.description,
          quantity: i.quantity,
          price: i.price,
        })),
        tax: taxAmount,
        discount: discount,
        due_date: dueDate || undefined,
        notes: notes || undefined,
        status,
        payment_type: paymentType,
        dp_percentage: paymentType === 'dp' ? dpPercentage : undefined,
        currency,
      });

      // Auto-create payment link if toggle is on
      if (autoPaymentLink && status === 'sent') {
        setSavingStep('Membuat payment link...');
        const invoiceAmount = paymentType === 'dp' ? createdInvoice.dp_amount : createdInvoice.total;
        const titlePrefix = paymentType === 'dp' ? 'Down Payment' : 'Pembayaran';
        const paymentLink = await paymentLinkApi.create({
          title: `${titlePrefix} Invoice ${createdInvoice.number} — ${createdInvoice.client_name}`,
          description: `Payment link untuk invoice ${createdInvoice.number}`,
          amount: invoiceAmount,
          currency,
          invoice_id: createdInvoice.id,
          expires_at: dueDate ? new Date(dueDate).toISOString() : undefined,
          payment_provider: paymentProvider || undefined,
          client_name: client?.name || undefined,
          client_email: client?.email || undefined,
        });
        setCreatedPaymentLink(paymentLink);
        setShowSuccessModal(true);
      } else {
        router.push('/invoices');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan invoice');
    } finally {
      setSaving(false);
      setSavingStep('');
    }
  };

  const handleCopyLink = () => {
    if (createdPaymentLink?.url) {
      navigator.clipboard.writeText(createdPaymentLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Link href="/invoices" className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition">
              <ArrowLeft02Icon />
            </Link>
            <h1 className="page-title">Buat Invoice Baru</h1>
          </div>
          <p className="page-subtitle">Isi detail invoice dan kirim ke klien</p>
        </div>


      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
        {/* Form */}
        <div className="flex flex-col gap-5">
          {/* Client Selection */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light"><User02Icon /> Informasi Klien</h3>
            <div className="form-group">
              <label className="form-label">Pilih Klien</label>
              <select
                className="form-input form-select"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">-- Pilih Klien --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} - {c.company}</option>
                ))}
              </select>
            </div>
            {client && (
              <div className="flex items-center gap-3.5 p-3.5 bg-bg-secondary rounded-md mt-2">
                <div className="w-[42px] h-[42px] bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0">
                  {client.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                </div>
                <div>
                  <div className="font-semibold">{client.name}</div>
                  <div className="text-[13px] text-text-secondary">{client.company}</div>
                  <div className="text-xs text-text-tertiary">{client.email}</div>
                </div>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light"><PackageIcon /> Item & Layanan</h3>
            {items.map((item, index) => (
              <div key={item.id} className="border border-border-light rounded-md p-4 mb-3 bg-bg-secondary transition-all duration-150 hover:border-red-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/50 px-2.5 py-0.5 rounded-full">#{index + 1}</span>
                  {items.length > 1 && (
                    <button className="w-7 h-7 flex items-center justify-center rounded-full bg-danger-bg text-danger text-xs cursor-pointer transition-all duration-150 border-none hover:bg-danger hover:text-white" onClick={() => removeItem(item.id)}>✕</button>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Web Development"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Jumlah</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="form-group">
                    <div className="form-label">Harga ({currency})</div>
                    <input
                      type="number"
                      className="form-input"
                      min="0"
                      value={item.price}
                      onChange={(e) => updateItem(item.id, 'price', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="text-right text-sm text-text-secondary pt-2 border-t border-dashed border-border-color mt-2">
                  Subtotal: <strong className="text-text-primary">{formatCurrency(item.quantity * item.price, currency)}</strong>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary w-full mt-1" onClick={addItem}>
              ＋ Tambah Item
            </button>
          </div>

          {/* Additional Info */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light"><GoogleDocIcon /> Detail Tambahan</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pajak (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={tax}
                  onChange={(e) => setTax(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Diskon (Rp)</label>
                <input
                  type="number"
                  className="form-input"
                  value={discount}
                  onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Currency */}
            <div className="form-group">
              <label className="form-label">Mata Uang</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {[
                  { code: 'IDR', flag: '🇮🇩', name: 'Rupiah' },
                  { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
                  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
                  { code: 'GBP', flag: '🇬🇧', name: 'Pound' },
                  { code: 'SGD', flag: '🇸🇬', name: 'S$ Dollar' },
                  { code: 'MYR', flag: '🇲🇾', name: 'Ringgit' },
                  { code: 'JPY', flag: '🇯🇵', name: 'Yen' },
                  { code: 'AUD', flag: '🇦🇺', name: 'AUD' },
                ].map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCurrency(c.code)}
                    className={`flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-xl border text-center transition-all duration-150 ${currency === c.code
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-sm'
                      : 'border-border-color bg-bg-secondary hover:border-red-300'
                      }`}
                  >
                    <span className="text-xl leading-none">{c.flag}</span>
                    <span className={`text-[11px] font-bold leading-none mt-1 ${currency === c.code ? 'text-red-600' : 'text-text-tertiary'
                      }`}>{c.code}</span>
                    <span className="text-[9px] text-text-tertiary leading-none">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Jatuh Tempo</label>
              <input
                type="date"
                className="form-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Catatan</label>
              <textarea
                className="form-input form-textarea"
                placeholder="Catatan tambahan untuk klien..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Payment Type */}
            <div className="form-group mt-4">
              <label className="flex items-center gap-2 form-label"><Payment02Icon /> Tipe Pembayaran</label>
              <div className="flex gap-2 flex-col">
                <button
                  type="button"
                  className={`btn flex-1 w-auto ${paymentType === 'full' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPaymentType('full')}
                >
                  <MoneyBag02Icon /> Full Payment
                </button>
                <button
                  type="button"
                  className={`btn flex-1 w-auto ${paymentType === 'dp' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPaymentType('dp')}
                >
                  <GoogleDocIcon /> Down Payment
                </button>
              </div>
            </div>

            {paymentType === 'dp' && (
              <div className="mt-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <label className="form-label text-amber-600">Persentase DP</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={dpPercentage}
                    onChange={(e) => setDpPercentage(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="font-bold text-lg text-amber-600 min-w-[50px] text-right">{dpPercentage}%</span>
                </div>
                <div className="flex justify-between mt-2.5 text-[13px]">
                  <div>
                    <span className="text-text-tertiary">DP: </span>
                    <strong className="text-amber-600">{formatCurrency(dpAmount, currency)}</strong>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Sisa: </span>
                    <strong className="text-text-primary">{formatCurrency(remainingAmount, currency)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Auto Payment Link */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white">
                  <Link04Icon />
                </div>
                <div>
                  <h3 className="text-base font-bold">Auto Buat Payment Link</h3>
                  <p className="text-[13px] text-text-secondary">Otomatis buat link pembayaran saat invoice dikirim</p>
                </div>
              </div>
              <label className="relative inline-block w-12 h-[26px] shrink-0">
                <input
                  type="checkbox"
                  checked={autoPaymentLink}
                  onChange={(e) => setAutoPaymentLink(e.target.checked)}
                  className="peer opacity-0 w-0 h-0"
                />
                <span className="absolute cursor-pointer inset-0 bg-border-color transition-all duration-150 rounded-full peer-checked:bg-gradient-to-br peer-checked:from-emerald-500 peer-checked:to-emerald-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-white before:transition-all before:duration-150 before:rounded-full peer-checked:before:translate-x-[22px]"></span>
              </label>
            </div>

            {autoPaymentLink && (
              <div className="mt-4 pt-4 border-t border-border-light animate-fade-in">
                <label className="form-label">Metode Pembayaran</label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Xendit */}
                  <button
                    type="button"
                    onClick={() => hasXendit && setPaymentProvider('xendit')}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 border-2 rounded-lg transition-all duration-150 ${paymentProvider === 'xendit'
                      ? '!border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-border-color hover:border-red-300'
                      } ${!hasXendit ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <CreditCardIcon className="w-5 h-5" />
                    <span className="text-[12px] font-semibold">Xendit</span>
                    <span className="text-[10px] text-text-tertiary">IDR</span>
                    {!hasXendit && <span className="text-[9px] text-amber-600">Belum aktif</span>}
                  </button>

                  {/* PayPal */}
                  <button
                    type="button"
                    onClick={() => hasPaypal && setPaymentProvider('paypal')}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 border-2 rounded-lg transition-all duration-150 ${paymentProvider === 'paypal'
                      ? '!border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-border-color hover:border-blue-300'
                      } ${!hasPaypal ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#003087"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" /></svg>
                    <span className="text-[12px] font-semibold">PayPal</span>
                    <span className="text-[10px] text-text-tertiary">Multi</span>
                    {!hasPaypal && <span className="text-[9px] text-amber-600">Belum aktif</span>}
                  </button>

                  {/* Manual */}
                  <button
                    type="button"
                    onClick={() => setPaymentProvider('')}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 border-2 rounded-lg cursor-pointer transition-all duration-150 ${paymentProvider === ''
                      ? '!border-text-secondary bg-bg-secondary'
                      : 'border-border-color hover:border-gray-400'
                      }`}
                  >
                    <Atm02Icon className="w-5 h-5" />
                    <span className="text-[12px] font-semibold">Manual</span>
                    <span className="text-[10px] text-text-tertiary">Transfer</span>
                  </button>
                </div>

                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-400 text-[12px]">
                  💡 Payment link akan otomatis dibuat saat invoice dikirim (Simpan & Kirim). Draft tidak akan membuat payment link.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="sticky top-[calc(var(--header-height)+24px)] max-lg:relative max-lg:top-0">
          <div className="card p-7">
            <div className={`flex justify-between items-start mb-6 pb-5 border-b-2 ${!accentColor ? 'border-red-500' : ''}`} style={accentColor ? { borderBottomColor: accentColor } : {}}>
              <div>
                <div
                  className={`w-10 h-10 rounded-sm flex items-center justify-center font-extrabold text-sm text-white mb-2 ${!hasLogo && !hasAccent
                    ? 'bg-gradient-to-br from-red-600 to-red-500'
                    : ''
                    }`}
                  style={!hasLogo && hasAccent ? { backgroundColor: accentColor } : undefined}
                >
                  {hasLogo ? (
                    <img
                      src={logoCompany}
                      alt="Logo"
                      className="w-auto h-10 object-cover"
                    />
                  ) : hasInitial ? (
                    companyInitial
                  ) : (
                    'IQ'
                  )}
                </div>
                <h2 className={`text-2xl font-black tracking-[2px] ${!accentColor ? 'bg-gradient-to-br from-red-600 to-red-500' : ''} bg-clip-text text-transparent`} style={accentColor ? { backgroundColor: accentColor } : {}}>INVOICE</h2>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm mb-1">INV-XXXX-XXX</div>
                <div className="text-xs text-text-secondary">Tanggal: {new Date().toLocaleDateString('id-ID')}</div>
                {dueDate && <div className="text-xs text-text-secondary">Jatuh Tempo: {new Date(dueDate).toLocaleDateString('id-ID')}</div>}
              </div>
            </div>

            {client && (
              <div className="mb-5 p-3 bg-bg-secondary rounded-md">
                <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">Tagihan untuk:</div>
                <div className="font-semibold text-text-primary">{client.name}</div>
                <div className="text-[13px] text-text-secondary">{client.company}</div>
                <div className="text-xs text-text-primary">{client.email}</div>
              </div>
            )}

            <div className="mb-5">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="py-2 px-2.5 text-left text-[11px] font-bold uppercase text-text-tertiary border-b border-border-color">Deskripsi</th>
                    <th className="py-2 px-2.5 text-left text-[11px] font-bold uppercase text-text-tertiary border-b border-border-color">Qty</th>
                    <th className="py-2 px-2.5 text-left text-[11px] font-bold uppercase text-text-tertiary border-b border-border-color">Harga</th>
                    <th className="py-2 px-2.5 text-right text-[11px] font-bold uppercase text-text-tertiary border-b border-border-color">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(i => i.description).map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2.5 text-[13px] border-b border-border-light">{item.description}</td>
                      <td className="py-2 px-2.5 text-[13px] border-b border-border-light">{item.quantity}</td>
                      <td className="py-2 px-2.5 text-[13px] border-b border-border-light">{formatCurrency(item.price, currency)}</td>
                      <td className="py-2 px-2.5 text-[13px] border-b border-border-light text-right">{formatCurrency(item.quantity * item.price, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="py-4 border-t border-border-color">
              <div className="flex justify-between py-1.5 text-[13px] text-text-secondary">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-[13px] text-text-secondary">
                <span>Pajak ({tax}%)</span>
                <span>{formatCurrency(taxAmount, currency)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between py-1.5 text-[13px] text-text-secondary">
                  <span>Diskon</span>
                  <span className="text-success">-{formatCurrency(discount, currency)}</span>
                </div>
              )}
              <div className={`flex justify-between py-1.5 text-[13px] text-text-secondary text-lg font-extrabold text-text-primary pt-3 mt-2 border-t-2 ${!accentColor ? 'border-red-500' : ''}`} style={accentColor ? { borderTopColor: accentColor } : {}}>
                <span>Total</span>
                <span>{formatCurrency(total, currency)}</span>
              </div>
              {paymentType === 'dp' && (
                <>
                  <div className="flex justify-between py-1.5 text-[13px] text-text-secondary mt-2 pt-2 border-t border-dashed border-amber-500/30">
                    <span className="text-amber-600">DP ({dpPercentage}%)</span>
                    <span className="text-amber-600 font-bold">{formatCurrency(dpAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-[13px] text-text-secondary">
                    <span>Sisa Bayar</span>
                    <span className="text-text-primary font-semibold">{formatCurrency(remainingAmount, currency)}</span>
                  </div>
                </>
              )}
            </div>

            {notes && (
              <div className="p-3 bg-bg-secondary rounded-md mb-5 text-[13px] text-text-secondary">
                <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">Catatan:</div>
                <p>{notes}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                className="btn btn-primary btn-lg w-full"
                onClick={() => handleSubmit('sent')}
                disabled={saving}
              >
                {saving ? savingStep || 'Menyimpan...' : (
                  <>
                    {autoPaymentLink && <Link04Icon className="w-4 h-4" />}
                    {autoPaymentLink ? 'Simpan, Kirim & Buat Payment Link' : 'Simpan & Kirim'}
                  </>
                )}
              </button>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={() => handleSubmit('draft')}
                  disabled={saving}
                >
                  Simpan Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal — Payment Link Created */}
      <Portal>
        {showSuccessModal && createdPaymentLink && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5">
            <div className="bg-bg-primary rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-red-500 to-red-600 px-6 py-8 text-center text-white">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                  <Tick02Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-1">Invoice & Payment Link Dibuat!</h3>
                <p className="text-red-100 text-sm">Kedua item berhasil dibuat secara otomatis</p>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <div className="mb-4">
                  <label className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5 block">Payment Link URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdPaymentLink.url}
                      className="form-input text-sm flex-1 bg-bg-secondary"
                    />
                    <button
                      onClick={handleCopyLink}
                      className={`btn btn-icon shrink-0 transition-all duration-200 ${copied
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'btn-secondary'
                        }`}
                      title="Salin link"
                    >
                      {copied ? <Tick02Icon className="w-4 h-4" /> : <Copy01Icon className="w-4 h-4" />}
                    </button>
                  </div>
                  {copied && (
                    <p className="text-emerald-600 text-xs mt-1.5 animate-fade-in">✓ Link berhasil disalin!</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-[13px] mb-5">
                  <div className="p-3 bg-bg-secondary rounded-lg">
                    <div className="text-text-tertiary text-[11px] mb-0.5">Judul</div>
                    <div className="font-semibold truncate">{createdPaymentLink.title}</div>
                  </div>
                  <div className="p-3 bg-bg-secondary rounded-lg">
                    <div className="text-text-tertiary text-[11px] mb-0.5">Jumlah</div>
                    <div className="font-bold text-emerald-600">{formatCurrency(createdPaymentLink.amount, createdPaymentLink.currency)}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push('/invoices')}
                    className="btn btn-secondary flex-1"
                  >
                    Ke Daftar Invoice
                  </button>
                  <button
                    onClick={() => router.push('/payments')}
                    className="btn btn-primary flex-1"
                  >
                    Ke Payment Links
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Portal>
    </div>
  );
}
