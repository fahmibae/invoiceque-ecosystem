'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { invoiceApi, clientApi, paymentLinkApi, dashboardApi, type Invoice, type Client, type PaymentLink, type RevenueChartItem } from '@/lib/api';
import { formatCurrency, formatDate, convertToIDR, fetchExchangeRates, getStatusColor } from '@/lib/utils';
import { ChartIcon, MoneyBag02Icon, GoogleDocIcon, UserGroupIcon, Payment01Icon, ArrowDown01Icon, ArrowUp01Icon, Calendar01Icon, FilterIcon } from 'hugeicons-react';
import ClickableAmount from '@/components/ui/ClickableAmount';

type Period = '7d' | '30d' | '90d' | '1y' | 'all';

function getPeriodLabel(p: Period) {
  return { '7d': '7 Hari', '30d': '30 Hari', '90d': '3 Bulan', '1y': '1 Tahun', all: 'Semua' }[p];
}

function isInPeriod(dateStr: string, period: Period) {
  if (period === 'all') return true;
  const d = new Date(dateStr);
  const now = new Date();
  const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[period];
  const cutoff = new Date(now.getTime() - days * 86400000);
  return d >= cutoff;
}

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(key: string) {
  const [y, m] = key.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

export default function ReportsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<Period>('30d');
  const [rates, setRates] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetchExchangeRates();
        setRates(r);
        const [invRes, cliRes, plRes] = await Promise.all([
          invoiceApi.list(undefined, 0, 500),
          clientApi.list(undefined, 1, 500),
          paymentLinkApi.list(1, 500),
        ]);
        setInvoices(invRes.data || []);
        setClients(cliRes.data || []);
        setPaymentLinks(plRes.data || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filtered data by period
  const filtered = useMemo(() => invoices.filter(i => isInPeriod(i.created_at, period)), [invoices, period]);
  const filteredPL = useMemo(() => paymentLinks.filter(p => isInPeriod(p.created_at, period)), [paymentLinks, period]);

  // ── KPI Calculations ──
  const totalRevenue = useMemo(() =>
    filtered.filter(i => i.status === 'paid' || i.status === 'partially_paid')
      .reduce((s, i) => s + convertToIDR(i.amount_paid || 0, i.currency, rates || undefined, i.exchange_rate_idr), 0),
    [filtered, rates]);

  const totalPending = useMemo(() =>
    filtered.filter(i => ['sent', 'overdue', 'partially_paid'].includes(i.status))
      .reduce((s, i) => s + convertToIDR(i.amount_remaining || 0, i.currency, rates || undefined, i.exchange_rate_idr), 0),
    [filtered, rates]);

  const totalOverdue = useMemo(() =>
    filtered.filter(i => i.status === 'overdue')
      .reduce((s, i) => s + convertToIDR(i.total, i.currency, rates || undefined, i.exchange_rate_idr), 0),
    [filtered, rates]);

  const paidCount = filtered.filter(i => i.status === 'paid').length;
  const sentCount = filtered.filter(i => i.status === 'sent').length;
  const overdueCount = filtered.filter(i => i.status === 'overdue').length;
  const draftCount = filtered.filter(i => i.status === 'draft').length;
  const dpCount = filtered.filter(i => i.status === 'partially_paid').length;
  const avgInvoice = filtered.length > 0 ? filtered.reduce((s, i) => s + convertToIDR(i.total, i.currency, rates || undefined, i.exchange_rate_idr), 0) / filtered.length : 0;
  const collectionRate = filtered.length > 0 ? Math.round((paidCount / filtered.length) * 100) : 0;

  // ── Monthly Revenue ──
  const monthlyRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.filter(i => i.status === 'paid' || i.status === 'partially_paid').forEach(i => {
      const key = getMonthKey(i.paid_at || i.created_at);
      map[key] = (map[key] || 0) + convertToIDR(i.amount_paid || 0, i.currency, rates || undefined, i.exchange_rate_idr);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ month: getMonthLabel(k), revenue: v }));
  }, [filtered, rates]);

  const maxRev = Math.max(...monthlyRevenue.map(d => d.revenue), 1);

  // ── Invoice Status Distribution ──
  const statusData = [
    { label: 'Lunas', count: paidCount, color: '#10B981' },
    { label: 'Terkirim', count: sentCount, color: '#3B82F6' },
    { label: 'Jatuh Tempo', count: overdueCount, color: '#EF4444' },
    { label: 'Draft', count: draftCount, color: '#6B7280' },
    { label: 'DP', count: dpCount, color: '#F59E0B' },
  ];
  const totalStatusCount = statusData.reduce((s, d) => s + d.count, 0) || 1;

  // ── Top Clients ──
  const topClients = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; count: number }> = {};
    filtered.filter(i => i.status === 'paid' || i.status === 'partially_paid').forEach(i => {
      if (!map[i.client_id]) map[i.client_id] = { name: i.client_name, revenue: 0, count: 0 };
      map[i.client_id].revenue += convertToIDR(i.amount_paid || 0, i.currency, rates || undefined, i.exchange_rate_idr);
      map[i.client_id].count++;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filtered, rates]);

  // ── Currency Breakdown ──
  const currencyBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number; totalIDR: number }> = {};
    filtered.forEach(i => {
      const c = i.currency || 'IDR';
      if (!map[c]) map[c] = { count: 0, total: 0, totalIDR: 0 };
      map[c].count++;
      map[c].total += i.total;
      map[c].totalIDR += convertToIDR(i.total, i.currency, rates || undefined, i.exchange_rate_idr);
    });
    return Object.entries(map).sort(([, a], [, b]) => b.totalIDR - a.totalIDR);
  }, [filtered, rates]);

  // ── Payment Link Stats ──
  const plActive = filteredPL.filter(p => p.status === 'active').length;
  const plCompleted = filteredPL.filter(p => p.status === 'completed').length;
  const plExpired = filteredPL.filter(p => p.status === 'expired').length;
  const plTotalClicks = filteredPL.reduce((s, p) => s + (p.clicks || 0), 0);
  const plTotalPayments = filteredPL.reduce((s, p) => s + (p.payments || 0), 0);
  const plConversionRate = plTotalClicks > 0 ? Math.round((plTotalPayments / plTotalClicks) * 100) : 0;

  // ── Aging Report ──
  const agingBuckets = useMemo(() => {
    const buckets = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const now = new Date();
    filtered.filter(i => ['sent', 'overdue', 'partially_paid'].includes(i.status)).forEach(i => {
      const due = new Date(i.due_date);
      const diff = Math.floor((now.getTime() - due.getTime()) / 86400000);
      const amt = convertToIDR(i.amount_remaining || 0, i.currency, rates || undefined, i.exchange_rate_idr);
      if (diff <= 0) buckets.current += amt;
      else if (diff <= 30) buckets['1-30'] += amt;
      else if (diff <= 60) buckets['31-60'] += amt;
      else if (diff <= 90) buckets['61-90'] += amt;
      else buckets['90+'] += amt;
    });
    return buckets;
  }, [filtered, rates]);

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4" />
        <p>Memuat laporan...</p>
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
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Laporan</h1>
          <p className="page-subtitle">Analisis lengkap performa bisnis Anda</p>
        </div>
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d', '1y', 'all'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${period === p ? 'bg-red-500 text-white shadow-sm' : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-border-color'}`}>
              {getPeriodLabel(p)}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Pendapatan', value: formatCurrency(totalRevenue), icon: MoneyBag02Icon, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Belum Dibayar', value: formatCurrency(totalPending), icon: GoogleDocIcon, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
          { label: 'Jatuh Tempo', value: formatCurrency(totalOverdue), icon: Calendar01Icon, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
          { label: 'Rata-rata Invoice', value: formatCurrency(avgInvoice), icon: ChartIcon, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
        ].map((card, i) => (
          <div key={i} className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5">
            <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0" style={{ background: card.bg, color: card.color }}>
              <card.icon />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
              <span className="text-xs text-text-tertiary font-medium">{card.label}</span>
              <ClickableAmount text={card.value} className="text-xl font-extrabold text-text-primary tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-lg:text-base" />
            </div>
          </div>
        ))}
      </div>

      {/* Row: Revenue Chart + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 mb-6">
        {/* Revenue Chart */}
        <div className="card min-h-[320px]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold flex items-center gap-2"><ChartIcon /> Tren Pendapatan</h3>
            <span className="text-xs text-text-tertiary font-medium">{filtered.length} invoice</span>
          </div>
          {monthlyRevenue.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-text-tertiary text-sm">Belum ada data pendapatan</div>
          ) : (
            <div className="flex items-end gap-3 h-[300px] pt-5">
              {monthlyRevenue.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full">
                  <div className="flex-1 w-full flex items-end justify-center">
                    <div className="w-full max-w-[48px] bg-gradient-to-br from-red-600 to-red-500 rounded-t-sm min-h-[4px] transition-all duration-300 relative cursor-pointer hover:opacity-85 group"
                      style={{ height: `${(d.revenue / maxRev) * 100}%` }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-text-primary text-bg-primary px-2 py-1 rounded-sm text-[10px] font-semibold whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100">
                        {formatCurrency(d.revenue)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-text-tertiary font-semibold">{d.month}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="card">
          <h3 className="text-base font-bold flex items-center gap-2 mb-5"><GoogleDocIcon /> Status Invoice</h3>
          <div className="flex flex-col gap-3">
            {statusData.map((s, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-text-primary">{s.label}</span>
                  <span className="text-text-tertiary font-semibold">{s.count}</span>
                </div>
                <div className="w-full h-2.5 bg-bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(s.count / totalStatusCount) * 100}%`, backgroundColor: s.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border-light flex justify-between text-sm">
            <span className="text-text-tertiary">Tingkat Koleksi</span>
            <span className="font-bold text-text-primary">{collectionRate}%</span>
          </div>
        </div>
      </div>

      {/* Row: Top Clients + Currency Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Top Clients */}
        <div className="card">
          <h3 className="text-base font-bold flex items-center gap-2 mb-5"><UserGroupIcon /> Klien Teratas</h3>
          {topClients.length === 0 ? (
            <div className="text-center text-text-tertiary text-sm py-8">Belum ada data klien</div>
          ) : (
            <div className="flex flex-col gap-3">
              {topClients.map((c, i) => {
                const maxC = topClients[0]?.revenue || 1;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-text-primary truncate">{c.name}</span>
                        <span className="text-xs text-text-tertiary ml-2 shrink-0">{c.count} inv</span>
                      </div>
                      <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-500" style={{ width: `${(c.revenue / maxC) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-text-secondary mt-0.5 block">{formatCurrency(c.revenue)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Currency Breakdown */}
        <div className="card">
          <h3 className="text-base font-bold flex items-center gap-2 mb-5"><MoneyBag02Icon /> Distribusi Mata Uang</h3>
          {currencyBreakdown.length === 0 ? (
            <div className="text-center text-text-tertiary text-sm py-8">Belum ada data</div>
          ) : (
            <div className="table-container border-none">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mata Uang</th>
                    <th className="text-right">Jumlah Inv</th>
                    <th className="text-right">Total (Asli)</th>
                    <th className="text-right">Total (IDR)</th>
                  </tr>
                </thead>
                <tbody>
                  {currencyBreakdown.map(([cur, data]) => (
                    <tr key={cur}>
                      <td><span className="font-semibold">{cur}</span></td>
                      <td className="text-right">{data.count}</td>
                      <td className="text-right font-medium">{formatCurrency(data.total, cur)}</td>
                      <td className="text-right font-semibold">{formatCurrency(data.totalIDR)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Row: Payment Links + Aging Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Payment Link Stats */}
        <div className="card">
          <h3 className="text-base font-bold flex items-center gap-2 mb-5"><Payment01Icon /> Payment Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Aktif', value: plActive, color: '#10B981' },
              { label: 'Selesai', value: plCompleted, color: '#3B82F6' },
              { label: 'Kadaluarsa', value: plExpired, color: '#EF4444' },
            ].map((s, i) => (
              <div key={i} className="text-center p-3 bg-bg-secondary rounded-lg">
                <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-text-tertiary font-medium mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 pt-3 border-t border-border-light">
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">Total Klik</span>
              <span className="font-bold text-text-primary">{plTotalClicks}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">Total Pembayaran</span>
              <span className="font-bold text-text-primary">{plTotalPayments}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-tertiary">Tingkat Konversi</span>
              <span className="font-bold" style={{ color: plConversionRate > 50 ? '#10B981' : plConversionRate > 20 ? '#F59E0B' : '#EF4444' }}>{plConversionRate}%</span>
            </div>
          </div>
        </div>

        {/* Aging Report */}
        <div className="card">
          <h3 className="text-base font-bold flex items-center gap-2 mb-5"><Calendar01Icon /> Aging Piutang</h3>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Belum Jatuh Tempo', value: agingBuckets.current, color: '#10B981' },
              { label: '1-30 Hari Lewat', value: agingBuckets['1-30'], color: '#F59E0B' },
              { label: '31-60 Hari Lewat', value: agingBuckets['31-60'], color: '#F97316' },
              { label: '61-90 Hari Lewat', value: agingBuckets['61-90'], color: '#EF4444' },
              { label: '> 90 Hari Lewat', value: agingBuckets['90+'], color: '#991B1B' },
            ].map((b, i) => {
              const maxAging = Math.max(agingBuckets.current, agingBuckets['1-30'], agingBuckets['31-60'], agingBuckets['61-90'], agingBuckets['90+'], 1);
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium" style={{ color: b.color }}>{b.label}</span>
                    <span className="font-semibold text-text-primary">{formatCurrency(b.value)}</span>
                  </div>
                  <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(b.value / maxAging) * 100}%`, backgroundColor: b.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-border-light flex justify-between text-sm">
            <span className="text-text-tertiary">Total Piutang</span>
            <span className="font-bold text-text-primary">{formatCurrency(totalPending)}</span>
          </div>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="card mb-6">
        <h3 className="text-base font-bold flex items-center gap-2 mb-5"><ChartIcon /> Ringkasan</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Invoice', value: filtered.length.toString() },
            { label: 'Total Klien', value: clients.length.toString() },
            { label: 'Payment Links', value: filteredPL.length.toString() },
            { label: 'Tingkat Koleksi', value: `${collectionRate}%` },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 bg-bg-secondary rounded-lg">
              <div className="text-2xl font-extrabold text-text-primary">{s.value}</div>
              <div className="text-xs text-text-tertiary font-medium mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
