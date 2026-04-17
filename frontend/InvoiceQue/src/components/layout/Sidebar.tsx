'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import styles from './Sidebar.module.css';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/invoices', label: 'Invoice', icon: '📄' },
  { href: '/payments', label: 'Payment Links', icon: '🔗' },
  { href: '/clients', label: 'Klien', icon: '👥' },
  { href: '/settings', label: 'Pengaturan', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme } = useTheme();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className={styles.sidebar} data-theme={theme}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <span>IQ</span>
        </div>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>InvoiceQue</span>
          <span className={styles.logoSubtitle}>SaaS Platform</span>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navLabel}>MENU UTAMA</div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navText}>{item.label}</span>
            {isActive(item.href) && <div className={styles.activeIndicator} />}
          </Link>
        ))}
      </nav>

      <div className={styles.userSection}>
        <div className={styles.userAvatar}>
          <span>FA</span>
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>Fahmi Admin</span>
          <span className={styles.userRole}>Administrator</span>
        </div>
      </div>
    </aside>
  );
}
