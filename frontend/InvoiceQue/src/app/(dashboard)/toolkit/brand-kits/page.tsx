'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  PaintBoardIcon, Add01Icon, Cancel01Icon, Search01Icon,
  Delete02Icon, MoreVerticalIcon, Loading03Icon, ArrowLeft01Icon, Copy01Icon, Tick01Icon,
} from 'hugeicons-react';
import Portal from '@/components/ui/Portal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toolkitApi, ToolkitItem } from '@/lib/api';

interface BrandKitContent {
  client_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  fonts: { heading: string; body: string };
  notes: string;
}

export default function BrandKitsPage() {
  const [kits, setKits] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', client_name: '', logo_url: '',
    primary_color: '#3B82F6', secondary_color: '#6366F1', accent_color: '#F59E0B',
    heading_font: 'Inter', body_font: 'Inter', notes: '', tags: '',
  });

  const fetchKits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await toolkitApi.list({ type: 'brand_kit', search: search || undefined });
      const data = res.data || [];
      setKits(data);
    } catch { /* error */ }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchKits(); }, [fetchKits]);

  const resetForm = () => {
    setForm({ title: '', client_name: '', logo_url: '', primary_color: '#3B82F6', secondary_color: '#6366F1', accent_color: '#F59E0B', heading_font: 'Inter', body_font: 'Inter', notes: '', tags: '' });
    setEditingId(null);
  };

  const openEdit = (item: ToolkitItem) => {
    const c = item.content as unknown as BrandKitContent;
    setEditingId(item.id);
    setForm({
      title: item.title, client_name: c?.client_name || '', logo_url: c?.logo_url || '',
      primary_color: c?.primary_color || '#3B82F6', secondary_color: c?.secondary_color || '#6366F1',
      accent_color: c?.accent_color || '#F59E0B', heading_font: c?.fonts?.heading || 'Inter',
      body_font: c?.fonts?.body || 'Sora', notes: c?.notes || '', tags: (item.tags || []).join(', '),
    });
    setShowModal(true); setMenuOpen(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        toolkit_type: 'brand_kit' as const,
        title: form.title,
        content: {
          client_name: form.client_name, logo_url: form.logo_url,
          primary_color: form.primary_color, secondary_color: form.secondary_color,
          accent_color: form.accent_color, fonts: { heading: form.heading_font, body: form.body_font },
          notes: form.notes,
        },
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      if (editingId) await toolkitApi.update(editingId, payload);
      else await toolkitApi.create(payload);
      setShowModal(false); resetForm(); fetchKits();
    } catch { /* error */ }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await toolkitApi.delete(deleteTarget); setShowDeleteModal(false); setDeleteTarget(null); fetchKits(); } catch { /* */ }
  };

  const copyHex = (hex: string) => { navigator.clipboard.writeText(hex); setCopiedColor(hex); setTimeout(() => setCopiedColor(null), 1500); };

  const FONTS = ['Inter', 'Roboto', 'Open Sans', 'Poppins', 'Montserrat', 'Lato', 'Raleway', 'Playfair Display', 'Merriweather', 'Source Sans Pro', 'Nunito', 'Oswald'];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/toolkit" className="p-2 rounded-lg hover:bg-bg-hover transition-colors"><ArrowLeft01Icon width={20} height={20} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/30"><PaintBoardIcon width={22} height={22} className="text-violet-600" /></div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Brand Kits</h1>
              <p className="text-xs text-text-tertiary">Logo, font, warna per klien</p>
            </div>
          </div>
        </div>
        <button className="btn btn-primary text-sm flex items-center gap-1.5" onClick={() => { resetForm(); setShowModal(true); }}>
          <Add01Icon width={16} height={16} /> Brand Kit Baru
        </button>
      </div>

      <div className="relative mb-6">
        <Search01Icon width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input type="text" placeholder="Cari brand kit..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-color bg-bg-primary text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loading03Icon width={32} height={32} className="animate-spin text-violet-500" /></div>
      ) : kits.length === 0 ? (
        <div className="text-center py-20 bg-bg-secondary rounded-2xl border border-border-color">
          <PaintBoardIcon width={48} height={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-text-tertiary mb-4">Belum ada brand kit</p>
          <button className="btn btn-primary text-sm" onClick={() => { resetForm(); setShowModal(true); }}><Add01Icon width={16} height={16} /> Buat Brand Kit</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kits.map(kit => {
            const c = kit.content as unknown as BrandKitContent;
            return (
              <div key={kit.id} className="bg-bg-secondary rounded-2xl border border-border-color overflow-hidden hover:shadow-lg transition-all">
                <div className="flex h-3">
                  <div className="flex-1" style={{ backgroundColor: c?.primary_color || '#3B82F6' }} />
                  <div className="flex-1" style={{ backgroundColor: c?.secondary_color || '#6366F1' }} />
                  <div className="flex-1" style={{ backgroundColor: c?.accent_color || '#F59E0B' }} />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-sm text-text-primary">{kit.title}</h3>
                      {c?.client_name && <p className="text-xs text-text-tertiary">{c.client_name}</p>}
                    </div>
                    <div className="relative">
                      <button className="p-1 rounded-lg hover:bg-bg-hover" onClick={() => setMenuOpen(menuOpen === kit.id ? null : kit.id)}>
                        <MoreVerticalIcon width={14} height={14} />
                      </button>
                      {menuOpen === kit.id && (
                        <div className="absolute right-0 top-8 bg-bg-primary border border-border-color rounded-xl shadow-xl z-20 py-1 min-w-[140px]">
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-bg-hover" onClick={() => openEdit(kit)}>✏️ Edit</button>
                          <div className="border-t border-border-light my-1" />
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { setDeleteTarget(kit.id); setShowDeleteModal(true); setMenuOpen(null); }}>
                            <Delete02Icon width={14} height={14} /> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    {[c?.primary_color, c?.secondary_color, c?.accent_color].filter(Boolean).map((color, i) => (
                      <button key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-bg-hover text-xs hover:ring-2 ring-violet-400 transition-all" onClick={() => copyHex(color!)}>
                        <div className="w-4 h-4 rounded-full border border-border-color" style={{ backgroundColor: color }} />
                        <span className="font-mono text-text-tertiary">{copiedColor === color ? <Tick01Icon width={12} height={12} className="text-green-500" /> : color}</span>
                      </button>
                    ))}
                  </div>
                  {c?.fonts && (
                    <div className="flex gap-3 text-[10px] text-text-tertiary">
                      <span>H: <strong className="text-text-secondary">{c.fonts.heading}</strong></span>
                      <span>B: <strong className="text-text-secondary">{c.fonts.body}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5" onClick={() => { setShowModal(false); resetForm(); }}>
            <div className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[640px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <PaintBoardIcon width={20} height={20} className="text-violet-600" />
                  {editingId ? 'Edit Brand Kit' : 'Brand Kit Baru'}
                </h3>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors" onClick={() => { setShowModal(false); resetForm(); }}>
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Nama Brand Kit *</label>
                    <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Acme Corp"
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-violet-400 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Nama Klien</label>
                    <input type="text" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Opsional"
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-violet-400 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Logo URL</label>
                  <input type="text" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..."
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-violet-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Brand Colors</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['primary_color', 'secondary_color', 'accent_color'] as const).map(key => (
                      <div key={key} className="text-center">
                        <input type="color" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-full h-12 rounded-xl border border-border-color cursor-pointer" />
                        <span className="text-[10px] text-text-tertiary mt-1 block">{key.replace('_', ' ').replace('color', '').trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Font Heading</label>
                    <select value={form.heading_font} onChange={e => setForm(f => ({ ...f, heading_font: e.target.value }))}
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-violet-400 transition-colors">
                      {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Font Body</label>
                    <select value={form.body_font} onChange={e => setForm(f => ({ ...f, body_font: e.target.value }))}
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-violet-400 transition-colors">
                      {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Catatan</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Brand guidelines..."
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-violet-400 transition-colors resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Tags (pisahkan koma)</label>
                  <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="brand, client"
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-violet-400 transition-colors" />
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button className="btn btn-secondary flex-1" onClick={() => { setShowModal(false); resetForm(); }}>Batal</button>
                <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving || !form.title.trim()} style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
                  {saving ? <Loading03Icon width={16} height={16} className="animate-spin" /> : <Add01Icon width={16} height={16} />}
                  {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Buat Brand Kit'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
      <ConfirmModal isOpen={showDeleteModal} title="Hapus Brand Kit?" message="Brand kit ini akan dihapus permanen." onConfirm={handleDelete} onCancel={() => { setShowDeleteModal(false); setDeleteTarget(null); }} />
    </div>
  );
}
