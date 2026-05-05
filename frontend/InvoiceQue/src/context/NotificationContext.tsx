'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { notificationApi, NotificationLog } from '@/lib/api';
import { useAuth } from './AuthContext';

interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

interface NotificationContextType {
  notifications: NotificationLog[];
  unreadCount: number;
  loading: boolean;
  error: string;
  pagination: PaginationMeta;
  fetchNotifications: (page?: number) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  setPage: (page: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const PER_PAGE = 15;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    per_page: PER_PAGE,
    total: 0,
    total_pages: 0,
  });
  const { user } = useAuth();

  const fetchNotifications = useCallback(async (page?: number) => {
    const targetPage = page ?? pagination.page;
    try {
      const res = await notificationApi.list(targetPage, PER_PAGE);
      const data = res.data || [];
      setNotifications(data);
      setUnreadCount(res.unread_count ?? data.filter(n => !n.is_read).length);
      setPagination({
        page: res.page,
        per_page: res.per_page,
        total: res.total,
        total_pages: res.total_pages,
      });
      setError('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat notifikasi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page]);

  const setPage = useCallback((newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);

  const markAsRead = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif || notif.is_read) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await notificationApi.markAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Revert on failure
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n));
      setUnreadCount(prev => prev + 1);
    }
  };

  // Fetch when user changes or page changes
  useEffect(() => {
    if (user) {
      fetchNotifications(pagination.page);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, pagination.page]);

  // Poll for unread count only (lightweight) — refetch current page every 30s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => fetchNotifications(pagination.page), 30000);
    return () => clearInterval(interval);
  }, [user, pagination.page]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, error, pagination, fetchNotifications, markAsRead, setPage }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
