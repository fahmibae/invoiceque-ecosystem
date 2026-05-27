'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar03Icon, ArrowLeft01Icon, ArrowRight01Icon,
  Loading03Icon, Task01Icon,
} from 'hugeicons-react';
import { taskApi, type Task } from '@/lib/api';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const priorityColors: Record<string, string> = {
  high: '#DC2626',
  medium: '#F59E0B',
  low: '#10B981',
};

const statusColors: Record<string, string> = {
  backlog: '#94A3B8',
  todo: '#3B82F6',
  inprogress: '#F59E0B',
  done: '#10B981',
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    taskApi.list({ per_page: 200 })
      .then(res => setTasks(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  // Group tasks by due_date
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach(t => {
      if (t.due_date) {
        const dateStr = t.due_date.split('T')[0];
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(t);
      }
    });
    return map;
  }, [tasks]);

  const selectedDateStr = selectedDay
    ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : null;
  const selectedTasks = selectedDateStr ? (tasksByDate[selectedDateStr] || []) : [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Kalender</h1>
          <p className="page-subtitle">Lihat deadline dan jadwal tugas Anda</p>
        </div>
        <button className="btn btn-secondary" onClick={goToday}>Hari Ini</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loading03Icon width={32} height={32} className="animate-spin text-red-500" />
        </div>
      ) : (
        <div className="flex gap-6 flex-col xl:flex-row">
          {/* Calendar Grid */}
          <div className="card flex-1">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-hover transition-colors" onClick={prevMonth}>
                <ArrowLeft01Icon width={18} height={18} />
              </button>
              <h3 className="text-base font-bold capitalize">{monthName}</h3>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-hover transition-colors" onClick={nextMonth}>
                <ArrowRight01Icon width={18} height={18} />
              </button>
            </div>
            <div className="p-0">
              <div className="grid grid-cols-7">
                {DAYS.map(d => (
                  <div key={d} className="py-3 text-center text-xs font-bold text-text-tertiary uppercase tracking-wider border-b border-border-light">
                    {d}
                  </div>
                ))}
                {cells.map((day, i) => {
                  const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                  const dayTasks = tasksByDate[dateStr] || [];
                  const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                  const isSelected = selectedDay === String(day);

                  return (
                    <div
                      key={i}
                      className={`min-h-[100px] p-2 border-b border-r border-border-light transition-colors cursor-pointer ${
                        day ? 'hover:bg-bg-hover' : 'bg-bg-secondary/30'
                      } ${isSelected ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                      style={{ borderRight: (i + 1) % 7 === 0 ? 'none' : undefined }}
                      onClick={() => day && setSelectedDay(String(day))}
                    >
                      {day && (
                        <>
                          <div className={`text-sm mb-1.5 w-7 h-7 flex items-center justify-center rounded-full ${
                            isToday ? 'bg-red-500 text-white font-bold' : 'font-medium'
                          }`}>
                            {day}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {dayTasks.slice(0, 3).map(task => (
                              <div
                                key={task.id}
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium truncate"
                                style={{
                                  background: (priorityColors[task.priority] || '#6B7280') + '18',
                                  color: priorityColors[task.priority] || '#6B7280',
                                }}
                                title={`${task.title} (${task.priority})`}
                              >
                                {task.title}
                              </div>
                            ))}
                            {dayTasks.length > 3 && (
                              <div className="text-[10px] text-text-tertiary font-medium px-1">
                                +{dayTasks.length - 3} lagi
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Day Detail */}
          <div className="w-full xl:w-80 shrink-0">
            <div className="card sticky top-5">
              <div className="px-5 py-4 border-b border-border-light">
                <h3 className="text-sm font-bold text-text-primary">
                  {selectedDateStr
                    ? new Date(selectedDateStr + 'T00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
                    : 'Pilih tanggal'
                  }
                </h3>
                <p className="text-xs text-text-tertiary mt-0.5">{selectedTasks.length} tugas</p>
              </div>
              <div className="p-4">
                {!selectedDateStr ? (
                  <div className="text-center py-8">
                    <Calendar03Icon width={32} height={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-text-tertiary">Klik tanggal untuk lihat detail</p>
                  </div>
                ) : selectedTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Task01Icon width={32} height={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs text-text-tertiary">Tidak ada tugas di tanggal ini</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {selectedTasks.map(task => (
                      <div key={task.id} className="p-3 bg-bg-secondary rounded-lg">
                        <div className="flex items-start justify-between mb-1.5">
                          <h4 className="text-sm font-semibold text-text-primary leading-snug">{task.title}</h4>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ml-2"
                            style={{ background: (priorityColors[task.priority] || '#6B7280') + '18', color: priorityColors[task.priority] || '#6B7280' }}>
                            {task.priority}
                          </span>
                        </div>
                        {task.project_name && (
                          <p className="text-xs text-text-tertiary mb-1">📁 {task.project_name}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: (statusColors[task.status] || '#6B7280') + '18', color: statusColors[task.status] || '#6B7280' }}>
                            {task.status === 'todo' ? 'To Do' : task.status === 'inprogress' ? 'In Progress' : task.status === 'done' ? 'Done' : 'Backlog'}
                          </span>
                          {task.estimated_hours > 0 && (
                            <span className="text-[10px] text-text-tertiary">⏱ {task.estimated_hours}h</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
