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
  selectedIds: Set<string>;
  fetchNotifications: (page?: number) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  deleteSelected: () => Promise<void>;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    // Save snapshot for revert
    const prevNotifications = [...notifications];
    const prevUnread = unreadCount;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await notificationApi.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Revert on failure
      setNotifications(prevNotifications);
      setUnreadCount(prevUnread);
    }
  };
  const deleteNotification = async (id: string) => {
    const prevNotifications = [...notifications];
    const prevUnread = unreadCount;
    const target = notifications.find(n => n.id === id);

    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (target && !target.is_read) setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await notificationApi.delete(id);
      // Refetch to get correct pagination
      await fetchNotifications(pagination.page);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      setNotifications(prevNotifications);
      setUnreadCount(prevUnread);
    }
  };

  const deleteAllNotifications = async () => {
    if (notifications.length === 0) return;

    const prevNotifications = [...notifications];
    const prevUnread = unreadCount;

    // Optimistic update
    setNotifications([]);
    setUnreadCount(0);

    try {
      await notificationApi.deleteAll();
      setPagination(prev => ({ ...prev, total: 0, total_pages: 0, page: 1 }));
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
      setNotifications(prevNotifications);
      setUnreadCount(prevUnread);
    }
  };
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(notifications.map(n => n.id)));
  }, [notifications]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const prevNotifications = [...notifications];
    const prevUnread = unreadCount;
    const idsToDelete = Array.from(selectedIds);
    const unreadDeleted = notifications.filter(n => idsToDelete.includes(n.id) && !n.is_read).length;

    // Optimistic update
    setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
    setUnreadCount(prev => Math.max(0, prev - unreadDeleted));
    setSelectedIds(new Set());

    try {
      await notificationApi.deleteBatch(idsToDelete);
      await fetchNotifications(pagination.page);
    } catch (error) {
      console.error('Failed to delete selected notifications:', error);
      setNotifications(prevNotifications);
      setUnreadCount(prevUnread);
      setSelectedIds(new Set(idsToDelete));
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

  // Clear selection when page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [pagination.page]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, error, pagination, selectedIds, fetchNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications, deleteSelected, toggleSelect, selectAll, clearSelection, setPage }}>
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
