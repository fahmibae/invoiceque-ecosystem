'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { dashboardApi, invoiceApi, paymentLinkApi, type DashboardStats, type Invoice, type RevenueChartItem } from '@/lib/api';
import { formatCurrency, getStatusColor, formatDate, convertToIDR, fetchExchangeRates } from '@/lib/utils';
import UsageIndicator from '@/components/UsageIndicator';
import { MoneyBag02Icon, GoogleDocIcon, Loading01Icon, Payment01Icon, ChartIcon, FlashIcon, UserGroupIcon, Settings01Icon, UserGroup02Icon } from 'hugeicons-react';
import ClickableAmount from '@/components/ui/ClickableAmount';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const rates = await fetchExchangeRates();
        setExchangeRates(rates);

        const [statsRes, invoicesRes, paymentLinksRes, allInvoicesRes] = await Promise.all([
          dashboardApi.getStats(),
          invoiceApi.list(undefined, 0, 5),
          paymentLinkApi.list(1, 100),
          invoiceApi.list(undefined, 0, 500), // Fetch up to 500 to calculate true stats locally
        ]);
        
        // Calculate true stats from invoices to account for currency conversion
        const allInvoices = allInvoicesRes.data || [];
        const trueTotalInvoices = allInvoices.length;
        const trueTotalRevenue = allInvoices
          .filter(inv => inv.status === 'paid' || inv.status === 'partially_paid')
          .reduce((sum, inv) => sum + convertToIDR(inv.amount_paid || 0, inv.currency, rates, inv.exchange_rate_idr), 0);
        const truePendingAmount = allInvoices
          .filter(inv => inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'partially_paid')
          .reduce((sum, inv) => sum + convertToIDR(inv.amount_remaining || 0, inv.currency, rates, inv.exchange_rate_idr), 0);

        // Override activePaymentLinks and currency stats
        const activeCount = (paymentLinksRes.data || []).filter(pl => pl.status === 'active').length;
        setStats({ 
          ...statsRes, 
          activePaymentLinks: activeCount,
          totalInvoices: trueTotalInvoices,
          totalRevenue: trueTotalRevenue,
          pendingAmount: truePendingAmount
        });
        setRecentInvoices(invoicesRes.data || []);

        // Build revenue chart from real invoice data with proper currency conversion
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const now = new Date();
        const chartMonths = 6;

        // Group revenue by YYYY-MM from paid/partially_paid invoices
        const revenueByMonth: Record<string, number> = {};
        allInvoices
          .filter(inv => (inv.status === 'paid' || inv.status === 'partially_paid') && inv.paid_at)
          .forEach(inv => {
            const paidDate = new Date(inv.paid_at!);
            const key = `${paidDate.getFullYear()}-${String(paidDate.getMonth() + 1).padStart(2, '0')}`;
            const amountIDR = convertToIDR(inv.amount_paid || 0, inv.currency, rates, inv.exchange_rate_idr);
            revenueByMonth[key] = (revenueByMonth[key] || 0) + amountIDR;
          });

        // Build chart data for the last 6 months
        const chartData: RevenueChartItem[] = [];
        for (let i = chartMonths - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          chartData.push({
            month: monthNames[d.getMonth() + 1],
            revenue: revenueByMonth[key] || 0,
          });
        }
        setRevenueData(chartData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>Memuat dashboard...</p>
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

  const maxRevenue = Math.max(...revenueData.map((d) => d.revenue), 1);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Selamat datang kembali! Berikut ringkasan bisnis Anda.</p>
        </div>
        <Link href="/invoices/create" className="btn btn-primary">
          <span>＋</span> Buat Invoice
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-sm:gap-2.5 mb-6">
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-red-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}><MoneyBag02Icon /></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <span className="text-xs text-text-tertiary font-medium">Total Pendapatan</span>
            <ClickableAmount text={formatCurrency(stats?.totalRevenue ?? 0)} className="text-xl font-extrabold text-text-primary tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-lg:text-base" />
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-red-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}><GoogleDocIcon/></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <span className="text-xs text-text-tertiary font-medium">Total Invoice</span>
            <ClickableAmount text={stats?.totalInvoices ?? 0} className="text-xl font-extrabold text-text-primary tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-lg:text-base" />
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-red-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}><Loading01Icon/></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <span className="text-xs text-text-tertiary font-medium">Belum Dibayar</span>
            <ClickableAmount text={formatCurrency(stats?.pendingAmount ?? 0)} className="text-xl font-extrabold text-text-primary tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-lg:text-base" />
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 after:content-[''] after:absolute after:top-0 after:right-0 after:w-20 after:h-20 after:bg-gradient-to-br after:from-red-500/10 after:to-transparent after:rounded-bl-full">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 text-[22px]" style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}><Payment01Icon/></div>
          <div className="flex flex-col gap-1 flex-1 min-w-0 z-10">
            <span className="text-xs text-text-tertiary font-medium">Payment Links Aktif</span>
            <ClickableAmount text={stats?.activePaymentLinks ?? 0} className="text-xl font-extrabold text-text-primary tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-lg:text-base" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 mb-6">
        {/* Revenue Chart */}
        <div className="card min-h-[320px]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold flex items-center gap-2"><ChartIcon/> Grafik Pendapatan</h3>
            <span className="text-xs text-text-tertiary font-medium">6 Bulan Terakhir</span>
          </div>
          <div className="flex items-end gap-4 h-[200px] pt-5 max-sm:gap-2 max-sm:h-[160px]">
            {revenueData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full">
                <div className="flex-1 w-full flex items-end justify-center">
                  <div
                    className="w-full max-w-[48px] bg-gradient-to-br from-red-600 to-red-500 rounded-t-sm min-h-[4px] transition-all duration-300 relative cursor-pointer hover:opacity-85 hover:scale-x-110 group"
                    style={{ height: `${maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-text-primary text-bg-primary px-2 py-1 rounded-sm text-[10px] font-semibold whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100">
                      {formatCurrency(d.revenue)}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-text-tertiary font-semibold">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card flex flex-col gap-3">
          <h3 className="text-base font-bold flex items-center gap-2 mb-2"><FlashIcon/> Aksi Cepat</h3>
          <div className="flex flex-col gap-2.5 flex-1">
            <Link href="/invoices/create" className="flex items-center gap-3.5 px-4 py-3.5 rounded-md bg-bg-secondary border border-border-light text-sm font-medium text-text-primary transition-all duration-150 cursor-pointer hover:bg-bg-hover hover:border-red-200 hover:translate-x-1">
              <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)', color: '#fff' }}><GoogleDocIcon/></div>
              <span>Buat Invoice Baru</span>
            </Link>
            <Link href="/payments/create" className="flex items-center gap-3.5 px-4 py-3.5 rounded-md bg-bg-secondary border border-border-light text-sm font-medium text-text-primary transition-all duration-150 cursor-pointer hover:bg-bg-hover hover:border-red-200 hover:translate-x-1">
              <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', color: '#fff' }}><Payment01Icon/></div>
              <span>Buat Payment Link</span>
            </Link>
            <Link href="/clients/create" className="flex items-center gap-3.5 px-4 py-3.5 rounded-md bg-bg-secondary border border-border-light text-sm font-medium text-text-primary transition-all duration-150 cursor-pointer hover:bg-bg-hover hover:border-red-200 hover:translate-x-1">
              <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #059669, #34D399)', color: '#fff' }}><UserGroup02Icon/></div>
              <span>Tambah Klien</span>
            </Link>
            <Link href="/settings" className="flex items-center gap-3.5 px-4 py-3.5 rounded-md bg-bg-secondary border border-border-light text-sm font-medium text-text-primary transition-all duration-150 cursor-pointer hover:bg-bg-hover hover:border-red-200 hover:translate-x-1">
              <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #D97706, #FBBF24)', color: '#fff' }}><Settings01Icon/></div>
              <span>Pengaturan</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Usage Indicator */}
      <UsageIndicator />

      {/* Recent Invoices */}
      <div className="card my-6 border-none">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold flex items-center gap-2"><GoogleDocIcon/> Invoice Terbaru</h3>
          <Link href="/invoices" className="text-[13px] text-red-600 font-semibold transition-colors duration-150 hover:text-red-700">Lihat Semua →</Link>
        </div>
        <div className="table-container border-none">
          <table className="table">
            <thead>
              <tr>
                <th>No. Invoice</th>
                <th>Klien</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-text-secondary p-6">
                    Belum ada invoice. <Link href="/invoices/create" className="text-primary">Buat invoice pertama →</Link>
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link href={`/invoices/${inv.id}`} className="table-link">
                        {inv.number}
                      </Link>
                    </td>
                    <td>{inv.client_name}</td>
                    <td className="font-semibold">{formatCurrency(inv.total, inv.currency)}</td>
                    <td>
                      <span className={`badge ${getStatusColor(inv.status)}`}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-text-secondary">{formatDate(inv.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
