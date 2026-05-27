'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Clock01Icon, PlayIcon, PauseIcon, StopIcon,
  Calendar03Icon, Loading03Icon, Delete02Icon,
} from 'hugeicons-react';
import { taskApi, projectApi, timeEntryApi, type Task as ApiTask, type Project, type TimeEntry } from '@/lib/api';
import {
  formatTimer,
  TIME_ENTRY_SAVED_EVENT,
  useTimeTracking,
} from '@/context/TimeTrackingContext';

export default function TimeTrackingPage() {
  const {
    activeSession,
    elapsedSeconds,
    isRunning,
    isSaving,
    error: timerError,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    clearError,
  } = useTimeTracking();
  const [draftTaskId, setDraftTaskId] = useState('');
  const [draftTaskTitle, setDraftTaskTitle] = useState('');
  const [draftProjectName, setDraftProjectName] = useState('');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [todaySecs, setTodaySecs] = useState(0);
  const [weekSecs, setWeekSecs] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes, entriesRes, statsRes] = await Promise.all([
        taskApi.list({ per_page: 100 }),
        projectApi.list({ per_page: 100 }),
        timeEntryApi.list({ per_page: 50 }),
        timeEntryApi.stats(),
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data);
      setEntries(entriesRes.data);
      setTodaySecs(statsRes.today_seconds);
      setWeekSecs(statsRes.week_seconds);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();

    const handleEntrySaved = () => {
      fetchData();
    };

    window.addEventListener(TIME_ENTRY_SAVED_EVENT, handleEntrySaved);
    return () => window.removeEventListener(TIME_ENTRY_SAVED_EVENT, handleEntrySaved);
  }, [fetchData]);

  useEffect(() => {
    if (!activeSession) return;

    setDraftTaskId(activeSession.taskId || '');
    setDraftTaskTitle(activeSession.taskTitle);
    setDraftProjectName(activeSession.projectName);
  }, [activeSession]);

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}j ${m}m`;
    return `${m}m`;
  };

  const toggleTimer = () => {
    if (activeSession) {
      if (isRunning) {
        pauseTimer();
      } else {
        resumeTimer();
      }
      return;
    }

    startTimer({
      taskId: draftTaskId || undefined,
      taskTitle: draftTaskTitle,
      projectName: draftProjectName,
    });
  };

  const handleTaskSelect = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    setDraftTaskId(taskId);

    if (task) {
      setDraftTaskTitle(task.title);
      setDraftProjectName(task.project_name || '');
    } else {
      setDraftTaskTitle('');
      setDraftProjectName('');
    }
  };

  const handleStopTimer = () => {
    void stopTimer();
  };

  const deleteEntry = async (id: string) => {
    try {
      await timeEntryApi.delete(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      const stats = await timeEntryApi.stats();
      setTodaySecs(stats.today_seconds);
      setWeekSecs(stats.week_seconds);
    } catch { /* silent */ }
  };

  const inProgressTasks = tasks.filter(t => t.status === 'inprogress' || t.status === 'todo');
  const timerLocked = Boolean(activeSession) || isSaving;
  const taskValue = activeSession?.taskTitle || draftTaskTitle;
  const projectValue = activeSession?.projectName || draftProjectName;
  const selectedTaskId = activeSession?.taskId || draftTaskId;
  const canToggleTimer = Boolean(activeSession) || Boolean(draftTaskTitle.trim());

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Time Tracking</h1>
          <p className="page-subtitle">Lacak waktu kerja pada tugas Anda</p>
        </div>
      </div>

      {/* Timer Widget */}
      <div className="card mb-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)', border: 'none' }}>
        <div className="p-6 flex items-center gap-6 flex-wrap">
          <div className="flex gap-5 min-w-[220px]">
            <select
              className="w-full py-3 px-4 rounded-lg text-sm font-medium outline-none"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
              value={selectedTaskId}
              onChange={e => handleTaskSelect(e.target.value)}
              disabled={timerLocked}
            >
              <option value="" style={{ color: '#000' }}>Pilih tugas...</option>
              {inProgressTasks.map(t => (
                <option key={t.id} value={t.id} style={{ color: '#000' }}>{t.title}</option>
              ))}
            </select>
            <input
              className="w-full py-3 px-4 rounded-lg text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
              placeholder="Atau ketik nama tugas..."
              value={taskValue}
              onChange={e => {
                setDraftTaskId('');
                setDraftTaskTitle(e.target.value);
              }}
              disabled={timerLocked}
            />
          </div>

          <select
            className="py-3 px-4 rounded-lg text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
            value={projectValue}
            onChange={e => setDraftProjectName(e.target.value)}
            disabled={timerLocked}
          >
            <option value="" style={{ color: '#000' }}>Proyek</option>
            {projects.map(p => (
              <option key={p.id} value={p.name} style={{ color: '#000' }}>{p.name}</option>
            ))}
          </select>

          <div style={{ fontSize: 42, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums', minWidth: 180, textAlign: 'center', letterSpacing: '0.05em' }}>
            {formatTimer(elapsedSeconds)}
          </div>

          <div className="flex gap-3">
            <button
              onClick={toggleTimer}
              disabled={!canToggleTimer || isSaving}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', color: '#fff', cursor: canToggleTimer && !isSaving ? 'pointer' : 'not-allowed', opacity: canToggleTimer && !isSaving ? 1 : 0.5 }}
            >
              {activeSession && isRunning ? <PauseIcon width={24} height={24} /> : <PlayIcon width={24} height={24} />}
            </button>
            {activeSession && (
              <button
                onClick={handleStopTimer}
                disabled={isSaving}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', color: '#fff', cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.65 : 1 }}
              >
                <StopIcon width={24} height={24} />
              </button>
            )}
          </div>
        </div>
        {timerError && (
          <div className="mx-6 mb-6 flex items-center justify-between gap-4 rounded-md border border-white/20 bg-white/15 px-4 py-3 text-sm text-white">
            <span>{timerError}</span>
            <button
              type="button"
              className="text-xs font-semibold text-white underline-offset-4 hover:underline"
              onClick={clearError}
            >
              Tutup
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
            <Clock01Icon width={24} height={24} />
          </div>
          <div>
            <div className="text-2xl font-bold">{formatDuration(todaySecs)}</div>
            <div className="text-sm text-text-tertiary">Hari Ini</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
            <Calendar03Icon width={24} height={24} />
          </div>
          <div>
            <div className="text-2xl font-bold">{formatDuration(weekSecs)}</div>
            <div className="text-sm text-text-tertiary">Minggu Ini</div>
          </div>
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <h3 className="text-base font-bold">Riwayat Waktu</h3>
          <span className="text-xs text-text-tertiary">{entries.length} entri</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loading03Icon width={28} height={28} className="animate-spin text-red-500" /></div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-5">
            <Clock01Icon width={48} height={48} className="mb-4 opacity-20" />
            <h3 className="text-base font-semibold mb-1">Belum ada entri waktu</h3>
            <p className="text-sm text-text-tertiary">Mulai timer untuk melacak waktu kerja Anda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">Tugas</th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">Proyek</th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">Tanggal</th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">Mulai</th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">Selesai</th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3">Durasi</th>
                  <th className="text-left text-xs font-semibold text-text-tertiary uppercase tracking-wider px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className="border-b border-border-light hover:bg-bg-hover transition-colors">
                    <td className="px-5 py-3 text-sm font-medium">{entry.task_title}</td>
                    <td className="px-5 py-3"><span className="badge badge-default text-xs">{entry.project_name || '-'}</span></td>
                    <td className="px-5 py-3 text-sm text-text-tertiary">{entry.date}</td>
                    <td className="px-5 py-3 text-sm">{entry.start_time}</td>
                    <td className="px-5 py-3 text-sm">{entry.end_time}</td>
                    <td className="px-5 py-3 text-sm font-bold">{formatDuration(entry.duration_seconds)}</td>
                    <td className="px-5 py-3">
                      <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-text-tertiary hover:text-red-500 transition-colors"
                        onClick={() => deleteEntry(entry.id)}>
                        <Delete02Icon width={14} height={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
