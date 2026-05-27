'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft01Icon, Add01Icon, Delete02Icon, Search01Icon,
  Loading03Icon, Edit02Icon, Cancel01Icon,
  CheckmarkCircle02Icon, MoreVerticalIcon, Copy01Icon,
  MoneyReceiveSquareIcon, DollarSquareIcon,
} from 'hugeicons-react';
import { toolkitApi, type ToolkitItem, type CreateToolkitItemRequest } from '@/lib/api';

const RATE_TYPES = [
  { value: 'hourly', label: 'Per Jam', emoji: '⏱️', color: 'text-blue-500' },
  { value: 'fixed', label: 'Fixed Price', emoji: '💰', color: 'text-green-500' },
  { value: 'retainer', label: 'Retainer/Bulan', emoji: '🔄', color: 'text-purple-500' },
  { value: 'per_word', label: 'Per Kata', emoji: '✍️', color: 'text-orange-500' },
  { value: 'per_page', label: 'Per Halaman', emoji: '📄', color: 'text-pink-500' },
  { value: 'per_revision', label: 'Per Revisi', emoji: '🔁', color: 'text-teal-500' },
];

const SERVICE_CATEGORIES = [
  { value: 'development', label: 'Development', emoji: '💻' },
  { value: 'design', label: 'Design', emoji: '🎨' },
  { value: 'writing', label: 'Writing', emoji: '✏️' },
  { value: 'marketing', label: 'Marketing', emoji: '📣' },
  { value: 'consulting', label: 'Consulting', emoji: '🧠' },
  { value: 'video', label: 'Video/Animation', emoji: '🎬' },
  { value: 'photography', label: 'Photography', emoji: '📷' },
  { value: 'other', label: 'Lainnya', emoji: '📦' },
];

function formatCurrency(amount: number, currency = 'IDR') {
  if (currency === 'IDR') return `Rp ${amount.toLocaleString('id-ID')}`;
  if (currency === 'USD') return `$${amount.toLocaleString('en-US')}`;
  return `${currency} ${amount.toLocaleString()}`;
}

export default function RateCardsPage() {
  const [rateCards, setRateCards] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [serviceCategory, setServiceCategory] = useState('development');
  const [rateType, setRateType] = useState('hourly');
  const [rate, setRate] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [description, setDescription] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [turnaround, setTurnaround] = useState('');
  const [revisions, setRevisions] = useState('');

  const fetchRateCards = useCallback(async () => {
    try {
      const res = await toolkitApi.list({ type: 'rate_card', search: search || undefined, per_page: 50 });
      let items = res.data || [];
      if (filterCategory) items = items.filter((i) => (i.content?.service_category as string) === filterCategory);
      setRateCards(items);
    } catch { /* ignore */ }
  }, [search, filterCategory]);

  useEffect(() => {
    fetchRateCards().finally(() => setLoading(false));
  }, [fetchRateCards]);

  const resetForm = () => {
    setTitle(''); setServiceCategory('development'); setRateType('hourly');
    setRate(''); setCurrency('IDR'); setMinRate(''); setMaxRate('');
    setDescription(''); setDeliverables(''); setTurnaround(''); setRevisions('');
    setEditingId(null); setShowForm(false);
  };

  const openEdit = (item: ToolkitItem) => {
    setTitle(item.title);
    setServiceCategory((item.content?.service_category as string) || 'development');
    setRateType((item.content?.rate_type as string) || 'hourly');
    setRate(String((item.content?.rate as number) || ''));
    setCurrency((item.content?.currency as string) || 'IDR');
    setMinRate(String((item.content?.min_rate as number) || ''));
    setMaxRate(String((item.content?.max_rate as number) || ''));
    setDescription((item.content?.description as string) || '');
    setDeliverables((item.content?.deliverables as string) || '');
    setTurnaround((item.content?.turnaround as string) || '');
    setRevisions(String((item.content?.revisions as number) || ''));
    setEditingId(item.id);
    setShowForm(true);
    setMenuOpen(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rate) return;
    setSaving(true);
    try {
      const data: CreateToolkitItemRequest = {
        toolkit_type: 'rate_card',
        title: title.trim(),
        content: {
          service_category: serviceCategory,
          rate_type: rateType,
          rate: parseFloat(rate) || 0,
          currency,
          min_rate: minRate ? parseFloat(minRate) : null,
          max_rate: maxRate ? parseFloat(maxRate) : null,
          description,
          deliverables,
          turnaround,
          revisions: revisions ? parseInt(revisions) : null,
        },
      };
      if (editingId) await toolkitApi.update(editingId, data);
      else await toolkitApi.create(data);
      resetForm();
      fetchRateCards();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const duplicateCard = async (item: ToolkitItem) => {
    try {
      await toolkitApi.create({
        toolkit_type: 'rate_card',
        title: `${item.title} (Copy)`,
        content: item.content,
      });
      fetchRateCards();
    } catch { /* ignore */ }
    setMenuOpen(null);
  };

  const deleteCard = async (id: string) => {
    try { await toolkitApi.delete(id); fetchRateCards(); } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loading03Icon width={32} height={32} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-3">
            <Link href="/toolkit" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
              <ArrowLeft01Icon width={20} height={20} />
            </Link>
            <h1 className="page-title flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <DollarSquareIcon width={22} height={22} />
              </span>
              Rate Cards
            </h1>
          </div>
          <p className="page-subtitle">Kelola tarif & pricing untuk setiap layanan freelancemu</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Add01Icon width={16} height={16} /> Tambah Rate Card
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search01Icon width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input type="text" placeholder="Cari rate card..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-input pl-9 w-full" />
        </div>
        <select className="form-input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">Semua Kategori</option>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
          ))}
        </select>
      </div>

      {/* Rate Card List */}
      {rateCards.length === 0 ? (
        <div className="card p-12 text-center">
          <MoneyReceiveSquareIcon width={48} height={48} className="mx-auto text-text-tertiary mb-3 opacity-40" />
          <p className="text-text-tertiary font-medium">Belum ada rate cards</p>
          <p className="text-text-tertiary text-xs mt-1">Buat pricing rate card pertamamu</p>
          <button className="btn btn-primary mt-4" onClick={() => { resetForm(); setShowForm(true); }}>
            <Add01Icon width={16} height={16} /> Buat Rate Card Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rateCards.map((item) => {
            const catInfo = SERVICE_CATEGORIES.find((c) => c.value === (item.content?.service_category as string)) || SERVICE_CATEGORIES[SERVICE_CATEGORIES.length - 1];
            const rType = RATE_TYPES.find((r) => r.value === (item.content?.rate_type as string)) || RATE_TYPES[0];
            const rateVal = (item.content?.rate as number) || 0;
            const cur = (item.content?.currency as string) || 'IDR';

            return (
              <div key={item.id} className="card p-5 hover:shadow-lg transition-all hover:-translate-y-0.5 group relative">
                <div className="absolute top-3 right-3">
                  <button
                    className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors opacity-0 group-hover:opacity-100"
                    onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}
                  >
                    <MoreVerticalIcon width={16} height={16} />
                  </button>
                  {menuOpen === item.id && (
                    <div className="absolute right-0 top-full mt-1 bg-bg-primary border border-border-color rounded-xl shadow-lg z-50 min-w-[160px] py-1">
                      <button className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2" onClick={() => openEdit(item)}>
                        <Edit02Icon width={14} height={14} /> Edit
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2" onClick={() => duplicateCard(item)}>
                        <Copy01Icon width={14} height={14} /> Duplicate
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover text-red-500 flex items-center gap-2" onClick={() => { deleteCard(item.id); setMenuOpen(null); }}>
                        <Delete02Icon width={14} height={14} /> Hapus
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{catInfo.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-text-primary truncate pr-6">{item.title}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {catInfo.label}
                    </span>
                  </div>
                </div>

                {/* Rate Display */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-xl p-3 mb-3">
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(rateVal, cur)}
                  </div>
                  <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 flex items-center gap-1">
                    <span>{rType.emoji}</span> {rType.label}
                  </div>
                  {((item.content?.min_rate as number) || (item.content?.max_rate as number)) ? (
                    <div className="text-[10px] text-text-tertiary mt-1">
                      Range: {formatCurrency((item.content?.min_rate as number) || 0, cur)} — {formatCurrency((item.content?.max_rate as number) || 0, cur)}
                    </div>
                  ) : null}
                </div>

                {(item.content?.description as string) && (
                  <p className="text-xs text-text-tertiary line-clamp-2 mb-2">{item.content.description as string}</p>
                )}

                <div className="flex items-center gap-3 text-[10px] text-text-tertiary mt-auto pt-2 border-t border-border-color/30">
                  {(item.content?.turnaround as string) && <span>⏱️ {item.content.turnaround as string}</span>}
                  {(item.content?.revisions as number) && <span>🔁 {item.content.revisions as number}x revisi</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Rate Card' : 'Tambah Rate Card'}</h3>
              <button className="modal-close" onClick={resetForm}><Cancel01Icon width={18} height={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="form-label">Nama Layanan *</label>
                  <input type="text" className="form-input w-full" placeholder="e.g. Website Development" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Kategori</label>
                    <select className="form-input w-full" value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)}>
                      {SERVICE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Tipe Tarif</label>
                    <select className="form-input w-full" value={rateType} onChange={(e) => setRateType(e.target.value)}>
                      {RATE_TYPES.map((r) => <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">Tarif *</label>
                    <input type="number" className="form-input w-full" placeholder="500000" value={rate} onChange={(e) => setRate(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">Currency</label>
                    <select className="form-input w-full" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                      <option value="IDR">IDR (Rp)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="SGD">SGD (S$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Revisi</label>
                    <input type="number" className="form-input w-full" placeholder="3" value={revisions} onChange={(e) => setRevisions(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Min Rate (opsional)</label>
                    <input type="number" className="form-input w-full" placeholder="300000" value={minRate} onChange={(e) => setMinRate(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Max Rate (opsional)</label>
                    <input type="number" className="form-input w-full" placeholder="800000" value={maxRate} onChange={(e) => setMaxRate(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Deskripsi</label>
                  <textarea className="form-input w-full" rows={2} placeholder="Jelaskan layanan ini..." value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Deliverables</label>
                  <textarea className="form-input w-full" rows={2} placeholder="e.g. Desain UI, Slicing, Responsive, Testing" value={deliverables} onChange={(e) => setDeliverables(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Turnaround</label>
                  <input type="text" className="form-input w-full" placeholder="e.g. 5-7 hari kerja" value={turnaround} onChange={(e) => setTurnaround(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loading03Icon width={16} height={16} className="animate-spin" /> : <CheckmarkCircle02Icon width={16} height={16} />}
                  {editingId ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
