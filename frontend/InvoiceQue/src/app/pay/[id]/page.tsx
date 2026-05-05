'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { invoiceSettingsApi, type InvoiceSettingsData } from '@/lib/api';
import {
  detectPaymentLocale,
  getPaymentTranslations,
  getIntlLocale,
  supportedLocales,
  type PaymentLocale,
  type PaymentTranslations,
} from '@/lib/payment-i18n';

interface PaymentData {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  url: string;
  payment_provider?: string;
  provider_order_id?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export default function PublicPaymentPage() {
  const params = useParams();
  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [error, setError] = useState('');
  const [companyInitial, setCompanyInitial] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');

  // i18n state
  const [locale, setLocale] = useState<PaymentLocale>('en');
  const [t, setT] = useState<PaymentTranslations>(getPaymentTranslations('en'));
  const [showLangMenu, setShowLangMenu] = useState(false);

  const loadSettings = async () => {
    try {
      const s = await invoiceSettingsApi.get();
      setCompanyInitial(s.business_name?.substring(0, 2).toUpperCase() || '');
      setCompanyName(s.business_name || '');
      setCompanyLogo(s.logo_url || '');
      setCompanyEmail(s.business_email || '');
      setCompanyPhone(s.business_phone || '');
      setCompanyAddress(s.business_address || '');
    } catch {
      // Use defaults if API not available
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/pay/${params.id}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
          if (json.payment_provider === 'paypal') {
            setPaymentMethod('paypal');
          }
          // Detect locale from currency after data loads
          const detected = detectPaymentLocale(json.currency);
          setLocale(detected);
          setT(getPaymentTranslations(detected));
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const switchLocale = (newLocale: PaymentLocale) => {
    setLocale(newLocale);
    setT(getPaymentTranslations(newLocale));
    setShowLangMenu(false);
    // Update URL param without reload
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

  const title = data?.title || 'Payment';
  const description = data?.description || '';
  const amount = data?.amount || 0;
  const currency = data?.currency || 'IDR';
  const provider = data?.payment_provider || 'manual';
  const isRTL = t.dir === 'rtl';

  // PayPal checkout — creates order on-demand, then redirects
  const handlePayPalCheckout = async () => {
    setCheckingOut(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/pay-checkout/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();

      if (res.ok && json.approve_url) {
        // Redirect to PayPal
        window.location.href = json.approve_url;
      } else {
        setError(json.error || t.failedToProcess);
        setCheckingOut(false);
      }
    } catch {
      setError(t.connectionFailed);
      setCheckingOut(false);
    }
  };

  // Language switcher component
  const LanguageSwitcher = () => (
    <div className="relative">
      <button
        onClick={() => setShowLangMenu(!showLangMenu)}
        className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-white/80 dark:bg-white/10 border border-border-color text-xs font-medium hover:bg-white dark:hover:bg-white/20 transition-all cursor-pointer shadow-sm"
      >
        <span>{supportedLocales.find(l => l.code === locale)?.flag}</span>
        <span>{supportedLocales.find(l => l.code === locale)?.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {showLangMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
          <div className="absolute top-full mt-1 right-0 bg-white dark:bg-[#1a1a1a] border border-border-color rounded-lg shadow-xl z-50 min-w-[160px] py-1 animate-fade-in">
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

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-6">
        <div className="w-8 h-8 border-[3px] border-border-color border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (data?.status === 'completed') {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-6" dir={t.dir}>
        <div className="w-full max-w-[520px]">
          <div className="flex justify-end mb-3"><LanguageSwitcher /></div>
          <div className="bg-bg-card border border-border-color rounded-xl p-9 max-sm:p-6 shadow-xl text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-extrabold mb-2">{t.paymentCompleted}</h1>
            <p className="text-text-secondary">{t.thankYouPaymentReceived} <strong>{title}</strong> {locale === 'ar' ? '.' : locale === 'zh' || locale === 'ja' ? 'の支払い。' : locale === 'id' || locale === 'ms' ? 'telah diterima.' : 'has been received.'}</p>
            <div className="text-3xl font-black text-emerald-600 mt-4">{formatAmount(amount, currency)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4 sm:p-8 md:p-12 font-sans" dir={t.dir}>
      <div className="w-full max-w-3xl">
        {/* Language Switcher */}
        <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} mb-3`}>
          <LanguageSwitcher />
        </div>

        {/* Invoice Paper Card */}
        <div className="bg-white dark:bg-[#121212] border border-border-color rounded-sm shadow-2xl relative">

          {/* Top colored bar */}
          <div className="h-2 bg-gradient-to-r from-red-600 to-red-400 w-full absolute top-0 left-0 right-0"></div>

          <div className="p-6 sm:p-10 md:p-14 pt-10 sm:pt-14 md:pt-16">

            {/* Header Section */}
            <div className={`flex flex-col sm:flex-row justify-between items-start mb-12 gap-6`}>
              <div>
                <div className="flex items-start gap-3 mb-3">
                  {companyLogo ? (
                    <div className="w-12 h-12 flex items-start justify-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={companyLogo} alt="Logo" className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-500 rounded-sm flex items-center justify-center font-extrabold text-sm text-white shadow-md shadow-red-500/20">
                      {companyInitial || "IQ"}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-2xl font-extrabold text-text-primary tracking-tight">{companyName || "InvoiceQu"}</span>
                    <span className="text-sm font-medium text-text-tertiary tracking-tight">{companyEmail || ""}</span>
                    <span className="text-sm font-medium text-text-tertiary tracking-tight">{companyPhone || ""}</span>
                    <span className="text-sm font-medium text-text-tertiary tracking-tight">{companyAddress || ""}</span>
                  </div>
                </div>
              </div>
              <div className={`${isRTL ? 'text-right sm:text-left' : 'text-left sm:text-right'}`}>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-text-primary tracking-tighter uppercase mb-1">{t.invoice}</h1>
                <p className="text-text-secondary text-sm font-medium">{t.billSubtitle}</p>
                <div className="mt-3 inline-block py-1 px-3 rounded text-xs font-bold tracking-widest uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500 border border-amber-200 dark:border-amber-800/50">
                  {t.awaitingPayment}
                </div>
              </div>
            </div>

            {/* Bill To & Details Section */}
            <div className="flex flex-col sm:flex-row justify-between border-y border-border-light py-6 mb-8 gap-6">
              <div className="flex-1">
                <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2">{t.billTo}</h3>
                <p className="font-bold text-text-primary text-xl mb-1">{title}</p>
                {provider && provider !== 'manual' && (
                  <span className={`inline-block mt-1 py-0.5 px-2 rounded text-[11px] font-bold uppercase tracking-wider ${provider === 'paypal' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                    via {provider === 'paypal' ? 'PayPal' : 'Xendit'}
                  </span>
                )}
              </div>
              <div className={`${isRTL ? '' : 'sm:text-right'}`}>
                <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-2">{t.totalBill}</h3>
                <p className="text-3xl md:text-4xl font-black text-red-600 dark:text-red-500">{formatAmount(amount, currency)}</p>
              </div>
            </div>

            {/* Itemized Table Section */}
            <div className="mb-10">
              <div className={`hidden sm:grid grid-cols-12 gap-4 pb-3 border-b-2 border-border-color text-xs font-bold text-text-tertiary uppercase tracking-wider`}>
                <div className="col-span-8">{t.itemDescription}</div>
                <div className={`col-span-4 ${isRTL ? 'text-left' : 'text-right'}`}>{t.amount}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 py-5 border-b border-border-light">
                <div className="col-span-1 sm:col-span-8">
                  <p className="font-bold text-text-primary text-base sm:text-lg mb-1">{title}</p>
                  {description && <p className="text-sm text-text-secondary leading-relaxed">{description}</p>}
                </div>
                <div className={`col-span-1 sm:col-span-4 ${isRTL ? 'sm:text-left' : 'sm:text-right'} font-bold text-text-primary self-center text-lg`}>
                  {formatAmount(amount, currency)}
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} mb-12`}>
              <div className="w-full sm:w-1/2 md:w-5/12">
                <div className="flex justify-between py-2.5 border-b border-border-light text-sm">
                  <span className="text-text-secondary font-medium">{t.subtotal}</span>
                  <span className="font-semibold">{formatAmount(amount, currency)}</span>
                </div>
                <div className="flex justify-between py-4 border-b-2 border-border-color text-lg font-bold">
                  <span>{t.total}</span>
                  <span className="text-red-600 dark:text-red-500">{formatAmount(amount, currency)}</span>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-bg-secondary/50 rounded-xl p-6 sm:p-8 border-2 border-dashed border-border-color">
              <h3 className="text-lg font-extrabold text-center mb-6">{t.choosePaymentMethod}</h3>

              {/* Payment Method — Show based on provider */}
              {provider === 'paypal' ? (
                <div className="max-w-md mx-auto">
                  <div className="p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center mb-4">
                    <div className="mb-3 flex justify-center">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="#003087"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" /></svg>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2 font-medium">
                      {t.paypalRedirectNotice}
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 font-medium">
                      ⚠️ {error}
                    </div>
                  )}

                  {/* PayPal Pay Button */}
                  <button
                    className="w-full py-4 rounded-lg font-bold text-white text-[15px] transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md cursor-pointer disabled:cursor-wait"
                    style={{ background: 'linear-gradient(135deg, #003087, #009cde)' }}
                    onClick={handlePayPalCheckout}
                    disabled={checkingOut}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {checkingOut ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t.processing}
                        </>
                      ) : (
                        <>
                          {t.payWithPaypal} — {formatAmount(amount, currency)}
                        </>
                      )}
                    </span>
                  </button>
                </div>
              ) : provider === 'xendit' ? (
                <div className="max-w-md mx-auto">
                  <p className="text-center text-sm text-text-secondary mb-5">{t.xenditRedirectNotice}</p>

                  <button
                    onClick={() => { if (data?.url) window.location.href = data.url; }}
                    className="w-full py-4 rounded-lg font-bold text-white text-[15px] transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r from-emerald-600 to-emerald-500"
                  >
                    🔒 {t.payViaXendit} — {formatAmount(amount, currency)}
                  </button>
                </div>
              ) : (
                <div className="max-w-xl mx-auto">
                  {/* Local Payment Methods */}
                  <div className="mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <label className={`flex flex-col items-center justify-center gap-2 py-4 px-3 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:border-red-300 ${paymentMethod === 'transfer' ? 'border-red-500 bg-red-50 dark:bg-red-900/10 shadow-sm' : 'border-border-color bg-white dark:bg-bg-card'}`}>
                        <input type="radio" name="method" value="transfer" checked={paymentMethod === 'transfer'} onChange={(e) => setPaymentMethod(e.target.value)} className="hidden" />
                        <span className="text-2xl">🏦</span>
                        <span className="text-xs font-bold text-center">{t.transfer}</span>
                      </label>
                      <label className={`flex flex-col items-center justify-center gap-2 py-4 px-3 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:border-red-300 ${paymentMethod === 'ewallet' ? 'border-red-500 bg-red-50 dark:bg-red-900/10 shadow-sm' : 'border-border-color bg-white dark:bg-bg-card'}`}>
                        <input type="radio" name="method" value="ewallet" checked={paymentMethod === 'ewallet'} onChange={(e) => setPaymentMethod(e.target.value)} className="hidden" />
                        <span className="text-2xl">📱</span>
                        <span className="text-xs font-bold text-center">{t.eWallet}</span>
                      </label>
                      <label className={`flex flex-col items-center justify-center gap-2 py-4 px-3 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:border-red-300 ${paymentMethod === 'va' ? 'border-red-500 bg-red-50 dark:bg-red-900/10 shadow-sm' : 'border-border-color bg-white dark:bg-bg-card'}`}>
                        <input type="radio" name="method" value="va" checked={paymentMethod === 'va'} onChange={(e) => setPaymentMethod(e.target.value)} className="hidden" />
                        <span className="text-2xl">💳</span>
                        <span className="text-xs font-bold text-center">{t.virtualAccount}</span>
                      </label>
                      <label className={`flex flex-col items-center justify-center gap-2 py-4 px-3 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:border-red-300 ${paymentMethod === 'qris' ? 'border-red-500 bg-red-50 dark:bg-red-900/10 shadow-sm' : 'border-border-color bg-white dark:bg-bg-card'}`}>
                        <input type="radio" name="method" value="qris" checked={paymentMethod === 'qris'} onChange={(e) => setPaymentMethod(e.target.value)} className="hidden" />
                        <span className="text-2xl">📷</span>
                        <span className="text-xs font-bold text-center">{t.qris}</span>
                      </label>
                    </div>
                  </div>

                  {/* Payment Details */}
                  {paymentMethod === 'transfer' && (
                    <div className="mb-6">
                      <div className="p-5 bg-white dark:bg-bg-card border border-border-color rounded-xl flex flex-col gap-3 shadow-sm">
                        <h4 className="text-sm font-bold border-b border-border-light pb-2 mb-1">{t.bankTransferInstructions}</h4>
                        <div className="flex justify-between text-sm">
                          <span className="text-text-tertiary">{t.bank}</span>
                          <span className="font-bold">Bank Central Asia (BCA)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-text-tertiary">{t.accountNumber}</span>
                          <span className="font-bold tracking-wider">123 456 7890</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-text-tertiary">{t.accountName}</span>
                          <span className="font-bold">PT InvoiceQu Studio</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1 pt-3 border-t border-border-light">
                          <span className="text-text-tertiary font-medium">{t.totalTransfer}</span>
                          <span className="font-black text-red-600 dark:text-red-500">{formatAmount(amount, currency)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pay Button */}
                  <button
                    onClick={() => { if (data?.url) window.location.href = data.url; }}
                    className="w-full py-4 rounded-xl font-bold text-white text-[15px] bg-red-600 hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {t.confirmPayment}
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-border-light flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-text-tertiary font-medium bg-bg-secondary py-1.5 px-3 rounded-full">
                <span>🔒</span>
                <span>{t.sslNotice}</span>
              </div>
              <div className="text-[11px] text-text-tertiary mt-2">
                &copy; {new Date().getFullYear()} InvoiceQu. All rights reserved.
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
