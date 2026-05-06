//! Subscription service module — plans, user subscriptions, checkout.
//! Mirrors: services/subscription-service (Go)

use crate::db::NeonClient;
use crate::middleware::JwtClaims;
use crate::services::notification;
use crate::utils;
use serde::{Deserialize, Serialize};
use worker::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionPlan {
    pub id: String,
    pub name: String,
    pub display_name: String,
    #[serde(default)]
    pub price: f64,
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub billing_period: String,
    #[serde(default)]
    pub max_invoices: i32,
    #[serde(default)]
    pub max_clients: i32,
    #[serde(default)]
    pub max_payment_links: i32,
    #[serde(default)]
    pub features: String,
    #[serde(default)]
    pub is_active: bool,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subscription {
    pub id: String,
    pub user_id: String,
    pub plan_id: String,
    #[serde(default)]
    pub status: String,
    pub current_period_start: Option<String>,
    pub current_period_end: Option<String>,
    #[serde(default)]
    pub invoices_used: i32,
    #[serde(default)]
    pub clients_used: i32,
    #[serde(default)]
    pub payment_links_used: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RenewalReminderCandidate {
    pub subscription_id: String,
    pub user_id: String,
    #[serde(default)]
    pub plan_name: String,
    #[serde(default)]
    pub plan_display_name: String,
    #[serde(default)]
    pub current_period_end: String,
    #[serde(default)]
    pub current_period_end_local: String,
    #[serde(default)]
    pub days_before: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ReminderRecipient {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ReminderStatusRow {
    #[serde(default)]
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SubscriptionReminderRunSummary {
    #[serde(default)]
    pub checked: usize,
    #[serde(default)]
    pub sent: usize,
    #[serde(default)]
    pub skipped: usize,
    #[serde(default)]
    pub failed: usize,
}

const PLAN_COLS: &str = "id, name, display_name, price, currency, billing_period, max_invoices, max_clients, max_payment_links, features, is_active, created_at::text";
const SUB_COLS: &str = "id, user_id, plan_id, status, current_period_start::text, current_period_end::text, invoices_used, clients_used, payment_links_used, created_at::text, updated_at::text";

pub async fn list_plans(env: &Env) -> Result<Response> {
    let db = get_db(env)?;
    let plans: Vec<SubscriptionPlan> = db
        .query_typed(
            &format!(
                "SELECT {} FROM subscription_plans WHERE is_active=true ORDER BY price ASC",
                PLAN_COLS
            ),
            &[],
        )
        .await?;
    utils::json_response(&plans, 200)
}

pub async fn get_current(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let sub: Option<serde_json::Value> = db.query_one(
        &format!("SELECT s.*, p.name as plan_name, p.display_name, p.price, p.currency, p.billing_period, p.max_invoices, p.max_clients, p.max_payment_links, p.features, p.is_active FROM subscriptions s JOIN subscription_plans p ON s.plan_id=p.id WHERE s.user_id=$1"),
        &[serde_json::json!(claims.user_id)],
    ).await?;

    match sub {
        Some(mut s) => {
            // Normalize response to include nested `plan` object expected by frontend
            if let Some(obj) = s.as_object_mut() {
                let plan = serde_json::json!({
                    "id": obj.get("plan_id").cloned().unwrap_or(serde_json::Value::String("".into())),
                    "name": obj.remove("plan_name").unwrap_or(serde_json::Value::String("".into())),
                    "display_name": obj.remove("display_name").unwrap_or(serde_json::Value::String("".into())),
                    "price": obj.remove("price").unwrap_or(serde_json::Value::Number(serde_json::Number::from(0))),
                    "currency": obj.remove("currency").unwrap_or(serde_json::Value::String("".into())),
                    "billing_period": obj.remove("billing_period").unwrap_or(serde_json::Value::String("".into())),
                    "max_invoices": obj.remove("max_invoices").unwrap_or(serde_json::Value::Number(serde_json::Number::from(0))),
                    "max_clients": obj.remove("max_clients").unwrap_or(serde_json::Value::Number(serde_json::Number::from(0))),
                    "max_payment_links": obj.remove("max_payment_links").unwrap_or(serde_json::Value::Number(serde_json::Number::from(0))),
                    "features": obj.remove("features").unwrap_or(serde_json::Value::String("[]".into())),
                    "is_active": obj.remove("is_active").unwrap_or(serde_json::Value::Bool(true)),
                });

                obj.insert("plan".to_string(), plan);
            }

            utils::json_response(&s, 200)
        }
        None => {
            // Auto-create free subscription
            let id = utils::generate_id();
            db.execute(
                "INSERT INTO subscriptions (id,user_id,plan_id,status,current_period_start,current_period_end,invoices_used,clients_used,payment_links_used,created_at,updated_at) VALUES ($1,$2,'plan_free','active',NOW(),NOW()+INTERVAL '100 years',0,0,0,NOW(),NOW()) ON CONFLICT (user_id) DO NOTHING",
                &[serde_json::json!(id), serde_json::json!(claims.user_id)],
            ).await?;

            let sub: Option<serde_json::Value> = db.query_one(
                "SELECT s.*, p.name as plan_name, p.display_name, p.price, p.currency, p.billing_period, p.max_invoices, p.max_clients, p.max_payment_links, p.features, p.is_active FROM subscriptions s JOIN subscription_plans p ON s.plan_id=p.id WHERE s.user_id=$1",
                &[serde_json::json!(claims.user_id)],
            ).await?;
            match sub {
                Some(s) => utils::json_response(&s, 200),
                None => utils::json_error("Failed to create subscription", 500),
            }
        }
    }
}

pub async fn get_usage(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let sub: Option<Subscription> = db
        .query_one(
            &format!("SELECT {} FROM subscriptions WHERE user_id=$1", SUB_COLS),
            &[serde_json::json!(claims.user_id)],
        )
        .await?;

    match sub {
        Some(s) => utils::json_response(
            &serde_json::json!({
                "invoices_used": s.invoices_used,
                "clients_used": s.clients_used,
                "payment_links_used": s.payment_links_used,
            }),
            200,
        ),
        None => utils::json_response(
            &serde_json::json!({
                "invoices_used": 0, "clients_used": 0, "payment_links_used": 0,
            }),
            200,
        ),
    }
}

pub async fn check_limit(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let url = req.url()?;
    let resource = utils::query_param(&url, "resource").unwrap_or_default();

    let db = get_db(env)?;
    let row: Option<serde_json::Value> = db.query_one(
        "SELECT s.invoices_used, s.clients_used, s.payment_links_used, p.max_invoices, p.max_clients, p.max_payment_links FROM subscriptions s JOIN subscription_plans p ON s.plan_id=p.id WHERE s.user_id=$1",
        &[serde_json::json!(claims.user_id)],
    ).await?;

    let allowed = match row {
        Some(r) => {
            let (used, max) = match resource.as_str() {
                "invoices" => (
                    r.get("invoices_used").and_then(|v| v.as_i64()).unwrap_or(0),
                    r.get("max_invoices").and_then(|v| v.as_i64()).unwrap_or(5),
                ),
                "clients" => (
                    r.get("clients_used").and_then(|v| v.as_i64()).unwrap_or(0),
                    r.get("max_clients").and_then(|v| v.as_i64()).unwrap_or(10),
                ),
                "payment_links" => (
                    r.get("payment_links_used")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0),
                    r.get("max_payment_links")
                        .and_then(|v| v.as_i64())
                        .unwrap_or(5),
                ),
                _ => (0, 999),
            };
            max < 0 || used < max // -1 means unlimited
        }
        None => true, // No subscription = allow (will auto-create free)
    };

    utils::json_response(
        &serde_json::json!({"allowed": allowed, "resource": resource}),
        200,
    )
}

pub async fn subscribe(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let plan_id = body.get("plan_id").and_then(|v| v.as_str()).unwrap_or("");
    if plan_id.is_empty() {
        return utils::json_error("plan_id is required", 400);
    }

    let db = get_db(env)?;
    let id = utils::generate_id();

    db.execute(
        "INSERT INTO subscriptions (id,user_id,plan_id,status,current_period_start,current_period_end,invoices_used,clients_used,payment_links_used,created_at,updated_at) VALUES ($1,$2,$3,'active',NOW(),NOW()+INTERVAL '30 days',0,0,0,NOW(),NOW()) ON CONFLICT (user_id) DO UPDATE SET plan_id=$3, status='active', current_period_start=NOW(), current_period_end=NOW()+INTERVAL '30 days', updated_at=NOW()",
        &[serde_json::json!(id), serde_json::json!(claims.user_id), serde_json::json!(plan_id)],
    ).await?;

    self::get_current(env, claims).await
}

pub async fn increment_usage(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let resource = body.get("resource").and_then(|v| v.as_str()).unwrap_or("");

    let col = match resource {
        "invoices" => "invoices_used",
        "clients" => "clients_used",
        "payment_links" => "payment_links_used",
        _ => return utils::json_error("Invalid resource type", 400),
    };

    let db = get_db(env)?;
    db.execute(
        &format!(
            "UPDATE subscriptions SET {}={}+1, updated_at=NOW() WHERE user_id=$1",
            col, col
        ),
        &[serde_json::json!(claims.user_id)],
    )
    .await?;

    utils::json_response(&serde_json::json!({"message": "Usage incremented"}), 200)
}

pub async fn create_checkout(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let plan_id = body.get("plan_id").and_then(|v| v.as_str()).unwrap_or("");
    if plan_id.is_empty() {
        return utils::json_error("plan_id required", 400);
    }

    let db = get_db(env)?;
    let plan: Option<SubscriptionPlan> = db
        .query_one(
            &format!("SELECT {} FROM subscription_plans WHERE id=$1", PLAN_COLS),
            &[serde_json::json!(plan_id)],
        )
        .await?;

    let plan = match plan {
        Some(p) => p,
        None => return utils::json_error("Plan not found", 404),
    };

    // For now, create a direct subscription (payment integration can be added later)
    let id = utils::generate_id();
    let external_id = format!("SUB-{}", id);

    db.execute(
        "INSERT INTO subscriptions (id,user_id,plan_id,status,current_period_start,current_period_end,created_at,updated_at) VALUES ($1,$2,$3,'pending',NOW(),NOW()+INTERVAL '30 days',NOW(),NOW()) ON CONFLICT (user_id) DO UPDATE SET plan_id=$3, status='pending', updated_at=NOW()",
        &[serde_json::json!(id), serde_json::json!(claims.user_id), serde_json::json!(plan_id)],
    ).await?;

    utils::json_response(
        &serde_json::json!({
            "external_id": external_id,
            "plan": plan,
            "checkout_url": format!("https://app.invoicequ.my.id/subscription/checkout/{}", external_id),
        }),
        200,
    )
}

pub async fn checkout_status(env: &Env, external_id: &str) -> Result<Response> {
    // Extract subscription ID from external_id
    let sub_id = external_id.trim_start_matches("SUB-");
    let db = get_db(env)?;
    let sub: Option<Subscription> = db
        .query_one(
            &format!("SELECT {} FROM subscriptions WHERE id=$1", SUB_COLS),
            &[serde_json::json!(sub_id)],
        )
        .await?;

    match sub {
        Some(s) => utils::json_response(&serde_json::json!({"status": s.status, "id": s.id}), 200),
        None => utils::json_error("Checkout not found", 404),
    }
}

pub async fn handle_webhook(mut req: Request, env: &Env) -> Result<Response> {
    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let external_id = body
        .get("external_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let status = body.get("status").and_then(|v| v.as_str()).unwrap_or("");

    if !external_id.is_empty() && (status == "PAID" || status == "paid") {
        let sub_id = external_id.trim_start_matches("SUB-");
        let db = get_db(env)?;
        db.execute(
            "UPDATE subscriptions SET status='active', current_period_start=NOW(), current_period_end=NOW()+INTERVAL '30 days', updated_at=NOW() WHERE id=$1",
            &[serde_json::json!(sub_id)],
        ).await?;
    }

    utils::json_response(&serde_json::json!({"status": "ok"}), 200)
}

pub async fn send_due_renewal_reminders(env: &Env) -> Result<SubscriptionReminderRunSummary> {
    let subscription_db = get_db(env)?;
    let auth_db = get_auth_db(env)?;

    ensure_renewal_reminders_table(&subscription_db).await?;

    let candidates: Vec<RenewalReminderCandidate> = subscription_db
        .query_typed(
            "SELECT
                s.id AS subscription_id,
                s.user_id,
                p.name AS plan_name,
                p.display_name AS plan_display_name,
                s.current_period_end::text AS current_period_end,
                TO_CHAR(s.current_period_end AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY HH24:MI') AS current_period_end_local,
                ((s.current_period_end AT TIME ZONE 'Asia/Jakarta')::date - (NOW() AT TIME ZONE 'Asia/Jakarta')::date) AS days_before
             FROM subscriptions s
             JOIN subscription_plans p ON p.id = s.plan_id
             WHERE s.status = 'active'
               AND s.plan_id <> 'plan_free'
               AND p.is_active = true
               AND s.current_period_end IS NOT NULL
               AND s.current_period_end > NOW()
               AND ((s.current_period_end AT TIME ZONE 'Asia/Jakarta')::date - (NOW() AT TIME ZONE 'Asia/Jakarta')::date) IN (14, 7, 1)
             ORDER BY days_before DESC, s.current_period_end ASC",
            &[],
        )
        .await?;

    let mut summary = SubscriptionReminderRunSummary {
        checked: candidates.len(),
        ..Default::default()
    };

    for candidate in candidates {
        if reminder_already_sent(&subscription_db, &candidate).await? {
            summary.skipped += 1;
            continue;
        }

        let user: Option<ReminderRecipient> = auth_db
            .query_one(
                "SELECT id, name, email FROM users WHERE id=$1",
                &[serde_json::json!(candidate.user_id)],
            )
            .await?;

        let user = match user {
            Some(user) if !user.email.trim().is_empty() => user,
            _ => {
                upsert_reminder_attempt(
                    &subscription_db,
                    &candidate,
                    "failed",
                    Some("recipient email not found".into()),
                )
                .await?;
                summary.failed += 1;
                continue;
            }
        };

        let subject = build_renewal_reminder_subject(&candidate);
        let html = build_renewal_reminder_html(&user.name, &candidate);

        match notification::send_email_via_resend(env, &user.email, &subject, &html).await {
            Ok(()) => {
                upsert_reminder_attempt(&subscription_db, &candidate, "sent", None).await?;
                summary.sent += 1;
            }
            Err(err) => {
                upsert_reminder_attempt(
                    &subscription_db,
                    &candidate,
                    "failed",
                    Some(err.to_string()),
                )
                .await?;
                summary.failed += 1;
            }
        }
    }

    Ok(summary)
}

// Admin endpoints
pub async fn list_all(env: &Env, claims: &JwtClaims) -> Result<Response> {
    if claims.role != "admin" {
        return utils::json_error("Forbidden", 403);
    }
    let db = get_db(env)?;
    let subs: Vec<Subscription> = db
        .query_typed(
            &format!(
                "SELECT {} FROM subscriptions ORDER BY created_at DESC",
                SUB_COLS
            ),
            &[],
        )
        .await?;
    utils::json_response(&serde_json::json!({"data": subs}), 200)
}

pub async fn update_plan(
    mut req: Request,
    env: &Env,
    claims: &JwtClaims,
    plan_id: &str,
) -> Result<Response> {
    if claims.role != "admin" {
        return utils::json_error("Forbidden", 403);
    }
    let body: serde_json::Value = req.json().await?;
    let db = get_db(env)?;

    let price = body.get("price").and_then(|v| v.as_f64());
    let max_inv = body.get("max_invoices").and_then(|v| v.as_i64());
    let max_cli = body.get("max_clients").and_then(|v| v.as_i64());
    let max_pl = body.get("max_payment_links").and_then(|v| v.as_i64());

    if let Some(p) = price {
        db.execute(
            "UPDATE subscription_plans SET price=$1 WHERE id=$2",
            &[serde_json::json!(p), serde_json::json!(plan_id)],
        )
        .await?;
    }
    if let Some(v) = max_inv {
        db.execute(
            "UPDATE subscription_plans SET max_invoices=$1 WHERE id=$2",
            &[serde_json::json!(v), serde_json::json!(plan_id)],
        )
        .await?;
    }
    if let Some(v) = max_cli {
        db.execute(
            "UPDATE subscription_plans SET max_clients=$1 WHERE id=$2",
            &[serde_json::json!(v), serde_json::json!(plan_id)],
        )
        .await?;
    }
    if let Some(v) = max_pl {
        db.execute(
            "UPDATE subscription_plans SET max_payment_links=$1 WHERE id=$2",
            &[serde_json::json!(v), serde_json::json!(plan_id)],
        )
        .await?;
    }

    utils::json_response(&serde_json::json!({"message": "Plan updated"}), 200)
}

async fn ensure_renewal_reminders_table(db: &NeonClient) -> Result<()> {
    db.execute(
        "CREATE TABLE IF NOT EXISTS subscription_renewal_reminders (
            id VARCHAR(64) PRIMARY KEY,
            subscription_id VARCHAR(64) NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
            user_id VARCHAR(64) NOT NULL,
            days_before INTEGER NOT NULL CHECK (days_before IN (1, 7, 14)),
            period_end TIMESTAMP WITH TIME ZONE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT DEFAULT '',
            last_attempted_at TIMESTAMP WITH TIME ZONE,
            sent_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (subscription_id, days_before, period_end)
        )",
        &[],
    )
    .await?;

    db.execute(
        "CREATE INDEX IF NOT EXISTS idx_subscription_renewal_reminders_lookup
         ON subscription_renewal_reminders (subscription_id, days_before, period_end)",
        &[],
    )
    .await?;

    Ok(())
}

async fn reminder_already_sent(
    db: &NeonClient,
    candidate: &RenewalReminderCandidate,
) -> Result<bool> {
    let existing: Option<ReminderStatusRow> = db
        .query_one(
            "SELECT status
             FROM subscription_renewal_reminders
             WHERE subscription_id=$1 AND days_before=$2 AND period_end=$3
             ORDER BY updated_at DESC
             LIMIT 1",
            &[
                serde_json::json!(candidate.subscription_id),
                serde_json::json!(candidate.days_before),
                serde_json::json!(candidate.current_period_end),
            ],
        )
        .await?;

    Ok(existing
        .map(|row| row.status.eq_ignore_ascii_case("sent"))
        .unwrap_or(false))
}

async fn upsert_reminder_attempt(
    db: &NeonClient,
    candidate: &RenewalReminderCandidate,
    status: &str,
    error_message: Option<String>,
) -> Result<()> {
    let error_message = error_message
        .unwrap_or_default()
        .chars()
        .take(500)
        .collect::<String>();

    db.execute(
        "INSERT INTO subscription_renewal_reminders (
            id, subscription_id, user_id, days_before, period_end,
            status, attempts, last_error, last_attempted_at, sent_at, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5,
            $6, 1, $7, NOW(), CASE WHEN $6 = 'sent' THEN NOW() ELSE NULL END, NOW(), NOW()
        )
        ON CONFLICT (subscription_id, days_before, period_end)
        DO UPDATE SET
            user_id = EXCLUDED.user_id,
            status = EXCLUDED.status,
            attempts = subscription_renewal_reminders.attempts + 1,
            last_error = EXCLUDED.last_error,
            last_attempted_at = NOW(),
            sent_at = CASE
                WHEN EXCLUDED.status = 'sent'
                    THEN COALESCE(subscription_renewal_reminders.sent_at, NOW())
                ELSE subscription_renewal_reminders.sent_at
            END,
            updated_at = NOW()",
        &[
            serde_json::json!(utils::generate_id()),
            serde_json::json!(candidate.subscription_id),
            serde_json::json!(candidate.user_id),
            serde_json::json!(candidate.days_before),
            serde_json::json!(candidate.current_period_end),
            serde_json::json!(status),
            serde_json::json!(error_message),
        ],
    )
    .await?;

    Ok(())
}

fn build_renewal_reminder_subject(candidate: &RenewalReminderCandidate) -> String {
    let plan_name = readable_plan_name(candidate);
    match candidate.days_before {
        1 => format!(
            "Reminder Langganan InvoiceQu: Paket {} berakhir besok",
            plan_name
        ),
        days => format!(
            "Reminder Langganan InvoiceQu: Paket {} berakhir {} hari lagi",
            plan_name, days
        ),
    }
}

fn build_renewal_reminder_html(user_name: &str, candidate: &RenewalReminderCandidate) -> String {
    let greeting_name = if user_name.trim().is_empty() {
        "Kak"
    } else {
        user_name
    };
    let plan_name = readable_plan_name(candidate);
    let reminder_copy = match candidate.days_before {
        1 => "akan berakhir besok".to_string(),
        days => format!("akan berakhir dalam {} hari", days),
    };

    format!(
        "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px;margin:0 auto;padding:24px;\">
            <h2 style=\"margin:0 0 16px;\">Reminder Langganan InvoiceQu</h2>
            <p>Halo {},</p>
            <p>Masa aktif paket <strong>{}</strong> Anda {}.</p>
            <div style=\"border:1px solid #E5E7EB;border-radius:12px;padding:16px;margin:20px 0;background:#F9FAFB;\">
                <p style=\"margin:0 0 8px;\"><strong>Paket</strong>: {}</p>
                <p style=\"margin:0 0 8px;\"><strong>Berakhir pada</strong>: {} WIB</p>
                <p style=\"margin:0;\"><strong>Reminder</strong>: H-{}</p>
            </div>
            <p>Silakan buka halaman langganan untuk meninjau paket aktif dan mengatur perpanjangan sebelum masa aktif berakhir.</p>
            <p style=\"margin:24px 0;\">
                <a href=\"https://app.invoicequ.my.id/subscription\" style=\"display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;\">Kelola Langganan</a>
            </p>
            <p style=\"color:#6B7280;font-size:14px;\">Kalau perpanjangan sudah beres, email ini bisa diabaikan.</p>
        </div>",
        greeting_name,
        plan_name,
        reminder_copy,
        plan_name,
        candidate.current_period_end_local,
        candidate.days_before
    )
}

fn readable_plan_name(candidate: &RenewalReminderCandidate) -> &str {
    if candidate.plan_display_name.trim().is_empty() {
        &candidate.plan_name
    } else {
        &candidate.plan_display_name
    }
}

fn get_auth_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "AUTH_DB_URL");
    NeonClient::from_connection_string(&url)
}

fn get_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "SUBSCRIPTION_DB_URL");
    NeonClient::from_connection_string(&url)
}
