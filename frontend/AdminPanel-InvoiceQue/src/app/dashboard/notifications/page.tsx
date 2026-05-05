'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, RefreshCw, Mail, CheckCircle, XCircle, Clock, Search,
  Crown, UserPlus, AlertTriangle, Filter,
} from 'lucide-react';
import { notificationsApi, subscriptionsApi, usersApi, type NotificationLog, type SubscriptionTransaction, type User } from '@/lib/api';
import { formatRelative, formatDateTime, formatCurrency, getStatusColor } from '@/lib/utils';

// Admin-relevant notification types
const ADMIN_TYPES = ['subscription.paid', 'subscription.created', 'subscription.expired', 'subscription.failed'];

// Map notification types to human-readable labels & icons
const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'subscription.paid': { label: 'Subscription Paid', icon: <Crown className="w-5 h-5 text-emerald-400" />, color: 'bg-emerald-500/10' },
  'subscription.created': { label: 'Checkout Dibuat', icon: <Crown className="w-5 h-5 text-violet-400" />, color: 'bg-violet-500/10' },
  'subscription.expired': { label: 'Subscription Expired', icon: <AlertTriangle className="w-5 h-5 text-amber-400" />, color: 'bg-amber-500/10' },
  'subscription.failed': { label: 'Pembayaran Gagal', icon: <XCircle className="w-5 h-5 text-rose-400" />, color: 'bg-rose-500/10' },
  'user.registered': { label: 'User Baru', icon: <UserPlus className="w-5 h-5 text-sky-400" />, color: 'bg-sky-500/10' },
};

interface AdminEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  amount?: number;
  user_name?: string;
  user_email?: string;
  created_at: string;
}

export default function NotificationsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [emailLogs, setEmailLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'events' | 'emails'>('events');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, usersRes, notifsRes] = await Promise.allSettled([
        subscriptionsApi.getTransactions(),
        usersApi.list('', 1, 500),
        notificationsApi.list(),
      ]);

      // Build users map
      const usersMap: Record<string, User> = {};
      if (usersRes.status === 'fulfilled') {
        (usersRes.value.data || []).forEach(u => { usersMap[u.id] = u; });
      }

      // Build admin events from subscription transactions
      const adminEvents: AdminEvent[] = [];
      if (txRes.status === 'fulfilled') {
        (txRes.value.data || []).forEach(tx => {
          const user = usersMap[tx.user_id];
          const planName = tx.plan_id.replace('plan_', '').toUpperCase();
          const type = tx.status === 'paid' ? 'subscription.paid' :
                       tx.status === 'pending' ? 'subscription.created' :
                       tx.status === 'expired' ? 'subscription.expired' : 'subscription.failed';

          adminEvents.push({
            id: tx.id,
            type,
            title: tx.status === 'paid' ? `Pembayaran ${planName} berhasil` :
                   tx.status === 'pending' ? `Checkout ${planName} dibuat` :
                   tx.status === 'expired' ? `Subscription ${planName} expired` :
                   `Pembayaran ${planName} gagal`,
            description: `${user?.name || tx.user_id.slice(0, 8)} — ${formatCurrency(tx.amount)}`,
            status: tx.status,
            amount: tx.amount,
            user_name: user?.name,
            user_email: user?.email,
            created_at: tx.created_at,
          });
        });
      }

      // Add recent user registrations as events
      if (usersRes.status === 'fulfilled') {
        const recent = (usersRes.value.data || []).slice(0, 10);
        recent.forEach(u => {
          adminEvents.push({
            id: `user_${u.id}`,
            type: 'user.registered',
            title: `User baru terdaftar`,
            description: `${u.name} (${u.email})`,
            status: 'success',
            user_name: u.name,
            user_email: u.email,
            created_at: u.created_at,
          });
        });
      }

      // Sort by date descending
      adminEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setEvents(adminEvents);

      // Email logs (only subscription-related, exclude invoice & payment)
      if (notifsRes.status === 'fulfilled') {
        const logs = notifsRes.value.data || [];
        const adminLogs = logs.filter(n => {
          const t = (n.type || '').toLowerCase();
          // Exclude user-level notifications (invoice & payment)
          if (t.includes('invoice') || t.includes('payment')) return false;
          return true;
        });
        setEmailLogs(adminLogs);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const eventTypes = [...new Set(events.map(e => e.type))];

  const filteredEvents = events.filter(e => {
    if (typeFilter && e.type !== typeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return e.title.toLowerCase().includes(q) ||
           e.description.toLowerCase().includes(q) ||
           e.user_email?.toLowerCase().includes(q);
  });

  const filteredEmails = emailLogs.filter(n => {
    if (!search) return true;
    const q = search.toLowerCase();
    return n.recipient?.toLowerCase().includes(q) || n.subject?.toLowerCase().includes(q);
  });

  const statusIcon = (status: string) => {
    if (status === 'delivered' || status === 'success' || status === 'paid') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-rose-400" />;
    return <Clock className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-rose-400" />
            </div>
            Notifikasi Admin
          </h1>
          <p className="text-sm text-zinc-500 mt-1 ml-[52px]">Event & log yang relevan untuk admin SaaS</p>
        </div>
        <button onClick={loadData} className="btn-ghost">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Subscription Paid</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{events.filter(e => e.type === 'subscription.paid').length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Pending</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{events.filter(e => e.type === 'subscription.created').length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">User Baru</p>
          <p className="text-2xl font-bold text-sky-400 mt-1">{events.filter(e => e.type === 'user.registered').length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Email Terkirim</p>
          <p className="text-2xl font-bold text-white mt-1">{emailLogs.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        <button onClick={() => setTab('events')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === 'events' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'text-zinc-500 hover:text-zinc-300'
          }`}>
          Aktivitas ({events.length})
        </button>
        <button onClick={() => setTab('emails')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            tab === 'emails' ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'text-zinc-500 hover:text-zinc-300'
          }`}>
          Email Log ({emailLogs.length})
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/[0.04] glass-card-hover rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              className="admin-input pl-11" placeholder={tab === 'events' ? 'Cari aktivitas...' : 'Cari email atau subject...'} />
          </div>
          {tab === 'events' && eventTypes.length > 0 && (
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="admin-input max-w-[200px] appearance-none cursor-pointer">
              <option value="">Semua Tipe</option>
              {eventTypes.map(t => (
                <option key={t} value={t}>{typeConfig[t]?.label || t}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />) :
          tab === 'events' ? (
            filteredEvents.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Bell className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">Belum ada aktivitas</p>
              </div>
            ) : filteredEvents.map(e => {
              const config = typeConfig[e.type] || { label: e.type, icon: <Bell className="w-5 h-5 text-zinc-500" />, color: 'bg-white/[0.03]' };
              return (
                <div key={e.id} className="bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/[0.04] glass-card-hover rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center shrink-0 mt-0.5`}>
                      {config.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-200">{e.title}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{e.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {statusIcon(e.status)}
                          <span className={`status-badge text-[10px] ${getStatusColor(e.status)}`}>{e.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-zinc-500 font-mono">{config.label}</span>
                        <span className="text-[10px] text-zinc-600">{e.created_at ? formatRelative(e.created_at) : '-'}</span>
                        {e.amount && <span className="text-[10px] font-semibold text-zinc-400">{formatCurrency(e.amount)}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            filteredEmails.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Mail className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">Tidak ada email log</p>
              </div>
            ) : filteredEmails.map(n => (
              <div key={n.id} className="bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/[0.04] glass-card-hover rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-200 truncate">{n.subject}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">To: {n.recipient}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {statusIcon(n.status)}
                        <span className={`status-badge text-[10px] ${getStatusColor(n.status)}`}>{n.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-zinc-500 font-mono">{n.type}</span>
                      <span className="text-[10px] text-zinc-600">{formatRelative(n.created_at)}</span>
                      {n.is_read && <span className="text-[10px] text-emerald-500">✓ Dibaca</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )
        }
      </div>
    </div>
  );
}
