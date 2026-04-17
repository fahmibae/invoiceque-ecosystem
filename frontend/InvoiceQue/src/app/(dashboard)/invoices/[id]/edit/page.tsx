'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { clientApi, invoiceApi, type Client, type Invoice } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import styles from '../../create/create.module.css';

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
    if (!items.some((i) => i.description && i.price > 0)) {
      setError('Tambahkan minimal 1 item');
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
      <div className="animate-fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Memuat data invoice...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">✏️ Edit Invoice</h1>
          <p className="page-subtitle">Ubah detail invoice sebelum dikirim</p>
        </div>
        <Link href={`/invoices/${params.id}`} className="btn btn-secondary">
          ← Kembali
        </Link>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
          color: '#EF4444', fontSize: '14px', marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      <div className={styles.createGrid}>
        {/* Form */}
        <div className={styles.formSection}>
          <div className="card">
            <h3 className={styles.sectionTitle}>👤 Informasi Klien</h3>
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
              <div className={styles.clientPreview}>
                <div className={styles.clientPreviewAvatar}>
                  {client.name.split(' ').map((n) => n[0]).join('').substring(0,2)}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{client.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{client.company}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{client.email}</div>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className={styles.sectionTitle}>📦 Item & Layanan</h3>
            {items.map((item, index) => (
              <div key={item.id} className={styles.lineItem}>
                <div className={styles.lineItemHeader}>
                  <span className={styles.lineItemNum}>#{index + 1}</span>
                  {items.length > 1 && (
                    <button className={styles.removeBtn} onClick={() => removeItem(item.id)}>✕</button>
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
                <div className={styles.lineItemTotal}>
                  Subtotal: <strong>{formatCurrency(item.quantity * item.price)}</strong>
                </div>
              </div>
            ))}
            <button className={`btn btn-secondary ${styles.addItemBtn}`} onClick={addItem}>
              ＋ Tambah Item
            </button>
          </div>

          <div className="card">
            <h3 className={styles.sectionTitle}>📋 Detail Tambahan</h3>
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

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">💳 Tipe Pembayaran</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className={`btn ${paymentType === 'full' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setPaymentType('full')}>
                  💰 Full Payment
                </button>
                <button type="button" className={`btn ${paymentType === 'dp' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setPaymentType('dp')}>
                  📋 Down Payment
                </button>
              </div>
            </div>

            {paymentType === 'dp' && (
              <div style={{ marginTop: 12, padding: 16, background: 'rgba(217,119,6,0.08)', borderRadius: 10, border: '1px solid rgba(217,119,6,0.2)' }}>
                <label className="form-label" style={{ color: '#d97706' }}>Persentase DP</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="range" min="10" max="90" step="5" value={dpPercentage} onChange={(e) => setDpPercentage(parseInt(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontWeight: 700, fontSize: 18, color: '#d97706', minWidth: 50, textAlign: 'right' }}>{dpPercentage}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13 }}>
                  <div><span style={{ color: 'var(--text-tertiary)' }}>DP: </span><strong style={{ color: '#d97706' }}>{formatCurrency(dpAmount)}</strong></div>
                  <div><span style={{ color: 'var(--text-tertiary)' }}>Sisa: </span><strong>{formatCurrency(remainingAmount)}</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className={styles.previewSection}>
          <div className={`card ${styles.previewCard}`}>
            <div className={styles.previewTotals}>
              <div className={styles.totalRow}><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className={styles.totalRow}><span>Pajak ({tax}%)</span><span>{formatCurrency(taxAmount)}</span></div>
              {discount > 0 && (
                <div className={styles.totalRow}><span>Diskon</span><span style={{ color: 'var(--success)' }}>-{formatCurrency(discount)}</span></div>
              )}
              <div className={`${styles.totalRow} ${styles.grandTotal}`}><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>

            <div className={styles.previewActions}>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => handleSubmit('draft')} disabled={saving}>
                {saving ? '⏳ Menyimpan...' : '💾 Simpan Perubahan'}
              </button>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => handleSubmit('sent')} disabled={saving}>
                📤 Simpan & Kirim
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
