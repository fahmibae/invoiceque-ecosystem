'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { subscriptionApi, invoiceApi, clientApi, paymentLinkApi, type UsageData } from '@/lib/api';
import { Chart01Icon, GoogleDocIcon, UserGroup02Icon, Payment01Icon, ArrowRight02Icon } from 'hugeicons-react';

function UsageBar({ label, icon, used, limit }: { label: string; icon: React.ReactNode; used: number; limit: number; }) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 10 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  
  let barColorClass = "bg-gradient-to-br from-red-600 to-red-500";
  if (percentage >= 90) barColorClass = "bg-red-500";
  else if (percentage >= 70) barColorClass = "bg-amber-500";

  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-semibold flex items-center gap-1.5">{icon} {label}</span>
        <span className="text-xs text-text-secondary">
          {used} / {isUnlimited ? '∞' : limit}
        </span>
      </div>
      <div className="w-full h-1.5 bg-bg-secondary rounded-[3px] overflow-hidden mb-3.5 last:mb-0">
        <div className={`h-full rounded-[3px] transition-[width] duration-500 ease-in-out ${barColorClass}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default function UsageIndicator() {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    async function fetchUsage() {
      try {
        // Fetch limits from subscription service and real counts from each service in parallel
        const [subscriptionUsage, invoicesRes, clientsRes, paymentsRes] = await Promise.all([
          subscriptionApi.getUsage().catch(() => null),
          invoiceApi.list(undefined, 0, 1).catch(() => null),
          clientApi.list(undefined, 1, 1).catch(() => null),
          paymentLinkApi.list(1, 1).catch(() => null),
        ]);

        // Use real counts from API responses (total field), fall back to subscription counters
        const invoicesUsed = invoicesRes?.total ?? subscriptionUsage?.invoices_used ?? 0;
        const clientsUsed = clientsRes?.total ?? subscriptionUsage?.clients_used ?? 0;
        const paymentLinksUsed = paymentsRes?.total ?? subscriptionUsage?.payment_links_used ?? 0;

        // Use limits from subscription service, or defaults for Free plan
        const invoicesLimit = subscriptionUsage?.invoices_limit ?? 5;
        const clientsLimit = subscriptionUsage?.clients_limit ?? 10;
        const paymentLinksLimit = subscriptionUsage?.payment_links_limit ?? 5;

        setUsage({
          invoices_used: invoicesUsed,
          invoices_limit: invoicesLimit,
          clients_used: clientsUsed,
          clients_limit: clientsLimit,
          payment_links_used: paymentLinksUsed,
          payment_links_limit: paymentLinksLimit,
          can_create_invoice: invoicesLimit === -1 || invoicesUsed < invoicesLimit,
          can_create_client: clientsLimit === -1 || clientsUsed < clientsLimit,
          can_create_payment: paymentLinksLimit === -1 || paymentLinksUsed < paymentLinksLimit,
        });
      } catch {
        // Fallback: show zeros with default free plan limits
        setUsage({
          invoices_used: 0, invoices_limit: 5,
          clients_used: 0, clients_limit: 10,
          payment_links_used: 0, payment_links_limit: 5,
          can_create_invoice: true, can_create_client: true, can_create_payment: true,
        });
      }
    }
    fetchUsage();
  }, []);

  if (!usage) return null;

  const isLimitReached = 
    (usage.invoices_limit !== -1 && usage.invoices_used >= usage.invoices_limit) ||
    (usage.clients_limit !== -1 && usage.clients_used >= usage.clients_limit) ||
    (usage.payment_links_limit !== -1 && usage.payment_links_used >= usage.payment_links_limit);

  return (
    <div className="bg-bg-card border border-border-color rounded-lg p-5 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold flex items-center gap-2 m-0"><Chart01Icon/> Penggunaan</h3>
        <Link href="/subscription" className="text-xs text-red-500 font-semibold no-underline hover:underline">
          Upgrade →
        </Link>
      </div>
      <div className="flex-1">
        <UsageBar label="Invoice" icon={<GoogleDocIcon/>} used={usage.invoices_used} limit={usage.invoices_limit} />
        <UsageBar label="Klien" icon={<UserGroup02Icon/>} used={usage.clients_used} limit={usage.clients_limit} />
        <UsageBar label="Payment Link" icon={<Payment01Icon/>} used={usage.payment_links_used} limit={usage.payment_links_limit} />
      </div>

      {isLimitReached && (
        <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-red-600 via-red-500 to-orange-500 text-white relative overflow-hidden shadow-[0_8px_30px_rgba(220,38,38,0.3)] animate-fade-in group">
          {/* Animated background elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-700 ease-out"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-300/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-full h-full bg-gradient-to-t from-black/20 to-transparent -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-3 shadow-inner ring-1 ring-white/30 group-hover:-translate-y-1 transition-transform duration-300">
              <span className="text-2xl drop-shadow-md">🚀</span>
            </div>
            <h4 className="text-base font-extrabold mb-2 tracking-wide text-white drop-shadow-md">
              Limit Penggunaan Tercapai
            </h4>
            <p className="text-[13px] text-white/95 mb-5 leading-relaxed max-w-[250px] drop-shadow-sm font-medium">
              Kapasitas plan Anda sudah penuh. Tingkatkan plan Anda untuk menikmati fitur premium dan akses tanpa batas!
            </p>
            <Link href="/subscription" className="w-full flex items-center gap-2 relative overflow-hidden group/btn bg-white text-red-600 text-[13px] font-extrabold py-3 px-4 rounded-lg shadow-[0_4px_15px_rgba(255,255,255,0.25)] hover:shadow-[0_6px_20px_rgba(255,255,255,0.4)] transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2">
              <span className="relative z-10 flex items-center gap-1.5">
                Upgrade Plan Sekarang 
                <span className="group-hover/btn:translate-x-1 transition-transform duration-300"><ArrowRight02Icon/></span>
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
