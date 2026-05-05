'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  detectPaymentLocale,
  getPaymentTranslations,
  supportedLocales,
  type PaymentLocale,
  type PaymentTranslations,
} from '@/lib/payment-i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export default function PayPalCancelPage() {
  const params = useParams();

  // i18n
  const [locale, setLocale] = useState<PaymentLocale>('en');
  const [t, setT] = useState<PaymentTranslations>(getPaymentTranslations('en'));
  const [showLangMenu, setShowLangMenu] = useState(false);

  useEffect(() => {
    // Detect locale from payment data currency
    const detect = async () => {
      try {
        const res = await fetch(`${API_BASE}/pay/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          const detected = detectPaymentLocale(data.currency);
          setLocale(detected);
          setT(getPaymentTranslations(detected));
        }
      } catch {
        // Use default
        const detected = detectPaymentLocale();
        setLocale(detected);
        setT(getPaymentTranslations(detected));
      }
    };
    detect();
  }, [params.id]);

  const switchLocale = (newLocale: PaymentLocale) => {
    setLocale(newLocale);
    setT(getPaymentTranslations(newLocale));
    setShowLangMenu(false);
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLocale);
    window.history.replaceState({}, '', url.toString());
  };

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
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-amber-400" />

          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-7">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-500 rounded-sm flex items-center justify-center font-extrabold text-[15px] text-white">IQ</div>
            <span className="text-lg font-extrabold bg-gradient-to-br from-red-600 to-red-500 bg-clip-text text-transparent">InvoiceQu</span>
          </div>

          {/* Cancel Icon */}
          <div className="mb-4">
            <div className="w-20 h-20 mx-auto bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold mb-2 text-amber-600">{t.paymentCancelled}</h1>
          <p className="text-sm text-text-secondary mt-2">
            {t.paymentCancelledNotice}
          </p>

          <button
            className="mt-6 px-8 py-3 bg-gradient-to-br from-red-600 to-red-500 text-white font-bold rounded-lg text-sm hover:shadow-lg transition-all duration-150 cursor-pointer"
            onClick={() => {
              window.location.href = `/pay/${params.id}`;
            }}
          >
            {t.backToPaymentPage}
          </button>

          {/* Footer */}
          <div className="text-center text-xs text-text-tertiary pt-6 mt-6 border-t border-border-light">
            <span>Powered by <strong>InvoiceQu</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
