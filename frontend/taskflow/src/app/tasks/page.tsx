'use client';
import { useState } from 'react';
import Topbar from '@/components/Topbar';
import { HiOutlineClock, HiOutlineCalendar, HiOutlinePlus, HiOutlineX, HiOutlineDotsVertical } from 'react-icons/hi';

interface Task {
  id: number; title: string; desc: string; priority: 'high' | 'medium' | 'low';
  project: string; due: string; tags: string[];
}

const initialColumns: Record<string, { title: string; color: string; tasks: Task[] }> = {
  backlog: {
    title: 'Backlog', color: '#94a3b8', tasks: [
      { id: 1, title: 'Research competitor analysis', desc: 'Analyze top 5 competitors in the market', priority: 'low', project: 'Web Corp', due: '2026-05-25', tags: ['Research'] },
      { id: 2, title: 'Create brand guidelines', desc: 'Define color palette, typography, and logo usage', priority: 'medium', project: 'StartupXYZ', due: '2026-05-28', tags: ['Design'] },
    ]
  },
  todo: {
    title: 'To Do', color: '#3b82f6', tasks: [
      { id: 3, title: 'Design Homepage Redesign', desc: 'Create new homepage layout with modern UI', priority: 'high', project: 'Web Corp', due: '2026-05-16', tags: ['UI/UX', 'Design'] },
      { id: 4, title: 'Setup CI/CD Pipeline', desc: 'Configure automated deployment workflow', priority: 'medium', project: 'FinApp', due: '2026-05-20', tags: ['DevOps'] },
      { id: 5, title: 'Write API documentation', desc: 'Document all REST endpoints', priority: 'low', project: 'FinApp', due: '2026-05-22', tags: ['Docs'] },
    ]
  },
  inprogress: {
    title: 'In Progress', color: '#f59e0b', tasks: [
      { id: 6, title: 'API Integration Payment', desc: 'Integrate payment gateway with backend', priority: 'high', project: 'FinApp', due: '2026-05-18', tags: ['Backend', 'API'] },
      { id: 7, title: 'Mobile App Wireframe', desc: 'Design wireframe for all main screens', priority: 'high', project: 'StartupXYZ', due: '2026-05-20', tags: ['Mobile', 'UI/UX'] },
    ]
  },
  done: {
    title: 'Done', color: '#10b981', tasks: [
      { id: 8, title: 'Database Schema Design', desc: 'Design normalized database structure', priority: 'medium', project: 'E-Commerce Pro', due: '2026-05-14', tags: ['Database'] },
      { id: 9, title: 'User Authentication', desc: 'Implement JWT auth with refresh tokens', priority: 'high', project: 'FinApp', due: '2026-05-12', tags: ['Backend', 'Security'] },
    ]
  },
};

export default function TasksPage() {
  const [columns, setColumns] = useState(initialColumns);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [newTask, setNewTask] = useState({ title: '', desc: '', priority: 'medium' as Task['priority'], project: '', due: '', column: 'todo' });

  const addTask = () => {
    if (!newTask.title) return;
    const task: Task = { id: Date.now(), title: newTask.title, desc: newTask.desc, priority: newTask.priority, project: newTask.project || 'Unassigned', due: newTask.due, tags: [] };
    setColumns(prev => ({ ...prev, [newTask.column]: { ...prev[newTask.column], tasks: [...prev[newTask.column].tasks, task] } }));
    setNewTask({ title: '', desc: '', priority: 'medium', project: '', due: '', column: 'todo' });
    setShowModal(false);
  };

  const allTasks = Object.entries(columns).flatMap(([status, col]) => col.tasks.map(t => ({ ...t, status: col.title })));

  return (
    <>
      <Topbar title="Tasks" subtitle="Manage and organize your freelance tasks" onAddClick={() => setShowModal(true)} addLabel="New Task" />
      <div className="page-content">
        <div className="filter-bar">
          <div className="tabs" style={{ borderBottom: 'none', marginBottom: 0 }}>
            <button className={`tab ${viewMode === 'kanban' ? 'active' : ''}`} onClick={() => setViewMode('kanban')}>Kanban Board</button>
            <button className={`tab ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>List View</button>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <select defaultValue="all"><option value="all">All Projects</option><option>Web Corp</option><option>FinApp</option><option>StartupXYZ</option></select>
            <select defaultValue="all"><option value="all">All Priorities</option><option>High</option><option>Medium</option><option>Low</option></select>
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <div className="kanban">
            {Object.entries(columns).map(([key, col]) => (
              <div className="kanban-col" key={key}>
                <div className="kanban-col-header">
                  <div className="kanban-col-title">
                    <span className="kanban-col-dot" style={{ background: col.color }} />
                    {col.title}
                    <span className="kanban-col-count">{col.tasks.length}</span>
                  </div>
                  <button className="btn-icon" style={{ width: 28, height: 28 }} onClick={() => { setNewTask(p => ({ ...p, column: key })); setShowModal(true); }}>
                    <HiOutlinePlus size={16} />
                  </button>
                </div>
                <div className="kanban-col-body">
                  {col.tasks.map(task => (
                    <div className="kanban-card" key={task.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
                        <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><HiOutlineDotsVertical size={16} /></button>
                      </div>
                      <div className="kanban-card-title">{task.title}</div>
                      <div className="kanban-card-desc">{task.desc}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                        {task.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                      </div>
                      <div className="kanban-card-footer">
                        <div className="kanban-card-meta"><HiOutlineCalendar /> {task.due}</div>
                        <span className="tag">{task.project}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="table-container">
              <table>
                <thead><tr><th>Task</th><th>Project</th><th>Priority</th><th>Status</th><th>Due Date</th></tr></thead>
                <tbody>
                  {allTasks.map(t => (
                    <tr key={t.id}>
                      <td><div style={{ fontWeight: 500 }}>{t.title}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.desc}</div></td>
                      <td><span className="tag">{t.project}</span></td>
                      <td><span className={`priority-badge priority-${t.priority}`}>{t.priority}</span></td>
                      <td><span className={`status-badge status-${t.status === 'Done' ? 'completed' : t.status === 'In Progress' ? 'active' : 'pending'}`}>{t.status}</span></td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Task</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><HiOutlineX size={18} /></button>
            </div>
            <div className="modal-main-body">
              <div className="modal-body">
                <div className="form-group"><label>Task Title</label><input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="Enter task title" /></div>
                <div className="form-group"><label>Description</label><textarea value={newTask.desc} onChange={e => setNewTask(p => ({ ...p, desc: e.target.value }))} placeholder="Describe the task" /></div>
                <div className="grid-2">
                  <div className="form-group"><label>Project</label><input value={newTask.project} onChange={e => setNewTask(p => ({ ...p, project: e.target.value }))} placeholder="Project name" /></div>
                  <div className="form-group"><label>Due Date</label><input type="date" value={newTask.due} onChange={e => setNewTask(p => ({ ...p, due: e.target.value }))} /></div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label>Priority</label><select value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value as Task['priority'] }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                  <div className="form-group"><label>Column</label><select value={newTask.column} onChange={e => setNewTask(p => ({ ...p, column: e.target.value }))}><option value="backlog">Backlog</option><option value="todo">To Do</option><option value="inprogress">In Progress</option><option value="done">Done</option></select></div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={addTask}>Create Task</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
