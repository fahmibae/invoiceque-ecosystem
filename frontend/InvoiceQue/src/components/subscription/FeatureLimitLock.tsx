'use client';

import Link from 'next/link';
import { ArrowLeft02Icon, ArrowRight02Icon, LockedIcon, Mail01Icon } from 'hugeicons-react';
import type { SubscriptionResource, UsageData } from '@/lib/api';
import { formatLimit, getPlanDisplayName, getResourceUsage, resourceCopy } from '@/lib/subscription-limits';

interface FeatureLimitLockProps {
  resource: SubscriptionResource;
  usage: UsageData | null;
  backHref: string;
  backLabel: string;
}

export default function FeatureLimitLock({ resource, usage, backHref, backLabel }: FeatureLimitLockProps) {
  const copy = resourceCopy[resource];
  const { used, limit } = getResourceUsage(usage, resource);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2">
            <Link href={backHref} className="btn btn-icon btn-transparent border-none hover:bg-transparent hover:-translate-x-1 transition">
              <ArrowLeft02Icon />
            </Link>
            <h1 className="page-title">{copy.action}</h1>
          </div>
          <p className="page-subtitle">Fitur ini terkunci karena limit plan sudah tercapai</p>
        </div>
      </div>

      <div className="mx-auto max-w-[680px] rounded-lg border border-red-500/30 bg-bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-red-600 text-white">
          <LockedIcon width={26} height={26} />
        </div>
        <h2 className="mb-2 text-xl font-extrabold">Limit {copy.label} sudah penuh</h2>
        <p className="mx-auto mb-5 max-w-[520px] text-sm leading-relaxed text-text-secondary">
          Plan {getPlanDisplayName(usage)} Anda menggunakan {used} dari {formatLimit(limit)} kuota {copy.label.toLowerCase()}. Upgrade plan untuk membuka kembali fitur ini.
        </p>

        <div className="mb-5 grid gap-2 rounded-md border border-border-light bg-bg-secondary p-3 text-left text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Penggunaan saat ini</span>
            <span className="font-bold text-red-600">{used}/{formatLimit(limit)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Plan aktif</span>
            <span className="font-bold">{getPlanDisplayName(usage)}</span>
          </div>
        </div>

        <div className="mb-6 flex items-start gap-2 rounded-md bg-blue-500/10 px-3 py-2.5 text-left text-[13px] text-blue-700 dark:text-blue-300">
          <Mail01Icon width={16} height={16} className="mt-0.5 shrink-0" />
          <span>Rekomendasi upgrade akan dikirim lewat email agar Anda bisa membandingkan plan yang lebih sesuai.</span>
        </div>

        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Link href={backHref} className="btn btn-secondary">
            {backLabel}
          </Link>
          <Link href="/subscription" className="btn btn-primary">
            Upgrade Plan <ArrowRight02Icon width={16} height={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
