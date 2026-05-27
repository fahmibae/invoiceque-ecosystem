'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import { useTheme } from '@/context/ThemeContext';
import {
  HiOutlineViewGrid, HiOutlineClipboardList, HiOutlineFolder,
  HiOutlineUsers, HiOutlineCalendar, HiOutlineClock,
  HiOutlineCog, HiOutlineChevronLeft, HiOutlineChevronRight,
  HiOutlineSun, HiOutlineMoon, HiOutlineChartBar
} from 'react-icons/hi';

const mainNav = [
  { href: '/', label: 'Dashboard', icon: HiOutlineViewGrid },
  { href: '/tasks', label: 'Task', icon: HiOutlineClipboardList, badge: '12' },
  { href: '/projects', label: 'Project', icon: HiOutlineFolder },
  { href: '/clients', label: 'Clients', icon: HiOutlineUsers },
];
const toolsNav = [
  { href: '/calendar', label: 'Calendar', icon: HiOutlineCalendar },
  { href: '/time-tracking', label: 'Time Tracking', icon: HiOutlineClock },
  { href: '/reports', label: 'Reports', icon: HiOutlineChartBar },
];
const settingsNav = [
  { href: '/settings', label: 'Settings', icon: HiOutlineCog },
];

export default function Sidebar() {
  const { collapsed, mobileOpen, toggleSidebar, closeMobile } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const NavItem = ({ href, label, icon: Icon, badge }: { href: string; label: string; icon: React.ComponentType<{ size?: number }>; badge?: string }) => (
    <Link href={href} className={`nav-item ${pathname === href ? 'active' : ''}`} style={{ gap: collapsed ? '0' : '12px' }} onClick={closeMobile}>
      <Icon size={20} />
      <span className="nav-item-label">{label}</span>
      {badge && <span className="nav-item-badge">{badge}</span>}
    </Link>
  );

  return (
    <>
      <div className={`mobile-overlay ${mobileOpen ? 'active' : ''}`} onClick={closeMobile} />
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <button className="sidebar-toggle" onClick={toggleSidebar} title={collapsed ? 'Expand' : 'Collapse'} style={{ gap: collapsed ? '0' : '12px', left: collapsed ? '87%' : '96%' }}>
          {collapsed ? <HiOutlineChevronRight size={8} /> : <HiOutlineChevronLeft size={8} />}
        </button>
        <div className="sidebar-header">
          <img src="../images/logo-biru.svg" alt="" style={{ width: collapsed ? '35px' : '45px', height: collapsed ? '35px' : '45px' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="sidebar-brand">Tugas<b style={{ color: '#2563eb' }}>Qu</b></span>
            <span className="sidebar-subbrand" style={{ fontSize: '15px' }}>Task Management</span>

          </div>

        </div>
        <nav className="sidebar-nav" style={{ overflowY: 'auto' }}>
          <div className="nav-section">
            <div className="nav-section-title">Main Menu</div>
            {mainNav.map(item => <NavItem key={item.href} {...item} />)}
          </div>
          <div className="nav-section">
            <div className="nav-section-title">Tools</div>
            {toolsNav.map(item => <NavItem key={item.href} {...item} />)}
          </div>
          <div className="nav-section">
            {settingsNav.map(item => <NavItem key={item.href} {...item} />)}
          </div>
        </nav>

        <div className="sidebar-footer" style={{ bottom: 0 }}>

          <div className="user-profile" style={{ gap: collapsed ? '0' : '12px', padding: collapsed ? '0' : '12px' }}>
            <div className="avatar">F</div>
            <div className="user-info">
              <h4>Fahmi Rizal</h4>
              <p>Freelancer Pro</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
