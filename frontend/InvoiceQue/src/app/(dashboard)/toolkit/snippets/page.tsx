'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  SourceCodeIcon, Add01Icon, Cancel01Icon, Search01Icon,
  Delete02Icon, CheckmarkBadge01Icon, Copy01Icon, MoreVerticalIcon,
  Loading03Icon, ArrowLeft01Icon, CheckmarkBadge02Icon,
} from 'hugeicons-react';
import Portal from '@/components/ui/Portal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toolkitApi, type ToolkitItem } from '@/lib/api';

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'rust', 'go', 'java',
  'php', 'ruby', 'swift', 'kotlin', 'sql', 'html', 'css',
  'bash', 'json', 'yaml', 'dockerfile', 'other',
];

const LANG_COLORS: Record<string, string> = {
  javascript: '#F7DF1E', typescript: '#3178C6', python: '#3776AB',
  rust: '#DEA584', go: '#00ADD8', java: '#ED8B00', php: '#777BB4',
  ruby: '#CC342D', swift: '#FA7343', kotlin: '#7F52FF', sql: '#336791',
  html: '#E34F26', css: '#1572B6', bash: '#4EAA25', json: '#292929',
  yaml: '#CB171E', dockerfile: '#2496ED', other: '#6B7280',
};

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedSnippet, setExpandedSnippet] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '', language: 'javascript', code: '', description: '', tags: '',
  });

  const fetchSnippets = useCallback(async () => {
    try {
      const res = await toolkitApi.list({
        type: 'snippet', search: search || undefined,
        language: langFilter || undefined, per_page: 100,
      });
      setSnippets(res.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [search, langFilter]);

  useEffect(() => { fetchSnippets(); }, [fetchSnippets]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: '', language: 'javascript', code: '', description: '', tags: '' });
    setShowModal(true);
  };

  const openEdit = (item: ToolkitItem) => {
    setEditingId(item.id);
    const content = item.content as unknown as Record<string, string>;
    setForm({
      title: item.title,
      language: item.language || 'javascript',
      code: content?.code || '',
      description: content?.description || '',
      tags: (item.tags || []).join(', '),
    });
    setShowModal(true);
    setMenuOpen(null);
  };

  const saveSnippet = async () => {
    if (!form.title.trim() || !form.code.trim() || saving) return;
    setSaving(true);
    try {
      const data = {
        toolkit_type: 'snippet' as const,
        title: form.title,
        language: form.language,
        content: { code: form.code, description: form.description },
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      if (editingId) {
        await toolkitApi.update(editingId, data);
      } else {
        await toolkitApi.create(data);
      }
      setShowModal(false);
      fetchSnippets();
    } catch { /* error */ }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await toolkitApi.delete(deleteTarget); fetchSnippets(); } catch { /* error */ }
    setDeleteTarget(null);
    setShowDeleteModal(false);
  };

  const toggleFavorite = async (item: ToolkitItem) => {
    try {
      await toolkitApi.update(item.id, { is_favorited: !item.is_favorited });
      fetchSnippets();
    } catch { /* error */ }
  };

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const usedLanguages = [...new Set(snippets.map(s => s.language).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loading03Icon width={32} height={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmModal isOpen={showDeleteModal} title="Hapus Snippet" message="Apakah Anda yakin ingin menghapus snippet ini?" confirmText="Hapus" onConfirm={handleDelete} onCancel={() => { setShowDeleteModal(false); setDeleteTarget(null); }} type="danger" />

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/toolkit" className="text-text-tertiary hover:text-text-primary transition-colors">
              <ArrowLeft01Icon width={20} height={20} />
            </Link>
            <h1 className="page-title flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <SourceCodeIcon width={22} height={22} />
              </span>
              Code Snippets
            </h1>
          </div>
          <p className="page-subtitle ml-[52px]">{snippets.length} snippet tersimpan</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" onClick={openCreate}>
            <Add01Icon width={16} height={16} /> Snippet Baru
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search01Icon width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            className="w-full py-2.5 pl-9 pr-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-blue-400 transition-colors"
            placeholder="Cari snippet..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setLangFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!langFilter ? 'bg-blue-600 text-white shadow-md' : 'bg-bg-secondary text-text-secondary hover:bg-bg-hover'}`}
          >
            Semua
          </button>
          {usedLanguages.map(lang => (
            <button
              key={lang}
              onClick={() => setLangFilter(langFilter === lang ? '' : lang)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${langFilter === lang ? 'bg-blue-600 text-white shadow-md' : 'bg-bg-secondary text-text-secondary hover:bg-bg-hover'}`}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: LANG_COLORS[lang] || '#6B7280' }} />
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Snippet Cards */}
      {snippets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
          <SourceCodeIcon width={48} height={48} className="mb-4 opacity-30" />
          <p className="font-bold text-lg mb-1">Belum ada snippet</p>
          <p className="text-sm mb-4">Simpan potongan kode yang sering kamu pakai</p>
          <button className="btn btn-primary" onClick={openCreate}>
            <Add01Icon width={16} height={16} /> Buat Snippet Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {snippets.map(snippet => {
            const content = snippet.content as unknown as Record<string, string>;
            const code = content?.code || '';
            const desc = content?.description || '';
            const isExpanded = expandedSnippet === snippet.id;
            const langColor = LANG_COLORS[snippet.language] || '#6B7280';

            return (
              <div key={snippet.id} className="card group relative overflow-hidden hover:shadow-lg transition-all duration-200">
                {/* Top bar */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: langColor }} />
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: langColor }}>{snippet.language}</span>
                    {snippet.is_favorited && <CheckmarkBadge02Icon width={14} height={14} className="text-amber-500" />}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyCode(snippet.id, code)}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-bg-hover transition-colors text-text-tertiary hover:text-blue-600"
                      title="Copy code"
                    >
                      <Copy01Icon width={14} height={14} />
                    </button>
                    {copied === snippet.id && (
                      <span className="text-[10px] font-bold text-emerald-600 animate-fade-in">Copied!</span>
                    )}
                    <div className="relative">
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-bg-hover transition-all text-text-tertiary"
                        onClick={() => setMenuOpen(menuOpen === snippet.id ? null : snippet.id)}
                      >
                        <MoreVerticalIcon width={14} height={14} />
                      </button>
                      {menuOpen === snippet.id && (
                        <div className="absolute right-0 top-8 w-44 bg-bg-card border border-border-color rounded-lg shadow-lg z-50 py-1 animate-fade-in">
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors" onClick={() => openEdit(snippet)}>
                            ✏️ Edit
                          </button>
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors" onClick={() => { toggleFavorite(snippet); setMenuOpen(null); }}>
                            <CheckmarkBadge01Icon width={14} height={14} /> {snippet.is_favorited ? 'Unfavorite' : 'Favorite'}
                          </button>
                          <div className="border-t border-border-light my-1" />
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={() => { setDeleteTarget(snippet.id); setShowDeleteModal(true); setMenuOpen(null); }}>
                            <Delete02Icon width={14} height={14} /> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Title & description */}
                <h4 className="text-sm font-bold text-text-primary mb-1">{snippet.title}</h4>
                {desc && <p className="text-xs text-text-tertiary mb-3 line-clamp-2">{desc}</p>}

                {/* Code block */}
                <div
                  className="relative rounded-lg bg-slate-900 dark:bg-slate-950 p-4 overflow-hidden cursor-pointer transition-all duration-200"
                  style={{ maxHeight: isExpanded ? '600px' : '120px' }}
                  onClick={() => setExpandedSnippet(isExpanded ? null : snippet.id)}
                >
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all leading-relaxed overflow-hidden">
                    <code>{code}</code>
                  </pre>
                  {!isExpanded && code.split('\n').length > 5 && (
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-900 dark:from-slate-950 to-transparent" />
                  )}
                </div>

                {/* Tags */}
                {snippet.tags && snippet.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {snippet.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/20">{tag}</span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light text-[11px] text-text-tertiary">
                  <span>{new Date(snippet.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>{code.split('\n').length} baris</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5" onClick={() => setShowModal(false)}>
            <div className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[640px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <SourceCodeIcon width={20} height={20} className="text-blue-600" />
                  {editingId ? 'Edit Snippet' : 'Snippet Baru'}
                </h3>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors" onClick={() => setShowModal(false)}>
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Judul *</label>
                  <input className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-blue-400 transition-colors" placeholder="Contoh: React useDebounce Hook"
                    value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Bahasa</label>
                    <select className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-blue-400 transition-colors"
                      value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}>
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Tags (pisahkan koma)</label>
                    <input className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-blue-400 transition-colors" placeholder="react, hooks, util"
                      value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Deskripsi</label>
                  <input className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-blue-400 transition-colors" placeholder="Penjelasan singkat tentang snippet ini"
                    value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Kode *</label>
                  <textarea
                    className="w-full py-3 px-4 border border-border-color rounded-lg bg-slate-900 dark:bg-slate-950 text-sm outline-none focus:border-blue-400 transition-colors resize-none font-mono text-slate-300 leading-relaxed"
                    rows={12}
                    placeholder="// Paste code here..."
                    value={form.code}
                    onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                    spellCheck={false}
                  />
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>Batal</button>
                <button className="btn btn-primary flex-1" onClick={saveSnippet} disabled={!form.title.trim() || !form.code.trim() || saving} style={{ background: 'linear-gradient(135deg, #3B82F6, #4F46E5)' }}>
                  {saving ? <Loading03Icon width={16} height={16} className="animate-spin" /> : <Add01Icon width={16} height={16} />}
                  {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Snippet'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
