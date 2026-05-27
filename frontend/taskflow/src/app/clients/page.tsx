'use client';
import { useState } from 'react';
import Topbar from '@/components/Topbar';
import { HiOutlineMail, HiOutlinePhone, HiOutlineFolder, HiOutlinePlus, HiOutlineX, HiOutlineExternalLink } from 'react-icons/hi';

const initialClients = [
  { id: 1, name: 'Web Corp', email: 'hello@webcorp.com', phone: '+62 812-3456-7890', projects: 2, status: 'active', totalRevenue: 'Rp 12.500.000', avatar: 'W' },
  { id: 2, name: 'FinApp Inc.', email: 'contact@finapp.io', phone: '+62 813-9876-5432', projects: 1, status: 'active', totalRevenue: 'Rp 8.200.000', avatar: 'F' },
  { id: 3, name: 'StartupXYZ', email: 'team@startupxyz.co', phone: '+62 821-1234-5678', projects: 1, status: 'active', totalRevenue: 'Rp 5.000.000', avatar: 'S' },
  { id: 4, name: 'E-Commerce Pro', email: 'dev@ecompro.com', phone: '+62 815-6789-0123', projects: 0, status: 'completed', totalRevenue: 'Rp 15.800.000', avatar: 'E' },
  { id: 5, name: 'CreativeHub', email: 'info@creativehub.id', phone: '+62 819-4567-8901', projects: 1, status: 'pending', totalRevenue: 'Rp 0', avatar: 'C' },
];

export default function ClientsPage() {
  const [clients] = useState(initialClients);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Topbar title="Clients" subtitle="Manage your client relationships" onAddClick={() => setShowModal(true)} addLabel="New Client" />
      <div className="page-content">
        <div className="filter-bar">
          <div className="search-box"><input placeholder="Search clients..." style={{ width: 250 }} /></div>
          <select defaultValue="all"><option value="all">All Status</option><option>Active</option><option>Pending</option><option>Completed</option></select>
        </div>

        <div className="card">
          <div className="table-container">
            <table>
              <thead><tr><th>Client</th><th>Contact</th><th>Projects</th><th>Status</th><th>Total Revenue</th><th>Invoice</th></tr></thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar">{c.avatar}</div>
                        <span style={{ fontWeight: 500 }}>{c.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><HiOutlineMail size={14} /> {c.email}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', marginTop: 2 }}><HiOutlinePhone size={14} /> {c.phone}</div></div>
                    </td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><HiOutlineFolder size={16} /> {c.projects} projects</div></td>
                    <td><span className={`status-badge status-${c.status}`}>{c.status}</span></td>
                    <td style={{ fontWeight: 600 }}>{c.totalRevenue}</td>
                    <td><button className="btn btn-sm btn-secondary" title="Buat invoice di InvoiceQu"><HiOutlineExternalLink size={14} /> InvoiceQu</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Add New Client</h2><button className="btn-icon" onClick={() => setShowModal(false)}><HiOutlineX size={18} /></button></div>
            <div className="modal-main-body">
              <div className="modal-body">
                <div className="form-group"><label>Client Name</label><input placeholder="Enter client name" /></div>
                <div className="grid-2">
                  <div className="form-group"><label>Email</label><input type="email" placeholder="client@email.com" /></div>
                  <div className="form-group"><label>Phone</label><input placeholder="+62 xxx-xxxx-xxxx" /></div>
                </div>
                <div className="form-group"><label>Notes</label><textarea placeholder="Additional notes about this client" /></div>
              </div>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary">Add Client</button></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
