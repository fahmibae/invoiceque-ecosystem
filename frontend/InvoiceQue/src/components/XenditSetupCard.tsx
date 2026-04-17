'use client';

import React, { useState, useEffect } from 'react';
import { xenditApi, type XenditAccount } from '@/lib/api';
import styles from '@/app/(dashboard)/subscription/subscription.module.css';

export default function XenditSetupCard() {
  const [account, setAccount] = useState<XenditAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    xenditApi.getAccount()
      .then(setAccount)
      .catch(() => setAccount(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await xenditApi.setup(email, businessName);
      setAccount(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup gagal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  if (account) {
    return (
      <div className={`${styles.xenditCard} ${styles.xenditActive}`}>
        <div className={styles.xenditHeader}>
          <div className={styles.xenditIcon}>💳</div>
          <div>
            <div className={styles.xenditTitle}>Xendit Payment Gateway</div>
            <div className={styles.xenditSubtitle}>Terima pembayaran langsung ke rekening Anda</div>
          </div>
        </div>
        <div className={styles.xenditInfo}>
          <div className={styles.xenditInfoRow}>
            <span className={styles.xenditInfoLabel}>Status</span>
            <span className={styles.xenditBadge}>✓ Active</span>
          </div>
          <div className={styles.xenditInfoRow}>
            <span className={styles.xenditInfoLabel}>Email</span>
            <span className={styles.xenditInfoValue}>{account.account_email}</span>
          </div>
          <div className={styles.xenditInfoRow}>
            <span className={styles.xenditInfoLabel}>Bisnis</span>
            <span className={styles.xenditInfoValue}>{account.business_name}</span>
          </div>
          <div className={styles.xenditInfoRow}>
            <span className={styles.xenditInfoLabel}>Platform Fee</span>
            <span className={styles.xenditInfoValue}>{account.platform_fee_percent}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.xenditCard}>
      <div className={styles.xenditHeader}>
        <div className={styles.xenditIcon}>💳</div>
        <div>
          <div className={styles.xenditTitle}>Setup Xendit Payment</div>
          <div className={styles.xenditSubtitle}>Hubungkan akun Xendit untuk menerima pembayaran otomatis</div>
        </div>
      </div>
      <form onSubmit={handleSetup}>
        <div className="form-group">
          <label className="form-label">Email Bisnis</label>
          <input
            type="email"
            className="form-input"
            placeholder="email@bisnis.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Nama Bisnis</label>
          <input
            type="text"
            className="form-input"
            placeholder="PT. Nama Bisnis"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
          />
        </div>
        {error && (
          <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Menghubungkan...' : '🔗 Hubungkan Xendit'}
        </button>
      </form>
    </div>
  );
}
