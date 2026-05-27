'use client';
import Topbar from '@/components/Topbar';
import { HiOutlineCurrencyDollar, HiOutlineClock, HiOutlineClipboardList, HiOutlineFolder } from 'react-icons/hi';

const monthlyData = [
  { month: 'Jan', hours: 120, revenue: 8500000, tasks: 15 },
  { month: 'Feb', hours: 140, revenue: 10200000, tasks: 18 },
  { month: 'Mar', hours: 110, revenue: 7800000, tasks: 12 },
  { month: 'Apr', hours: 155, revenue: 12400000, tasks: 22 },
  { month: 'May', hours: 95, revenue: 9100000, tasks: 14 },
];

const projectRevenue = [
  { name: 'Web Corp Redesign', revenue: 'Rp 12.500.000', hours: 48, percentage: 35 },
  { name: 'FinApp Integration', revenue: 'Rp 8.200.000', hours: 32, percentage: 23 },
  { name: 'E-Commerce Optimization', revenue: 'Rp 15.800.000', hours: 60, percentage: 30 },
  { name: 'StartupXYZ Mobile', revenue: 'Rp 5.000.000', hours: 15, percentage: 12 },
];

const maxHours = Math.max(...monthlyData.map(d => d.hours));

export default function ReportsPage() {
  return (
    <>
      <Topbar title="Reports" subtitle="Overview of your freelance performance" />
      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon purple"><HiOutlineCurrencyDollar size={22} /></div><div className="stat-value" style={{ marginTop: 12 }}>Rp 48.0M</div><div className="stat-label">Total Revenue (2026)</div></div>
          <div className="stat-card"><div className="stat-icon blue"><HiOutlineClock size={22} /></div><div className="stat-value" style={{ marginTop: 12 }}>620h</div><div className="stat-label">Total Hours</div></div>
          <div className="stat-card"><div className="stat-icon green"><HiOutlineClipboardList size={22} /></div><div className="stat-value" style={{ marginTop: 12 }}>81</div><div className="stat-label">Tasks Completed</div></div>
          <div className="stat-card"><div className="stat-icon orange"><HiOutlineFolder size={22} /></div><div className="stat-value" style={{ marginTop: 12 }}>5</div><div className="stat-label">Projects Delivered</div></div>
        </div>

        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Monthly Hours</span></div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200 }}>
                {monthlyData.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{d.hours}h</span>
                    <div style={{ width: '100%', height: `${(d.hours / maxHours) * 160}px`, background: 'linear-gradient(to top, var(--primary), var(--accent))', borderRadius: '6px 6px 0 0', transition: 'height 0.5s ease', minHeight: 20 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Revenue by Project</span></div>
            <div className="card-body">
              {projectRevenue.map((p, i) => (
                <div key={i} style={{ marginBottom: i < projectRevenue.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontWeight: 600 }}>{p.revenue}</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${p.percentage}%` }} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>{p.hours} hours</span><span>{p.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
