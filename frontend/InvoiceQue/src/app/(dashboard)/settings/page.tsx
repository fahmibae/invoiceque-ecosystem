'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { subscriptionApi, invoiceSettingsApi, type SubscriptionPlan, type Subscription, type InvoiceSettingsData } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import XenditSetupCard from '@/components/XenditSetupCard';
import styles from './settings.module.css';

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

const colorPresets = ['#DC2626', '#2563EB', '#7C3AED', '#059669', '#D97706', '#DB2777', '#0891B2', '#4F46E5'];

type SettingsTab = 'general' | 'billing';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Business profile state
  const [bizName, setBizName] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizWebsite, setBizWebsite] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [accentColor, setAccentColor] = useState('#DC2626');
  const [footerText, setFooterText] = useState('Terima kasih atas kepercayaan Anda 🙏');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Subscription state
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [current, setCurrent] = useState<Subscription | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  // Load invoice settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'billing') loadSubscription();
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      const s = await invoiceSettingsApi.get();
      setBizName(s.business_name || '');
      setBizEmail(s.business_email || '');
      setBizPhone(s.business_phone || '');
      setBizWebsite(s.business_website || '');
      setBizAddress(s.business_address || '');
      setAccentColor(s.accent_color || '#DC2626');
      setFooterText(s.footer_text || 'Terima kasih atas kepercayaan Anda 🙏');
    } catch {
      // Use defaults if API not available
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg('');
    try {
      await invoiceSettingsApi.update({
        business_name: bizName,
        business_email: bizEmail,
        business_phone: bizPhone,
        business_website: bizWebsite,
        business_address: bizAddress,
        accent_color: accentColor,
        footer_text: footerText,
      });
      setProfileMsg('✅ Berhasil disimpan!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch {
      setProfileMsg('❌ Gagal menyimpan');
    } finally {
      setSavingProfile(false);
    }
  };

  const loadSubscription = async () => {
    setLoadingSub(true);
    try {
      const [plansRes, currentRes] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getCurrent().catch(() => null),
      ]);
      setPlans(plansRes.data || []);
      setCurrent(currentRes);
    } catch {
      setPlans([
        { id: 'plan_free', name: 'free', display_name: 'Free', price: 0, currency: 'IDR', billing_period: 'monthly', max_invoices: 5, max_clients: 10, max_payment_links: 5, features: '["basic_invoicing","email_notifications"]', is_active: true },
        { id: 'plan_pro', name: 'pro', display_name: 'Pro', price: 99000, currency: 'IDR', billing_period: 'monthly', max_invoices: 100, max_clients: 500, max_payment_links: 100, features: '["basic_invoicing","email_notifications","custom_branding","priority_support","xendit_integration"]', is_active: true },
        { id: 'plan_enterprise', name: 'enterprise', display_name: 'Enterprise', price: 299000, currency: 'IDR', billing_period: 'monthly', max_invoices: -1, max_clients: -1, max_payment_links: -1, features: '["basic_invoicing","email_notifications","custom_branding","priority_support","xendit_integration","api_access","dedicated_support","sla"]', is_active: true },
      ]);
    } finally {
      setLoadingSub(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      await subscriptionApi.subscribe(planId);
      await loadSubscription();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal subscribe');
    } finally {
      setSubscribing(null);
    }
  };

  const parseFeatures = (features: string): string[] => {
    try { return JSON.parse(features); } catch { return []; }
  };

  const formatLimit = (limit: number) => (limit === -1 ? 'Unlimited' : `${limit}`);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">⚙️ Pengaturan</h1>
          <p className="page-subtitle">Kelola profil bisnis, desain invoice, dan langganan Anda</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'general' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('general')}
        >
          🏢 Umum
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'billing' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          💎 Tagihan & Langganan
        </button>
      </div>

      {/* ── GENERAL TAB ── */}
      {activeTab === 'general' && (
        <div className={styles.settingsGrid}>
          {/* Business Profile */}
          <div className="card">
            <h3 className={styles.sectionTitle}>🏢 Profil Bisnis</h3>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>
              Informasi ini akan tampil di header invoice PDF Anda
            </p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nama Bisnis</label>
                <input type="text" className="form-input" placeholder="PT Contoh Sukses" value={bizName} onChange={e => setBizName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Bisnis</label>
                <input type="email" className="form-input" placeholder="hello@bisnis.com" value={bizEmail} onChange={e => setBizEmail(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Telepon</label>
                <input type="tel" className="form-input" placeholder="+62 812 3456 7890" value={bizPhone} onChange={e => setBizPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input type="url" className="form-input" placeholder="https://bisnis.com" value={bizWebsite} onChange={e => setBizWebsite(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Alamat</label>
              <textarea className="form-input form-textarea" placeholder="Jl. Contoh No. 123, Jakarta" value={bizAddress} onChange={e => setBizAddress(e.target.value)} />
            </div>
          </div>

          {/* Invoice Design */}
          <div className="card">
            <h3 className={styles.sectionTitle}>🎨 Desain Invoice</h3>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>
              Kustomisasi tampilan PDF invoice Anda
            </p>

            {/* Color Picker */}
            <div className="form-group">
              <label className="form-label">Warna Aksen</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {colorPresets.map(c => (
                  <button
                    key={c}
                    onClick={() => setAccentColor(c)}
                    style={{
                      width: 36, height: 36, borderRadius: 8, background: c, border: accentColor === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: 40, height: 32, border: 'none', cursor: 'pointer' }} />
                <input type="text" className="form-input" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: 100, fontFamily: 'monospace' }} />
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginTop: 16, padding: 16, border: `2px solid ${accentColor}`, borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: `3px solid ${accentColor}`, marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 20, color: accentColor }}>{bizName || 'Nama Bisnis Anda'}</div>
                  {bizEmail && <div style={{ fontSize: 10, color: '#888' }}>{bizEmail}</div>}
                  {bizPhone && <div style={{ fontSize: 10, color: '#888' }}>{bizPhone}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>INVOICE</div>
                  <div style={{ fontSize: 12, color: accentColor, fontWeight: 700 }}>INV-2025-001</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#999', paddingTop: 8, borderTop: '1px solid #eee' }}>
                {footerText}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Teks Footer</label>
              <input type="text" className="form-input" value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="Terima kasih atas kepercayaan Anda" />
            </div>
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-primary" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? '⏳ Menyimpan...' : '💾 Simpan Profil & Desain'}
            </button>
            {profileMsg && <span style={{ fontSize: 14 }}>{profileMsg}</span>}
          </div>

          {/* Appearance */}
          <div className="card">
            <h3 className={styles.sectionTitle}>🌙 Tampilan App</h3>
            <div className={styles.optionRow}>
              <div>
                <div className={styles.optionTitle}>Mode Gelap</div>
                <div className={styles.optionDesc}>Aktifkan tampilan gelap untuk kenyamanan mata</div>
              </div>
              <label className={styles.toggle}>
                <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
            <div className={styles.themePreview}>
              <div className={`${styles.themeCard} ${theme === 'light' ? styles.themeActive : ''}`} onClick={() => theme === 'dark' && toggleTheme()}>
                <div className={styles.themeIcon}>☀️</div>
                <span>Light</span>
              </div>
              <div className={`${styles.themeCard} ${theme === 'dark' ? styles.themeActive : ''}`} onClick={() => theme === 'light' && toggleTheme()}>
                <div className={styles.themeIcon}>🌙</div>
                <span>Dark</span>
              </div>
            </div>
          </div>

          {/* Payment Settings */}
          <div className="card">
            <h3 className={styles.sectionTitle}>💳 Pengaturan Pembayaran</h3>
            <div className="form-group">
              <label className="form-label">Nama Bank</label>
              <input type="text" className="form-input" defaultValue="Bank Central Asia (BCA)" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">No. Rekening</label>
                <input type="text" className="form-input" defaultValue="123 456 7890" />
              </div>
              <div className="form-group">
                <label className="form-label">Atas Nama</label>
                <input type="text" className="form-input" defaultValue="PT InvoiceQue Studio" />
              </div>
            </div>
            <button className="btn btn-primary">💾 Simpan</button>
            <XenditSetupCard />
          </div>

          {/* Notifications */}
          <div className="card">
            <h3 className={styles.sectionTitle}>🔔 Notifikasi</h3>
            <div className={styles.optionRow}>
              <div>
                <div className={styles.optionTitle}>Email Invoice Terkirim</div>
                <div className={styles.optionDesc}>Notifikasi saat invoice berhasil dikirim</div>
              </div>
              <label className={styles.toggle}>
                <input type="checkbox" defaultChecked />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
            <div className={styles.optionRow}>
              <div>
                <div className={styles.optionTitle}>Payment Received</div>
                <div className={styles.optionDesc}>Notifikasi saat pembayaran diterima</div>
              </div>
              <label className={styles.toggle}>
                <input type="checkbox" defaultChecked />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
            <div className={styles.optionRow}>
              <div>
                <div className={styles.optionTitle}>Invoice Overdue</div>
                <div className={styles.optionDesc}>Notifikasi saat invoice melewati jatuh tempo</div>
              </div>
              <label className={styles.toggle}>
                <input type="checkbox" defaultChecked />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── BILLING & SUBSCRIPTION TAB ── */}
      {activeTab === 'billing' && (
        <div>
          {loadingSub ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
              <div className={styles.spinner} />
            </div>
          ) : (
            <>
              {current && (
                <div className={styles.currentPlan}>
                  <div className={styles.currentIcon}>✅</div>
                  <div>
                    <div className={styles.currentLabel}>Paket Saat Ini</div>
                    <div className={styles.currentName}>{current.plan?.display_name || 'Free'}</div>
                  </div>
                </div>
              )}

              <div className={styles.plansGrid}>
                {plans.map((plan) => {
                  const isCurrentPlan = current?.plan_id === plan.id;
                  const features = parseFeatures(plan.features);

                  return (
                    <div
                      key={plan.id}
                      className={`${styles.planCard} ${plan.name === 'pro' ? styles.popular : ''} ${isCurrentPlan ? styles.activePlan : ''}`}
                    >
                      {plan.name === 'pro' && (
                        <div className={styles.popularBadge}>🔥 Populer</div>
                      )}
                      <div className={styles.planHeader}>
                        <h3 className={styles.planName}>{plan.display_name}</h3>
                        <div className={styles.planPrice}>
                          <span className={styles.priceAmount}>
                            {plan.price === 0 ? 'Gratis' : formatCurrency(plan.price)}
                          </span>
                          {plan.price > 0 && <span className={styles.pricePeriod}>/bulan</span>}
                        </div>
                      </div>

                      <div className={styles.planLimits}>
                        <div className={styles.limitItem}><span>📄</span><span>{formatLimit(plan.max_invoices)} Invoice</span></div>
                        <div className={styles.limitItem}><span>👥</span><span>{formatLimit(plan.max_clients)} Klien</span></div>
                        <div className={styles.limitItem}><span>🔗</span><span>{formatLimit(plan.max_payment_links)} Payment Link</span></div>
                      </div>

                      <div className={styles.planFeatures}>
                        {features.map((f) => (
                          <div key={f} className={styles.featureItem}>
                            <span className={styles.featureCheck}>✓</span>
                            <span>{featureLabels[f] || f}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        className={`btn ${isCurrentPlan ? 'btn-secondary' : plan.name === 'pro' ? 'btn-primary' : 'btn-secondary'} ${styles.planBtn}`}
                        disabled={isCurrentPlan || subscribing === plan.id}
                        onClick={() => handleSubscribe(plan.id)}
                      >
                        {subscribing === plan.id
                          ? 'Memproses...'
                          : isCurrentPlan
                          ? '✓ Paket Aktif'
                          : plan.price === 0
                          ? 'Mulai Gratis'
                          : 'Pilih Paket'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
