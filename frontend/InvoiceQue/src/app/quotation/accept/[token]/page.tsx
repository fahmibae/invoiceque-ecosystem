"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { publicQuoteApi, type Quotation } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { CancelCircleIcon, CheckmarkBadge03Icon } from "hugeicons-react";

type PublicQuotation = Quotation & {
  accent_color?: string;
  business_name?: string;
  business_logo?: string;
};

function formatPublicDate(date: string): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default function AcceptQuotationPage() {
  const params = useParams();
  const token = params.token as string;
  const [quotation, setQuotation] = useState<PublicQuotation | null>(null);
  const [accentColor, setAccentColor] = useState("#DC2626");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionDone, setActionDone] = useState<"accepted" | "rejected" | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const qt = (await publicQuoteApi.get(token)) as PublicQuotation;
        setQuotation(qt);
        if (qt.accent_color) setAccentColor(qt.accent_color);
        if (qt.status === "accepted") setActionDone("accepted");
        if (qt.status === "rejected") setActionDone("rejected");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Quotation not found");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const updated = await publicQuoteApi.accept(token);
      setQuotation((prev) => ({
        ...updated,
        accent_color: prev?.accent_color,
      }));
      setActionDone("accepted");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to accept quotation",
      );
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const updated = await publicQuoteApi.reject(token);
      setQuotation((prev) => ({
        ...updated,
        accent_color: prev?.accent_color,
      }));
      setActionDone("rejected");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reject quotation",
      );
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading quotation...</p>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-10 text-center max-w-md w-full border border-slate-200 dark:border-slate-700">
          <div className="text-5xl mb-4">
            <CancelCircleIcon size={48} color="#ff0000" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
            Quotation Not Found
          </h2>
          <p className="text-slate-500 text-sm">
            {error || "This quotation link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-br from-red-600 to-red-500 p-6 text-white text-center">
          <h1 className="text-2xl font-black tracking-wider">QUOTATION</h1>
          <p className="text-red-100 text-sm mt-1">
            {quotation.quotation_number}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Client Info */}
          <div className="mb-5 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Prepared for
            </div>
            <div className="font-bold text-slate-900 dark:text-white">
              {quotation.client_name}
            </div>
            <div className="text-sm text-slate-500">
              {quotation.client_email}
            </div>
          </div>

          {/* Items */}
          <div className="mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-600">
                  <th className="py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    Item
                  </th>
                  <th className="py-2 text-center text-xs font-semibold text-slate-500 uppercase">
                    Qty
                  </th>
                  <th className="py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-100 dark:border-slate-700"
                  >
                    <td className="py-2.5 text-slate-900 dark:text-white">
                      {item.description}
                    </td>
                    <td className="py-2.5 text-center text-slate-500">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(item.total, quotation.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-slate-200 dark:border-slate-600 pt-4 mb-6">
            <div className="flex justify-between text-sm text-slate-500 py-1">
              <span>Subtotal</span>
              <span>
                {formatCurrency(quotation.subtotal, quotation.currency)}
              </span>
            </div>
            {quotation.tax > 0 && (
              <div className="flex justify-between text-sm text-slate-500 py-1">
                <span>Tax</span>
                <span>{formatCurrency(quotation.tax, quotation.currency)}</span>
              </div>
            )}
            {quotation.discount > 0 && (
              <div className="flex justify-between text-sm text-slate-500 py-1">
                <span>Discount</span>
                <span className="text-emerald-600">
                  -{formatCurrency(quotation.discount, quotation.currency)}
                </span>
              </div>
            )}
            <div
              className="flex justify-between text-xl font-extrabold pt-3 mt-2 border-t-2 border-red-500"
              style={{ color: accentColor }}
            >
              <span>Total</span>
              <span>{formatCurrency(quotation.total, quotation.currency)}</span>
            </div>
          </div>

          {quotation.valid_until && (
            <p className="text-xs text-slate-500 text-center mb-4">
              Valid until:{" "}
              <strong>{formatPublicDate(quotation.valid_until)}</strong>
            </p>
          )}

          {quotation.notes && (
            <div className="mb-5 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md text-sm text-slate-600 dark:text-slate-300">
              <strong>Notes:</strong> {quotation.notes}
            </div>
          )}

          {/* Action Buttons or Result */}
          {actionDone === "accepted" ? (
            <div className="text-center p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="text-5xl mb-2 flex justify-center text-emerald-600 dark:text-emerald-400">
                <CheckmarkBadge03Icon size={48} />
              </div>
              <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                Quotation Accepted
              </h3>
              <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
                Thank you. You have accepted this quotation.
              </p>
            </div>
          ) : actionDone === "rejected" ? (
            <div className="text-center p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <div className="text-4xl mb-2">
                <CancelCircleIcon size={48} color="white" />
              </div>
              <h3 className="text-lg font-bold text-red-700 dark:text-red-400">
                Quotation Rejected
              </h3>
              <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                You have rejected this quotation.
              </p>
            </div>
          ) : quotation.status === "sent" ? (
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-all disabled:opacity-50 text-sm"
              >
                {actionLoading ? (
                  "..."
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <CheckmarkBadge03Icon size={16} color="white" /> Accept
                    </div>
                  </>
                )}
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-50 text-sm"
              >
                {actionLoading ? (
                  "..."
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <CancelCircleIcon size={16} color="white" /> Reject
                    </div>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center p-4 bg-slate-100 dark:bg-slate-700 rounded-xl">
              <p className="text-sm text-slate-500">
                This quotation is <strong>{quotation.status}</strong> and can no
                longer be changed.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 text-center">
          <p className="text-xs text-slate-400">
            Powered by <span className="font-bold text-red-500">InvoiceQu</span>
          </p>
        </div>
      </div>
    </div>
  );
}
