'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { clientApi, invoiceApi, type Client, type Invoice } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { User02Icon, PackageIcon, GoogleDocIcon, Payment02Icon, MoneyBag01Icon, ArrowLeft02Icon } from 'hugeicons-react';

interface LineItem {
  id: number;
  description: string;
  quantity: number;
  price: number;
}

export default function EditInvoicePage() {
  const params = useParams();
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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [invoice, clientRes] = await Promise.all([
          invoiceApi.get(params.id as string),
          clientApi.list(undefined, 1, 100).catch(() => ({ data: [] as Client[], total: 0, page: 1, per_page: 100, total_pages: 0 })),
        ]);

        setClients(clientRes.data || []);
        setSelectedClient(invoice.client_id || '');
        setNotes(invoice.notes || '');
        setDueDate(invoice.due_date ? invoice.due_date.split('T')[0] : '');
        setPaymentType(invoice.payment_type === 'dp' ? 'dp' : 'full');
        setDpPercentage(invoice.dp_percentage || 50);
        setDiscount(invoice.discount || 0);

        // Calculate tax percentage from amounts
        if (invoice.subtotal > 0) {
          setTax(Math.round((invoice.tax / invoice.subtotal) * 100));
        }

        // Map items
        if (invoice.items && invoice.items.length > 0) {
          setItems(invoice.items.map((item, idx) => ({
            id: idx + 1,
            description: item.description,
            quantity: item.quantity,
            price: item.price,
          })));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat invoice');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id]);

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
      await invoiceApi.update(params.id as string, {
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
      });
      router.push(`/invoices/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary">
        Memuat data invoice...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2">
            <Link href="/invoices" className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"><ArrowLeft02Icon/></Link>
            <h1 className="page-title">Edit Invoice</h1>
          </div>
          <p className="page-subtitle">Ubah detail invoice sebelum dikirim</p>
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
          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light"><User02Icon /> Informasi Klien</h3>
            <div className="form-group">
              <label className="form-label">Pilih Klien</label>
              <select className="form-input form-select" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                <option value="">-- Pilih Klien --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} - {c.company}</option>
                ))}
              </select>
            </div>
            {client && (
              <div className="flex items-center gap-3.5 p-3.5 bg-bg-secondary rounded-md mt-2">
                <div className="w-[42px] h-[42px] bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0">
                  {client.name.split(' ').map((n) => n[0]).join('').substring(0,2)}
                </div>
                <div>
                  <div className="font-semibold">{client.name}</div>
                  <div className="text-[13px] text-text-secondary">{client.company}</div>
                  <div className="text-xs text-text-tertiary">{client.email}</div>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light"><PackageIcon /> Item & Layanan</h3>
            {items.map((item, index) => (
              <div key={item.id} className="border border-border-light rounded-md p-4 mb-3 bg-bg-secondary transition-all duration-150 hover:border-red-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/10 px-2.5 py-0.5 rounded-full">#{index + 1}</span>
                  {items.length > 1 && (
                    <button className="w-7 h-7 flex items-center justify-center rounded-full bg-danger-bg text-danger text-xs cursor-pointer transition-all duration-150 border-none hover:bg-danger hover:text-white" onClick={() => removeItem(item.id)}>✕</button>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <input type="text" className="form-input" placeholder="Contoh: Web Development" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Jumlah</label>
                    <input type="number" className="form-input" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Harga (Rp)</label>
                    <input type="number" className="form-input" min="0" value={item.price} onChange={(e) => updateItem(item.id, 'price', parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="text-right text-sm text-text-secondary pt-2 border-t border-dashed border-border-color mt-2">
                  Subtotal: <strong className="text-text-primary">{formatCurrency(item.quantity * item.price)}</strong>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary w-full mt-1" onClick={addItem}>
              ＋ Tambah Item
            </button>
          </div>

          <div className="card">
            <h3 className="flex items-center gap-2 text-base font-bold mb-4 pb-3 border-b border-border-light"><GoogleDocIcon/> Detail Tambahan</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pajak (%)</label>
                <input type="number" className="form-input" value={tax} onChange={(e) => setTax(parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">Diskon (Rp)</label>
                <input type="number" className="form-input" value={discount} onChange={(e) => setDiscount(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Jatuh Tempo</label>
              <input type="date" className="form-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Catatan</label>
              <textarea className="form-input form-textarea" placeholder="Catatan tambahan..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="form-group mt-4">
              <label className="flex items-center gap-2 form-label"><Payment02Icon/> Tipe Pembayaran</label>
              <div className="flex gap-2">
                <button type="button" className={`btn flex-1 ${paymentType === 'full' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPaymentType('full')}>
                  <MoneyBag01Icon/> Full Payment
                </button>
                <button type="button" className={`btn flex-1 ${paymentType === 'dp' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPaymentType('dp')}>
                  <GoogleDocIcon/> Down Payment
                </button>
              </div>
            </div>

            {paymentType === 'dp' && (
              <div className="mt-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <label className="form-label text-amber-600">Persentase DP</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="10" max="90" step="5" value={dpPercentage} onChange={(e) => setDpPercentage(parseInt(e.target.value))} className="flex-1" />
                  <span className="font-bold text-lg text-amber-600 min-w-[50px] text-right">{dpPercentage}%</span>
                </div>
                <div className="flex justify-between mt-2.5 text-[13px]">
                  <div><span className="text-text-tertiary">DP: </span><strong className="text-amber-600">{formatCurrency(dpAmount)}</strong></div>
                  <div><span className="text-text-tertiary">Sisa: </span><strong className="text-text-primary">{formatCurrency(remainingAmount)}</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="sticky top-[calc(var(--header-height)+24px)] max-lg:relative max-lg:top-0">
          <div className="card p-7">
            <div className="py-4 border-t border-border-color">
              <div className="flex justify-between py-1.5 text-[13px] text-text-secondary"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between py-1.5 text-[13px] text-text-secondary"><span>Pajak ({tax}%)</span><span>{formatCurrency(taxAmount)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between py-1.5 text-[13px] text-text-secondary"><span>Diskon</span><span className="text-success">-{formatCurrency(discount)}</span></div>
              )}
              <div className="flex justify-between py-1.5 text-[13px] text-text-secondary text-lg font-extrabold text-text-primary pt-3 mt-2 border-t-2 border-red-500"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <button className="btn btn-primary btn-lg w-full" onClick={() => handleSubmit('draft')} disabled={saving}>
                {saving ? '⏳ Menyimpan...' : 'Simpan Perubahan'}
              </button>
              <button className="btn btn-secondary w-full" onClick={() => handleSubmit('sent')} disabled={saving}>
                Simpan & Kirim
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
