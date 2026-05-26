'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Task01Icon, Cancel01Icon, Add01Icon, MoreVerticalIcon,
  ArrowRight01Icon, GoogleDocIcon, Calendar03Icon,
  Clock01Icon, Delete02Icon, DragDropIcon,
  FilterIcon, Loading03Icon, SentIcon,
} from 'hugeicons-react';
import Portal from '@/components/ui/Portal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { taskApi, clientApi, projectApi, type Task, type Client, type Project } from '@/lib/api';
import { ALL_CURRENCIES } from '@/lib/currencies';

// ── Constants ─────────────────────────────────────────
const columnOrder = ['backlog', 'todo', 'inprogress', 'done'] as const;
const columnConfig: Record<string, { title: string; color: string }> = {
  backlog: { title: 'Backlog', color: '#9CA3AF' },
  todo: { title: 'To Do', color: '#3B82F6' },
  inprogress: { title: 'Sedang Dikerjakan', color: '#F59E0B' },
  done: { title: 'Selesai', color: '#10B981' },
};

const priorityConfig = {
  high: { label: 'Tinggi', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600' },
  medium: { label: 'Sedang', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600' },
  low: { label: 'Rendah', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600' },
};

type TasksByStatus = Record<string, Task[]>;

export default function TasksKanbanPage() {
  const router = useRouter();
  const [tasksByStatus, setTasksByStatus] = useState<TasksByStatus>({ backlog: [], todo: [], inprogress: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingTask, setBillingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ status: string; taskId: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '', description: '', priority: 'medium' as Task['priority'],
    project_name: '', project_id: '', due_date: '', status: 'todo' as Task['status'], tags: '',
    client_id: '', client_name: '', hourly_rate: '', estimated_hours: '', currency: 'IDR',
  });

  const fetchTasks = useCallback(async () => {
    try {
      const res = await taskApi.list({ per_page: 100 });
      const grouped: TasksByStatus = { backlog: [], todo: [], inprogress: [], done: [] };
      for (const t of res.data) {
        if (grouped[t.status]) grouped[t.status].push(t);
        else grouped.todo.push(t);
      }
      setTasksByStatus(grouped);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    clientApi.list('', 1, 100).then(res => setClients(res.data || [])).catch(() => {});
    projectApi.list({ per_page: 100 }).then(res => setProjects(res.data || [])).catch(() => {});
  }, []);

  const totalTasks = Object.values(tasksByStatus).reduce((sum, col) => sum + col.length, 0);
  const doneTasks = tasksByStatus.done?.length || 0;

  const addTask = async () => {
    if (!newTask.title.trim() || saving) return;
    setSaving(true);
    try {
      await taskApi.create({
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        project_name: newTask.project_name || 'Tanpa Proyek',
        project_id: newTask.project_id || undefined,
        client_id: newTask.client_id || undefined,
        client_name: newTask.client_name || undefined,
        due_date: newTask.due_date || undefined,
        hourly_rate: newTask.hourly_rate ? Number(newTask.hourly_rate) : 0,
        estimated_hours: newTask.estimated_hours ? Number(newTask.estimated_hours) : 0,
        currency: newTask.currency,
        tags: newTask.tags ? newTask.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        status: newTask.status,
      });
      setNewTask({ title: '', description: '', priority: 'medium', project_name: '', project_id: '', due_date: '', status: 'todo', tags: '', client_id: '', client_name: '', hourly_rate: '', estimated_hours: '', currency: 'IDR' });
      setShowModal(false);
      fetchTasks();
    } catch { /* error */ }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await taskApi.delete(deleteTarget.taskId);
      fetchTasks();
    } catch { /* error */ }
    setDeleteTarget(null);
    setShowDeleteModal(false);
  };

  const moveTask = async (taskId: string, toStatus: string) => {
    const task = Object.values(tasksByStatus).flat().find(t => t.id === taskId);
    try {
      await taskApi.update(taskId, { status: toStatus as Task['status'] });
      fetchTasks();
      // Sync project status based on task completion
      if (task?.project_id) {
        syncProjectStatus(task.project_id);
      }
    } catch { /* error */ }
    setMenuOpen(null);
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
      else return; // all backlog, don't change
      await projectApi.update(projectId, { status: newStatus });
    } catch { /* silent */ }
  };

  const openBillingModal = (task: Task) => {
    setBillingTask(task);
    setShowBillingModal(true);
    setMenuOpen(null);
  };

  const openTaskBilling = async (kind: 'quotation' | 'invoice') => {
    if (!billingTask) return;
    const amount = (billingTask.hourly_rate || 0) * (billingTask.estimated_hours || 0);
    const params = new URLSearchParams({
      from_task: 'true', task_title: billingTask.title, task_project: billingTask.project_name,
      client_name: billingTask.client_name || '', client_id: billingTask.client_id || '',
      item_desc: `${billingTask.title} — ${billingTask.project_name}`,
      item_qty: String(billingTask.estimated_hours || 1),
      item_price: String(billingTask.hourly_rate || 0),
      amount: String(amount),
      currency: billingTask.currency || 'IDR',
    });
    try { await taskApi.update(billingTask.id, { invoice_generated: true }); } catch { /* silent */ }
    setShowBillingModal(false);
    setBillingTask(null);
    fetchTasks();
    router.push(kind === 'quotation' ? `/quotations/create?${params.toString()}` : `/invoices/create?${params.toString()}`);
  };

  const getDaysUntilDue = (due?: string) => {
    if (!due) return null;
    return Math.ceil((new Date(due).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loading03Icon width={32} height={32} className="animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmModal isOpen={showDeleteModal} title="Hapus Tugas" message="Apakah Anda yakin ingin menghapus tugas ini?" confirmText="Hapus" onConfirm={handleDelete} onCancel={() => { setShowDeleteModal(false); setDeleteTarget(null); }} type="danger" />

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Kanban Board</h1>
          <p className="page-subtitle">{totalTasks} tugas · {doneTasks} selesai</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/tasks/list" className="btn btn-secondary btn-sm"><FilterIcon width={16} height={16} /> Tampilan List</Link>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Add01Icon width={16} height={16} /> Tugas Baru</button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-5 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 280px)' }}>
        {columnOrder.map(key => {
          const col = columnConfig[key];
          const tasks = tasksByStatus[key] || [];
          return (
            <div key={key} className="flex-1 min-w-[280px] max-w-[340px] flex flex-col">
              <div className="flex items-center justify-between px-3 py-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: col.color }} />
                  <span className="text-sm font-bold text-text-primary">{col.title}</span>
                  <span className="text-xs font-semibold text-text-tertiary bg-bg-secondary px-2 py-0.5 rounded-full">{tasks.length}</span>
                </div>
                <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-bg-hover transition-colors text-text-tertiary hover:text-text-primary"
                  onClick={() => { setNewTask(p => ({ ...p, status: key })); setShowModal(true); }}>
                  <Add01Icon width={16} height={16} />
                </button>
              </div>

              <div className="flex flex-col gap-3 flex-1">
                {tasks.map(task => {
                  const daysUntil = getDaysUntilDue(task.due_date);
                  const isOverdue = daysUntil !== null && daysUntil < 0;
                  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 2;
                  const pri = priorityConfig[task.priority];

                  return (
                    <div key={task.id} className="bg-bg-card border border-border-color rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group relative">
                      <div className="flex items-start justify-between mb-2.5">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${pri.bg} ${pri.text}`}>{pri.label}</span>
                        <div className="relative">
                          <button className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-bg-hover transition-all text-text-tertiary"
                            onClick={() => setMenuOpen(menuOpen === task.id ? null : task.id)}>
                            <MoreVerticalIcon width={14} height={14} />
                          </button>
                          {menuOpen === task.id && (
                            <div className="absolute right-0 top-7 w-48 bg-bg-card border border-border-color rounded-lg shadow-lg z-50 py-1 animate-fade-in">
                              {columnOrder.filter(k => k !== key).map(k => (
                                <button key={k} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
                                  onClick={() => moveTask(task.id, k)}>
                                  <ArrowRight01Icon width={14} height={14} /> Pindah ke {columnConfig[k].title}
                                </button>
                              ))}
                              <div className="border-t border-border-light my-1" />
                              {key === 'done' && (
                                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  onClick={() => openBillingModal(task)}>
                                  <GoogleDocIcon width={14} height={14} /> Generate Invoice / Quotation
                                </button>
                              )}
                              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                onClick={() => { setDeleteTarget({ status: key, taskId: task.id }); setShowDeleteModal(true); setMenuOpen(null); }}>
                                <Delete02Icon width={14} height={14} /> Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-text-primary mb-1.5 leading-snug">{task.title}</h4>
                      <p className="text-xs text-text-tertiary mb-3 line-clamp-2 leading-relaxed">{task.description}</p>

                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {task.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-red-50 text-red-600 dark:bg-red-900/20">{tag}</span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2.5 border-t border-border-light">
                        <div className="flex items-center gap-3 text-text-tertiary">
                          {task.due_date && (
                            <span className={`flex items-center gap-1 text-[11px] font-medium ${isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : ''}`}>
                              <Calendar03Icon width={12} height={12} />
                              {new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {task.estimated_hours > 0 && (
                            <span className="flex items-center gap-1 text-[11px] font-medium">
                              <Clock01Icon width={12} height={12} /> {task.estimated_hours}h
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-bg-secondary text-text-tertiary truncate max-w-[100px]">{task.project_name}</span>
                      </div>

                      {key === 'done' && task.hourly_rate > 0 && task.estimated_hours > 0 && !task.invoice_generated && (
                        <button className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800/30"
                          onClick={() => openBillingModal(task)}>
                          <GoogleDocIcon width={14} height={14} />
                          Generate · {task.currency} {((task.hourly_rate || 0) * (task.estimated_hours || 0)).toLocaleString('id-ID')}
                        </button>
                      )}
                      {task.invoice_generated && (
                        <div className="w-full mt-3 text-center text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg py-1.5">✓ Invoice sudah dibuat</div>
                      )}
                    </div>
                  );
                })}

                {tasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-text-tertiary opacity-60">
                    <DragDropIcon width={28} height={28} className="mb-2" />
                    <span className="text-xs font-medium">Belum ada tugas</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5" onClick={() => setShowModal(false)}>
            <div className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[520px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2"><Task01Icon width={20} height={20} /> Tugas Baru</h3>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors" onClick={() => setShowModal(false)}><Cancel01Icon width={20} height={20} /></button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Judul Tugas *</label>
                  <input className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors" placeholder="Contoh: Desain homepage baru"
                    value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Deskripsi</label>
                  <textarea className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors resize-none" rows={3}
                    value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Proyek</label>
                    <select className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors"
                      value={newTask.project_id} onChange={e => {
                        const p = projects.find(pr => pr.id === e.target.value);
                        setNewTask(prev => ({ ...prev, project_id: e.target.value, project_name: p?.name || '', currency: p?.currency || prev.currency }));
                      }}>
                      <option value="">Pilih proyek</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Klien</label>
                    <select className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors"
                      value={newTask.client_id} onChange={e => {
                        const c = clients.find(cl => cl.id === e.target.value);
                        setNewTask(p => ({ ...p, client_id: e.target.value, client_name: c?.name || '' }));
                      }}>
                      <option value="">Pilih klien</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Deadline</label>
                    <input type="date" className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors"
                      value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Prioritas</label>
                    <select className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors"
                      value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value as Task['priority'] }))}>
                      <option value="low">Rendah</option>
                      <option value="medium">Sedang</option>
                      <option value="high">Tinggi</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Mata Uang</label>
                  <select className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400"
                    value={newTask.currency} onChange={e => setNewTask(p => ({ ...p, currency: e.target.value }))}>
                    {ALL_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Tarif per Jam ({newTask.currency})</label>
                    <input type="number" className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors" placeholder="250000"
                      value={newTask.hourly_rate} onChange={e => setNewTask(p => ({ ...p, hourly_rate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Estimasi Jam</label>
                    <input type="number" className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors" placeholder="10"
                      value={newTask.estimated_hours} onChange={e => setNewTask(p => ({ ...p, estimated_hours: e.target.value }))} />
                  </div>
                </div>
                {newTask.hourly_rate && newTask.estimated_hours && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg p-3 text-center">
                    <span className="text-xs text-text-tertiary">Estimasi Total: </span>
                    <span className="text-sm font-bold text-red-600">{newTask.currency} {(Number(newTask.hourly_rate) * Number(newTask.estimated_hours)).toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Kolom</label>
                  <select className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors"
                    value={newTask.status} onChange={e => setNewTask(p => ({ ...p, status: e.target.value as Task['status'] }))}>
                    {columnOrder.map(k => <option key={k} value={k}>{columnConfig[k].title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Tags (pisahkan koma)</label>
                  <input className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 transition-colors" placeholder="UI/UX, Desain, Frontend"
                    value={newTask.tags} onChange={e => setNewTask(p => ({ ...p, tags: e.target.value }))} />
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>Batal</button>
                <button className="btn btn-primary flex-1" onClick={addTask} disabled={!newTask.title.trim() || saving}>
                  {saving ? <Loading03Icon width={16} height={16} className="animate-spin" /> : <Add01Icon width={16} height={16} />}
                  {saving ? 'Menyimpan...' : 'Buat Tugas'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
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
