'use client';

import React, { useState, useEffect } from 'react';
import { subscriptionApi, type SubscriptionPlan, type Subscription } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import styles from './subscription.module.css';

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

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [current, setCurrent] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
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

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      await subscriptionApi.subscribe(planId);
      await loadData();
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

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">💎 Langganan</h1>
          <p className="page-subtitle">Pilih paket yang sesuai dengan kebutuhan bisnis Anda</p>
        </div>
      </div>

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
                <div className={styles.limitItem}>
                  <span>📄</span>
                  <span>{formatLimit(plan.max_invoices)} Invoice</span>
                </div>
                <div className={styles.limitItem}>
                  <span>👥</span>
                  <span>{formatLimit(plan.max_clients)} Klien</span>
                </div>
                <div className={styles.limitItem}>
                  <span>🔗</span>
                  <span>{formatLimit(plan.max_payment_links)} Payment Link</span>
                </div>
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
    </div>
  );
}
