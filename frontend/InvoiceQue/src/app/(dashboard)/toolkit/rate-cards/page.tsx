"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft01Icon,
  Add01Icon,
  Delete02Icon,
  Search01Icon,
  Loading03Icon,
  Edit02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  MoreVerticalIcon,
  Copy01Icon,
  MoneyReceiveSquareIcon,
  DollarSquareIcon,
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

const RATE_TYPES = [
  {
    value: "hourly",
    label: "Per Jam",
    labelKey: "rateCards.type.hourly",
    emoji: "⏱️",
    color: "text-blue-500",
  },
  {
    value: "fixed",
    label: "Fixed Price",
    labelKey: "rateCards.type.fixed",
    emoji: "💰",
    color: "text-green-500",
  },
  {
    value: "retainer",
    label: "Retainer/Bulan",
    labelKey: "rateCards.type.retainer",
    emoji: "🔄",
    color: "text-purple-500",
  },
  {
    value: "per_word",
    label: "Per Kata",
    labelKey: "rateCards.type.per_word",
    emoji: "✍️",
    color: "text-orange-500",
  },
  {
    value: "per_page",
    label: "Per Halaman",
    labelKey: "rateCards.type.per_page",
    emoji: "📄",
    color: "text-pink-500",
  },
  {
    value: "per_revision",
    label: "Per Revisi",
    labelKey: "rateCards.type.per_revision",
    emoji: "🔁",
    color: "text-teal-500",
  },
];

const SERVICE_CATEGORIES = [
  {
    value: "development",
    label: "Development",
    labelKey: "serviceCategory.development",
    emoji: "💻",
  },
  {
    value: "design",
    label: "Design",
    labelKey: "serviceCategory.design",
    emoji: "🎨",
  },
  {
    value: "writing",
    label: "Writing",
    labelKey: "serviceCategory.writing",
    emoji: "✏️",
  },
  {
    value: "marketing",
    label: "Marketing",
    labelKey: "serviceCategory.marketing",
    emoji: "📣",
  },
  {
    value: "consulting",
    label: "Consulting",
    labelKey: "serviceCategory.consulting",
    emoji: "🧠",
  },
  {
    value: "video",
    label: "Video/Animation",
    labelKey: "serviceCategory.video",
    emoji: "🎬",
  },
  {
    value: "photography",
    label: "Photography",
    labelKey: "serviceCategory.photography",
    emoji: "📷",
  },
  {
    value: "other",
    label: "Lainnya",
    labelKey: "serviceCategory.other",
    emoji: "📦",
  },
];

function formatCurrency(amount: number, currency = "IDR") {
  if (currency === "IDR") return `Rp ${amount.toLocaleString("id-ID")}`;
  if (currency === "USD") return `$${amount.toLocaleString("en-US")}`;
  return `${currency} ${amount.toLocaleString()}`;
}

export default function RateCardsPage() {
  return (
    <PremiumGate feature="toolkit_rate_cards">
      <RateCardsContent />
    </PremiumGate>
  );
}

function RateCardsContent() {
  const { t } = useLanguage();
  const [rateCards, setRateCards] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    serviceCategory: "development",
    rateType: "hourly",
    rate: "",
    currency: "IDR",
    minRate: "",
    maxRate: "",
    description: "",
    deliverables: "",
    turnaround: "",
    revisions: "",
  });

  const getRateCards = useCallback(() => {
    return toolkitApi.list({
      type: "rate_card",
      search: search || undefined,
      per_page: 50,
    });
  }, [search]);

  const filterRateCards = useCallback(
    (items: ToolkitItem[]) => {
      if (!filterCategory) return items;

      return items.filter(
        (item) => item.content?.service_category === filterCategory,
      );
    },
    [filterCategory],
  );

  const fetchRateCards = useCallback(async () => {
    try {
      const res = await getRateCards();
      setRateCards(filterRateCards(res.data || []));
    } catch {
      /* ignore */
    }
  }, [getRateCards, filterRateCards]);

  useEffect(() => {
    let cancelled = false;

    getRateCards()
      .then((res) => {
        if (!cancelled) {
          setRateCards(filterRateCards(res.data || []));
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

  }, [getRateCards, filterRateCards]);

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

  const resetForm = () => {
    setForm({
      title: "",
      serviceCategory: "development",
      rateType: "hourly",
      rate: "",
      currency: "IDR",
      minRate: "",
      maxRate: "",
      description: "",
      deliverables: "",
      turnaround: "",
      revisions: "",
    });
    setEditingId(null);
    setShowModal(false);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: ToolkitItem) => {
    setForm({
      title: item.title,
      serviceCategory:
        (item.content?.service_category as string) || "development",
      rateType: (item.content?.rate_type as string) || "hourly",
      rate: String((item.content?.rate as number) || ""),
      currency: (item.content?.currency as string) || "IDR",
      minRate: String((item.content?.min_rate as number) || ""),
      maxRate: String((item.content?.max_rate as number) || ""),
      description: (item.content?.description as string) || "",
      deliverables: (item.content?.deliverables as string) || "",
      turnaround: (item.content?.turnaround as string) || "",
      revisions: String((item.content?.revisions as number) || ""),
    });
    setEditingId(item.id);
    setShowModal(true);
    setMenuOpen(null);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.rate || saving) return;
    setSaving(true);
    try {
      const data: CreateToolkitItemRequest = {
        toolkit_type: "rate_card",
        title: form.title.trim(),
        content: {
          service_category: form.serviceCategory,
          rate_type: form.rateType,
          rate: parseFloat(form.rate) || 0,
          currency: form.currency,
          min_rate: form.minRate ? parseFloat(form.minRate) : null,
          max_rate: form.maxRate ? parseFloat(form.maxRate) : null,
          description: form.description,
          deliverables: form.deliverables,
          turnaround: form.turnaround,
          revisions: form.revisions ? parseInt(form.revisions) : null,
        },
      };
      if (editingId) await toolkitApi.update(editingId, data);
      else await toolkitApi.create(data);
      resetForm();
      fetchRateCards();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const duplicateCard = async (item: ToolkitItem) => {
    try {
      await toolkitApi.create({
        toolkit_type: "rate_card",
        title: `${item.title} (${t("common.copySuffix")})`,
        content: item.content,
      });
      fetchRateCards();
    } catch {
      /* ignore */
    }
    setMenuOpen(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await toolkitApi.delete(deleteTarget);
      fetchRateCards();
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
          className="animate-spin text-emerald-500"
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmModal
        isOpen={showDeleteModal}
        title={t("rateCards.deleteTitle")}
        message={t("rateCards.deleteMessage")}
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
              <DollarSquareIcon width={22} height={22} className="text-white" />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-text-primary truncate">
                {t("rateCards.title")}
              </h1>

              <p className="text-xs text-text-tertiary break-words">
                {t("rateCards.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Button */}
        <button
          className="btn btn-primary text-sm flex items-center justify-center gap-1.5 w-full sm:w-auto"
          onClick={openCreate}
        >
          <Add01Icon width={16} height={16} />
          {t("rateCards.create")}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative w-full">
          <Search01Icon
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            placeholder={t("rateCards.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>
        <select
          className="form-input"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">{t("common.allCategories")}</option>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.emoji} {t(c.labelKey as TranslationKey)}
            </option>
          ))}
        </select>
      </div>

      {/* Rate Card List */}
      {rateCards.length === 0 ? (
        <div className="card p-12 text-center">
          <MoneyReceiveSquareIcon
            width={48}
            height={48}
            className="mx-auto text-text-tertiary mb-3 opacity-40"
          />
          <p className="text-text-tertiary font-medium">
            {t("rateCards.emptyTitle")}
          </p>
          <p className="text-text-tertiary text-xs mt-1">
            {t("rateCards.emptySubtitle")}
          </p>
          <button className="btn btn-primary mt-4" onClick={openCreate}>
            <Add01Icon width={16} height={16} /> {t("rateCards.first")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rateCards.map((item) => {
            const catInfo =
              SERVICE_CATEGORIES.find(
                (c) => c.value === (item.content?.service_category as string),
              ) || SERVICE_CATEGORIES[SERVICE_CATEGORIES.length - 1];
            const rType =
              RATE_TYPES.find(
                (r) => r.value === (item.content?.rate_type as string),
              ) || RATE_TYPES[0];
            const rateVal = (item.content?.rate as number) || 0;
            const cur = (item.content?.currency as string) || "IDR";

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
                    <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-border-color rounded-lg shadow-lg z-50 py-1 animate-fade-in">
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
                        onClick={() => openEdit(item)}
                      >
                        <Edit02Icon width={14} height={14} /> {t("common.edit")}
                      </button>
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
                        onClick={() => duplicateCard(item)}
                      >
                        <Copy01Icon width={14} height={14} />{" "}
                        {t("common.duplicate")}
                      </button>
                      <div className="border-t border-border-light my-1" />
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
                  <span className="text-2xl">{catInfo.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-text-primary truncate pr-6">
                      {item.title}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {t(catInfo.labelKey as TranslationKey)}
                    </span>
                  </div>
                </div>

                {/* Rate Display */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-xl p-3 mb-3">
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(rateVal, cur)}
                  </div>
                  <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 flex items-center gap-1">
                    <span>{rType.emoji}</span>{" "}
                    {t(rType.labelKey as TranslationKey)}
                  </div>
                  {(item.content?.min_rate as number) ||
                  (item.content?.max_rate as number) ? (
                    <div className="text-[10px] text-text-tertiary mt-1">
                      {t("common.range")}:{" "}
                      {formatCurrency(
                        (item.content?.min_rate as number) || 0,
                        cur,
                      )}{" "}
                      —{" "}
                      {formatCurrency(
                        (item.content?.max_rate as number) || 0,
                        cur,
                      )}
                    </div>
                  ) : null}
                </div>

                {(item.content?.description as string) && (
                  <p className="text-xs text-text-tertiary line-clamp-2 mb-2">
                    {item.content.description as string}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[10px] text-text-tertiary mt-auto pt-2 border-t border-border-color/30">
                  {(item.content?.turnaround as string) && (
                    <span>⏱️ {item.content.turnaround as string}</span>
                  )}
                  {(item.content?.revisions as number) && (
                    <span>
                      🔁{" "}
                      {t("rateCards.revisionCount", {
                        count: item.content.revisions as number,
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal via Portal */}
      {showModal && (
        <Portal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5"
            onClick={() => setShowModal(false)}
          >
            <div
              className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[600px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <DollarSquareIcon
                    width={20}
                    height={20}
                    className="text-emerald-600"
                  />
                  {editingId
                    ? t("rateCards.editTitle")
                    : t("rateCards.createTitle")}
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
                    {t("rateCards.serviceName")} *
                  </label>
                  <input
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                    placeholder="e.g. Website Development"
                    value={form.title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("common.category")}
                    </label>
                    <select
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                      value={form.serviceCategory}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          serviceCategory: e.target.value,
                        }))
                      }
                    >
                      {SERVICE_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.emoji} {t(c.labelKey as TranslationKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("rateCards.rateType")}
                    </label>
                    <select
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                      value={form.rateType}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, rateType: e.target.value }))
                      }
                    >
                      {RATE_TYPES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.emoji} {t(r.labelKey as TranslationKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("rateCards.rate")} *
                    </label>
                    <input
                      type="number"
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                      placeholder="500000"
                      value={form.rate}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, rate: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("common.currency")}
                    </label>
                    <select
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                      value={form.currency}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, currency: e.target.value }))
                      }
                    >
                      <option value="IDR">IDR (Rp)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="SGD">SGD (S$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("rateCards.revisions")}
                    </label>
                    <input
                      type="number"
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                      placeholder="3"
                      value={form.revisions}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, revisions: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("rateCards.minRate")}
                    </label>
                    <input
                      type="number"
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                      placeholder="300000"
                      value={form.minRate}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, minRate: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("rateCards.maxRate")}
                    </label>
                    <input
                      type="number"
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                      placeholder="800000"
                      value={form.maxRate}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, maxRate: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("common.description")}
                  </label>
                  <textarea
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors resize-none"
                    rows={2}
                    placeholder={t("rateCards.descriptionPlaceholder")}
                    value={form.description}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, description: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("rateCards.deliverables")}
                  </label>
                  <textarea
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors resize-none"
                    rows={2}
                    placeholder="e.g. Desain UI, Slicing, Responsive, Testing"
                    value={form.deliverables}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, deliverables: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    {t("rateCards.turnaround")}
                  </label>
                  <input
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                    placeholder="e.g. 5-7 hari kerja"
                    value={form.turnaround}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, turnaround: e.target.value }))
                    }
                  />
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
                  onClick={handleSubmit}
                  disabled={!form.title.trim() || !form.rate || saving}
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
                    <CheckmarkCircle02Icon width={16} height={16} />
                  )}
                  {saving
                    ? t("common.saving")
                    : editingId
                      ? t("common.saveChanges")
                      : t("rateCards.save")}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
