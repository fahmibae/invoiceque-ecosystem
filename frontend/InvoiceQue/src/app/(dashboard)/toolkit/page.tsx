"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wrench01Icon,
  CheckListIcon,
  PaintBoardIcon,
  GoogleDocIcon,
  ArrowRight01Icon,
  Loading03Icon,
  FlashIcon,
  MoneyReceiveSquareIcon,
  DollarSquareIcon,
  StickyNote02Icon,
  LegalDocument01Icon,
  StarIcon,
  UserAdd01Icon,
  CodeIcon
} from "hugeicons-react";
import { toolkitApi, expenseApi, type ExpenseStats } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/app-i18n";
import {
  calculateExpenseStatsInIDR,
  fetchAllExpensesForStats,
  hasNonIDRExpenses,
} from "@/lib/expense-stats";
import { fetchExchangeRates, formatCurrency } from "@/lib/utils";

// ── Universal Tools (semua freelancer butuh) ──────────────────

const UNIVERSAL_TOOLS = [
  {
    href: "/toolkit/expenses",
    labelKey: "toolkit.tool.expenses.label",
    descKey: "toolkit.tool.expenses.desc",
    icon: MoneyReceiveSquareIcon,
    color: "#10B981",
    gradient: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50 dark:bg-emerald-900/20",
    statKey: "expenses",
    isNew: true,
  },
  {
    href: "/toolkit/contracts",
    labelKey: "toolkit.tool.contracts.label",
    descKey: "toolkit.tool.contracts.desc",
    icon: LegalDocument01Icon,
    color: "#6366F1",
    gradient: "from-indigo-500 to-purple-600",
    bgLight: "bg-indigo-50 dark:bg-indigo-900/20",
    statKey: "contract_template",
    isNew: true,
  },
  {
    href: "/toolkit/rate-cards",
    labelKey: "toolkit.tool.rateCards.label",
    descKey: "toolkit.tool.rateCards.desc",
    icon: DollarSquareIcon,
    color: "#14B8A6",
    gradient: "from-teal-500 to-cyan-600",
    bgLight: "bg-teal-50 dark:bg-teal-900/20",
    statKey: "rate_card",
    isNew: true,
  },
  {
    href: "/toolkit/intake-forms",
    labelKey: "toolkit.tool.intakeForms.label",
    descKey: "toolkit.tool.intakeForms.desc",
    icon: UserAdd01Icon,
    color: "#F97316",
    gradient: "from-orange-500 to-amber-600",
    bgLight: "bg-orange-50 dark:bg-orange-900/20",
    statKey: "intake_form",
    isNew: true,
  },
  {
    href: "/toolkit/notes",
    labelKey: "toolkit.tool.notes.label",
    descKey: "toolkit.tool.notes.desc",
    icon: StickyNote02Icon,
    color: "#F59E0B",
    gradient: "from-amber-400 to-orange-500",
    bgLight: "bg-amber-50 dark:bg-amber-900/20",
    statKey: "note",
    isNew: true,
  },
  {
    href: "/toolkit/checklists",
    labelKey: "toolkit.tool.checklists.label",
    descKey: "toolkit.tool.checklists.desc",
    icon: CheckListIcon,
    color: "#EF4444",
    gradient: "from-red-500 to-rose-600",
    bgLight: "bg-red-50 dark:bg-red-900/20",
    statKey: "checklist",
  },
];

// ── Profession-Specific Tools ─────────────────────────────────

const PROFESSION_PACKS = [
  {
    id: "developer",
    titleKey: "toolkit.pack.developer.title",
    descriptionKey: "toolkit.pack.developer.desc",
    color: "#3733ffff",
    gradient: "from-blue-500 to-purple-600",
    bgLight: "bg-blue-50 dark:bg-violet-900/20",
    icon: CodeIcon,
    tools: [
      {
        href: "/toolkit/api-keys",
        labelKey: "toolkit.pack.developer.label",
        descKey: "toolkit.pack.developer.desc",
        statKey: "api_key",
      },
    ],
  },
  {
    id: "designer",
    titleKey: "toolkit.pack.designer.title",
    descriptionKey: "toolkit.pack.designer.desc",
    color: "#8B5CF6",
    gradient: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50 dark:bg-violet-900/20",
    icon: PaintBoardIcon,
    tools: [
      {
        href: "/toolkit/palettes",
        labelKey: "toolkit.pack.palette.label",
        descKey: "toolkit.pack.palette.desc",
        statKey: "palette",
      },
      {
        href: "/toolkit/brand-kits",
        labelKey: "toolkit.pack.brandKit.label",
        descKey: "toolkit.pack.brandKit.desc",
        statKey: "brand_kit",
      },
      {
        href: "/toolkit/visual-references",
        labelKey: "toolkit.pack.visualReference.label",
        descKey: "toolkit.pack.visualReference.desc",
        statKey: "visual_reference",
      },
    ],
  },
  {
    id: "writer",
    titleKey: "toolkit.pack.writer.title",
    descriptionKey: "toolkit.pack.writer.desc",
    color: "#F59E0B",
    gradient: "from-amber-500 to-orange-600",
    bgLight: "bg-amber-50 dark:bg-amber-900/20",
    icon: GoogleDocIcon,
    tools: [
      {
        href: "/toolkit/briefs",
        labelKey: "toolkit.pack.brief.label",
        descKey: "toolkit.pack.brief.desc",
        statKey: "brief",
      },
    ],
  },
  {
    id: "marketing",
    titleKey: "toolkit.pack.marketing.title",
    descriptionKey: "toolkit.pack.marketing.desc",
    color: "#10B981",
    gradient: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50 dark:bg-emerald-900/20",
    icon: FlashIcon,
    tools: [
      {
        href: "/toolkit/campaigns",
        labelKey: "toolkit.pack.campaign.label",
        descKey: "toolkit.pack.campaign.desc",
        statKey: "campaign",
      },
    ],
  },
];

export default function ToolkitHubPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [expenseStats, setExpenseStats] = useState<ExpenseStats | null>(null);
  const [expenseStatsConverted, setExpenseStatsConverted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [
        toolkitResult,
        rawExpenseResult,
        ratesResult,
        expensesResult,
        briefItemsResult,
      ] = await Promise.allSettled([
        toolkitApi.stats(),
        expenseApi.stats(),
        fetchExchangeRates(),
        fetchAllExpensesForStats(),
        toolkitApi.list({ type: "brief", per_page: 500 }),
      ]);

      let nextStats: Record<string, number> = {};
      if (toolkitResult.status === "fulfilled") {
        nextStats = toolkitResult.value;
      }

      if (briefItemsResult.status === "fulfilled") {
        const briefItems = briefItemsResult.value.data || [];
        const intakeForms = briefItems.filter(
          (item) => (item.content?.form_type as string) === "intake_form",
        );

        nextStats = {
          ...nextStats,
          brief: briefItems.length - intakeForms.length,
          intake_form: intakeForms.length,
        };
      }

      setStats(nextStats);
      if (rawExpenseResult.status === "fulfilled")
        setExpenseStats(rawExpenseResult.value);

      if (expensesResult.status === "fulfilled") {
        const rates =
          ratesResult.status === "fulfilled" ? ratesResult.value : undefined;
        setExpenseStats(
          calculateExpenseStatsInIDR(expensesResult.value, rates),
        );
        setExpenseStatsConverted(hasNonIDRExpenses(expensesResult.value));
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  const totalToolkitItems = stats.total || 0;
  const totalExpenses = expenseStats?.total_count || 0;

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
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
              <Wrench01Icon width={22} height={22} />
            </span>
            {t("toolkit.title")}
          </h1>
          <p className="page-subtitle mt-2">
            {t("toolkit.subtitle", {
              count: totalToolkitItems + totalExpenses,
            })}
          </p>
        </div>
      </div>

      {/* ═══ BUSINESS ESSENTIALS ═══ */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <StarIcon width={16} height={16} className="text-amber-500" />
          <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">
            {t("toolkit.businessEssentials")}
          </h2>
          <span className="text-[10px] text-text-tertiary">
            {t("toolkit.businessEssentialsHint")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
          {UNIVERSAL_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const count =
              tool.statKey === "expenses"
                ? totalExpenses
                : stats[tool.statKey] || 0;

            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="card group p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
              >
                {/* Gradient accent bar */}
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tool.gradient}`}
                />

                {tool.isNew && (
                  <span className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">
                    {t("common.new")}
                  </span>
                )}

                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}
                  style={{ boxShadow: `0 8px 24px ${tool.color}25` }}
                >
                  <Icon width={24} height={24} />
                </div>

                <h3 className="font-bold text-sm text-text-primary mb-1">
                  {t(tool.labelKey as TranslationKey)}
                </h3>
                <p className="text-xs text-text-tertiary mb-3 line-clamp-2">
                  {t(tool.descKey as TranslationKey)}
                </p>

                <div className="flex items-center justify-between">
                  {count > 0 ? (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${tool.color}15`,
                        color: tool.color,
                      }}
                    >
                      {count} {t("common.items")}
                    </span>
                  ) : (
                    <span className="text-xs text-text-tertiary">
                      {t("common.start")} →
                    </span>
                  )}
                  <ArrowRight01Icon
                    width={14}
                    height={14}
                    className="text-text-tertiary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Expense Summary Banner (if has data) */}
      {expenseStats && expenseStats.total_amount > 0 && (
        <Link href="/toolkit/expenses" className="block mb-8">
          <div className="card p-5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border-emerald-200/50 dark:border-emerald-800/30 hover:shadow-lg transition-all">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
                  <MoneyReceiveSquareIcon width={20} height={20} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {t("toolkit.totalBusinessExpenses")}
                  </div>
                  <div
                    className="max-w-full truncate text-xl font-extrabold text-emerald-800 dark:text-emerald-300"
                    title={formatCurrency(expenseStats.total_amount)}
                  >
                    {formatCurrency(expenseStats.total_amount)}
                  </div>
                  {expenseStatsConverted && (
                    <div className="truncate text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {t("toolkit.equivalentIdr")}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 items-stretch gap-2 text-left sm:flex sm:items-center sm:gap-6 sm:text-right">
                <div className="min-w-0 rounded-lg bg-white/55 p-3 dark:bg-bg-card/40 sm:bg-transparent sm:p-0 dark:sm:bg-transparent">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    {t("toolkit.thisMonth")}
                  </div>
                  <div
                    className="truncate text-sm font-bold text-emerald-700 dark:text-emerald-300"
                    title={formatCurrency(expenseStats.this_month)}
                  >
                    {formatCurrency(expenseStats.this_month)}
                  </div>
                </div>
                <div className="min-w-0 rounded-lg bg-white/55 p-3 dark:bg-bg-card/40 sm:bg-transparent sm:p-0 dark:sm:bg-transparent">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    {t("toolkit.taxDeductible")}
                  </div>
                  <div
                    className="truncate text-sm font-bold text-emerald-700 dark:text-emerald-300"
                    title={formatCurrency(expenseStats.tax_deductible_total)}
                  >
                    {formatCurrency(expenseStats.tax_deductible_total)}
                  </div>
                </div>
                <ArrowRight01Icon
                  width={18}
                  height={18}
                  className="hidden text-emerald-500 sm:block"
                />
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ═══ PROFESSION PACKS ═══ */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Wrench01Icon width={16} height={16} className="text-text-tertiary" />
          <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">
            {t("toolkit.professionalTools")}
          </h2>
          <span className="text-[10px] text-text-tertiary">
            {t("toolkit.professionalToolsHint")}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
          {PROFESSION_PACKS.map((pack) => {
            const Icon = pack.icon;
            const packCount = pack.tools.reduce(
              (sum, t) => sum + (stats[t.statKey] || 0),
              0,
            );

            return (
              <div key={pack.id} className="card overflow-hidden">
                {/* Pack Header */}
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border-light">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pack.gradient} flex items-center justify-center text-white shadow-lg`}
                    style={{ boxShadow: `0 6px 20px ${pack.color}25` }}
                  >
                    <Icon width={20} height={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-text-primary">
                      {t(pack.titleKey as TranslationKey)}
                    </h3>
                    <p className="text-xs text-text-tertiary">
                      {t(pack.descriptionKey as TranslationKey)}
                    </p>
                  </div>
                  {packCount > 0 && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${pack.color}15`,
                        color: pack.color,
                      }}
                    >
                      {packCount}
                    </span>
                  )}
                </div>

                {/* Tools */}
                <div className="flex flex-col gap-2">
                  {pack.tools.map((tool) => {
                    const count = stats[tool.statKey] || 0;
                    return (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className="group flex items-center gap-3 p-3 rounded-xl border border-border-light hover:border-current hover:shadow-md transition-all duration-200"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg ${pack.bgLight} flex items-center justify-center group-hover:scale-110 transition-transform`}
                        >
                          <Icon
                            width={16}
                            height={16}
                            style={{ color: pack.color }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-text-primary">
                              {t(tool.labelKey as TranslationKey)}
                            </span>
                            {count > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-bg-secondary text-text-tertiary">
                                {count}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-text-tertiary">
                            {t(tool.descKey as TranslationKey)}
                          </span>
                        </div>
                        <ArrowRight01Icon
                          width={14}
                          height={14}
                          className="text-text-tertiary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
