"use client";

import React, { useState, useEffect } from "react";
import { healthApi, type HealthScore } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/app-i18n";
import { formatCurrency } from "@/lib/utils";
import {
  Analytics01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  UserGroupIcon,
  Time02Icon,
  MoneyBag02Icon,
  FlashIcon,
  AnalysisTextLinkIcon,
  Target02Icon,
} from "hugeicons-react";

const scoreGrade = (
  score: number,
): { labelKey: TranslationKey; color: string; bg: string } => {
  if (score >= 80)
    return {
      labelKey: "health.grade.excellent",
      color: "text-emerald-600",
      bg: "from-emerald-500 to-emerald-400",
    };
  if (score >= 60)
    return {
      labelKey: "health.grade.healthy",
      color: "text-blue-600",
      bg: "from-blue-500 to-blue-400",
    };
  if (score >= 40)
    return {
      labelKey: "health.grade.fair",
      color: "text-amber-600",
      bg: "from-amber-500 to-amber-400",
    };
  return {
    labelKey: "health.grade.attention",
    color: "text-red-600",
    bg: "from-red-500 to-red-400",
  };
};

export default function HealthScorePage() {
  const { t } = useLanguage();
  const [data, setData] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await healthApi.getScore();
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("health.loadError"));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>{t("health.loading")}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="animate-fade-in p-10 text-center">
        <p className="text-red-500 mb-4">{error || t("health.noData")}</p>
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  const grade = scoreGrade(data.overall_score);
  const b = data.breakdown;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{t("health.title")}</h1>
          <p className="page-subtitle">{t("health.subtitle")}</p>
        </div>
      </div>

      {/* Main Score Card */}
      <div className="bg-bg-card border border-border-color rounded-2xl p-8 mb-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-500/5 to-transparent rounded-bl-full"></div>
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Score Ring */}
          <div className="relative w-44 h-44 shrink-0">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 120 120"
            >
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-bg-secondary"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className={grade.color}
                stroke="currentColor"
                strokeDasharray={`${(data.overall_score / 100) * 339.3} 339.3`}
                style={{ transition: "stroke-dasharray 1s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black">
                {Math.round(data.overall_score)}
              </span>
              <span className={`text-sm font-bold ${grade.color}`}>
                {t(grade.labelKey)}
              </span>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="flex-1 w-full space-y-4">
            {[
              {
                label: t("health.collection"),
                score: b.collection_score,
                max: 25,
                icon: (
                  <MoneyBag02Icon
                    width={16}
                    height={16}
                    className="text-green-500"
                  />
                ),
                desc: t("health.collectionDesc", {
                  rate: data.collection_rate,
                }),
              },
              {
                label: t("health.paymentSpeed"),
                score: b.speed_score,
                max: 25,
                icon: (
                  <FlashIcon width={16} height={16} className="text-blue-500" />
                ),
                desc: t("health.paymentSpeedDesc", {
                  days: data.avg_days_to_pay,
                }),
              },
              {
                label: t("health.growth"),
                score: b.growth_score,
                max: 25,
                icon: (
                  <AnalysisTextLinkIcon
                    width={16}
                    height={16}
                    className="text-amber-500"
                  />
                ),
                desc: `${data.revenue_trend_pct > 0 ? "+" : ""}${data.revenue_trend_pct}% MoM`,
              },
              {
                label: t("health.diversity"),
                score: b.diversity_score,
                max: 25,
                icon: (
                  <Target02Icon
                    width={16}
                    height={16}
                    className="text-red-500"
                  />
                ),
                desc: t("health.diversityDesc", {
                  percent: data.client_concentration,
                }),
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">
                      {item.desc}
                    </span>
                    <span className="text-sm font-bold">
                      {item.score}/{item.max}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${item.score >= 20 ? "from-emerald-500 to-emerald-400" : item.score >= 15 ? "from-blue-500 to-blue-400" : item.score >= 10 ? "from-amber-500 to-amber-400" : "from-red-500 to-red-400"}`}
                    style={{
                      width: `${(item.score / item.max) * 100}%`,
                      transition: "width 1s ease-out",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Summary + Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-tertiary font-medium">
              {t("health.revenueThisMonth")}
            </span>
            {data.revenue_trend === "up" ? (
              <ArrowUp01Icon
                width={16}
                height={16}
                className="text-emerald-500"
              />
            ) : data.revenue_trend === "down" ? (
              <ArrowDown01Icon
                width={16}
                height={16}
                className="text-red-500"
              />
            ) : (
              <Time02Icon width={16} height={16} className="text-amber-500" />
            )}
          </div>
          <p className="text-xl font-extrabold">
            {formatCurrency(data.monthly_summary.this_month_revenue)}
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            {t("health.vsLastMonthMoney", {
              amount: formatCurrency(data.monthly_summary.last_month_revenue),
            })}
          </p>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <span className="text-xs text-text-tertiary font-medium">
            {t("health.invoicesThisMonth")}
          </span>
          <p className="text-xl font-extrabold mt-2">
            {data.monthly_summary.this_month_invoices}
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            {t("health.vsLastMonthCount", {
              count: data.monthly_summary.last_month_invoices,
            })}
          </p>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <span className="text-xs text-text-tertiary font-medium">
            {t("health.overdueRatio")}
          </span>
          <p
            className={`text-xl font-extrabold mt-2 ${data.overdue_ratio > 20 ? "text-red-600" : data.overdue_ratio > 10 ? "text-amber-600" : "text-emerald-600"}`}
          >
            {data.overdue_ratio}%
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            {t("health.overdueInvoices")}
          </p>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
          <span className="text-xs text-text-tertiary font-medium">
            {t("health.newClients")}
          </span>
          <p className="text-xl font-extrabold mt-2">
            {data.monthly_summary.this_month_new_clients}
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            {t("health.thisMonth")}
          </p>
        </div>
      </div>

      {/* Client Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <div className="bg-bg-card border border-border-color rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
            <UserGroupIcon
              width={18}
              height={18}
              className="text-emerald-500"
            />
            <h3 className="font-bold text-sm">{t("health.topClients")}</h3>
          </div>
          {data.top_clients.length > 0 ? (
            <div className="divide-y divide-border-light">
              {data.top_clients.map((c, i) => (
                <div
                  key={c.client_id}
                  className="px-5 py-3.5 flex items-center gap-3"
                >
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {c.client_name}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {t("health.clientInvoiceAvg", {
                        count: c.total_invoices,
                        days: c.avg_days_to_pay,
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-600">
                      {formatCurrency(c.total_paid, c.currency)}
                    </p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <div className="w-12 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${c.reliability_score}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-text-tertiary">
                        {c.reliability_score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-text-tertiary text-sm">
              {t("health.noTableData")}
            </p>
          )}
        </div>

        {/* Worst Clients */}
        <div className="bg-bg-card border border-border-color rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
            <Analytics01Icon width={18} height={18} className="text-red-500" />
            <h3 className="font-bold text-sm">{t("health.clientAttention")}</h3>
          </div>
          {data.worst_clients.length > 0 ? (
            <div className="divide-y divide-border-light">
              {data.worst_clients.map((c, i) => (
                <div
                  key={c.client_id}
                  className="px-5 py-3.5 flex items-center gap-3"
                >
                  <span className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {c.client_name}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {t("health.unpaidInvoices", {
                        count: c.total_invoices,
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-600">
                      {formatCurrency(c.total_paid, c.currency)}
                    </p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <div className="w-12 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${c.reliability_score}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-text-tertiary">
                        {c.reliability_score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-text-tertiary text-sm">
              {t("health.noCollections")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
