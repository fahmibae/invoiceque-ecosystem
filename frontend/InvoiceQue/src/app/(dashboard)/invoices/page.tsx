'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { invoiceApi, paymentLinkApi, type Invoice } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor, convertToIDR, fetchExchangeRates } from '@/lib/utils';
import { Download02Icon, Delete02Icon, Edit01Icon, Search01Icon, GoogleDocIcon, FilterIcon, Cancel01Icon, SortingUpIcon, GoogleDriveIcon, MoneyBag02Icon, CheckmarkBadge02Icon, HourglassIcon } from 'hugeicons-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ClickableAmount from '@/components/ui/ClickableAmount';
import Portal from '@/components/ui/Portal';

const statusFilters = ['Semua', 'draft', 'sent', 'paid', 'overdue', 'cancelled'];

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);

  // Filter states
  const [filterMinAmount, setFilterMinAmount] = useState<string>('');
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterSort, setFilterSort] = useState<string>('newest');

  // Temp filter states (inside modal before apply)
  const [tmpStatus, setTmpStatus] = useState('Semua');
  const [tmpMinAmount, setTmpMinAmount] = useState('');
  const [tmpMaxAmount, setTmpMaxAmount] = useState('');
  const [tmpDateFrom, setTmpDateFrom] = useState('');
  const [tmpDateTo, setTmpDateTo] = useState('');
  const [tmpSort, setTmpSort] = useState('newest');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const status = statusFilter === 'Semua' ? undefined : statusFilter;
      const res = await invoiceApi.list(status, 0, 50);
      setInvoices(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    setSelected(new Set());
  }, [statusFilter]);

  // Fetch live exchange rates
  useEffect(() => {
    fetchExchangeRates().then(setExchangeRates);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, filterMinAmount, filterMaxAmount, filterDateFrom, filterDateTo, filterSort]);

  const activeFilterCount = [
    statusFilter !== 'Semua' ? statusFilter : '',
    filterMinAmount,
    filterMaxAmount,
    filterDateFrom,
    filterDateTo,
    filterSort !== 'newest' ? filterSort : ''
  ].filter(Boolean).length;

  const openFilterModal = () => {
    setTmpStatus(statusFilter);
    setTmpMinAmount(filterMinAmount);
    setTmpMaxAmount(filterMaxAmount);
    setTmpDateFrom(filterDateFrom);
    setTmpDateTo(filterDateTo);
    setTmpSort(filterSort);
    setShowFilter(true);
  };

  const applyFilters = () => {
    setStatusFilter(tmpStatus);
    setFilterMinAmount(tmpMinAmount);
    setFilterMaxAmount(tmpMaxAmount);
    setFilterDateFrom(tmpDateFrom);
    setFilterDateTo(tmpDateTo);
    setFilterSort(tmpSort);
    setShowFilter(false);
  };

  const resetFilters = () => {
    setTmpStatus('Semua');
    setTmpMinAmount('');
    setTmpMaxAmount('');
    setTmpDateFrom('');
    setTmpDateTo('');
    setTmpSort('newest');
  };

  const filtered = invoices
    .filter((inv) => {
      const matchSearch = inv.number.toLowerCase().includes(search.toLowerCase()) || inv.client_name.toLowerCase().includes(search.toLowerCase());
      const matchMin = !filterMinAmount || inv.total >= parseInt(filterMinAmount);
      const matchMax = !filterMaxAmount || inv.total <= parseInt(filterMaxAmount);
      const matchFrom = !filterDateFrom || new Date(inv.created_at) >= new Date(filterDateFrom);
      const matchTo = !filterDateTo || new Date(inv.created_at) <= new Date(filterDateTo + 'T23:59:59');
      return matchSearch && matchMin && matchMax && matchFrom && matchTo;
    })
    .sort((a, b) => {
      switch (filterSort) {
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount_high': return b.total - a.total;
        case 'amount_low': return a.total - b.total;
        case 'due_soon': return new Date(a.due_date || '9999-12-31').getTime() - new Date(b.due_date || '9999-12-31').getTime();
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalAmount = filtered.reduce((sum, inv) => sum + convertToIDR(inv.total, inv.currency, exchangeRates ?? undefined, inv.exchange_rate_idr), 0);

  // Group totals by currency for breakdown
  const currencyBreakdown = filtered.reduce<Record<string, number>>((acc, inv) => {
    const cur = inv.currency || 'IDR';
    acc[cur] = (acc[cur] || 0) + inv.total;
    return acc;
  }, {});
  const hasMixedCurrencies = Object.keys(currencyBreakdown).length > 1 || (Object.keys(currencyBreakdown).length === 1 && !currencyBreakdown['IDR']);

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
      setSelected(new Set(filtered.map((inv) => inv.id)));
    }
  };

  const confirmBulkDelete = () => {
    if (selected.size === 0) return;
    setShowBulkDeleteModal(true);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const ids = Array.from(selected);
      // Cascade delete: clean up associated payment links first
      try {
        await paymentLinkApi.deleteByInvoices(ids);
      } catch {
        // Non-blocking — payment links cleanup is best-effort
      }
      await invoiceApi.bulkDelete(ids);
      setSelected(new Set());
      setShowBulkDeleteModal(false);
      await fetchInvoices();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus invoice');
      setBulkDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>Memuat data invoice...</p>
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
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        title="Hapus Invoice"
        message={`Apakah Anda yakin ingin menghapus ${selected.size} invoice terpilih? Tindakan ini tidak dapat dibatalkan.`}
        confirmText={`Hapus ${selected.size} Invoice`}
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
              <h3 className="text-lg font-bold flex items-center gap-2"><FilterIcon width={20} height={20} /> Filter Invoice</h3>
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
                  {statusFilters.map((s) => (
                    <button key={s} className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 ${tmpStatus === s ? 'bg-gradient-to-br from-red-600 to-red-500 text-white border-red-500 shadow-sm' : 'bg-bg-secondary border-border-color text-text-secondary hover:border-red-300'}`} onClick={() => setTmpStatus(s)}>
                      {s === 'Semua' ? s : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Range */}
              <div>
                <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2.5">Rentang Total (Rp)</label>
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
                  {[{ value: 'newest', label: 'Terbaru' }, { value: 'oldest', label: 'Terlama' }, { value: 'amount_high', label: 'Total ↑' }, { value: 'amount_low', label: 'Total ↓' }, { value: 'due_soon', label: 'Jatuh Tempo Terdekat' }].map((s) => (
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
          <h1 className="page-title">Invoice</h1>
          <p className="page-subtitle">Kelola semua invoice Anda di sini</p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button
              className="btn btn-secondary border-red-500 text-red-500 hover:bg-red-50"
              onClick={confirmBulkDelete}
              disabled={bulkDeleting}
            >
              <Delete02Icon color='red' /> Hapus {selected.size} Invoice
            </button>
          )}
          <Link href="/invoices/outstanding" className="btn btn-secondary flex items-center gap-2">
            <span>DP Belum Lunas</span>
          </Link>
          <Link href="/invoices/create" className="btn btn-primary">
            <span>＋</span> Buat Invoice
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 max-sm:gap-2.5">
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-red-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}><GoogleDocIcon /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">          
            <span className="text-xs text-text-tertiary font-medium">Total Invoice</span>
            <ClickableAmount text={filtered.length} className="text-xl max-sm:text-base font-extrabold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" />
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-red-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}><MoneyBag02Icon /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <span className="text-xs text-text-tertiary font-medium">Total Nilai {hasMixedCurrencies ? '(≈ IDR)' : ''}</span>
            <ClickableAmount text={formatCurrency(totalAmount)} className="text-xl max-sm:text-base font-extrabold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" />
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-red-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}><CheckmarkBadge02Icon /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <span className="text-xs text-text-tertiary font-medium">Sudah Bayar</span>
            <ClickableAmount text={filtered.filter((i) => i.status === 'paid').length} className="text-xl max-sm:text-base font-extrabold tracking-tight text-success whitespace-nowrap overflow-hidden text-ellipsis" />
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-red-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}><HourglassIcon /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <span className="text-xs text-text-tertiary font-medium">Kadaluarsa</span>
            <ClickableAmount text={filtered.filter((i) => i.status === 'overdue').length} className="text-xl max-sm:text-base font-extrabold tracking-tight text-danger whitespace-nowrap overflow-hidden text-ellipsis" />
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm opacity-50"><Search01Icon /></span>
          <input
            type="text"
            placeholder="Cari nomor invoice atau klien..."
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

      

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="table-container shadow-sm hover:shadow-md transition-shadow bg-bg-card border border-border-color rounded-lg overflow-x-auto">
          <table className="table w-full border-collapse overflow-x-auto">
            <thead>
              <tr>
                <th className="w-10 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color whitespace-nowrap">No. Invoice</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color whitespace-nowrap">Klien</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color whitespace-nowrap">Jumlah</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color whitespace-nowrap">Konversi Bayar</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color whitespace-nowrap">Jatuh Tempo</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((inv) => (
                <tr 
                  key={inv.id} 
                  style={{
                    ...(selected.has(inv.id) ? { background: 'rgba(99,102,241,0.06)' } : {}),
                  }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('input, button, a')) return;
                    router.push(`/invoices/${inv.id}`);
                  }}
                  className="cursor-pointer border-b border-border-light hover:bg-bg-hover transition-colors"
                >
                  <td className="px-5 py-4 align-middle text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={selected.has(inv.id)}
                      onChange={() => toggleSelect(inv.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-4 align-middle text-sm text-text-primary">
                    <Link href={`/invoices/${inv.id}`} className="font-semibold text-red-600 hover:text-red-700 transition-colors">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-5 py-4 align-middle text-sm text-text-primary">
                    <div className="flex items-center gap-3">
                      <div className="w-[34px] h-[34px] bg-red-50 dark:bg-red-900/50 rounded-full flex items-center justify-center text-[11px] font-bold text-red-600 shrink-0">
                        {inv.client_name.split(' ').map((n) => n[0]).join('').substring(0,2)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{inv.client_name}</div>
                        <div className="text-xs text-text-tertiary">{inv.client_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle text-sm text-text-primary font-bold">
                    <div className="flex flex-col gap-0.5">
                      <span>{formatCurrency(inv.total, inv.currency)}</span>
                      {inv.currency && inv.currency !== 'IDR' && (
                        <span className="text-[10px] font-semibold text-text-tertiary bg-bg-secondary px-1.5 py-0.5 rounded-full w-fit">{inv.currency}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    {(() => {
                      const pct = inv.status === 'paid'
                        ? 100
                        : inv.total > 0
                          ? Math.min(100, Math.round((inv.amount_paid / inv.total) * 100))
                          : 0;
                      const isFullyPaid = pct >= 100;
                      const isPartial = pct > 0 && pct < 100;
                      return (
                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                          <div className="flex justify-between items-center gap-2">
                            <span className={`text-xs font-bold ${
                              isFullyPaid ? 'text-success' : isPartial ? 'text-amber-500' : 'text-text-tertiary'
                            }`}>{pct}%</span>
                            <span className="text-[11px] text-text-tertiary font-medium">
                              {formatCurrency(inv.amount_paid, inv.currency)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden w-full">
                            <div
                              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                                isFullyPaid
                                  ? 'from-green-500 to-emerald-400'
                                  : isPartial
                                    ? 'from-amber-500 to-amber-400'
                                    : 'from-slate-400 to-slate-300'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {inv.payment_type === 'dp' && pct > 0 && pct < 100 && (
                            <span className="text-[10px] text-amber-500 font-semibold">DP {inv.dp_percentage}%</span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-4 align-middle text-sm text-text-primary">
                    <span className={`badge ${getStatusColor(inv.status)}`}>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-middle text-[13px] text-text-secondary">{inv.due_date ? formatDate(inv.due_date) : '-'}</td>
                  <td className="px-5 py-4 align-middle text-sm text-text-primary">
                    <div className="flex gap-1">
                      {inv.status === 'draft' && (
                        <Link href={`/invoices/${inv.id}/edit`} className="btn btn-ghost btn-sm hover:text-green-500" title="Edit">
                          <Edit01Icon className='dark:text-white text-black' />
                        </Link>
                      )}
                      <button
                        className="btn btn-ghost btn-sm hover:text-blue-500"
                        title="Download PDF"
                        onClick={() => invoiceApi.downloadPdf(inv.id, inv.number + '.pdf')}
                      >
                        <Download02Icon className='dark:text-white text-black' />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card flex flex-col justify-center items-center text-center py-16 px-5">
          <div className="text-5xl mb-4 opacity-50"><GoogleDocIcon width={48} height={48}/></div>
          <h3 className="text-lg font-semibold mb-2">Belum ada invoice</h3>
          <p className="text-sm text-text-secondary mb-6">Buat invoice pertama Anda untuk memulai</p>
          <Link href="/invoices/create" className="btn btn-primary">Buat Invoice</Link>
        </div>
      )}

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
    </div>
  );
}
