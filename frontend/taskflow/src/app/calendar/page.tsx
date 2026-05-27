'use client';
import { useState } from 'react';
import Topbar from '@/components/Topbar';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';

const events: Record<string, { title: string; time: string; color: string; project: string }[]> = {
  '2026-05-15': [{ title: 'Design Review', time: '09:00', color: '#2563eb', project: 'Web Corp' }],
  '2026-05-16': [{ title: 'Homepage Deadline', time: '17:00', color: '#ef4444', project: 'Web Corp' }, { title: 'Client Call', time: '14:00', color: '#7c3aed', project: 'FinApp' }],
  '2026-05-18': [{ title: 'API Review', time: '10:00', color: '#059669', project: 'FinApp' }],
  '2026-05-20': [{ title: 'Wireframe Due', time: '17:00', color: '#f59e0b', project: 'StartupXYZ' }],
  '2026-05-22': [{ title: 'Sprint Planning', time: '09:00', color: '#2563eb', project: 'Web Corp' }],
  '2026-05-25': [{ title: 'Research Deadline', time: '17:00', color: '#ec4899', project: 'Web Corp' }],
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1));
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <>
      <Topbar title="Calendar" subtitle="Track your deadlines and meetings" />
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <button className="btn btn-secondary btn-sm" onClick={prevMonth}><HiOutlineChevronLeft size={16} /></button>
            <span className="card-title" style={{ fontSize: 18 }}>{monthName}</span>
            <button className="btn btn-secondary btn-sm" onClick={nextMonth}><HiOutlineChevronRight size={16} /></button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {DAYS.map(d => (
                <div key={d} style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{d}</div>
              ))}
              {cells.map((day, i) => {
                const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                const dayEvents = events[dateStr] || [];
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                return (
                  <div key={i} style={{ minHeight: 100, padding: 8, borderBottom: '1px solid var(--border)', borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none', background: day ? 'transparent' : 'var(--bg)' }}>
                    {day && (
                      <>
                        <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? 'var(--primary)' : 'transparent', color: isToday ? '#fff' : 'var(--text)', marginBottom: 4 }}>{day}</div>
                        {dayEvents.map((ev, j) => (
                          <div key={j} style={{ fontSize: 11, padding: '3px 6px', borderRadius: 4, marginBottom: 2, background: ev.color + '20', color: ev.color, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }} title={`${ev.time} - ${ev.title} (${ev.project})`}>
                            {ev.time} {ev.title}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
