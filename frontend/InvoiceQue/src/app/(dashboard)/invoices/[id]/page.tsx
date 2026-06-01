"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  invoiceApi,
  paymentLinkApi,
  clientApi,
  type Invoice,
  invoiceSettingsApi,
  type InvoiceSettingsData,
  type PaymentLink,
  authApi,
} from "@/lib/api";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  Download02Icon,
  ArrowLeft02Icon,
  Delete02Icon,
  FlashIcon,
  ChartIcon,
  SentIcon,
  Clock01Icon,
  Edit02Icon,
} from "hugeicons-react";
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

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bizName, setBizName] = useState("");
  const [companyInitial, setCompanyInitial] = useState("");
  const [logoCompany, setLogoCompany] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [zip, setZip] = useState("");
  const [clientState, setClientState] = useState("");
  const [clientCountry, setClientCountry] = useState("");
  const [bizBankName, setBizBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const hasLogo = !!logoCompany;
  const hasInitial = !!companyInitial;

  const loadSettings = async () => {
    try {
      const s = await invoiceSettingsApi.get();
      setBizName(s.business_name || "");
      setCompanyInitial((s.business_name || "").substring(0, 2).toUpperCase());
      setLogoCompany(s.logo_url || "");
      setBizAddress(s.business_address || "");
      setBizPhone(s.business_phone || "");
      setBizBankName(s.bank_name || "");
      setBankAccountNumber(s.bank_account_number || "");
      setBankAccountName(s.bank_account_name || "");
    } catch {
      // Use defaults if API not available
    }
  };
  const loadAuth = async () => {
    try {
      const s = await invoiceSettingsApi.get();
      setBizName(s.business_name || "");
      setCompanyInitial((s.business_name || "").substring(0, 2).toUpperCase());
      setLogoCompany(s.logo_url || "");
      setBizAddress(s.business_address || "");
      setBizPhone(s.business_phone || "");
    } catch {
      // Use defaults if API not available
    }
  };
  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const id = params.id as string;
        const res = await invoiceApi.get(id);
        setInvoice(res);

        // Fetch client address from clients table
        if (res.client_id) {
          try {
            const clientData = await clientApi.get(res.client_id);
            if (clientData.address) {
              setClientAddress(clientData.address);
              setClientCompany(clientData.company);
              setClientPhone(clientData.phone);
              setClientCity(clientData.city);
              setZip(clientData.zip);
              setClientState(clientData.state);
              setClientCountry(clientData.country);
            }
          } catch (e) {
            // Client data optional
          }
        }

        if (res.payment_type === "dp") {
          try {
            const linksRes = await paymentLinkApi.list(1, 100);
            const link = linksRes.data.find(
              (l) => l.invoice_id === id && l.status === "active",
            );
            if (link) {
              setPaymentLink(link);
            }
          } catch (e) {
            console.error("Failed to fetch payment links", e);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("invoiceDetail.notFound"),
        );
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [params.id, t]);

  useEffect(() => {
    if (!loading && invoice) {
      const isPrint =
        new URLSearchParams(window.location.search).get("print") === "true";
      const isDownload =
        new URLSearchParams(window.location.search).get("download") === "true";

      if (isPrint || isDownload) {
        setTimeout(() => {
          window.print();
        }, 800);
      }
    }
  }, [loading, invoice]);

  const handleSend = async () => {
    if (!invoice) return;
    try {
      const updated = await invoiceApi.send(invoice.id);
      setInvoice(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("invoiceDetail.sendError"));
    }
  };

  const confirmDelete = () => {
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!invoice) return;
    setIsDeleting(true);
    try {
      // Cascade delete: clean up associated payment links first
      try {
        await paymentLinkApi.deleteByInvoice(invoice.id);
      } catch {
        // Non-blocking — payment links cleanup is best-effort
      }
      await invoiceApi.delete(invoice.id);
      router.push("/invoices");
    } catch (err) {
      alert(err instanceof Error ? err.message : t("invoices.deleteError"));
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary">
        {t("invoiceDetail.loading")}
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="animate-fade-in">
        <div className="card text-center py-16 px-5">
          <div className="text-5xl mb-4 opacity-50 flex justify-center">
            <Download02Icon width={48} height={48} />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t("invoiceDetail.notFound")}
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            {error || t("invoiceDetail.notFoundSubtitle")}
          </p>
          <Link
            href="/invoices"
            className="btn btn-primary flex items-center gap-2"
          >
            <ArrowLeft02Icon /> {t("invoiceDetail.backToList")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ConfirmModal
        isOpen={showDeleteModal}
        title={t("invoices.deleteTitle")}
        message={t("invoiceDetail.deleteMessage")}
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
              href="/invoices"
              className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"
            >
              <ArrowLeft02Icon />
            </Link>
            <h1 className="page-title">{invoice.number}</h1>
          </div>
          <p className="page-subtitle">
            {t("invoiceDetail.subtitle", { client: invoice.client_name })}
          </p>
        </div>
        <div className="flex gap-2">
          {invoice.status === "draft" && (
            <button
              className="btn btn-primary flex items-center gap-2"
              onClick={handleSend}
            >
              <SentIcon /> {t("invoiceDetail.sendInvoice")}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Invoice Document */}
        <div id="invoice-document" className="card p-8 max-sm:p-5">
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
                ) : hasInitial ? (
                  companyInitial
                ) : (
                  "IQ"
                )}
              </div>
              <h2 className="text-[28px] font-black tracking-[3px] bg-gradient-to-br from-red-600 to-red-500 bg-clip-text text-transparent print:!text-red-600 print:!bg-none">
                INVOICE
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
                  {t("invoiceDetail.billTo")}
                </span>
                <div className="font-bold text-base">{invoice.client_name}</div>
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
                  {invoice.client_email}
                </div>
                <div className="text-[13px] text-text-secondary flex items-center gap-1">
                  {clientAddress && <span>{clientAddress},</span>}
                  {clientCity && <span>{clientCity},</span>}
                </div>
                <div className="text-[13px] text-text-secondary flex items-center gap-1">
                  {clientState && <span>{clientState},</span>}
                  {clientCountry && <span>{clientCountry},</span>}
                </div>
                <div className="text-[13px] text-text-secondary">
                  {zip && <span>{zip}</span>}
                </div>
              </div>
              <div className="text-right max-sm:text-left flex flex-col max-sm:items-start items-end">
                <div className="text-base font-bold mb-1">{invoice.number}</div>
                <div className="text-[13px] text-text-secondary">
                  {t("dashboard.date")}: {formatDate(invoice.created_at)}
                </div>
                <div className="text-[13px] text-text-secondary">
                  {t("invoiceDetail.dueDate")}:{" "}
                  {invoice.due_date ? formatDate(invoice.due_date) : "-"}
                </div>
                <span
                  className={`badge ${getStatusColor(invoice.status)} mt-2`}
                >
                  {t(invoiceStatusLabelKeys[invoice.status] ?? "status.unknown")}
                </span>
                <div className="text-[13px] text-text-secondary">
                  {t("clients.notes")}: {invoice.notes}
                </div>
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
                {invoice.items.map((item, idx) => (
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
                      {formatCurrency(item.price, invoice.currency)}
                    </td>
                    <td className="p-3.5 text-sm border-b border-border-light text-right font-semibold">
                      {formatCurrency(item.total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-8 max-sm:flex-col">
            {/* LEFT: Penerima Dana */}
            <div className="w-full text-sm text-text-secondary">
              <div className="mb-2 font-semibold text-text-primary">
                {t("invoiceDetail.reference")}
              </div>

              <div className="py-1">
                <span className="block">{t("invoiceDetail.companyName")}</span>
                <span className="text-text-primary">{bizName || "-"}</span>
              </div>

              <div className="py-1">
                <span className="block">Bank</span>
                <span className="text-text-primary">{bizBankName || "-"}</span>
              </div>

              <div className="py-1">
                <span className="block">
                  {t("invoiceDetail.bankAccountNumber")}
                </span>
                <span className="text-text-primary">
                  {bankAccountNumber || "-"}
                </span>
              </div>

              <div className="py-1">
                <span className="block">
                  {t("invoiceDetail.bankAccountName")}
                </span>
                <span className="text-text-primary">
                  {bankAccountName || "-"}
                </span>
              </div>
            </div>

            {/* RIGHT: Nominal */}

            <div className="w-full py-4">
              <div className="flex justify-between py-2 text-sm text-text-secondary">
                <span>Subtotal</span>
                <span>
                  {formatCurrency(invoice.subtotal, invoice.currency)}
                </span>
              </div>
              {invoice.payment_type === "dp" &&
                invoice.status === "partially_paid" &&
                invoice.amount_remaining > 0 && (
                  <div className="flex justify-between py-2 text-sm text-text-secondary">
                    <span>{t("invoiceDetail.downPayment")}</span>
                    <span>
                      {formatCurrency(invoice.amount_paid, invoice.currency)}
                    </span>
                  </div>
                )}
              {invoice.payment_type === "dp" &&
                invoice.status === "paid" &&
                invoice.amount_remaining > 0 && (
                  <div className="flex justify-between py-2 text-sm text-text-secondary">
                    <span>{t("invoices.outstanding.remainingBill")}</span>
                    <span>
                      {formatCurrency(
                        invoice.amount_remaining,
                        invoice.currency,
                      )}
                    </span>
                  </div>
                )}
              <div className="flex justify-between py-2 text-sm text-text-secondary">
                <span>{t("invoiceDetail.tax")}</span>
                <span>{formatCurrency(invoice.tax, invoice.currency)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between py-2 text-sm text-text-secondary">
                  <span>{t("invoiceDetail.discount")}</span>
                  <span className="text-success">
                    -{formatCurrency(invoice.discount, invoice.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 text-sm text-text-secondary text-xl font-extrabold text-text-primary pt-3 mt-2 border-t-[2px] border-red-500">
                <span>{t("invoiceDetail.grandTotal")}</span>
                <span>{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
              {invoice.payment_type === "dp" && paymentLink && (
                <div className="mt-8 flex justify-end max-sm:justify-center max-sm:w-full">
                  <a
                    href={paymentLink.url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg flex items-center justify-center transition-colors print:!bg-red-600 print:!text-white print:!py-3 print:!px-8"
                    style={{
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}
                  >
                    {t("invoiceDetail.payNow")}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="text-center pt-6 mt-6 border-t border-border-light text-[13px] text-text-secondary">
            <p>{t("invoiceDetail.thanks")}</p>
            <p className="text-[11px] text-text-tertiary mt-1">
              Powered by InvoiceQu
            </p>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="flex flex-col gap-4 sticky top-[calc(var(--header-height)+24px)] max-lg:relative max-lg:top-0 print-hidden">
          <div className="card">
            <h3 className="text-[15px] font-bold mb-3.5 flex items-center gap-2">
              <FlashIcon /> {t("invoiceDetail.actions")}
            </h3>
            <div className="flex flex-col gap-2">
              {invoice.status === "draft" && (
                <>
                  <button
                    className="btn btn-primary w-full"
                    onClick={handleSend}
                  >
                    <Download02Icon /> {t("invoiceDetail.sendToClient")}
                  </button>
                  <Link
                    href={`/invoices/${invoice.id}/edit`}
                    className="btn btn-secondary w-full text-center"
                  >
                    <Edit02Icon /> {t("invoiceDetail.editInvoice")}
                  </Link>
                </>
              )}
              <button
                className="btn btn-secondary w-full"
                onClick={() =>
                  invoiceApi.downloadPdf(invoice.id, invoice.number + ".pdf")
                }
              >
                <Download02Icon /> {t("invoiceDetail.downloadPdf")}
              </button>
              <button
                className="btn btn-ghost w-full text-danger hover:text-red-600"
                onClick={confirmDelete}
              >
                <Delete02Icon /> {t("invoices.deleteTitle")}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-[15px] font-bold mb-3.5 flex items-center gap-2">
              <ChartIcon /> {t("invoiceDetail.paymentInfo")}
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">
                  {t("dashboard.status")}
                </span>
                <span className={`badge ${getStatusColor(invoice.status)}`}>
                  {invoice.status === "partially_paid"
                    ? t("status.dpPaid")
                    : t(
                        invoiceStatusLabelKeys[invoice.status] ??
                          "status.unknown",
                      )}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">
                  {t("invoiceDetail.type")}
                </span>
                <span className="font-semibold">
                  {invoice.payment_type === "dp"
                    ? `Down Payment (${invoice.dp_percentage}%)`
                    : t("invoiceDetail.fullPayment")}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">Total</span>
                <span className="font-bold">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>

              {invoice.payment_type === "dp" && (
                <>
                  <div className="my-2.5 p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/15">
                    <div className="flex justify-between items-center text-[13px] mb-1">
                <span className="text-xs text-amber-600">
                  {t("invoiceDetail.dpAmount")}
                </span>
                      <span className="font-bold text-amber-600">
                        {formatCurrency(invoice.dp_amount, invoice.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[13px] mb-1">
                      <span className="text-xs text-success">
                        {t("invoices.paid")}
                      </span>
                      <span className="font-bold text-success">
                        {formatCurrency(invoice.amount_paid, invoice.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-xs">
                        {t("invoices.outstanding.remainingPayment")}
                      </span>
                      <span
                        className={`font-bold ${invoice.amount_remaining > 0 ? "text-danger" : "text-success"}`}
                      >
                        {formatCurrency(
                          invoice.amount_remaining,
                          invoice.currency,
                        )}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 bg-black/10 rounded-[3px] overflow-hidden">
                      <div
                        className="h-full rounded-[3px] transition-[width] duration-300 bg-gradient-to-r from-amber-600 to-amber-500"
                        style={{
                          width: `${invoice.total > 0 ? Math.round((invoice.amount_paid / invoice.total) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">
                  {t("invoiceDetail.created")}
                </span>
                <span>{formatDate(invoice.created_at)}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">
                  {t("invoiceDetail.dueDate")}
                </span>
                <span>
                  {invoice.due_date ? formatDate(invoice.due_date) : "-"}
                </span>
              </div>
              {invoice.paid_at && (
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-text-tertiary font-medium">
                    {t("invoiceDetail.paid")}
                  </span>
                  <span className="text-success">
                    {formatDate(invoice.paid_at)}
                  </span>
                </div>
              )}
              {invoice.payment_link && (
                <div className="mt-2">
                  <a
                    href={invoice.payment_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center p-2 bg-red-600/10 rounded-md text-red-600 font-semibold text-xs no-underline hover:bg-red-600/20 transition-colors"
                  >
                    🔗{" "}
                    {invoice.payment_type === "dp" &&
                    invoice.status !== "partially_paid"
                      ? t("invoiceDetail.paymentLinkDp")
                      : t("invoiceDetail.paymentLink")}
                  </a>
                </div>
              )}
              {invoice.remaining_payment_link && (
                <div className="mt-1">
                  <a
                    href={invoice.remaining_payment_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center p-2 bg-green-600/10 rounded-md text-green-700 font-semibold text-xs no-underline hover:bg-green-600/20 transition-colors"
                  >
                    {t("invoiceDetail.finalPaymentLink")}
                  </a>
                </div>
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
                    {t("invoiceDetail.invoiceCreated")}
                  </div>
                  <div className="text-[11px] text-text-tertiary ml-0.5">
                    {formatDate(invoice.created_at)}
                  </div>
                </div>
              </div>
              {invoice.status !== "draft" && (
                <div className="flex gap-3 items-start relative">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 absolute -left-[21px] bg-warning" />
                  <div>
                    <div className="text-[13px] font-semibold ml-0.5">
                      {t("invoiceDetail.invoiceSent")}
                    </div>
                    <div className="text-[11px] text-text-tertiary ml-0.5">
                      {formatDate(invoice.created_at)}
                    </div>
                  </div>
                </div>
              )}
              {invoice.paid_at && (
                <div className="flex gap-3 items-start relative">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 absolute -left-[21px] bg-success" />
                  <div>
                    <div className="text-[13px] font-semibold ml-0.5">
                      {t("invoiceDetail.paymentReceived")}
                    </div>
                    <div className="text-[11px] text-text-tertiary ml-0.5">
                      {formatDate(invoice.paid_at)}
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
