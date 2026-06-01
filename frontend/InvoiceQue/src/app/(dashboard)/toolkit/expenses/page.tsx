"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft01Icon,
  Add01Icon,
  Delete02Icon,
  Search01Icon,
  Loading03Icon,
  Calendar03Icon,
  MoneyReceiveSquareIcon,
  PercentSquareIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Edit02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  MoreVerticalIcon,
  ArrowReloadHorizontalIcon,
  SoftwareIcon,
  ComputerIcon,
  Globe02Icon,
  CloudIcon,
  Link02Icon,
  Building03Icon,
  PlaneIcon,
  ServingFoodIcon,
  Attachment02Icon,
  Megaphone01Icon,
  Books01Icon,
  ShieldEnergyIcon,
  TaxesIcon,
  UserGroupIcon,
  Call02Icon,
  FlashIcon,
  DeliveryBox01Icon,
} from "hugeicons-react";
import Portal from "@/components/ui/Portal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/app-i18n";
import {
  expenseApi,
  type Expense,
  type CreateExpenseRequest,
  type ExpenseStats,
  type ExpenseCategory,
} from "@/lib/api";
import {
  calculateExpenseStatsInIDR,
  fetchAllExpensesForStats,
  hasNonIDRExpenses,
} from "@/lib/expense-stats";
import { fetchExchangeRates, formatCurrency } from "@/lib/utils";

const CATEGORY_LABELS: Record<
  string,
  {
    label: string;
    labelKey: TranslationKey;
    emoji: string | React.ReactNode;
    color: string;
  }
> = {
  software: {
    label: "Software",
    labelKey: "expenseCategory.software",
    emoji: <SoftwareIcon className="text-blue-600" width={24} height={24} />,
    color: "#3B82F6",
  },
  hardware: {
    label: "Hardware",
    labelKey: "expenseCategory.hardware",
    emoji: <ComputerIcon className="text-indigo-600" width={24} height={24} />,
    color: "#6366F1",
  },
  internet: {
    label: "Internet",
    labelKey: "expenseCategory.internet",
    emoji: <Globe02Icon className="text-teal-600" width={24} height={24} />,
    color: "#06B6D4",
  },
  hosting: {
    label: "Hosting",
    labelKey: "expenseCategory.hosting",
    emoji: <CloudIcon className="text-purple-600" width={24} height={24} />,
    color: "#8B5CF6",
  },
  domain: {
    label: "Domain",
    labelKey: "expenseCategory.domain",
    emoji: <Link02Icon className="text-purple-600" width={24} height={24} />,
    color: "#A855F7",
  },
  subscription: {
    label: "Subscription",
    labelKey: "expenseCategory.subscription",
    emoji: (
      <ArrowReloadHorizontalIcon
        className="text-pink-600"
        width={24}
        height={24}
      />
    ),
    color: "#EC4899",
  },
  coworking: {
    label: "Coworking",
    labelKey: "expenseCategory.coworking",
    emoji: (
      <Building03Icon className="text-orange-600" width={24} height={24} />
    ),
    color: "#F59E0B",
  },
  travel: {
    label: "Travel",
    labelKey: "expenseCategory.travel",
    emoji: <PlaneIcon className="text-red-600" width={24} height={24} />,
    color: "#EF4444",
  },
  food: {
    label: "Food & Drink",
    labelKey: "expenseCategory.food",
    emoji: (
      <ServingFoodIcon className="text-orange-600" width={24} height={24} />
    ),
    color: "#F97316",
  },
  office_supplies: {
    label: "Office Supplies",
    labelKey: "expenseCategory.office_supplies",
    emoji: (
      <Attachment02Icon className="text-green-600" width={24} height={24} />
    ),
    color: "#84CC16",
  },
  marketing: {
    label: "Marketing",
    labelKey: "expenseCategory.marketing",
    emoji: (
      <Megaphone01Icon className="text-green-600" width={24} height={24} />
    ),
    color: "#10B981",
  },
  education: {
    label: "Education",
    labelKey: "expenseCategory.education",
    emoji: <Books01Icon className="text-green-600" width={24} height={24} />,
    color: "#14B8A6",
  },
  insurance: {
    label: "Insurance",
    labelKey: "expenseCategory.insurance",
    emoji: (
      <ShieldEnergyIcon className="text-gray-600" width={24} height={24} />
    ),
    color: "#6B7280",
  },
  tax: {
    label: "Tax",
    labelKey: "expenseCategory.tax",
    emoji: <TaxesIcon className="text-gray-600" width={24} height={24} />,
    color: "#78716C",
  },
  contractor: {
    label: "Contractor",
    labelKey: "expenseCategory.contractor",
    emoji: <UserGroupIcon className="text-gray-600" width={24} height={24} />,
    color: "#0EA5E9",
  },
  communication: {
    label: "Communication",
    labelKey: "expenseCategory.communication",
    emoji: <Call02Icon className="text-gray-600" width={24} height={24} />,
    color: "#D946EF",
  },
  utilities: {
    label: "Utilities",
    labelKey: "expenseCategory.utilities",
    emoji: <FlashIcon className="text-gray-600" width={24} height={24} />,
    color: "#FBBF24",
  },
  other: {
    label: "Other",
    labelKey: "expenseCategory.other",
    emoji: (
      <DeliveryBox01Icon className="text-gray-600" width={24} height={24} />
    ),
    color: "#9CA3AF",
  },
};

export default function ExpenseTrackerPage() {
  const { t, intlLocale } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [statsConverted, setStatsConverted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<CreateExpenseRequest>({
    title: "",
    amount: 0,
    category: "other",
    description: "",
    currency: "IDR",
    expense_date: new Date().toISOString().split("T")[0],
    is_tax_deductible: false,
    is_recurring: false,
    recurring_interval: "",
    tags: [],
  });

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await expenseApi.list({
        search: search || undefined,
        category: (categoryFilter as ExpenseCategory) || undefined,
        per_page: 50,
      });
      setExpenses(res.data || []);
    } catch {
      /* ignore */
    }
  }, [search, categoryFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const [allExpenses, rates] = await Promise.all([
        fetchAllExpensesForStats(),
        fetchExchangeRates().catch(() => undefined),
      ]);
      setStats(calculateExpenseStatsInIDR(allExpenses, rates));
      setStatsConverted(hasNonIDRExpenses(allExpenses));
    } catch {
      try {
        const fallbackStats = await expenseApi.stats();
        setStats(fallbackStats);
        setStatsConverted(false);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadExpenseData() {
      try {
        await Promise.all([fetchExpenses(), fetchStats()]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadExpenseData();

    return () => {
      cancelled = true;
    };
  }, [fetchExpenses, fetchStats]);

  const resetForm = () => {
    setForm({
      title: "",
      amount: 0,
      category: "other",
      description: "",
      currency: "IDR",
      expense_date: new Date().toISOString().split("T")[0],
      is_tax_deductible: false,
      is_recurring: false,
      recurring_interval: "",
      tags: [],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (exp: Expense) => {
    setForm({
      title: exp.title,
      amount: exp.amount,
      category: exp.category,
      description: exp.description,
      currency: exp.currency,
      expense_date: exp.expense_date?.split("T")[0] || "",
      is_tax_deductible: exp.is_tax_deductible,
      is_recurring: exp.is_recurring,
      recurring_interval: exp.recurring_interval,
      tags: exp.tags || [],
    });
    setEditingId(exp.id);
    setShowForm(true);
    setMenuOpen(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || form.amount <= 0) return;
    setSaving(true);
    try {
      if (editingId) {
        await expenseApi.update(editingId, form);
      } else {
        await expenseApi.create(form);
      }
      resetForm();
      fetchExpenses();
      fetchStats();
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await expenseApi.delete(deleteTarget);
      fetchExpenses();
      fetchStats();
    } catch {
      /* ignore */
    }
    setDeleteTarget(null);
    setShowDeleteModal(false);
  };

  const monthChange = stats
    ? stats.last_month > 0
      ? ((stats.this_month - stats.last_month) / stats.last_month) * 100
      : stats.this_month > 0
        ? 100
        : 0
    : 0;
  const getCategoryInfo = (category: string) =>
    CATEGORY_LABELS[category] || CATEGORY_LABELS.other;
  const getCategoryLabel = (category: string) =>
    t(getCategoryInfo(category).labelKey);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loading03Icon
          width={32}
          height={32}
          className="animate-spin text-red-500"
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmModal
        isOpen={showDeleteModal}
        title={t("expenses.deleteTitle")}
        message={t("expenses.deleteMessage")}
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
              <MoneyReceiveSquareIcon
                width={22}
                height={22}
                className="text-white"
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-text-primary truncate">
                {t("expenses.title")}
              </h1>

              <p className="text-xs text-text-tertiary break-words">
                {t("expenses.subtitle")}
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
          {t("expenses.add")}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-xs font-semibold text-text-tertiary mb-1">
              {t("expenses.total")}
            </div>
            <div className="text-xl font-extrabold text-text-primary">
              {formatCurrency(stats.total_amount)}
            </div>
            <div className="text-xs text-text-tertiary mt-1">
              {t("expenses.transactionCount", { count: stats.total_count })}
            </div>
            {statsConverted && (
              <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                {t("expenses.equivalentIdr")}
              </div>
            )}
          </div>
          <div className="card p-4">
            <div className="text-xs font-semibold text-text-tertiary mb-1">
              {t("expenses.thisMonth")}
            </div>
            <div className="text-xl font-extrabold text-text-primary">
              {formatCurrency(stats.this_month)}
            </div>
            <div
              className={`text-xs mt-1 flex items-center gap-1 ${monthChange >= 0 ? "text-red-500" : "text-emerald-500"}`}
            >
              {monthChange >= 0 ? (
                <ArrowUp01Icon width={12} height={12} />
              ) : (
                <ArrowDown01Icon width={12} height={12} />
              )}
              {t("expenses.vsLastMonth", {
                percent: Math.abs(monthChange).toFixed(0),
              })}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-semibold text-text-tertiary mb-1">
              {t("expenses.grossDeduction")}
            </div>
            <div className="text-xl font-extrabold text-emerald-600">
              {formatCurrency(stats.tax_deductible_total)}
            </div>
            <div className="text-xs text-text-tertiary mt-1 flex items-center gap-1">
              <PercentSquareIcon width={12} height={12} />{" "}
              {t("expenses.taxDeductibleHint")}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-semibold text-text-tertiary mb-1">
              {t("expenses.topCategory")}
            </div>
            {stats.by_category.length > 0 ? (
              <>
                <div className="text-xl font-extrabold text-text-primary flex gap-2 items-center">
                  <div>
                    {CATEGORY_LABELS[stats.by_category[0].category]?.emoji}{" "}
                  </div>
                  <div
                    style={{
                      color:
                        CATEGORY_LABELS[stats.by_category[0].category]?.color,
                    }}
                  >
                    {getCategoryLabel(stats.by_category[0].category)}
                  </div>
                </div>
                <div className="text-xs text-text-tertiary mt-1">
                  {formatCurrency(stats.by_category[0].total)}
                </div>
              </>
            ) : (
              <div className="text-sm text-text-tertiary">
                {t("common.noData")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Breakdown Bar */}
      {stats && stats.by_category.length > 0 && (
        <div className="card p-4 mb-6">
          <div className="text-sm font-bold text-text-primary mb-3">
            {t("expenses.categoryAnalysis")}
          </div>
          <div className="flex rounded-full overflow-hidden h-3 mb-3">
            {stats.by_category.map((cat) => {
              const pct =
                stats.total_amount > 0
                  ? (cat.total / stats.total_amount) * 100
                  : 0;
              const catInfo =
                CATEGORY_LABELS[cat.category] || CATEGORY_LABELS.other;
              return (
                <div
                  key={cat.category}
                  title={`${t(catInfo.labelKey)}: ${formatCurrency(cat.total)} (${pct.toFixed(1)}%)`}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: catInfo.color,
                    minWidth: pct > 0 ? "4px" : "0",
                  }}
                  className="transition-all duration-300"
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            {stats.by_category.slice(0, 6).map((cat) => {
              const catInfo =
                CATEGORY_LABELS[cat.category] || CATEGORY_LABELS.other;
              return (
                <div
                  key={cat.category}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: catInfo.color }}
                  />
                  <span className="text-text-tertiary">
                    {t(catInfo.labelKey)}
                  </span>
                  <span className="font-bold text-text-primary">
                    {formatCurrency(cat.total)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            placeholder={t("expenses.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="form-input"
        >
          <option value="">{t("common.allCategories")}</option>
          {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
            <option key={key} value={key}>
              {val.emoji} {t(val.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {/* Expense List */}
      <div className="card" style={{ padding: "10px" }}>
        {expenses.length === 0 ? (
          <div className="p-12 text-center">
            <MoneyReceiveSquareIcon
              width={48}
              height={48}
              className="mx-auto text-text-tertiary mb-3 opacity-40"
            />
            <p className="text-text-tertiary font-medium">
              {t("expenses.emptyTitle")}
            </p>
            <p className="text-text-tertiary text-xs mt-1">
              {t("expenses.emptySubtitle")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-light">
            {expenses.map((exp) => {
              const catInfo =
                CATEGORY_LABELS[exp.category] || CATEGORY_LABELS.other;
              return (
                <div
                  key={exp.id}
                  className="flex items-center gap-4 p-4 hover:bg-bg-hover/50 transition-colors group"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${catInfo.color}15` }}
                  >
                    {catInfo.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="group/title relative min-w-0 max-w-full">
                        <span className="block truncate text-sm font-bold text-text-primary">
                          {exp.title}
                        </span>
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 max-w-[min(18rem,calc(100vw-3rem))] rounded-lg border border-border-color bg-bg-primary px-3 py-2 text-xs font-semibold text-text-primary opacity-0 shadow-lg transition-opacity duration-150 group-hover/title:opacity-100"
                        >
                          {exp.title}
                        </span>
                      </span>
                      {exp.is_tax_deductible && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                          {t("expenses.taxBadge")}
                        </span>
                      )}
                      {exp.is_recurring && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                          {t("expenses.recurringBadge")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-text-tertiary">
                        {t(catInfo.labelKey)}
                      </span>
                      {exp.expense_date && (
                        <span className="text-xs text-text-tertiary flex items-center gap-1">
                          <Calendar03Icon width={10} height={10} />
                          {new Date(exp.expense_date).toLocaleDateString(
                            intlLocale,
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </span>
                      )}
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-sm text-red-500">
                          -{formatCurrency(exp.amount, exp.currency)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      className="p-1.5 rounded-lg hover:bg-bg-secondary transition-colors opacity-0 group-hover:opacity-100"
                      onClick={() =>
                        setMenuOpen(menuOpen === exp.id ? null : exp.id)
                      }
                    >
                      <MoreVerticalIcon width={16} height={16} />
                    </button>
                    {menuOpen === exp.id && (
                      <div className="absolute right-0 top-full mt-1 bg-bg-primary border border-border-color rounded-xl shadow-lg z-50 min-w-[140px] py-1">
                        <button
                          className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2"
                          onClick={() => openEdit(exp)}
                        >
                          <Edit02Icon width={14} height={14} />{" "}
                          {t("common.edit")}
                        </button>
                        <button
                          className="w-full px-3 py-2 text-left text-sm hover:bg-bg-hover text-red-500 flex items-center gap-2"
                          onClick={() => {
                            setDeleteTarget(exp.id);
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
              );
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <Portal>
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-stretch sm:items-center justify-center p-0 sm:p-5"
            onClick={() => resetForm()}
          >
            <div
              className="bg-bg-card w-full h-full sm:h-auto sm:max-w-[520px] sm:rounded-2xl sm:max-h-[90vh] shadow-xl overflow-hidden border border-border-color animate-fade-in flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-light shrink-0">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <MoneyReceiveSquareIcon
                    width={20}
                    height={20}
                    className="text-emerald-600"
                  />
                  {editingId ? t("expenses.editTitle") : t("expenses.createTitle")}
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
                    {t("common.title")} *
                  </label>
                  <input
                    className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                    placeholder="e.g. Figma Pro, AWS Hosting"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("expenses.amount")} *
                    </label>
                    <input
                      type="number"
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                      step="0.01"
                      min="0"
                      value={form.amount || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          amount: parseFloat(e.target.value) || 0,
                        })
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
                        setForm({ ...form, currency: e.target.value })
                      }
                    >
                      <option value="IDR">IDR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="SGD">SGD</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("common.category")}
                    </label>
                    <select
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                      value={form.category}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          category: e.target.value as ExpenseCategory,
                        })
                      }
                    >
                      {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.emoji} {t(val.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("common.date")}
                    </label>
                    <input
                      type="date"
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                      value={form.expense_date}
                      onChange={(e) =>
                        setForm({ ...form, expense_date: e.target.value })
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
                    placeholder={t("expenses.detailsPlaceholder")}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-emerald-500"
                      checked={form.is_tax_deductible}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          is_tax_deductible: e.target.checked,
                        })
                      }
                    />
                    <PercentSquareIcon
                      width={14}
                      height={14}
                      className="text-emerald-500"
                    />{" "}
                    {t("expenses.grossDeduction")}
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-emerald-500"
                      checked={form.is_recurring}
                      onChange={(e) =>
                        setForm({ ...form, is_recurring: e.target.checked })
                      }
                    />
                    <ArrowReloadHorizontalIcon
                      width={14}
                      height={14}
                      className="text-blue-500"
                    />{" "}
                    {t("expenses.recurringPayment")}
                  </label>
                </div>
                {form.is_recurring && (
                  <div>
                    <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                      {t("expenses.interval")}
                    </label>
                    <select
                      className="w-full py-2.5 px-3 border border-border-color rounded-lg bg-bg-secondary text-sm outline-none focus:border-emerald-400 transition-colors"
                      value={form.recurring_interval}
                      onChange={(e) =>
                        setForm({ ...form, recurring_interval: e.target.value })
                      }
                    >
                      <option value="">{t("expenses.chooseInterval")}</option>
                      <option value="weekly">{t("expenses.weekly")}</option>
                      <option value="monthly">{t("expenses.monthly")}</option>
                      <option value="quarterly">
                        {t("expenses.quarterly")}
                      </option>
                      <option value="yearly">{t("expenses.yearly")}</option>
                    </select>
                  </div>
                )}
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
                  disabled={!form.title.trim() || form.amount <= 0 || saving}
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
                      : t("expenses.save")}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
