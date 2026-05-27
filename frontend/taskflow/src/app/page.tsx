'use client';
import Topbar from '@/components/Topbar';
import { HiOutlineClipboardList, HiOutlineFolder, HiOutlineClock, HiOutlineCurrencyDollar, HiOutlineArrowSmUp, HiOutlineArrowSmDown } from 'react-icons/hi';

const stats = [
  { label: 'Total Tasks', value: '48', trend: '+12%', up: true, icon: HiOutlineClipboardList, color: 'blue' },
  { label: 'Active Projects', value: '7', trend: '+3', up: true, icon: HiOutlineFolder, color: 'green' },
  { label: 'Hours This Week', value: '32.5', trend: '-2.1h', up: false, icon: HiOutlineClock, color: 'orange' },
  { label: 'Revenue (IDR)', value: '24.5M', trend: '+18%', up: true, icon: HiOutlineCurrencyDollar, color: 'purple' },
];

const recentTasks = [
  { id: 1, title: 'Design Homepage Redesign', project: 'Web Corp', priority: 'high', status: 'active', due: '2026-05-16' },
  { id: 2, title: 'API Integration Payment', project: 'FinApp', priority: 'medium', status: 'active', due: '2026-05-18' },
  { id: 3, title: 'Mobile App Wireframe', project: 'StartupXYZ', priority: 'high', status: 'pending', due: '2026-05-20' },
  { id: 4, title: 'Database Optimization', project: 'E-Commerce Pro', priority: 'low', status: 'completed', due: '2026-05-14' },
  { id: 5, title: 'Landing Page Copy', project: 'Web Corp', priority: 'medium', status: 'active', due: '2026-05-22' },
];

const upcomingDeadlines = [
  { title: 'Homepage Redesign', project: 'Web Corp', due: 'Tomorrow', color: '#ef4444' },
  { title: 'API Integration', project: 'FinApp', due: 'In 3 days', color: '#f59e0b' },
  { title: 'Mobile Wireframe', project: 'StartupXYZ', due: 'In 5 days', color: '#10b981' },
];

const activeProjects = [
  { name: 'Web Corp Redesign', progress: 72, tasks: '18/25', color: '#2563eb' },
  { name: 'FinApp Integration', progress: 45, tasks: '9/20', color: '#7c3aed' },
  { name: 'StartupXYZ Mobile', progress: 20, tasks: '4/20', color: '#059669' },
];

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" subtitle="Welcome back, Fahmi! Here's your overview." />
      <div className="page-content">
        <div className="stats-grid">
          {stats.map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-header">
                <div className={`stat-icon ${s.color}`}><s.icon size={22} /></div>
                <span className={`stat-trend ${s.up ? 'up' : 'down'}`}>
                  {s.up ? <HiOutlineArrowSmUp size={14} /> : <HiOutlineArrowSmDown size={14} />} {s.trend}
                </span>
              </div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Tasks</span>
              <a href="/tasks" className="btn btn-sm btn-secondary">View All</a>
            </div>
            <div className="table-container">
              <table style={{ overflowX: 'auto', overflowY: 'auto' }}>
                <thead>
                  <tr><th>Task</th><th>Project</th><th>Priority</th><th>Status</th><th>Due</th></tr>
                </thead>
                <tbody>
                  {recentTasks.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.title}</td>
                      <td><span className="tag">{t.project}</span></td>
                      <td><span className={`priority-badge priority-${t.priority}`}>{t.priority}</span></td>
                      <td><span className={`status-badge status-${t.status}`}>{t.status}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t.due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Upcoming Deadlines</span></div>
              <div className="card-body">
                {upcomingDeadlines.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < upcomingDeadlines.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <div style={{ width: 4, height: 40, borderRadius: 2, background: d.color }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{d.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.project}</div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: d.color }}>{d.due}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Active Projects</span></div>
              <div className="card-body">
                {activeProjects.map((p, i) => (
                  <div key={i} style={{ marginBottom: i < activeProjects.length - 1 ? 16 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.tasks} tasks</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{p.progress}% complete</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
