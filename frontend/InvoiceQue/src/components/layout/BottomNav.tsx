'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './BottomNav.module.css';

const navItems = [
  { href: '/', label: 'Home', icon: '📊' },
  { href: '/invoices', label: 'Invoice', icon: '📄' },
  { href: '/payments', label: 'Payment', icon: '🔗' },
  { href: '/clients', label: 'Klien', icon: '👥' },
  { href: '/subscription', label: 'Paket', icon: '💎' },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
        >
          <span className={styles.navIcon}>{item.icon}</span>
          <span className={styles.navLabel}>{item.label}</span>
          {isActive(item.href) && <div className={styles.activeBar} />}
        </Link>
      ))}
    </nav>
  );
}
