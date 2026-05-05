'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Crown, RefreshCw, Check, X as XIcon, Zap, Infinity, Sparkles, Receipt, Pencil, Save, ToggleLeft, ToggleRight, Plus, Trash2 } from 'lucide-react';
import { subscriptionsApi, type SubscriptionPlan } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const ALL_FEATURES = [
  { key: 'basic_invoicing', label: 'Invoicing Dasar' },
  { key: 'email_notifications', label: 'Notifikasi Email' },
  { key: 'custom_branding', label: 'Custom Branding' },
  { key: 'priority_support', label: 'Prioritas Support' },
  { key: 'xendit_integration', label: 'Integrasi Xendit' },
  { key: 'api_access', label: 'API Access' },
  { key: 'dedicated_support', label: 'Dedicated Support' },
  { key: 'sla', label: 'SLA Agreement' },
];

const planColors: Record<string, { gradient: string; border: string; icon: string; accent: string }> = {
  free: { gradient: 'from-zinc-600/20 to-zinc-700/20', border: 'border-zinc-500/20', icon: 'text-zinc-400', accent: 'zinc' },
  pro: { gradient: 'from-violet-600/20 to-indigo-600/20', border: 'border-violet-500/20', icon: 'text-violet-400', accent: 'violet' },
  enterprise: { gradient: 'from-amber-600/20 to-orange-600/20', border: 'border-amber-500/20', icon: 'text-amber-400', accent: 'amber' },
};

interface EditForm {
  display_name: string;
  price: number;
  billing_period: string;
  max_invoices: number;
  max_clients: number;
  max_payment_links: number;
  features: string[];
  is_active: boolean;
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes] = await Promise.allSettled([subscriptionsApi.getPlans()]);
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const parseFeatures = (features: string): string[] => {
    try { return JSON.parse(features); } catch { return []; }
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setEditForm({
      display_name: plan.display_name,
      price: plan.price,
      billing_period: plan.billing_period,
      max_invoices: plan.max_invoices,
      max_clients: plan.max_clients,
      max_payment_links: plan.max_payment_links,
      features: parseFeatures(plan.features),
      is_active: plan.is_active,
    });
  };

  const closeEditModal = () => {
    setEditingPlan(null);
    setEditForm(null);
  };

  const toggleFeature = (featureKey: string) => {
    if (!editForm) return;
    const features = editForm.features.includes(featureKey)
      ? editForm.features.filter(f => f !== featureKey)
      : [...editForm.features, featureKey];
    setEditForm({ ...editForm, features });
  };

  const handleSave = async () => {
    if (!editingPlan || !editForm) return;
    setSaving(true);
    try {
      await subscriptionsApi.updatePlan(editingPlan.id, {
        display_name: editForm.display_name,
        price: editForm.price,
        billing_period: editForm.billing_period,
        max_invoices: editForm.max_invoices,
        max_clients: editForm.max_clients,
        max_payment_links: editForm.max_payment_links,
        features: JSON.stringify(editForm.features),
        is_active: editForm.is_active,
      });
      setToast({ message: `Plan "${editForm.display_name}" berhasil diupdate!`, type: 'success' });
      closeEditModal();
      await loadData();
    } catch (err) {
      setToast({ message: `Gagal update plan: ${err instanceof Error ? err.message : 'Unknown error'}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const featureLabels: Record<string, string> = Object.fromEntries(ALL_FEATURES.map(f => [f.key, f.label]));

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            Subscriptions
          </h1>
          <p className="text-sm text-zinc-500 mt-1 ml-[52px]">Kelola paket langganan & konfigurasi fitur</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/subscriptions/enterprise" className="btn-primary text-xs py-2 px-4">
            <Sparkles className="w-4 h-4" /> Enterprise Link
          </Link>
          <Link href="/dashboard/subscriptions/transactions" className="btn-ghost text-xs">
            <Receipt className="w-4 h-4" /> Transaksi
          </Link>
          <button onClick={loadData} className="btn-ghost">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-[400px] rounded-2xl" />) :
          plans.map(plan => {
            const colors = planColors[plan.name] || planColors.free;
            const features = parseFeatures(plan.features);
            return (
              <div key={plan.id} className={`bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/[0.04] glass-card-hover rounded-xl p-6 border ${colors.border} relative overflow-hidden group`}>
                {plan.name === 'pro' && (
                  <div className="absolute top-4 right-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">Popular</span>
                  </div>
                )}

                {/* Edit Button */}
                <button
                  onClick={() => openEditModal(plan)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white"
                  style={plan.name === 'pro' ? { right: '5.5rem' } : {}}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>

                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-4`}>
                  <Crown className={`w-6 h-6 ${colors.icon}`} />
                </div>

                <h3 className="text-lg font-bold text-white">{plan.display_name}</h3>
                <div className="flex items-baseline gap-1 mt-2 mb-6">
                  <span className="text-3xl font-bold text-white">{plan.price === 0 || plan.name === 'free' ? 'Gratis' : formatCurrency(plan.price)}</span>
                  {plan.price > 0 && <span className="text-sm text-zinc-500">/{plan.billing_period}</span>}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                    <span className="text-xs text-zinc-400">Max Invoices</span>
                    <span className="text-sm font-bold text-zinc-200">{plan.max_invoices === -1 ? <Infinity className="w-4 h-4" /> : plan.max_invoices}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                    <span className="text-xs text-zinc-400">Max Clients</span>
                    <span className="text-sm font-bold text-zinc-200">{plan.max_clients === -1 ? <Infinity className="w-4 h-4" /> : plan.max_clients}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                    <span className="text-xs text-zinc-400">Max Payment Links</span>
                    <span className="text-sm font-bold text-zinc-200">{plan.max_payment_links === -1 ? <Infinity className="w-4 h-4" /> : plan.max_payment_links}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Features</p>
                  {features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs text-zinc-300">{featureLabels[f] || f}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${plan.is_active ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                    <span className="text-xs text-zinc-400">{plan.is_active ? 'Aktif' : 'Nonaktif'}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 font-mono mt-2">ID: {plan.id}</p>
                </div>
              </div>
            );
          })
        }
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-br from-red-400/10 via-red-500/10 to-red-800/10 border border-white/[0.04] glass-card-hover rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Informasi Subscription</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Data subscription dikelola oleh <span className="text-violet-400 font-semibold">subscription-service</span> dan terintegrasi
              dengan payment gateway Xendit untuk proses checkout otomatis. Setiap user yang baru registrasi akan otomatis mendapatkan
              paket <span className="text-zinc-300 font-semibold">Free</span>. Klik ikon <Pencil className="w-3 h-3 inline text-zinc-400" /> pada kartu plan untuk mengubah konfigurasi harga, limit, dan fitur.
            </p>
          </div>
        </div>
      </div>

      {/* ── Edit Plan Modal ─────────────────────────────── */}
      {editingPlan && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={closeEditModal}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-lg bg-[#141418] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${(planColors[editingPlan.name] || planColors.free).gradient} flex items-center justify-center`}>
                  <Crown className={`w-5 h-5 ${(planColors[editingPlan.name] || planColors.free).icon}`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Edit Plan</h2>
                  <p className="text-xs text-zinc-500">{editingPlan.name.toUpperCase()} — {editingPlan.id}</p>
                </div>
              </div>
              <button onClick={closeEditModal} className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto custom-scrollbar">
              {/* Display Name & Status */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Nama Tampilan</label>
                  <input
                    type="text"
                    value={editForm.display_name}
                    onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  />
                </div>
                <div className="w-28">
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Status</label>
                  <button
                    onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${editForm.is_active
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500'
                      }`}
                  >
                    {editForm.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {editForm.is_active ? 'Aktif' : 'Off'}
                  </button>
                </div>
              </div>

              {/* Price & Billing Period */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Harga (IDR)</label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Billing Period</label>
                  <select
                    value={editForm.billing_period}
                    onChange={(e) => setEditForm({ ...editForm, billing_period: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all appearance-none"
                  >
                    <option value="monthly" className="bg-[#141418]">Monthly</option>
                    <option value="yearly" className="bg-[#141418]">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Limits */}
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-3 block">Limits <span className="text-zinc-600">(-1 = unlimited)</span></label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-500 mb-1 block uppercase tracking-wider">Invoices</label>
                    <input
                      type="number"
                      value={editForm.max_invoices}
                      onChange={(e) => setEditForm({ ...editForm, max_invoices: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white text-center focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 mb-1 block uppercase tracking-wider">Clients</label>
                    <input
                      type="number"
                      value={editForm.max_clients}
                      onChange={(e) => setEditForm({ ...editForm, max_clients: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white text-center focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 mb-1 block uppercase tracking-wider">Pay Links</label>
                    <input
                      type="number"
                      value={editForm.max_payment_links}
                      onChange={(e) => setEditForm({ ...editForm, max_payment_links: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white text-center focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Features Toggle */}
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-3 block">Fitur yang Tersedia</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_FEATURES.map(feature => {
                    const isEnabled = editForm.features.includes(feature.key);
                    return (
                      <button
                        key={feature.key}
                        onClick={() => toggleFeature(feature.key)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left text-xs transition-all duration-200 ${isEnabled
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                            : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.1]'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-all ${isEnabled ? 'bg-emerald-500/30' : 'bg-white/[0.04]'}`}>
                          {isEnabled && <Check className="w-3 h-3 text-emerald-400" />}
                        </div>
                        <span className="truncate">{feature.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/[0.06]">
              <button
                onClick={closeEditModal}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-semibold text-white hover:shadow-lg hover:shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 ${toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <XIcon className="w-4 h-4" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 p-1 rounded hover:bg-white/10 transition-colors">
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
