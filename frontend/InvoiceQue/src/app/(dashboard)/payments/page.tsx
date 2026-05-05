'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { paymentLinkApi, type PaymentLink } from '@/lib/api';
import { formatCurrency, getStatusColor, convertToIDR, fetchExchangeRates } from '@/lib/utils';
import { Search01Icon, Copy01Icon, Payment01Icon, Edit02Icon, FilterIcon, Cancel01Icon, SortingUpIcon, PaypalIcon, Delete02Icon, FileLinkIcon, Link04Icon, MouseLeftClick02Icon, MoneyBag02Icon } from 'hugeicons-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ClickableAmount from '@/components/ui/ClickableAmount';
import Portal from '@/components/ui/Portal';

export default function PaymentsPage() {
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterMinAmount, setFilterMinAmount] = useState<string>('');
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterSort, setFilterSort] = useState<string>('newest');

  // Temp filter states (inside modal before apply)
  const [tmpStatus, setTmpStatus] = useState('');
  const [tmpMinAmount, setTmpMinAmount] = useState('');
  const [tmpMaxAmount, setTmpMaxAmount] = useState('');
  const [tmpDateFrom, setTmpDateFrom] = useState('');
  const [tmpDateTo, setTmpDateTo] = useState('');
  const [tmpSort, setTmpSort] = useState('newest');

  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Single delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchPaymentLinks() {
      try {
        const res = await paymentLinkApi.list(1, 50);
        setPaymentLinks(res.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat payment links');
      } finally {
        setLoading(false);
      }
    }
    fetchPaymentLinks();
    fetchExchangeRates().then(setExchangeRates);
  }, []);

  useEffect(() => {
    setSelected(new Set());
  }, [search, filterStatus, filterMinAmount, filterMaxAmount, filterDateFrom, filterDateTo, filterSort]);

  const activeFilterCount = [filterStatus, filterMinAmount, filterMaxAmount, filterDateFrom, filterDateTo, filterSort !== 'newest' ? filterSort : ''].filter(Boolean).length;

  const openFilterModal = () => {
    setTmpStatus(filterStatus);
    setTmpMinAmount(filterMinAmount);
    setTmpMaxAmount(filterMaxAmount);
    setTmpDateFrom(filterDateFrom);
    setTmpDateTo(filterDateTo);
    setTmpSort(filterSort);
    setShowFilter(true);
  };

  const applyFilters = () => {
    setFilterStatus(tmpStatus);
    setFilterMinAmount(tmpMinAmount);
    setFilterMaxAmount(tmpMaxAmount);
    setFilterDateFrom(tmpDateFrom);
    setFilterDateTo(tmpDateTo);
    setFilterSort(tmpSort);
    setShowFilter(false);
  };

  const resetFilters = () => {
    setTmpStatus('');
    setTmpMinAmount('');
    setTmpMaxAmount('');
    setTmpDateFrom('');
    setTmpDateTo('');
    setTmpSort('newest');
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterMinAmount, filterMaxAmount, filterDateFrom, filterDateTo, filterSort]);

  const filtered = paymentLinks
    .filter((pl) => {
      const matchSearch = pl.title.toLowerCase().includes(search.toLowerCase()) || pl.description.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || pl.status === filterStatus;
      const matchMin = !filterMinAmount || pl.amount >= parseInt(filterMinAmount);
      const matchMax = !filterMaxAmount || pl.amount <= parseInt(filterMaxAmount);
      const matchFrom = !filterDateFrom || new Date(pl.created_at) >= new Date(filterDateFrom);
      const matchTo = !filterDateTo || new Date(pl.created_at) <= new Date(filterDateTo + 'T23:59:59');
      return matchSearch && matchStatus && matchMin && matchMax && matchFrom && matchTo;
    })
    .sort((a, b) => {
      switch (filterSort) {
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount_high': return b.amount - a.amount;
        case 'amount_low': return a.amount - b.amount;
        case 'clicks': return b.clicks - a.clicks;
        case 'payments': return b.payments - a.payments;
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalRevenue = paymentLinks
    .filter(pl => pl.status === 'completed')
    .reduce((sum, pl) => sum + convertToIDR(pl.amount, pl.currency, exchangeRates ?? undefined), 0);

  const hasMixedCurrencies = new Set(paymentLinks.filter(pl => pl.status === 'completed').map(pl => pl.currency || 'IDR')).size > 1
    || paymentLinks.some(pl => pl.status === 'completed' && pl.currency && pl.currency !== 'IDR');

  const currencyBreakdown = filtered.reduce<Record<string, number>>((acc, pl) => {
    const cur = pl.currency || 'IDR';
    acc[cur] = (acc[cur] || 0) + pl.amount;
    return acc;
  }, {});
  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await paymentLinkApi.delete(deleteTargetId);
      setPaymentLinks((prev) => prev.filter((pl) => pl.id !== deleteTargetId));
      setShowDeleteModal(false);
      setDeleteTargetId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((pl) => pl.id)));
    }
  };

  const confirmBulkDelete = () => {
    if (selected.size === 0) return;
    setShowBulkDeleteModal(true);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await paymentLinkApi.bulkDelete(Array.from(selected));
      setSelected(new Set());
      setShowBulkDeleteModal(false);
      const res = await paymentLinkApi.list(1, 50);
      setPaymentLinks(res.data || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus payment links');
    } finally {
      setBulkDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>Memuat payment links...</p>
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
      {/* Single Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Hapus Payment Link"
        message="Yakin ingin menghapus payment link ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        onConfirm={confirmDelete}
        onCancel={() => { setShowDeleteModal(false); setDeleteTargetId(null); }}
        isLoading={isDeleting}
        type="danger"
      />
      {/* Bulk Delete Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        title="Hapus Payment Links"
        message={`Apakah Anda yakin ingin menghapus ${selected.size} payment link terpilih? Tindakan ini tidak dapat dibatalkan.`}
        confirmText={`Hapus ${selected.size} Link`}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
        isLoading={bulkDeleting}
        type="danger"
      />
      {/* Filter Modal */}
      {showFilter && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5" onClick={() => setShowFilter(false)}>
            <div className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[480px] sm:rounded-2xl sm:max-h-[85vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2"><FilterIcon width={20} height={20} /> Filter</h3>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors" onClick={() => setShowFilter(false)}>
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>

              {/* Filter Content */}
              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2.5">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {[{ value: '', label: 'Semua' }, { value: 'active', label: 'Aktif' }, { value: 'completed', label: 'Selesai' }, { value: 'expired', label: 'Kadaluarsa' }, { value: 'inactive', label: 'Nonaktif' }].map((s) => (
                      <button key={s.value} className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 ${tmpStatus === s.value ? 'bg-gradient-to-br from-red-600 to-red-500 text-white border-red-500 shadow-sm' : 'bg-bg-secondary border-border-color text-text-secondary hover:border-red-300'}`} onClick={() => setTmpStatus(s.value)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Range */}
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2.5">Rentang Nominal (Rp)</label>
                  <div className="flex gap-2 items-center">
                    <input type="number" placeholder="Min" className="flex-1 py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors" value={tmpMinAmount} onChange={(e) => setTmpMinAmount(e.target.value)} />
                    <span className="text-text-tertiary text-sm">—</span>
                    <input type="number" placeholder="Max" className="flex-1 py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors" value={tmpMaxAmount} onChange={(e) => setTmpMaxAmount(e.target.value)} />
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2.5">Rentang Tanggal</label>
                  <div className="flex gap-2 items-center">
                    <input type="date" className="flex-1 py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors" value={tmpDateFrom} onChange={(e) => setTmpDateFrom(e.target.value)} />
                    <span className="text-text-tertiary text-sm">—</span>
                    <input type="date" className="flex-1 py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors" value={tmpDateTo} onChange={(e) => setTmpDateTo(e.target.value)} />
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2.5 flex items-center gap-1.5"><SortingUpIcon width={14} height={14} /> Urutkan</label>
                  <div className="flex flex-wrap gap-2">
                    {[{ value: 'newest', label: 'Terbaru' }, { value: 'oldest', label: 'Terlama' }, { value: 'amount_high', label: 'Nominal ↑' }, { value: 'amount_low', label: 'Nominal ↓' }, { value: 'clicks', label: 'Klik Terbanyak' }, { value: 'payments', label: 'Pembayaran Terbanyak' }].map((s) => (
                      <button key={s.value} className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 ${tmpSort === s.value ? 'bg-gradient-to-br from-red-600 to-red-500 text-white border-red-500 shadow-sm' : 'bg-bg-secondary border-border-color text-text-secondary hover:border-red-300'}`} onClick={() => setTmpSort(s.value)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button className="btn btn-secondary flex-1" onClick={resetFilters}>Reset</button>
                <button className="btn btn-primary flex-1" onClick={applyFilters}>
                  <FilterIcon width={16} height={16} /> Terapkan Filter
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Payment Links</h1>
          <p className="page-subtitle">Buat dan kelola link pembayaran Anda</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              className="btn btn-secondary border-red-500 text-red-500 hover:bg-red-50"
              onClick={confirmBulkDelete}
              disabled={bulkDeleting}
            >
              <Delete02Icon color='red' /> Hapus {selected.size} Link
            </button>
          )}

        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-sm:gap-2.5 mb-6">
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-red-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}><FileLinkIcon /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <span className="text-xs text-text-tertiary font-medium">Total Links</span>
            <ClickableAmount text={paymentLinks.length} className="text-[22px] max-sm:text-lg font-extrabold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" />
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-red-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}><Link04Icon /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <span className="text-xs text-text-tertiary font-medium">Link Aktif</span>
            <ClickableAmount text={paymentLinks.filter((pl) => pl.status === 'active').length} className="text-[22px] max-sm:text-lg font-extrabold tracking-tight text-success whitespace-nowrap overflow-hidden text-ellipsis" />
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-red-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}><MouseLeftClick02Icon /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <span className="text-xs text-text-tertiary font-medium">Total Klik</span>
            <ClickableAmount text={paymentLinks.reduce((s, pl) => s + pl.clicks, 0)} className="text-[22px] max-sm:text-lg font-extrabold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" />
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-red-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}><MoneyBag02Icon /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <ClickableAmount text={`Total Pembayaran ${hasMixedCurrencies ? '(≈ IDR)' : ''}`} className="text-xs text-text-tertiary font-medium tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" />
            <ClickableAmount text={formatCurrency(totalRevenue)} className="text-[22px] max-sm:text-lg font-extrabold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" />
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm opacity-50"><Search01Icon /></span>
          <input
            type="text"
            placeholder="Cari payment link..."
            className="w-full py-3 pr-4 pl-11 border border-border-color rounded-md bg-bg-card text-text-primary text-sm outline-none transition-all duration-150 focus:border-red-400 focus:ring-3 focus:ring-red-500/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className="relative flex items-center gap-2 px-4 py-3 border border-border-color rounded-md bg-bg-card text-text-primary text-sm font-medium transition-all duration-150 hover:border-red-400 hover:bg-red-50/50 shrink-0"
          onClick={openFilterModal}
        >
          <FilterIcon width={18} height={18} />
          <span className="max-sm:hidden">Filter</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-red-600 to-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {currentData.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={selected.size === currentData.length && currentData.length > 0}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
            id="selectAll"
          />
          <label htmlFor="selectAll" className="text-sm text-text-secondary cursor-pointer">Pilih Semua ({currentData.length})</label>
        </div>
      )}

      {/* Payment Link Cards */}
      <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-5">
        {currentData.map((pl) => (
          <div key={pl.id} className={`card relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg before:absolute before:top-0 before:inset-x-0 before:h-[3px] before:bg-gradient-to-br before:from-red-600 before:to-red-500 ${selected.has(pl.id) ? 'ring-2 ring-red-500 bg-red-50/10' : ''}`}>
            <div className="absolute top-4 right-4 z-10">
              <input
                type="checkbox"
                checked={selected.has(pl.id)}
                onChange={() => toggleSelect(pl.id)}
                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
              />
            </div>
            <div className="flex justify-between items-center mb-3.5 mt-1 pr-6">
              <div className="w-[42px] h-[42px] bg-red-50 dark:bg-red-900/10 rounded-md flex items-center justify-center text-xl">
                <Payment01Icon className="text-red-600" />
              </div>
              <div className="flex items-center gap-2">
                {pl.payment_provider && pl.payment_provider !== 'manual' && (
                  <span className={`inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-bold ${pl.payment_provider === 'paypal' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'
                    }`}>
                    {pl.payment_provider === 'paypal' ? <PaypalIcon width={14} height={14}> PayPal</PaypalIcon> : <Payment01Icon width={14} height={14}> Xendit</Payment01Icon>}
                  </span>
                )}
                <span className={`badge ${getStatusColor(pl.status)}`}>
                  {pl.status.charAt(0).toUpperCase() + pl.status.slice(1)}
                </span>
              </div>
            </div>
            <Link href={`/payments/${pl.id}`} className="text-[17px] font-bold mb-1.5 block hover:text-red-600 transition-colors no-underline text-text-primary">{pl.title}</Link>
            <p className="text-[13px] text-text-secondary mb-3 leading-relaxed line-clamp-2" title={pl.description}>{pl.description}</p>
            <div className="text-[22px] font-extrabold bg-gradient-to-br from-red-600 to-red-500 bg-clip-text text-transparent mb-4">
              {new Intl.NumberFormat(pl.currency === 'IDR' ? 'id-ID' : 'en-US', { style: 'currency', currency: pl.currency || 'IDR', minimumFractionDigits: pl.currency === 'IDR' || pl.currency === 'JPY' ? 0 : 2 }).format(pl.amount)}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-bg-secondary rounded-md">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-base font-bold">{pl.clicks}</span>
                <span className="text-[11px] text-text-tertiary font-medium">Klik</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-base font-bold">{pl.payments}</span>
                <span className="text-[11px] text-text-tertiary font-medium">Pembayaran</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-base font-bold">
                  {pl.clicks > 0 ? Math.round((pl.payments / pl.clicks) * 100) : 0}%
                </span>
                <span className="text-[11px] text-text-tertiary font-medium">Konversi</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-bg-secondary border border-border-light rounded-md mb-3">
              <span className="flex-1 text-xs text-text-secondary overflow-hidden text-ellipsis whitespace-nowrap font-mono">{pl.url}</span>
              <button className="w-[30px] h-[30px] flex items-center justify-center rounded-sm bg-bg-card border border-border-color cursor-pointer text-sm transition-all duration-150 hover:bg-red-50 hover:border-red-300" title="Salin link" onClick={() => handleCopy(pl.url)}>
                <Copy01Icon width={16} height={16} className="text-text-secondary" />
              </button>
            </div>
            <div className="flex justify-between mt-1 items-center">
              <span className="text-[11px] text-text-tertiary">Dibuat: {new Date(pl.created_at).toLocaleDateString('id-ID')}</span>
              <div className="flex gap-1.5">
                <Link href={`/payments/${pl.id}/edit`} className="btn btn-ghost btn-sm text-text-secondary hover:text-red-600 hover:bg-red-50"><Edit02Icon width={14} height={14} /> Edit</Link>
                <button className="btn btn-ghost btn-sm text-danger hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(pl.id)}>Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border border-border-color bg-bg-card rounded-lg">
          <div className="text-sm text-text-secondary text-center sm:text-left">
            Menampilkan <span className="font-semibold text-text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-text-primary">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> dari <span className="font-semibold text-text-primary">{filtered.length}</span> data
          </div>
          <div className="flex gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
            <button
              className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-border-color rounded-md bg-bg-secondary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Sebelumnya
            </button>
            <div className="flex items-center justify-center px-3 text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 rounded-md min-w-[50px]">
              {currentPage} / {totalPages}
            </div>
            <button
              className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-border-color rounded-md bg-bg-secondary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="card text-center py-16 px-5">
          <div className="text-5xl mb-4 opacity-50 flex justify-center"><Payment01Icon width={48} height={48} /></div>
          <h3 className="text-lg font-semibold mb-2">Belum ada payment link</h3>
          <p className="text-sm text-text-secondary mb-6">Buat payment link pertama Anda</p>
          <Link href="/payments/create" className="btn btn-primary">Buat Payment Link</Link>
        </div>
      )}
    </div>
  );
}
