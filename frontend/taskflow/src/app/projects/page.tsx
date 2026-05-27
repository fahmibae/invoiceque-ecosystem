'use client';
import { useState } from 'react';
import Topbar from '@/components/Topbar';
import { HiOutlineFolder, HiOutlineClock, HiOutlineUsers, HiOutlinePlus, HiOutlineX } from 'react-icons/hi';

const initialProjects = [
  { id: 1, name: 'Web Corp Redesign', client: 'Web Corp', status: 'active', progress: 72, tasks: { done: 18, total: 25 }, hours: 48, deadline: '2026-06-15', color: '#2563eb', desc: 'Complete website redesign with modern UI/UX' },
  { id: 2, name: 'FinApp Payment Integration', client: 'FinApp Inc.', status: 'active', progress: 45, tasks: { done: 9, total: 20 }, hours: 32, deadline: '2026-07-01', color: '#7c3aed', desc: 'Integrate payment gateway and financial reporting' },
  { id: 3, name: 'StartupXYZ Mobile App', client: 'StartupXYZ', status: 'active', progress: 20, tasks: { done: 4, total: 20 }, hours: 15, deadline: '2026-08-01', color: '#059669', desc: 'Build cross-platform mobile application' },
  { id: 4, name: 'E-Commerce Optimization', client: 'E-Commerce Pro', status: 'completed', progress: 100, tasks: { done: 15, total: 15 }, hours: 60, deadline: '2026-05-10', color: '#d97706', desc: 'Performance optimization and database tuning' },
  { id: 5, name: 'Brand Identity System', client: 'CreativeHub', status: 'pending', progress: 0, tasks: { done: 0, total: 12 }, hours: 0, deadline: '2026-09-01', color: '#ec4899', desc: 'Design complete brand identity and guidelines' },
];

export default function ProjectsPage() {
  const [projects] = useState(initialProjects);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  return (
    <>
      <Topbar title="Projects" subtitle="Manage your freelance projects" onAddClick={() => setShowModal(true)} addLabel="New Project" />
      <div className="page-content">
        <div className="filter-bar">
          <div className="tabs" style={{ borderBottom: 'none', marginBottom: 0 }}>
            {['all', 'active', 'pending', 'completed'].map(f => (
              <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)} {f === 'all' ? `(${projects.length})` : `(${projects.filter(p => p.status === f).length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid-3">
          {filtered.map(p => (
            <div className="card" key={p.id} style={{ overflow: 'hidden' }}>
              <div style={{ height: 4, background: p.color }} />
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{p.name}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.desc}</p>
                  </div>
                  <span className={`status-badge status-${p.status}`}>{p.status}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <HiOutlineUsers size={16} /> {p.client}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span>Progress</span><span style={{ fontWeight: 600 }}>{p.progress}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${p.progress}%` }} /></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><HiOutlineFolder size={14} /> {p.tasks.done}/{p.tasks.total} tasks</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><HiOutlineClock size={14} /> {p.hours}h logged</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Create New Project</h2><button className="btn-icon" onClick={() => setShowModal(false)}><HiOutlineX size={18} /></button></div>
            <div className="modal-main-body">
              <div className="modal-body">
                <div className="form-group"><label>Project Name</label><input placeholder="Enter project name" /></div>
                <div className="form-group"><label>Description</label><textarea placeholder="Describe the project" /></div>
                <div className="grid-2">
                  <div className="form-group"><label>Client</label><input placeholder="Client name" /></div>
                  <div className="form-group"><label>Deadline</label><input type="date" /></div>
                </div>
              </div>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary">Create Project</button></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
