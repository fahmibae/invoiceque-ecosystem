'use client';

import React, { useEffect, useState } from 'react';
import { notificationApi, NotificationLog } from '@/lib/api';
import styles from './notifications.module.css';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.list();
      setNotifications(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat notifikasi';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'invoice_sent': return '📨';
      case 'payment_received': return '💰';
      case 'invoice_overdue': return '⚠️';
      case 'payment_link_created': return '🔗';
      case 'client_created': return '👤';
      default: return '🔔';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'invoice_sent': return 'Invoice Terkirim';
      case 'payment_received': return 'Pembayaran Diterima';
      case 'invoice_overdue': return 'Invoice Jatuh Tempo';
      case 'payment_link_created': return 'Payment Link Dibuat';
      case 'client_created': return 'Klien Baru';
      default: return type;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">🔔 Notifikasi</h1>
          <p className="page-subtitle">Riwayat notifikasi dan aktivitas terbaru</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Memuat notifikasi...</p>
        </div>
      ) : error ? (
        <div className="card">
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⚠️</div>
            <h3>Gagal Memuat</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={loadNotifications}>Coba Lagi</button>
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card">
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔕</div>
            <h3>Belum Ada Notifikasi</h3>
            <p>Notifikasi akan muncul saat ada aktivitas seperti invoice terkirim, pembayaran diterima, dll.</p>
          </div>
        </div>
      ) : (
        <div className={styles.notifList}>
          {notifications.map((notif) => (
            <div key={notif.id} className={styles.notifItem}>
              <div className={styles.notifIcon}>{getIcon(notif.type)}</div>
              <div className={styles.notifContent}>
                <div className={styles.notifHeader}>
                  <span className={styles.notifType}>{getTypeLabel(notif.type)}</span>
                  <span className={styles.notifTime}>{formatDate(notif.created_at)}</span>
                </div>
                <p className={styles.notifMessage}>{notif.message}</p>
                {notif.recipient && (
                  <span className={styles.notifRecipient}>📧 {notif.recipient}</span>
                )}
              </div>
              <div className={`${styles.notifStatus} ${notif.status === 'sent' ? styles.sent : styles.pending}`}>
                {notif.status === 'sent' ? '✅' : '⏳'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
