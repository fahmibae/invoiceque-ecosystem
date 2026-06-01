"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  quotationApi,
  invoiceSettingsApi,
  clientApi,
  type Quotation,
} from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  ArrowLeft02Icon,
  Delete02Icon,
  FlashIcon,
  ChartIcon,
  Clock01Icon,
  SentIcon,
  PencilEdit01Icon,
  ArrowRight01Icon,
  GoogleDocIcon,
} from "hugeicons-react";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/app-i18n";

const statusLabelKeys: Record<string, TranslationKey> = {
  draft: "status.draft",
  sent: "status.sent",
  accepted: "status.accepted",
  rejected: "status.rejected",
  expired: "status.expired",
  converted: "status.converted",
};
const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
  converted: "bg-violet-100 text-violet-700",
};

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [bizName, setBizName] = useState("");
  const [companyInitial, setCompanyInitial] = useState("");
  const [logoCompany, setLogoCompany] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const id = params.id as string;
        const [qt, settings] = await Promise.all([
          quotationApi.get(id),
          invoiceSettingsApi.get().catch(() => null),
        ]);
        setQuotation(qt);

        if (settings) {
          setBizName(settings.business_name || "");
          setCompanyInitial(
            (settings.business_name || "").substring(0, 2).toUpperCase(),
          );
          setLogoCompany(settings.logo_url || "");
          setBizAddress(settings.business_address || "");
          setBizPhone(settings.business_phone || "");
        }

        if (qt.client_id) {
          try {
            const c = await clientApi.get(qt.client_id);
            setClientCompany(c.company || "");
            setClientPhone(c.phone || "");
            setClientAddress(c.address || "");
          } catch {
            /* optional */
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("quotationDetail.notFound"),
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, t]);

  const handleSend = async () => {
    if (!quotation) return;
    setActionLoading(true);
    try {
      const updated = await quotationApi.send(quotation.id);
      setQuotation(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("quotationDetail.sendError"));
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!quotation) return;
    setActionLoading(true);
    try {
      await quotationApi.delete(quotation.id);
      router.push("/quotations");
    } catch (err) {
      alert(err instanceof Error ? err.message : t("quotationDetail.deleteError"));
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleConvert = async () => {
    if (!quotation) return;
    setActionLoading(true);
    try {
      const res = await quotationApi.convert(quotation.id);
      router.push(`/invoices/${res.invoice_id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("quotationDetail.convertError"));
      setActionLoading(false);
      setShowConvertModal(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>{t("quotationForm.loading")}</p>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="animate-fade-in">
        <div className="card text-center py-16 px-5">
          <div className="text-5xl mb-4 opacity-50 flex justify-center">
            <GoogleDocIcon width={48} height={48} />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t("quotationDetail.notFound")}
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            {error || t("quotationDetail.notFoundSubtitle")}
          </p>
          <Link
            href="/quotations"
            className="btn btn-primary flex items-center gap-2"
          >
            <ArrowLeft02Icon /> {t("clients.back")}
          </Link>
        </div>
      </div>
    );
  }

  const hasLogo = !!logoCompany;

  return (
    <div className="animate-fade-in">
      <ConfirmModal
        isOpen={showDeleteModal}
        title={t("quotationDetail.deleteTitle")}
        message={t("quotationDetail.deleteMessage")}
        confirmText={t("clients.yesDelete")}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={actionLoading}
        type="danger"
      />
      <ConfirmModal
        isOpen={showConvertModal}
        title={t("quotations.convertTitle")}
        message={t("quotationDetail.convertMessage")}
        confirmText={t("common.convert")}
        onConfirm={handleConvert}
        onCancel={() => setShowConvertModal(false)}
        isLoading={actionLoading}
        type="info"
      />

      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2">
            <Link
              href="/quotations"
              className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"
            >
              <ArrowLeft02Icon />
            </Link>
            <h1 className="page-title">{quotation.quotation_number}</h1>
          </div>
          <p className="page-subtitle">
            {t("quotationDetail.subtitle", { client: quotation.client_name })}
          </p>
        </div>
        <div className="flex gap-2">
          {quotation.status === "draft" && (
            <button
              className="btn btn-primary flex items-center gap-2"
              onClick={handleSend}
              disabled={actionLoading}
            >
              <SentIcon /> {t("common.send")}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Quotation Document */}
        <div className="card p-8 max-sm:p-5">
          <div className="flex justify-between items-start mb-7 pb-5 border-b-[3px] border-red-500 max-sm:flex-col max-sm:gap-4">
            <div>
              <div
                className={`w-[44px] h-[44px] rounded-sm flex items-center justify-center font-extrabold text-base text-white mb-2 overflow-hidden ${!logoCompany ? "bg-gradient-to-br from-red-600 to-red-500" : ""}`}
              >
                {hasLogo ? (
                  <img
                    src={logoCompany}
                    alt="Logo"
                    className="w-auto h-10 object-cover"
                  />
                ) : (
                  companyInitial || "IQ"
                )}
              </div>
              <h2 className="text-[28px] font-black tracking-[3px] bg-gradient-to-br from-red-600 to-red-500 bg-clip-text text-transparent">
                QUOTATION
              </h2>
            </div>
            <div className="text-right max-sm:text-left flex flex-col max-sm:items-start items-end">
              <div className="text-base font-bold mb-1">
                {bizName || "InvoiceQu Platform"}
              </div>
              <div className="text-[13px] text-text-secondary">
                {bizAddress}
              </div>
              <div className="text-[13px] text-text-secondary">{bizPhone}</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="p-4 bg-bg-secondary rounded-md border-l-[3px] border-red-500 flex justify-between items-start max-sm:flex-col max-sm:gap-4">
              <div>
                <span className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">
                  {t("quotationForm.offerFor")}
                </span>
                <div className="font-bold text-base">
                  {quotation.client_name}
                </div>
                {clientCompany && (
                  <div className="text-[13px] text-text-secondary">
                    {clientCompany}
                  </div>
                )}
                {clientPhone && (
                  <div className="text-[13px] text-text-secondary">
                    {clientPhone}
                  </div>
                )}
                <div className="text-[13px] text-text-secondary">
                  {quotation.client_email}
                </div>
                {clientAddress && (
                  <div className="text-[13px] text-text-secondary">
                    {clientAddress}
                  </div>
                )}
              </div>
              <div className="text-right max-sm:text-left flex flex-col max-sm:items-start items-end">
                <div className="text-base font-bold mb-1">
                  {quotation.quotation_number}
                </div>
                <div className="text-[13px] text-text-secondary">
                  {t("dashboard.date")}: {formatDate(quotation.created_at)}
                </div>
                {quotation.valid_until && (
                  <div className="text-[13px] text-text-secondary">
                    {t("quotationForm.validUntil")}:{" "}
                    {formatDate(quotation.valid_until)}
                  </div>
                )}
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold mt-2 ${statusColors[quotation.status] || ""}`}
                >
                  {t(statusLabelKeys[quotation.status] ?? "status.unknown")}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-5 overflow-x-auto">
            <table className="w-full border-collapse min-w-[500px]">
              <thead>
                <tr>
                  <th className="py-3 px-3.5 text-left text-xs font-bold uppercase text-white bg-gradient-to-br from-red-600 to-red-500 tracking-[0.5px] first:rounded-tl-md">
                    #
                  </th>
                  <th className="py-3 px-3.5 text-left text-xs font-bold uppercase text-white bg-gradient-to-br from-red-600 to-red-500 tracking-[0.5px]">
                    {t("common.description")}
                  </th>
                  <th className="py-3 px-3.5 text-left text-xs font-bold uppercase text-white bg-gradient-to-br from-red-600 to-red-500 tracking-[0.5px]">
                    {t("invoiceDetail.quantity")}
                  </th>
                  <th className="py-3 px-3.5 text-left text-xs font-bold uppercase text-white bg-gradient-to-br from-red-600 to-red-500 tracking-[0.5px]">
                    {t("invoiceDetail.price")}
                  </th>
                  <th className="py-3 px-3.5 text-right text-xs font-bold uppercase text-white bg-gradient-to-br from-red-600 to-red-500 tracking-[0.5px] last:rounded-tr-md">
                    {t("invoices.totalValue")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="p-3.5 text-sm border-b border-border-light">
                      {idx + 1}
                    </td>
                    <td className="p-3.5 text-sm border-b border-border-light">
                      {item.description}
                    </td>
                    <td className="p-3.5 text-sm border-b border-border-light">
                      {item.quantity}
                    </td>
                    <td className="p-3.5 text-sm border-b border-border-light">
                      {formatCurrency(item.price, quotation.currency)}
                    </td>
                    <td className="p-3.5 text-sm border-b border-border-light text-right font-semibold">
                      {formatCurrency(item.total, quotation.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="py-4">
            <div className="flex justify-between py-2 text-sm text-text-secondary">
              <span>Subtotal</span>
              <span>
                {formatCurrency(quotation.subtotal, quotation.currency)}
              </span>
            </div>
            <div className="flex justify-between py-2 text-sm text-text-secondary">
              <span>{t("invoiceDetail.tax")}</span>
              <span>{formatCurrency(quotation.tax, quotation.currency)}</span>
            </div>
            {quotation.discount > 0 && (
              <div className="flex justify-between py-2 text-sm text-text-secondary">
                <span>{t("invoiceDetail.discount")}</span>
                <span className="text-success">
                  -{formatCurrency(quotation.discount, quotation.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-xl font-extrabold text-text-primary pt-3 mt-2 border-t-[2px] border-red-500">
              <span>{t("invoices.totalValue")}</span>
              <span>{formatCurrency(quotation.total, quotation.currency)}</span>
            </div>
          </div>

          {quotation.notes && (
            <div className="mt-4 p-3 bg-bg-secondary rounded-md text-sm text-text-secondary">
              <strong>{t("clients.notes")}:</strong> {quotation.notes}
            </div>
          )}

          <div className="text-center pt-6 mt-6 border-t border-border-light text-[13px] text-text-secondary">
            <p>{t("invoiceDetail.thanks")}</p>
            <p className="text-[11px] text-text-tertiary mt-1">
              Powered by InvoiceQu
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 sticky top-[calc(var(--header-height)+24px)] max-lg:relative max-lg:top-0">
          <div className="card">
            <h3 className="text-[15px] font-bold mb-3.5 flex items-center gap-2">
              <FlashIcon /> {t("invoiceDetail.actions")}
            </h3>
            <div className="flex flex-col gap-2">
              {quotation.status === "draft" && (
                <>
                  <button
                    className="btn btn-primary w-full"
                    onClick={handleSend}
                    disabled={actionLoading}
                  >
                    <SentIcon /> {t("quotationDetail.sendToClient")}
                  </button>
                  <Link
                    href={`/quotations/${quotation.id}/edit`}
                    className="btn btn-secondary w-full text-center"
                  >
                    <PencilEdit01Icon /> {t("quotationDetail.edit")}
                  </Link>
                </>
              )}
              {quotation.status === "accepted" && (
                <button
                  className="btn btn-primary w-full"
                  onClick={() => setShowConvertModal(true)}
                  disabled={actionLoading}
                >
                  <ArrowRight01Icon /> {t("quotations.convertTitle")}
                </button>
              )}
              <button
                className="btn btn-ghost w-full text-danger hover:text-red-600"
                onClick={() => setShowDeleteModal(true)}
              >
                <Delete02Icon /> {t("quotationDetail.delete")}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-[15px] font-bold mb-3.5 flex items-center gap-2">
              <ChartIcon /> {t("paymentDetail.info")}
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">
                  {t("dashboard.status")}
                </span>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[quotation.status] || ""}`}
                >
                  {t(statusLabelKeys[quotation.status] ?? "status.unknown")}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">
                  {t("invoices.totalValue")}
                </span>
                <span className="font-bold">
                  {formatCurrency(quotation.total, quotation.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">
                  {t("invoiceDetail.created")}
                </span>
                <span>{formatDate(quotation.created_at)}</span>
              </div>
              {quotation.valid_until && (
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-text-tertiary font-medium">
                    {t("quotationForm.validUntil")}
                  </span>
                  <span>{formatDate(quotation.valid_until)}</span>
                </div>
              )}
              {quotation.accepted_at && (
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-text-tertiary font-medium">
                    {t("quotationDetail.accepted")}
                  </span>
                  <span className="text-success">
                    {formatDate(quotation.accepted_at)}
                  </span>
                </div>
              )}
              {quotation.rejected_at && (
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-text-tertiary font-medium">
                    {t("quotationDetail.rejected")}
                  </span>
                  <span className="text-danger">
                    {formatDate(quotation.rejected_at)}
                  </span>
                </div>
              )}
              {quotation.converted_invoice_id && (
                <Link
                  href={`/invoices/${quotation.converted_invoice_id}`}
                  className="block text-center p-2 bg-violet-600/10 rounded-md text-violet-600 font-semibold text-xs no-underline hover:bg-violet-600/20 transition-colors mt-1"
                >
                  {t("quotationDetail.viewConvertedInvoice")}
                </Link>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-[15px] font-bold mb-3.5 flex items-center gap-2">
              <Clock01Icon /> {t("invoiceDetail.history")}
            </h3>
            <div className="flex flex-col gap-4 pl-4 border-l-[2px] border-border-color">
              <div className="flex gap-3 items-start relative">
                <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 absolute -left-[21px] bg-info" />
                <div>
                  <div className="text-[13px] font-semibold ml-0.5">
                    {t("quotationDetail.created")}
                  </div>
                  <div className="text-[11px] text-text-tertiary ml-0.5">
                    {formatDate(quotation.created_at)}
                  </div>
                </div>
              </div>
              {quotation.status !== "draft" && (
                <div className="flex gap-3 items-start relative">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 absolute -left-[21px] bg-warning" />
                  <div>
                    <div className="text-[13px] font-semibold ml-0.5">
                      {t("quotationDetail.sent")}
                    </div>
                    <div className="text-[11px] text-text-tertiary ml-0.5">
                      {formatDate(quotation.updated_at)}
                    </div>
                  </div>
                </div>
              )}
              {quotation.accepted_at && (
                <div className="flex gap-3 items-start relative">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 absolute -left-[21px] bg-success" />
                  <div>
                    <div className="text-[13px] font-semibold ml-0.5">
                      {t("quotationDetail.acceptedByClient")}
                    </div>
                    <div className="text-[11px] text-text-tertiary ml-0.5">
                      {formatDate(quotation.accepted_at)}
                    </div>
                  </div>
                </div>
              )}
              {quotation.rejected_at && (
                <div className="flex gap-3 items-start relative">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 absolute -left-[21px] bg-danger" />
                  <div>
                    <div className="text-[13px] font-semibold ml-0.5">
                      {t("quotationDetail.rejectedByClient")}
                    </div>
                    <div className="text-[11px] text-text-tertiary ml-0.5">
                      {formatDate(quotation.rejected_at)}
                    </div>
                  </div>
                </div>
              )}
              {quotation.converted_invoice_id && (
                <div className="flex gap-3 items-start relative">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 absolute -left-[21px] bg-violet-500" />
                  <div>
                    <div className="text-[13px] font-semibold ml-0.5">
                      {t("quotationDetail.convertedToInvoice")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
