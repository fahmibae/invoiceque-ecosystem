'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { invoiceApi, paymentLinkApi, type Invoice, invoiceSettingsApi, type InvoiceSettingsData } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Download02Icon, ArrowLeft02Icon, Delete02Icon, FlashIcon, ChartIcon, SentIcon, Clock01Icon, Edit02Icon } from 'hugeicons-react';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bizName, setBizName] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [companyInitial, setCompanyInitial] = useState('');

  const loadSettings = async () => {
    try {
      const s = await invoiceSettingsApi.get();
      setBizName(s.business_name || '');
      setBizEmail(s.business_email || '');
      setCompanyInitial(s.business_name.substring(0, 2).toUpperCase() || '');
    } catch {
      // Use defaults if API not available
    }
  };
  useEffect(() => {
    loadSettings();
  }, []);


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

  const confirmDelete = () => {
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!invoice) return;
    setIsDeleting(true);
    try {
      // Cascade delete: clean up associated payment links first
      try {
        await paymentLinkApi.deleteByInvoice(invoice.id);
      } catch {
        // Non-blocking — payment links cleanup is best-effort
      }
      await invoiceApi.delete(invoice.id);
      router.push('/invoices');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus invoice');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary">
        Memuat invoice...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="animate-fade-in">
        <div className="card text-center py-16 px-5">
          <div className="text-5xl mb-4 opacity-50 flex justify-center"><Download02Icon width={48} height={48} /></div>
          <h3 className="text-lg font-semibold mb-2">Invoice tidak ditemukan</h3>
          <p className="text-sm text-text-secondary mb-6">{error || 'Invoice yang Anda cari tidak ada.'}</p>
          <Link href="/invoices" className="btn btn-primary flex items-center gap-2"><ArrowLeft02Icon /> Kembali ke Daftar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Hapus Invoice"
        message="Apakah Anda yakin ingin menghapus invoice ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={isDeleting}
        type="danger"
      />
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2">
            <Link href="/invoices" className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"><ArrowLeft02Icon /></Link>
            <h1 className="page-title">{invoice.number}</h1>
          </div>
          <p className="page-subtitle">Detail invoice untuk {invoice.client_name}</p>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'draft' && (
            <button className="btn btn-primary flex items-center gap-2" onClick={handleSend}><SentIcon /> Kirim Invoice</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Invoice Document */}
        <div className="card p-8 max-sm:p-5">
          <div className="flex justify-between items-start mb-7 pb-5 border-b-[3px] border-red-500 max-sm:flex-col max-sm:gap-4">
            <div>
              <div className="w-[44px] h-[44px] bg-gradient-to-br from-red-600 to-red-500 rounded-sm flex items-center justify-center font-extrabold text-base text-white mb-2">{companyInitial || 'IQ'}</div>
              <h2 className="text-[28px] font-black tracking-[3px] bg-gradient-to-br from-red-600 to-red-500 bg-clip-text text-transparent">INVOICE</h2>
              <p className="text-xs text-text-tertiary">{bizName || 'InvoiceQu Platform'}</p>
            </div>
            <div className="text-right max-sm:text-left flex flex-col max-sm:items-start items-end">
              <div className="text-base font-bold mb-1">{invoice.number}</div>
              <div className="text-[13px] text-text-secondary">Tanggal: {formatDate(invoice.created_at)}</div>
              <div className="text-[13px] text-text-secondary">Jatuh Tempo: {invoice.due_date ? formatDate(invoice.due_date) : '-'}</div>
              <span className={`badge ${getStatusColor(invoice.status)} mt-2`}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <div className="p-4 bg-bg-secondary rounded-md border-l-[3px] border-red-500">
              <span className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">Tagihan untuk:</span>
              <div className="font-bold text-base">{invoice.client_name}</div>
              <div className="text-[13px] text-text-secondary">{invoice.client_email}</div>
            </div>
          </div>

          <div className="mb-5 overflow-x-auto">
            <table className="w-full border-collapse min-w-[500px]">
              <thead>
                <tr>
                  <th className="py-3 px-3.5 text-left text-xs font-bold uppercase text-white bg-gradient-to-br from-red-600 to-red-500 tracking-[0.5px] first:rounded-tl-md">#</th>
                  <th className="py-3 px-3.5 text-left text-xs font-bold uppercase text-white bg-gradient-to-br from-red-600 to-red-500 tracking-[0.5px]">Deskripsi</th>
                  <th className="py-3 px-3.5 text-left text-xs font-bold uppercase text-white bg-gradient-to-br from-red-600 to-red-500 tracking-[0.5px]">Qty</th>
                  <th className="py-3 px-3.5 text-left text-xs font-bold uppercase text-white bg-gradient-to-br from-red-600 to-red-500 tracking-[0.5px]">Harga</th>
                  <th className="py-3 px-3.5 text-right text-xs font-bold uppercase text-white bg-gradient-to-br from-red-600 to-red-500 tracking-[0.5px] last:rounded-tr-md">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="p-3.5 text-sm border-b border-border-light">{idx + 1}</td>
                    <td className="p-3.5 text-sm border-b border-border-light">{item.description}</td>
                    <td className="p-3.5 text-sm border-b border-border-light">{item.quantity}</td>
                    <td className="p-3.5 text-sm border-b border-border-light">{formatCurrency(item.price, invoice.currency)}</td>
                    <td className="p-3.5 text-sm border-b border-border-light text-right font-semibold">{formatCurrency(item.total, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto max-w-[300px] py-4 max-sm:max-w-full">
            <div className="flex justify-between py-2 text-sm text-text-secondary">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between py-2 text-sm text-text-secondary">
              <span>Pajak</span>
              <span>{formatCurrency(invoice.tax, invoice.currency)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between py-2 text-sm text-text-secondary">
                <span>Diskon</span>
                <span className="text-success">-{formatCurrency(invoice.discount, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 text-sm text-text-secondary text-xl font-extrabold text-text-primary pt-3 mt-2 border-t-[2px] border-red-500">
              <span>Grand Total</span>
              <span>{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="p-4 bg-bg-secondary rounded-md mt-5 text-[13px] text-text-secondary">
              <span className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">Catatan:</span>
              <p>{invoice.notes}</p>
            </div>
          )}

          <div className="text-center pt-6 mt-6 border-t border-border-light text-[13px] text-text-secondary">
            <p>Terima kasih atas kepercayaan Anda 🙏</p>
            <p className="text-[11px] text-text-tertiary mt-1">Powered by InvoiceQu</p>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="flex flex-col gap-4 sticky top-[calc(var(--header-height)+24px)] max-lg:relative max-lg:top-0">
          <div className="card">
            <h3 className="text-[15px] font-bold mb-3.5 flex items-center gap-2"><FlashIcon /> Aksi</h3>
            <div className="flex flex-col gap-2">
              {invoice.status === 'draft' && (
                <>
                  <button className="btn btn-primary w-full" onClick={handleSend}><Download02Icon /> Kirim ke Klien</button>
                  <Link href={`/invoices/${invoice.id}/edit`} className="btn btn-secondary w-full text-center"><Edit02Icon /> Edit Invoice</Link>
                </>
              )}
              <button className="btn btn-secondary w-full" onClick={() => invoiceApi.downloadPdf(invoice.id, invoice.number + '.pdf')}><Download02Icon /> Download PDF</button>
              <button className="btn btn-ghost w-full text-danger hover:text-red-600" onClick={confirmDelete}>
                <Delete02Icon /> Hapus Invoice
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-[15px] font-bold mb-3.5 flex items-center gap-2"><ChartIcon /> Info Pembayaran</h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">Status</span>
                <span className={`badge ${getStatusColor(invoice.status)}`}>
                  {invoice.status === 'partially_paid' ? 'DP Dibayar' : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">Tipe</span>
                <span className="font-semibold">
                  {invoice.payment_type === 'dp' ? `Down Payment (${invoice.dp_percentage}%)` : 'Full Payment'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">Total</span>
                <span className="font-bold">{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>

              {invoice.payment_type === 'dp' && (
                <>
                  <div className="my-2.5 p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/15">
                    <div className="flex justify-between items-center text-[13px] mb-1">
                      <span className="text-xs text-amber-600">Nominal DP</span>
                      <span className="font-bold text-amber-600">{formatCurrency(invoice.dp_amount, invoice.currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px] mb-1">
                      <span className="text-xs text-success">Sudah Dibayar</span>
                      <span className="font-bold text-success">{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-xs">Sisa Bayar</span>
                      <span className={`font-bold ${invoice.amount_remaining > 0 ? 'text-danger' : 'text-success'}`}>
                        {formatCurrency(invoice.amount_remaining, invoice.currency)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 bg-black/10 rounded-[3px] overflow-hidden">
                      <div className="h-full rounded-[3px] transition-[width] duration-300 bg-gradient-to-r from-amber-600 to-amber-500" style={{
                        width: `${invoice.total > 0 ? Math.round((invoice.amount_paid / invoice.total) * 100) : 0}%`,
                      }} />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">Dibuat</span>
                <span>{formatDate(invoice.created_at)}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">Jatuh Tempo</span>
                <span>{invoice.due_date ? formatDate(invoice.due_date) : '-'}</span>
              </div>
              {invoice.paid_at && (
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-text-tertiary font-medium">Lunas</span>
                  <span className="text-success">{formatDate(invoice.paid_at)}</span>
                </div>
              )}
              {invoice.payment_link && (
                <div className="mt-2">
                  <a href={invoice.payment_link} target="_blank" rel="noopener noreferrer"
                    className="block text-center p-2 bg-red-600/10 rounded-md text-red-600 font-semibold text-xs no-underline hover:bg-red-600/20 transition-colors">
                    🔗 {invoice.payment_type === 'dp' && invoice.status !== 'partially_paid' ? 'Link Pembayaran DP' : 'Link Pembayaran'}
                  </a>
                </div>
              )}
              {invoice.remaining_payment_link && (
                <div className="mt-1">
                  <a href={invoice.remaining_payment_link} target="_blank" rel="noopener noreferrer"
                    className="block text-center p-2 bg-green-600/10 rounded-md text-green-700 font-semibold text-xs no-underline hover:bg-green-600/20 transition-colors">
                    🔗 Link Pelunasan
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-[15px] font-bold mb-3.5 flex items-center gap-2"><Clock01Icon /> Riwayat</h3>
            <div className="flex flex-col gap-4 pl-4 border-l-[2px] border-border-color">
              <div className="flex gap-3 items-start relative">
                <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 absolute -left-[21px] bg-info" />
                <div>
                  <div className="text-[13px] font-semibold ml-0.5">Invoice dibuat</div>
                  <div className="text-[11px] text-text-tertiary ml-0.5">{formatDate(invoice.created_at)}</div>
                </div>
              </div>
              {invoice.status !== 'draft' && (
                <div className="flex gap-3 items-start relative">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 absolute -left-[21px] bg-warning" />
                  <div>
                    <div className="text-[13px] font-semibold ml-0.5">Invoice dikirim</div>
                    <div className="text-[11px] text-text-tertiary ml-0.5">{formatDate(invoice.created_at)}</div>
                  </div>
                </div>
              )}
              {invoice.paid_at && (
                <div className="flex gap-3 items-start relative">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 absolute -left-[21px] bg-success" />
                  <div>
                    <div className="text-[13px] font-semibold ml-0.5">Pembayaran diterima</div>
                    <div className="text-[11px] text-text-tertiary ml-0.5">{formatDate(invoice.paid_at)}</div>
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
