'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Receipt, RefreshCw, Crown, ArrowUpRight,
  Check, Clock, XCircle, AlertTriangle,
} from 'lucide-react';
import { subscriptionsApi, usersApi, type Subscription, type SubscriptionTransaction, type User } from '@/lib/api';
import { formatCurrency, formatDateTime, formatRelative, getStatusColor } from '@/lib/utils';

export default function TransactionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [transactions, setTransactions] = useState<SubscriptionTransaction[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'subscriptions' | 'transactions'>('subscriptions');

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [subsRes, txRes, usersRes] = await Promise.allSettled([
        subscriptionsApi.listAll(),
        subscriptionsApi.getTransactions(),
        usersApi.list('', 1, 500),
      ]);

      if (subsRes.status === 'fulfilled') setSubscriptions(subsRes.value.data || []);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.data || []);

      // Build users map
      if (usersRes.status === 'fulfilled') {
        const map: Record<string, User> = {};
        (usersRes.value.data || []).forEach(u => { map[u.id] = u; });
        setUsersMap(map);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getUser = (userId: string) => usersMap[userId];

  const statusIcon = (status: string) => {
    switch (status) {
      case 'paid': case 'active': return <Check className="w-3.5 h-3.5" />;
      case 'pending': return <Clock className="w-3.5 h-3.5" />;
      case 'expired': return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'failed': return <XCircle className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const planBadge = (planName: string) => {
    const colors: Record<string, string> = {
      free: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
      pro: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
      enterprise: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    };
    return colors[planName] || colors.free;
  };

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/dashboard/subscriptions" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Subscriptions
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-emerald-400" />
            </div>
            Transaksi Berlangganan
          </h1>
          <p className="text-sm text-zinc-500 mt-1 ml-[52px]">Monitor semua subscription dan transaksi users</p>
        </div>
        <button onClick={loadData} disabled={refreshing} className="btn-ghost">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Total Users</p>
          <p className="text-2xl font-bold text-white mt-1">{subscriptions.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Pro Users</p>
          <p className="text-2xl font-bold text-violet-400 mt-1">
            {subscriptions.filter(s => s.plan?.name === 'pro').length}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Total Transaksi</p>
          <p className="text-2xl font-bold text-white mt-1">{transactions.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Revenue</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {formatCurrency(transactions.filter(t => t.status === 'paid').reduce((a, t) => a + t.amount, 0))}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        <button
          onClick={() => setTab('subscriptions')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === 'subscriptions' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Subscriptions ({subscriptions.length})
        </button>
        <button
          onClick={() => setTab('transactions')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === 'transactions' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Transaksi ({transactions.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : tab === 'subscriptions' ? (
        /* ── Subscriptions Table ── */
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Paket</th>
                  <th>Status</th>
                  <th>Invoice Used</th>
                  <th>Client Used</th>
                  <th>Payment Links</th>
                  <th>Terdaftar</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-zinc-500 text-sm">Belum ada subscription</td></tr>
                ) : subscriptions.map(sub => {
                  const user = getUser(sub.user_id);
                  return (
                    <tr key={sub.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {user?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.name || sub.user_id.slice(0, 8)}</p>
                            <p className="text-[11px] text-zinc-500 truncate">{user?.email || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${planBadge(sub.plan?.name || 'free')}`}>
                          <Crown className="w-3 h-3 mr-1" />
                          {sub.plan?.display_name || 'Free'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusColor(sub.status)}`}>
                          {statusIcon(sub.status)} <span className="ml-1">{sub.status}</span>
                        </span>
                      </td>
                      <td className="text-zinc-300 font-mono text-xs">
                        {sub.invoices_used}/{sub.plan?.max_invoices === -1 ? '∞' : sub.plan?.max_invoices || 0}
                      </td>
                      <td className="text-zinc-300 font-mono text-xs">
                        {sub.clients_used}/{sub.plan?.max_clients === -1 ? '∞' : sub.plan?.max_clients || 0}
                      </td>
                      <td className="text-zinc-300 font-mono text-xs">
                        {sub.payment_links_used}/{sub.plan?.max_payment_links === -1 ? '∞' : sub.plan?.max_payment_links || 0}
                      </td>
                      <td className="text-zinc-500 text-xs">{sub.created_at ? formatRelative(sub.created_at) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Transactions Table ── */
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>External ID</th>
                  <th>Tanggal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-zinc-500 text-sm">Belum ada transaksi</td></tr>
                ) : transactions.map(tx => {
                  const user = getUser(tx.user_id);
                  return (
                    <tr key={tx.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {user?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.name || tx.user_id.slice(0, 8)}</p>
                            <p className="text-[11px] text-zinc-500 truncate">{user?.email || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-zinc-400 font-mono">{tx.plan_id}</span>
                      </td>
                      <td className="font-semibold text-white">{formatCurrency(tx.amount)}</td>
                      <td>
                        <span className={`status-badge ${getStatusColor(tx.status)}`}>
                          {statusIcon(tx.status)} <span className="ml-1">{tx.status}</span>
                        </span>
                      </td>
                      <td className="text-zinc-500 text-xs font-mono truncate max-w-[150px]">{tx.external_id || '-'}</td>
                      <td className="text-zinc-500 text-xs">{tx.created_at ? formatDateTime(tx.created_at) : '-'}</td>
                      <td>
                        {tx.checkout_url && (
                          <a href={tx.checkout_url} target="_blank" rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-red-400 transition-colors">
                            <ArrowUpRight className="w-4 h-4" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
