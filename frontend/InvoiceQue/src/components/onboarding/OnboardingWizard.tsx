"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { invoiceApi, clientApi, invoiceSettingsApi } from "@/lib/api";
import {
  Settings01Icon,
  UserGroup02Icon,
  GoogleDocIcon,
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
  Cancel01Icon,
} from "hugeicons-react";

type StepStatus = "pending" | "done" | "active";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  btnLabel: string;
  Icon: React.ElementType;
  gradient: string;
  checkFn: () => Promise<boolean>;
}

export default function OnboardingWizard() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  const steps: OnboardingStep[] = [
    {
      id: "settings",
      title: "Setup Profil Bisnis",
      description:
        "Tambahkan nama bisnis, logo, dan informasi kontak agar invoice terlihat profesional.",
      href: "/settings",
      btnLabel: "Setup Sekarang",
      Icon: Settings01Icon,
      gradient: "linear-gradient(135deg, #D97706, #FBBF24)",
      checkFn: async () => {
        try {
          const settings = await invoiceSettingsApi.get();
          return !!(
            settings?.business_name && settings.business_name.trim() !== ""
          );
        } catch {
          return false;
        }
      },
    },
    {
      id: "client",
      title: "Tambah Klien Pertama",
      description:
        "Daftarkan klien Anda agar bisa langsung buat invoice atau quotation.",
      href: "/clients/create",
      btnLabel: "Tambah Klien",
      Icon: UserGroup02Icon,
      gradient: "linear-gradient(135deg, #059669, #34D399)",
      checkFn: async () => {
        try {
          const res = await clientApi.list(undefined, 1, 1);
          return (res.total ?? 0) > 0;
        } catch {
          return false;
        }
      },
    },
    {
      id: "invoice",
      title: "Buat Invoice Pertama",
      description:
        "Buat dan kirim invoice digital pertama Anda dalam hitungan menit.",
      href: "/invoices/create",
      btnLabel: "Buat Invoice",
      Icon: GoogleDocIcon,
      gradient: "linear-gradient(135deg, #DC2626, #EF4444)",
      checkFn: async () => {
        try {
          const res = await invoiceApi.list(undefined, 0, 1);
          return (res.total ?? 0) > 0;
        } catch {
          return false;
        }
      },
    },
  ];

  useEffect(() => {
    // Don't show if user has already dismissed
    const wasDismissed = localStorage.getItem("iq_onboarding_dismissed");
    if (wasDismissed === "true") {
      setDismissed(true);
      setLoading(false);
      return;
    }

    async function checkSteps() {
      const statuses: Record<string, StepStatus> = {};
      let allDone = true;
      let foundFirstPending = false;

      for (const step of steps) {
        const done = await step.checkFn();
        if (done) {
          statuses[step.id] = "done";
        } else {
          allDone = false;
          if (!foundFirstPending) {
            statuses[step.id] = "active";
            foundFirstPending = true;
          } else {
            statuses[step.id] = "pending";
          }
        }
      }

      setStepStatuses(statuses);
      // Only show wizard if not all steps are done
      setVisible(!allDone);
      setLoading(false);
    }

    checkSteps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    localStorage.setItem("iq_onboarding_dismissed", "true");
  };

  if (loading || !visible || dismissed) return null;

  const completedCount = Object.values(stepStatuses).filter(
    (s) => s === "done",
  ).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="mb-6 animate-fade-in">
      <div className="bg-bg-card border border-border-color rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-light flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              🚀 Selamat datang di InvoiceQu!
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Selesaikan {steps.length - completedCount} langkah di bawah untuk
              mulai menagih pembayaran secara profesional.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-text-tertiary hover:text-text-secondary transition-colors shrink-0 p-1"
            title="Tutup panduan"
          >
            <Cancel01Icon width={18} height={18} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-bg-secondary/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-tertiary">
              Progress Setup
            </span>
            <span className="text-xs font-bold text-red-600">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="divide-y divide-border-light">
          {steps.map((step, idx) => {
            const status = stepStatuses[step.id] || "pending";
            const Icon = step.Icon;

            return (
              <div
                key={step.id}
                className={`px-6 py-4 flex items-center gap-4 transition-all duration-200 ${
                  status === "active" ? "bg-red-50/50 dark:bg-red-900/10" : ""
                } ${status === "pending" ? "opacity-50" : ""}`}
              >
                {/* Step Number / Check */}
                <div className="shrink-0">
                  {status === "done" ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <CheckmarkCircle02Icon
                        width={22}
                        height={22}
                        className="text-emerald-600"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{
                        background:
                          status === "active" ? step.gradient : "#9CA3AF",
                      }}
                    >
                      {idx + 1}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon
                      width={16}
                      height={16}
                      className={
                        status === "done"
                          ? "text-emerald-600"
                          : status === "active"
                            ? "text-red-600"
                            : "text-text-tertiary"
                      }
                    />
                    <h3
                      className={`text-sm font-semibold ${status === "done" ? "text-emerald-600 line-through" : "text-text-primary"}`}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                    {step.description}
                  </p>
                </div>

                {/* Action Button */}
                <div className="shrink-0">
                  {status === "done" ? (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-md">
                      ✓ Selesai
                    </span>
                  ) : status === "active" ? (
                    <Link
                      href={step.href}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                    >
                      {step.btnLabel}
                      <ArrowRight01Icon width={14} height={14} />
                    </Link>
                  ) : (
                    <span className="text-xs text-text-tertiary font-medium px-3 py-1.5">
                      Menunggu...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
