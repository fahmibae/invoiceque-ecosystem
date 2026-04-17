'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { notificationApi } from '@/lib/api';
import styles from './Header.module.css';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notifCount, setNotifCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await notificationApi.list();
        setNotifCount(res.total || 0);
      } catch {
        // Silently fail — notification count is not critical
      }
    }
    fetchNotifications();
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.mobileLogoWrap}>
          <div className={styles.mobileLogo}>IQ</div>
          <span className={styles.mobileTitle}>InvoiceQue</span>
        </div>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Cari invoice, klien..."
            className={styles.searchInput}
          />
        </div>
      </div>
      <div className={styles.headerRight}>
        <button
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <Link href="/notifications" className={styles.notifBtn} title="Notifikasi">
          <span>🔔</span>
          {notifCount > 0 && <span className={styles.notifBadge}>{notifCount}</span>}
        </Link>
        <div
          className={styles.profileBtn}
          onClick={() => setShowMenu(!showMenu)}
          style={{ cursor: 'pointer', position: 'relative' }}
        >
          <div className={styles.profileAvatar}>{initials}</div>
          {showMenu && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              background: 'var(--card-bg)', border: '1px solid var(--border-color)',
              borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: 180, zIndex: 100, overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '10px 16px', border: 'none',
                  background: 'none', cursor: 'pointer', textAlign: 'left',
                  fontSize: 14, color: 'var(--danger)',
                }}
              >
                🚪 Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
