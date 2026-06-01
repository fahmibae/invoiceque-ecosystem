"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckListIcon,
  Add01Icon,
  Cancel01Icon,
  Search01Icon,
  Delete02Icon,
  MoreVerticalIcon,
  Loading03Icon,
  ArrowLeft01Icon,
  Tick01Icon,
  Copy01Icon,
  GoogleDocIcon,
} from "hugeicons-react";
import Portal from "@/components/ui/Portal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useLanguage } from "@/context/LanguageContext";
import { toolkitApi, type ToolkitItem } from "@/lib/api";

interface ChecklistItemData {
  text: string;
  checked: boolean;
}

interface ChecklistContent {
  description?: string;
  items: ChecklistItemData[];
}

// ── Pre-built templates ──
const TEMPLATES: { title: string; description: string; items: string[] }[] = [
  {
    title: "Persiapan Sebelum Deploy ke Production",
    description: "Pastikan semua siap sebelum deploy ke production",
    items: [
      "Semua test passed (unit, integration, e2e)",
      "Code review approved",
      "Environment variables production sudah di-set",
      "Database migration sudah di-run",
      "Build production berhasil tanpa error",
      "Bundle size masih dalam batas wajar",
      "Error monitoring (Sentry/etc) aktif",
      "SSL certificate valid",
      "Backup database sebelum deploy",
      "Rollback plan sudah disiapkan",
    ],
  },
  {
    title: "Persiapan Sebelum Development",
    description: "Checklist standar untuk reviewer",
    items: [
      "Logika bisnis sudah benar",
      "Tidak ada hardcoded value / secrets",
      "Error handling sudah proper",
      "Naming convention konsisten",
      "Tidak ada console.log tersisa",
      "Performance: tidak ada N+1 query",
      "Security: input sudah di-sanitize",
      "Tests tersedia untuk fitur baru",
      "Documentation/comments sudah updated",
    ],
  },
  {
    title: "Persiapan Setup Project Baru",
    description: "Setup awal untuk project baru",
    items: [
      "Repository sudah dibuat",
      "CI/CD pipeline sudah di-setup",
      "Branching strategy sudah ditentukan",
      "Package manager & dependencies di-install",
      "Linter & formatter sudah dikonfigurasi",
      "README.md sudah dibuat",
      "Environment dev/staging/prod sudah di-setup",
      "Task board / Kanban sudah disiapkan",
      "Kick-off meeting dengan klien",
    ],
  },
  {
    title: "Persiapan Setup Endpoint API",
    description: "Pastikan setiap endpoint sudah lengkap",
    items: [
      "Input validation",
      "Authentication & authorization",
      "Rate limiting",
      "Error responses standar",
      "Pagination untuk list endpoints",
      "API documentation (Swagger/OpenAPI)",
      "Request/response logging",
      "Unit test untuk setiap endpoint",
      "Integration test",
    ],
  },
];

export default function ChecklistsPage() {
  const { t, intlLocale } = useLanguage();
  const [checklists, setChecklists] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    items: [{ text: "", checked: false }] as ChecklistItemData[],
    tags: "",
  });

  const fetchChecklists = useCallback(async () => {
    try {
      const res = await toolkitApi.list({
        type: "checklist",
        search: search || undefined,
        per_page: 100,
      });
      setChecklists(res.data || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: "",
      description: "",
      items: [{ text: "", checked: false }],
      tags: "",
    });
    setShowModal(true);
  };

  const openFromTemplate = (tpl: (typeof TEMPLATES)[0]) => {
    setEditingId(null);
    setForm({
      title: tpl.title,
      description: tpl.description,
      items: tpl.items.map((text) => ({ text, checked: false })),
      tags: "",
    });
    setShowTemplateModal(false);
    setShowModal(true);
  };

  const openEdit = (item: ToolkitItem) => {
    setEditingId(item.id);
    const content = item.content as unknown as ChecklistContent;
    setForm({
      title: item.title,
      description: content?.description || "",
      items: content?.items || [{ text: "", checked: false }],
      tags: (item.tags || []).join(", "),
    });
    setShowModal(true);
    setMenuOpen(null);
  };

  const addItem = () => {
    setForm((p) => ({
      ...p,
      items: [...p.items, { text: "", checked: false }],
    }));
  };

  const removeItem = (idx: number) => {
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  };

  const updateItemText = (idx: number, text: string) => {
    setForm((p) => ({
      ...p,
      items: p.items.map((item, i) => (i === idx ? { ...item, text } : item)),
    }));
  };

  const saveChecklist = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      const validItems = form.items.filter((item) => item.text.trim());
      const data = {
        toolkit_type: "checklist" as const,
        title: form.title,
        content: {
          description: form.description,
          items:
            validItems.length > 0
              ? validItems
              : [{ text: t("checklists.newItem"), checked: false }],
        },
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      };
      if (editingId) {
        await toolkitApi.update(editingId, data);
      } else {
        await toolkitApi.create(data);
      }
      setShowModal(false);
      fetchChecklists();
    } catch {
      /* error */
    } finally {
      setSaving(false);
    }
  };

  const toggleCheckItem = async (checklist: ToolkitItem, itemIdx: number) => {
    const content = checklist.content as unknown as ChecklistContent;
    const items = [...(content?.items || [])];
    if (items[itemIdx]) {
      items[itemIdx] = { ...items[itemIdx], checked: !items[itemIdx].checked };
    }
    try {
      await toolkitApi.update(checklist.id, {
        content: { ...content, items },
      });
      fetchChecklists();
    } catch {
      /* error */
    }
  };

  const duplicateChecklist = async (checklist: ToolkitItem) => {
    const content = checklist.content as unknown as ChecklistContent;
    try {
      await toolkitApi.create({
        toolkit_type: "checklist",
        title: `${checklist.title} (${t("common.copySuffix")})`,
        content: {
          description: content?.description || "",
          items: (content?.items || []).map((i) => ({ ...i, checked: false })),
        },
        tags: checklist.tags,
      });
      fetchChecklists();
    } catch {
      /* error */
    }
    setMenuOpen(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await toolkitApi.delete(deleteTarget);
      fetchChecklists();
    } catch {
      /* error */
    }
    setDeleteTarget(null);
    setShowDeleteModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loading03Icon
          width={32}
          height={32}
          className="animate-spin text-emerald-500"
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmModal
        isOpen={showDeleteModal}
        title={t("checklists.deleteTitle")}
        message={t("checklists.deleteMessage")}
        confirmText={t("common.delete")}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        type="danger"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href="/toolkit"
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors shrink-0"
          >
            <ArrowLeft01Icon width={20} height={20} />
          </Link>

          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0 shadow-lg shadow-emerald-500/20">
              <CheckListIcon width={22} height={22} className="text-white" />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-text-primary truncate">
                {t("checklists.title")}
              </h1>

              <p className="text-xs text-text-tertiary break-words">
                {t("checklists.subtitle", { count: checklists.length })}
              </p>
            </div>
          </div>
        </div>

        {/* Button */}
        <div className="flex items-center gap-3">
          <button
            className="btn btn-secondary flex items-center justify-center gap-1.5 w-full sm:w-auto"
            onClick={() => setShowTemplateModal(true)}
          >
            <GoogleDocIcon width={16} height={16} />{" "}
            {t("checklists.fromTemplate")}
          </button>
          <button
            className="btn btn-primary text-sm flex items-center justify-center gap-1.5 w-full sm:w-auto"
            onClick={openCreate}
            style={{
              background: "linear-gradient(135deg, #10B981, #0D9488)",
            }}
          >
            <Add01Icon width={16} height={16} /> {t("checklists.create")}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative w-full">
          <Search01Icon
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            className="w-full py-2.5 pl-9 pr-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
            placeholder={t("checklists.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Checklist Cards */}
      {checklists.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
            <CheckListIcon width={48} height={48} className="mb-4 opacity-30" />
            <p className="font-bold text-lg mb-1">
              {t("checklists.emptyTitle")}
            </p>
            <p className="text-sm mb-4">
              {t("checklists.emptySubtitle")}
            </p>
            <div className="flex gap-3">
              <button
                className="btn btn-secondary"
                onClick={() => setShowTemplateModal(true)}
              >
                <GoogleDocIcon width={16} height={16} />{" "}
                {t("checklists.fromTemplate")}
              </button>
              <button
                className="btn btn-primary"
                onClick={openCreate}
                style={{
                  background: "linear-gradient(135deg, #10B981, #0D9488)",
                }}
              >
                <Add01Icon width={16} height={16} />{" "}
                {t("checklists.createList")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {checklists.map((checklist) => {
            const content = checklist.content as unknown as ChecklistContent;
            const items = content?.items || [];
            const totalItems = items.length;
            const checkedItems = items.filter((i) => i.checked).length;
            const progress =
              totalItems > 0
                ? Math.round((checkedItems / totalItems) * 100)
                : 0;
            const isComplete = progress === 100;

            return (
              <div
                key={checklist.id}
                className={`card group relative overflow-hidden transition-all duration-200 hover:shadow-lg ${isComplete ? "ring-2 ring-emerald-400/30" : ""}`}
              >
                {/* Progress bar at top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-bg-secondary">
                  <div
                    className="h-full rounded-r-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: isComplete
                        ? "linear-gradient(90deg, #10B981, #059669)"
                        : "linear-gradient(90deg, #F59E0B, #EF4444)",
                    }}
                  />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-3 pt-2">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-bold text-text-primary">
                      {checklist.title}
                    </h4>
                    {isComplete && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        ✓ {t("checklists.completed")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-tertiary">
                      {checkedItems}/{totalItems}
                    </span>
                    <div className="relative">
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-bg-hover transition-all text-text-tertiary"
                        onClick={() =>
                          setMenuOpen(
                            menuOpen === checklist.id ? null : checklist.id,
                          )
                        }
                      >
                        <MoreVerticalIcon width={14} height={14} />
                      </button>
                      {menuOpen === checklist.id && (
                        <div className="absolute right-0 top-8 w-44 bg-bg-card border border-border-color rounded-lg shadow-lg z-50 py-1 animate-fade-in">
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
                            onClick={() => openEdit(checklist)}
                          >
                            ✏️ {t("common.edit")}
                          </button>
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
                            onClick={() => duplicateChecklist(checklist)}
                          >
                            <Copy01Icon width={14} height={14} />{" "}
                            {t("checklists.duplicateReset")}
                          </button>
                          <div className="border-t border-border-light my-1" />
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            onClick={() => {
                              setDeleteTarget(checklist.id);
                              setShowDeleteModal(true);
                              setMenuOpen(null);
                            }}
                          >
                            <Delete02Icon width={14} height={14} />{" "}
                            {t("common.delete")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {content?.description && (
                  <p className="text-xs text-text-tertiary mb-3">
                    {content.description}
                  </p>
                )}

                {/* Checklist items */}
                <div className="flex flex-col gap-1.5">
                  {items.map((item, idx) => (
                    <button
                      key={idx}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-150 ${
                        item.checked
                          ? "bg-emerald-50 dark:bg-emerald-900/10"
                          : "hover:bg-bg-hover"
                      }`}
                      onClick={() => toggleCheckItem(checklist, idx)}
                    >
                      <span
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                          item.checked
                            ? "bg-emerald-500 border-emerald-500 text-white scale-105"
                            : "border-border-color hover:border-emerald-400"
                        }`}
                      >
                        {item.checked && <Tick01Icon width={12} height={12} />}
                      </span>
                      <span
                        className={`text-xs font-medium transition-all duration-200 ${
                          item.checked
                            ? "text-text-tertiary line-through"
                            : "text-text-primary"
                        }`}
                      >
                        {item.text}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Tags + date */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light">
                  <div className="flex flex-wrap gap-1.5">
                    {(checklist.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-[11px] text-text-tertiary">
                    {new Date(checklist.updated_at).toLocaleDateString(
                      intlLocale,
                      { day: "numeric", month: "short" },
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template Picker Modal */}
      {showTemplateModal && (
        <Portal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-5"
            onClick={() => setShowTemplateModal(false)}
          >
            <div
              className="bg-bg-card w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-border-color animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
                <h3 className="text-lg font-bold">
                  📋 {t("checklists.chooseTemplate")}
                </h3>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors"
                  onClick={() => setShowTemplateModal(false)}
                >
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>
              <div className="p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
                {TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    className="flex items-start gap-4 p-4 rounded-xl border-2 border-border-color hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all text-left group"
                    onClick={() => openFromTemplate(tpl)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
                      <CheckListIcon width={20} height={20} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-text-primary">
                        {tpl.title}
                      </div>
                      <div className="text-xs text-text-tertiary mt-0.5">
                        {tpl.description}
                      </div>
                      <div className="text-[11px] text-text-tertiary mt-1">
                        {tpl.items.length} {t("common.items")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <Portal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5"
            onClick={() => setShowModal(false)}
          >
            <div
              className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[580px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <CheckListIcon
                    width={20}
                    height={20}
                    className="text-emerald-600"
                  />
                  {editingId
                    ? t("checklists.editTitle")
                    : t("checklists.createTitle")}
                </h3>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors"
                  onClick={() => setShowModal(false)}
                >
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("common.title")} *
                  </label>
                  <input
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                    placeholder={t("checklists.examplePlaceholder")}
                    value={form.title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("common.description")}
                  </label>
                  <input
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                    placeholder={t("checklists.shortDescription")}
                    value={form.description}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, description: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("checklists.tags")}
                  </label>
                  <input
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                    placeholder="deployment, review, project-x"
                    value={form.tags}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, tags: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("checklists.items")}
                  </label>
                  <div className="flex flex-col gap-2">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-tertiary w-5 text-center">
                          {idx + 1}
                        </span>
                        <input
                          className="flex-1 py-2 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                          placeholder={`Item ${idx + 1}`}
                          value={item.text}
                          onChange={(e) => updateItemText(idx, e.target.value)}
                        />
                        {form.items.length > 1 && (
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-text-tertiary hover:text-red-500 transition-colors"
                            onClick={() => removeItem(idx)}
                          >
                            <Cancel01Icon width={14} height={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                    onClick={addItem}
                  >
                    <Add01Icon width={14} height={14} />{" "}
                    {t("checklists.addItem")}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowModal(false)}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={saveChecklist}
                  disabled={!form.title.trim() || saving}
                  style={{
                    background: "linear-gradient(135deg, #10B981, #0D9488)",
                  }}
                >
                  {saving ? (
                    <Loading03Icon
                      width={16}
                      height={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Add01Icon width={16} height={16} />
                  )}
                  {saving
                    ? t("common.saving")
                    : editingId
                      ? t("checklists.save")
                      : t("checklists.createSave")}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
