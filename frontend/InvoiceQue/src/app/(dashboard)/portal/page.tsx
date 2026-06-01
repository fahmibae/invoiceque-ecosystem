"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { portalApi, clientApi, type PortalToken, type Client } from "@/lib/api";
import {
  Link04Icon,
  Delete02Icon,
  Copy01Icon,
  Tick01Icon,
  Cancel01Icon,
  UserGroupIcon,
  PencilEdit01Icon,
  MoreVerticalIcon,
} from "hugeicons-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Portal from "@/components/ui/Portal";
import { useLanguage } from "@/context/LanguageContext";

function PortalDropdown({
  link,
  copied,
  onCopy,
  onEdit,
  onDelete,
}: {
  link: PortalToken;
  copied: string;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  return (
    <div className="relative" ref={ref}>
      <button
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-secondary transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVerticalIcon width={18} height={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-border-color rounded-xl shadow-lg z-50 py-1.5 animate-fade-in">
          {link.is_active && (
            <>
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-bg-secondary text-left transition-colors"
                onClick={() => {
                  onCopy();
                  close();
                }}
              >
                {copied === link.token ? (
                  <>
                    <Tick01Icon
                      width={16}
                      height={16}
                      className="text-emerald-500"
                    />{" "}
                    <span className="text-emerald-600">
                      {t("portal.copied")}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy01Icon
                      width={16}
                      height={16}
                      className="text-text-tertiary"
                    />{" "}
                    {t("portal.copyLink")}
                  </>
                )}
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-bg-secondary text-left transition-colors"
                onClick={() => {
                  onEdit();
                  close();
                }}
              >
                <PencilEdit01Icon
                  width={16}
                  height={16}
                  className="text-text-tertiary"
                />{" "}
                {t("common.edit")}
              </button>
              <div className="border-t border-border-light my-1" />
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 text-left transition-colors text-red-500"
                onClick={() => {
                  onDelete();
                  close();
                }}
              >
                <Delete02Icon width={16} height={16} />{" "}
                {t("portal.revokeAccess")}
              </button>
            </>
          )}
          {!link.is_active && (
            <p className="px-4 py-2.5 text-sm text-text-tertiary">
              {t("portal.accessRevoked")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PortalLinksPage() {
  const { t, intlLocale } = useLanguage();
  const [links, setLinks] = useState<PortalToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [copied, setCopied] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [clientsLoading, setClientsLoading] = useState(false);
  const [editLink, setEditLink] = useState<PortalToken | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Pagination & selection
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await portalApi.listLinks();
      setLinks(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("portal.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const totalPages = Math.max(1, Math.ceil(links.length / itemsPerPage));
  const paginated = links.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === paginated.length && paginated.length > 0)
      setSelected(new Set());
    else setSelected(new Set(paginated.map((l) => l.id)));
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await portalApi.bulkDelete(Array.from(selected));
      setSelected(new Set());
      setShowBulkDeleteModal(false);
      await fetchLinks();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("portal.deleteError"));
    }
    setBulkDeleting(false);
  };

  const openGenerate = async () => {
    setShowGenerate(true);
    setClientsLoading(true);
    try {
      const res = await clientApi.list(undefined, 1, 100);
      setClients(res.data || []);
    } catch {}
    setClientsLoading(false);
  };

  const handleGenerate = async () => {
    if (!selectedClient) return;
    setActionLoading("generating");
    try {
      await portalApi.generateLink(selectedClient);
      setShowGenerate(false);
      setSelectedClient("");
      await fetchLinks();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("portal.createError"));
    }
    setActionLoading("");
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setActionLoading(revokeTarget);
    try {
      await portalApi.revokeLink(revokeTarget);
      setShowRevokeModal(false);
      setRevokeTarget(null);
      await fetchLinks();
    } catch {}
    setActionLoading("");
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(""), 2000);
  };

  const openEdit = (link: PortalToken) => {
    setEditLink(link);
    setEditName(link.client_name);
    setEditEmail(link.client_email);
  };

  const handleEdit = async () => {
    if (!editLink) return;
    setActionLoading("editing");
    try {
      await portalApi.updateLink(editLink.client_id, {
        name: editName,
        email: editEmail,
      });
      setEditLink(null);
      await fetchLinks();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("portal.saveError"));
    }
    setActionLoading("");
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>{t("portal.loading")}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmModal
        isOpen={showRevokeModal}
        title={t("portal.revokeTitle")}
        message={t("portal.revokeMessage")}
        confirmText={t("portal.revoke")}
        onConfirm={handleRevoke}
        onCancel={() => setShowRevokeModal(false)}
        isLoading={!!actionLoading}
        type="danger"
      />
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        title={t("portal.deleteTitle")}
        message={t("portal.deleteBulkMessage", { count: selected.size })}
        confirmText={t("portal.deleteBulkConfirm", { count: selected.size })}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
        isLoading={bulkDeleting}
        type="danger"
      />

      {/* Generate Modal */}
      {showGenerate && (
        <Portal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-5"
            onClick={() => setShowGenerate(false)}
          >
            <div
              className="bg-bg-card w-full max-w-[500px] rounded-2xl shadow-xl border border-border-color animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
                <h3 className="text-lg font-bold">{t("portal.createTitle")}</h3>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary"
                  onClick={() => setShowGenerate(false)}
                >
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>
              <div className="px-6 py-5">
                <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                  {t("portal.chooseClient")}
                </label>
                {clientsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-3 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <select
                    className="w-full py-3 px-3 border border-border-color rounded-md bg-bg-card text-sm"
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                  >
                    <option value="">
                      {t("portal.chooseClientPlaceholder")}
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.email}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-text-tertiary mt-3">
                  {t("portal.createHint")}
                </p>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border-light">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowGenerate(false)}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={handleGenerate}
                  disabled={!selectedClient || actionLoading === "generating"}
                >
                  {actionLoading === "generating"
                    ? t("portal.creating")
                    : t("portal.createLink")}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Edit Modal */}
      {editLink && (
        <Portal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-5"
            onClick={() => setEditLink(null)}
          >
            <div
              className="bg-bg-card w-full max-w-[500px] rounded-2xl shadow-xl border border-border-color animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
                <h3 className="text-lg font-bold">{t("portal.editTitle")}</h3>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary"
                  onClick={() => setEditLink(null)}
                >
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("portal.clientName")}
                  </label>
                  <input
                    type="text"
                    className="w-full py-3 px-3 border border-border-color rounded-md bg-bg-card text-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("portal.clientEmail")}
                  </label>
                  <input
                    type="email"
                    className="w-full py-3 px-3 border border-border-color rounded-md bg-bg-card text-sm"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border-light">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={() => setEditLink(null)}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={handleEdit}
                  disabled={
                    !editName || !editEmail || actionLoading === "editing"
                  }
                >
                  {actionLoading === "editing"
                    ? t("common.saving")
                    : t("common.saveChanges")}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{t("portal.title")}</h1>
          <p className="page-subtitle">{t("portal.subtitle")}</p>
        </div>
        <button className="btn btn-primary" onClick={openGenerate}>
          <span>＋</span> {t("portal.createPortalLink")}
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 mb-4 animate-fade-in">
          <span className="text-sm font-medium text-red-700 dark:text-red-400">
            {t("portal.selected", { count: selected.size })}
          </span>
          <div className="flex gap-2">
            <button
              className="text-xs px-3 py-1.5 rounded-md bg-white dark:bg-bg-card border border-border-color hover:bg-bg-secondary transition-colors"
              onClick={() => setSelected(new Set())}
            >
              {t("common.cancel")}
            </button>
            <button
              className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1"
              onClick={() => setShowBulkDeleteModal(true)}
            >
              <Delete02Icon width={14} height={14} />{" "}
              {t("portal.deleteSelected")}
            </button>
          </div>
        </div>
      )}

      {links.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              className="w-4 h-4 accent-red-600 rounded"
              checked={
                selected.size === paginated.length && paginated.length > 0
              }
              onChange={toggleSelectAll}
            />
            <span className="text-xs text-text-tertiary font-medium">
              {t("portal.selectAll")}
            </span>
          </div>
          {paginated.map((link) => (
            <div
              key={link.id}
              className={`bg-bg-card border rounded-lg p-4 md:p-5 shadow-sm hover:shadow-md transition-all ${selected.has(link.id) ? "border-red-400 bg-red-50/30 dark:bg-red-950/10" : "border-border-color"}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-red-600 rounded mt-2.5 shrink-0"
                  checked={selected.has(link.id)}
                  onChange={() => toggleSelect(link.id)}
                />
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Link04Icon width={18} height={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-sm truncate">
                        {link.client_name}
                      </span>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${link.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                      >
                        {link.is_active
                          ? t("portal.status.active")
                          : t("portal.status.revoked")}
                      </span>
                    </div>
                    <PortalDropdown
                      link={link}
                      copied={copied}
                      onCopy={() => copyLink(link.token)}
                      onEdit={() => openEdit(link)}
                      onDelete={() => {
                        setRevokeTarget(link.client_id);
                        setShowRevokeModal(true);
                      }}
                    />
                  </div>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {link.client_email}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {t("portal.createdAt", {
                      date: new Intl.DateTimeFormat(intlLocale, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(link.created_at)),
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card flex flex-col justify-center items-center text-center py-16 px-5">
          <div className="text-5xl mb-4 opacity-50">
            <UserGroupIcon width={48} height={48} />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t("portal.emptyTitle")}
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            {t("portal.emptySubtitle")}
          </p>
          <button className="btn btn-primary" onClick={openGenerate}>
            {t("portal.createLink")}
          </button>
        </div>
      )}

      {/* Pagination */}
      {links.length > itemsPerPage && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border border-border-color bg-bg-card rounded-lg">
          <div className="text-sm text-text-secondary text-center sm:text-left">
            {t("common.showingRange", {
              from: (currentPage - 1) * itemsPerPage + 1,
              to: Math.min(currentPage * itemsPerPage, links.length),
              total: links.length,
            })}
          </div>
          <div className="flex gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
            <button
              className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-border-color rounded-md bg-bg-secondary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                setSelected(new Set());
              }}
              disabled={currentPage === 1}
            >
              {t("common.previous")}
            </button>
            <div className="flex items-center justify-center px-3 text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 rounded-md min-w-[50px]">
              {currentPage} / {totalPages}
            </div>
            <button
              className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-border-color rounded-md bg-bg-secondary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                setSelected(new Set());
              }}
              disabled={currentPage === totalPages}
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
