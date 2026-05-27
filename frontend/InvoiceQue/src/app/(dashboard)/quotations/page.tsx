'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { quotationApi, type Quotation, type QuotationStats } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Delete02Icon, Search01Icon, GoogleDocIcon, ArrowTurnForwardIcon, SentIcon, Tick01Icon, Cancel01Icon, ArrowRight01Icon, PencilEdit01Icon } from 'hugeicons-react';
import ConfirmModal from '@/components/ui/ConfirmModal';

const statusLabels: Record<string, string> = {
  draft: 'Draft', sent: 'Terkirim', accepted: 'Diterima', rejected: 'Ditolak', expired: 'Kedaluwarsa', converted: 'Dikonversi',
};
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expired: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  converted: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [stats, setStats] = useState<QuotationStats | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertTarget, setConvertTarget] = useState<string | null>(null);

  // Pagination & selection
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qRes, sRes] = await Promise.all([
        quotationApi.list(statusFilter || undefined, 1, 50),
        quotationApi.stats(),
      ]);
      setQuotations(qRes.data || []);
      setStats(sRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); setSelected(new Set()); }, [statusFilter]);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const handleSend = async (id: string) => {
    setActionLoading(id);
    try { await quotationApi.send(id); await fetchData(); } catch { }
    setActionLoading('');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget);
    try { await quotationApi.delete(deleteTarget); setShowDeleteModal(false); setDeleteTarget(null); await fetchData(); } catch { }
    setActionLoading('');
  };

  const handleConvert = async () => {
    if (!convertTarget) return;
    setActionLoading(convertTarget);
    try {
      const res = await quotationApi.convert(convertTarget);
      setShowConvertModal(false);
      setConvertTarget(null);
      router.push(`/invoices/${res.invoice_id}`);
    } catch { }
    setActionLoading('');
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try { await quotationApi.bulkDelete(Array.from(selected)); setSelected(new Set()); setShowBulkDeleteModal(false); await fetchData(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Gagal menghapus'); }
    setBulkDeleting(false);
  };

  const filtered = quotations.filter(q =>
    q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
    q.client_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    if (selected.size === paginated.length && paginated.length > 0) setSelected(new Set());
    else setSelected(new Set(paginated.map(q => q.id)));
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>Memuat data quotation...</p>
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
      <ConfirmModal isOpen={showDeleteModal} title="Hapus Quotation" message="Apakah Anda yakin ingin menghapus quotation ini?" confirmText="Hapus" onConfirm={handleDelete} onCancel={() => setShowDeleteModal(false)} isLoading={!!actionLoading} type="danger" />
      <ConfirmModal isOpen={showConvertModal} title="Konversi ke Invoice" message="Quotation ini akan dikonversi menjadi invoice baru. Lanjutkan?" confirmText="Konversi" onConfirm={handleConvert} onCancel={() => setShowConvertModal(false)} isLoading={!!actionLoading} type="info" />
      <ConfirmModal isOpen={showBulkDeleteModal} title="Hapus Quotation" message={`Apakah Anda yakin ingin menghapus ${selected.size} quotation terpilih?`} confirmText={`Hapus ${selected.size} Quotation`} onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteModal(false)} isLoading={bulkDeleting} type="danger" />

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Quotation</h1>
          <p className="page-subtitle">Kelola penawaran harga untuk klien Anda</p>
        </div>
        <Link href="/quotations/create" className="btn btn-primary"><span>＋</span> Buat Quotation</Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 max-sm:gap-2.5">
          <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}><GoogleDocIcon /></div>
            <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
              <span className="text-xs text-text-tertiary font-medium">Total</span>
              <span className="text-xl max-sm:text-base font-extrabold">{stats.total}</span>
            </div>
          </div>
          <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}><Tick01Icon /></div>
            <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
              <span className="text-xs text-text-tertiary font-medium">Diterima</span>
              <span className="text-xl max-sm:text-base font-extrabold text-emerald-600">{stats.accepted}</span>
            </div>
          </div>
          <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}><ArrowTurnForwardIcon /></div>
            <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
              <span className="text-xs text-text-tertiary font-medium">Conversion Rate</span>
              <span className="text-xl max-sm:text-base font-extrabold text-violet-600">{stats.conversion_rate}%</span>
            </div>
          </div>
          <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(234,179,8,0.1)', color: '#EAB308' }}><SentIcon /></div>
            <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
              <span className="text-xs text-text-tertiary font-medium">Total Nilai</span>
              <span className="text-xl max-sm:text-base font-extrabold">{formatCurrency(stats.total_value)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm opacity-50"><Search01Icon /></span>
          <input type="text" placeholder="Cari nomor atau klien..." className="w-full py-3 pr-4 pl-11 border border-border-color rounded-md bg-bg-card text-text-primary text-sm outline-none transition-all duration-150 focus:border-red-400" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['', 'draft', 'sent', 'accepted', 'rejected', 'converted'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${statusFilter === s ? 'bg-gradient-to-br from-red-600 to-red-500 text-white border-red-500' : 'bg-bg-secondary border-border-color text-text-secondary hover:border-red-300'}`}>
              {s ? statusLabels[s] : 'Semua'}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4 animate-fade-in">
          <span className="text-sm font-medium text-red-700 dark:text-red-400">{selected.size} terpilih</span>
          <div className="flex gap-2">
            <button className="text-xs px-3 py-1.5 rounded-md bg-white dark:bg-bg-card border border-border-color hover:bg-bg-secondary transition-colors" onClick={() => setSelected(new Set())}>Batal</button>
            <button className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1" onClick={() => setShowBulkDeleteModal(true)}>
              <Delete02Icon width={14} height={14} /> Hapus Terpilih
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="table-container shadow-sm hover:shadow-md transition-shadow bg-bg-card border border-border-color rounded-lg overflow-x-auto">
          <table className="table w-full border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color w-10">
                  <input type="checkbox" className="w-4 h-4 accent-red-600 rounded" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleSelectAll} />
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color whitespace-nowrap">No. Quotation</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color whitespace-nowrap">Klien</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color whitespace-nowrap">Jumlah</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color whitespace-nowrap">Berlaku Hingga</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(q => (
                <tr key={q.id} className={`cursor-pointer border-b border-border-light hover:bg-bg-hover transition-colors ${selected.has(q.id) ? 'bg-red-50/40 dark:bg-red-950/10' : ''}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, a, input')) return; router.push(`/quotations/${q.id}`); }}>
                  <td className="px-4 py-4">
                    <input type="checkbox" className="w-4 h-4 accent-red-600 rounded" checked={selected.has(q.id)} onChange={() => toggleSelect(q.id)} onClick={e => e.stopPropagation()} />
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-red-600">{q.quotation_number}</td>
                  <td className="px-5 py-4 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-[34px] h-[34px] bg-red-50 dark:bg-red-900/50 rounded-full flex items-center justify-center text-[11px] font-bold text-red-600 shrink-0">
                        {q.client_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div><div className="font-semibold text-sm">{q.client_name}</div><div className="text-xs text-text-tertiary">{q.client_email}</div></div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold">{formatCurrency(q.total, q.currency)}</td>
                  <td className="px-5 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[q.status] || ''}`}>{statusLabels[q.status] || q.status}</span></td>
                  <td className="px-5 py-4 text-[13px] text-text-secondary">{q.valid_until ? formatDate(q.valid_until) : '-'}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1 justify-center">
                      {q.status === 'draft' && (
                        <>
                          <Link href={`/quotations/${q.id}/edit`} className="btn btn-ghost btn-sm hover:text-amber-500" title="Edit" onClick={(e) => e.stopPropagation()}>
                            <PencilEdit01Icon className="dark:text-white text-black" width={18} height={18} />
                          </Link>
                          <button className="btn btn-ghost btn-sm hover:text-blue-500" title="Kirim" onClick={() => handleSend(q.id)} disabled={actionLoading === q.id}>
                            <SentIcon className="dark:text-white text-black" width={18} height={18} />
                          </button>
                        </>
                      )}
                      {q.status === 'accepted' && (
                        <button className="btn btn-ghost btn-sm hover:text-violet-500" title="Konversi ke Invoice" onClick={() => { setConvertTarget(q.id); setShowConvertModal(true); }}>
                          <ArrowRight01Icon className="dark:text-white text-black" width={18} height={18} />
                        </button>
                      )}
                      {['draft', 'sent'].includes(q.status) && (
                        <button className="btn btn-ghost btn-sm hover:text-red-500" title="Hapus" onClick={() => { setDeleteTarget(q.id); setShowDeleteModal(true); }}>
                          <Delete02Icon className="dark:text-white text-black" width={18} height={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card flex flex-col justify-center items-center text-center py-16 px-5">
          <div className="text-5xl mb-4 opacity-50"><GoogleDocIcon width={48} height={48} /></div>
          <h3 className="text-lg font-semibold mb-2">Belum ada quotation</h3>
          <p className="text-sm text-text-secondary mb-6">Buat quotation pertama untuk memulai pipeline penawaran</p>
          <Link href="/quotations/create" className="btn btn-primary">Buat Quotation</Link>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > itemsPerPage && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border border-border-color bg-bg-card rounded-lg">
          <div className="text-sm text-text-secondary text-center sm:text-left">
            Menampilkan <span className="font-semibold text-text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-text-primary">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> dari <span className="font-semibold text-text-primary">{filtered.length}</span> data
          </div>
          <div className="flex gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
            <button className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-border-color rounded-md bg-bg-secondary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors" onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); setSelected(new Set()); }} disabled={currentPage === 1}>Sebelumnya</button>
            <div className="flex items-center justify-center px-3 text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 rounded-md min-w-[50px]">{currentPage} / {totalPages}</div>
            <button className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-border-color rounded-md bg-bg-secondary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors" onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); setSelected(new Set()); }} disabled={currentPage === totalPages}>Selanjutnya</button>
          </div>
        </div>
      )}
    </div>
  );
}
