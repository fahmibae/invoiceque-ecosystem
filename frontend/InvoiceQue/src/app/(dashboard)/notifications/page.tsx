'use client';

import React from 'react';
import { useNotification } from '@/context/NotificationContext';
import { Notification01Icon, MoneyBag01Icon, MoneySend01Icon, Alert01Icon, Link04Icon, User02Icon, NotificationBlock01Icon, ArrowLeft01Icon, ArrowRight01Icon } from 'hugeicons-react'

export default function NotificationsPage() {
  const { notifications, loading, error, pagination, fetchNotifications, markAsRead, setPage } = useNotification();

  const handleNotificationClick = async (notif: any) => {
    if (notif.is_read) return;
    await markAsRead(notif.id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'invoice_sent': return <MoneySend01Icon/>;
      case 'payment_received': return <MoneyBag01Icon/>;
      case 'invoice_overdue': return <Alert01Icon/>;
      case 'payment_link_created': return <Link04Icon/>;
      case 'client_created': return <User02Icon/>;
      default: return <Notification01Icon/>;
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

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.total_pages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const { page, total_pages } = pagination;
    const pages: (number | '...')[] = [];
    
    if (total_pages <= 7) {
      for (let i = 1; i <= total_pages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      
      const start = Math.max(2, page - 1);
      const end = Math.min(total_pages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (page < total_pages - 2) pages.push('...');
      pages.push(total_pages);
    }
    
    return pages;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Notifikasi</h1>
          <p className="page-subtitle">
            Riwayat notifikasi dan aktivitas terbaru
            {pagination.total > 0 && (
              <span className="text-text-tertiary"> · {pagination.total} total</span>
            )}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-[60px] px-5 gap-4 text-text-secondary">
          <div className="w-9 h-9 border-[3px] border-border-light border-t-red-600 rounded-full animate-spin" />
          <p>Memuat notifikasi...</p>
        </div>
      ) : error ? (
        <div className="card">
          <div className="text-center py-[60px] px-5">
            <div className="text-[48px] mb-4"><Alert01Icon/></div>
            <h3 className="text-lg font-bold mb-2 text-text-primary">Gagal Memuat</h3>
            <p className="text-text-secondary text-sm max-w-[400px] mx-auto mb-5 leading-[1.6]">{error}</p>
            <button className="btn btn-primary" onClick={() => fetchNotifications()}>Coba Lagi</button>
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center text-center py-[60px] px-5">
            <div className="flex justify-center items-center mb-6 text-text-tertiary/40">
              <NotificationBlock01Icon width={100} height={100} />
            </div>
            <h3 className="text-lg font-bold mb-2 text-text-primary">Belum Ada Notifikasi</h3>
            <p className="text-text-secondary text-sm max-w-[400px] mx-auto mb-0 leading-[1.6]">Notifikasi akan muncul saat ada aktivitas seperti invoice terkirim, pembayaran diterima, dll.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-0.5 bg-bg-card rounded-2xl overflow-hidden border border-border-light">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                onClick={() => handleNotificationClick(notif)}
                className={`flex items-start gap-4 py-5 px-6 transition-colors duration-200 border-b border-border-light last:border-b-0 hover:bg-hover-bg cursor-pointer relative ${!notif.is_read ? 'bg-red-50/5 dark:bg-red-900/10' : ''}`}
              >
                {!notif.is_read && (
                  <div className="absolute top-1/2 left-2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500" />
                )}
                <div className={`text-2xl shrink-0 w-11 h-11 flex items-center justify-center rounded-xl ${!notif.is_read ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-bg-secondary'}`}>
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-3">
                    <span className={`text-sm text-text-primary ${!notif.is_read ? 'font-bold' : 'font-semibold'}`}>
                      {getTypeLabel(notif.type)}
                    </span>
                    <span className="text-xs text-text-tertiary whitespace-nowrap">{formatDate(notif.created_at)}</span>
                  </div>
                  <p className={`text-[13px] leading-[1.5] m-0 ${!notif.is_read ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                    {notif.message}
                  </p>
                  {notif.recipient && (
                    <span className="inline-block mt-1.5 text-xs text-text-tertiary bg-bg-secondary py-0.5 px-2 rounded-md">📧 {notif.recipient}</span>
                  )}
                </div>
                <div className={`shrink-0 text-base ${notif.status === 'sent' ? 'opacity-60' : 'animate-pulse'}`}>
                  {notif.status === 'sent' ? '✅' : '⏳'}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6 flex-wrap gap-4">
              <p className="text-sm text-text-tertiary">
                Menampilkan {((pagination.page - 1) * pagination.per_page) + 1}–{Math.min(pagination.page * pagination.per_page, pagination.total)} dari {pagination.total} notifikasi
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-border-light bg-bg-card text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:border-red-300 hover:text-red-500 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  aria-label="Halaman sebelumnya"
                >
                  <ArrowLeft01Icon width={16} height={16} />
                </button>
                {getPageNumbers().map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-text-tertiary text-sm select-none">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg border text-sm font-medium transition-all duration-150 cursor-pointer ${
                        p === pagination.page
                          ? 'bg-gradient-to-br from-red-600 to-red-500 text-white border-red-500 shadow-sm shadow-red-500/20'
                          : 'border-border-light bg-bg-card text-text-secondary hover:bg-bg-hover hover:border-red-300 hover:text-red-500'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-border-light bg-bg-card text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:border-red-300 hover:text-red-500 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  aria-label="Halaman berikutnya"
                >
                  <ArrowRight01Icon width={16} height={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
