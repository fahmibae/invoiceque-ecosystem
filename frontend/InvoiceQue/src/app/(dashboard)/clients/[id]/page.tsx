"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  clientApi,
  invoiceApi,
  meetingApi,
  type Client,
  type Invoice,
  type Meeting,
} from "@/lib/api";
import {
  formatCurrency,
  getStatusColor,
  convertToIDR,
  fetchExchangeRates,
} from "@/lib/utils";
import {
  Mail01Icon,
  SmartPhone01Icon,
  ArrowLeft02Icon,
  Edit02Icon,
  Delete02Icon,
  Location01Icon,
  Calendar01Icon,
  File01Icon,
  CheckmarkCircle01Icon,
  MoneyBag02Icon,
  UserGroup03Icon,
  Task01Icon,
} from "hugeicons-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/app-i18n";

const invoiceStatusLabelKeys: Record<string, TranslationKey> = {
  draft: "status.draft",
  sent: "status.sent",
  viewed: "status.viewed",
  paid: "status.paid",
  partially_paid: "status.partiallyPaid",
  overdue: "status.overdue",
  cancelled: "status.cancelled",
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, intlLocale } = useLanguage();
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exchangeRates, setExchangeRates] = useState<Record<
    string,
    number
  > | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Compute real totals from invoices instead of stale DB fields
  const computedStats = React.useMemo(() => {
    const totalInvoices = invoices.length;
    const totalSpent = invoices
      .filter((inv) => inv.status === "paid" || inv.status === "partially_paid")
      .reduce(
        (sum, inv) =>
          sum +
          convertToIDR(
            inv.amount_paid || 0,
            inv.currency,
            exchangeRates ?? undefined,
            inv.exchange_rate_idr,
          ),
        0,
      );
    const pendingAmount = invoices
      .filter(
        (inv) =>
          inv.status === "sent" ||
          inv.status === "overdue" ||
          inv.status === "partially_paid",
      )
      .reduce(
        (sum, inv) =>
          sum +
          convertToIDR(
            inv.amount_remaining || 0,
            inv.currency,
            exchangeRates ?? undefined,
            inv.exchange_rate_idr,
          ),
        0,
      );
    return {
      totalInvoices,
      totalSpent,
      pendingAmount,
      totalMeetings: meetings.length,
    };
  }, [invoices, meetings, exchangeRates]);

  useEffect(() => {
    async function fetchData() {
      try {
        if (!params.id) return;
        const [clientRes, invoicesRes, meetingsRes] = await Promise.all([
          clientApi.get(params.id as string),
          invoiceApi.list(undefined, 0, 100), // Fetch up to 100 invoices to filter locally
          meetingApi.list({ client_id: params.id as string, per_page: 20 }),
        ]);
        setClient(clientRes);
        // Filter invoices for this client
        setInvoices(
          invoicesRes.data.filter((inv) => inv.client_id === params.id),
        );
        setMeetings(meetingsRes.data || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("clients.detailLoadError"),
        );
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    fetchExchangeRates().then(setExchangeRates);
  }, [params.id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await clientApi.delete(params.id as string);
      router.push("/clients");
    } catch (err) {
      alert(err instanceof Error ? err.message : t("clients.deleteError"));
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>{t("clients.detailLoading")}</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="animate-fade-in p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-red-500 mb-4">
          {error || t("clients.notFound")}
        </p>
        <Link
          href="/clients"
          className="btn btn-primary flex items-center gap-2"
        >
          <ArrowLeft02Icon /> {t("clients.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmModal
        isOpen={showDeleteModal}
        title={t("clients.deleteTitle")}
        message={t("clients.deleteDetailMessage", { name: client.name })}
        confirmText={t("clients.yesDelete")}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={isDeleting}
        type="danger"
      />
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2">
            <Link
              href="/clients"
              className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"
            >
              <ArrowLeft02Icon />
            </Link>
            <h1 className="page-title">{t("clients.detailTitle")}</h1>
          </div>
          <p className="page-subtitle">
            {t("clients.detailSubtitle", { name: client.name })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/clients/${params.id}/edit`}
            className="btn btn-primary flex items-center gap-2"
          >
            <Edit02Icon /> {t("clients.editClient")}
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn btn-danger flex items-center gap-2"
          >
            <Delete02Icon /> {t("clients.deleteClient")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Client Profile Card */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="card relative overflow-hidden before:absolute before:top-0 before:inset-x-0 before:h-[4px] before:bg-gradient-to-r before:from-red-600 before:to-red-400">
            <div className="flex flex-col items-center text-center mb-6 pt-4">
              <div className="w-24 h-24 bg-gradient-to-br from-red-600 to-red-400 rounded-full flex items-center justify-center font-bold text-3xl text-white shadow-lg shadow-red-500/20 mb-4">
                {client.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)}
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-1">
                {client.name}
              </h2>
              <p className="text-sm font-medium text-red-600">
                {client.company}
              </p>
            </div>

            <div className="flex flex-col gap-4 border-t border-border-light pt-6">
              <div className="flex items-start gap-3 text-sm">
                <Mail01Icon
                  className="text-text-tertiary shrink-0"
                  width={18}
                  height={18}
                />
                <div className="overflow-hidden">
                  <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-0.5">
                    {t("auth.email")}
                  </div>
                  <div className="text-text-secondary truncate">
                    {client.email}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <SmartPhone01Icon
                  className="text-text-tertiary shrink-0"
                  width={18}
                  height={18}
                />
                <div>
                  <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-0.5">
                    {t("clients.phone")}
                  </div>
                  <div className="text-text-secondary">
                    {client.phone || "-"}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Location01Icon
                  className="text-text-tertiary shrink-0"
                  width={18}
                  height={18}
                />
                <div>
                  <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-0.5">
                    {t("clients.address")}
                  </div>
                  <div className="text-text-secondary leading-relaxed">
                    {client.address || "-"}
                    {client.city && (
                      <>
                        <br />
                        {client.city}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Calendar01Icon
                  className="text-text-tertiary shrink-0"
                  width={18}
                  height={18}
                />
                <div>
                  <div className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-0.5">
                    {t("clients.joinedSince")}
                  </div>
                  <div className="text-text-secondary">
                    {new Date(client.created_at).toLocaleDateString(intlLocale, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats & Invoices */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card bg-gradient-to-br from-bg-card to-red-50/30 dark:to-red-900/10 flex items-center p-6">
              <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center shrink-0 mr-4">
                <File01Icon width={28} height={28} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-secondary mb-1">
                  {t("dashboard.totalInvoices")}
                </p>
                <h3 className="text-3xl font-bold text-text-primary truncate">
                  {computedStats.totalInvoices}
                </h3>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-bg-card to-green-50/30 dark:to-green-900/10 flex items-center p-6">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 flex items-center justify-center shrink-0 mr-4">
                <CheckmarkCircle01Icon width={28} height={28} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-secondary mb-1">
                  {t("clients.totalPaid")}
                </p>
                <h3 className="text-2xl font-bold text-text-primary truncate">
                  {formatCurrency(computedStats.totalSpent)}
                </h3>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-bg-card to-amber-50/30 dark:to-amber-900/10 flex items-center p-6">
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center shrink-0 mr-4">
                <MoneyBag02Icon width={28} height={28} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-secondary mb-1">
                  {t("dashboard.unpaid")}
                </p>
                <h3 className="text-2xl font-bold text-text-primary truncate">
                  {formatCurrency(computedStats.pendingAmount)}
                </h3>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-bg-card to-blue-50/30 dark:to-blue-900/10 flex items-center p-6">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center shrink-0 mr-4">
                <UserGroup03Icon width={28} height={28} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-secondary mb-1">
                  Meeting
                </p>
                <h3 className="text-3xl font-bold text-text-primary truncate">
                  {computedStats.totalMeetings}
                </h3>
              </div>
            </div>
          </div>

          <div className="card flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">
                {t("clients.invoiceHistory")}
              </h3>
              <Link
                href={`/invoices/create`}
                className="btn btn-primary btn-sm"
              >
                {t("clients.createNewInvoice")}
              </Link>
            </div>

            {invoices.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("clients.number")}</th>
                      <th>{t("dashboard.date")}</th>
                      <th>{t("invoices.totalValue")}</th>
                      <th>{t("dashboard.status")}</th>
                      <th>{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <span className="font-semibold text-text-primary">
                            {inv.number}
                          </span>
                        </td>
                        <td>
                          {new Date(inv.created_at).toLocaleDateString(
                            intlLocale,
                          )}
                        </td>
                        <td className="font-medium text-text-primary">
                          {formatCurrency(inv.total, inv.currency)}
                        </td>
                        <td>
                          <span
                            className={`badge ${getStatusColor(inv.status)}`}
                          >
                            {t(
                              invoiceStatusLabelKeys[inv.status] ??
                                "status.unknown",
                            )}
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="table-link"
                          >
                            {t("common.view")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 px-4 border border-dashed border-border-color rounded-lg bg-bg-tertiary/50">
                <div className="text-4xl mb-3 opacity-30 flex justify-center">
                  <File01Icon width={48} height={48} />
                </div>
                <p className="text-text-secondary font-medium">
                  {t("clients.noInvoicesForClient")}
                </p>
                <p className="text-sm text-text-tertiary mt-1 mb-4">
                  {t("clients.noInvoicesHint")}
                </p>
                <Link
                  href={`/invoices/create`}
                  className="btn btn-secondary btn-sm"
                >
                  {t("invoices.create")}
                </Link>
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-6 gap-3">
              <h3 className="text-lg font-bold">
                {t("clients.meetingHistory")}
              </h3>
              <Link
                href={`/meetings?client_id=${client.id}`}
                className="btn btn-secondary btn-sm"
              >
                {t("clients.openMeetingHub")}
              </Link>
            </div>

            {meetings.length > 0 ? (
              <div className="space-y-3">
                {meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="rounded-lg border border-border-light bg-bg-secondary/60 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className={`badge ${meeting.status === "completed" ? "badge-success" : meeting.status === "cancelled" ? "badge-default" : "badge-info"}`}
                          >
                            {meeting.status === "completed"
                              ? t("status.completed")
                              : meeting.status === "cancelled"
                                ? t("status.cancelled")
                                : t("clients.scheduled")}
                          </span>
                          <span className="text-xs font-semibold text-text-tertiary">
                            {meeting.scheduled_at
                              ? new Date(
                                  meeting.scheduled_at,
                                ).toLocaleDateString(intlLocale)
                              : t("clients.notScheduled")}
                          </span>
                        </div>
                        <h4 className="font-bold text-text-primary">
                          {meeting.title}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
                          {meeting.summary ||
                            meeting.notes ||
                            meeting.agenda ||
                            t("clients.noMeetingNotes")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-text-secondary">
                        <Task01Icon
                          width={15}
                          height={15}
                          className="text-red-500"
                        />
                        {t("clients.actionsCount", {
                          count: meeting.action_items.length,
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 px-4 border border-dashed border-border-color rounded-lg bg-bg-tertiary/50">
                <div className="text-4xl mb-3 opacity-30 flex justify-center">
                  <UserGroup03Icon width={48} height={48} />
                </div>
                <p className="text-text-secondary font-medium">
                  {t("clients.noMeetingsForClient")}
                </p>
                <p className="text-sm text-text-tertiary mt-1 mb-4">
                  {t("clients.noMeetingsHint")}
                </p>
                <Link
                  href={`/meetings?client_id=${client.id}`}
                  className="btn btn-secondary btn-sm"
                >
                  {t("clients.addMeeting")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
