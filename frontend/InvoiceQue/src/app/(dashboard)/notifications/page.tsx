"use client";

import React from "react";
import { useNotification } from "@/context/NotificationContext";
import { useLanguage } from "@/context/LanguageContext";
import type { NotificationLog } from "@/lib/api";
import {
  Notification01Icon,
  MoneyBag01Icon,
  MoneySend01Icon,
  Alert01Icon,
  Link04Icon,
  User02Icon,
  NotificationBlock01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  Delete01Icon,
  Cancel01Icon,
  Tick02Icon,
} from "hugeicons-react";

export default function NotificationsPage() {
  const { t, intlLocale } = useLanguage();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    pagination,
    selectedIds,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    deleteSelected,
    toggleSelect,
    selectAll,
    clearSelection,
    setPage,
  } = useNotification();
  const [confirmDeleteAll, setConfirmDeleteAll] = React.useState(false);
  const [selectionMode, setSelectionMode] = React.useState(false);

  const handleNotificationClick = async (notif: NotificationLog) => {
    if (selectionMode) {
      toggleSelect(notif.id);
      return;
    }
    if (notif.is_read) return;
    await markAsRead(notif.id);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    clearSelection();
  };

  const enterSelectionMode = () => {
    setSelectionMode(true);
  };

  const handleDeleteSelected = async () => {
    await deleteSelected();
    setSelectionMode(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "invoice_sent":
        return <MoneySend01Icon />;
      case "payment_received":
        return <MoneyBag01Icon />;
      case "invoice_overdue":
        return <Alert01Icon />;
      case "payment_link_created":
        return <Link04Icon />;
      case "client_created":
        return <User02Icon />;
      default:
        return <Notification01Icon />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "invoice_sent":
        return t("notifications.type.invoiceSent");
      case "payment_received":
        return t("notifications.type.paymentReceived");
      case "invoice_overdue":
        return t("notifications.type.invoiceOverdue");
      case "payment_link_created":
        return t("notifications.type.paymentLinkCreated");
      case "client_created":
        return t("notifications.type.clientCreated");
      default:
        return type;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return t("notifications.justNow");
    if (minutes < 60) return t("notifications.minutesAgo", { count: minutes });
    if (hours < 24) return t("notifications.hoursAgo", { count: hours });
    return date.toLocaleDateString(intlLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.total_pages) return;
    setPage(newPage);
    exitSelectionMode();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isAllSelected =
    notifications.length > 0 && selectedIds.size === notifications.length;

  const getPageNumbers = () => {
    const { page, total_pages } = pagination;
    const pages: (number | "...")[] = [];
    if (total_pages <= 5) {
      for (let i = 1; i <= total_pages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      const start = Math.max(2, page - 1);
      const end = Math.min(total_pages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < total_pages - 2) pages.push("...");
      pages.push(total_pages);
    }
    return pages;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            {t("notifications.title")}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {t("notifications.subtitle")}
            {pagination.total > 0 && (
              <span className="text-text-tertiary">
                {" "}
                · {t("notifications.total", { count: pagination.total })}
              </span>
            )}
          </p>
        </div>

        {notifications.length > 0 && !selectionMode && (
          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn btn-secondary flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3"
              >
                <CheckmarkCircle01Icon width={15} height={15} />
                <span className="hidden sm:inline">
                  {t("notifications.markAllRead")}
                </span>
                <span className="sm:hidden">
                  {t("notifications.markReadShort")}
                </span>
                <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              </button>
            )}
            <button
              onClick={enterSelectionMode}
              className="btn btn-secondary flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3"
            >
              <Tick02Icon width={15} height={15} />
              {t("common.select")}
            </button>
            {!confirmDeleteAll ? (
              <button
                onClick={() => setConfirmDeleteAll(true)}
                className="btn btn-secondary flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Delete01Icon width={15} height={15} />
                <span className="hidden sm:inline">
                  {t("notifications.deleteAll")}
                </span>
                <span className="sm:hidden">
                  {t("notifications.deleteShort")}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    deleteAllNotifications();
                    setConfirmDeleteAll(false);
                  }}
                  className="btn flex items-center gap-1.5 text-xs sm:text-sm py-2 px-3 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium"
                >
                  {t("notifications.confirmDelete")}
                </button>
                <button
                  onClick={() => setConfirmDeleteAll(false)}
                  className="btn btn-secondary text-xs sm:text-sm py-2 px-3"
                >
                  {t("common.cancel")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selection mode toolbar */}
      {selectionMode && (
        <div className="flex items-center gap-2 sm:gap-3 mb-4 py-2.5 px-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-fade-in">
          <button
            onClick={() => (isAllSelected ? clearSelection() : selectAll())}
            className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-lg border-2 transition-all duration-150 cursor-pointer ${
              isAllSelected
                ? "bg-red-600 border-red-600 text-white"
                : "border-gray-300 dark:border-gray-600 hover:border-red-400"
            }`}
          >
            {isAllSelected && <Tick02Icon width={14} height={14} />}
          </button>
          <span className="text-sm font-medium text-text-primary whitespace-nowrap">
            {selectedIds.size > 0
              ? t("common.selected", { count: selectedIds.size })
              : t("notifications.selectPrompt")}
          </span>
          <div className="flex-1" />
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 text-xs sm:text-sm py-1.5 px-3 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium transition-colors cursor-pointer"
            >
              <Delete01Icon width={14} height={14} />
              <span className="hidden sm:inline">
                {t("notifications.deleteSelected", {
                  count: selectedIds.size,
                })}
              </span>
              <span className="sm:hidden">{selectedIds.size}</span>
            </button>
          )}
          <button
            onClick={exitSelectionMode}
            className="flex items-center gap-1 text-xs sm:text-sm py-1.5 px-3 bg-bg-card border border-border-light text-text-secondary hover:bg-bg-hover rounded-lg font-medium transition-colors cursor-pointer"
          >
            <Cancel01Icon width={14} height={14} />
            <span className="hidden sm:inline">{t("common.cancel")}</span>
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 px-5 gap-4 text-text-secondary">
          <div className="w-9 h-9 border-[3px] border-border-light border-t-red-600 rounded-full animate-spin" />
          <p className="text-sm">{t("notifications.loading")}</p>
        </div>
      ) : error ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center text-center py-16 px-5">
            <div className="flex justify-center items-center mb-6 text-text-tertiary/40">
              <Alert01Icon width={80} height={80} />
            </div>
            <h3 className="text-lg font-bold mb-2 text-text-primary">
              {t("notifications.errorTitle")}
            </h3>
            <p className="text-text-secondary text-sm max-w-[360px] mx-auto mb-0 leading-[1.6]">
              {error}
            </p>
            <button
              className="btn btn-primary mt-2"
              onClick={() => fetchNotifications()}
            >
              {t("common.retry")}
            </button>
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center text-center py-16 px-5">
            <div className="flex justify-center items-center mb-6 text-text-tertiary/40">
              <NotificationBlock01Icon width={80} height={80} />
            </div>
            <h3 className="text-lg font-bold mb-2 text-text-primary">
              {t("notifications.emptyTitle")}
            </h3>
            <p className="text-text-secondary text-sm max-w-[360px] mx-auto mb-0 leading-[1.6]">
              {t("notifications.emptySubtitle")}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col bg-bg-card rounded-2xl overflow-hidden border border-border-light">
            {notifications.map((notif) => {
              const isSelected = selectedIds.has(notif.id);
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group flex items-start gap-3 py-3.5 sm:py-4 px-3 sm:px-5 transition-all duration-200 border-b border-border-light last:border-b-0 cursor-pointer relative
                    ${!notif.is_read ? "bg-red-50/5 dark:bg-red-900/10" : "hover:bg-hover-bg"}
                    ${isSelected ? "bg-red-50 dark:bg-red-900/20 border-l-[3px] border-l-red-500 pl-[calc(0.75rem-3px)] sm:pl-[calc(1.25rem-3px)]" : "border-l-[3px] border-l-transparent"}
                    ${selectionMode ? "active:scale-[0.99]" : ""}
                  `}
                >
                  {/* Selection indicator circle */}
                  {selectionMode && (
                    <div
                      className={`shrink-0 mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                        isSelected
                          ? "bg-red-600 border-red-600 text-white scale-100"
                          : "border-gray-300 dark:border-gray-600 scale-90"
                      }`}
                    >
                      {isSelected && <Tick02Icon width={12} height={12} />}
                    </div>
                  )}

                  {/* Unread dot */}
                  {!notif.is_read && !selectionMode && (
                    <div className="absolute top-1/2 left-0.5 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500" />
                  )}

                  {/* Icon */}
                  <div
                    className={`shrink-0 w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl text-lg sm:text-2xl ${
                      !notif.is_read
                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-bg-secondary text-text-tertiary"
                    }`}
                  >
                    {getIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5 gap-2">
                      <span
                        className={`text-xs sm:text-sm text-text-primary truncate ${!notif.is_read ? "font-bold" : "font-semibold"}`}
                      >
                        {getTypeLabel(notif.type)}
                      </span>
                      <span className="text-[11px] sm:text-xs text-text-tertiary whitespace-nowrap">
                        {formatDate(notif.created_at)}
                      </span>
                    </div>
                    <p
                      className={`text-xs sm:text-[13px] leading-[1.5] m-0 line-clamp-2 ${!notif.is_read ? "text-text-primary font-medium" : "text-text-secondary"}`}
                    >
                      {notif.message}
                    </p>
                    {notif.recipient && (
                      <span className="hidden sm:inline-block mt-1.5 text-xs text-text-tertiary bg-bg-secondary py-0.5 px-2 rounded-md">
                        📧 {notif.recipient}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  {!selectionMode && (
                    <div className="shrink-0 flex items-center gap-1">
                      <span
                        className={`text-sm ${notif.status === "sent" ? "opacity-50" : "animate-pulse"}`}
                      >
                        {notif.status === "sent" ? "✅" : "⏳"}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title={t("common.delete")}
                      >
                        <Delete01Icon width={14} height={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-3">
              <p className="text-xs sm:text-sm text-text-tertiary order-2 sm:order-1">
                {t("notifications.showingRange", {
                  from: (pagination.page - 1) * pagination.per_page + 1,
                  to: Math.min(
                    pagination.page * pagination.per_page,
                    pagination.total,
                  ),
                  total: pagination.total,
                })}
              </p>
              <div className="flex items-center gap-1 order-1 sm:order-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border border-border-light bg-bg-card text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:border-red-300 hover:text-red-500 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  aria-label={t("common.previous")}
                >
                  <ArrowLeft01Icon width={14} height={14} />
                </button>
                {getPageNumbers().map((p, i) =>
                  p === "..." ? (
                    <span
                      key={`e-${i}`}
                      className="w-8 h-8 flex items-center justify-center text-text-tertiary text-xs select-none"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer ${
                        p === pagination.page
                          ? "bg-gradient-to-br from-red-600 to-red-500 text-white border-red-500 shadow-sm shadow-red-500/20"
                          : "border-border-light bg-bg-card text-text-secondary hover:bg-bg-hover hover:border-red-300 hover:text-red-500"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border border-border-light bg-bg-card text-text-secondary transition-all duration-150 hover:bg-bg-hover hover:border-red-300 hover:text-red-500 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  aria-label={t("common.next")}
                >
                  <ArrowRight01Icon width={14} height={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
