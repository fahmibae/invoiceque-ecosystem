'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft01Icon, Add01Icon, Delete02Icon, Search01Icon,
  Loading03Icon, Edit02Icon, Cancel01Icon,
  CheckmarkCircle02Icon, MoreVerticalIcon, Copy01Icon, ViewIcon,
  UserAdd01Icon, TextIcon,
} from 'hugeicons-react';
import { toolkitApi, type ToolkitItem, type CreateToolkitItemRequest } from '@/lib/api';

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'textarea', label: 'Long Text', icon: '📋' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'phone', label: 'Phone', icon: '📞' },
  { value: 'url', label: 'URL', icon: '🔗' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'select', label: 'Dropdown', icon: '📎' },
  { value: 'checkbox', label: 'Checkbox', icon: '☑️' },
  { value: 'file', label: 'File Upload', icon: '📁' },
];

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

const PRESET_TEMPLATES = [
  {
    name: '🎨 Design Project Intake',
    fields: [
      { id: '1', type: 'text', label: 'Nama Perusahaan', required: true },
      { id: '2', type: 'text', label: 'Nama PIC', required: true },
      { id: '3', type: 'email', label: 'Email', required: true },
      { id: '4', type: 'phone', label: 'No. HP / WhatsApp', required: true },
      { id: '5', type: 'select', label: 'Jenis Project', required: true, options: ['Logo Design', 'Brand Identity', 'UI/UX Design', 'Social Media', 'Packaging', 'Other'] },
      { id: '6', type: 'textarea', label: 'Brief / Deskripsi Project', required: true, placeholder: 'Jelaskan kebutuhan desain Anda...' },
      { id: '7', type: 'text', label: 'Budget Range', required: false, placeholder: 'e.g. Rp 5-10 juta' },
      { id: '8', type: 'date', label: 'Target Deadline', required: false },
      { id: '9', type: 'url', label: 'Referensi / Inspirasi (URL)', required: false },
      { id: '10', type: 'file', label: 'Upload File Pendukung', required: false },
    ],
  },
  {
    name: '💻 Web Development Intake',
    fields: [
      { id: '1', type: 'text', label: 'Nama Perusahaan / Personal', required: true },
      { id: '2', type: 'email', label: 'Email', required: true },
      { id: '3', type: 'phone', label: 'No. HP / WhatsApp', required: true },
      { id: '4', type: 'select', label: 'Jenis Website', required: true, options: ['Landing Page', 'Company Profile', 'E-Commerce', 'Web App', 'Blog', 'Portfolio', 'Other'] },
      { id: '5', type: 'textarea', label: 'Deskripsi Project', required: true },
      { id: '6', type: 'select', label: 'Sudah Punya Domain?', required: true, options: ['Sudah', 'Belum', 'Perlu Bantuan'] },
      { id: '7', type: 'select', label: 'Sudah Punya Hosting?', required: true, options: ['Sudah', 'Belum', 'Perlu Bantuan'] },
      { id: '8', type: 'text', label: 'Budget Range', required: false },
      { id: '9', type: 'date', label: 'Target Launch', required: false },
      { id: '10', type: 'url', label: 'Website Referensi', required: false },
    ],
  },
  {
    name: '📣 Marketing Campaign Intake',
    fields: [
      { id: '1', type: 'text', label: 'Brand / Company Name', required: true },
      { id: '2', type: 'text', label: 'Contact Person', required: true },
      { id: '3', type: 'email', label: 'Email', required: true },
      { id: '4', type: 'select', label: 'Platform', required: true, options: ['Instagram', 'TikTok', 'Facebook', 'Google Ads', 'LinkedIn', 'Multi-platform'] },
      { id: '5', type: 'textarea', label: 'Campaign Objective', required: true },
      { id: '6', type: 'text', label: 'Target Audience', required: true },
      { id: '7', type: 'text', label: 'Monthly Ad Budget', required: false },
      { id: '8', type: 'date', label: 'Campaign Start Date', required: false },
    ],
  },
];

export default function IntakeFormsPage() {
  const [forms, setForms] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState<ToolkitItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  // Form builder state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);

  const fetchForms = useCallback(async () => {
    try {
      const res = await toolkitApi.list({ type: 'brief', search: search || undefined, per_page: 50 });
      // Filter only intake forms by checking content.form_type
      const intakeForms = (res.data || []).filter((item) => (item.content?.form_type as string) === 'intake_form');
      setForms(intakeForms);
    } catch { /* ignore */ }
  }, [search]);

  useEffect(() => {
    fetchForms().finally(() => setLoading(false));
  }, [fetchForms]);

  const resetForm = () => {
    setTitle(''); setDescription(''); setFields([]); setEditingId(null); setShowForm(false); setShowPresets(false);
  };

  const addField = () => {
    setFields([...fields, {
      id: Date.now().toString(),
      type: 'text',
      label: '',
      placeholder: '',
      required: false,
    }]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map((f) => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const newFields = [...fields];
    const target = index + direction;
    if (target < 0 || target >= newFields.length) return;
    [newFields[index], newFields[target]] = [newFields[target], newFields[index]];
    setFields(newFields);
  };

  const openEdit = (item: ToolkitItem) => {
    setTitle(item.title);
    setDescription((item.content?.description as string) || '');
    setFields((item.content?.fields as FormField[]) || []);
    setEditingId(item.id);
    setShowForm(true);
    setMenuOpen(null);
  };

  const loadPreset = (preset: (typeof PRESET_TEMPLATES)[0]) => {
    setTitle(preset.name.replace(/^[^\s]+\s/, ''));
    setFields(preset.fields);
    setShowPresets(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const data: CreateToolkitItemRequest = {
        toolkit_type: 'brief',
        title: title.trim(),
        content: {
          form_type: 'intake_form',
          description,
          fields,
          field_count: fields.length,
        },
      };
      if (editingId) await toolkitApi.update(editingId, data);
      else await toolkitApi.create(data);
      resetForm();
      fetchForms();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const duplicateForm = async (item: ToolkitItem) => {
    try {
      await toolkitApi.create({
        toolkit_type: 'brief',
        title: `${item.title} (Copy)`,
        content: item.content,
      });
      fetchForms();
    } catch { /* ignore */ }
    setMenuOpen(null);
  };

  const deleteForm = async (id: string) => {
    try { await toolkitApi.delete(id); fetchForms(); } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loading03Icon width={32} height={32} className="animate-spin text-amber-500" />
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
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                <UserAdd01Icon width={22} height={22} />
              </span>
              Client Intake Forms
            </h1>
          </div>
          <p className="page-subtitle">Buat form untuk onboarding client baru secara profesional</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={() => { resetForm(); setShowPresets(true); }}>
            <TextIcon width={16} height={16} /> From Template
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Add01Icon width={16} height={16} /> Buat Form
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search01Icon width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input type="text" placeholder="Cari intake form..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-input pl-9 w-full" />
        </div>
      </div>

      {/* Form List */}
      {forms.length === 0 ? (
        <div className="card p-12 text-center">
          <UserAdd01Icon width={48} height={48} className="mx-auto text-text-tertiary mb-3 opacity-40" />
          <p className="text-text-tertiary font-medium">Belum ada intake form</p>
          <p className="text-text-tertiary text-xs mt-1">Buat form untuk mengumpulkan brief dari client baru</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button className="btn btn-secondary" onClick={() => setShowPresets(true)}>
              <TextIcon width={16} height={16} /> Mulai dari Template
            </button>
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
              <Add01Icon width={16} height={16} /> Buat dari Nol
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((item) => {
            const fieldCount = (item.content?.field_count as number) || (item.content?.fields as FormField[])?.length || 0;
            const formFields = (item.content?.fields as FormField[]) || [];
            const requiredCount = formFields.filter((f) => f.required).length;

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
                      <button className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2" onClick={() => duplicateForm(item)}>
                        <Copy01Icon width={14} height={14} /> Duplicate
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover text-red-500 flex items-center gap-2" onClick={() => { deleteForm(item.id); setMenuOpen(null); }}>
                        <Delete02Icon width={14} height={14} /> Hapus
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 mb-3">
                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <UserAdd01Icon width={20} height={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-text-primary truncate pr-6">{item.title}</h3>
                    {(item.content?.description as string) && (
                      <p className="text-[11px] text-text-tertiary truncate">{item.content.description as string}</p>
                    )}
                  </div>
                </div>

                {/* Field Preview */}
                <div className="space-y-1 mb-3">
                  {formFields.slice(0, 3).map((field) => {
                    const ft = FIELD_TYPES.find((t) => t.value === field.type);
                    return (
                      <div key={field.id} className="flex items-center gap-2 text-xs text-text-secondary">
                        <span className="text-[10px]">{ft?.icon || '📝'}</span>
                        <span className="truncate">{field.label}</span>
                        {field.required && <span className="text-red-400 text-[10px]">*</span>}
                      </div>
                    );
                  })}
                  {formFields.length > 3 && (
                    <p className="text-[10px] text-text-tertiary">+{formFields.length - 3} field lainnya</p>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[10px] text-text-tertiary pt-2 border-t border-border-color/30">
                  <span>📋 {fieldCount} fields</span>
                  <span>🔴 {requiredCount} required</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preset Templates Picker */}
      {showPresets && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) setShowPresets(false); }}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Pilih Template</h3>
              <button className="modal-close" onClick={() => setShowPresets(false)}><Cancel01Icon width={18} height={18} /></button>
            </div>
            <div className="modal-body space-y-3">
              {PRESET_TEMPLATES.map((preset) => (
                <button
                  key={preset.name}
                  className="w-full p-4 rounded-xl border border-border-color hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-all text-left"
                  onClick={() => { loadPreset(preset); setShowForm(true); }}
                >
                  <div className="font-bold text-sm mb-1">{preset.name}</div>
                  <div className="text-xs text-text-tertiary">{preset.fields.length} fields • {preset.fields.filter((f) => f.required).length} required</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Form Builder Modal */}
      {showForm && (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="modal" style={{ maxWidth: 700, maxHeight: '85vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Intake Form' : 'Buat Intake Form'}</h3>
              <button className="modal-close" onClick={resetForm}><Cancel01Icon width={18} height={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div>
                  <label className="form-label">Nama Form *</label>
                  <input type="text" className="form-input w-full" placeholder="e.g. Web Development Client Intake" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Deskripsi (opsional)</label>
                  <textarea className="form-input w-full" rows={2} placeholder="Deskripsi singkat form ini..." value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>

                {/* Fields Builder */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label mb-0">Form Fields ({fields.length})</label>
                    <button type="button" className="btn btn-secondary text-xs px-3 py-1.5" onClick={addField}>
                      <Add01Icon width={12} height={12} /> Add Field
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-3 rounded-xl border border-border-color bg-bg-secondary/30">
                        <div className="grid grid-cols-12 gap-2 items-start">
                          <div className="col-span-5">
                            <input type="text" className="form-input w-full text-xs" placeholder="Label" value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} />
                          </div>
                          <div className="col-span-3">
                            <select className="form-input w-full text-xs" value={field.type} onChange={(e) => updateField(field.id, { type: e.target.value })}>
                              {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2 flex items-center gap-1">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} className="accent-amber-500" />
                              <span className="text-[10px] text-text-tertiary">Wajib</span>
                            </label>
                          </div>
                          <div className="col-span-2 flex items-center gap-1 justify-end">
                            <button type="button" className="p-1 hover:bg-bg-hover rounded text-text-tertiary" onClick={() => moveField(index, -1)} disabled={index === 0}>↑</button>
                            <button type="button" className="p-1 hover:bg-bg-hover rounded text-text-tertiary" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1}>↓</button>
                            <button type="button" className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-400" onClick={() => removeField(field.id)}>
                              <Delete02Icon width={12} height={12} />
                            </button>
                          </div>
                        </div>
                        {field.type === 'select' && (
                          <div className="mt-2">
                            <input type="text" className="form-input w-full text-xs" placeholder="Opsi (pisah dengan koma): Option 1, Option 2, Option 3" value={(field.options || []).join(', ')} onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })} />
                          </div>
                        )}
                        {(field.type === 'text' || field.type === 'textarea') && (
                          <div className="mt-2">
                            <input type="text" className="form-input w-full text-xs" placeholder="Placeholder text (opsional)" value={field.placeholder || ''} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} />
                          </div>
                        )}
                      </div>
                    ))}
                    {fields.length === 0 && (
                      <div className="text-center py-6 text-text-tertiary text-xs">
                        Belum ada field. Klik &quot;Add Field&quot; untuk mulai.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving || fields.length === 0}>
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
          <div className="modal" style={{ maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">📋 Preview: {showPreview.title}</h3>
              <button className="modal-close" onClick={() => setShowPreview(null)}><Cancel01Icon width={18} height={18} /></button>
            </div>
            <div className="modal-body">
              {(showPreview.content?.description as string) && (
                <p className="text-sm text-text-secondary mb-4">{showPreview.content.description as string}</p>
              )}
              <div className="space-y-4">
                {((showPreview.content?.fields as FormField[]) || []).map((field) => {
                  const ft = FIELD_TYPES.find((t) => t.value === field.type);
                  return (
                    <div key={field.id}>
                      <label className="form-label flex items-center gap-1">
                        <span className="text-xs">{ft?.icon}</span>
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea className="form-input w-full" rows={3} placeholder={field.placeholder || field.label} disabled />
                      ) : field.type === 'select' ? (
                        <select className="form-input w-full" disabled>
                          <option>Pilih {field.label}...</option>
                          {(field.options || []).map((opt) => <option key={opt}>{opt}</option>)}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <label className="flex items-center gap-2">
                          <input type="checkbox" disabled /> <span className="text-sm text-text-secondary">{field.label}</span>
                        </label>
                      ) : (
                        <input type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'url' ? 'url' : 'text'} className="form-input w-full" placeholder={field.placeholder || field.label} disabled />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPreview(null)}>Tutup</button>
              <button className="btn btn-primary" onClick={() => { openEdit(showPreview); setShowPreview(null); }}>
                <Edit02Icon width={14} height={14} /> Edit Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
