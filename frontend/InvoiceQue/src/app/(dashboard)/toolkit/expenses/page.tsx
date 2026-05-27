'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft01Icon, Add01Icon, Delete02Icon, Search01Icon,
  Loading03Icon, Calendar03Icon, Tag01Icon, FilterIcon,
  MoneyReceiveSquareIcon, PercentSquareIcon, ArrowUp01Icon, ArrowDown01Icon,
  Edit02Icon, Cancel01Icon, CheckmarkCircle02Icon, MoreVerticalIcon,
} from 'hugeicons-react';
import Portal from '@/components/ui/Portal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { expenseApi, type Expense, type CreateExpenseRequest, type ExpenseStats, type ExpenseCategory } from '@/lib/api';

const CATEGORY_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  software: { label: 'Software', emoji: '💻', color: '#3B82F6' },
  hardware: { label: 'Hardware', emoji: '🖥️', color: '#6366F1' },
  internet: { label: 'Internet', emoji: '🌐', color: '#06B6D4' },
  hosting: { label: 'Hosting', emoji: '☁️', color: '#8B5CF6' },
  domain: { label: 'Domain', emoji: '🔗', color: '#A855F7' },
  subscription: { label: 'Subscription', emoji: '🔄', color: '#EC4899' },
  coworking: { label: 'Coworking', emoji: '🏢', color: '#F59E0B' },
  travel: { label: 'Travel', emoji: '✈️', color: '#EF4444' },
  food: { label: 'Food & Drink', emoji: '🍔', color: '#F97316' },
  office_supplies: { label: 'Office Supplies', emoji: '📎', color: '#84CC16' },
  marketing: { label: 'Marketing', emoji: '📢', color: '#10B981' },
  education: { label: 'Education', emoji: '📚', color: '#14B8A6' },
  insurance: { label: 'Insurance', emoji: '🛡️', color: '#6B7280' },
  tax: { label: 'Tax', emoji: '🏛️', color: '#78716C' },
  contractor: { label: 'Contractor', emoji: '👥', color: '#0EA5E9' },
  communication: { label: 'Communication', emoji: '📱', color: '#D946EF' },
  utilities: { label: 'Utilities', emoji: '⚡', color: '#FBBF24' },
  other: { label: 'Other', emoji: '📦', color: '#9CA3AF' },
};

function formatCurrency(amount: number, currency = 'IDR') {
  if (currency === 'IDR') return `Rp ${amount.toLocaleString('id-ID')}`;
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export default function ExpenseTrackerPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<CreateExpenseRequest>({
    title: '',
    amount: 0,
    category: 'other',
    description: '',
    currency: 'IDR',
    expense_date: new Date().toISOString().split('T')[0],
    is_tax_deductible: false,
    is_recurring: false,
    recurring_interval: '',
    tags: [],
  });

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await expenseApi.list({
        search: search || undefined,
        category: categoryFilter as ExpenseCategory || undefined,
        per_page: 50,
      });
      setExpenses(res.data || []);
    } catch { /* ignore */ }
  }, [search, categoryFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const s = await expenseApi.stats();
      setStats(s);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchExpenses(), fetchStats()]).finally(() => setLoading(false));
  }, [fetchExpenses, fetchStats]);

  const resetForm = () => {
    setForm({
      title: '', amount: 0, category: 'other', description: '', currency: 'IDR',
      expense_date: new Date().toISOString().split('T')[0],
      is_tax_deductible: false, is_recurring: false, recurring_interval: '', tags: [],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (exp: Expense) => {
    setForm({
      title: exp.title,
      amount: exp.amount,
      category: exp.category,
      description: exp.description,
      currency: exp.currency,
      expense_date: exp.expense_date?.split('T')[0] || '',
      is_tax_deductible: exp.is_tax_deductible,
      is_recurring: exp.is_recurring,
      recurring_interval: exp.recurring_interval,
      tags: exp.tags || [],
    });
    setEditingId(exp.id);
    setShowForm(true);
    setMenuOpen(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || form.amount <= 0) return;
    setSaving(true);
    try {
      if (editingId) {
        await expenseApi.update(editingId, form);
      } else {
        await expenseApi.create(form);
      }
      resetForm();
      fetchExpenses();
      fetchStats();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await expenseApi.delete(deleteTarget); fetchExpenses(); fetchStats(); } catch { /* ignore */ }
    setDeleteTarget(null);
    setShowDeleteModal(false);
  };

  const monthChange = stats
    ? stats.last_month > 0
      ? ((stats.this_month - stats.last_month) / stats.last_month) * 100
      : stats.this_month > 0 ? 100 : 0
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loading03Icon width={32} height={32} className="animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmModal isOpen={showDeleteModal} title="Hapus Expense" message="Data yang dihapus tidak bisa dikembalikan. Lanjutkan?" confirmText="Hapus" onConfirm={handleDelete} onCancel={() => { setShowDeleteModal(false); setDeleteTarget(null); }} type="danger" />

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-3">
            <Link href="/toolkit" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
              <ArrowLeft01Icon width={20} height={20} />
            </Link>
            <h1 className="page-title flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <MoneyReceiveSquareIcon width={22} height={22} />
              </span>
              Expense Tracker
            </h1>
          </div>
          <p className="page-subtitle">Track & categorize semua pengeluaran bisnis freelance kamu</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Add01Icon width={16} height={16} /> Tambah Expense
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-xs font-semibold text-text-tertiary mb-1">Total Expenses</div>
            <div className="text-xl font-extrabold text-text-primary">{formatCurrency(stats.total_amount)}</div>
            <div className="text-xs text-text-tertiary mt-1">{stats.total_count} transaksi</div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-semibold text-text-tertiary mb-1">Bulan Ini</div>
            <div className="text-xl font-extrabold text-text-primary">{formatCurrency(stats.this_month)}</div>
            <div className={`text-xs mt-1 flex items-center gap-1 ${monthChange >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {monthChange >= 0 ? <ArrowUp01Icon width={12} height={12} /> : <ArrowDown01Icon width={12} height={12} />}
              {Math.abs(monthChange).toFixed(0)}% vs bulan lalu
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-semibold text-text-tertiary mb-1">Tax Deductible</div>
            <div className="text-xl font-extrabold text-emerald-600">{formatCurrency(stats.tax_deductible_total)}</div>
            <div className="text-xs text-text-tertiary mt-1 flex items-center gap-1">
              <PercentSquareIcon width={12} height={12} /> Bisa dikurangkan pajak
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-semibold text-text-tertiary mb-1">Kategori Terbesar</div>
            {stats.by_category.length > 0 ? (
              <>
                <div className="text-xl font-extrabold text-text-primary">
                  {CATEGORY_LABELS[stats.by_category[0].category]?.emoji} {CATEGORY_LABELS[stats.by_category[0].category]?.label || stats.by_category[0].category}
                </div>
                <div className="text-xs text-text-tertiary mt-1">{formatCurrency(stats.by_category[0].total)}</div>
              </>
            ) : (
              <div className="text-sm text-text-tertiary">Belum ada data</div>
            )}
          </div>
        </div>
      )}

      {/* Category Breakdown Bar */}
      {stats && stats.by_category.length > 0 && (
        <div className="card p-4 mb-6">
          <div className="text-sm font-bold text-text-primary mb-3">Breakdown by Category</div>
          <div className="flex rounded-full overflow-hidden h-3 mb-3">
            {stats.by_category.map((cat) => {
              const pct = stats.total_amount > 0 ? (cat.total / stats.total_amount) * 100 : 0;
              const catInfo = CATEGORY_LABELS[cat.category] || CATEGORY_LABELS.other;
              return (
                <div
                  key={cat.category}
                  title={`${catInfo.label}: ${formatCurrency(cat.total)} (${pct.toFixed(1)}%)`}
                  style={{ width: `${pct}%`, backgroundColor: catInfo.color, minWidth: pct > 0 ? '4px' : '0' }}
                  className="transition-all duration-300"
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            {stats.by_category.slice(0, 6).map((cat) => {
              const catInfo = CATEGORY_LABELS[cat.category] || CATEGORY_LABELS.other;
              return (
                <div key={cat.category} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catInfo.color }} />
                  <span className="text-text-tertiary">{catInfo.label}</span>
                  <span className="font-bold text-text-primary">{formatCurrency(cat.total)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search01Icon width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Cari expense..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="form-input"
        >
          <option value="">Semua Kategori</option>
          {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
            <option key={key} value={key}>{val.emoji} {val.label}</option>
          ))}
        </select>
      </div>

      {/* Expense List */}
      <div className="card">
        {expenses.length === 0 ? (
          <div className="p-12 text-center">
            <MoneyReceiveSquareIcon width={48} height={48} className="mx-auto text-text-tertiary mb-3 opacity-40" />
            <p className="text-text-tertiary font-medium">Belum ada pengeluaran</p>
            <p className="text-text-tertiary text-xs mt-1">Klik &quot;Tambah Expense&quot; untuk mulai tracking</p>
          </div>
        ) : (
          <div className="divide-y divide-border-light">
            {expenses.map((exp) => {
              const catInfo = CATEGORY_LABELS[exp.category] || CATEGORY_LABELS.other;
              return (
                <div key={exp.id} className="flex items-center gap-4 p-4 hover:bg-bg-hover/50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: `${catInfo.color}15` }}>
                    {catInfo.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text-primary truncate">{exp.title}</span>
                      {exp.is_tax_deductible && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">TAX</span>
                      )}
                      {exp.is_recurring && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">RECURRING</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-text-tertiary">{catInfo.label}</span>
                      {exp.expense_date && (
                        <span className="text-xs text-text-tertiary flex items-center gap-1">
                          <Calendar03Icon width={10} height={10} />
                          {new Date(exp.expense_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-sm text-red-500">-{formatCurrency(exp.amount, exp.currency)}</div>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      className="p-1.5 rounded-lg hover:bg-bg-secondary transition-colors opacity-0 group-hover:opacity-100"
                      onClick={() => setMenuOpen(menuOpen === exp.id ? null : exp.id)}
                    >
                      <MoreVerticalIcon width={16} height={16} />
                    </button>
                    {menuOpen === exp.id && (
                      <div className="absolute right-0 top-full mt-1 bg-bg-primary border border-border-color rounded-xl shadow-lg z-50 min-w-[140px] py-1">
                        <button className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2" onClick={() => openEdit(exp)}>
                          <Edit02Icon width={14} height={14} /> Edit
                        </button>
                        <button className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover text-red-500 flex items-center gap-2" onClick={() => { setDeleteTarget(exp.id); setShowDeleteModal(true); setMenuOpen(null); }}>
                          <Delete02Icon width={14} height={14} /> Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5" onClick={() => resetForm()}>
            <div className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[520px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <MoneyReceiveSquareIcon width={20} height={20} className="text-emerald-600" />
                  {editingId ? 'Edit Expense' : 'Tambah Expense'}
                </h3>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors" onClick={resetForm}><Cancel01Icon width={20} height={20} /></button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Judul *</label>
                  <input className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors" placeholder="e.g. Figma Pro, AWS Hosting" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Jumlah *</label>
                    <input type="number" className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors" step="0.01" min="0" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Currency</label>
                    <select className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                      <option value="IDR">IDR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="SGD">SGD</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Kategori</label>
                    <select className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
                      {Object.entries(CATEGORY_LABELS).map(([key, val]) => (<option key={key} value={key}>{val.emoji} {val.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Tanggal</label>
                    <input type="date" className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Deskripsi</label>
                  <textarea className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors resize-none" rows={2} placeholder="Detail pengeluaran (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="accent-emerald-500" checked={form.is_tax_deductible} onChange={(e) => setForm({ ...form, is_tax_deductible: e.target.checked })} />
                    <PercentSquareIcon width={14} height={14} className="text-emerald-500" /> Tax Deductible
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="accent-emerald-500" checked={form.is_recurring} onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })} />
                    🔄 Recurring
                  </label>
                </div>
                {form.is_recurring && (
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Interval</label>
                    <select className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors" value={form.recurring_interval} onChange={(e) => setForm({ ...form, recurring_interval: e.target.value })}>
                      <option value="">Pilih interval</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button className="btn btn-secondary flex-1" onClick={resetForm}>Batal</button>
                <button className="btn btn-primary flex-1" onClick={handleSubmit} disabled={!form.title.trim() || form.amount <= 0 || saving} style={{ background: 'linear-gradient(135deg, #10B981, #0D9488)' }}>
                  {saving ? <Loading03Icon width={16} height={16} className="animate-spin" /> : <CheckmarkCircle02Icon width={16} height={16} />}
                  {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Expense'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}


    </div>
  );
}
