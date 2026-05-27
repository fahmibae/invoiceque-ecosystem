'use client';
import { useState, useRef } from 'react';
import Topbar from '@/components/Topbar';
import { HiOutlinePlay, HiOutlinePause, HiOutlineStop, HiOutlineClock } from 'react-icons/hi';

interface TimeEntry { id: number; task: string; project: string; date: string; start: string; end: string; duration: string; }

const timeEntries: TimeEntry[] = [
  { id: 1, task: 'Homepage Redesign', project: 'Web Corp', date: '2026-05-15', start: '09:00', end: '12:30', duration: '3h 30m' },
  { id: 2, task: 'API Integration', project: 'FinApp', date: '2026-05-15', start: '13:30', end: '17:00', duration: '3h 30m' },
  { id: 3, task: 'Wireframe Design', project: 'StartupXYZ', date: '2026-05-14', start: '09:00', end: '11:00', duration: '2h 00m' },
  { id: 4, task: 'Database Optimization', project: 'E-Commerce Pro', date: '2026-05-14', start: '13:00', end: '18:00', duration: '5h 00m' },
  { id: 5, task: 'Brand Research', project: 'Web Corp', date: '2026-05-13', start: '10:00', end: '12:00', duration: '2h 00m' },
  { id: 6, task: 'Payment Gateway Test', project: 'FinApp', date: '2026-05-13', start: '14:00', end: '16:30', duration: '2h 30m' },
];

export default function TimeTrackingPage() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [currentProject, setCurrentProject] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    if (!running) {
      setRunning(true);
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    } else {
      setRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const stopTimer = () => {
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setElapsed(0);
    setCurrentTask('');
    setCurrentProject('');
  };

  const weeklyTotal = '18h 30m';
  const todayTotal = '7h 00m';

  return (
    <>
      <Topbar title="Time Tracking" subtitle="Track time spent on your tasks" />
      <div className="page-content">
        <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, var(--primary), var(--accent))', border: 'none', color: '#fff' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div className="task-working-on" style={{ flex: 1, minWidth: 200 }}>
              <input value={currentTask} onChange={e => setCurrentTask(e.target.value)} placeholder="What are you working on?" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '12px 16px', color: '#fff', fontSize: 16, width: '100%', outline: 'none', }} />
            </div>
            <select value={currentProject} onChange={e => setCurrentProject(e.target.value)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '12px 16px' }}>
              <option value="" style={{ color: '#000' }}>Select Project</option>
              <option style={{ color: '#000' }}>Web Corp</option>
              <option style={{ color: '#000' }}>FinApp</option>
              <option style={{ color: '#000' }}>StartupXYZ</option>
            </select>
            <div style={{ fontSize: 36, fontWeight: 800, fontVariantNumeric: 'tabular-nums', minWidth: 160, textAlign: 'center' }}>{formatTime(elapsed)}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={toggleTimer} style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {running ? <HiOutlinePause size={22} /> : <HiOutlinePlay size={22} />}
              </button>
              {elapsed > 0 && (
                <button onClick={stopTimer} style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <HiOutlineStop size={22} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 24 }}>
          <div className="stat-card"><div className="stat-icon blue"><HiOutlineClock size={22} /></div><div className="stat-value" style={{ marginTop: 12 }}>{todayTotal}</div><div className="stat-label">Today</div></div>
          <div className="stat-card"><div className="stat-icon green"><HiOutlineClock size={22} /></div><div className="stat-value" style={{ marginTop: 12 }}>{weeklyTotal}</div><div className="stat-label">This Week</div></div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Time Entries</span></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Task</th><th>Project</th><th>Date</th><th>Start</th><th>End</th><th>Duration</th></tr></thead>
              <tbody>
                {timeEntries.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 500 }}>{e.task}</td>
                    <td><span className="tag">{e.project}</span></td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{e.date}</td>
                    <td>{e.start}</td>
                    <td>{e.end}</td>
                    <td style={{ fontWeight: 600 }}>{e.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
