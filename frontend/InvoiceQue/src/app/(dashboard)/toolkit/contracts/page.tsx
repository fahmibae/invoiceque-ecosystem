'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft01Icon, Add01Icon, Delete02Icon, Search01Icon,
  Loading03Icon, LegalDocument01Icon, Edit02Icon, Cancel01Icon,
  CheckmarkCircle02Icon, MoreVerticalIcon, Copy01Icon, ViewIcon,
} from 'hugeicons-react';
import { toolkitApi, type ToolkitItem, type CreateToolkitItemRequest } from '@/lib/api';

const CONTRACT_TYPES = [
  { value: 'service_agreement', label: 'Service Agreement', emoji: '📋', desc: 'Standard client service contract' },
  { value: 'nda', label: 'NDA', emoji: '🔒', desc: 'Non-disclosure agreement' },
  { value: 'project_contract', label: 'Project Contract', emoji: '📄', desc: 'Project-specific terms & deliverables' },
  { value: 'retainer', label: 'Retainer Agreement', emoji: '🔄', desc: 'Ongoing monthly retainer' },
  { value: 'subcontractor', label: 'Subcontractor Agreement', emoji: '👥', desc: 'For hiring subcontractors' },
  { value: 'scope_of_work', label: 'Scope of Work', emoji: '🎯', desc: 'Detailed project scope document' },
  { value: 'other', label: 'Other', emoji: '📝', desc: 'Custom contract type' },
];

export default function ContractTemplatesPage() {
  const [contracts, setContracts] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState<ToolkitItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [contractType, setContractType] = useState('service_agreement');
  const [body, setBody] = useState('');
  const [notes, setNotes] = useState('');

  const fetchContracts = useCallback(async () => {
    try {
      const res = await toolkitApi.list({ type: 'contract_template', search: search || undefined, per_page: 50 });
      setContracts(res.data || []);
    } catch { /* ignore */ }
  }, [search]);

  useEffect(() => {
    fetchContracts().finally(() => setLoading(false));
  }, [fetchContracts]);

  const resetForm = () => {
    setTitle('');
    setContractType('service_agreement');
    setBody('');
    setNotes('');
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (item: ToolkitItem) => {
    setTitle(item.title);
    setContractType((item.content?.contract_type as string) || 'service_agreement');
    setBody((item.content?.body as string) || '');
    setNotes((item.content?.notes as string) || '');
    setEditingId(item.id);
    setShowForm(true);
    setMenuOpen(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const data: CreateToolkitItemRequest = {
        toolkit_type: 'contract_template',
        title: title.trim(),
        content: { body, contract_type: contractType, notes },
      };
      if (editingId) {
        await toolkitApi.update(editingId, data);
      } else {
        await toolkitApi.create(data);
      }
      resetForm();
      fetchContracts();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const duplicateContract = async (item: ToolkitItem) => {
    try {
      await toolkitApi.create({
        toolkit_type: 'contract_template',
        title: `${item.title} (Copy)`,
        content: item.content,
      });
      fetchContracts();
    } catch { /* ignore */ }
    setMenuOpen(null);
  };

  const deleteContract = async (id: string) => {
    try {
      await toolkitApi.delete(id);
      fetchContracts();
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loading03Icon width={32} height={32} className="animate-spin text-indigo-500" />
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
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <LegalDocument01Icon width={22} height={22} />
              </span>
              Contract Templates
            </h1>
          </div>
          <p className="page-subtitle">Buat & kelola template kontrak untuk project freelance kamu</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Add01Icon width={16} height={16} /> Buat Template
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search01Icon width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input type="text" placeholder="Cari contract templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-input pl-9 w-full" />
        </div>
      </div>

      {/* Contract List */}
      {contracts.length === 0 ? (
        <div className="card p-12 text-center">
          <LegalDocument01Icon width={48} height={48} className="mx-auto text-text-tertiary mb-3 opacity-40" />
          <p className="text-text-tertiary font-medium">Belum ada contract templates</p>
          <p className="text-text-tertiary text-xs mt-1">Buat template kontrak pertamamu untuk memudahkan onboarding client</p>
          <button className="btn btn-primary mt-4" onClick={() => { resetForm(); setShowForm(true); }}>
            <Add01Icon width={16} height={16} /> Buat Template Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contracts.map((item) => {
            const typeInfo = CONTRACT_TYPES.find((t) => t.value === (item.content?.contract_type || 'other')) || CONTRACT_TYPES[CONTRACT_TYPES.length - 1];
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
                      <button className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2" onClick={() => setShowPreview(item)}>
                        <ViewIcon width={14} height={14} /> Preview
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2" onClick={() => openEdit(item)}>
                        <Edit02Icon width={14} height={14} /> Edit
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2" onClick={() => duplicateContract(item)}>
                        <Copy01Icon width={14} height={14} /> Duplicate
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover text-red-500 flex items-center gap-2" onClick={() => { deleteContract(item.id); setMenuOpen(null); }}>
                        <Delete02Icon width={14} height={14} /> Hapus
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{typeInfo.emoji}</span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-text-primary truncate pr-6">{item.title}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      {typeInfo.label}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-tertiary line-clamp-3 mb-3">
                  {(item.content?.body as string)?.slice(0, 200) || 'No content yet...'}
                </p>
                <div className="text-[10px] text-text-tertiary">
                  Updated {new Date(item.updated_at || item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Template' : 'Buat Contract Template'}</h3>
              <button className="modal-close" onClick={resetForm}><Cancel01Icon width={18} height={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="form-label">Nama Template *</label>
                  <input type="text" className="form-input w-full" placeholder="e.g. Web Development Service Agreement" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Tipe Kontrak</label>
                  <select className="form-input w-full" value={contractType} onChange={(e) => setContractType(e.target.value)}>
                    {CONTRACT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Isi Kontrak / Template Body</label>
                  <textarea
                    className="form-input w-full font-mono text-xs"
                    rows={12}
                    placeholder={"FREELANCE SERVICE AGREEMENT\n\nThis Agreement is entered into between:\n- Client: [CLIENT_NAME]\n- Freelancer: [YOUR_NAME]\n\n1. SCOPE OF WORK\n...\n\n2. PAYMENT TERMS\n...\n\n3. TIMELINE\n..."}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Catatan Internal (tidak terlihat client)</label>
                  <textarea className="form-input w-full" rows={2} placeholder="e.g. Gunakan untuk project di atas 5 juta" value={notes} onChange={(e) => setNotes(e.target.value)} />
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

      {/* Preview Modal */}
      {showPreview && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setShowPreview(null); }}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 className="modal-title">📄 {showPreview.title}</h3>
              <button className="modal-close" onClick={() => setShowPreview(null)}><Cancel01Icon width={18} height={18} /></button>
            </div>
            <div className="modal-body">
              <pre className="whitespace-pre-wrap text-sm text-text-primary font-sans leading-relaxed">
                {(showPreview.content?.body as string) || 'No content...'}
              </pre>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPreview(null)}>Tutup</button>
              <button className="btn btn-primary" onClick={() => { openEdit(showPreview); setShowPreview(null); }}>
                <Edit02Icon width={14} height={14} /> Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
