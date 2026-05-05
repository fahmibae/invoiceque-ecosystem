'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Crown, TrendingUp, TrendingDown,
  ArrowUpRight, DollarSign, Activity, Clock,
  RefreshCw, Receipt, Check, XCircle, UserCheck, UserX,
} from 'lucide-react';
import { formatCurrency, formatDateTime, getStatusColor, formatRelative } from '@/lib/utils';
import {
  usersApi, subscriptionsApi,
  type User, type Subscription, type SubscriptionTransaction,
} from '@/lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const PIE_COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#f43f5e'];

export default function DashboardPage() {
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<SubscriptionTransaction[]>([]);
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [planDistribution, setPlanDistribution] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [usersRes, txRes, subsRes] = await Promise.allSettled([
        usersApi.list('', 1, 10),
        subscriptionsApi.getTransactions(),
        subscriptionsApi.listAll(),
      ]);

      if (usersRes.status === 'fulfilled') {
        setTotalUsers(usersRes.value.total || 0);
        setRecentUsers((usersRes.value.data || []).slice(0, 5));
      }
      if (txRes.status === 'fulfilled') {
        setRecentTransactions((txRes.value.data || []).slice(0, 5));
      }
      if (subsRes.status === 'fulfilled') {
        const subs = subsRes.value.data || [];
        setAllSubscriptions(subs);

        // Calculate plan distribution
        const dist: Record<string, number> = {};
        subs.forEach(s => {
          const name = s.plan?.display_name || 'Free';
          dist[name] = (dist[name] || 0) + 1;
        });
        setPlanDistribution(Object.entries(dist).map(([name, value]) => ({ name, value })));
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Computed stats
  const paidSubscribers = allSubscriptions.filter(s => s.plan?.name !== 'free' && s.plan?.name).length;
  const freeUsers = allSubscriptions.filter(s => s.plan?.name === 'free').length;
  const subscriptionRevenue = recentTransactions
    .filter(t => t.status === 'paid')
    .reduce((a, t) => a + t.amount, 0);
  const pendingTransactions = recentTransactions.filter(t => t.status === 'pending').length;
  const paidTransactions = recentTransactions.filter(t => t.status === 'paid').length;
  const proUsers = allSubscriptions.filter(s => s.plan?.name === 'pro').length;
  const enterpriseUsers = allSubscriptions.filter(s => s.plan?.name === 'enterprise').length;

  if (loading) {
    return (
      <div className="page-enter space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="skeleton h-8 w-48 mb-2" />
            <div className="skeleton h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 skeleton h-80 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: totalUsers,
      icon: Users,
      glow: 'stat-glow-violet',
      gradient: 'gradient-text',
      sub: `${paidSubscribers} berbayar`,
    },
    {
      label: 'Subscription Revenue',
      value: formatCurrency(subscriptionRevenue),
      icon: DollarSign,
      glow: 'stat-glow-emerald',
      gradient: 'gradient-text-emerald',
      sub: `${paidTransactions} transaksi lunas`,
    },
    {
      label: 'Active Subscribers',
      value: paidSubscribers,
      icon: Crown,
      glow: 'stat-glow-amber',
      gradient: 'gradient-text-amber',
      sub: `${proUsers} Pro · ${enterpriseUsers} Enterprise`,
    },
    {
      label: 'Free Users',
      value: freeUsers,
      icon: UserCheck,
      glow: 'stat-glow-sky',
      gradient: 'gradient-text',
      sub: 'Pengguna paket gratis',
    },
  ];

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Overview ekosistem InvoiceQu</p>
        </div>
        <button onClick={handleRefresh} className="btn-ghost" disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className={`bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/[0.04] glass-card-hover rounded-xl p-5 ${card.glow}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                <card.icon className="w-5 h-5 text-zinc-400" />
              </div>
            </div>
            <p className={`text-2xl font-bold ${card.gradient}`}>
              {typeof card.value === 'number' ? card.value.toLocaleString('id-ID') : card.value}
            </p>
            <p className="text-xs text-zinc-500 mt-1">{card.label}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Subscription Revenue Per Transaction (timeline) */}
        <div className="xl:col-span-2 bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 p-6 border border-white/[0.04] glass-card-hover rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Transaksi Subscription</h3>
              <p className="text-xs text-zinc-500 mt-1">Riwayat pembayaran berlangganan</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="pulse-dot text-emerald-400 bg-emerald-400" />
              <span className="text-xs text-zinc-500">Paid</span>
            </div>
          </div>
          <div className="h-[280px]">
            {recentTransactions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                Belum ada data transaksi
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={recentTransactions.filter(t => t.status === 'paid').slice(0, 20).reverse().map((t, i) => ({
                    idx: `#${i + 1}`,
                    amount: t.amount,
                    plan: t.plan_id.replace('plan_', '').toUpperCase(),
                  }))}
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="idx" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 13, color: '#e4e4e7' }}
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Amount']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fill="url(#revenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/[0.04] glass-card-hover rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-1">Distribusi Paket</h3>
          <p className="text-xs text-zinc-500 mb-6">Sebaran user per paket langganan</p>
          <div className="h-[200px]">
            {planDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                Belum ada data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {planDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 13, color: '#e4e4e7' }}
                    formatter={(value: any, name: any) => [`${value} users`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-2 mt-4">
            {planDistribution.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-zinc-400">{item.name}</span>
                </div>
                <span className="text-xs font-semibold text-zinc-300">{item.value} users</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Users */}
        <div className="bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/[0.04] glass-card-hover rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">User Terbaru</h3>
              <p className="text-xs text-zinc-500 mt-1">Registrasi terkini</p>
            </div>
            <a href="/dashboard/users" className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
              Lihat Semua <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-8">Belum ada data user</p>
            ) : (
              recentUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10
                    border border-red-500/20 flex items-center justify-center text-xs font-bold text-red-300">
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200 truncate">{u.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`status-badge text-[10px] ${u.role === 'admin' ? 'bg-red-500/15 text-red-400 border-red-500/20' : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'}`}>
                      {u.role}
                    </span>
                    <p className="text-[10px] text-zinc-600 mt-1">{u.created_at ? formatRelative(u.created_at) : ''}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Subscription Transactions */}
        <div className="bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/[0.04] glass-card-hover rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Transaksi Subscription Terbaru</h3>
              <p className="text-xs text-zinc-500 mt-1">Pembayaran berlangganan terkini</p>
            </div>
            <a href="/dashboard/subscriptions/transactions" className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
              Lihat Semua <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-8">Belum ada transaksi subscription</p>
            ) : (
              recentTransactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tx.status === 'paid' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                      tx.status === 'pending' ? 'bg-amber-500/10 border border-amber-500/20' :
                        'bg-rose-500/10 border border-rose-500/20'
                    }`}>
                    {tx.status === 'paid' ? <Check className="w-4 h-4 text-emerald-400" /> :
                      tx.status === 'pending' ? <Clock className="w-4 h-4 text-amber-400" /> :
                        <XCircle className="w-4 h-4 text-rose-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200 truncate">{tx.plan_id.replace('plan_', '').toUpperCase()}</p>
                    <p className="text-xs text-zinc-500 truncate">{tx.created_at ? formatDateTime(tx.created_at) : '-'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-zinc-200">{formatCurrency(tx.amount)}</p>
                    <span className={`status-badge text-[10px] ${getStatusColor(tx.status)}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Admin Stats Bar */}
      <div className="bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/[0.04] glass-card-hover rounded-xl p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{paidTransactions}</p>
              <p className="text-[11px] text-zinc-500">Transaksi Lunas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{pendingTransactions}</p>
              <p className="text-[11px] text-zinc-500">Transaksi Pending</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{proUsers}</p>
              <p className="text-[11px] text-zinc-500">Pro Users</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{enterpriseUsers}</p>
              <p className="text-[11px] text-zinc-500">Enterprise Users</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
