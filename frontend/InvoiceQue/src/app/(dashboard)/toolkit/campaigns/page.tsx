"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Add01Icon,
  Cancel01Icon,
  Search01Icon,
  Delete02Icon,
  MoreVerticalIcon,
  Loading03Icon,
  ArrowLeft01Icon,
  FlashIcon,
} from "hugeicons-react";
import Portal from "@/components/ui/Portal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useLanguage } from "@/context/LanguageContext";
import PremiumGate from "@/components/subscription/PremiumGate";
import { toolkitApi, ToolkitItem } from "@/lib/api";

interface CampaignContent {
  client_name: string;
  platform: string;
  status: "planning" | "active" | "paused" | "completed";
  start_date: string;
  end_date: string;
  budget: number;
  spent: number;
  objective: string;
  kpis: { label: string; target: string; actual: string }[];
  notes: string;
}

const PLATFORMS = [
  "Instagram",
  "Facebook",
  "Google Ads",
  "TikTok",
  "LinkedIn",
  "Twitter/X",
  "YouTube",
  "Email",
  "Multi-channel",
];
const STATUSES = [
  {
    value: "planning",
    label: "Planning",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    value: "active",
    label: "Active",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    value: "paused",
    label: "Paused",
    color:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  {
    value: "completed",
    label: "Completed",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  },
];

export default function CampaignsPage() {
  return (
    <PremiumGate feature="toolkit_campaigns">
      <CampaignsContent />
    </PremiumGate>
  );
}

function CampaignsContent() {
  const { t, intlLocale } = useLanguage();
  const [campaigns, setCampaigns] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    client_name: "",
    platform: "Instagram",
    status: "planning" as CampaignContent["status"],
    start_date: "",
    end_date: "",
    budget: 0,
    spent: 0,
    objective: "",
    kpis: [{ label: "", target: "", actual: "" }],
    notes: "",
    tags: "",
  });

  const getCampaigns = useCallback(() => {
    return toolkitApi.list({
      type: "campaign",
      search: search || undefined,
    });
  }, [search]);

  const filterCampaigns = useCallback(
    (items: ToolkitItem[]) => {
      if (!filterStatus) return items;

      return items.filter((item) => {
        const content = item.content as unknown as CampaignContent;
        return content?.status === filterStatus;
      });
    },
    [filterStatus],
  );

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCampaigns();
      setCampaigns(filterCampaigns(res.data || []));
    } catch {
      /* error */
    }
    setLoading(false);
  }, [getCampaigns, filterCampaigns]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setLoading(true);
        }

        return getCampaigns();
      })
      .then((res) => {
        if (!cancelled) {
          setCampaigns(filterCampaigns(res.data || []));
        }
      })
      .catch(() => {
        /* error */
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getCampaigns, filterCampaigns]);

  const resetForm = () => {
    setForm({
      title: "",
      client_name: "",
      platform: "Instagram",
      status: "planning",
      start_date: "",
      end_date: "",
      budget: 0,
      spent: 0,
      objective: "",
      kpis: [{ label: "", target: "", actual: "" }],
      notes: "",
      tags: "",
    });
    setEditingId(null);
  };

  const openEdit = (item: ToolkitItem) => {
    const c = item.content as unknown as CampaignContent;
    setEditingId(item.id);
    setForm({
      title: item.title,
      client_name: c?.client_name || "",
      platform: c?.platform || "Instagram",
      status: c?.status || "planning",
      start_date: c?.start_date || "",
      end_date: c?.end_date || "",
      budget: c?.budget || 0,
      spent: c?.spent || 0,
      objective: c?.objective || "",
      kpis: c?.kpis?.length ? c.kpis : [{ label: "", target: "", actual: "" }],
      notes: c?.notes || "",
      tags: (item.tags || []).join(", "),
    });
    setShowModal(true);
    setMenuOpen(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        toolkit_type: "campaign" as const,
        title: form.title,
        content: {
          client_name: form.client_name,
          platform: form.platform,
          status: form.status,
          start_date: form.start_date,
          end_date: form.end_date,
          budget: form.budget,
          spent: form.spent,
          objective: form.objective,
          kpis: form.kpis.filter((k) => k.label.trim()),
          notes: form.notes,
        },
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (editingId) await toolkitApi.update(editingId, payload);
      else await toolkitApi.create(payload);
      setShowModal(false);
      resetForm();
      fetchCampaigns();
    } catch {
      /* error */
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await toolkitApi.delete(deleteTarget);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchCampaigns();
    } catch {
      /* */
    }
  };

  const addKpi = () =>
    setForm((f) => ({
      ...f,
      kpis: [...f.kpis, { label: "", target: "", actual: "" }],
    }));
  const removeKpi = (idx: number) =>
    setForm((f) => ({ ...f, kpis: f.kpis.filter((_, i) => i !== idx) }));
  const updateKpi = (idx: number, field: string, value: string) => {
    setForm((f) => ({
      ...f,
      kpis: f.kpis.map((k, i) => (i === idx ? { ...k, [field]: value } : k)),
    }));
  };

  const getStatusStyle = (status: string) =>
    STATUSES.find((s) => s.value === status) || STATUSES[0];
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return t("campaignStatus.active");
      case "paused":
        return t("campaignStatus.paused");
      case "completed":
        return t("campaignStatus.completed");
      default:
        return t("campaignStatus.planning");
    }
  };
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href="/toolkit"
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors shrink-0"
          >
            <ArrowLeft01Icon width={20} height={20} />
          </Link>

          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
              <FlashIcon width={22} height={22} className="text-emerald-600" />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-text-primary truncate">
                {t("campaigns.title")}
              </h1>

              <p className="text-xs text-text-tertiary break-words">
                {t("campaigns.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Button */}
        <button
          className="btn btn-primary text-sm flex items-center justify-center gap-1.5 w-full sm:w-auto"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Add01Icon width={16} height={16} />
          {t("campaigns.create")}
        </button>
      </div>

      <div className="flex flex-col gap-3 mb-6 sm:flex-row">
        <div className="relative flex-1">
          <Search01Icon
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            placeholder={t("campaigns.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-color bg-bg-primary text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <select
          aria-label={t("campaigns.filterStatus")}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full rounded-xl border border-border-color bg-bg-primary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 sm:w-44"
        >
          <option value="">{t("campaigns.allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {getStatusLabel(s.value)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loading03Icon
            width={32}
            height={32}
            className="animate-spin text-emerald-500"
          />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 bg-bg-secondary rounded-2xl border border-border-color">
          <FlashIcon
            width={48}
            height={48}
            className="mx-auto mb-4 opacity-30"
          />
          <p className="text-text-tertiary mb-4">
            {t("campaigns.emptyTitle")}
          </p>
          <button
            className="btn btn-primary text-sm"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <Add01Icon width={16} height={16} /> {t("campaigns.first")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((camp) => {
            const c = camp.content as unknown as CampaignContent;
            const statusStyle = getStatusStyle(c?.status || "planning");
            const budgetPct = c?.budget
              ? Math.min(100, Math.round((c.spent / c.budget) * 100))
              : 0;
            const isExpanded = expandedId === camp.id;
            return (
              <div
                key={camp.id}
                className="bg-bg-secondary rounded-2xl border border-border-color overflow-hidden hover:shadow-md transition-all"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : camp.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-bold text-sm text-text-primary">
                          {camp.title}
                        </h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusStyle.color}`}
                        >
                          {getStatusLabel(statusStyle.value)}
                        </span>
                        {c?.platform && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-hover text-text-tertiary">
                            {c.platform}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-text-tertiary">
                        {c?.client_name && <span>👤 {c.client_name}</span>}
                        {c?.start_date && (
                          <span>
                            📅 {c.start_date}
                            {c?.end_date ? ` → ${c.end_date}` : ""}
                          </span>
                        )}
                        {c?.budget > 0 && (
                          <span>💰 {formatCurrency(c.budget)}</span>
                        )}
                      </div>
                      {c?.budget > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-bg-hover rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${budgetPct > 90 ? "bg-red-500" : budgetPct > 70 ? "bg-yellow-500" : "bg-emerald-500"}`}
                              style={{ width: `${budgetPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-text-tertiary font-mono">
                            {t("campaigns.spentPercent", {
                              percent: budgetPct,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative">
                        <button
                          className="p-1 rounded-lg hover:bg-bg-hover"
                          onClick={() =>
                            setMenuOpen(menuOpen === camp.id ? null : camp.id)
                          }
                        >
                          <MoreVerticalIcon width={14} height={14} />
                        </button>
                        {menuOpen === camp.id && (
                          <div className="absolute right-0 top-8 bg-bg-primary border border-border-color rounded-xl shadow-xl z-20 py-1 min-w-[140px]">
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-bg-hover"
                              onClick={() => openEdit(camp)}
                            >
                              ✏️ {t("common.edit")}
                            </button>
                            <div className="border-t border-border-light my-1" />
                            <button
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => {
                                setDeleteTarget(camp.id);
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
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border-light pt-3 space-y-3">
                    {c?.objective && (
                      <div className="text-xs">
                        <span className="font-semibold text-text-secondary">
                          {t("campaigns.objective")}:
                        </span>{" "}
                        <span className="text-text-tertiary">
                          {c.objective}
                        </span>
                      </div>
                    )}
                    {c?.budget > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-bg-hover text-center">
                          <div className="text-[10px] text-text-tertiary mb-1">
                            {t("campaigns.budget")}
                          </div>
                          <div className="text-sm font-bold text-text-primary">
                            {formatCurrency(c.budget)}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-bg-hover text-center">
                          <div className="text-[10px] text-text-tertiary mb-1">
                            {t("campaigns.spent")}
                          </div>
                          <div
                            className={`text-sm font-bold ${budgetPct > 90 ? "text-red-500" : "text-text-primary"}`}
                          >
                            {formatCurrency(c.spent)}
                          </div>
                        </div>
                      </div>
                    )}
                    {c?.kpis && c.kpis.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-text-secondary mb-2">
                          KPIs
                        </h4>
                        <div className="space-y-1.5">
                          {c.kpis.map((k, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-2 rounded-lg bg-bg-hover text-xs"
                            >
                              <span className="text-text-secondary font-medium">
                                {k.label}
                              </span>
                              <div className="flex gap-3">
                                <span className="text-text-tertiary">
                                  {t("campaigns.target")}:{" "}
                                  <strong>{k.target}</strong>
                                </span>
                                <span className="text-emerald-600">
                                  {t("campaigns.actual")}:{" "}
                                  <strong>{k.actual || "-"}</strong>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {c?.notes && (
                      <div className="text-xs p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-300">
                        💡 {c.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Portal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            <div
              className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[640px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FlashIcon
                    width={20}
                    height={20}
                    className="text-emerald-600"
                  />
                  {editingId
                    ? t("campaigns.editTitle")
                    : t("campaigns.createTitle")}
                </h3>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-secondary transition-colors"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <Cancel01Icon width={20} height={20} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("campaigns.name")} *
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                      placeholder="Q1 Instagram Ads"
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("campaigns.client")}
                    </label>
                    <input
                      type="text"
                      value={form.client_name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, client_name: e.target.value }))
                      }
                      placeholder="Opsional"
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("campaigns.platform")}
                    </label>
                    <select
                      value={form.platform}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, platform: e.target.value }))
                      }
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("campaigns.status")}
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          status: e.target.value as CampaignContent["status"],
                        }))
                      }
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {getStatusLabel(s.value)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("campaigns.objective")}
                  </label>
                  <textarea
                    value={form.objective}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, objective: e.target.value }))
                    }
                    rows={2}
                    placeholder={t("campaigns.objectivePlaceholder")}
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("campaigns.startDate")}
                    </label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, start_date: e.target.value }))
                      }
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("campaigns.endDate")}
                    </label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, end_date: e.target.value }))
                      }
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("campaigns.budget")} (IDR)
                    </label>
                    <input
                      type="number"
                      value={form.budget}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          budget: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("campaigns.spent")} (IDR)
                    </label>
                    <input
                      type="number"
                      value={form.spent}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          spent: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px]">
                      {t("campaigns.kpis", { count: form.kpis.length })}
                    </label>
                    <button
                      className="text-xs text-emerald-600 hover:underline"
                      onClick={addKpi}
                    >
                      + {t("campaigns.addKpi")}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.kpis.map((k, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={k.label}
                          onChange={(e) =>
                            updateKpi(idx, "label", e.target.value)
                          }
                          placeholder={t("campaigns.kpiName")}
                          className="flex-1 px-2 py-2 rounded-lg border border-border-color bg-bg-secondary text-xs focus:outline-none"
                        />
                        <input
                          type="text"
                          value={k.target}
                          onChange={(e) =>
                            updateKpi(idx, "target", e.target.value)
                          }
                          placeholder={t("campaigns.target")}
                          className="w-20 px-2 py-2 rounded-lg border border-border-color bg-bg-secondary text-xs focus:outline-none"
                        />
                        <input
                          type="text"
                          value={k.actual}
                          onChange={(e) =>
                            updateKpi(idx, "actual", e.target.value)
                          }
                          placeholder={t("campaigns.actual")}
                          className="w-20 px-2 py-2 rounded-lg border border-border-color bg-bg-secondary text-xs focus:outline-none"
                        />
                        {form.kpis.length > 1 && (
                          <button
                            onClick={() => removeKpi(idx)}
                            className="p-1 text-red-400"
                          >
                            <Cancel01Icon width={14} height={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("checklists.tags")}
                  </label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tags: e.target.value }))
                    }
                    placeholder="ads, q1, instagram"
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-border-light shrink-0">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={handleSave}
                  disabled={saving || !form.title.trim()}
                  style={{
                    background: "linear-gradient(135deg, #10B981, #059669)",
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
                      ? t("common.saveChanges")
                      : t("campaigns.save")}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
      <ConfirmModal
        isOpen={showDeleteModal}
        title={t("campaigns.deleteTitle")}
        message={t("campaigns.deleteMessage")}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
