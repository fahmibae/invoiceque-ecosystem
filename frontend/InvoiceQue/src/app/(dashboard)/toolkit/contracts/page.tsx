"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft01Icon,
  Add01Icon,
  Delete02Icon,
  Search01Icon,
  Loading03Icon,
  LegalDocument01Icon,
  Edit02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  MoreVerticalIcon,
  Copy01Icon,
  ViewIcon,
} from "hugeicons-react";
import Portal from "@/components/ui/Portal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useLanguage } from "@/context/LanguageContext";
import PremiumGate from "@/components/subscription/PremiumGate";
import type { TranslationKey } from "@/lib/app-i18n";
import {
  toolkitApi,
  type ToolkitItem,
  type CreateToolkitItemRequest,
} from "@/lib/api";

const CONTRACT_TYPES = [
  {
    value: "service_agreement",
    label: "Service Agreement",
    labelKey: "contracts.type.service_agreement",
    emoji: "📋",
    desc: "Standard client service contract",
    descKey: "contracts.typeDesc.service_agreement",
  },
  {
    value: "nda",
    label: "NDA",
    labelKey: "contracts.type.nda",
    emoji: "🔒",
    desc: "Non-disclosure agreement",
    descKey: "contracts.typeDesc.nda",
  },
  {
    value: "project_contract",
    label: "Project Contract",
    labelKey: "contracts.type.project_contract",
    emoji: "📄",
    desc: "Project-specific terms & deliverables",
    descKey: "contracts.typeDesc.project_contract",
  },
  {
    value: "retainer",
    label: "Retainer Agreement",
    labelKey: "contracts.type.retainer",
    emoji: "🔄",
    desc: "Ongoing monthly retainer",
    descKey: "contracts.typeDesc.retainer",
  },
  {
    value: "subcontractor",
    label: "Subcontractor Agreement",
    labelKey: "contracts.type.subcontractor",
    emoji: "👥",
    desc: "For hiring subcontractors",
    descKey: "contracts.typeDesc.subcontractor",
  },
  {
    value: "scope_of_work",
    label: "Scope of Work",
    labelKey: "contracts.type.scope_of_work",
    emoji: "🎯",
    desc: "Detailed project scope document",
    descKey: "contracts.typeDesc.scope_of_work",
  },
  {
    value: "other",
    label: "Other",
    labelKey: "contracts.type.other",
    emoji: "📝",
    desc: "Custom contract type",
    descKey: "contracts.typeDesc.other",
  },
];

export default function ContractTemplatesPage() {
  return (
    <PremiumGate feature="toolkit_contracts">
      <ContractTemplatesContent />
    </PremiumGate>
  );
}

function ContractTemplatesContent() {
  const { t, intlLocale } = useLanguage();
  const [contracts, setContracts] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState<ToolkitItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState("service_agreement");
  const [body, setBody] = useState("");
  const [notes, setNotes] = useState("");

  const getContracts = useCallback(() => {
    return toolkitApi.list({
      type: "contract_template",
      search: search || undefined,
      per_page: 50,
    });
  }, [search]);

  const fetchContracts = useCallback(async () => {
    try {
      const res = await getContracts();
      setContracts(res.data || []);
    } catch {
      /* ignore */
    }
  }, [getContracts]);

  useEffect(() => {
    let cancelled = false;

    getContracts()
      .then((res) => {
        if (!cancelled) {
          setContracts(res.data || []);
        }
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getContracts]);

  const resetForm = () => {
    setTitle("");
    setContractType("service_agreement");
    setBody("");
    setNotes("");
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (item: ToolkitItem) => {
    setTitle(item.title);
    setContractType(
      (item.content?.contract_type as string) || "service_agreement",
    );
    setBody((item.content?.body as string) || "");
    setNotes((item.content?.notes as string) || "");
    setEditingId(item.id);
    setShowForm(true);
    setMenuOpen(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const data: CreateToolkitItemRequest = {
        toolkit_type: "contract_template",
        title: title.trim(),
        content: { body, contract_type: contractType, notes },
      };
      if (editingId) {
        await toolkitApi.update(editingId, data);
      } else {
        await toolkitApi.create(data);
      }
      resetForm();
      fetchContracts();
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  const duplicateContract = async (item: ToolkitItem) => {
    try {
      await toolkitApi.create({
        toolkit_type: "contract_template",
        title: `${item.title} (${t("common.copySuffix")})`,
        content: item.content,
      });
      fetchContracts();
    } catch {
      /* ignore */
    }
    setMenuOpen(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await toolkitApi.delete(deleteTarget);
      fetchContracts();
    } catch {
      /* ignore */
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
          className="animate-spin text-indigo-500"
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmModal
        isOpen={showDeleteModal}
        title={t("contracts.deleteTitle")}
        message={t("contracts.deleteMessage")}
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
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0 shadow-lg shadow-indigo-500/20">
              <LegalDocument01Icon
                width={22}
                height={22}
                className="text-white"
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-text-primary truncate">
                {t("contracts.title")}
              </h1>

              <p className="text-xs text-text-tertiary break-words">
                {t("contracts.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Button */}
        <button
          className="btn btn-primary text-sm flex items-center justify-center gap-1.5 w-full sm:w-auto"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Add01Icon width={16} height={16} />
          {t("contracts.create")}
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative w-full">
          <Search01Icon
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            placeholder={t("contracts.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>
      </div>

      {/* Contract List */}
      {contracts.length === 0 ? (
        <div className="card p-12 text-center">
          <LegalDocument01Icon
            width={48}
            height={48}
            className="mx-auto text-text-tertiary mb-3 opacity-40"
          />
          <p className="text-text-tertiary font-medium">
            {t("contracts.emptyTitle")}
          </p>
          <p className="text-text-tertiary text-xs mt-1">
            {t("contracts.emptySubtitle")}
          </p>
          <button
            className="btn btn-primary mt-4"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Add01Icon width={16} height={16} /> {t("contracts.first")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contracts.map((item) => {
            const typeInfo =
              CONTRACT_TYPES.find(
                (t) => t.value === (item.content?.contract_type || "other"),
              ) || CONTRACT_TYPES[CONTRACT_TYPES.length - 1];
            return (
              <div
                key={item.id}
                className="card p-5 hover:shadow-lg transition-all hover:-translate-y-0.5 group relative"
              >
                <div className="absolute top-3 right-3">
                  <button
                    className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors opacity-0 group-hover:opacity-100"
                    onClick={() =>
                      setMenuOpen(menuOpen === item.id ? null : item.id)
                    }
                  >
                    <MoreVerticalIcon width={16} height={16} />
                  </button>
                  {menuOpen === item.id && (
                    <div className="absolute right-0 top-full mt-1 bg-bg-primary border border-border-color rounded-xl shadow-lg z-50 min-w-[160px] py-1">
                      <button
                        className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2"
                        onClick={() => setShowPreview(item)}
                      >
                        <ViewIcon width={14} height={14} /> {t("common.view")}
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2"
                        onClick={() => openEdit(item)}
                      >
                        <Edit02Icon width={14} height={14} /> {t("common.edit")}
                      </button>
                      <button
                        className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2"
                        onClick={() => duplicateContract(item)}
                      >
                        <Copy01Icon width={14} height={14} />{" "}
                        {t("common.duplicate")}
                      </button>
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        onClick={() => {
                          setDeleteTarget(item.id);
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
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{typeInfo.emoji}</span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-text-primary truncate pr-6">
                      {item.title}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      {t(typeInfo.labelKey as TranslationKey)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-tertiary line-clamp-3 mb-3">
                  {(item.content?.body as string)?.slice(0, 200) ||
                    t("common.noContent")}
                </p>
                <div className="text-[10px] text-text-tertiary">
                  {t("common.updated")}{" "}
                  {new Date(
                    item.updated_at || item.created_at,
                  ).toLocaleDateString(intlLocale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <Portal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5"
            onClick={() => resetForm()}
          >
            <div
              className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[640px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <LegalDocument01Icon
                    width={20}
                    height={20}
                    className="text-indigo-600"
                  />
                  {editingId
                    ? t("contracts.editTitle")
                    : t("contracts.createTitle")}
                </h3>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors"
                  onClick={resetForm}
                >
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("contracts.name")} *
                  </label>
                  <input
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-indigo-400 transition-colors"
                    placeholder="e.g. Web Development Service Agreement"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("contracts.type")}
                  </label>
                  <select
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-indigo-400 transition-colors"
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                  >
                    {CONTRACT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.emoji} {t(type.labelKey as TranslationKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("contracts.body")}
                  </label>
                  <textarea
                    className="w-full py-3 px-4 border border-border-color rounded-lg bg-slate-900 dark:bg-slate-950 text-sm outline-none focus:border-indigo-400 transition-colors resize-none font-mono text-slate-300 leading-relaxed"
                    rows={12}
                    placeholder={
                      "FREELANCE SERVICE AGREEMENT\n\nThis Agreement is entered into between:\n- Client: [CLIENT_NAME]\n- Freelancer: [YOUR_NAME]\n\n1. SCOPE OF WORK\n...\n\n2. PAYMENT TERMS\n..."
                    }
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("contracts.internalNotes")}
                  </label>
                  <textarea
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-indigo-400 transition-colors resize-none"
                    rows={2}
                    placeholder={t("contracts.internalNotesPlaceholder")}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={resetForm}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={handleSubmit}
                  disabled={!title.trim() || saving}
                  style={{
                    background: "linear-gradient(135deg, #6366F1, #7C3AED)",
                  }}
                >
                  {saving ? (
                    <Loading03Icon
                      width={16}
                      height={16}
                      className="animate-spin"
                    />
                  ) : (
                    <CheckmarkCircle02Icon width={16} height={16} />
                  )}
                  {saving
                    ? t("common.saving")
                    : editingId
                      ? t("common.saveChanges")
                      : t("contracts.save")}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <Portal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5"
            onClick={() => setShowPreview(null)}
          >
            <div
              className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[700px] sm:rounded-2xl sm:max-h-[85vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold">📄 {showPreview.title}</h3>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors"
                  onClick={() => setShowPreview(null)}
                >
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5">
                <pre className="whitespace-pre-wrap text-sm text-text-primary font-sans leading-relaxed">
                  {(showPreview.content?.body as string) ||
                    t("common.noContent")}
                </pre>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowPreview(null)}
                >
                  {t("common.close")}
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={() => {
                    openEdit(showPreview);
                    setShowPreview(null);
                  }}
                  style={{
                    background: "linear-gradient(135deg, #6366F1, #7C3AED)",
                  }}
                >
                  <Edit02Icon width={14} height={14} /> {t("common.edit")}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
