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
  GoogleDocIcon,
  LockKeyIcon,
  ArrowReloadHorizontalIcon,
  UserGroup02Icon,
  Target02Icon,
  Agreement03Icon
} from "hugeicons-react";
import Portal from "@/components/ui/Portal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  ContractPaperPreview,
  ContractPaperSizePicker,
  ContractPrintStyle,
  type ContractPaperSize,
} from "@/components/contracts/ContractPaperPreview";
import { useLanguage } from "@/context/LanguageContext";
import PremiumGate from "@/components/subscription/PremiumGate";
import type { TranslationKey } from "@/lib/app-i18n";
import {
  toolkitApi,
  clientApi,
  invoiceSettingsApi,
  type ToolkitItem,
  type CreateToolkitItemRequest,
  type Client,
  type InvoiceSettingsData,
} from "@/lib/api";

const CONTRACT_TYPES = [
  {
    value: "service_agreement",
    label: "Service Agreement",
    labelKey: "contracts.type.service_agreement",
    emoji: <Agreement03Icon/>,
    desc: "Standard client service contract",
    descKey: "contracts.typeDesc.service_agreement",
  },
  {
    value: "nda",
    label: "NDA",
    labelKey: "contracts.type.nda",
    emoji: <LockKeyIcon/>,
    desc: "Non-disclosure agreement",
    descKey: "contracts.typeDesc.nda",
  },
  {
    value: "project_contract",
    label: "Project Contract",
    labelKey: "contracts.type.project_contract",
    emoji: <LegalDocument01Icon/>,
    desc: "Project-specific terms & deliverables",
    descKey: "contracts.typeDesc.project_contract",
  },
  {
    value: "retainer",
    label: "Retainer Agreement",
    labelKey: "contracts.type.retainer",
    emoji: <ArrowReloadHorizontalIcon/>,
    desc: "Ongoing monthly retainer",
    descKey: "contracts.typeDesc.retainer",
  },
  {
    value: "subcontractor",
    label: "Subcontractor Agreement",
    labelKey: "contracts.type.subcontractor",
    emoji: <UserGroup02Icon/>,
    desc: "For hiring subcontractors",
    descKey: "contracts.typeDesc.subcontractor",
  },
  {
    value: "scope_of_work",
    label: "Scope of Work",
    labelKey: "contracts.type.scope_of_work",
    emoji: <Target02Icon/>,
    desc: "Detailed project scope document",
    descKey: "contracts.typeDesc.scope_of_work",
  },
  {
    value: "other",
    label: "Other",
    labelKey: "contracts.type.other",
    emoji: <GoogleDocIcon/>,
    desc: "Custom contract type",
    descKey: "contracts.typeDesc.other",
  },
];

const PrinterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={16} height={16} fill="none" {...props}>
    <path d="M7 17H17M7 13H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 18V21C6 21.5523 6.44772 22 7 22H17C17.5523 22 18 21.5523 18 21V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 6V3C6 2.44772 6.44772 1.5 7 1.5H17C17.5523 1.5 18 2.44772 18 3V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 9.5C3 7.84315 4.34315 6.5 6 6.5H18C19.6569 6.5 21 7.84315 21 9.5V14.5C21 16.1569 19.6569 17.5 18 17.5H6C4.34315 17.5 3 16.1569 3 14.5V9.5Z" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="18" cy="9.5" r="1" fill="currentColor" />
  </svg>
);

const getStringValue = (value: unknown) => (typeof value === "string" ? value : undefined);

const getContractContentValue = (item: ToolkitItem | null, key: string) =>
  getStringValue(item?.content?.[key]);

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
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [businessSettings, setBusinessSettings] = useState<(InvoiceSettingsData & { company_name?: string }) | null>(null);
  const [paperSize, setPaperSize] = useState<ContractPaperSize>("a4");

  // Signature States
  const [firstPartySig, setFirstPartySig] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("invoicequ_my_signature");
  });
  const [secondPartySig, setSecondPartySig] = useState<string | null>(null);
  const [isDrawingPadOpen, setIsDrawingPadOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const syncPreviewSignatures = useCallback((item: ToolkitItem | null) => {
    setFirstPartySig(getContractContentValue(item, "first_party_sig") || null);
    setSecondPartySig(getContractContentValue(item, "second_party_sig") || null);
  }, []);

  const openPreview = useCallback((item: ToolkitItem) => {
    syncPreviewSignatures(item);
    setShowPreview(item);
    setMenuOpen(null);
  }, [syncPreviewSignatures]);

  const applyPreviewUpdate = useCallback((updatedItem: ToolkitItem) => {
    syncPreviewSignatures(updatedItem);
    setShowPreview(updatedItem);
    setContracts(prev => prev.map(c => c.id === updatedItem.id ? updatedItem : c));
  }, [syncPreviewSignatures]);

  // Load settings and clients on mount
  useEffect(() => {
    clientApi.list(undefined, 1, 100)
      .then((res) => {
        setClients(res.data || []);
      })
      .catch(() => {});
    invoiceSettingsApi.get()
      .then((res) => {
        if (res) {
          setBusinessSettings(res);
        }
      })
      .catch(() => {});
  }, []);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".menu-trigger")) {
        return;
      }
      setMenuOpen(null);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFirstPartySig(dataUrl);
      localStorage.setItem("invoicequ_my_signature", dataUrl);

      if (showPreview) {
        const updatedContent = {
          ...showPreview.content,
          first_party_sig: dataUrl,
          first_party_signed_at: new Date().toISOString(),
        };
        toolkitApi.update(showPreview.id, {
          toolkit_type: showPreview.toolkit_type,
          title: showPreview.title,
          content: updatedContent,
        }).then(applyPreviewUpdate);
      }
    };
    reader.readAsDataURL(file);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const saveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setFirstPartySig(dataUrl);
    localStorage.setItem("invoicequ_my_signature", dataUrl);

    if (showPreview) {
      const updatedContent = {
        ...showPreview.content,
        first_party_sig: dataUrl,
        first_party_signed_at: new Date().toISOString(),
      };
      toolkitApi.update(showPreview.id, {
        toolkit_type: showPreview.toolkit_type,
        title: showPreview.title,
        content: updatedContent,
      }).then(applyPreviewUpdate);
    }

    setIsDrawingPadOpen(false);
  };

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
    setClientId("");
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
    setClientId(item.client_id || "");
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
        client_id: clientId || undefined,
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
        client_id: item.client_id || undefined,
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
                    className={`p-1.5 rounded-lg hover:bg-bg-hover transition-colors menu-trigger ${
                      menuOpen === item.id ? "opacity-100" : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === item.id ? null : item.id);
                    }}
                  >
                    <MoreVerticalIcon width={16} height={16} />
                  </button>
                  {menuOpen === item.id && (
                    <div className="absolute right-0 top-full mt-1 bg-bg-primary border border-border-color rounded-xl shadow-lg z-50 min-w-[160px] py-1">
                      <button
                        className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2"
                        onClick={() => openPreview(item)}
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
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {t(typeInfo.labelKey as TranslationKey)}
                      </span>
                      {item.client_id && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-2">
                          <UserGroup02Icon /> {clients.find(c => c.id === item.client_id)?.name || "Klien"}
                        </span>
                      )}
                    </div>
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
                    Hubungkan ke Klien / Assign to Client (Optional)
                  </label>
                  <select
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-indigo-400 transition-colors"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  >
                    <option value="">-- Tanpa Klien / No Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        👤 {c.name} {c.company ? `(${c.company})` : ""}
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
      {showPreview && (() => {
        const typeInfo =
          CONTRACT_TYPES.find(
            (ct) => ct.value === (showPreview.content?.contract_type || "other"),
          ) || CONTRACT_TYPES[CONTRACT_TYPES.length - 1];
        const firstPartySignedAt = getContractContentValue(showPreview, "first_party_signed_at");
        const secondPartySignedAt = getContractContentValue(showPreview, "second_party_signed_at");

        return (
          <Portal>
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5 overflow-y-auto"
              onClick={() => setShowPreview(null)}
            >
              <div
                className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[960px] sm:rounded-2xl sm:my-8 shadow-2xl border border-border-color animate-fade-in flex flex-col no-print"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl shrink-0">{typeInfo.emoji}</span>
                    <h3 className="text-base sm:text-lg font-bold text-text-primary truncate max-w-[400px]">
                      {showPreview.title}
                    </h3>
                  </div>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors text-text-secondary"
                    onClick={() => setShowPreview(null)}
                  >
                    <Cancel01Icon width={20} height={20} />
                  </button>
                </div>

                {/* Modal Body / Paper Sheet Desktop Viewer */}
                <div className="overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 flex flex-col items-center gap-6">
                  {/* Signature Configuration Tools */}
                  <div className="w-full max-w-[820px] p-4 rounded-xl bg-bg-secondary border border-border-color flex flex-col gap-4 no-print">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
                        ✍️ Tanda Tangan Freelancer
                      </h4>
                      <div className="flex flex-wrap items-center gap-3">
                        <ContractPaperSizePicker value={paperSize} onChange={setPaperSize} />
                        {firstPartySig && (
                          <button 
                            className="text-[10px] font-semibold text-red-500 hover:text-red-600 transition-colors"
                            onClick={() => {
                              setFirstPartySig(null);
                              localStorage.removeItem("invoicequ_my_signature");
                              if (showPreview) {
                                const updatedContent = { ...showPreview.content };
                                delete updatedContent.first_party_sig;
                                delete updatedContent.first_party_signed_at;
                                toolkitApi.update(showPreview.id, {
                                  toolkit_type: showPreview.toolkit_type,
                                  title: showPreview.title,
                                  content: updatedContent,
                                }).then(applyPreviewUpdate);
                              }
                            }}
                          >
                            Hapus Tanda Tangan
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-4">
                      <div className="p-3 bg-bg-card rounded-lg border border-border-light flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-text-secondary">Freelancer / Penyedia Jasa</span>
                          {firstPartySig && <span className="text-[10px] text-green-500 font-semibold">✓ Aktif</span>}
                        </div>
                        
                        {firstPartySig ? (
                          <div className="h-16 border border-dashed border-border-color bg-white rounded flex items-center justify-center p-1 relative group">
                            <img src={firstPartySig} alt="First Party Signature" className="h-full object-contain filter invert dark:invert-0 brightness-0" />
                            <button 
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setFirstPartySig(null);
                                localStorage.removeItem("invoicequ_my_signature");
                                if (showPreview) {
                                  const updatedContent = { ...showPreview.content };
                                  delete updatedContent.first_party_sig;
                                  delete updatedContent.first_party_signed_at;
                                  toolkitApi.update(showPreview.id, {
                                    toolkit_type: showPreview.toolkit_type,
                                    title: showPreview.title,
                                    content: updatedContent,
                                  }).then(applyPreviewUpdate);
                                }
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="h-16 bg-bg-primary rounded flex items-center justify-center text-xs text-text-tertiary">
                            Belum ada tanda tangan
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            className="flex-1 py-1.5 px-2 bg-bg-primary hover:bg-bg-hover border border-border-color rounded text-[10px] font-semibold transition-colors text-text-primary"
                            onClick={() => {
                              setIsDrawingPadOpen(true);
                            }}
                          >
                            ✏️ Tulis
                          </button>
                          <label className="flex-1 py-1.5 px-2 bg-bg-primary hover:bg-bg-hover border border-border-color rounded text-[10px] font-semibold text-center cursor-pointer transition-colors text-text-primary">
                            📤 Unggah
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleImageUpload} 
                            />
                          </label>
                        </div>
                      </div>

                      <div className="rounded-lg border border-dashed border-border-color bg-bg-card p-3 text-xs text-text-secondary">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="font-bold">Klien</span>
                          <span className={`text-[10px] font-semibold ${secondPartySig ? "text-green-500" : "text-amber-500"}`}>
                            {secondPartySig ? "Sudah tanda tangan" : "Lewat portal"}
                          </span>
                        </div>
                        <p className="leading-relaxed">
                          Tanda tangan klien hanya bisa diisi dari portal klien. Dashboard ini khusus untuk tanda tangan freelancer.
                        </p>
                      </div>
                    </div>
                  </div>

                  <ContractPaperPreview
                    rootId="print-modal-container"
                    paperSize={paperSize}
                    documentTitle={showPreview.title}
                    documentLabel={t(typeInfo.labelKey as TranslationKey)}
                    reference={`IQ-CTR-${showPreview.id.substring(0, 8).toUpperCase()}`}
                    officialLabel="DOKUMEN RESMI"
                    bodyText={(showPreview.content?.body as string) || ""}
                    companyName={businessSettings?.company_name || businessSettings?.business_name || "INVOICEQU"}
                    logoUrl={businessSettings?.logo_url || undefined}
                    logoAlt={businessSettings?.company_name || businessSettings?.business_name || "Business Logo"}
                    email={businessSettings?.business_email || undefined}
                    phone={businessSettings?.business_phone || undefined}
                    website={businessSettings?.business_website || undefined}
                    firstPartyLabel="FIRST PARTY (PROVIDER)"
                    firstPartyName={getContractContentValue(showPreview, "first_party_name") || businessSettings?.company_name || businessSettings?.business_name || "Authorized Signature"}
                    firstPartySignature={firstPartySig}
                    firstPartyDateText={firstPartySignedAt ? new Date(firstPartySignedAt).toLocaleDateString(intlLocale) : "____/____/________"}
                    firstPartyUnsignedText="[Awaiting Signature]"
                    secondPartyLabel="SECOND PARTY (CLIENT)"
                    secondPartyName={getContractContentValue(showPreview, "second_party_name") || clients.find(c => c.id === showPreview.client_id)?.name || "Authorized Signature"}
                    secondPartySignature={secondPartySig}
                    secondPartyDateText={secondPartySignedAt ? new Date(secondPartySignedAt).toLocaleDateString(intlLocale) : "____/____/________"}
                    secondPartyUnsignedText="[Awaiting Signature]"
                    footerId={showPreview.id}
                  />
                </div>

                {/* Modal Footer */}
                <div className="flex flex-col sm:flex-row gap-2 px-6 py-4 border-t border-border-light shrink-0 bg-bg-card">
                  <div className="flex gap-2 flex-1">
                    <button
                      className="btn btn-secondary flex-1 text-xs"
                      onClick={() => setShowPreview(null)}
                    >
                      {t("common.close")}
                    </button>
                    <button
                      className="btn btn-secondary flex-1 text-xs flex items-center justify-center gap-1.5 border border-indigo-200 hover:border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                      onClick={() => window.print()}
                    >
                      <PrinterIcon width={16} height={16} />
                      Cetak / Print
                    </button>
                  </div>
                  <button
                    className="btn btn-primary w-full sm:w-auto text-xs sm:px-6 flex items-center justify-center gap-1.5"
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

              {/* Signature Drawing Pad Overlay */}
              {isDrawingPadOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
                  <div 
                    className="bg-bg-card w-full max-w-[440px] rounded-2xl border border-border-color shadow-2xl p-6 animate-fade-in flex flex-col gap-4 no-print"
                    onClick={(e) => e.stopPropagation()}
                  >
	                    <div className="flex justify-between items-center">
	                      <h4 className="text-sm font-bold text-text-primary">
	                        ✍️ Tulis Tanda Tangan Freelancer
	                      </h4>
                      <button 
                        className="text-text-secondary hover:text-text-primary text-lg"
                        onClick={() => setIsDrawingPadOpen(false)}
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="bg-white rounded-xl overflow-hidden border border-slate-200 p-2">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={150}
                        className="cursor-crosshair touch-none w-full h-[150px] bg-white"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                    </div>
                    <p className="text-[10px] text-text-tertiary">
                      Gunakan mouse atau layar sentuh untuk menggambar tanda tangan Anda pada papan di atas.
                    </p>
                    
                    <div className="flex gap-2">
                      <button
                        className="btn btn-secondary flex-1 text-xs"
                        onClick={() => setIsDrawingPadOpen(false)}
                      >
                        Batal
                      </button>
                      <button
                        className="btn btn-secondary flex-1 text-xs text-red-500 border border-red-100 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={() => {
                          const canvas = canvasRef.current;
                          if (canvas) {
                            const ctx = canvas.getContext("2d");
                            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                          }
                        }}
                      >
                        Bersihkan
                      </button>
                      <button
                        className="btn btn-primary flex-1 text-xs text-white"
                        onClick={saveCanvasSignature}
                        style={{
                          background: "linear-gradient(135deg, #6366F1, #7C3AED)",
                        }}
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <ContractPrintStyle paperSize={paperSize} rootSelector="#print-modal-container" />
            </div>
          </Portal>
        );
      })()}
    </div>
  );
}
