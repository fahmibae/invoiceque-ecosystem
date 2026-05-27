'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  PaintBoardIcon, Add01Icon, Cancel01Icon, Search01Icon,
  Delete02Icon, Copy01Icon, MoreVerticalIcon,
  Loading03Icon, ArrowLeft01Icon, Tick01Icon,
} from 'hugeicons-react';
import Portal from '@/components/ui/Portal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toolkitApi, ToolkitItem } from '@/lib/api';

interface PaletteColor {
  hex: string;
  name: string;
}

interface PaletteContent {
  description: string;
  colors: PaletteColor[];
}

const PRESET_PALETTES = [
  { name: 'Modern Minimal', colors: [
    { hex: '#1A1A2E', name: 'Deep Navy' }, { hex: '#16213E', name: 'Dark Blue' },
    { hex: '#0F3460', name: 'Royal Blue' }, { hex: '#E94560', name: 'Coral Red' }, { hex: '#F5F5F5', name: 'Off White' },
  ]},
  { name: 'Sunset Vibes', colors: [
    { hex: '#FF6B6B', name: 'Salmon' }, { hex: '#FFA500', name: 'Orange' },
    { hex: '#FFD93D', name: 'Yellow' }, { hex: '#6BCB77', name: 'Green' }, { hex: '#4D96FF', name: 'Blue' },
  ]},
  { name: 'Pastel Dream', colors: [
    { hex: '#FFB5E8', name: 'Pink' }, { hex: '#B5DEFF', name: 'Sky' },
    { hex: '#E7FFAC', name: 'Lime' }, { hex: '#DCD3FF', name: 'Lavender' }, { hex: '#FFFFD1', name: 'Cream' },
  ]},
  { name: 'Corporate Pro', colors: [
    { hex: '#2D3436', name: 'Charcoal' }, { hex: '#636E72', name: 'Gray' },
    { hex: '#0984E3', name: 'Blue' }, { hex: '#00B894', name: 'Teal' }, { hex: '#FFFFFF', name: 'White' },
  ]},
];

export default function PalettesPage() {
  const [palettes, setPalettes] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    colors: [{ hex: '#3B82F6', name: 'Blue' }] as PaletteColor[],
    tags: '',
  });

  const fetchPalettes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await toolkitApi.list({ type: 'palette', search: search || undefined });
      const data = res.data || [];
      setPalettes(data);
    } catch { /* error */ }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchPalettes(); }, [fetchPalettes]);

  const resetForm = () => {
    setForm({ title: '', description: '', colors: [{ hex: '#3B82F6', name: 'Blue' }], tags: '' });
    setEditingId(null);
  };

  const openEdit = (item: ToolkitItem) => {
    setEditingId(item.id);
    const content = item.content as unknown as PaletteContent;
    setForm({
      title: item.title,
      description: content?.description || '',
      colors: content?.colors || [{ hex: '#3B82F6', name: 'Blue' }],
      tags: (item.tags || []).join(', '),
    });
    setShowModal(true);
    setMenuOpen(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        toolkit_type: 'palette' as const,
        title: form.title,
        content: { description: form.description, colors: form.colors },
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      if (editingId) {
        await toolkitApi.update(editingId, payload);
      } else {
        await toolkitApi.create(payload);
      }
      setShowModal(false);
      resetForm();
      fetchPalettes();
    } catch { /* error */ }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await toolkitApi.delete(deleteTarget);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchPalettes();
    } catch { /* error */ }
  };

  const addColor = () => {
    const hue = Math.floor(Math.random() * 360);
    const hex = `hsl(${hue}, 70%, 50%)`;
    // Convert to hex
    const randomHex = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    setForm(f => ({ ...f, colors: [...f.colors, { hex: randomHex, name: `Color ${f.colors.length + 1}` }] }));
  };

  const removeColor = (idx: number) => {
    setForm(f => ({ ...f, colors: f.colors.filter((_, i) => i !== idx) }));
  };

  const updateColor = (idx: number, field: 'hex' | 'name', value: string) => {
    setForm(f => ({
      ...f,
      colors: f.colors.map((c, i) => i === idx ? { ...c, [field]: value } : c),
    }));
  };

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  const loadPreset = (preset: typeof PRESET_PALETTES[0]) => {
    setForm(f => ({ ...f, title: f.title || preset.name, colors: preset.colors }));
    setShowPresets(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/toolkit" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft01Icon width={20} height={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <PaintBoardIcon width={22} height={22} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Color Palettes</h1>
              <p className="text-xs text-text-tertiary">Simpan dan kelola palette warna per project</p>
            </div>
          </div>
        </div>
        <button className="btn btn-primary text-sm flex items-center gap-1.5" onClick={() => { resetForm(); setShowModal(true); }}>
          <Add01Icon width={16} height={16} /> Palette Baru
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search01Icon width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input type="text" placeholder="Cari palette..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-color bg-bg-primary text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loading03Icon width={32} height={32} className="animate-spin text-violet-500" />
        </div>
      ) : palettes.length === 0 ? (
        <div className="text-center py-20 bg-bg-secondary rounded-2xl border border-border-color">
          <PaintBoardIcon width={48} height={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-text-tertiary mb-4">Belum ada palette warna</p>
          <button className="btn btn-primary text-sm" onClick={() => { resetForm(); setShowModal(true); }}>
            <Add01Icon width={16} height={16} /> Buat Palette Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {palettes.map(palette => {
            const content = palette.content as unknown as PaletteContent;
            const colors = content?.colors || [];
            return (
              <div key={palette.id} className="bg-bg-secondary rounded-2xl border border-border-color overflow-hidden hover:shadow-lg transition-all duration-300 group">
                {/* Color Swatches */}
                <div className="flex h-20">
                  {colors.map((color, idx) => (
                    <button key={idx} className="flex-1 relative group/swatch cursor-pointer transition-all hover:flex-[2]"
                      style={{ backgroundColor: color.hex }} onClick={() => copyHex(color.hex)} title={`${color.name}: ${color.hex}`}>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity bg-black/30">
                        {copiedColor === color.hex
                          ? <Tick01Icon width={16} height={16} className="text-white" />
                          : <Copy01Icon width={14} height={14} className="text-white" />}
                      </div>
                    </button>
                  ))}
                </div>
                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-sm text-text-primary">{palette.title}</h3>
                    <div className="relative">
                      <button className="p-1 rounded-lg hover:bg-bg-hover transition-colors" onClick={() => setMenuOpen(menuOpen === palette.id ? null : palette.id)}>
                        <MoreVerticalIcon width={14} height={14} />
                      </button>
                      {menuOpen === palette.id && (
                        <div className="absolute right-0 top-8 bg-bg-primary border border-border-color rounded-xl shadow-xl z-20 py-1 min-w-[140px]">
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors" onClick={() => openEdit(palette)}>
                            ✏️ Edit
                          </button>
                          <div className="border-t border-border-light my-1" />
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={() => { setDeleteTarget(palette.id); setShowDeleteModal(true); setMenuOpen(null); }}>
                            <Delete02Icon width={14} height={14} /> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {content?.description && <p className="text-xs text-text-tertiary mb-2 line-clamp-2">{content.description}</p>}
                  <div className="flex flex-wrap gap-1">
                    {colors.map((c, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-bg-hover text-text-tertiary">{c.hex}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5" onClick={() => { setShowModal(false); resetForm(); }}>
            <div className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[640px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <PaintBoardIcon width={20} height={20} className="text-violet-600" />
                  {editingId ? 'Edit Palette' : 'Palette Baru'}
                </h3>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors" onClick={() => { setShowModal(false); resetForm(); }}>
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Nama Palette *</label>
                  <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Brand Colors - Client X" className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-violet-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Deskripsi</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Catatan tentang palette ini..." rows={2} className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-violet-400 transition-colors resize-none" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px]">Warna ({form.colors.length})</label>
                    <div className="flex gap-2">
                      <button className="text-xs text-violet-600 hover:underline" onClick={() => setShowPresets(!showPresets)}>🎨 Preset</button>
                      <button className="text-xs text-violet-600 hover:underline" onClick={addColor}>+ Tambah</button>
                    </div>
                  </div>
                  {showPresets && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {PRESET_PALETTES.map((p, i) => (
                        <button key={i} className="p-2 rounded-xl border border-border-color hover:border-violet-400 transition-all text-left" onClick={() => loadPreset(p)}>
                          <div className="flex h-6 rounded-lg overflow-hidden mb-1.5">
                            {p.colors.map((c, j) => <div key={j} className="flex-1" style={{ backgroundColor: c.hex }} />)}
                          </div>
                          <span className="text-[10px] font-medium text-text-secondary">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    {form.colors.map((color, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="color" value={color.hex} onChange={e => updateColor(idx, 'hex', e.target.value)}
                          className="w-10 h-10 rounded-lg border border-border-color cursor-pointer" />
                        <input type="text" value={color.hex} onChange={e => updateColor(idx, 'hex', e.target.value)}
                          className="w-24 px-2 py-2 rounded-lg border border-border-color bg-bg-secondary text-xs font-mono focus:outline-none" />
                        <input type="text" value={color.name} onChange={e => updateColor(idx, 'name', e.target.value)}
                          placeholder="Nama warna" className="flex-1 px-2 py-2 rounded-lg border border-border-color bg-bg-secondary text-xs focus:outline-none" />
                        {form.colors.length > 1 && (
                          <button onClick={() => removeColor(idx)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                            <Cancel01Icon width={14} height={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Tags (pisahkan koma)</label>
                  <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="brand, client, web" className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-violet-400 transition-colors" />
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button className="btn btn-secondary flex-1" onClick={() => { setShowModal(false); resetForm(); }}>Batal</button>
                <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving || !form.title.trim()} style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
                  {saving ? <Loading03Icon width={16} height={16} className="animate-spin" /> : <Add01Icon width={16} height={16} />}
                  {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Buat Palette'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <ConfirmModal isOpen={showDeleteModal} title="Hapus Palette?" message="Palette ini akan dihapus permanen."
        onConfirm={handleDelete} onCancel={() => { setShowDeleteModal(false); setDeleteTarget(null); }} />
    </div>
  );
}
