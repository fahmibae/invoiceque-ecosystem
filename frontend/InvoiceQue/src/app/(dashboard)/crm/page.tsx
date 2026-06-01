"use client";

import React, { useEffect, useMemo, useState, type ElementType } from "react";
import Link from "next/link";
import {
  Activity01Icon,
  ChartIcon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  FilterIcon,
  Mail01Icon,
  MoneyBag02Icon,
  Search01Icon,
  SentIcon,
  SmartPhone01Icon,
  Target01Icon,
  UserGroup03Icon,
  UserGroupIcon,
  LockedIcon,
  FolderDetailsIcon,
} from "hugeicons-react";
import { clientApi, invoiceApi, type Client, type Invoice } from "@/lib/api";
import {
  convertToIDR,
  fetchExchangeRates,
  formatCurrency,
  getInitials,
  getStatusColor,
} from "@/lib/utils";
import ClickableAmount from "@/components/ui/ClickableAmount";
import PremiumGate from "@/components/subscription/PremiumGate";
import { useLanguage } from "@/context/LanguageContext";
import { useSubscriptionUsage } from "@/hooks/useSubscriptionUsage";
import type { TranslationKey } from "@/lib/app-i18n";

type CRMStage = "lead" | "active" | "follow_up" | "retention";
type StageFilter = "all" | CRMStage;
type Priority = "high" | "medium" | "low";

type ClientInsight = {
  client: Client;
  invoices: Invoice[];
  stage: CRMStage;
  priority: Priority;
  healthScore: number;
  paidRevenue: number;
  openAmount: number;
  overdueAmount: number;
  invoiceCount: number;
  paidCount: number;
  latestInvoice?: Invoice;
  lastActivityDate: string;
  nextAction: string;
};

const stageOrder: CRMStage[] = ["lead", "active", "follow_up", "retention"];

const stageMeta: Record<
  CRMStage,
  {
    label: string;
    labelKey: TranslationKey;
    summary: string;
    summaryKey: TranslationKey;
    Icon: ElementType;
    badgeClass: string;
    iconClass: string;
    barClass: string;
  }
> = {
  lead: {
    label: "Prospek",
    labelKey: "crm.stage.lead",
    summary: "Belum ada invoice",
    summaryKey: "crm.stage.leadSummary",
    Icon: Target01Icon,
    badgeClass: "bg-blue-50 text-blue-600 dark:bg-blue-900/20",
    iconClass: "bg-blue-50 text-blue-600 dark:bg-blue-900/20",
    barClass: "bg-blue-500",
  },
  active: {
    label: "Aktif",
    labelKey: "crm.stage.active",
    summary: "Transaksi sehat",
    summaryKey: "crm.stage.activeSummary",
    Icon: CheckmarkCircle01Icon,
    badgeClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20",
    iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20",
    barClass: "bg-emerald-500",
  },
  follow_up: {
    label: "Follow Up",
    labelKey: "crm.stage.followUp",
    summary: "Butuh tindak lanjut",
    summaryKey: "crm.stage.followUpSummary",
    Icon: Clock01Icon,
    badgeClass: "bg-red-50 text-red-600 dark:bg-red-900/20",
    iconClass: "bg-red-50 text-red-600 dark:bg-red-900/20",
    barClass: "bg-red-500",
  },
  retention: {
    label: "Retensi",
    labelKey: "crm.stage.retention",
    summary: "Perlu dirawat",
    summaryKey: "crm.stage.retentionSummary",
    Icon: Activity01Icon,
    badgeClass: "bg-amber-50 text-amber-600 dark:bg-amber-900/20",
    iconClass: "bg-amber-50 text-amber-600 dark:bg-amber-900/20",
    barClass: "bg-amber-500",
  },
};

const priorityStyle: Record<Priority, string> = {
  high: "bg-red-50 text-red-600 dark:bg-red-900/20",
  medium: "bg-amber-50 text-amber-600 dark:bg-amber-900/20",
  low: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20",
};

const priorityLabelKey: Record<Priority, TranslationKey> = {
  high: "crm.priority.high",
  medium: "crm.priority.medium",
  low: "crm.priority.low",
};

const openStatuses = ["sent", "overdue", "partially_paid"];

function getTime(date?: string) {
  if (!date) return 0;
  const time = new Date(date).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getDaysSince(date?: string) {
  const time = getTime(date);
  if (!time) return 999;
  return Math.floor((Date.now() - time) / 86400000);
}

function isOverdue(invoice: Invoice) {
  if (
    invoice.status === "paid" ||
    invoice.status === "cancelled" ||
    invoice.status === "draft"
  )
    return false;
  if (invoice.status === "overdue") return true;
  const dueTime = getTime(invoice.due_date);
  if (!dueTime) return false;
  return dueTime < Date.now();
}

function safeFormatDate(date: string | undefined, locale: string) {
  if (!getTime(date)) return "-";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date as string));
}

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function CRMPage() {
  return (
    <PremiumGate feature="crm">
      <CRMContent />
    </PremiumGate>
  );
}

function CRMContent() {
  const { t, intlLocale } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<
    string,
    number
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const subscription = useSubscriptionUsage();
  const clientLocked = subscription.isResourceLocked("clients");

  useEffect(() => {
    async function loadCRM() {
      try {
        const rates = await fetchExchangeRates();
        setExchangeRates(rates);

        const [clientRes, invoiceRes] = await Promise.all([
          clientApi.list(undefined, 1, 500),
          invoiceApi.list(undefined, 0, 500),
        ]);

        setClients(clientRes.data || []);
        setInvoices(invoiceRes.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("crm.loadError"));
      } finally {
        setLoading(false);
      }
    }

    loadCRM();
  }, [t]);

  const insights = useMemo<ClientInsight[]>(() => {
    const invoicesByClient = new Map<string, Invoice[]>();

    for (const invoice of invoices) {
      if (!invoice.client_id) continue;
      const current = invoicesByClient.get(invoice.client_id) || [];
      current.push(invoice);
      invoicesByClient.set(invoice.client_id, current);
    }

    return clients.map((client) => {
      const clientInvoices = (invoicesByClient.get(client.id) || []).sort(
        (a, b) => getTime(b.created_at) - getTime(a.created_at),
      );
      const latestInvoice = clientInvoices[0];
      const overdueInvoices = clientInvoices.filter(isOverdue);
      const openInvoices = clientInvoices.filter((invoice) =>
        openStatuses.includes(invoice.status),
      );
      const paidInvoices = clientInvoices.filter(
        (invoice) =>
          invoice.status === "paid" || invoice.status === "partially_paid",
      );
      const paidRevenue = paidInvoices.reduce(
        (sum, invoice) =>
          sum +
          convertToIDR(
            invoice.amount_paid || 0,
            invoice.currency,
            exchangeRates ?? undefined,
            invoice.exchange_rate_idr,
          ),
        0,
      );
      const openAmount = openInvoices.reduce(
        (sum, invoice) =>
          sum +
          convertToIDR(
            invoice.amount_remaining || 0,
            invoice.currency,
            exchangeRates ?? undefined,
            invoice.exchange_rate_idr,
          ),
        0,
      );
      const overdueAmount = overdueInvoices.reduce(
        (sum, invoice) =>
          sum +
          convertToIDR(
            invoice.amount_remaining || invoice.total || 0,
            invoice.currency,
            exchangeRates ?? undefined,
            invoice.exchange_rate_idr,
          ),
        0,
      );
      const lastActivityDate =
        latestInvoice?.created_at || client.updated_at || client.created_at;
      const daysSinceActivity = getDaysSince(lastActivityDate);

      let stage: CRMStage = "active";
      let priority: Priority = "low";
      let nextAction = t("crm.action.nurture");

      if (clientInvoices.length === 0) {
        stage = "lead";
        priority = "medium";
        nextAction = t("crm.action.sendInitialOffer");
      } else if (overdueInvoices.length > 0 || overdueAmount > 0) {
        stage = "follow_up";
        priority = "high";
        nextAction = t("crm.action.collectOverdue");
      } else if (openAmount > 0) {
        stage = "follow_up";
        priority = "medium";
        nextAction = t("crm.action.sendPaymentReminder");
      } else if (daysSinceActivity > 90) {
        stage = "retention";
        priority = "medium";
        nextAction = t("crm.action.scheduleCheckIn");
      }

      const paidRatio =
        clientInvoices.length > 0
          ? paidInvoices.length / clientInvoices.length
          : 0;
      const recencyPenalty =
        daysSinceActivity > 120
          ? 25
          : daysSinceActivity > 90
            ? 18
            : daysSinceActivity > 45
              ? 8
              : 0;
      const overduePenalty = overdueInvoices.length * 18;
      const healthScore =
        clientInvoices.length === 0
          ? 45
          : clamp(
              Math.round(55 + paidRatio * 45 - recencyPenalty - overduePenalty),
              5,
              100,
            );

      return {
        client,
        invoices: clientInvoices,
        stage,
        priority,
        healthScore,
        paidRevenue,
        openAmount,
        overdueAmount,
        invoiceCount: clientInvoices.length,
        paidCount: paidInvoices.length,
        latestInvoice,
        lastActivityDate,
        nextAction,
      };
    });
  }, [clients, invoices, exchangeRates, t]);

  const filteredInsights = useMemo(() => {
    const query = search.trim().toLowerCase();
    const priorityRank: Record<Priority, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    return insights
      .filter((insight) => {
        const matchesStage =
          stageFilter === "all" || insight.stage === stageFilter;
        const searchable = [
          insight.client.name,
          insight.client.company,
          insight.client.email,
          insight.client.phone,
          insight.latestInvoice?.number,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesStage && (!query || searchable.includes(query));
      })
      .sort((a, b) => {
        const priorityDiff =
          priorityRank[a.priority] - priorityRank[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        const amountDiff =
          b.openAmount + b.overdueAmount - (a.openAmount + a.overdueAmount);
        if (amountDiff !== 0) return amountDiff;
        return getTime(b.lastActivityDate) - getTime(a.lastActivityDate);
      });
  }, [insights, search, stageFilter]);

  const stats = useMemo(() => {
    const totalOpenAmount = insights.reduce(
      (sum, insight) => sum + insight.openAmount,
      0,
    );
    const totalRevenue = insights.reduce(
      (sum, insight) => sum + insight.paidRevenue,
      0,
    );
    const invoicedClients = insights.filter(
      (insight) => insight.invoiceCount > 0,
    ).length;
    const conversionRate =
      insights.length > 0
        ? Math.round((invoicedClients / insights.length) * 100)
        : 0;
    const followUpCount = insights.filter(
      (insight) => insight.stage === "follow_up",
    ).length;

    return {
      totalOpenAmount,
      totalRevenue,
      conversionRate,
      followUpCount,
    };
  }, [insights]);

  const stageStats = useMemo(() => {
    return stageOrder.map((stage) => {
      const stageInsights = insights.filter(
        (insight) => insight.stage === stage,
      );
      const value = stageInsights.reduce(
        (sum, insight) => sum + insight.openAmount + insight.paidRevenue,
        0,
      );
      return { stage, items: stageInsights, value };
    });
  }, [insights]);

  const followUps = useMemo(() => {
    const priorityRank: Record<Priority, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };
    return insights
      .filter((insight) => insight.priority !== "low")
      .sort((a, b) => {
        const priorityDiff =
          priorityRank[a.priority] - priorityRank[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return (
          getTime(a.latestInvoice?.due_date) -
          getTime(b.latestInvoice?.due_date)
        );
      })
      .slice(0, 5);
  }, [insights]);

  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => getTime(b.created_at) - getTime(a.created_at))
      .slice(0, 6);
  }, [invoices]);

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4" />
        <p>{t("crm.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in p-10 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{t("crm.title")}</h1>
          <p className="page-subtitle">{t("crm.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden shadow-sm">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 bg-red-50 text-red-600 dark:bg-red-900/20">
            <UserGroup03Icon width={24} height={24} />
          </div>
          <div className="min-w-0 flex-1">
            <ClickableAmount
              text={clients.length}
              className="text-xl font-extrabold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis"
            />
            <p className="text-xs text-text-tertiary font-medium">
              {t("crm.totalRelations")}
            </p>
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden shadow-sm">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 bg-amber-50 text-amber-600 dark:bg-amber-900/20">
            <MoneyBag02Icon width={24} height={24} />
          </div>
          <div className="min-w-0 flex-1">
            <ClickableAmount
              text={formatCurrency(stats.totalOpenAmount)}
              className="text-xl font-extrabold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis"
            />
            <p className="text-xs text-text-tertiary font-medium">
              {t("crm.pipelineReceivables")}
            </p>
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden shadow-sm">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 bg-blue-50 text-blue-600 dark:bg-blue-900/20">
            <ChartIcon width={24} height={24} />
          </div>
          <div className="min-w-0 flex-1">
            <ClickableAmount
              text={formatCurrency(stats.totalRevenue)}
              className="text-xl font-extrabold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis"
            />
            <p className="text-xs text-text-tertiary font-medium">
              {t("crm.relationshipValue")}
            </p>
          </div>
        </div>
        <div className="bg-bg-card border border-border-color rounded-lg p-5 flex items-start gap-4 relative overflow-hidden shadow-sm">
          <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
            <Target01Icon width={24} height={24} />
          </div>
          <div className="min-w-0 flex-1">
            <ClickableAmount
              text={`${stats.conversionRate}%`}
              className="text-xl font-extrabold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis"
            />
            <p className="text-xs text-text-tertiary font-medium">
              {t("crm.invoiceConversion")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">
            <Search01Icon width={18} height={18} />
          </span>
          <input
            type="text"
            placeholder={t("crm.searchPlaceholder")}
            className="w-full py-3 pr-4 pl-11 border border-border-color rounded-md bg-bg-card text-text-primary text-sm outline-none transition-all duration-150 focus:border-red-400 focus:ring-3 focus:ring-red-500/10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-tertiary px-1">
            <FilterIcon width={14} height={14} /> {t("crm.stage")}
          </span>
          {[
            { value: "all" as StageFilter, label: t("crm.stage.all") },
            ...stageOrder.map((stage) => ({
              value: stage,
              label: t(stageMeta[stage].labelKey),
            })),
          ].map((option) => (
            <button
              key={option.value}
              className={`px-3.5 py-2 rounded-md text-xs font-semibold border transition-all duration-150 ${stageFilter === option.value ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-bg-card border-border-color text-text-secondary hover:border-red-300 hover:text-red-600"}`}
              onClick={() => setStageFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_380px] gap-5 mb-6">
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <UserGroupIcon width={18} height={18} /> {t("crm.pipeline")}
              </h2>
              <p className="text-xs text-text-tertiary mt-1">
                {t("crm.relationsFound", { count: filteredInsights.length })}
              </p>
            </div>
            <span className="badge badge-info">
              {t("crm.followUpCount", { count: stats.followUpCount })}
            </span>
          </div>

          {clients.length === 0 ? (
            <div className="text-center py-14 px-4 border border-dashed border-border-color rounded-lg bg-bg-secondary">
              <div className="flex justify-center text-text-tertiary mb-3">
                <UserGroup03Icon width={48} height={48} />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {t("crm.emptyRelationsTitle")}
              </h3>
              <p className="text-sm text-text-secondary mb-5">
                {t("crm.emptyRelationsSubtitle")}
              </p>
              {clientLocked ? (
                <button
                  className="btn btn-primary opacity-60 cursor-not-allowed"
                  disabled
                  title={subscription.limitMessage("clients")}
                >
                  <LockedIcon width={16} height={16} /> {t("crm.addRelation")}
                </button>
              ) : (
                <Link href="/clients/create" className="btn btn-primary">
                  {t("crm.addRelation")}
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
              {stageStats.map(({ stage, items, value }) => {
                const meta = stageMeta[stage];
                const Icon = meta.Icon;
                const columnItems = items
                  .filter((insight) =>
                    filteredInsights.some(
                      (filtered) => filtered.client.id === insight.client.id,
                    ),
                  )
                  .slice(0, 4);

                return (
                  <div
                    key={stage}
                    className="bg-bg-secondary border border-border-color rounded-lg overflow-hidden min-h-[260px]"
                  >
                    <div className={`h-1.5 ${meta.barClass}`} />
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${meta.iconClass}`}
                          >
                            <Icon width={18} height={18} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold truncate">
                              {t(meta.labelKey)}
                            </h3>
                            <p className="text-[11px] text-text-tertiary truncate">
                              {t(meta.summaryKey)}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-text-secondary">
                          {items.length}
                        </span>
                      </div>
                      <ClickableAmount
                        text={formatCurrency(value)}
                        className="text-sm font-bold text-text-primary block mb-4 whitespace-nowrap overflow-hidden text-ellipsis"
                      />

                      <div className="space-y-3">
                        {columnItems.length === 0 ? (
                          <div className="text-center text-xs text-text-tertiary py-8 border border-dashed border-border-color rounded-md">
                            {t("crm.noData")}
                          </div>
                        ) : (
                          columnItems.map((insight) => (
                            <Link
                              key={insight.client.id}
                              href={`/clients/${insight.client.id}`}
                              className="block bg-bg-card border border-border-light rounded-md p-3 transition-all duration-150 hover:border-red-200 hover:-translate-y-0.5 hover:shadow-sm"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                  {getInitials(insight.client.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-sm font-bold truncate">
                                      {insight.client.name}
                                    </h4>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${priorityStyle[insight.priority]}`}
                                    >
                                      {t(priorityLabelKey[insight.priority])}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-text-tertiary truncate">
                                    {insight.client.company ||
                                      insight.client.email}
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 mt-3">
                                    <div className="bg-bg-secondary rounded-sm px-2 py-1.5">
                                      <p className="text-[10px] text-text-tertiary">
                                        {t("crm.open")}
                                      </p>
                                      <p className="text-xs font-bold truncate">
                                        {formatCurrency(insight.openAmount)}
                                      </p>
                                    </div>
                                    <div className="bg-bg-secondary rounded-sm px-2 py-1.5">
                                      <p className="text-[10px] text-text-tertiary">
                                        {t("crm.health")}
                                      </p>
                                      <p className="text-xs font-bold">
                                        {insight.healthScore}%
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>

                      {items.length > columnItems.length && (
                        <p className="text-[11px] text-text-tertiary font-medium mt-3 text-center">
                          {t("crm.moreRelations", {
                            count: items.length - columnItems.length,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="card">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Clock01Icon width={18} height={18} /> {t("crm.followUp")}
              </h2>
              <span className="text-xs text-text-tertiary font-semibold">
                {t("crm.itemCount", { count: followUps.length })}
              </span>
            </div>
            {followUps.length === 0 ? (
              <div className="text-center py-8 text-sm text-text-secondary bg-bg-secondary rounded-md">
                {t("crm.noPriorityFollowUp")}
              </div>
            ) : (
              <div className="space-y-3">
                {followUps.map((insight) => (
                  <Link
                    key={insight.client.id}
                    href={`/clients/${insight.client.id}`}
                    className="block border border-border-light rounded-md p-3 transition-all duration-150 hover:border-red-200 hover:bg-bg-secondary"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold truncate">
                          {insight.client.name}
                        </h3>
                        <p className="text-xs text-text-secondary mt-1">
                          {insight.nextAction}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${priorityStyle[insight.priority]}`}
                      >
                        {t(priorityLabelKey[insight.priority])}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border-light text-xs">
                      <span className="text-text-tertiary">
                        {t("crm.due", {
                          date: safeFormatDate(
                            insight.latestInvoice?.due_date,
                            intlLocale,
                          ),
                        })}
                      </span>
                      <span className="font-bold text-text-primary">
                        {formatCurrency(
                          insight.overdueAmount || insight.openAmount,
                        )}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Activity01Icon width={18} height={18} />{" "}
                {t("crm.recentActivity")}
              </h2>
              <Link
                href="/invoices"
                className="text-xs text-red-600 font-semibold hover:text-red-700"
              >
                {t("dashboard.viewAll")}
              </Link>
            </div>
            {recentInvoices.length === 0 ? (
              <div className="text-center py-8 text-sm text-text-secondary bg-bg-secondary rounded-md">
                {t("crm.noInvoiceActivity")}
              </div>
            ) : (
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="flex items-start gap-3 border border-border-light rounded-md p-3 transition-all duration-150 hover:border-red-200 hover:bg-bg-secondary"
                  >
                    <div className="w-9 h-9 rounded-md bg-red-50 text-red-600 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                      <SentIcon width={17} height={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold truncate">
                          {invoice.number}
                        </h3>
                        <span
                          className={`badge ${getStatusColor(invoice.status)} shrink-0`}
                        >
                          {statusLabel(invoice.status)}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary truncate mt-1">
                        {invoice.client_name}
                      </p>
                      <p className="text-[11px] text-text-tertiary mt-1">
                        {safeFormatDate(invoice.created_at, intlLocale)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-base font-bold flex items-center gap-2">
            <UserGroup03Icon width={18} height={18} />{" "}
            {t("crm.relationshipList")}
          </h2>
          <span className="text-xs text-text-tertiary font-semibold">
            {t("crm.relationshipCount", {
              shown: filteredInsights.length,
              total: clients.length,
            })}
          </span>
        </div>

        {filteredInsights.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-border-color rounded-lg bg-bg-secondary">
            <h3 className="text-lg font-semibold mb-2">
              {t("crm.notFoundTitle")}
            </h3>
            <p className="text-sm text-text-secondary">
              {t("crm.notFoundSubtitle")}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("crm.relation")}</th>
                  <th>{t("crm.stage")}</th>
                  <th>{t("crm.contact")}</th>
                  <th>{t("crm.invoice")}</th>
                  <th>{t("crm.outstanding")}</th>
                  <th>{t("crm.activity")}</th>
                  <th className="text-center">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredInsights.map((insight) => {
                  const meta = stageMeta[insight.stage];

                  return (
                    <tr key={insight.client.id}>
                      <td>
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {getInitials(insight.client.name)}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/clients/${insight.client.id}`}
                              className="table-link block truncate"
                            >
                              {insight.client.name}
                            </Link>
                            <p className="text-xs text-text-tertiary truncate">
                              {insight.client.company || "-"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1.5">
                          <span
                            className={`inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${meta.badgeClass}`}
                          >
                            <meta.Icon width={13} height={13} />{" "}
                            {t(meta.labelKey)}
                          </span>
                          <span
                            className={`inline-flex w-fit px-2.5 py-1 rounded-full text-[10px] font-bold ${priorityStyle[insight.priority]}`}
                          >
                            {t("crm.priorityLabel", {
                              priority: t(priorityLabelKey[insight.priority]),
                            })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1.5 text-xs text-text-secondary min-w-[190px]">
                          <span className="inline-flex items-center gap-2 truncate">
                            <Mail01Icon width={14} height={14} />{" "}
                            {insight.client.email || "-"}
                          </span>
                          <span className="inline-flex items-center gap-2 truncate">
                            <SmartPhone01Icon width={14} height={14} />{" "}
                            {insight.client.phone || "-"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="font-bold text-text-primary">
                          {insight.invoiceCount}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {t("crm.paidCount", { count: insight.paidCount })}
                        </div>
                      </td>
                      <td className="font-bold">
                        {formatCurrency(insight.openAmount)}
                      </td>
                      <td>
                        <div className="min-w-[140px]">
                          <div className="text-sm font-semibold">
                            {safeFormatDate(
                              insight.lastActivityDate,
                              intlLocale,
                            )}
                          </div>
                          <div className="text-xs text-text-tertiary">
                            {insight.nextAction}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/clients/${insight.client.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            <FolderDetailsIcon width={14} height={14} />{" "}
                            {t("common.details")}
                          </Link>
                          {/* <Link href="/invoices/create" className="btn btn-secondary btn-sm">
                            <Calendar01Icon width={14} height={14} /> Invoice
                          </Link> */}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
