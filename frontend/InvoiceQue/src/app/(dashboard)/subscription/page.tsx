'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { subscriptionApi, type SubscriptionPlan, type Subscription } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CheckmarkBadge01Icon,
  GoogleDocIcon,
  UserGroupIcon,
  Link04Icon,
  ArrowRight01Icon,
  CreditCardIcon,
  Loading03Icon,
  Cancel01Icon,
  Tick02Icon,
  InformationCircleIcon,
  SparklesIcon, KidIcon, InLoveIcon, StarFaceIcon,
  Chat01Icon
} from 'hugeicons-react';
import Portal from '@/components/ui/Portal';

const featureLabels: Record<string, string> = {
  basic_invoicing: 'Invoicing Dasar',
  email_notifications: 'Notifikasi Email',
  custom_branding: 'Custom Branding',
  priority_support: 'Prioritas Support',
  xendit_integration: 'Integrasi Xendit',
  api_access: 'API Access',
  dedicated_support: 'Dedicated Support',
  sla: 'SLA Agreement',
};

type CheckoutState = 'idle' | 'loading' | 'redirecting' | 'polling' | 'success' | 'failed';

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [current, setCurrent] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('idle');
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [upgradedPlanName, setUpgradedPlanName] = useState('');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    loadData();
  }, []);

  // Handle redirect-back from Xendit
  useEffect(() => {
    const status = searchParams.get('status');
    const planName = searchParams.get('plan');
    if (status === 'success') {
      setUpgradedPlanName(planName || '');
      setShowSuccessModal(true);
      loadData(); // Refresh subscription data
      // Clean URL
      window.history.replaceState({}, '', '/subscription');
    } else if (status === 'failed') {
      setShowFailedModal(true);
      window.history.replaceState({}, '', '/subscription');
    }
  }, [searchParams]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, currentRes] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getCurrent().catch(() => null),
      ]);
      setPlans(plansRes.data || []);
      setCurrent(currentRes);
    } catch {
      // Use default plans if API not available
      setPlans([
        { id: 'plan_free', name: 'free', display_name: 'Free', price: 0, currency: 'IDR', billing_period: 'monthly', max_invoices: 5, max_clients: 10, max_payment_links: 5, features: '["basic_invoicing","email_notifications"]', is_active: true },
        { id: 'plan_pro', name: 'pro', display_name: 'Pro', price: 99000, currency: 'IDR', billing_period: 'monthly', max_invoices: 100, max_clients: 500, max_payment_links: 100, features: '["basic_invoicing","email_notifications","custom_branding","priority_support","xendit_integration"]', is_active: true },
        { id: 'plan_enterprise', name: 'enterprise', display_name: 'Enterprise', price: 299000, currency: 'IDR', billing_period: 'monthly', max_invoices: -1, max_clients: -1, max_payment_links: -1, features: '["basic_invoicing","email_notifications","custom_branding","priority_support","xendit_integration","api_access","dedicated_support","sla"]', is_active: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = useCallback((externalId: string, planId: string) => {
    setCheckoutState('polling');
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes (every 5 seconds)

    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setCheckoutState('idle');
        setCheckoutPlanId(null);
        return;
      }

      try {
        const status = await subscriptionApi.checkoutStatus(externalId);
        if (status.status === 'paid') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setCheckoutState('success');
          const plan = plans.find(p => p.id === planId);
          setUpgradedPlanName(plan?.display_name || '');
          setShowSuccessModal(true);
          await loadData();
          setTimeout(() => {
            setCheckoutState('idle');
            setCheckoutPlanId(null);
          }, 2000);
        } else if (status.status === 'expired' || status.status === 'failed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setCheckoutState('failed');
          setShowFailedModal(true);
          setTimeout(() => {
            setCheckoutState('idle');
            setCheckoutPlanId(null);
          }, 2000);
        }
      } catch {
        // Continue polling
      }
    }, 5000);
  }, [plans]);

  const handleCheckout = async (plan: SubscriptionPlan) => {
    // Enterprise plan — show contact modal
    if (plan.name.toLowerCase() === 'enterprise' || plan.id === 'plan_enterprise' || plan.display_name.toLowerCase() === 'enterprise') {
      setShowEnterpriseModal(true);
      return;
    }

    // Free plan — subscribe directly
    if (plan.price <= 0) {
      setCheckoutPlanId(plan.id);
      setCheckoutState('loading');
      try {
        await subscriptionApi.subscribe(plan.id);
        await loadData();
        setCheckoutState('idle');
        setCheckoutPlanId(null);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Gagal subscribe');
        setCheckoutState('idle');
        setCheckoutPlanId(null);
      }
      return;
    }

    // Paid plan — create Xendit checkout
    setCheckoutPlanId(plan.id);
    setCheckoutState('loading');

    try {
      const result = await subscriptionApi.checkout(plan.id);

      if (result.checkout_url) {
        setCheckoutState('redirecting');
        // Start polling in background before redirect
        startPolling(result.external_id, plan.id);
        // Redirect to Xendit payment page
        window.open(result.checkout_url, '_blank');
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      setCheckoutState('idle');
      setCheckoutPlanId(null);
      const msg = err instanceof Error ? err.message : 'Gagal membuat checkout';
      if (msg.includes('Enterprise') || msg.includes('secara langsung')) {
        setShowEnterpriseModal(true);
      } else {
        alert(msg);
      }
    }
  };

  const parseFeatures = (features: string): string[] => {
    try { return JSON.parse(features); } catch { return []; }
  };

  const formatLimit = (limit: number) => (limit === -1 ? 'Unlimited' : `${limit}`);

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'free': return <div className="bg-green-100 w-auto h-auto dark:bg-green-900/50 p-1 rounded-full"><KidIcon className="text-green-500" size={60} /></div>;
      case 'pro': return <div className="bg-red-100 w-auto h-auto dark:bg-red-900/50 p-1 rounded-full"><InLoveIcon className="text-red-500" size={60} /></div>;
      case 'enterprise': return <div className="bg-orange-100 w-auto h-auto dark:bg-orange-900/50 p-1 rounded-full"><StarFaceIcon className="text-orange-500" size={60} /></div>;
      default: return <div className="bg-green-100 w-auto h-auto dark:bg-green-900/50 p-1 rounded-full"><KidIcon className="text-green-500" size={60} /></div>;
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in p-10 text-center text-text-secondary flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p>Memuat paket langganan...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Langganan</h1>
          <p className="page-subtitle">Pilih paket yang sesuai dengan kebutuhan bisnis Anda</p>
        </div>
      </div>

      {/* Current plan banner */}
      {current && (
        <div className="flex items-start gap-3.5 py-4 px-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200 dark:border-green-800 rounded-xl mb-7 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 text-xl">
            <CheckmarkBadge01Icon />
          </div>
          <div className="flex-1 min-w-0">
            <div className="sm:text-xs md:text-sm lg:text-md text-text-tertiary font-medium">Paket Saat Ini</div>
            <div className="sm:text-lg md:text-xl lg:text-2xl font-bold text-green-500">{current.plan?.display_name || 'Free'}</div>
            {current.plan?.name !== "free" && (
              <>
                <div className="sm:text-xs md:text-sm lg:text-md text-text-tertiary">Order :</div>
                <div className="sm:text-xs md:text-sm lg:text-md text-slate-600 dark:text-slate-400">{formatDate(current.current_period_start)}</div>
              </>
            )}
          </div>

          <div className="text-right">
            <div className="sm:text-xs md:text-sm lg:text-md text-text-tertiary">Tagihan</div>
            {current.plan?.price > 0 ?
              <div className="sm:text-lg md:text-xl lg:text-2xl font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(current.plan.price)}<span className="text-lg text-slate-600 dark:text-slate-400">/bulan</span>
              </div> : <div className="sm:text-lg md:text-xl lg:text-2xl font-semibold text-green-600 dark:text-green-400">
                Gratis
              </div>
            }
            {current.plan?.name !== "free" && (
              <>
                <div className="sm:text-xs md:text-sm lg:text-md text-text-tertiary">Kadaluwarsa :</div>
                <div className="sm:text-xs md:text-sm lg:text-md text-slate-600 dark:text-slate-400">{formatDate(current.current_period_end)}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = current?.plan_id === plan.id;
          const features = parseFeatures(plan.features);
          const isCheckingOut = checkoutPlanId === plan.id;
          const isDowngrade = current?.plan && plan.price < current.plan.price && current.plan.price > 0;

          return (
            <div
              key={plan.id}
              className={`bg-bg-card border-2 rounded-xl flex flex-col relative transition-all duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] overflow-hidden
                ${plan.name === 'pro' ? 'border-red-500' : 'border-border-color'} 
                ${isCurrentPlan ? '!border-green-500 ring-3 ring-green-500/15' : ''}
                ${!isCurrentPlan && plan.name !== 'pro' ? 'hover:border-red-300 hover:-translate-y-1' : ''}
                ${plan.name === 'pro' && !isCurrentPlan ? 'hover:-translate-y-1' : ''}`}
            >
              {/* Popular badge */}
              {plan.name === 'pro' && (
                <div className="bg-gradient-to-r from-red-600 to-rose-500 text-white py-2 px-4 text-center text-xs font-bold tracking-wide flex items-center justify-center gap-1.5">
                  <SparklesIcon size={14} /> PALING POPULER
                </div>
              )}

              {/* Current plan badge */}
              {isCurrentPlan && (
                <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white py-2 px-4 text-center text-xs font-bold tracking-wide flex items-center justify-center gap-1.5">
                  <Tick02Icon size={14} /> PAKET AKTIF ANDA
                </div>
              )}

              <div className="p-7 flex flex-col flex-1">
                {/* Plan header */}
                <div className="text-center pb-5 border-b border-border-light mb-5">
                  <div className="text-3xl mb-2 flex justify-center items-center">{getPlanIcon(plan.name)}</div>
                  <h3 className={`text-xl font-extrabold mb-2 ${isCurrentPlan ? 'text-green-600 dark:text-green-400' :
                    plan.name === 'pro' ? 'text-red-500' :
                      'text-text-primary dark:text-white'
                    }`}>
                    {plan.display_name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-[28px] font-extrabold ${plan.name === 'pro' ? 'text-red-500' : 'text-text-primary dark:text-white'
                      }`}>
                      {plan.name === 'enterprise' ? 'Custom' : plan.price === 0 ? 'Gratis' : formatCurrency(plan.price)}
                    </span>
                    {plan.price > 0 && plan.name !== 'enterprise' && <span className="text-sm text-text-tertiary">/bulan</span>}
                  </div>
                </div>

                {/* Resource limits */}
                <div className="flex flex-col gap-2.5 mb-5 p-4 bg-bg-secondary rounded-lg">
                  <div className="flex items-center gap-2.5 text-sm font-semibold">
                    <span className="text-red-400"><GoogleDocIcon size={18} /></span>
                    <span>{formatLimit(plan.max_invoices)} Invoice</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm font-semibold">
                    <span className="text-blue-400"><UserGroupIcon size={18} /></span>
                    <span>{formatLimit(plan.max_clients)} Klien</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm font-semibold">
                    <span className="text-purple-400"><Link04Icon size={18} /></span>
                    <span>{formatLimit(plan.max_payment_links)} Payment Link</span>
                  </div>
                </div>

                {/* Features list */}
                <div className="flex-1 flex flex-col gap-2 mb-6">
                  {features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-[13px]">
                      <span className="text-emerald-500 font-bold text-sm flex-shrink-0">✓</span>
                      <span>{featureLabels[f] || f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  className={`btn w-full !p-3.5 !font-bold !text-sm flex items-center justify-center gap-2 transition-all duration-200 ${isCurrentPlan
                    ? 'btn-secondary !cursor-default opacity-70'
                    : isDowngrade
                      ? 'btn-secondary'
                      : plan.name === 'pro'
                        ? 'btn-primary !bg-gradient-to-r !from-red-600 !to-rose-500 hover:!from-red-500 hover:!to-rose-400 !shadow-lg !shadow-red-500/20'
                        : plan.price === 0
                          ? 'btn-secondary'
                          : 'btn-primary'
                    }`}
                  disabled={isCurrentPlan || isCheckingOut}
                  onClick={() => handleCheckout(plan)}
                >
                  {isCheckingOut ? (
                    <>
                      <Loading03Icon size={18} className="animate-spin" />
                      {checkoutState === 'loading' && 'Memproses...'}
                      {checkoutState === 'redirecting' && 'Menunggu Pembayaran...'}
                      {checkoutState === 'polling' && 'Menunggu Konfirmasi...'}
                      {checkoutState === 'success' && 'Berhasil! ✓'}
                    </>
                  ) : isCurrentPlan ? (
                    <>
                      <Tick02Icon size={18} />
                      Paket Aktif
                    </>
                  ) : plan.name === 'free' ? (
                    'Mulai Gratis'
                  ) : plan.name === 'enterprise' ? (
                    <>
                      Hubungi Sales
                      <ArrowRight01Icon size={16} />
                    </>
                  ) : (
                    <>
                      <CreditCardIcon size={18} />
                      {isDowngrade ? 'Downgrade' : 'Upgrade Sekarang'}
                      <ArrowRight01Icon size={16} />
                    </>
                  )}
                </button>

                {/* Payment info */}
                {plan.price > 0 && !isCurrentPlan && plan.name !== 'enterprise' && (
                  <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-text-tertiary">
                    <InformationCircleIcon size={13} />
                    <span>Pembayaran via Xendit · QRIS, VA, E-Wallet</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-10 bg-bg-card border border-border-color rounded-xl p-7">
        <h2 className="text-lg font-bold mb-4">Pertanyaan Umum</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <h4 className="font-semibold text-sm mb-1">Bagaimana cara pembayarannya?</h4>
            <p className="text-xs text-text-tertiary leading-relaxed">
              Anda akan diarahkan ke halaman pembayaran Xendit yang mendukung QRIS, Transfer Bank (Virtual Account), E-Wallet (OVO, DANA, GoPay), dan Kartu Kredit/Debit.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Apakah saya bisa downgrade?</h4>
            <p className="text-xs text-text-tertiary leading-relaxed">
              Ya, Anda bisa beralih ke paket yang lebih rendah kapan saja. Perubahan akan berlaku segera setelah pembayaran.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Berapa lama waktu pembayaran?</h4>
            <p className="text-xs text-text-tertiary leading-relaxed">
              Invoice pembayaran berlaku selama 24 jam. Setelah pembayaran berhasil, paket Anda akan langsung diaktifkan secara otomatis.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Apakah ada kontrak jangka panjang?</h4>
            <p className="text-xs text-text-tertiary leading-relaxed">
              Tidak. Semua paket berbasis bulanan tanpa kontrak jangka panjang. Anda bebas mengubah atau membatalkan kapan saja.
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in" onClick={() => setShowSuccessModal(false)}>
            <div className="bg-bg-card rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-border-color" onClick={e => e.stopPropagation()}>
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                <Tick02Icon size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-extrabold mb-2 text-text-primary">Berhasil! 🎉</h3>
              <p className="text-text-secondary mb-2">
                Paket <span className="font-bold text-green-600 dark:text-green-400">{upgradedPlanName || 'Anda'}</span> telah berhasil diaktifkan.
              </p>
              <p className="text-sm text-text-tertiary mb-6">
                Selamat menikmati fitur premium InvoiceQu. Semua fitur sudah aktif dan siap digunakan.
              </p>
              <button
                className="btn btn-primary w-full !p-3.5 !font-bold"
                onClick={() => setShowSuccessModal(false)}
              >
                Mulai Gunakan
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* Failed Modal */}
      {showFailedModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in" onClick={() => setShowFailedModal(false)}>
            <div className="bg-bg-card rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-border-color" onClick={e => e.stopPropagation()}>
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                <Cancel01Icon size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-extrabold mb-2 text-text-primary">Pembayaran Gagal</h3>
              <p className="text-text-secondary mb-2">
                Pembayaran Anda tidak berhasil diproses atau telah kedaluwarsa.
              </p>
              <p className="text-sm text-text-tertiary mb-6">
                Silakan coba lagi. Jika masalah berlanjut, hubungi support kami.
              </p>
              <div className="flex gap-3">
                <button
                  className="btn btn-secondary flex-1 !p-3.5 !font-bold"
                  onClick={() => setShowFailedModal(false)}
                >
                  Tutup
                </button>
                <button
                  className="btn btn-primary flex-1 !p-3.5 !font-bold"
                  onClick={() => {
                    setShowFailedModal(false);
                  }}
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Enterprise Contact Modal */}
      {showEnterpriseModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in" onClick={() => setShowEnterpriseModal(false)}>
            <div className="bg-bg-card rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-border-color" onClick={e => e.stopPropagation()}>
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <StarFaceIcon size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-extrabold mb-2 text-text-primary">Paket Enterprise</h3>
              <p className="text-text-secondary mb-2">
                Paket Enterprise dirancang khusus untuk kebutuhan bisnis skala besar dengan fitur premium dan dukungan prioritas.
              </p>
              <p className="text-sm text-text-tertiary mb-6">
                Hubungi tim sales kami via WhatsApp untuk konsultasi gratis dan penawaran harga terbaik.
              </p>
              <div className="flex gap-3">
                <button
                  className="btn btn-secondary flex-1 !p-3.5 !font-bold"
                  onClick={() => setShowEnterpriseModal(false)}
                >
                  Tutup
                </button>
                <a
                  href="https://wa.me/6281321860243?text=Halo%20tim%20InvoiceQu%2C%20saya%20tertarik%20dengan%20paket%20Enterprise."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary flex items-center gap-2 !p-3.5 !font-bold !bg-gradient-to-r !from-green-600 !to-emerald-500 hover:!from-green-500 hover:!to-emerald-400 flex items-center justify-center gap-2 !no-underline"
                  onClick={() => setShowEnterpriseModal(false)}
                >
                  <Chat01Icon /> Hubungi Sales
                </a>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Polling overlay — shown when waiting for payment in new tab */}
      {(checkoutState === 'redirecting' || checkoutState === 'polling') && (
        <Portal>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9998] p-4">
            <div className="bg-bg-card rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-border-color">
              <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center animate-pulse shadow-lg shadow-blue-500/30">
                <CreditCardIcon size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-text-primary">Menunggu Pembayaran</h3>
              <p className="text-sm text-text-secondary mb-5">
                Halaman pembayaran Xendit telah dibuka di tab baru. Selesaikan pembayaran Anda di sana.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-text-tertiary mb-5">
                <Loading03Icon size={14} className="animate-spin" />
                <span>Menunggu konfirmasi pembayaran...</span>
              </div>
              <button
                className="btn btn-secondary w-full !p-3 !text-sm"
                onClick={() => {
                  if (pollingRef.current) clearInterval(pollingRef.current);
                  setCheckoutState('idle');
                  setCheckoutPlanId(null);
                }}
              >
                Batal Menunggu
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
