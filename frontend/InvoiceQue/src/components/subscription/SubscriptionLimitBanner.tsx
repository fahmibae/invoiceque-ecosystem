'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Alert02Icon, ArrowRight02Icon, Cancel01Icon, LockedIcon, Mail01Icon } from 'hugeicons-react';
import Portal from '@/components/ui/Portal';
import { useSubscriptionUsage } from '@/hooks/useSubscriptionUsage';
import { formatLimit, getPlanDisplayName, getResourceUsage, resourceCopy } from '@/lib/subscription-limits';

export default function SubscriptionLimitBanner() {
  const { usage, lockedResources, hasLockedResources } = useSubscriptionUsage();
  const [dismissedModalKeys, setDismissedModalKeys] = useState<string[]>([]);

  const lockedSummary = useMemo(() => {
    if (!usage) return [];

    return lockedResources.map((resource) => {
      const { used, limit } = getResourceUsage(usage, resource);
      return `${resourceCopy[resource].label} ${used}/${formatLimit(limit)}`;
    });
  }, [usage, lockedResources]);

  const modalKey = usage && lockedResources.length > 0
    ? `invoicequ:limit-modal:${usage.plan_id || 'current'}:${lockedResources.join(',')}`
    : '';

  const showModal = Boolean(
    modalKey &&
    !dismissedModalKeys.includes(modalKey) &&
    (typeof window === 'undefined' || !window.sessionStorage.getItem(modalKey)),
  );

  const dismissModal = () => {
    if (!modalKey) return;
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(modalKey, 'dismissed');
    }
    setDismissedModalKeys((current) => current.includes(modalKey) ? current : [...current, modalKey]);
  };

  if (!usage || !hasLockedResources) return null;

  return (
    <>
      <div className="mb-6 overflow-hidden rounded-lg border border-red-500/30 bg-red-50 text-red-950 shadow-sm dark:bg-red-950/25 dark:text-red-50">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-600 text-white">
              <LockedIcon width={20} height={20} />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-extrabold">Limit plan {getPlanDisplayName(usage)} tercapai</h2>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-white/10 dark:text-red-100">
                  {lockedSummary.join(' · ')}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-red-800 dark:text-red-100/90">
                Fitur yang sudah mencapai batas akan terkunci. Kami juga mengirim email rekomendasi upgrade supaya Anda bisa memilih plan yang lebih pas.
              </p>
            </div>
          </div>
          <Link href="/subscription" className="btn btn-primary shrink-0">
            Upgrade Plan <ArrowRight02Icon width={16} height={16} />
          </Link>
        </div>
      </div>

      {showModal && (
        <Portal>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={dismissModal}>
            <div className="w-full max-w-[520px] rounded-lg border border-border-color bg-bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4 border-b border-border-light px-5 py-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-600 text-white">
                    <Alert02Icon width={20} height={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold">Fitur plan terkunci</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                      Beberapa fitur sudah mencapai limit plan aktif Anda.
                    </p>
                  </div>
                </div>
                <button className="btn btn-icon btn-transparent" onClick={dismissModal} aria-label="Tutup modal limit plan">
                  <Cancel01Icon width={18} height={18} />
                </button>
              </div>

              <div className="px-5 py-4">
                <div className="grid gap-2">
                  {lockedResources.map((resource) => {
                    const { used, limit } = getResourceUsage(usage, resource);
                    return (
                      <div key={resource} className="flex items-center justify-between rounded-md border border-border-light bg-bg-secondary px-3 py-2.5 text-sm">
                        <span className="font-semibold">{resourceCopy[resource].label}</span>
                        <span className="font-bold text-red-600">{used}/{formatLimit(limit)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-md bg-blue-500/10 px-3 py-2.5 text-[13px] text-blue-700 dark:text-blue-300">
                  <Mail01Icon width={16} height={16} className="mt-0.5 shrink-0" />
                  <span>Email rekomendasi upgrade dikirim lewat Resend maksimal sekali dalam 30 hari untuk limit yang sama.</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-border-light px-5 py-4 sm:flex-row sm:justify-end">
                <button className="btn btn-secondary" onClick={dismissModal}>Nanti</button>
                <Link href="/subscription" className="btn btn-primary" onClick={dismissModal}>
                  Lihat Plan Upgrade <ArrowRight02Icon width={16} height={16} />
                </Link>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
