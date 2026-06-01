"use client";

import React from "react";
import Link from "next/link";
import {
  LockedIcon,
  ArrowRight02Icon,
  SparklesIcon,
  Rocket01Icon,
} from "hugeicons-react";
import { useSubscriptionUsage } from "@/hooks/useSubscriptionUsage";
import type { PremiumFeature } from "@/lib/api";
import { PREMIUM_FEATURES, getPlanDisplayName } from "@/lib/subscription-limits";

interface PremiumGateProps {
  feature: PremiumFeature;
  children: React.ReactNode;
  /** Optional custom title for the locked screen */
  title?: string;
}

/**
 * Wraps a page/section behind a premium feature gate.
 * If the user's plan doesn't include the feature, a premium upgrade prompt is shown.
 * Otherwise, children are rendered normally.
 */
export default function PremiumGate({
  feature,
  children,
  title,
}: PremiumGateProps) {
  const { usage, loading, isFeatureLocked } = useSubscriptionUsage();

  // While loading, show nothing (prevents flash)
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  // Feature is unlocked — render children
  if (!isFeatureLocked(feature)) {
    return <>{children}</>;
  }

  // Feature is locked — show upgrade prompt
  const meta = PREMIUM_FEATURES[feature];
  const planName = getPlanDisplayName(usage);
  const displayTitle = title || meta.label;

  return (
    <div className="animate-fade-in flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        {/* Lock icon with animated glow */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 blur-xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-2xl shadow-red-500/30">
            <LockedIcon width={36} height={36} />
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-extrabold text-text-primary">
          {displayTitle}
        </h1>

        {/* Description */}
        <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed text-text-secondary">
          {meta.description}. Fitur ini tersedia di plan{" "}
          <span className="font-bold text-red-500">{meta.minPlan}</span> ke
          atas.
        </p>

        {/* Current plan badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-light bg-bg-secondary px-4 py-2 text-xs font-semibold text-text-secondary">
          <SparklesIcon width={14} height={14} />
          Plan aktif Anda:{" "}
          <span className="font-extrabold text-text-primary">{planName}</span>
        </div>

        {/* Feature highlights */}
        <div className="mx-auto mb-8 max-w-sm rounded-xl border border-border-light bg-bg-card p-5 text-left">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-text-primary">
            <Rocket01Icon width={14} height={14} className="text-red-500" />
            Upgrade ke {meta.minPlan} untuk:
          </h3>
          <ul className="space-y-2 text-[13px] text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">✓</span>
              Akses penuh ke {meta.label}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">✓</span>
              Invoice, klien, dan payment link lebih banyak
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">✓</span>
              Semua toolkit profesional tanpa batas
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-emerald-500">✓</span>
              Integrasi Xendit & PayPal
            </li>
          </ul>
        </div>

        {/* CTA */}
        <Link
          href="/subscription"
          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-8 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-red-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-red-500/30"
        >
          Upgrade Plan Sekarang
          <ArrowRight02Icon
            width={18}
            height={18}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>

        <p className="mt-5 text-xs text-text-tertiary text-center">
          Mulai dari Rp 99.000/bulan
        </p>
      </div>
    </div>
  );
}
