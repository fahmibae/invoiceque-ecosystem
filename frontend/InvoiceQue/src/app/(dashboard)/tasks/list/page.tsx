'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Task01Icon, Add01Icon, Search01Icon,
  GoogleDocIcon, Delete02Icon, ViewIcon, Loading03Icon, SentIcon, Tick02Icon,
} from 'hugeicons-react';
import Portal from '@/components/ui/Portal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { taskApi, projectApi, type Task, type Project } from '@/lib/api';
import { formatCurrency, convertToIDR, fetchExchangeRates } from '@/lib/utils';


const statusLabels: Record<string, string> = {
  backlog: 'Backlog', todo: 'To Do', inprogress: 'Sedang Dikerjakan', done: 'Selesai',
};

const priorityConfig: Record<string, { label: string; cls: string }> = {
  high: { label: 'Tinggi', cls: 'bg-red-50 text-red-600 dark:bg-red-900/20' },
  medium: { label: 'Sedang', cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' },
  low: { label: 'Rendah', cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' },
};

export default function TasksListPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingTask, setBillingTask] = useState<Task | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ backlog: 0, todo: 0, inprogress: 0, done: 0, total: 0 });
  const perPage = 10;
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
 
  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await taskApi.list({ status: filterStatus || undefined, priority: filterPriority || undefined, search: search || undefined, page: currentPage, per_page: perPage });
        setTasks(res.data);
        setTotal(res.total);
        setTotalPages(res.total_pages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat payment links');
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
    fetchExchangeRates().then(setExchangeRates);
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taskApi.list({ status: filterStatus || undefined, priority: filterPriority || undefined, search: search || undefined, page: currentPage, per_page: perPage });
      setTasks(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [search, filterStatus, filterPriority, currentPage, exchangeRates, fetchExchangeRates]);

  const fetchStats = useCallback(async () => {
    try { const s = await taskApi.stats(); setStats(s); } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setCurrentPage(1); }, [search, filterStatus, filterPriority]);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const toggleSelectAll = () => {
    if (selected.size === tasks.length && tasks.length > 0) setSelected(new Set());
    else setSelected(new Set(tasks.map(t => t.id)));
  };

  const handleBulkDelete = async () => {
    try { await taskApi.bulkDelete(Array.from(selected)); setSelected(new Set()); fetchTasks(); fetchStats(); } catch { /* err */ }
    setShowDeleteModal(false);
  };

  const moveTask = async (taskId: string, toStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    try {
      await taskApi.update(taskId, { status: toStatus as Task['status'] });
      fetchTasks(); fetchStats();
      if (task?.project_id) syncProjectStatus(task.project_id);
    } catch { /* err */ }
  };

  const syncProjectStatus = async (projectId: string) => {
    try {
      const res = await taskApi.list({ per_page: 200 });
      const projectTasks = res.data.filter(t => t.project_id === projectId);
      if (projectTasks.length === 0) return;
      const allDone = projectTasks.every(t => t.status === 'done');
      const anyActive = projectTasks.some(t => t.status === 'inprogress' || t.status === 'todo');
      let newStatus: Project['status'];
      if (allDone) newStatus = 'completed';
      else if (anyActive) newStatus = 'active';
      else return;
      await projectApi.update(projectId, { status: newStatus });
    } catch { /* silent */ }
  };

  const openBillingModal = (task: Task) => {
    setBillingTask(task);
    setShowBillingModal(true);
  };

  const openTaskBilling = async (kind: 'quotation' | 'invoice') => {
    if (!billingTask) return;
    const amount = (billingTask.hourly_rate || 0) * (billingTask.estimated_hours || 0);
    const params = new URLSearchParams({
      from_task: 'true', task_title: billingTask.title, task_project: billingTask.project_name,
      client_name: billingTask.client_name || '', client_id: billingTask.client_id || '',
      item_desc: `${billingTask.title} — ${billingTask.project_name}`,
      item_qty: String(billingTask.estimated_hours || 1),
      item_price: String(billingTask.hourly_rate || 0), amount: String(amount),
      currency: billingTask.currency || 'IDR',
    });
    try { await taskApi.update(billingTask.id, { invoice_generated: true }); } catch { /* silent */ }
    setShowBillingModal(false);
    setBillingTask(null);
    fetchTasks(); fetchStats();
    router.push(kind === 'quotation' ? `/quotations/create?${params.toString()}` : `/invoices/create?${params.toString()}`);
  };

  const totalEstimated = tasks.reduce((sum, t) => sum + (convertToIDR(t.hourly_rate || 0, t.currency ?? 'IDR', exchangeRates ?? undefined) * (t.estimated_hours || 0)), 0);

  const statusColors: Record<string, string> = { backlog: '#9CA3AF', todo: '#3B82F6', inprogress: '#F59E0B', done: '#10B981' };

  return (
    <div className="animate-fade-in">
      <ConfirmModal isOpen={showDeleteModal} title="Hapus Tugas" message={`Hapus ${selected.size} tugas terpilih?`}
        confirmText={`Hapus ${selected.size} Tugas`} onConfirm={handleBulkDelete} onCancel={() => setShowDeleteModal(false)} type="danger" />

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Daftar Tugas</h1>
          <p className="page-subtitle">{total} tugas · Estimasi {formatCurrency(totalEstimated, 'IDR',)}</p>
        </div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button className="btn btn-secondary border-red-500 text-red-500" onClick={() => setShowDeleteModal(true)}>
              <Delete02Icon width={16} height={16} color="red" /> Hapus {selected.size}
            </button>
          )}
          <Link href="/tasks" className="btn btn-secondary btn-sm"><ViewIcon width={16} height={16} /> Kanban</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Object.entries(statusLabels).map(([key, label]) => (
          <div key={key} className="bg-bg-card border border-border-color rounded-lg p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: statusColors[key] }} />
            <div>
              <div className="text-lg font-extrabold">{stats[key as keyof typeof stats] || 0}</div>
              <div className="text-xs text-text-tertiary font-medium">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"><Search01Icon width={18} height={18} /></span>
          <input type="text" placeholder="Cari tugas atau proyek..."
            className="w-full py-3 pr-4 pl-11 border border-border-color rounded-md bg-bg-card text-sm outline-none focus:border-red-400 transition-colors"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="py-3 px-4 border border-border-color rounded-md bg-bg-card text-sm outline-none focus:border-red-400"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Semua Status</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="py-3 px-4 border border-border-color rounded-md bg-bg-card text-sm outline-none focus:border-red-400"
          value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">Semua Prioritas</option>
          <option value="high">Tinggi</option>
          <option value="medium">Sedang</option>
          <option value="low">Rendah</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loading03Icon width={32} height={32} className="animate-spin text-red-500" /></div>
      ) : tasks.length > 0 ? (
        <div className="table-container shadow-sm bg-bg-card border border-border-color rounded-lg overflow-x-auto">
          <table className="table w-full border-collapse">
            <thead>
              <tr>
                <th className="w-10 px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color">
                  <input type="checkbox" checked={selected.size === tasks.length && tasks.length > 0} onChange={toggleSelectAll} className="cursor-pointer" />
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color">Tugas</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color">Proyek</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color">Prioritas</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color">Estimasi</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color">Deadline</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-text-tertiary bg-bg-tertiary border-b border-border-color">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => {
                const pri = priorityConfig[t.priority];
                const estAmount = (t.hourly_rate || 0) * (t.estimated_hours || 0);
                return (
                  <tr key={t.id} className="border-b border-border-light hover:bg-bg-hover transition-colors">
                    <td className="px-5 py-4"><input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} className="cursor-pointer" /></td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-sm text-text-primary">{t.title}</div>
                      <div className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{t.description}</div>
                    </td>
                    <td className="px-5 py-4"><span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-red-50 text-red-600 dark:bg-red-900/20">{t.project_name || '-'}</span></td>
                    <td className="px-5 py-4"><span className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${pri?.cls || ''}`}>{pri?.label || t.priority}</span></td>
                    <td className="px-5 py-4">
                      <select className="text-xs font-semibold px-2.5 py-1.5 rounded-md border border-border-color bg-bg-secondary outline-none focus:border-red-400 cursor-pointer"
                        value={t.status} onChange={e => moveTask(t.id, e.target.value)}>
                        {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {estAmount > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-text-primary">{t.currency || 'IDR'} {estAmount.toLocaleString('id-ID')}</span>
                          <span className="text-[10px] text-text-tertiary">{t.estimated_hours}h × {t.currency || 'IDR'} {(t.hourly_rate || 0).toLocaleString('id-ID')}</span>
                        </div>
                      ) : <span className="text-text-tertiary text-xs">-</span>}
                    </td>
                    <td className="px-5 py-4 text-[13px] text-text-secondary">{t.due_date ? new Date(t.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1 justify-center items-center">
                        {t.invoice_generated && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md" title="Invoice sudah dibuat">
                            <Tick02Icon width={14} height={14} /> Dibuat
                          </span>
                        )}
                        {t.status === 'done' && estAmount > 0 && !t.invoice_generated && (
                          <button className="btn btn-ghost btn-sm hover:text-red-600" title="Generate Invoice / Quotation" onClick={() => openBillingModal(t)}>
                            <GoogleDocIcon width={16} height={16} className="text-red-600" />
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm hover:text-red-500" title="Hapus"
                          onClick={async () => { await taskApi.delete(t.id); fetchTasks(); fetchStats(); }}>
                          <Delete02Icon width={16} height={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card flex flex-col justify-center items-center text-center py-16 px-5">
          <Task01Icon width={48} height={48} className="mb-4 opacity-30" />
          <h3 className="text-lg font-semibold mb-2">Belum ada tugas</h3>
          <p className="text-sm text-text-secondary mb-6">Buka Kanban Board untuk membuat tugas pertama</p>
          <Link href="/tasks" className="btn btn-primary">Buka Kanban Board</Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border border-border-color bg-bg-card rounded-lg">
          <div className="text-sm text-text-secondary">
            Menampilkan <span className="font-semibold text-text-primary">{(currentPage - 1) * perPage + 1}</span> - <span className="font-semibold text-text-primary">{Math.min(currentPage * perPage, total)}</span> dari <span className="font-semibold text-text-primary">{total}</span>
          </div>
          <div className="flex gap-1.5">
            <button className="px-3 py-1.5 text-sm border border-border-color rounded-md bg-bg-secondary disabled:opacity-50 hover:bg-bg-hover transition-colors"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Sebelumnya</button>
            <div className="flex items-center px-3 text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 rounded-md min-w-[50px] justify-center">{currentPage} / {totalPages}</div>
            <button className="px-3 py-1.5 text-sm border border-border-color rounded-md bg-bg-secondary disabled:opacity-50 hover:bg-bg-hover transition-colors"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Selanjutnya</button>
          </div>
        </div>
      )}

      {/* Billing Choice Modal */}
      {showBillingModal && billingTask && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-5" onClick={() => { setShowBillingModal(false); setBillingTask(null); }}>
            <div className="bg-bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border-color animate-fade-in" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-border-light">
                <h3 className="text-lg font-bold text-text-primary">Buat Dokumen dari Tugas</h3>
                <p className="text-sm text-text-secondary mt-1">
                  <span className="font-semibold">{billingTask.title}</span> — {billingTask.currency} {((billingTask.hourly_rate || 0) * (billingTask.estimated_hours || 0)).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-6 flex flex-col gap-3">
                <button
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-border-color hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all group text-left"
                  onClick={() => openTaskBilling('quotation')}>
                  <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
                    <SentIcon width={24} height={24} />
                  </div>
                  <div>
                    <div className="font-bold text-text-primary">Buat Quotation</div>
                    <div className="text-xs text-text-secondary mt-1">Siapkan penawaran terlebih dahulu sebelum invoice.</div>
                  </div>
                </button>
                <button
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-border-color hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group text-left"
                  onClick={() => openTaskBilling('invoice')}>
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                    <GoogleDocIcon width={24} height={24} />
                  </div>
                  <div>
                    <div className="font-bold text-text-primary">Langsung Invoice</div>
                    <div className="text-xs text-text-secondary mt-1">Buat invoice langsung untuk penagihan.</div>
                  </div>
                </button>
              </div>
              <div className="px-6 py-4 border-t border-border-light">
                <button className="btn btn-secondary w-full" onClick={() => { setShowBillingModal(false); setBillingTask(null); }}>Batal</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
