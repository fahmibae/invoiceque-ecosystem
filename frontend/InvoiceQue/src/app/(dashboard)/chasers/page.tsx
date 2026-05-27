'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chaserApi, type PaymentChaser, type ChaserStats, type ChaserLog, invoiceApi, type Invoice } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Alert01Icon, SentIcon, PauseIcon, PlayIcon, Delete02Icon, Cancel01Icon, Tick01Icon, TransactionHistoryIcon, MoreVerticalIcon } from 'hugeicons-react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Portal from '@/components/ui/Portal';

function ActionDropdown({ c, actionLoading, onLogs, onSend, onToggle, onDelete }: {
  c: PaymentChaser; actionLoading: string;
  onLogs: () => void; onSend: () => void; onToggle: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  const disabled = actionLoading === c.id;

  return (
    <div className="relative" ref={ref}>
      <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-secondary transition-colors" onClick={() => setOpen(v => !v)}>
        <MoreVerticalIcon width={18} height={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-border-color rounded-xl shadow-lg z-50 py-1.5 animate-fade-in">
          <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-bg-secondary text-left transition-colors" onClick={() => { onLogs(); close(); }}>
            <TransactionHistoryIcon width={16} height={16} className="text-text-tertiary" /> Riwayat
          </button>
          {c.status === 'active' && (
            <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-bg-secondary text-left transition-colors text-blue-600" onClick={() => { onSend(); close(); }} disabled={disabled}>
              <SentIcon width={16} height={16} /> Kirim Sekarang
            </button>
          )}
          {['active', 'paused'].includes(c.status) && (
            <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-bg-secondary text-left transition-colors" onClick={() => { onToggle(); close(); }} disabled={disabled}>
              {c.status === 'active' ? <><PauseIcon width={16} height={16} className="text-amber-500" /> <span className="text-amber-600">Jeda</span></> : <><PlayIcon width={16} height={16} className="text-emerald-500" /> <span className="text-emerald-600">Lanjutkan</span></>}
            </button>
          )}
          <div className="border-t border-border-light my-1" />
          <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 text-left transition-colors text-red-500" onClick={() => { onDelete(); close(); }}>
            <Delete02Icon width={16} height={16} /> Hapus
          </button>
        </div>
      )}
    </div>
  );
}

export default function ChasersPage() {
  const [chasers, setChasers] = useState<PaymentChaser[]>([]);
  const [stats, setStats] = useState<ChaserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<ChaserLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Pagination & selection
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cRes, sRes] = await Promise.all([chaserApi.list(undefined, 1, 200), chaserApi.stats()]);
      setChasers(cRes.data || []);
      setStats(sRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const totalPages = Math.max(1, Math.ceil(chasers.length / itemsPerPage));
  const paginated = chasers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    if (selected.size === paginated.length && paginated.length > 0) setSelected(new Set());
    else setSelected(new Set(paginated.map(c => c.id)));
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await chaserApi.bulkDelete(Array.from(selected));
      setSelected(new Set());
      setShowBulkDeleteModal(false);
      await fetchData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Gagal menghapus'); }
    setBulkDeleting(false);
  };

  const handleToggle = async (id: string) => {
    setActionLoading(id);
    try { await chaserApi.toggle(id); await fetchData(); } catch { }
    setActionLoading('');
  };

  const handleSendReminder = async (id: string) => {
    setActionLoading(id);
    try { await chaserApi.sendReminder(id); await fetchData(); } catch { }
    setActionLoading('');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget);
    try { await chaserApi.delete(deleteTarget); setShowDeleteModal(false); setDeleteTarget(null); await fetchData(); } catch { }
    setActionLoading('');
  };

  const openLogs = async (chaserId: string) => {
    setShowLogs(chaserId);
    setLogsLoading(true);
    try { const res = await chaserApi.getLogs(chaserId); setLogs(res.data || []); } catch { }
    setLogsLoading(false);
  };

  const openCreateModal = async () => {
    setShowCreateModal(true);
    setInvoicesLoading(true);
    try {
      const res = await invoiceApi.list(undefined, 0, 100);
      setInvoices((res.data || []).filter((i: Invoice) => i.status !== 'paid' && i.status !== 'draft'));
    } catch { }
    setInvoicesLoading(false);
  };

  const handleCreate = async () => {
    if (!selectedInvoiceId) return;
    setActionLoading('creating');
    try { await chaserApi.create(selectedInvoiceId); setShowCreateModal(false); setSelectedInvoiceId(''); await fetchData(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Gagal membuat chaser'); }
    setActionLoading('');
  };

  const scheduleLabel = (schedule: string): string => {
    try { const arr = JSON.parse(schedule); return arr.map((d: number) => d < 0 ? `H${d}` : d === 0 ? 'H-Day' : `H+${d}`).join(', '); }
    catch { return schedule; }
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>Memuat data chaser...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmModal isOpen={showDeleteModal} title="Hapus Chaser" message="Apakah Anda yakin ingin menghapus chaser ini?" confirmText="Hapus" onConfirm={handleDelete} onCancel={() => setShowDeleteModal(false)} isLoading={!!actionLoading} type="danger" />
      <ConfirmModal isOpen={showBulkDeleteModal} title="Hapus Chaser" message={`Apakah Anda yakin ingin menghapus ${selected.size} chaser terpilih?`} confirmText={`Hapus ${selected.size} Chaser`} onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteModal(false)} isLoading={bulkDeleting} type="danger" />

      {/* Logs Modal */}
      {showLogs && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-5" onClick={() => setShowLogs(null)}>
            <div className="bg-bg-card w-full max-w-[600px] rounded-2xl shadow-xl border border-border-color animate-fade-in max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
                <h3 className="text-lg font-bold">Riwayat Reminder</h3>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary" onClick={() => setShowLogs(null)}><Cancel01Icon width={20} height={20} /></button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-4">
                {logsLoading ? (
                  <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div></div>
                ) : logs.length === 0 ? (
                  <p className="text-center text-text-tertiary py-8">Belum ada reminder terkirim</p>
                ) : (
                  <div className="space-y-3">
                    {logs.map(log => (
                      <div key={log.id} className="flex items-start gap-3 p-3 bg-bg-secondary rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${log.status === 'sent' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {log.status === 'sent' ? <Tick01Icon width={16} height={16} /> : <Cancel01Icon width={16} height={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase text-text-tertiary">{log.reminder_type}</span>
                            <span className="text-xs text-text-tertiary">via {log.channel}</span>
                          </div>
                          <p className="text-sm text-text-secondary truncate">{log.message}</p>
                          <p className="text-xs text-text-tertiary mt-1">{log.sent_at ? formatDate(log.sent_at) : '-'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-5" onClick={() => setShowCreateModal(false)}>
            <div className="bg-bg-card w-full max-w-[500px] rounded-2xl shadow-xl border border-border-color animate-fade-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
                <h3 className="text-lg font-bold">Buat Payment Chaser</h3>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary" onClick={() => setShowCreateModal(false)}><Cancel01Icon width={20} height={20} /></button>
              </div>
              <div className="px-6 py-5">
                <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Pilih Invoice</label>
                {invoicesLoading ? (
                  <div className="flex justify-center py-4"><div className="w-6 h-6 border-3 border-red-200 border-t-red-600 rounded-full animate-spin"></div></div>
                ) : invoices.length === 0 ? (
                  <p className="text-sm text-text-tertiary py-4">Tidak ada invoice yang memenuhi syarat</p>
                ) : (
                  <select className="w-full py-3 px-3 border border-border-color rounded-md bg-bg-card text-sm" value={selectedInvoiceId} onChange={e => setSelectedInvoiceId(e.target.value)}>
                    <option value="">-- Pilih Invoice --</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.number} — {inv.client_name} — {formatCurrency(inv.amount_remaining, inv.currency)}</option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-text-tertiary mt-3">Jadwal default: <strong>H-3, H-Day, H+3, H+7, H+14</strong></p>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border-light">
                <button className="btn btn-secondary flex-1" onClick={() => setShowCreateModal(false)}>Batal</button>
                <button className="btn btn-primary flex-1" onClick={handleCreate} disabled={!selectedInvoiceId || actionLoading === 'creating'}>
                  {actionLoading === 'creating' ? 'Membuat...' : 'Buat Chaser'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Smart Payment Chaser</h1>
          <p className="page-subtitle">Otomatisasi pengingat pembayaran untuk setiap invoice</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}><span>＋</span> Buat Chaser</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 max-sm:gap-2.5">
          <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <span className="text-xs text-text-tertiary font-medium">Aktif</span>
            <p className="text-2xl max-sm:text-lg font-extrabold text-emerald-600 mt-1">{stats.active}</p>
          </div>
          <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <span className="text-xs text-text-tertiary font-medium">Dijeda</span>
            <p className="text-2xl max-sm:text-lg font-extrabold text-amber-600 mt-1">{stats.paused}</p>
          </div>
          <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <span className="text-xs text-text-tertiary font-medium">Total Reminder</span>
            <p className="text-2xl max-sm:text-lg font-extrabold mt-1">{stats.total_reminders_sent}</p>
          </div>
          <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <span className="text-xs text-text-tertiary font-medium">Nilai Dikejar</span>
            <p className="text-2xl max-sm:text-lg font-extrabold text-red-600 mt-1">{formatCurrency(stats.total_amount_chasing)}</p>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4 animate-fade-in">
          <span className="text-sm font-medium text-red-700 dark:text-red-400">{selected.size} terpilih</span>
          <div className="flex gap-2">
            <button className="text-xs px-3 py-1.5 rounded-md bg-white dark:bg-bg-card border border-border-color hover:bg-bg-secondary transition-colors" onClick={() => setSelected(new Set())}>Batal</button>
            <button className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1" onClick={() => setShowBulkDeleteModal(true)}>
              <Delete02Icon width={14} height={14} /> Hapus Terpilih
            </button>
          </div>
        </div>
      )}

      {/* Chasers list */}
      {chasers.length > 0 ? (
        <div className="space-y-3">
          {/* Select all */}
          <div className="flex items-center gap-3 px-1">
            <input type="checkbox" className="w-4 h-4 accent-red-600 rounded" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleSelectAll} />
            <span className="text-xs text-text-tertiary font-medium">Pilih Semua</span>
          </div>
          {paginated.map(c => (
            <div key={c.id} className={`bg-bg-card border rounded-lg p-4 md:p-5 shadow-sm hover:shadow-md transition-all ${selected.has(c.id) ? 'border-red-400 bg-red-50/30 dark:bg-red-950/10' : 'border-border-color'}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="w-4 h-4 accent-red-600 rounded mt-2.5 shrink-0" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} />
                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${c.status === 'active' ? 'bg-emerald-100 text-emerald-600' : c.status === 'paused' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                  <Alert01Icon width={18} height={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-sm text-red-600 truncate">{c.invoice_number}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : c.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{c.status}</span>
                    </div>
                    <ActionDropdown c={c} actionLoading={actionLoading} onLogs={() => openLogs(c.id)} onSend={() => handleSendReminder(c.id)} onToggle={() => handleToggle(c.id)} onDelete={() => { setDeleteTarget(c.id); setShowDeleteModal(true); }} />
                  </div>
                  <p className="text-sm text-text-secondary truncate mt-0.5">{c.client_name} — {formatCurrency(c.amount_due, c.currency)}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-2 text-xs text-text-tertiary">
                    <span>Jatuh tempo: {c.due_date || '-'}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>Jadwal: {scheduleLabel(c.schedule)}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{c.total_reminders_sent}x dikirim</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card flex flex-col justify-center items-center text-center py-16 px-5">
          <div className="text-5xl mb-4 opacity-50"><Alert01Icon width={48} height={48} /></div>
          <h3 className="text-lg font-semibold mb-2">Belum ada Payment Chaser</h3>
          <p className="text-sm text-text-secondary mb-6">Buat chaser untuk invoice belum terbayar agar pengingat terkirim otomatis</p>
          <button className="btn btn-primary" onClick={openCreateModal}>Buat Chaser</button>
        </div>
      )}

      {/* Pagination */}
      {chasers.length > itemsPerPage && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border border-border-color bg-bg-card rounded-lg">
          <div className="text-sm text-text-secondary text-center sm:text-left">
            Menampilkan <span className="font-semibold text-text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-text-primary">{Math.min(currentPage * itemsPerPage, chasers.length)}</span> dari <span className="font-semibold text-text-primary">{chasers.length}</span> data
          </div>
          <div className="flex gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
            <button className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-border-color rounded-md bg-bg-secondary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors" onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); setSelected(new Set()); }} disabled={currentPage === 1}>Sebelumnya</button>
            <div className="flex items-center justify-center px-3 text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 rounded-md min-w-[50px]">{currentPage} / {totalPages}</div>
            <button className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-border-color rounded-md bg-bg-secondary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors" onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); setSelected(new Set()); }} disabled={currentPage === totalPages}>Selanjutnya</button>
          </div>
        </div>
      )}
    </div>
  );
}
