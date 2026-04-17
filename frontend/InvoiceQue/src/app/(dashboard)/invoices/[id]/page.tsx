'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { invoiceApi, type Invoice } from '@/lib/api';
import { formatCurrency, getStatusColor } from '@/lib/utils';
import styles from './detail.module.css';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await invoiceApi.get(params.id as string);
        setInvoice(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invoice tidak ditemukan');
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [params.id]);

  const handleSend = async () => {
    if (!invoice) return;
    try {
      const updated = await invoiceApi.send(invoice.id);
      setInvoice(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengirim invoice');
    }
  };

  const handleDelete = async () => {
    if (!invoice || !confirm('Yakin ingin menghapus invoice ini?')) return;
    try {
      await invoiceApi.delete(invoice.id);
      router.push('/invoices');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus invoice');
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Memuat invoice...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="animate-fade-in">
        <div className="card empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3 className="empty-state-title">Invoice tidak ditemukan</h3>
          <p className="empty-state-text">{error || 'Invoice yang Anda cari tidak ada.'}</p>
          <Link href="/invoices" className="btn btn-primary">← Kembali ke Daftar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">📄 {invoice.number}</h1>
          <p className="page-subtitle">Detail invoice untuk {invoice.client_name}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/invoices" className="btn btn-secondary">← Kembali</Link>
          {invoice.status === 'draft' && (
            <button className="btn btn-primary" onClick={handleSend}>📤 Kirim Invoice</button>
          )}
        </div>
      </div>

      <div className={styles.detailGrid}>
        {/* Invoice Document */}
        <div className={`card ${styles.invoiceDoc}`}>
          <div className={styles.docHeader}>
            <div>
              <div className={styles.docLogo}>IQ</div>
              <h2 className={styles.docTitle}>INVOICE</h2>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>InvoiceQue Platform</p>
            </div>
            <div className={styles.docMeta}>
              <div className={styles.docNumber}>{invoice.number}</div>
              <div className={styles.docDate}>Tanggal: {invoice.created_at}</div>
              <div className={styles.docDate}>Jatuh Tempo: {invoice.due_date}</div>
              <span className={`badge ${getStatusColor(invoice.status)}`} style={{ marginTop: 8 }}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </div>
          </div>

          <div className={styles.docClientSection}>
            <div className={styles.docClientCard}>
              <span className={styles.docLabel}>Tagihan untuk:</span>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{invoice.client_name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{invoice.client_email}</div>
            </div>
          </div>

          <div className={styles.docTable}>
            <table className={styles.itemTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Deskripsi</th>
                  <th>Qty</th>
                  <th>Harga</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.price)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.docTotals}>
            <div className={styles.totalLine}>
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className={styles.totalLine}>
              <span>Pajak</span>
              <span>{formatCurrency(invoice.tax)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className={styles.totalLine}>
                <span>Diskon</span>
                <span style={{ color: 'var(--success)' }}>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className={`${styles.totalLine} ${styles.grandTotal}`}>
              <span>Grand Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className={styles.docNotes}>
              <span className={styles.docLabel}>Catatan:</span>
              <p>{invoice.notes}</p>
            </div>
          )}

          <div className={styles.docFooter}>
            <p>Terima kasih atas kepercayaan Anda 🙏</p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Powered by InvoiceQue</p>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className={styles.sideInfo}>
          <div className="card">
            <h3 className={styles.sideTitle}>⚡ Aksi</h3>
            <div className={styles.actionsList}>
              {invoice.status === 'draft' && (
                <>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSend}>📤 Kirim ke Klien</button>
                  <Link href={`/invoices/${invoice.id}/edit`} className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>✏️ Edit Invoice</Link>
                </>
              )}
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => invoiceApi.downloadPdf(invoice.id, invoice.number + '.pdf')}>📥 Download PDF</button>
              <button className="btn btn-ghost" style={{ width: '100%', color: 'var(--danger)' }} onClick={handleDelete}>
                🗑️ Hapus Invoice
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className={styles.sideTitle}>📊 Info Pembayaran</h3>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Status</span>
                <span className={`badge ${getStatusColor(invoice.status)}`}>
                  {invoice.status === 'partially_paid' ? 'DP Dibayar' : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Tipe</span>
                <span style={{ fontWeight: 600 }}>
                  {invoice.payment_type === 'dp' ? `Down Payment (${invoice.dp_percentage}%)` : 'Full Payment'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Total</span>
                <span style={{ fontWeight: 700 }}>{formatCurrency(invoice.total)}</span>
              </div>

              {invoice.payment_type === 'dp' && (
                <>
                  <div style={{ margin: '10px 0 6px', padding: '10px', background: 'rgba(217,119,6,0.08)', borderRadius: 8, border: '1px solid rgba(217,119,6,0.15)' }}>
                    <div className={styles.infoRow} style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#d97706' }}>Nominal DP</span>
                      <span style={{ fontWeight: 700, color: '#d97706' }}>{formatCurrency(invoice.dp_amount)}</span>
                    </div>
                    <div className={styles.infoRow} style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--success)' }}>Sudah Dibayar</span>
                      <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(invoice.amount_paid)}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span style={{ fontSize: 12 }}>Sisa Bayar</span>
                      <span style={{ fontWeight: 700, color: invoice.amount_remaining > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {formatCurrency(invoice.amount_remaining)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ marginTop: 8, height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${invoice.total > 0 ? Math.round((invoice.amount_paid / invoice.total) * 100) : 0}%`,
                        background: 'linear-gradient(90deg, #d97706, #f59e0b)',
                        borderRadius: 3,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                </>
              )}

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Dibuat</span>
                <span>{invoice.created_at}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Jatuh Tempo</span>
                <span>{invoice.due_date}</span>
              </div>
              {invoice.paid_at && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Lunas</span>
                  <span style={{ color: 'var(--success)' }}>{invoice.paid_at}</span>
                </div>
              )}
              {invoice.payment_link && (
                <div style={{ marginTop: 8 }}>
                  <a href={invoice.payment_link} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', textAlign: 'center', padding: '8px', background: 'rgba(220,38,38,0.1)', borderRadius: 6, color: '#DC2626', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
                    🔗 {invoice.payment_type === 'dp' && invoice.status !== 'partially_paid' ? 'Link Pembayaran DP' : 'Link Pembayaran'}
                  </a>
                </div>
              )}
              {invoice.remaining_payment_link && (
                <div style={{ marginTop: 4 }}>
                  <a href={invoice.remaining_payment_link} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', textAlign: 'center', padding: '8px', background: 'rgba(21,128,61,0.1)', borderRadius: 6, color: '#15803d', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>
                    🔗 Link Pelunasan
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className={styles.sideTitle}>🕐 Riwayat</h3>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineDot} style={{ background: 'var(--info)' }} />
                <div>
                  <div className={styles.timelineTitle}>Invoice dibuat</div>
                  <div className={styles.timelineDate}>{invoice.created_at}</div>
                </div>
              </div>
              {invoice.status !== 'draft' && (
                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot} style={{ background: 'var(--warning)' }} />
                  <div>
                    <div className={styles.timelineTitle}>Invoice dikirim</div>
                    <div className={styles.timelineDate}>{invoice.created_at}</div>
                  </div>
                </div>
              )}
              {invoice.paid_at && (
                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot} style={{ background: 'var(--success)' }} />
                  <div>
                    <div className={styles.timelineTitle}>Pembayaran diterima</div>
                    <div className={styles.timelineDate}>{invoice.paid_at}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
