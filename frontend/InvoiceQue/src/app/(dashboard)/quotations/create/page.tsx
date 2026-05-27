'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { clientApi, quotationApi, type Client, invoiceSettingsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { GoogleDocIcon, User02Icon, ArrowLeft02Icon, PackageIcon } from 'hugeicons-react';
import CurrencySelect from '@/components/ui/CurrencySelect';
import { ALL_SUPPORTED_CURRENCIES } from '@/lib/currencies';

interface LineItem {
  id: number;
  description: string;
  quantity: number;
  price: number;
}

export default function CreateQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ id: 1, description: '', quantity: 1, price: 0 }]);
  const [tax, setTax] = useState(10);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [companyInitial, setCompanyInitial] = useState('');
  const [accentColor, setAccentColor] = useState('');

  useEffect(() => {
    clientApi.list(undefined, 1, 100).then(res => setClients(res.data || [])).catch(() => {});
    invoiceSettingsApi.get().then(s => {
      setCompanyInitial((s.business_name || '').substring(0, 2).toUpperCase());
      setAccentColor(s.accent_color || '');
    }).catch(() => {});
    // Default valid_until to 14 days from now
    const d = new Date(); d.setDate(d.getDate() + 14);
    setValidUntil(d.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (searchParams.get('from_project') !== 'true') return;

    const projectName = searchParams.get('project_name') || '';
    const desc = searchParams.get('item_desc') || (projectName ? `Proyek ${projectName}` : '');
    const qty = Number(searchParams.get('item_qty')) || 1;
    const price = Number(searchParams.get('item_price')) || 0;
    const clientId = searchParams.get('client_id') || '';
    const projectCurrency = searchParams.get('currency') || '';
    const dueDate = searchParams.get('due_date') || '';

    if (desc) {
      setItems([{ id: 1, description: desc, quantity: qty, price }]);
    }
    if (clientId) {
      setSelectedClient(clientId);
    }
    if (projectCurrency) {
      setCurrency(projectCurrency);
    }
    if (projectName) {
      setNotes(`Dibuat dari proyek: ${projectName}`);
    }
    if (dueDate) {
      setValidUntil(dueDate);
    }
  }, [searchParams]);

  const addItem = () => setItems([...items, { id: Date.now(), description: '', quantity: 1, price: 0 }]);
  const removeItem = (id: number) => { if (items.length > 1) setItems(items.filter(i => i.id !== id)); };
  const updateItem = (id: number, field: keyof LineItem, value: string | number) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const taxAmount = (subtotal * tax) / 100;
  const total = subtotal + taxAmount - discount;
  const client = clients.find(c => c.id === selectedClient);

  const handleSubmit = async (status: 'draft' | 'send') => {
    if (!selectedClient) { setError('Pilih klien terlebih dahulu'); return; }
    const validItems = items.filter(i => i.description.trim());
    if (validItems.length === 0) { setError('Tambahkan minimal 1 item'); return; }
    setError(''); setSaving(true);
    try {
      const created = await quotationApi.create({
        client_id: selectedClient,
        client_name: client?.name || '',
        client_email: client?.email,
        items: validItems.map(i => ({ description: i.description, quantity: i.quantity, price: i.price })),
        tax: taxAmount, discount, valid_until: validUntil, notes, currency,
      });
      if (status === 'send') {
        await quotationApi.send(created.id);
      }
      router.push('/quotations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Link href="/quotations" className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"><ArrowLeft02Icon /></Link>
            <h1 className="page-title">Buat Quotation Baru</h1>
          </div>
          <p className="page-subtitle">Buat penawaran harga untuk klien</p>
        </div>
      </div>

      {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
        <div className="flex flex-col gap-5">
          {/* Client */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light"><User02Icon /> Informasi Klien</h3>
            <div className="form-group">
              <label className="form-label">Pilih Klien</label>
              <select className="form-input form-select" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                <option value="">-- Pilih Klien --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} - {c.company}</option>)}
              </select>
            </div>
            {client && (
              <div className="flex items-center gap-3.5 p-3.5 bg-bg-secondary rounded-md mt-2">
                <div className="w-[42px] h-[42px] bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0">
                  {client.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div>
                  <div className="font-semibold">{client.name}</div>
                  <div className="text-xs text-text-tertiary">{client.email}</div>
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light"><PackageIcon /> Item & Layanan</h3>
            {items.map((item, index) => (
              <div key={item.id} className="border border-border-light rounded-md p-4 mb-3 bg-bg-secondary hover:border-red-200 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/50 px-2.5 py-0.5 rounded-full">#{index + 1}</span>
                  {items.length > 1 && <button className="w-7 h-7 flex items-center justify-center rounded-full bg-danger-bg text-danger text-xs cursor-pointer hover:bg-danger hover:text-white transition-all" onClick={() => removeItem(item.id)}>✕</button>}
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <input type="text" className="form-input" placeholder="Contoh: Web Development" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Jumlah</label>
                    <input type="number" className="form-input" min="1" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Harga ({currency})</label>
                    <input type="number" className="form-input" min="0" value={item.price} onChange={e => updateItem(item.id, 'price', parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="text-right text-sm text-text-secondary pt-2 border-t border-dashed border-border-color mt-2">
                  Subtotal: <strong className="text-text-primary">{formatCurrency(item.quantity * item.price, currency)}</strong>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary w-full mt-1" onClick={addItem}>＋ Tambah Item</button>
          </div>

          {/* Details */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light"><GoogleDocIcon /> Detail Tambahan</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pajak (%)</label>
                <input type="number" className="form-input" value={tax} onChange={e => setTax(parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">Diskon (Rp)</label>
                <input type="number" className="form-input" value={discount} onChange={e => setDiscount(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Mata Uang</label>
              <CurrencySelect value={currency} onChange={setCurrency} allowedCurrencies={ALL_SUPPORTED_CURRENCIES} />
            </div>
            <div className="form-group">
              <label className="form-label">Berlaku Hingga</label>
              <input type="date" className="form-input" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Catatan</label>
              <textarea className="form-input form-textarea" placeholder="Catatan tambahan..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="sticky top-[calc(var(--header-height)+24px)] max-lg:relative max-lg:top-0">
          <div className="card p-7">
            <div className={`flex justify-between items-start mb-6 pb-5 border-b-2 ${!accentColor ? 'border-red-500' : ''}`} style={accentColor ? { borderBottomColor: accentColor } : {}}>
              <div>
                <div className={`w-10 h-10 rounded-sm flex items-center justify-center font-extrabold text-sm text-white mb-2 ${!accentColor ? 'bg-gradient-to-br from-red-600 to-red-500' : ''}`} style={accentColor ? { backgroundColor: accentColor } : undefined}>
                  {companyInitial || 'IQ'}
                </div>
                <h2 className={`text-2xl font-black tracking-[2px] ${!accentColor ? 'bg-gradient-to-br from-red-600 to-red-500' : ''} bg-clip-text text-transparent`} style={accentColor ? { backgroundColor: accentColor } : {}}>QUOTATION</h2>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm mb-1">QT-XXXX-XXX</div>
                <div className="text-xs text-text-secondary">Tanggal: {new Date().toLocaleDateString('id-ID')}</div>
                {validUntil && <div className="text-xs text-text-secondary">Berlaku: {new Date(validUntil).toLocaleDateString('id-ID')}</div>}
              </div>
            </div>

            {client && (
              <div className="mb-5 p-3 bg-bg-secondary rounded-md">
                <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">Penawaran untuk:</div>
                <div className="font-semibold">{client.name}</div>
                <div className="text-xs text-text-tertiary">{client.email}</div>
              </div>
            )}

            <div className="mb-5">
              <table className="w-full border-collapse">
                <thead><tr>
                  <th className="py-2 px-2.5 text-left text-[11px] font-bold uppercase text-text-tertiary border-b border-border-color">Deskripsi</th>
                  <th className="py-2 px-2.5 text-left text-[11px] font-bold uppercase text-text-tertiary border-b border-border-color">Qty</th>
                  <th className="py-2 px-2.5 text-right text-[11px] font-bold uppercase text-text-tertiary border-b border-border-color">Total</th>
                </tr></thead>
                <tbody>
                  {items.filter(i => i.description).map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2.5 text-[13px] border-b border-border-light">{item.description}</td>
                      <td className="py-2 px-2.5 text-[13px] border-b border-border-light">{item.quantity}</td>
                      <td className="py-2 px-2.5 text-[13px] border-b border-border-light text-right">{formatCurrency(item.quantity * item.price, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="py-4 border-t border-border-color">
              <div className="flex justify-between py-1.5 text-[13px] text-text-secondary"><span>Subtotal</span><span>{formatCurrency(subtotal, currency)}</span></div>
              <div className="flex justify-between py-1.5 text-[13px] text-text-secondary"><span>Pajak ({tax}%)</span><span>{formatCurrency(taxAmount, currency)}</span></div>
              {discount > 0 && <div className="flex justify-between py-1.5 text-[13px] text-text-secondary"><span>Diskon</span><span className="text-success">-{formatCurrency(discount, currency)}</span></div>}
              <div className={`flex justify-between text-lg font-extrabold pt-3 mt-2 border-t-2 ${!accentColor ? 'border-red-500' : ''}`} style={accentColor ? { borderTopColor: accentColor } : {}}>
                <span>Total</span><span>{formatCurrency(total, currency)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <button className="btn btn-primary btn-lg w-full" onClick={() => handleSubmit('send')} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan & Kirim'}</button>
              <button className="btn btn-secondary w-full" onClick={() => handleSubmit('draft')} disabled={saving}>Simpan Draft</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
