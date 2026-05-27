'use client';
import { HiOutlineBell, HiOutlineSearch, HiOutlinePlus, HiOutlineMenu } from 'react-icons/hi';
import { useSidebar } from '@/context/SidebarContext';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onAddClick?: () => void;
  addLabel?: string;
}

export default function Topbar({ title, subtitle, onAddClick, addLabel }: TopbarProps) {
  const { openMobile } = useSidebar();

  return (
    <div className="topbar">
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="hamburger-btn" onClick={openMobile} title="Menu">
          <HiOutlineMenu size={20} />
        </button>
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="topbar-right">
        <div className="search-box">
          <HiOutlineSearch />
          <input type="text" placeholder="Search..." />
        </div>
        <button className="topbar-btn" title="Notifications">
          <HiOutlineBell size={20} />
          <span className="badge">3</span>
        </button>
        {onAddClick && (
          <button className="btn btn-primary" onClick={onAddClick}>
            <HiOutlinePlus size={18} />
            <span>{addLabel || 'Add New'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
