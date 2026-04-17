'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { subscriptionApi, type UsageData } from '@/lib/api';
import styles from '@/app/(dashboard)/subscription/subscription.module.css';

function UsageBar({ label, icon, used, limit }: { label: string; icon: string; used: number; limit: number; }) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 10 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const barClass = percentage >= 90 ? styles.usageBarDanger : percentage >= 70 ? styles.usageBarWarning : '';

  return (
    <div>
      <div className={styles.usageRow}>
        <span className={styles.usageLabel}>{icon} {label}</span>
        <span className={styles.usageCount}>
          {used} / {isUnlimited ? '∞' : limit}
        </span>
      </div>
      <div className={styles.usageBarBg}>
        <div className={`${styles.usageBarFill} ${barClass}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default function UsageIndicator() {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    subscriptionApi.getUsage()
      .then(setUsage)
      .catch(() => {
        // Fallback mock for dev
        setUsage({
          invoices_used: 3, invoices_limit: 5,
          clients_used: 6, clients_limit: 10,
          payment_links_used: 2, payment_links_limit: 5,
          can_create_invoice: true, can_create_client: true, can_create_payment: true,
        });
      });
  }, []);

  if (!usage) return null;

  return (
    <div className={styles.usageCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>📊 Penggunaan</h3>
        <Link href="/subscription" style={{ fontSize: 12, color: 'var(--red-500)', fontWeight: 600, textDecoration: 'none' }}>
          Upgrade →
        </Link>
      </div>
      <UsageBar label="Invoice" icon="📄" used={usage.invoices_used} limit={usage.invoices_limit} />
      <UsageBar label="Klien" icon="👥" used={usage.clients_used} limit={usage.clients_limit} />
      <UsageBar label="Payment Link" icon="🔗" used={usage.payment_links_used} limit={usage.payment_links_limit} />
    </div>
  );
}
