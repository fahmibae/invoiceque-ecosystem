"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { paymentLinkApi, type PaymentLink } from "@/lib/api";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  Copy01Icon,
  Delete02Icon,
  ArrowLeft02Icon,
  Edit02Icon,
  FlashIcon,
  ChartIcon,
  Clock01Icon,
  Payment01Icon,
  ViewIcon,
  WhatsappIcon,
} from "hugeicons-react";
import { createPaymentWhatsAppUrl } from "@/lib/payment-share";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/app-i18n";

const paymentStatusLabelKeys: Record<string, TranslationKey> = {
  active: "status.active",
  completed: "status.completed",
  expired: "status.expired",
  inactive: "status.inactive",
};

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchLink() {
      try {
        const res = await paymentLinkApi.get(params.id as string);
        setLink(res);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("paymentDetail.notFound"),
        );
      } finally {
        setLoading(false);
      }
    }
    fetchLink();
  }, [params.id, t]);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!link) return;
    setIsDeleting(true);
    try {
      await paymentLinkApi.delete(link.id);
      router.push("/payments");
    } catch (err) {
      alert(err instanceof Error ? err.message : t("payments.deleteError"));
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading)
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary">
        {t("paymentDetail.loading")}
      </div>
    );

  if (error || !link) {
    return (
      <div className="animate-fade-in">
        <div className="card text-center py-16 px-5">
          <div className="text-5xl mb-4 opacity-50 flex justify-center">
            <Payment01Icon width={48} height={48} />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t("paymentDetail.notFound")}
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            {error || t("paymentDetail.notFoundSubtitle")}
          </p>
          <Link
            href="/payments"
            className="flex items-center gap-2 btn btn-primary"
          >
            <ArrowLeft02Icon /> {t("clients.back")}
          </Link>
        </div>
      </div>
    );
  }

  const convRate =
    link.clicks > 0 ? Math.round((link.payments / link.clicks) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <ConfirmModal
        isOpen={showDeleteModal}
        title={t("payments.deleteTitle")}
        message={t("paymentDetail.deleteMessage")}
        confirmText={t("clients.yesDelete")}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={isDeleting}
        type="danger"
      />

      <div className="flex items-start gap-3 mb-6">
        <Link
          href="/payments"
          className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition"
        >
          <ArrowLeft02Icon width={18} height={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1
            className="text-lg sm:text-xl font-bold text-text-primary truncate"
            title={link.title}
          >
            {link.title}
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {t("paymentDetail.subtitle")}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {link.status === "active" && (
            <Link
              href={`/payments/${link.id}/edit`}
              className="btn btn-primary flex items-center gap-2 text-sm"
            >
              <Edit02Icon width={16} height={16} />{" "}
              <span className="hidden sm:inline">{t("common.edit")}</span>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="flex flex-col gap-5">
          {/* Main Card */}
          <div className="card p-0 overflow-hidden">
            <div className="h-[4px] bg-gradient-to-r from-red-600 to-red-500" />
            <div className="p-8 max-sm:p-5">
              <div className="flex justify-between items-start mb-6 max-sm:flex-col max-sm:gap-4">
                <div className="flex items-start gap-4">
                  <div className="lg:w-[52px] lg:h-[52px] bg-transparent lg:bg-red-500/10 rounded-lg flex items-center justify-center">
                    <Payment01Icon
                      className="text-red-600"
                      width={28}
                      height={28}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-0.5">{link.title}</h2>
                    <span className={`badge ${getStatusColor(link.status)}`}>
                      {t(paymentStatusLabelKeys[link.status] ?? "status.unknown")}
                    </span>
                  </div>
                </div>
                <div className="text-right max-sm:text-left">
                  <div className="text-[28px] font-black bg-gradient-to-br from-red-600 to-red-500 bg-clip-text text-transparent">
                    {formatCurrency(link.amount, link.currency)}
                  </div>
                  <div className="text-xs text-text-tertiary mt-0.5">
                    {link.currency}
                  </div>
                </div>
              </div>

              {link.description && (
                <div className="p-4 bg-bg-secondary rounded-md border-l-[3px] border-red-500 mb-6">
                  <span className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">
                    {t("common.description")}:
                  </span>
                  <p className="text-[14px] text-text-secondary leading-relaxed">
                    {link.description}
                  </p>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
                  {t("invoiceDetail.paymentLink")}
                </label>
                <div className="flex items-center gap-2 px-4 py-3 bg-bg-secondary border border-border-light rounded-lg">
                  <span className="flex-1 text-sm text-text-secondary overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                    {link.url}
                  </span>
                  <button
                    className="px-3 py-1.5 flex items-center gap-1.5 rounded-md bg-bg-card border border-border-color text-xs font-medium transition-all duration-150 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                    onClick={() => handleCopy(link.url)}
                  >
                    <Copy01Icon width={14} height={14} />{" "}
                    {copied ? t("paymentDetail.copied") : t("paymentDetail.copy")}
                  </button>
                  <a
                    href={createPaymentWhatsAppUrl(link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 flex items-center gap-1.5 rounded-md bg-bg-card border border-border-color text-xs font-medium transition-all duration-150 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600"
                  >
                    <WhatsappIcon width={14} height={14} /> WhatsApp
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center gap-1 p-4 bg-bg-secondary rounded-lg">
                  <ViewIcon
                    className="text-text-tertiary mb-1"
                    width={20}
                    height={20}
                  />
                  <span className="text-xl font-bold">{link.clicks}</span>
                  <span className="text-[11px] text-text-tertiary font-medium">
                    {t("payments.totalClicks")}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 p-4 bg-bg-secondary rounded-lg">
                  <Payment01Icon
                    className="text-text-tertiary mb-1"
                    width={20}
                    height={20}
                  />
                  <span className="text-xl font-bold">{link.payments}</span>
                  <span className="text-[11px] text-text-tertiary font-medium">
                    {t("payments.payments")}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 p-4 bg-bg-secondary rounded-lg">
                  <ChartIcon
                    className="text-text-tertiary mb-1"
                    width={20}
                    height={20}
                  />
                  <span className="text-xl font-bold">{convRate}%</span>
                  <span className="text-[11px] text-text-tertiary font-medium">
                    {t("payments.conversion")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="card">
            <h3 className="flex items-center gap-2 text-[15px] font-bold mb-4">
              <ChartIcon /> {t("paymentDetail.revenue")}
            </h3>
            <div className="flex justify-between items-center p-4 bg-bg-secondary rounded-lg">
              <div>
                <div className="text-xs text-text-tertiary mb-1">
                  {t("paymentDetail.totalRevenue")}
                </div>
                <div className="text-2xl font-black bg-gradient-to-br from-red-600 to-red-500 bg-clip-text text-transparent">
                  {formatCurrency(link.amount * link.payments, link.currency)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-tertiary mb-1">
                  {t("paymentDetail.perTransaction")}
                </div>
                <div className="text-lg font-bold">
                  {formatCurrency(link.amount, link.currency)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 sticky top-[calc(var(--header-height)+24px)] max-lg:relative max-lg:top-0">
          <div className="card">
            <h3 className="text-[15px] font-bold mb-3.5 flex items-center gap-2">
              <FlashIcon /> {t("invoiceDetail.actions")}
            </h3>
            <div className="flex flex-col gap-2">
              <button
                className="btn btn-primary w-full"
                onClick={() => handleCopy(link.url)}
              >
                <Copy01Icon width={16} height={16} />{" "}
                {copied ? t("paymentDetail.copied") : t("paymentDetail.copyLink")}
              </button>
              <a
                href={createPaymentWhatsAppUrl(link)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary w-full text-center text-emerald-600 hover:text-emerald-700"
              >
                <WhatsappIcon width={16} height={16} />{" "}
                {t("paymentDetail.shareWhatsApp")}
              </a>
              {link.status === "active" && (
                <Link
                  href={`/payments/${link.id}/edit`}
                  className="btn btn-secondary w-full text-center"
                >
                  <Edit02Icon width={16} height={16} /> {t("common.edit")}
                </Link>
              )}
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary w-full text-center"
              >
                <ViewIcon width={16} height={16} /> {t("paymentDetail.openLink")}
              </a>
              <button
                className="btn btn-ghost w-full text-danger hover:text-red-600"
                onClick={() => setShowDeleteModal(true)}
              >
                <Delete02Icon width={16} height={16} /> {t("common.delete")}
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
                <span className={`badge ${getStatusColor(link.status)}`}>
                  {t(paymentStatusLabelKeys[link.status] ?? "status.unknown")}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">
                  {t("paymentDetail.amount")}
                </span>
                <span className="font-bold">
                  {formatCurrency(link.amount, link.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">
                  {t("common.currency")}
                </span>
                <span className="font-semibold">{link.currency}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">
                  {t("invoiceDetail.created")}
                </span>
                <span>{formatDate(link.created_at)}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-text-tertiary font-medium">
                  {t("paymentDetail.updated")}
                </span>
                <span>{formatDate(link.updated_at)}</span>
              </div>
              {link.expires_at && (
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-text-tertiary font-medium">
                    {t("paymentDetail.expires")}
                  </span>
                  <span>{formatDate(link.expires_at)}</span>
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
                    {t("paymentDetail.linkCreated")}
                  </div>
                  <div className="text-[11px] text-text-tertiary ml-0.5">
                    {formatDate(link.created_at)}
                  </div>
                </div>
              </div>
              {link.clicks > 0 && (
                <div className="flex gap-3 items-start relative">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 absolute -left-[21px] bg-warning" />
                  <div>
                    <div className="text-[13px] font-semibold ml-0.5">
                      {t("paymentDetail.clicksReceived", {
                        count: link.clicks,
                      })}
                    </div>
                    <div className="text-[11px] text-text-tertiary ml-0.5">
                      {t("paymentDetail.linkAccessed")}
                    </div>
                  </div>
                </div>
              )}
              {link.payments > 0 && (
                <div className="flex gap-3 items-start relative">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 absolute -left-[21px] bg-success" />
                  <div>
                    <div className="text-[13px] font-semibold ml-0.5">
                      {t("payments.payments")}: {link.payments}
                    </div>
                    <div className="text-[11px] text-text-tertiary ml-0.5">
                      Total:{" "}
                      {formatCurrency(
                        link.amount * link.payments,
                        link.currency,
                      )}
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
