'use client';
import Topbar from '@/components/Topbar';
import { useTheme } from '@/context/ThemeContext';
import { HiOutlineSun, HiOutlineMoon, HiOutlineExternalLink } from 'react-icons/hi';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <Topbar title="Settings" subtitle="Manage your account and preferences" />
      <div className="page-content">
        <div className="grid-2">
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><span className="card-title">Profile</span></div>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                  <div className="avatar" style={{ width: 64, height: 64, fontSize: 24 }}>F</div>
                  <div><h3 style={{ fontSize: 18, fontWeight: 600 }}>Fahmi Rizal</h3><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Freelancer Pro</p></div>
                </div>
                <div className="form-group"><label>Full Name</label><input defaultValue="Fahmi Rizal" /></div>
                <div className="form-group"><label>Email</label><input defaultValue="fahmi@taskflow.id" type="email" /></div>
                <div className="form-group"><label>Phone</label><input defaultValue="+62 812-3456-7890" /></div>
                <div className="form-group"><label>Bio</label><textarea defaultValue="Full-stack developer & UI/UX designer. Passionate about building great products." /></div>
                <button className="btn btn-primary">Save Changes</button>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">InvoiceQu Integration</span></div>
              <div className="card-body">
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  Hubungkan TaskFlow dengan InvoiceQu untuk mengelola invoice dan transaksi freelance Anda secara otomatis.
                </p>
                <div className="form-group"><label>InvoiceQu API URL</label><input defaultValue="https://app.invoicequ.com" /></div>
                <div className="form-group"><label>API Key</label><input type="password" defaultValue="sk_live_xxxxxxxxxxxx" /></div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary">Save Integration</button>
                  <button className="btn btn-secondary"><HiOutlineExternalLink size={16} /> Open InvoiceQu</button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><span className="card-title">Appearance</span></div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => theme === 'dark' && toggleTheme()} className="btn btn-secondary" style={{ flex: 1, padding: '20px', flexDirection: 'column', gap: 8, border: theme === 'light' ? '2px solid var(--primary)' : '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                    <HiOutlineSun size={24} /><span>Light Mode</span>
                  </button>
                  <button onClick={() => theme === 'light' && toggleTheme()} className="btn btn-secondary" style={{ flex: 1, padding: '20px', flexDirection: 'column', gap: 8, border: theme === 'dark' ? '2px solid var(--primary)' : '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
                    <HiOutlineMoon size={24} /><span>Dark Mode</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><span className="card-title">Notifications</span></div>
              <div className="card-body">
                {['Task deadline reminders', 'Project updates', 'Client messages', 'Weekly report summary'].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border-light)' : 'none' }}>
                    <span style={{ fontSize: 14 }}>{item}</span>
                    <label style={{ position: 'relative', width: 44, height: 24, cursor: 'pointer' }}>
                      <input type="checkbox" defaultChecked={i < 3} style={{ display: 'none' }} />
                      <span style={{ position: 'absolute', inset: 0, background: i < 3 ? 'var(--primary)' : 'var(--border)', borderRadius: 12, transition: '0.2s' }}>
                        <span style={{ position: 'absolute', top: 2, left: i < 3 ? 22 : 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: '0.2s' }} />
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Working Hours</span></div>
              <div className="card-body">
                <div className="grid-2">
                  <div className="form-group"><label>Start Time</label><input type="time" defaultValue="09:00" /></div>
                  <div className="form-group"><label>End Time</label><input type="time" defaultValue="17:00" /></div>
                </div>
                <div className="form-group"><label>Hourly Rate (IDR)</label><input type="number" defaultValue="150000" /></div>
                <button className="btn btn-primary">Save Preferences</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
