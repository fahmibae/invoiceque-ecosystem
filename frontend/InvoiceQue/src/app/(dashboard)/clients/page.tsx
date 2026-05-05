'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { clientApi, invoiceApi, type Client, type Invoice } from '@/lib/api';
import { formatCurrency, convertToIDR, fetchExchangeRates } from '@/lib/utils';
import {
  Search01Icon, Mail01Icon, SmartPhone01Icon, Location01Icon,
  UserGroupIcon, FilterIcon, Cancel01Icon, SortingUpIcon,
  Invoice01Icon, MoneyBag02Icon, ArrowLeft01Icon, ArrowRight01Icon,
  UserIcon, Delete02Icon
} from 'hugeicons-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ClickableAmount from '@/components/ui/ClickableAmount';
import Portal from '@/components/ui/Portal';

const PER_PAGE = 12;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);

  // Filter state
  const [showFilter, setShowFilter] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filterCity, setFilterCity] = useState('');
  const [filterMinInvoices, setFilterMinInvoices] = useState('');
  const [filterMinSpent, setFilterMinSpent] = useState('');
  const [filterMaxSpent, setFilterMaxSpent] = useState('');

  // Tmp filter state (for modal)
  const [tmpSort, setTmpSort] = useState('newest');
  const [tmpCity, setTmpCity] = useState('');
  const [tmpMinInvoices, setTmpMinInvoices] = useState('');
  const [tmpMinSpent, setTmpMinSpent] = useState('');
  const [tmpMaxSpent, setTmpMaxSpent] = useState('');

  const fetchClients = async () => {
    try {
      const [clientRes, invoiceRes] = await Promise.all([
        clientApi.list(undefined, 1, 200),
        invoiceApi.list(undefined, 0, 500),
      ]);
      setClients(clientRes.data || []);
      setAllInvoices(invoiceRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat klien');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchExchangeRates().then(setExchangeRates);
  }, []);

  // Compute real client stats from invoices with currency conversion
  const clientStats = useMemo(() => {
    const map: Record<string, { totalInvoices: number; totalSpent: number }> = {};
    for (const inv of allInvoices) {
      if (!inv.client_id) continue;
      if (!map[inv.client_id]) map[inv.client_id] = { totalInvoices: 0, totalSpent: 0 };
      map[inv.client_id].totalInvoices += 1;
      if (inv.status === 'paid' || inv.status === 'partially_paid') {
        map[inv.client_id].totalSpent += convertToIDR(inv.amount_paid || 0, inv.currency, exchangeRates ?? undefined, inv.exchange_rate_idr);
      }
    }
    return map;
  }, [allInvoices, exchangeRates]);

  // Summary stats
  const stats = useMemo(() => {
    const totalClients = clients.length;
    const totalInvoices = Object.values(clientStats).reduce((s, c) => s + c.totalInvoices, 0);
    const totalSpent = Object.values(clientStats).reduce((s, c) => s + c.totalSpent, 0);
    const uniqueCities = new Set(clients.map(c => c.city).filter(Boolean));
    return { totalClients, totalInvoices, totalSpent, uniqueCities: uniqueCities.size };
  }, [clients, clientStats]);

  // Get unique cities for filter
  const cities = useMemo(() => {
    const set = new Set(clients.map(c => c.city).filter(Boolean));
    return Array.from(set).sort();
  }, [clients]);

  // Filtered & sorted
  const filtered = useMemo(() => {
    let result = [...clients];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }

    // City filter
    if (filterCity) {
      result = result.filter(c => c.city === filterCity);
    }

    // Min invoices
    if (filterMinInvoices) {
      const min = parseInt(filterMinInvoices);
      result = result.filter(c => (clientStats[c.id]?.totalInvoices || 0) >= min);
    }

    // Spent range
    if (filterMinSpent) {
      const min = parseFloat(filterMinSpent);
      result = result.filter(c => (clientStats[c.id]?.totalSpent || 0) >= min);
    }
    if (filterMaxSpent) {
      const max = parseFloat(filterMaxSpent);
      result = result.filter(c => (clientStats[c.id]?.totalSpent || 0) <= max);
    }

    // Sort
    switch (sortBy) {
      case 'newest': result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case 'oldest': result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case 'name_asc': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name_desc': result.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'invoices': result.sort((a, b) => (clientStats[b.id]?.totalInvoices || 0) - (clientStats[a.id]?.totalInvoices || 0)); break;
      case 'spent': result.sort((a, b) => (clientStats[b.id]?.totalSpent || 0) - (clientStats[a.id]?.totalSpent || 0)); break;
    }

    return result;
  }, [clients, search, filterCity, filterMinInvoices, filterMinSpent, filterMaxSpent, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentData = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  useEffect(() => { setSelected(new Set()); }, [search, filterCity, filterMinInvoices, filterMinSpent, filterMaxSpent, sortBy]);

  const activeFilterCount = [filterCity, filterMinInvoices, filterMinSpent, filterMaxSpent, sortBy !== 'newest' ? 'x' : ''].filter(Boolean).length;

  const openFilter = () => {
    setTmpSort(sortBy); setTmpCity(filterCity); setTmpMinInvoices(filterMinInvoices);
    setTmpMinSpent(filterMinSpent); setTmpMaxSpent(filterMaxSpent);
    setShowFilter(true);
  };

  const applyFilters = () => {
    setSortBy(tmpSort); setFilterCity(tmpCity); setFilterMinInvoices(tmpMinInvoices);
    setFilterMinSpent(tmpMinSpent); setFilterMaxSpent(tmpMaxSpent);
    setShowFilter(false);
  };

  const resetFilters = () => {
    setTmpSort('newest'); setTmpCity(''); setTmpMinInvoices('');
    setTmpMinSpent(''); setTmpMaxSpent('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus klien ini?')) return;
    try {
      await clientApi.delete(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus klien');
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
    if (selected.size === currentData.length && currentData.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(currentData.map((c) => c.id)));
    }
  };

  const confirmBulkDelete = () => {
    if (selected.size === 0) return;
    setShowBulkDeleteModal(true);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await clientApi.bulkDelete(Array.from(selected));
      setSelected(new Set());
      setShowBulkDeleteModal(false);
      await fetchClients();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus klien');
    } finally {
      setBulkDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>Memuat data klien...</p>
      </div>
    );
  }

  if (error) return (
    <div className="animate-fade-in p-10 text-center">
      <p className="text-red-500 mb-4">{error}</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>Coba Lagi</button>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        title="Hapus Klien"
        message={`Apakah Anda yakin ingin menghapus ${selected.size} klien terpilih? Tindakan ini tidak dapat dibatalkan.`}
        confirmText={`Hapus ${selected.size} Klien`}
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2"><FilterIcon width={20} height={20} /> Filter Klien</h3>
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors" onClick={() => setShowFilter(false)}>
                <Cancel01Icon width={20} height={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
              {/* City */}
              {cities.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2.5">Kota</label>
                  <div className="flex flex-wrap gap-2">
                    <button className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 ${!tmpCity ? 'bg-gradient-to-br from-red-600 to-red-500 text-white border-red-500 shadow-sm' : 'bg-bg-secondary border-border-color text-text-secondary hover:border-red-300'}`} onClick={() => setTmpCity('')}>Semua</button>
                    {cities.map((c) => (
                      <button key={c} className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 ${tmpCity === c ? 'bg-gradient-to-br from-red-600 to-red-500 text-white border-red-500 shadow-sm' : 'bg-bg-secondary border-border-color text-text-secondary hover:border-red-300'}`} onClick={() => setTmpCity(c)}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Min Invoices */}
              <div>
                <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2.5">Minimal Invoice</label>
                <input type="number" placeholder="Contoh: 5" className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors" value={tmpMinInvoices} onChange={(e) => setTmpMinInvoices(e.target.value)} />
              </div>

              {/* Spent Range */}
              <div>
                <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2.5">Rentang Total Transaksi</label>
                <div className="flex gap-2 items-center">
                  <input type="number" placeholder="Min" className="flex-1 py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors" value={tmpMinSpent} onChange={(e) => setTmpMinSpent(e.target.value)} />
                  <span className="text-text-tertiary text-sm">—</span>
                  <input type="number" placeholder="Max" className="flex-1 py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors" value={tmpMaxSpent} onChange={(e) => setTmpMaxSpent(e.target.value)} />
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2.5 flex items-center gap-1.5"><SortingUpIcon width={14} height={14} /> Urutkan</label>
                <div className="flex flex-wrap gap-2">
                  {[{ value: 'newest', label: 'Terbaru' }, { value: 'oldest', label: 'Terlama' }, { value: 'name_asc', label: 'Nama A-Z' }, { value: 'name_desc', label: 'Nama Z-A' }, { value: 'invoices', label: 'Invoice Terbanyak' }, { value: 'spent', label: 'Transaksi Terbesar' }].map((s) => (
                    <button key={s.value} className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 ${tmpSort === s.value ? 'bg-gradient-to-br from-red-600 to-red-500 text-white border-red-500 shadow-sm' : 'bg-bg-secondary border-border-color text-text-secondary hover:border-red-300'}`} onClick={() => setTmpSort(s.value)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
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

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Klien</h1>
          <p className="page-subtitle">Kelola data klien dan lihat riwayat transaksi</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              className="btn btn-secondary border-red-500 text-red-500 hover:bg-red-50"
              onClick={confirmBulkDelete}
              disabled={bulkDeleting}
            >
              <Delete02Icon color='red' /> Hapus {selected.size} Klien
            </button>
          )}
          <Link href="/clients/create" className="btn btn-primary">
            <span>＋</span> Tambah Klien
          </Link>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card flex items-center gap-3.5 py-4">
          <div className="w-11 h-11 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 rounded-lg flex items-center justify-center shrink-0">
            <UserGroupIcon className="text-red-600" width={22} height={22} />
          </div>
          <div className="min-w-0 flex-1">
            <ClickableAmount text={stats.totalClients} className="text-xl font-black whitespace-nowrap overflow-hidden text-ellipsis" />
            <div className="text-[11px] text-text-tertiary font-medium">Total Klien</div>
          </div>
        </div>
        <div className="card flex items-center gap-3.5 py-4">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg flex items-center justify-center shrink-0">
            <Invoice01Icon className="text-blue-600" width={22} height={22} />
          </div>
          <div className="min-w-0 flex-1">
            <ClickableAmount text={stats.totalInvoices} className="text-xl font-black whitespace-nowrap overflow-hidden text-ellipsis" />
            <div className="text-[11px] text-text-tertiary font-medium">Total Invoice</div>
          </div>
        </div>
        <div className="card flex items-center gap-3.5 py-4">
          <div className="w-11 h-11 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-lg flex items-center justify-center shrink-0">
            <MoneyBag02Icon className="text-emerald-600" width={22} height={22} />
          </div>
          <div className="min-w-0 flex-1">
            <ClickableAmount text={formatCurrency(stats.totalSpent)} className="text-xl font-black whitespace-nowrap overflow-hidden text-ellipsis" />
            <div className="text-[11px] text-text-tertiary font-medium tracking-tight whitespace-nowrap">Total Transaksi</div>
          </div>
        </div>
        <div className="card flex items-center gap-3.5 py-4">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 rounded-lg flex items-center justify-center shrink-0">
            <Location01Icon className="text-amber-600" width={22} height={22} />
          </div>
          <div className="min-w-0 flex-1">
            <ClickableAmount text={stats.uniqueCities} className="text-xl font-black whitespace-nowrap overflow-hidden text-ellipsis" />
            <div className="text-[11px] text-text-tertiary font-medium">Kota</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm opacity-50"><Search01Icon /></span>
          <input
            type="text"
            placeholder="Cari nama, perusahaan, atau email..."
            className="w-full py-3 pr-4 pl-11 border border-border-color rounded-md bg-bg-card text-text-primary text-sm outline-none transition-all duration-150 focus:border-red-400 focus:ring-3 focus:ring-red-500/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary relative" onClick={openFilter}>
          <FilterIcon width={16} height={16} /> Filter
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Results count & Select All */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-tertiary">{filtered.length} klien ditemukan</span>
          {currentData.length > 0 && (
            <div className="flex items-center gap-2 pl-3 border-l border-border-color">
              <input 
                type="checkbox" 
                checked={selected.size === currentData.length && currentData.length > 0} 
                onChange={toggleSelectAll} 
                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                id="selectAllClients"
              />
              <label htmlFor="selectAllClients" className="text-xs font-semibold text-text-secondary cursor-pointer">
                Pilih Semua
              </label>
            </div>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button className="text-xs text-red-500 hover:underline" onClick={() => { setSortBy('newest'); setFilterCity(''); setFilterMinInvoices(''); setFilterMinSpent(''); setFilterMaxSpent(''); }}>
            Hapus semua filter
          </button>
        )}
      </div>

      {/* Client Cards */}
      {currentData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-5">
          {currentData.map((client) => (
            <div key={client.id} className={`card relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg before:absolute before:top-0 before:inset-x-0 before:h-[3px] before:bg-gradient-to-br before:from-red-600 before:to-red-500 ${selected.has(client.id) ? 'ring-2 ring-red-500 bg-red-50/10' : 'before:opacity-0 before:transition-opacity before:duration-150 hover:before:opacity-100'}`}>
              <div className="absolute top-4 right-4 z-10">
                <input 
                  type="checkbox" 
                  checked={selected.has(client.id)} 
                  onChange={() => toggleSelect(client.id)}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-3.5 mb-4 pr-6">
                <div className="w-[50px] h-[50px] bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center font-bold text-base text-white shrink-0">
                  {client.name.split(' ').map((n) => n[0]).join('').substring(0,2)}
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-base font-bold mb-0.5">{client.name}</h3>
                  <p className="text-[13px] text-text-secondary">{client.company}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 mb-4 p-3.5 bg-bg-secondary rounded-md">
                <div className="flex items-center gap-2.5 text-[13px] text-text-secondary">
                  <span className="text-sm shrink-0"><Mail01Icon width={16} height={16} /></span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">{client.email}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[13px] text-text-secondary">
                  <span className="text-sm shrink-0"><SmartPhone01Icon width={16} height={16} /></span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">{client.phone}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[13px] text-text-secondary">
                  <span className="text-sm shrink-0"><Location01Icon width={16} height={16} /></span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">{client.address}, {client.city}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex flex-col gap-0.5 py-2.5 px-3 bg-bg-secondary rounded-sm text-center">
                  <span className="text-[15px] font-bold overflow-hidden text-ellipsis whitespace-nowrap">{clientStats[client.id]?.totalInvoices || 0}</span>
                  <span className="text-[11px] text-text-tertiary font-medium">Invoice</span>
                </div>
                <div className="flex flex-col gap-0.5 py-2.5 px-3 bg-bg-secondary rounded-sm text-center">
                  <span className="text-[15px] font-bold overflow-hidden text-ellipsis whitespace-nowrap">{formatCurrency(clientStats[client.id]?.totalSpent || 0)}</span>
                  <span className="text-[11px] text-text-tertiary font-medium">Total Transaksi</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border-light">
                <span className="text-[11px] text-text-tertiary">Bergabung: {new Date(client.created_at).toLocaleDateString('id-ID')}</span>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm text-danger hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(client.id)}>Hapus</button>
                  <Link href={`/clients/${client.id}`} className="btn btn-ghost btn-sm">Detail →</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-16 px-5">
          <div className="text-5xl mb-4 opacity-50 flex justify-center"><UserGroupIcon width={48} height={48} /></div>
          <h3 className="text-lg font-semibold mb-2">{search || activeFilterCount > 0 ? 'Tidak ada klien yang cocok' : 'Belum ada klien'}</h3>
          <p className="text-sm text-text-secondary mb-6">{search || activeFilterCount > 0 ? 'Coba ubah pencarian atau filter Anda' : 'Tambah klien pertama Anda untuk mulai membuat invoice'}</p>
          {!(search || activeFilterCount > 0) && <Link href="/clients/create" className="btn btn-primary">Tambah Klien</Link>}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ArrowLeft01Icon width={14} height={14} /> Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | string)[]>((acc, p, i, arr) => {
              if (i > 0 && (p - (arr[i - 1] as number)) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              typeof p === 'string' ? (
                <span key={`e${i}`} className="px-1 text-text-tertiary text-sm">...</span>
              ) : (
                <button key={p} className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all duration-150 ${p === page ? 'bg-gradient-to-br from-red-600 to-red-500 text-white shadow-sm' : 'bg-bg-secondary text-text-secondary hover:bg-red-50 hover:text-red-600 border border-border-color'}`} onClick={() => setPage(p)}>
                  {p}
                </button>
              )
            )}
          <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next <ArrowRight01Icon width={14} height={14} />
          </button>
        </div>
      )}
    </div>
  );
}
