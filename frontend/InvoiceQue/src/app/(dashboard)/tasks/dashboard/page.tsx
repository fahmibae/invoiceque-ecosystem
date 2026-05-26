'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert01Icon,
  Calendar03Icon,
  ChartIcon,
  Clock01Icon,
  Folder01Icon,
  GoogleDocIcon,
  Loading03Icon,
  MoneyBag02Icon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  StopIcon,
  Task01Icon,
} from 'hugeicons-react';
import { taskApi, type Task } from '@/lib/api';
import {
  formatTimer,
  TIME_ENTRY_SAVED_EVENT,
  useTimeTracking,
} from '@/context/TimeTrackingContext';
import { formatCurrency, convertToIDR, fetchExchangeRates } from '@/lib/utils';

const AUTO_REFRESH_SECONDS = 30;
const columnOrder = ['backlog', 'todo', 'inprogress', 'done'] as const;
const columnConfig: Record<string, { title: string; color: string }> = {
  backlog: { title: 'Backlog', color: '#9CA3AF' },
  todo: { title: 'To Do', color: '#3B82F6' },
  inprogress: { title: 'Sedang Dikerjakan', color: '#F59E0B' },
  done: { title: 'Selesai', color: '#10B981' },
};

type TasksByStatus = Record<string, Task[]>;

export default function TaskDashboardPage() {
  const router = useRouter();
  const {
    activeSession,
    elapsedSeconds,
    isRunning,
    isSaving,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useTimeTracking();
  const [tasksByStatus, setTasksByStatus] = useState<TasksByStatus>({ backlog: [], todo: [], inprogress: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState('');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);

  const fetchTasks = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setIsRefreshing(true);
    else setLoading(true);
    try {
      const res = await taskApi.list({ per_page: 100 });
      const grouped: TasksByStatus = { backlog: [], todo: [], inprogress: [], done: [] };
      for (const task of res.data) {
        if (grouped[task.status]) grouped[task.status].push(task);
        else grouped.todo.push(task);
      }
      setTasksByStatus(grouped);
      setLastUpdatedAt(new Date());
      setRefreshError('');
    } catch {
      setRefreshError('Monitoring belum bisa sinkron. Coba refresh lagi.');
    } finally {
      if (silent) setIsRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    fetchExchangeRates().then(setExchangeRates).catch(() => {});
  }, []);
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = window.setInterval(() => {
      void fetchTasks({ silent: true });
    }, AUTO_REFRESH_SECONDS * 1000);

    return () => window.clearInterval(interval);
  }, [autoRefreshEnabled, fetchTasks]);
  useEffect(() => {
    const refreshAfterTimeEntrySaved = () => {
      void fetchTasks({ silent: true });
    };

    window.addEventListener(TIME_ENTRY_SAVED_EVENT, refreshAfterTimeEntrySaved);
    return () => window.removeEventListener(TIME_ENTRY_SAVED_EVENT, refreshAfterTimeEntrySaved);
  }, [fetchTasks]);

  const allTasks = useMemo(() => columnOrder.flatMap(status => tasksByStatus[status] || []), [tasksByStatus]);
  const todayStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const getDaysUntilDue = useCallback((due?: string) => {
    if (!due) return null;
    return Math.ceil((new Date(due).getTime() - todayStart.getTime()) / 86400000);
  }, [todayStart]);

  const totalTasks = allTasks.length;
  const doneTasks = tasksByStatus.done?.length || 0;
  const activeTasks = totalTasks - doneTasks;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const totalEstimatedHours = allTasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
  const totalEstimatedValue = allTasks.reduce((sum, task) => sum + (convertToIDR(task.hourly_rate || 0, task.currency || 'IDR', exchangeRates || undefined) * (task.estimated_hours || 0)), 0);
  const activeProjects = new Set(allTasks.map(task => task.project_name).filter(Boolean)).size;
  const highPriorityOpenTasks = allTasks.filter(task => task.status !== 'done' && task.priority === 'high').length;
  const inProgressTasks = tasksByStatus.inprogress || [];
  const overdueTasks = allTasks.filter(task => {
    const days = getDaysUntilDue(task.due_date);
    return task.status !== 'done' && days !== null && days < 0;
  });
  const dueSoonTasks = allTasks
    .filter(task => {
      const days = getDaysUntilDue(task.due_date);
      return task.status !== 'done' && days !== null && days >= 0 && days <= 7;
    })
    .sort((a, b) => new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime())
    .slice(0, 6);
  const billingReadyTasks = allTasks
    .filter(task => task.status === 'done' && !task.invoice_generated && (task.hourly_rate || 0) > 0 && (task.estimated_hours || 0) > 0)
    .sort((a, b) => ((b.hourly_rate || 0) * (b.estimated_hours || 0)) - ((a.hourly_rate || 0) * (a.estimated_hours || 0)))
    .slice(0, 6);
  const projectBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; total: number; done: number; hours: number; value: number }>();

    for (const task of allTasks) {
      const name = task.project_name || 'Tanpa Proyek';
      const current = map.get(name) || { name, total: 0, done: 0, hours: 0, value: 0 };
      current.total += 1;
      current.done += task.status === 'done' ? 1 : 0;
      current.hours += task.estimated_hours || 0;
      current.value += (task.hourly_rate || 0) * (task.estimated_hours || 0);
      map.set(name, current);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [allTasks]);

  const generateInvoiceFromTask = (task: Task) => {
    const amount = (task.hourly_rate || 0) * (task.estimated_hours || 0);
    const params = new URLSearchParams({
      from_task: 'true',
      task_title: task.title,
      task_project: task.project_name,
      client_name: task.client_name || '',
      client_id: task.client_id || '',
      item_desc: `${task.title} — ${task.project_name}`,
      item_qty: String(task.estimated_hours || 1),
      item_price: String(task.hourly_rate || 0),
      amount: String(amount),
      currency: task.currency || 'IDR',
    });
    router.push(`/invoices/create?${params.toString()}`);
  };
  const handleStopTimer = () => {
    void stopTimer().then(() => fetchTasks({ silent: true }));
  };
  const lastUpdatedLabel = lastUpdatedAt
    ? lastUpdatedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Belum sinkron';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loading03Icon width={32} height={32} className="animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard Tugas</h1>
          <p className="page-subtitle">{totalTasks} tugas · {activeTasks} aktif · {activeProjects} proyek</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void fetchTasks({ silent: true })}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            title="Refresh monitoring"
          >
            <RefreshIcon width={16} height={16} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link href="/tasks" className="btn btn-secondary btn-sm">Kanban</Link>
          <Link href="/tasks/list" className="btn btn-secondary btn-sm">List</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-4 mb-6">
        <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`absolute inline-flex h-full w-full rounded-full ${autoRefreshEnabled ? 'animate-ping bg-emerald-400 opacity-75' : 'bg-text-tertiary opacity-30'}`} />
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${autoRefreshEnabled ? 'bg-emerald-500' : 'bg-text-tertiary'}`} />
                </span>
                <h3 className="text-base font-bold text-text-primary">Monitoring Real</h3>
              </div>
              <p className="mt-1 text-xs text-text-tertiary">
                Update terakhir {lastUpdatedLabel} · auto refresh {AUTO_REFRESH_SECONDS} detik
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {refreshError && <span className="text-xs font-semibold text-red-600">{refreshError}</span>}
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-text-secondary">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={autoRefreshEnabled}
                  onChange={event => setAutoRefreshEnabled(event.target.checked)}
                />
                <span className="relative h-5 w-9 rounded-full bg-bg-tertiary transition-colors peer-checked:bg-red-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4" />
                Auto
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="rounded-md border border-border-light bg-bg-secondary p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-tertiary">Aktif</div>
              <div className="mt-1 text-xl font-extrabold text-text-primary">{activeTasks}</div>
            </div>
            <div className="rounded-md border border-border-light bg-bg-secondary p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-tertiary">Dikerjakan</div>
              <div className="mt-1 text-xl font-extrabold text-blue-600">{inProgressTasks.length}</div>
            </div>
            <div className="rounded-md border border-border-light bg-bg-secondary p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-tertiary">Telat</div>
              <div className="mt-1 text-xl font-extrabold text-red-600">{overdueTasks.length}</div>
            </div>
            <div className="rounded-md border border-border-light bg-bg-secondary p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text-tertiary">Siap Invoice</div>
              <div className="mt-1 text-xl font-extrabold text-emerald-600">{billingReadyTasks.length}</div>
            </div>
          </div>

          <div className="rounded-md border border-border-light bg-bg-secondary p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-text-secondary">Task Sedang Dikerjakan</span>
              <Link href="/tasks" className="text-xs font-semibold text-red-600 hover:underline">Lihat Kanban</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {inProgressTasks.slice(0, 4).map(task => (
                <div key={task.id} className="rounded-md bg-bg-card px-3 py-2 border border-border-light">
                  <div className="text-sm font-bold text-text-primary line-clamp-1">{task.title}</div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-text-tertiary">
                    <span className="truncate">{task.project_name || 'Tanpa Proyek'}</span>
                    <span className={task.priority === 'high' ? 'font-bold text-red-600' : 'font-semibold text-text-secondary'}>
                      {task.priority === 'high' ? 'Tinggi' : task.priority === 'medium' ? 'Sedang' : 'Rendah'}
                    </span>
                  </div>
                </div>
              ))}
              {inProgressTasks.length === 0 && (
                <div className="md:col-span-2 py-5 text-center text-sm text-text-tertiary">
                  Belum ada task yang sedang dikerjakan
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold flex items-center gap-2"><Clock01Icon width={18} height={18} /> Timer Aktif</h3>
            <Link href="/time-tracking" className="text-xs font-semibold text-red-600 hover:underline">Detail</Link>
          </div>
          {activeSession ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800/30 dark:bg-red-900/20">
              <div className="text-sm font-bold text-text-primary line-clamp-2">{activeSession.taskTitle}</div>
              <div className="mt-1 text-xs text-text-tertiary line-clamp-1">{activeSession.projectName || 'Tanpa Proyek'}</div>
              <div className="mt-4 font-mono text-3xl font-extrabold text-red-600">{formatTimer(elapsedSeconds)}</div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={isRunning ? pauseTimer : resumeTimer}
                  disabled={isSaving}
                  className="btn btn-secondary btn-sm flex-1"
                >
                  {isRunning ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
                  {isRunning ? 'Pause' : 'Lanjut'}
                </button>
                <button
                  type="button"
                  onClick={handleStopTimer}
                  disabled={isSaving}
                  className="btn btn-primary btn-sm flex-1"
                >
                  {isSaving ? <Loading03Icon width={16} height={16} className="animate-spin" /> : <StopIcon width={16} height={16} />}
                  Simpan
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[168px] flex-col items-center justify-center rounded-lg border border-dashed border-border-color bg-bg-secondary px-4 py-6 text-center">
              <Clock01Icon width={28} height={28} className="mb-2 text-text-tertiary" />
              <div className="text-sm font-bold text-text-primary">Tidak ada timer aktif</div>
              <div className="mt-1 text-xs text-text-tertiary">Mulai timer dari halaman Time Tracking</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center">
              <Task01Icon width={22} height={22} />
            </div>
            <span className="text-xs font-bold text-text-tertiary">{progressPercent}%</span>
          </div>
          <div className="text-2xl font-extrabold text-text-primary">{totalTasks}</div>
          <div className="text-xs text-text-tertiary mt-1">Total tugas</div>
          <div className="h-2 bg-bg-secondary rounded-full overflow-hidden mt-4">
            <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center">
              <Alert01Icon width={22} height={22} />
            </div>
            <span className="text-xs font-bold text-amber-600">{highPriorityOpenTasks} prioritas tinggi</span>
          </div>
          <div className="text-2xl font-extrabold text-text-primary">{overdueTasks.length}</div>
          <div className="text-xs text-text-tertiary mt-1">Lewat deadline</div>
          <div className="text-xs text-text-secondary mt-4">{dueSoonTasks.length} jatuh tempo 7 hari</div>
        </div>

        <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
              <Clock01Icon width={22} height={22} />
            </div>
            <span className="text-xs font-bold text-text-tertiary">{activeProjects} proyek</span>
          </div>
          <div className="text-2xl font-extrabold text-text-primary">{totalEstimatedHours.toLocaleString('id-ID')}h</div>
          <div className="text-xs text-text-tertiary mt-1">Estimasi kerja</div>
          <div className="text-xs text-text-secondary mt-4">{tasksByStatus.inprogress.length} sedang dikerjakan</div>
        </div>

        <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
              <MoneyBag02Icon width={22} height={22} />
            </div>
            <span className="text-xs font-bold text-emerald-600">{billingReadyTasks.length} siap invoice</span>
          </div>
          <div className="text-2xl font-extrabold text-text-primary">{formatCurrency(totalEstimatedValue, 'IDR')}</div>
          <div className="text-xs text-text-tertiary mt-1">Estimasi nilai</div>
          <div className="text-xs text-text-secondary mt-4">Berdasarkan tarif dan jam estimasi</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr_1fr] gap-5 mb-6">
        <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold flex items-center gap-2"><ChartIcon width={18} height={18} /> Progress Status</h3>
            <span className="text-xs text-text-tertiary">{doneTasks}/{totalTasks} selesai</span>
          </div>
          <div className="flex flex-col gap-3">
            {columnOrder.map(status => {
              const count = tasksByStatus[status]?.length || 0;
              const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex justify-between mb-1.5 text-xs">
                    <span className="font-semibold text-text-secondary">{columnConfig[status].title}</span>
                    <span className="text-text-tertiary">{count} · {pct}%</span>
                  </div>
                  <div className="h-2.5 bg-bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: columnConfig[status].color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold flex items-center gap-2"><Calendar03Icon width={18} height={18} /> Deadline Dekat</h3>
            <Link href="/calendar" className="text-xs font-semibold text-red-600 hover:underline">Kalender</Link>
          </div>
          <div className="flex flex-col gap-2">
            {dueSoonTasks.length > 0 ? dueSoonTasks.map(task => {
              const days = getDaysUntilDue(task.due_date);
              return (
                <div key={task.id} className="rounded-md border border-border-light bg-bg-secondary p-3">
                  <div className="text-sm font-bold text-text-primary line-clamp-1">{task.title}</div>
                  <div className="flex items-center justify-between mt-1 text-xs text-text-tertiary">
                    <span className="truncate">{task.project_name || 'Tanpa Proyek'}</span>
                    <span className={days === 0 ? 'text-red-600 font-bold' : 'text-amber-600 font-semibold'}>
                      {days === 0 ? 'Hari ini' : `${days} hari`}
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div className="py-8 text-center text-sm text-text-tertiary">Tidak ada deadline dekat</div>
            )}
          </div>
        </div>

        <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold flex items-center gap-2"><GoogleDocIcon width={18} height={18} /> Siap Invoice</h3>
            <Link href="/invoices/create" className="text-xs font-semibold text-red-600 hover:underline">Invoice</Link>
          </div>
          <div className="flex flex-col gap-2">
            {billingReadyTasks.length > 0 ? billingReadyTasks.map(task => {
              const amount = (task.hourly_rate || 0) * (task.estimated_hours || 0);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => generateInvoiceFromTask(task)}
                  className="rounded-md border border-border-light bg-bg-secondary p-3 text-left transition-colors hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-900/10"
                >
                  <div className="text-sm font-bold text-text-primary line-clamp-1">{task.title}</div>
                  <div className="mt-1 text-xs font-semibold text-emerald-600">{formatCurrency(amount, task.currency || 'IDR')}</div>
                </button>
              );
            }) : (
              <div className="py-8 text-center text-sm text-text-tertiary">Belum ada tugas siap invoice</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold flex items-center gap-2"><Folder01Icon width={18} height={18} /> Ringkasan Proyek</h3>
          <Link href="/projects" className="text-xs font-semibold text-red-600 hover:underline">Kelola proyek</Link>
        </div>
        {projectBreakdown.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {projectBreakdown.map(project => {
              const pct = project.total > 0 ? Math.round((project.done / project.total) * 100) : 0;
              return (
                <div key={project.name} className="rounded-md border border-border-light bg-bg-secondary p-3">
                  <div className="font-bold text-sm text-text-primary line-clamp-1">{project.name}</div>
                  <div className="flex justify-between mt-2 text-xs text-text-tertiary">
                    <span>{project.done}/{project.total} tugas</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden mt-2">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 text-[11px] text-text-secondary">{project.hours.toLocaleString('id-ID')}h · {formatCurrency(project.value, 'IDR')}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-text-tertiary">Belum ada tugas proyek</div>
        )}
      </div>
    </div>
  );
}
