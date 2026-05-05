'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  detectPaymentLocale,
  getPaymentTranslations,
  getIntlLocale,
  supportedLocales,
  type PaymentLocale,
  type PaymentTranslations,
} from '@/lib/payment-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

type PaymentStatus = 'processing' | 'success' | 'expired' | 'error';

interface PaymentInfo {
  title: string;
  amount: number;
  currency: string;
}

export default function XenditReturnPage() {
  const params = useParams();
  const [status, setStatus] = useState<PaymentStatus>('processing');
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const pollStarted = useRef(false);

  // i18n
  const [locale, setLocale] = useState<PaymentLocale>('en');
  const [t, setT] = useState<PaymentTranslations>(getPaymentTranslations('en'));
  const [showLangMenu, setShowLangMenu] = useState(false);

  const switchLocale = (newLocale: PaymentLocale) => {
    setLocale(newLocale);
    setT(getPaymentTranslations(newLocale));
    setShowLangMenu(false);
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLocale);
    window.history.replaceState({}, '', url.toString());
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat(getIntlLocale(locale, currency), {
      style: 'currency',
      currency: currency || 'IDR',
      minimumFractionDigits: currency === 'IDR' || currency === 'JPY' ? 0 : 2,
    }).format(amount);
  };

  useEffect(() => {
    if (pollStarted.current) return;
    pollStarted.current = true;

    // Fetch payment info for display
    const fetchInfo = async () => {
      try {
        const res = await fetch(`${API_BASE}/pay/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setPaymentInfo({
            title: data.title || 'Payment',
            amount: data.amount || 0,
            currency: data.currency || 'IDR',
          });
          // Detect locale from currency
          const detected = detectPaymentLocale(data.currency);
          setLocale(detected);
          setT(getPaymentTranslations(detected));
        }
      } catch {
        // ignore
      }
    };

    // Poll the status endpoint which queries Xendit API directly
    const pollStatus = async () => {
      let attempts = 0;
      const maxAttempts = 15;

      const poll = async (): Promise<void> => {
        try {
          const res = await fetch(`${API_BASE}/pay-status/${params.id}`);
          if (res.ok) {
            const data = await res.json();

            if (data.status === 'completed') {
              setStatus('success');
              return;
            }
            if (data.status === 'expired') {
              setStatus('expired');
              return;
            }
          }

          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return poll();
          } else {
            // Xendit webhook should finalize — show success
            setStatus('success');
          }
        } catch {
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return poll();
          }
          setStatus('error');
        }
      };

      await poll();
    };

    fetchInfo();
    pollStatus();
  }, [params.id]);

  const LanguageSwitcher = () => (
    <div className="relative">
      <button
        onClick={() => setShowLangMenu(!showLangMenu)}
        className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-white/80 dark:bg-white/10 border border-border-color text-xs font-medium hover:bg-white dark:hover:bg-white/20 transition-all cursor-pointer shadow-sm"
      >
        <span>{supportedLocales.find(l => l.code === locale)?.flag}</span>
        <span>{supportedLocales.find(l => l.code === locale)?.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {showLangMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
          <div className="absolute top-full mt-1 right-0 bg-white dark:bg-[#1a1a1a] border border-border-color rounded-lg shadow-xl z-50 min-w-[160px] py-1">
            {supportedLocales.map((l) => (
              <button
                key={l.code}
                onClick={() => switchLocale(l.code)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-bg-secondary transition-colors cursor-pointer ${locale === l.code ? 'bg-red-50 dark:bg-red-900/10 text-red-600 font-semibold' : ''}`}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-6" dir={t.dir}>
      <div className="w-full max-w-[520px]">
        <div className="flex justify-end mb-3"><LanguageSwitcher /></div>
        <div className="bg-bg-card border border-border-color rounded-xl p-9 max-sm:p-6 shadow-xl text-center relative overflow-hidden">
          {/* Top gradient bar */}
          <div className={`absolute top-0 inset-x-0 h-1 ${status === 'success' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
            status === 'error' || status === 'expired' ? 'bg-gradient-to-r from-red-500 to-red-400' :
              'bg-gradient-to-r from-blue-500 to-blue-400'
            }`} />

          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-7">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-500 rounded-sm flex items-center justify-center font-extrabold text-[15px] text-white">IQ</div>
            <span className="text-lg font-extrabold bg-gradient-to-br from-red-600 to-red-500 bg-clip-text text-transparent">InvoiceQu</span>
          </div>

          {status === 'processing' && (
            <>
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto border-[3px] border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              </div>
              <h1 className="text-xl font-extrabold mb-2">{t.verifyingPayment}</h1>
              <p className="text-sm text-text-secondary">
                {t.verifyingYourPayment}
              </p>
              {paymentInfo && (
                <div className="mt-4 text-2xl font-black text-text-secondary">
                  {formatAmount(paymentInfo.amount, paymentInfo.currency)}
                </div>
              )}
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-4">
                <div className="w-20 h-20 mx-auto bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-extrabold mb-2 text-emerald-600">{t.paymentSuccessful}</h1>
              {paymentInfo && (
                <>
                  <p className="text-sm text-text-secondary mb-1">{paymentInfo.title}</p>
                  <div className="text-3xl font-black text-emerald-600 mt-3 mb-3">
                    {formatAmount(paymentInfo.amount, paymentInfo.currency)}
                  </div>
                </>
              )}
              <p className="text-sm text-text-secondary mt-2">
                {t.thankYouPaymentAccepted}
              </p>
              <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {t.emailConfirmationNotice}
                </p>
              </div>
            </>
          )}

          {status === 'expired' && (
            <>
              <div className="mb-4">
                <div className="w-20 h-20 mx-auto bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-extrabold mb-2 text-amber-600">{t.paymentExpired}</h1>
              <p className="text-sm text-text-secondary mt-2">
                {t.paymentExpiredNotice}
              </p>
              <button
                className="mt-6 px-8 py-3 bg-gradient-to-br from-red-600 to-red-500 text-white font-bold rounded-lg text-sm hover:shadow-lg transition-all duration-150 cursor-pointer"
                onClick={() => { window.location.href = `/pay/${params.id}`; }}
              >
                {t.backToPaymentPage}
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-4">
                <div className="w-20 h-20 mx-auto bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-extrabold mb-2 text-red-600">{t.errorOccurred}</h1>
              <p className="text-sm text-text-secondary mt-2">
                {t.cannotVerifyContactSeller}
              </p>
              <button
                className="mt-6 px-8 py-3 bg-gradient-to-br from-red-600 to-red-500 text-white font-bold rounded-lg text-sm hover:shadow-lg transition-all duration-150 cursor-pointer"
                onClick={() => { window.location.href = `/pay/${params.id}`; }}
              >
                {t.backToPaymentPage}
              </button>
            </>
          )}

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-2 text-xs text-text-tertiary mt-6 mb-4">
            <span>🔒</span>
            <span>{t.sslNotice}</span>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-text-tertiary pt-4 border-t border-border-light">
            <span>Powered by <strong>InvoiceQu</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
