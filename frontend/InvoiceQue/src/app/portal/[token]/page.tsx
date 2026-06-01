"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { portalApi, type PortalDashboard } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { ValidationApprovalIcon, LockedIcon } from "hugeicons-react";

const statusColors: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  sent: "bg-blue-100 text-blue-700",
  overdue: "bg-red-100 text-red-700",
  partially_paid: "bg-amber-100 text-amber-700",
  draft: "bg-slate-100 text-slate-600",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  converted: "bg-violet-100 text-violet-700",
};

const statusLabels: Record<string, string> = {
  paid: "Paid",
  sent: "Sent",
  overdue: "Overdue",
  partially_paid: "Partially Paid",
  draft: "Draft",
  accepted: "Accepted",
  rejected: "Rejected",
  converted: "Converted",
};

function formatPortalDate(date: string): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default function ClientPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<PortalDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"invoices" | "quotations">("invoices");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await portalApi.getPortal(token);
        setData(res);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Portal not found or expired",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading portal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-10 text-center max-w-md w-full border border-slate-200 dark:border-slate-700">
          <div className="text-5xl mb-4 text-red-600">
            <LockedIcon size={10} />
          </div>
          <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
            Portal Unavailable
          </h2>
          <p className="text-slate-500 text-sm">
            {error || "This portal link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const accent = data.client.accent_color || "#DC2626";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-card">
      {/* Header */}
      <header
        className="bg-bg-primary border-b-2 sticky top-0 z-10"
        style={{ borderColor: accent }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {data.client.business_logo ? (
              <Image
                src={data.client.business_logo}
                alt=""
                width={40}
                height={40}
                unoptimized
                className="h-10 w-10 rounded-lg object-contain"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                style={{ background: accent }}
              >
                {data.client.business_name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-bold" style={{ color: accent }}>
                {data.client.business_name || "Client Portal"}
              </h1>
              <p className="text-xs text-slate-500">
                Portal for {data.client.name}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
            Hello, {data.client.name}
          </h2>
          <p className="text-slate-500 text-sm">
            Here is your transaction summary
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-bg-card border rounded-xl p-5 shadow-sm border-border-color">
            <span className="text-xs text-slate-500 font-medium">
              Total Invoices
            </span>
            <p className="text-2xl font-extrabold mt-1 text-slate-900 dark:text-white">
              {data.stats.total_invoices}
            </p>
          </div>
          <div className="bg-bg-card border rounded-xl p-5 shadow-sm border-border-color">
            <span className="text-xs text-slate-500 font-medium">
              Total Paid
            </span>
            <p className="text-2xl font-extrabold mt-1 text-emerald-600">
              {formatCurrency(data.stats.total_paid)}
            </p>
          </div>
          <div className="bg-bg-card border rounded-xl p-5 shadow-sm border-border-color">
            <span className="text-xs text-slate-500 font-medium">
              Outstanding
            </span>
            <p className="text-2xl font-extrabold mt-1 text-red-600">
              {formatCurrency(data.stats.total_outstanding)}
            </p>
          </div>
          <div className="bg-bg-card border rounded-xl p-5 shadow-sm border-border-color">
            <span className="text-xs text-slate-500 font-medium">
              Quotation
            </span>
            <p className="text-2xl font-extrabold mt-1 text-slate-900 dark:text-white">
              {data.stats.total_quotations}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-bg-primary rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("invoices")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${tab === "invoices" ? "bg-red-600 shadow-sm text-white" : "text-slate-500 hover:text-slate-700"}`}
          >
            Invoice ({data.invoices.length})
          </button>
          <button
            onClick={() => setTab("quotations")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${tab === "quotations" ? "bg-red-600 shadow-sm text-white" : "text-slate-500 hover:text-slate-700"}`}
          >
            Quotation ({data.quotations.length})
          </button>
        </div>

        {/* Invoice List */}
        {tab === "invoices" && (
          <div className="space-y-3">
            {data.invoices.length === 0 ? (
              <div className="bg-bg-card rounded-xl p-10 text-center">
                <p className="text-slate-500">No invoices yet</p>
              </div>
            ) : (
              data.invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-bg-card rounded-xl p-5 shadow-sm hover:shadow-md transition-all border-border-color"
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="font-bold text-sm"
                          style={{ color: accent }}
                        >
                          {inv.invoice_number}
                        </span>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[inv.status] || "bg-slate-100 text-slate-600"}`}
                        >
                          {statusLabels[inv.status] || inv.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Issued: {formatPortalDate(inv.created_at)}</span>
                        {inv.due_date && (
                          <span>Due: {formatPortalDate(inv.due_date)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="font-bold text-lg dark:text-white"
                        style={{ color: accent }}
                      >
                        {formatCurrency(inv.total, inv.currency)}
                      </p>
                      {inv.status !== "paid" && inv.amount_remaining > 0 && (
                        <p className="text-xs dark:text-white text-black font-semibold">
                          Remaining:{" "}
                          {formatCurrency(inv.amount_remaining, inv.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                  {inv.payment_link && inv.status !== "paid" && (
                    <div
                      className="mt-3 pt-3 border-t"
                      style={{ borderColor: accent }}
                    >
                      <a
                        href={inv.payment_link}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                        style={{ background: accent }}
                      >
                        Pay Now
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Quotation List */}
        {tab === "quotations" && (
          <div className="space-y-3">
            {data.quotations.length === 0 ? (
              <div className="bg-bg-card rounded-xl p-10 text-center border border-border-color">
                <p className="text-slate-500">No quotations yet</p>
              </div>
            ) : (
              data.quotations.map((qt) => (
                <div
                  key={qt.id}
                  className="bg-bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-all border-border-color"
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="font-bold text-sm"
                          style={{ color: accent }}
                        >
                          {qt.quotation_number}
                        </span>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[qt.status] || "bg-slate-100 text-slate-600"}`}
                        >
                          {statusLabels[qt.status] || qt.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Issued: {formatPortalDate(qt.created_at)}</span>
                        {qt.valid_until && (
                          <span>
                            Valid until: {formatPortalDate(qt.valid_until)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p
                      className="font-bold text-lg dark:text-white shrink-0"
                      style={{ color: accent }}
                    >
                      {formatCurrency(qt.total, qt.currency)}
                    </p>
                  </div>
                  {qt.status === "sent" && qt.accept_token && (
                    <div
                      className="mt-3 pt-3 border-t justify-end"
                      style={{ borderColor: accent }}
                    >
                      <a
                        href={`/quotation/accept/${qt.accept_token}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 bg-emerald-400 hover:bg-emerald-500"
                      >
                        <ValidationApprovalIcon size={20} /> Accept Quotation
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 mt-12" style={{ borderColor: accent }}>
        <div className="max-w-5xl mx-auto px-6 py-6 text-center">
          <p className="text-xs text-slate-400">
            Powered by <span className="font-bold text-red-500">InvoiceQu</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
