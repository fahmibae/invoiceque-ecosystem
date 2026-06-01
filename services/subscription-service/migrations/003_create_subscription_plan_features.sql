-- ═══════════════════════════════════════════════════════════════
--  Migration 003: subscription_plan_features
--  Normalises features out of the subscription_plans.features
--  JSON text column into a proper relational table with
--  per-feature limit_value support.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscription_plan_features (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    feature_label VARCHAR(200) NOT NULL,
    limit_value INTEGER DEFAULT -1,  -- -1 = unlimited, 0 = disabled/locked, >0 = capped
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plan_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_plan_features_plan_id ON subscription_plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature_key ON subscription_plan_features(feature_key);

-- ── Seed: Free Plan Features ──────────────────────────────────
INSERT INTO subscription_plan_features (id, plan_id, feature_key, feature_label, limit_value, sort_order) VALUES
    ('pf_free_basic_invoicing',     'plan_free', 'basic_invoicing',      'Invoicing Dasar',       -1, 1),
    ('pf_free_email_notifications', 'plan_free', 'email_notifications',  'Notifikasi Email',      -1, 2)
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- ── Seed: Pro Plan Features ───────────────────────────────────
INSERT INTO subscription_plan_features (id, plan_id, feature_key, feature_label, limit_value, sort_order) VALUES
    ('pf_pro_basic_invoicing',      'plan_pro', 'basic_invoicing',       'Invoicing Dasar',       -1,  1),
    ('pf_pro_email_notifications',  'plan_pro', 'email_notifications',   'Notifikasi Email',      -1,  2),
    ('pf_pro_custom_branding',      'plan_pro', 'custom_branding',       'Custom Branding',       -1,  3),
    ('pf_pro_priority_support',     'plan_pro', 'priority_support',      'Prioritas Support',     -1,  4),
    ('pf_pro_xendit_integration',   'plan_pro', 'xendit_integration',    'Integrasi Xendit',      -1,  5),
    ('pf_pro_crm',                  'plan_pro', 'crm',                   'CRM',                   -1,  6),
    ('pf_pro_reports',              'plan_pro', 'reports',               'Reports',               -1,  7),
    ('pf_pro_meetings',             'plan_pro', 'meetings',              'Meetings',              -1,  8),
    ('pf_pro_time_tracking',        'plan_pro', 'time_tracking',         'Time Tracking',         -1,  9),
    ('pf_pro_chasers',              'plan_pro', 'chasers',               'Invoice Chasers',       -1, 10),
    ('pf_pro_calendar',             'plan_pro', 'calendar',              'Calendar',              -1, 11),
    ('pf_pro_paypal_integration',   'plan_pro', 'paypal_integration',    'Integrasi PayPal',      -1, 12),
    ('pf_pro_toolkit_contracts',    'plan_pro', 'toolkit_contracts',     'Contracts',             -1, 13),
    ('pf_pro_toolkit_rate_cards',   'plan_pro', 'toolkit_rate_cards',    'Rate Cards',            -1, 14),
    ('pf_pro_toolkit_brand_kits',   'plan_pro', 'toolkit_brand_kits',   'Brand Kits',            -1, 15),
    ('pf_pro_toolkit_briefs',       'plan_pro', 'toolkit_briefs',        'Briefs',                -1, 16),
    ('pf_pro_toolkit_campaigns',    'plan_pro', 'toolkit_campaigns',     'Campaigns',             -1, 17),
    ('pf_pro_toolkit_intake_forms', 'plan_pro', 'toolkit_intake_forms',  'Intake Forms',          -1, 18),
    ('pf_pro_toolkit_palettes',     'plan_pro', 'toolkit_palettes',      'Palettes',              -1, 19)
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- ── Seed: Enterprise Plan Features (all Pro + exclusive) ──────
INSERT INTO subscription_plan_features (id, plan_id, feature_key, feature_label, limit_value, sort_order) VALUES
    ('pf_ent_basic_invoicing',      'plan_enterprise', 'basic_invoicing',       'Invoicing Dasar',       -1,  1),
    ('pf_ent_email_notifications',  'plan_enterprise', 'email_notifications',   'Notifikasi Email',      -1,  2),
    ('pf_ent_custom_branding',      'plan_enterprise', 'custom_branding',       'Custom Branding',       -1,  3),
    ('pf_ent_priority_support',     'plan_enterprise', 'priority_support',      'Prioritas Support',     -1,  4),
    ('pf_ent_xendit_integration',   'plan_enterprise', 'xendit_integration',    'Integrasi Xendit',      -1,  5),
    ('pf_ent_crm',                  'plan_enterprise', 'crm',                   'CRM',                   -1,  6),
    ('pf_ent_reports',              'plan_enterprise', 'reports',               'Reports',               -1,  7),
    ('pf_ent_meetings',             'plan_enterprise', 'meetings',              'Meetings',              -1,  8),
    ('pf_ent_time_tracking',        'plan_enterprise', 'time_tracking',         'Time Tracking',         -1,  9),
    ('pf_ent_chasers',              'plan_enterprise', 'chasers',               'Invoice Chasers',       -1, 10),
    ('pf_ent_calendar',             'plan_enterprise', 'calendar',              'Calendar',              -1, 11),
    ('pf_ent_paypal_integration',   'plan_enterprise', 'paypal_integration',    'Integrasi PayPal',      -1, 12),
    ('pf_ent_toolkit_contracts',    'plan_enterprise', 'toolkit_contracts',     'Contracts',             -1, 13),
    ('pf_ent_toolkit_rate_cards',   'plan_enterprise', 'toolkit_rate_cards',    'Rate Cards',            -1, 14),
    ('pf_ent_toolkit_brand_kits',   'plan_enterprise', 'toolkit_brand_kits',   'Brand Kits',            -1, 15),
    ('pf_ent_toolkit_briefs',       'plan_enterprise', 'toolkit_briefs',        'Briefs',                -1, 16),
    ('pf_ent_toolkit_campaigns',    'plan_enterprise', 'toolkit_campaigns',     'Campaigns',             -1, 17),
    ('pf_ent_toolkit_intake_forms', 'plan_enterprise', 'toolkit_intake_forms',  'Intake Forms',          -1, 18),
    ('pf_ent_toolkit_palettes',     'plan_enterprise', 'toolkit_palettes',      'Palettes',              -1, 19),
    -- Enterprise-exclusive features
    ('pf_ent_api_access',           'plan_enterprise', 'api_access',            'API Access',            -1, 20),
    ('pf_ent_dedicated_support',    'plan_enterprise', 'dedicated_support',     'Dedicated Support',     -1, 21),
    ('pf_ent_sla',                  'plan_enterprise', 'sla',                   'SLA Agreement',         -1, 22)
ON CONFLICT (plan_id, feature_key) DO NOTHING;
