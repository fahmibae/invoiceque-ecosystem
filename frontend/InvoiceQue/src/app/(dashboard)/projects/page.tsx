'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Folder01Icon, Add01Icon, Cancel01Icon, Delete02Icon,
  Calendar03Icon, Clock01Icon, CheckmarkBadge02Icon,
  Search01Icon, Loading03Icon, GoogleDocIcon,
  MoneyBag02Icon,
} from 'hugeicons-react';
import Portal from '@/components/ui/Portal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { projectApi, taskApi, clientApi, type Project, type Task, type Client } from '@/lib/api';
import { ALL_CURRENCIES } from '@/lib/currencies';

const projectColors = ['#DC2626', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const statusConfig: Record<string, { label: string; cls: string }> = {
  active: { label: 'Aktif', cls: 'badge-success' },
  completed: { label: 'Selesai', cls: 'badge-info' },
  on_hold: { label: 'Ditunda', cls: 'badge-warning' },
  cancelled: { label: 'Dibatalkan', cls: 'badge-default' },
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedProject, setCompletedProject] = useState<Project | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '', description: '', client_id: '', client_name: '',
    budget: '', hourly_rate: '', start_date: '', deadline: '', color: '#DC2626', currency: 'IDR',
  });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.list({ status: filterStatus || undefined, search: search || undefined, per_page: 100 });
      setProjects(res.data);
      setTotal(res.total);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [search, filterStatus]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await taskApi.list({ per_page: 100 });
      setAllTasks(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    clientApi.list('', 1, 100).then(res => setClients(res.data || [])).catch(() => { });
  }, []);

  const getProjectStats = (projectName: string) => {
    const projectTasks = allTasks.filter(t => t.project_name === projectName);
    const totalCount = projectTasks.length;
    const done = projectTasks.filter(t => t.status === 'done').length;
    const totalHours = projectTasks.reduce((s, t) => s + (t.estimated_hours || 0), 0);
    const totalAmount = projectTasks.reduce((s, t) => s + ((t.hourly_rate || 0) * (t.estimated_hours || 0)), 0);
    return { total: totalCount, done, progress: totalCount > 0 ? Math.round((done / totalCount) * 100) : 0, totalHours, totalAmount };
  };

  const addProject = async () => {
    if (!newProject.name.trim() || saving) return;
    setSaving(true);
    try {
      await projectApi.create({
        name: newProject.name,
        description: newProject.description,
        client_id: newProject.client_id || undefined,
        client_name: newProject.client_name || 'Tanpa Klien',
        budget: Number(newProject.budget) || 0,
        hourly_rate: Number(newProject.hourly_rate) || 0,
        currency: newProject.currency,
        color: newProject.color,
        start_date: newProject.start_date || undefined,
        deadline: newProject.deadline || undefined,
      });
      setNewProject({ name: '', description: '', client_id: '', client_name: '', budget: '', hourly_rate: '', start_date: '', deadline: '', color: '#DC2626', currency: 'IDR' });
      setShowModal(false);
      fetchProjects();
    } catch { /* error */ }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await projectApi.delete(deleteTarget); fetchProjects(); } catch { /* err */ }
    setDeleteTarget(null);
    setShowDeleteModal(false);
  };

  const buildProjectBillingQuery = (project: Project) => {
    const params = new URLSearchParams();
    const stats = getProjectStats(project.name);
    const itemPrice = project.budget > 0
      ? project.budget
      : stats.totalAmount > 0
        ? stats.totalAmount
        : project.hourly_rate;

    params.set('from_project', 'true');
    params.set('project_id', project.id);
    params.set('project_name', project.name);
    params.set('item_desc', project.name);
    params.set('item_qty', '1');
    params.set('item_price', String(itemPrice || 0));
    params.set('currency', project.currency || 'IDR');

    if (project.client_id) params.set('client_id', project.client_id);
    if (project.client_name) params.set('client_name', project.client_name);
    if (project.deadline) params.set('due_date', project.deadline);

    return params.toString();
  };

  const openProjectBilling = (kind: 'quotation' | 'invoice') => {
    if (!completedProject) return;

    const query = buildProjectBillingQuery(completedProject);
    setShowCompletionModal(false);
    setCompletedProject(null);
    router.push(kind === 'quotation' ? `/quotations/create?${query}` : `/invoices/create?${query}`);
  };

  const toggleStatus = async (project: Project) => {
    const next = project.status === 'active' ? 'completed' : project.status === 'completed' ? 'on_hold' : 'active';
    try {
      await projectApi.update(project.id, { status: next as Project['status'] });
      fetchProjects();

      if (next === 'completed') {
        setCompletedProject({ ...project, status: next as Project['status'] });
        setShowCompletionModal(true);
      }
    } catch { /* err */ }
  };

  return (
    <div className="animate-fade-in">
      <ConfirmModal isOpen={showDeleteModal} title="Hapus Proyek" message="Apakah Anda yakin ingin menghapus proyek ini?"
        confirmText="Hapus" onConfirm={handleDelete} onCancel={() => { setShowDeleteModal(false); setDeleteTarget(null); }} type="danger" />

      {showCompletionModal && completedProject && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-5">
            <div className="bg-bg-card border border-border-color rounded-2xl w-full max-w-[520px] shadow-xl overflow-hidden animate-fade-in">
              <div className="px-6 py-5 border-b border-border-light">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                  <CheckmarkBadge02Icon width={26} height={26} />
                </div>
                <h3 className="text-xl font-bold text-text-primary">Proyek Selesai</h3>
                <p className="text-sm text-text-secondary mt-1">
                  {completedProject.name} sudah ditandai selesai. Pilih dokumen berikutnya untuk klien.
                </p>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  className="text-left rounded-xl border border-border-color bg-bg-secondary p-4 hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors"
                  onClick={() => openProjectBilling('quotation')}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                    <GoogleDocIcon width={22} height={22} />
                  </div>
                  <div className="font-bold text-text-primary">Buat Quotation</div>
                  <div className="text-xs text-text-secondary mt-1">Siapkan penawaran final sebelum invoice.</div>
                </button>
                <button
                  type="button"
                  className="text-left rounded-xl border border-border-color bg-bg-secondary p-4 hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors"
                  onClick={() => openProjectBilling('invoice')}
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                    <MoneyBag02Icon width={22} height={22} />
                  </div>
                  <div className="font-bold text-text-primary">Langsung Invoice</div>
                  <div className="text-xs text-text-secondary mt-1">Buat tagihan dari data proyek ini.</div>
                </button>
              </div>
              <div className="px-6 py-4 border-t border-border-light flex justify-end">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowCompletionModal(false); setCompletedProject(null); }}
                >
                  Nanti Saja
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Proyek</h1>
          <p className="page-subtitle">{total} proyek</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Add01Icon width={16} height={16} /> Proyek Baru
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"><Search01Icon width={18} height={18} /></span>
          <input type="text" placeholder="Cari proyek atau klien..."
            className="w-full py-3 pr-4 pl-11 border border-border-color rounded-md bg-bg-card text-sm outline-none focus:border-red-400"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="py-3 px-4 border border-border-color rounded-md bg-bg-card text-sm outline-none focus:border-red-400"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="completed">Selesai</option>
          <option value="on_hold">Ditunda</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loading03Icon width={32} height={32} className="animate-spin text-red-500" /></div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map(project => {
            const stats = getProjectStats(project.name);
            const sc = statusConfig[project.status] || statusConfig.active;
            const daysLeft = project.deadline ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <div key={project.id} className="bg-bg-card border border-border-color rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                <div className="h-1.5" style={{ background: project.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-text-primary truncate">{project.name}</h3>
                      <p className="text-xs text-text-tertiary mt-0.5">{project.client_name}</p>
                    </div>
                    <span className={`badge ${sc.cls} text-[11px] shrink-0 ml-2`}>{sc.label}</span>
                  </div>

                  <p className="text-xs text-text-secondary mb-4 line-clamp-2 leading-relaxed">{project.description}</p>

                  <div className="mb-4">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs font-semibold text-text-primary">{stats.progress}% selesai</span>
                      <span className="text-xs text-text-tertiary">{stats.done}/{stats.total} tugas</span>
                    </div>
                    <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-red-500 to-red-400" style={{ width: `${stats.progress}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-bg-secondary rounded-lg p-2.5 text-center">
                      <div className="text-xs text-text-tertiary mb-0.5">Budget</div>
                      <div className="text-sm font-bold">{project.currency} {project.budget.toLocaleString('id-ID')}</div>
                    </div>
                    <div className="bg-bg-secondary rounded-lg p-2.5 text-center">
                      <div className="text-xs text-text-tertiary mb-0.5">Tarif/Jam</div>
                      <div className="text-sm font-bold">{project.currency} {project.hourly_rate.toLocaleString('id-ID')}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border-light">
                    <div className="flex items-center gap-3 text-text-tertiary text-[11px] font-medium">
                      {daysLeft !== null && (
                        <span className={`flex items-center gap-1 ${daysLeft < 0 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : ''}`}>
                          <Calendar03Icon width={12} height={12} />
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}h telat` : `${daysLeft}h lagi`}
                        </span>
                      )}
                      <span className="flex items-center gap-1"><Clock01Icon width={12} height={12} /> {stats.totalHours}h</span>
                    </div>
                    <div className="flex gap-1">
                      <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-bg-hover transition-colors text-text-tertiary hover:text-text-primary"
                        onClick={() => toggleStatus(project)} title="Ubah status">
                        <CheckmarkBadge02Icon width={14} height={14} />
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-text-tertiary hover:text-red-500"
                        onClick={() => { setDeleteTarget(project.id); setShowDeleteModal(true); }} title="Hapus">
                        <Delete02Icon width={14} height={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card flex flex-col justify-center items-center text-center py-16 px-5">
          <Folder01Icon width={48} height={48} className="mb-4 opacity-30" />
          <h3 className="text-lg font-semibold mb-2">Belum ada proyek</h3>
          <p className="text-sm text-text-secondary mb-6">Buat proyek pertama Anda</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Buat Proyek</button>
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5" onClick={() => setShowModal(false)}>
            <div className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[520px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2"><Folder01Icon width={20} height={20} /> Proyek Baru</h3>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors" onClick={() => setShowModal(false)}><Cancel01Icon width={20} height={20} /></button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Nama Proyek *</label>
                  <input className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400" placeholder="Website Redesign"
                    value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Deskripsi</label>
                  <textarea className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400 resize-none" rows={2}
                    value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Klien</label>
                  <select className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400"
                    value={newProject.client_id} onChange={e => {
                      const c = clients.find(cl => cl.id === e.target.value);
                      setNewProject(p => ({ ...p, client_id: e.target.value, client_name: c?.name || '' }));
                    }}>
                    <option value="">Pilih klien</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Mata Uang</label>
                  <select className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400"
                    value={newProject.currency} onChange={e => setNewProject(p => ({ ...p, currency: e.target.value }))}>
                    {ALL_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} — {c.name} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Budget ({newProject.currency})</label>
                    <input type="number" className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400" placeholder="25000000"
                      value={newProject.budget} onChange={e => setNewProject(p => ({ ...p, budget: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Tarif/Jam ({newProject.currency})</label>
                    <input type="number" className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400" placeholder="250000"
                      value={newProject.hourly_rate} onChange={e => setNewProject(p => ({ ...p, hourly_rate: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Mulai</label>
                    <input type="date" className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400"
                      value={newProject.start_date} onChange={e => setNewProject(p => ({ ...p, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Deadline</label>
                    <input type="date" className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-red-400"
                      value={newProject.deadline} onChange={e => setNewProject(p => ({ ...p, deadline: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">Warna</label>
                  <div className="flex gap-2">
                    {projectColors.map(c => (
                      <button key={c} className={`w-8 h-8 rounded-full transition-all duration-150 ${newProject.color === c ? 'ring-2 ring-offset-2 ring-red-500 scale-110' : 'hover:scale-110'}`}
                        style={{ background: c }} onClick={() => setNewProject(p => ({ ...p, color: c }))} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>Batal</button>
                <button className="btn btn-primary flex-1" onClick={addProject} disabled={!newProject.name.trim() || saving}>
                  {saving ? <Loading03Icon width={16} height={16} className="animate-spin" /> : <Add01Icon width={16} height={16} />}
                  {saving ? 'Menyimpan...' : 'Buat Proyek'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
