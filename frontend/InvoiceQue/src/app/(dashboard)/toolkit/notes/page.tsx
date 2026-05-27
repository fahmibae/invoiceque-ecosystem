'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft01Icon, Add01Icon, Delete02Icon, Search01Icon,
  Loading03Icon, StickyNote02Icon, Edit02Icon, Cancel01Icon,
  CheckmarkCircle02Icon, StarIcon, PinIcon,
} from 'hugeicons-react';
import Portal from '@/components/ui/Portal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toolkitApi, type ToolkitItem, type CreateToolkitItemRequest } from '@/lib/api';

export default function QuickNotesPage() {
  const [notes, setNotes] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState('#FEF3C7');

  const NOTE_COLORS = [
    { value: '#FEF3C7', label: 'Yellow' },
    { value: '#DBEAFE', label: 'Blue' },
    { value: '#D1FAE5', label: 'Green' },
    { value: '#FCE7F3', label: 'Pink' },
    { value: '#E0E7FF', label: 'Indigo' },
    { value: '#FEE2E2', label: 'Red' },
    { value: '#F3F4F6', label: 'Gray' },
    { value: '#FFFFFF', label: 'White' },
  ];

  const fetchNotes = useCallback(async () => {
    try {
      const res = await toolkitApi.list({ type: 'note', search: search || undefined, per_page: 100 });
      setNotes(res.data || []);
    } catch { /* ignore */ }
  }, [search]);

  useEffect(() => {
    fetchNotes().finally(() => setLoading(false));
  }, [fetchNotes]);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setColor('#FEF3C7');
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (note: ToolkitItem) => {
    setTitle(note.title);
    setBody((note.content?.body as string) || '');
    setColor((note.content?.color as string) || '#FEF3C7');
    setEditingId(note.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const data: CreateToolkitItemRequest = {
        toolkit_type: 'note',
        title: title.trim(),
        content: { body, color },
      };
      if (editingId) {
        await toolkitApi.update(editingId, data);
      } else {
        await toolkitApi.create(data);
      }
      resetForm();
      fetchNotes();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const toggleFavorite = async (note: ToolkitItem) => {
    try {
      await toolkitApi.update(note.id, { is_favorited: !note.is_favorited });
      fetchNotes();
    } catch { /* ignore */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await toolkitApi.delete(deleteTarget); fetchNotes(); } catch { /* ignore */ }
    setDeleteTarget(null);
    setShowDeleteModal(false);
  };

  const requestDelete = (id: string) => {
    setDeleteTarget(id);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loading03Icon width={32} height={32} className="animate-spin text-yellow-500" />
      </div>
    );
  }

  const pinnedNotes = notes.filter((n) => n.is_favorited);
  const otherNotes = notes.filter((n) => !n.is_favorited);

  return (
    <div className="animate-fade-in">
      <ConfirmModal isOpen={showDeleteModal} title="Hapus Note" message="Apakah Anda yakin ingin menghapus note ini?" confirmText="Hapus" onConfirm={handleDelete} onCancel={() => { setShowDeleteModal(false); setDeleteTarget(null); }} type="danger" />

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-3">
            <Link href="/toolkit" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
              <ArrowLeft01Icon width={20} height={20} />
            </Link>
            <h1 className="page-title flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-400/20">
                <StickyNote02Icon width={22} height={22} />
              </span>
              Quick Notes
            </h1>
          </div>
          <p className="page-subtitle">Catatan cepat, ide, meeting notes — simpan semuanya di sini</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Add01Icon width={16} height={16} /> Buat Note
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search01Icon width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Cari notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>
      </div>

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <PinIcon width={14} height={14} className="text-text-tertiary" />
            <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Pinned</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {pinnedNotes.map((note) => (
              <NoteCard key={note.id} note={note} onEdit={openEdit} onDelete={requestDelete} onTogglePin={toggleFavorite} />
            ))}
          </div>
        </>
      )}

      {/* All Notes */}
      {otherNotes.length > 0 && (
        <>
          {pinnedNotes.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Others</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {otherNotes.map((note) => (
              <NoteCard key={note.id} note={note} onEdit={openEdit} onDelete={requestDelete} onTogglePin={toggleFavorite} />
            ))}
          </div>
        </>
      )}

      {notes.length === 0 && (
        <div className="card p-12 text-center">
          <StickyNote02Icon width={48} height={48} className="mx-auto text-text-tertiary mb-3 opacity-40" />
          <p className="text-text-tertiary font-medium">Belum ada notes</p>
          <p className="text-text-tertiary text-xs mt-1">Tulis catatan, ide, atau meeting notes pertamamu</p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5" onClick={() => resetForm()}>
            <div className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[520px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <StickyNote02Icon width={20} height={20} className="text-amber-500" />
                  {editingId ? 'Edit Note' : 'Buat Note Baru'}
                </h3>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors" onClick={resetForm}><Cancel01Icon width={20} height={20} /></button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Judul *</label>
                  <input className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-amber-400 transition-colors" placeholder="Judul note" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Isi Note</label>
                  <textarea className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-amber-400 transition-colors resize-none" rows={6} placeholder="Tulis catatan kamu di sini..." value={body} onChange={(e) => setBody(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Warna</label>
                  <div className="flex gap-2">
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        className="w-7 h-7 rounded-lg border-2 transition-all"
                        style={{ backgroundColor: c.value, borderColor: color === c.value ? '#3B82F6' : 'transparent', transform: color === c.value ? 'scale(1.15)' : 'scale(1)' }}
                        onClick={() => setColor(c.value)}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button className="btn btn-secondary flex-1" onClick={resetForm}>Batal</button>
                <button className="btn btn-primary flex-1" onClick={handleSubmit} disabled={!title.trim() || saving} style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)' }}>
                  {saving ? <Loading03Icon width={16} height={16} className="animate-spin" /> : <CheckmarkCircle02Icon width={16} height={16} />}
                  {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Note'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

function NoteCard({ note, onEdit, onDelete, onTogglePin }: {
  note: ToolkitItem;
  onEdit: (n: ToolkitItem) => void;
  onDelete: (id: string) => void;
  onTogglePin: (n: ToolkitItem) => void;
}) {
  const bgColor = (note.content?.color as string) || '#FEF3C7';
  const body = (note.content?.body as string) || '';
  const isDark = ['#1F2937', '#111827'].includes(bgColor);

  return (
    <div
      className="rounded-2xl p-4 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group relative border border-black/5"
      style={{ backgroundColor: bgColor, minHeight: 140 }}
      onClick={() => onEdit(note)}
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-1.5 rounded-lg bg-white/80 hover:bg-white shadow-sm transition-colors"
          onClick={(e) => { e.stopPropagation(); onTogglePin(note); }}
          title={note.is_favorited ? 'Unpin' : 'Pin'}
        >
          <PinIcon width={12} height={12} className={note.is_favorited ? 'text-blue-600' : 'text-gray-500'} />
        </button>
        <button
          className="p-1.5 rounded-lg bg-white/80 hover:bg-white shadow-sm transition-colors"
          onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
        >
          <Delete02Icon width={12} height={12} className="text-red-500" />
        </button>
      </div>
      <h3 className={`font-bold text-sm mb-2 line-clamp-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
        {note.is_favorited && <PinIcon width={12} height={12} className="inline mr-1 text-blue-600" />}
        {note.title}
      </h3>
      <p className={`text-xs leading-relaxed line-clamp-5 whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
        {body || 'Empty note...'}
      </p>
      <div className={`text-[10px] mt-3 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
        {new Date(note.updated_at || note.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
    </div>
  );
}
