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

#[derive(Debug, Clone, Copy)]
enum UsageResource {
    Invoices,
    Clients,
    PaymentLinks,
}

impl UsageResource {
    fn from_input(value: &str) -> Option<Self> {
        match value {
            "invoice" | "invoices" => Some(Self::Invoices),
            "client" | "clients" => Some(Self::Clients),
            "payment" | "payment_link" | "payment_links" => Some(Self::PaymentLinks),
            _ => None,
        }
    }

    fn key(self) -> &'static str {
        match self {
            Self::Invoices => "invoices",
            Self::Clients => "clients",
            Self::PaymentLinks => "payment_links",
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Invoices => "invoice",
            Self::Clients => "klien",
            Self::PaymentLinks => "payment link",
        }
    }

    fn recommendation_copy(self) -> &'static str {
        match self {
            Self::Invoices => "membuat lebih banyak invoice",
            Self::Clients => "menyimpan lebih banyak data klien",
            Self::PaymentLinks => "membuat lebih banyak payment link",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
struct UsageSnapshot {
    pub invoices_used: i64,
    pub invoices_limit: i64,
    pub clients_used: i64,
    pub clients_limit: i64,
    pub payment_links_used: i64,
    pub payment_links_limit: i64,
    pub can_create_invoice: bool,
    pub can_create_client: bool,
    pub can_create_payment: bool,
    pub plan_id: String,
    pub plan_name: String,
    pub plan_display_name: String,
    pub plan_price: f64,
    pub locked_resources: Vec<String>,
}

#[derive(Debug, Clone)]
struct UsageResourceState {
    pub used: i64,
    pub limit: i64,
    pub allowed: bool,
}

#[derive(Debug, Clone)]
struct UpgradeRecommendation {
    pub name: String,
    pub display_name: String,
    pub price: f64,
    pub resource_limit: i64,
}

#[derive(Debug, Clone, Copy)]
enum UpgradeEmailOutcome {
    Sent,
    Skipped,
    Failed,
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
    ensure_free_subscription_when_missing_or_pending(&db, &claims.user_id).await?;

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
    let snapshot = build_usage_snapshot(env, &db, claims).await?;
    utils::json_response(&snapshot, 200)
}

pub async fn check_limit(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let url = req.url()?;
    let resource_param = utils::query_param(&url, "resource")
        .or_else(|| utils::query_param(&url, "type"))
        .unwrap_or_default();
    let resource = match UsageResource::from_input(&resource_param) {
        Some(resource) => resource,
        None => return utils::json_error("Valid resource is required", 400),
    };

    let db = get_db(env)?;
    let snapshot = build_usage_snapshot(env, &db, claims).await?;
    let state = resource_state(&snapshot, resource);

    if !state.allowed {
        let _ = send_upgrade_recommendation_email(env, &db, claims, &snapshot, resource).await;
    }

    utils::json_response(
        &serde_json::json!({
            "allowed": state.allowed,
            "resource": resource.key(),
            "used": state.used,
            "limit": state.limit,
            "plan": snapshot.plan_name,
            "tier": snapshot.plan_display_name,
            "upgrade": upgrade_message(resource),
        }),
        200,
    )
}

pub async fn send_upgrade_recommendation(
    mut req: Request,
    env: &Env,
    claims: &JwtClaims,
) -> Result<Response> {
    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let requested_resource = body
        .get("resource")
        .and_then(|v| v.as_str())
        .and_then(UsageResource::from_input);

    let db = get_db(env)?;
    let snapshot = build_usage_snapshot(env, &db, claims).await?;
    let resources = match requested_resource {
        Some(resource) if !resource_state(&snapshot, resource).allowed => vec![resource],
        Some(_) => Vec::new(),
        None => locked_resources(&snapshot),
    };

    let mut sent = 0;
    let mut skipped = 0;
    let mut failed = 0;

    for resource in resources {
        match send_upgrade_recommendation_email(env, &db, claims, &snapshot, resource).await? {
            UpgradeEmailOutcome::Sent => sent += 1,
            UpgradeEmailOutcome::Skipped => skipped += 1,
            UpgradeEmailOutcome::Failed => failed += 1,
        }
    }

    utils::json_response(
        &serde_json::json!({
            "sent": sent,
            "skipped": skipped,
            "failed": failed,
            "locked_resources": snapshot.locked_resources,
        }),
        200,
    )
}

pub async fn limit_reached_response(
    env: &Env,
    claims: &JwtClaims,
    resource: &str,
) -> Result<Option<Response>> {
    let resource = match UsageResource::from_input(resource) {
        Some(resource) => resource,
        None => return Ok(Some(utils::json_error("Invalid resource type", 400)?)),
    };

    let db = get_db(env)?;
    let snapshot = build_usage_snapshot(env, &db, claims).await?;
    let state = resource_state(&snapshot, resource);

    if state.allowed {
        return Ok(None);
    }

    let _ = send_upgrade_recommendation_email(env, &db, claims, &snapshot, resource).await;

    Ok(Some(utils::json_response(
        &serde_json::json!({
            "error": format!("Limit {} pada plan Anda sudah tercapai", resource.label()),
            "code": "FEATURE_LIMIT_REACHED",
            "resource": resource.key(),
            "used": state.used,
            "limit": state.limit,
            "plan": snapshot.plan_name,
            "tier": snapshot.plan_display_name,
            "upgrade": upgrade_message(resource),
        }),
        403,
    )?))
}

pub async fn subscribe(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let plan_id = body.get("plan_id").and_then(|v| v.as_str()).unwrap_or("");
    if plan_id.is_empty() {
        return utils::json_error("plan_id is required", 400);
    }

    let db = get_db(env)?;
    let plan: Option<SubscriptionPlan> = db
        .query_one(
            &format!("SELECT {} FROM subscription_plans WHERE id=$1", PLAN_COLS),
            &[serde_json::json!(plan_id)],
        )
        .await?;

    let plan = match plan {
        Some(plan) => plan,
        None => return utils::json_error("Plan not found", 404),
    };

    if plan.price > 0.0 {
        return utils::json_error("Paid plans require Xendit checkout", 402);
    }

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

    if plan.price <= 0.0 {
        return utils::json_error("Free plan doesn't need checkout", 400);
    }
    if plan.name.eq_ignore_ascii_case("enterprise") || plan.id == "plan_enterprise" {
        return utils::json_response(
            &serde_json::json!({
                "error": "Paket Enterprise tidak bisa di-checkout secara langsung. Silakan hubungi tim Sales kami.",
            }),
            403,
        );
    }

    let api_key = utils::get_secret(env, "XENDIT_API_KEY");
    if api_key.is_empty() {
        return utils::json_error("Xendit API Key not configured on server", 500);
    }
    if is_xendit_public_key(&api_key) {
        return utils::json_error(
            "XENDIT_API_KEY memakai public key. Gunakan secret API key Xendit, bukan xnd_public_...",
            500,
        );
    }

    let transaction_id = utils::generate_id();
    let external_id = format!("SUB-{}", transaction_id);

    // A pending paid checkout must not grant the paid plan. Keep the user's
    // current/free subscription active until Xendit confirms payment.
    ensure_free_subscription_when_missing_or_pending(&db, &claims.user_id).await?;

    let (checkout_url, xendit_id) =
        match create_xendit_invoice(env, &api_key, &plan, &claims.email, &external_id).await {
            Ok(result) => result,
            Err(err) => {
                return utils::json_response(
                    &serde_json::json!({
                        "error": "Gagal membuat invoice langganan di Xendit",
                        "details": err.to_string(),
                    }),
                    502,
                )
            }
        };

    // Ensure checkout_url is absolute — sometimes providers may return
    // unexpected relative/partial values; prefix with Xendit checkout host.
    let checkout_url =
        if checkout_url.starts_with("http://") || checkout_url.starts_with("https://") {
            checkout_url
        } else {
            let prefix = "https://checkout.xendit.co";
            format!(
                "{}/{}",
                prefix.trim_end_matches('/'),
                checkout_url.trim_start_matches('/')
            )
        };

    // Debug log for troubleshooting (will appear in Worker logs)
    console_log!(
        "[subscriptions] created checkout: external_id={} xendit_id={} checkout_url={}",
        external_id,
        xendit_id,
        checkout_url
    );

    ensure_subscription_transactions_table(&db).await?;
    db.execute(
        "INSERT INTO subscription_transactions (id,user_id,plan_id,amount,status,checkout_url,external_id,xendit_id,created_at,updated_at)
         VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,NOW(),NOW())",
        &[
            serde_json::json!(transaction_id),
            serde_json::json!(claims.user_id),
            serde_json::json!(plan_id),
            serde_json::json!(plan.price),
            serde_json::json!(checkout_url),
            serde_json::json!(external_id),
            serde_json::json!(xendit_id),
        ],
    )
    .await?;

    utils::json_response(
        &serde_json::json!({
            "external_id": external_id,
            "plan": plan,
            "checkout_url": checkout_url,
            "transaction_id": transaction_id,
        }),
        200,
    )
}

pub async fn checkout_status(env: &Env, external_id: &str) -> Result<Response> {
    let db = get_db(env)?;
    ensure_subscription_transactions_table(&db).await?;

    let tx: Option<serde_json::Value> = db
        .query_one(
            "SELECT id,user_id,plan_id,amount,status,checkout_url,external_id,COALESCE(xendit_id,'') AS xendit_id,created_at::text,updated_at::text
             FROM subscription_transactions WHERE external_id=$1",
            &[serde_json::json!(external_id)],
        )
        .await?;

    let mut tx = match tx {
        Some(tx) => tx,
        None => return utils::json_error("Checkout not found", 404),
    };

    let tx_status = tx
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("pending")
        .to_string();
    let xendit_id = tx
        .get("xendit_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if tx_status == "pending" && !xendit_id.is_empty() {
        let api_key = utils::get_secret(env, "XENDIT_API_KEY");
        if !api_key.is_empty() && !is_xendit_public_key(&api_key) {
            if let Ok(xendit_status) = fetch_xendit_invoice_status(env, &api_key, &xendit_id).await
            {
                if matches!(xendit_status.as_str(), "PAID" | "SETTLED") {
                    mark_subscription_transaction_paid(&db, external_id).await?;
                    if let Some(obj) = tx.as_object_mut() {
                        obj.insert("status".to_string(), serde_json::json!("paid"));
                    }
                } else if xendit_status == "EXPIRED" {
                    db.execute(
                        "UPDATE subscription_transactions SET status='expired', updated_at=NOW() WHERE external_id=$1",
                        &[serde_json::json!(external_id)],
                    )
                    .await?;
                    if let Some(obj) = tx.as_object_mut() {
                        obj.insert("status".to_string(), serde_json::json!("expired"));
                    }
                }
            }
        }
    }

    utils::json_response(
        &serde_json::json!({
            "status": tx.get("status").and_then(|v| v.as_str()).unwrap_or("pending"),
            "external_id": tx.get("external_id").cloned().unwrap_or_else(|| serde_json::json!(external_id)),
            "plan_id": tx.get("plan_id").cloned().unwrap_or_default(),
            "amount": tx.get("amount").cloned().unwrap_or_else(|| serde_json::json!(0.0)),
        }),
        200,
    )
}

pub async fn handle_webhook(mut req: Request, env: &Env) -> Result<Response> {
    // Verify callback token if configured (same mechanism as payment webhooks)
    let expected_callback_token = utils::get_secret(env, "XENDIT_CALLBACK_TOKEN");
    if !expected_callback_token.is_empty() {
        let incoming_callback_token = req
            .headers()
            .get("x-callback-token")
            .ok()
            .flatten()
            .unwrap_or_default();
        if incoming_callback_token != expected_callback_token {
            return utils::json_response(
                &serde_json::json!({"error": "Invalid callback token"}),
                401,
            );
        }
    }

    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let _ = process_xendit_webhook_payload(env, &body).await?;
    utils::json_response(&serde_json::json!({"status": "ok"}), 200)
}

pub async fn process_xendit_webhook_payload(env: &Env, body: &serde_json::Value) -> Result<bool> {
    let external_id = body
        .get("external_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let status = body.get("status").and_then(|v| v.as_str()).unwrap_or("");

    if !external_id.starts_with("SUB-") {
        return Ok(false);
    }

    let db = get_db(env)?;
    ensure_subscription_transactions_table(&db).await?;

    if matches!(status.to_ascii_uppercase().as_str(), "PAID" | "SETTLED") {
        mark_subscription_transaction_paid(&db, external_id).await?;
        return Ok(true);
    }

    if matches!(status.to_ascii_uppercase().as_str(), "EXPIRED" | "FAILED") {
        let xendit_id = body.get("id").and_then(|v| v.as_str()).unwrap_or("");
        db.execute(
            "UPDATE subscription_transactions SET status=$1, xendit_id=COALESCE(NULLIF(xendit_id,''), $2), updated_at=NOW() WHERE external_id=$3",
            &[
                serde_json::json!(status.to_ascii_lowercase()),
                serde_json::json!(xendit_id),
                serde_json::json!(external_id),
            ],
        )
        .await?;
        return Ok(true);
    }

    Ok(true)
}

async fn mark_subscription_transaction_paid(db: &NeonClient, external_id: &str) -> Result<()> {
    let tx: Option<serde_json::Value> = db
        .query_one(
            "UPDATE subscription_transactions SET status='paid', updated_at=NOW()
             WHERE external_id=$1
             RETURNING user_id, plan_id, amount, external_id, COALESCE(xendit_id,'') AS xendit_id",
            &[serde_json::json!(external_id)],
        )
        .await?;

    if let Some(tx) = tx {
        let user_id = tx.get("user_id").and_then(|v| v.as_str()).unwrap_or("");
        let plan_id = tx.get("plan_id").and_then(|v| v.as_str()).unwrap_or("");
        if !user_id.is_empty() && !plan_id.is_empty() {
            activate_subscription(db, user_id, plan_id).await?;
        }
    } else {
        // No matching transaction found — do NOT activate subscriptions without
        // a recorded transaction. Log for investigation and return.
        console_log!(
            "[subscriptions] mark_paid: no transaction found for external_id={}",
            external_id
        );
    }

    Ok(())
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

// ── Expired subscription enforcement (CRON) ──

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ExpiredSubscription {
    pub subscription_id: String,
    pub user_id: String,
    #[serde(default)]
    pub plan_id: String,
    #[serde(default)]
    pub plan_name: String,
    #[serde(default)]
    pub plan_display_name: String,
    #[serde(default)]
    pub current_period_end: String,
    #[serde(default)]
    pub current_period_end_local: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExpiredEnforcementSummary {
    pub checked: usize,
    pub downgraded: usize,
    pub skipped: usize,
    pub failed: usize,
}

/// Called by the scheduled (CRON) handler.
/// Finds paid subscriptions past their `current_period_end`, downgrades them to
/// free plan, disconnects Xendit/PayPal payment gateways, and sends a warning
/// email.
pub async fn enforce_expired_subscriptions(env: &Env) -> Result<ExpiredEnforcementSummary> {
    let sub_db = get_db(env)?;
    let auth_db = get_auth_db(env)?;

    // Find active paid subscriptions whose period has ended
    let expired: Vec<ExpiredSubscription> = sub_db
        .query_typed(
            "SELECT
                s.id AS subscription_id,
                s.user_id,
                s.plan_id,
                p.name AS plan_name,
                p.display_name AS plan_display_name,
                s.current_period_end::text AS current_period_end,
                TO_CHAR(s.current_period_end AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY HH24:MI') AS current_period_end_local
             FROM subscriptions s
             JOIN subscription_plans p ON p.id = s.plan_id
             WHERE s.status = 'active'
               AND s.plan_id <> 'plan_free'
               AND s.current_period_end IS NOT NULL
               AND s.current_period_end < NOW()
             ORDER BY s.current_period_end ASC
             LIMIT 200",
            &[],
        )
        .await?;

    let mut summary = ExpiredEnforcementSummary {
        checked: expired.len(),
        ..Default::default()
    };

    // Get the payment database for disconnecting gateways
    let payment_db_url = utils::get_secret(env, "PAYMENT_DB_URL");
    let payment_db = if !payment_db_url.is_empty() {
        crate::db::NeonClient::from_connection_string(&payment_db_url).ok()
    } else {
        None
    };

    for sub in expired {
        // 1. Downgrade to free plan
        if let Err(err) = sub_db
            .execute(
                "UPDATE subscriptions SET
                    plan_id = 'plan_free',
                    status = 'expired',
                    updated_at = NOW()
                 WHERE id = $1 AND user_id = $2",
                &[
                    serde_json::json!(sub.subscription_id),
                    serde_json::json!(sub.user_id),
                ],
            )
            .await
        {
            console_log!(
                "[CRON] Failed to downgrade subscription {} for user {}: {}",
                sub.subscription_id,
                sub.user_id,
                err
            );
            summary.failed += 1;
            continue;
        }

        // 2. Disconnect Xendit & PayPal accounts (soft disconnect — local DB only)
        if let Some(ref pdb) = payment_db {
            // Disconnect Xendit
            if let Err(err) = pdb
                .execute(
                    "DELETE FROM xendit_accounts WHERE user_id=$1",
                    &[serde_json::json!(sub.user_id)],
                )
                .await
            {
                console_log!(
                    "[CRON] Failed to disconnect Xendit for user {}: {}",
                    sub.user_id,
                    err
                );
            }

            // Disconnect PayPal
            if let Err(err) = pdb
                .execute(
                    "DELETE FROM paypal_accounts WHERE user_id=$1",
                    &[serde_json::json!(sub.user_id)],
                )
                .await
            {
                console_log!(
                    "[CRON] Failed to disconnect PayPal for user {}: {}",
                    sub.user_id,
                    err
                );
            }
        }

        // 3. Look up user email for notification
        let user: Option<ReminderRecipient> = auth_db
            .query_one(
                "SELECT id, name, email FROM users WHERE id=$1",
                &[serde_json::json!(sub.user_id)],
            )
            .await
            .unwrap_or(None);

        let plan_label = if sub.plan_display_name.trim().is_empty() {
            &sub.plan_name
        } else {
            &sub.plan_display_name
        };

        // 4. Queue in-app notification
        notification::queue_notification(
            env,
            &sub.user_id,
            "subscription_expired",
            "Langganan Berakhir",
            &format!(
                "Langganan {} Anda telah berakhir. Akun payment gateway telah dinonaktifkan.",
                plan_label
            ),
            "",     // recipient
            "",     // subject
            "sent", // status
        );

        // 5. Send warning email
        if let Some(ref user) = user {
            if !user.email.trim().is_empty() {
                let subject = format!("⚠️ Langganan InvoiceQu {} Telah Berakhir", plan_label);
                let html = build_expired_warning_html(
                    &user.name,
                    plan_label,
                    &sub.current_period_end_local,
                );

                if let Err(err) =
                    notification::send_email_via_resend(env, &user.email, &subject, &html).await
                {
                    console_log!(
                        "[CRON] Failed to send expired subscription email to {}: {}",
                        user.email,
                        err
                    );
                }
            }
        }

        summary.downgraded += 1;
    }

    Ok(summary)
}

fn build_expired_warning_html(user_name: &str, plan_name: &str, expired_date: &str) -> String {
    let greeting_name = if user_name.trim().is_empty() {
        "Kak"
    } else {
        user_name
    };

    format!(
        "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px;margin:0 auto;padding:24px;\">
            <h2 style=\"margin:0 0 16px;color:#DC2626;\">⚠️ Langganan Anda Telah Berakhir</h2>
            <p>Halo {},</p>
            <p>Masa aktif paket <strong>{}</strong> Anda telah berakhir pada <strong>{} WIB</strong> dan belum diperpanjang.</p>

            <div style=\"border:1px solid #FCA5A5;border-radius:12px;padding:16px;margin:20px 0;background:#FEF2F2;\">
                <p style=\"margin:0 0 8px;font-weight:bold;color:#DC2626;\">Apa yang terjadi?</p>
                <ul style=\"margin:0;padding-left:20px;color:#7F1D1D;\">
                    <li>Akun Anda telah di-downgrade ke paket <strong>Free</strong></li>
                    <li>Koneksi <strong>Xendit</strong> dan <strong>PayPal</strong> telah dinonaktifkan</li>
                    <li>Fitur premium tidak lagi tersedia</li>
                </ul>
            </div>

            <div style=\"border:1px solid #D1FAE5;border-radius:12px;padding:16px;margin:20px 0;background:#ECFDF5;\">
                <p style=\"margin:0 0 8px;font-weight:bold;color:#065F46;\">Cara mengaktifkan kembali:</p>
                <ol style=\"margin:0;padding-left:20px;color:#065F46;\">
                    <li>Buka halaman <strong>Langganan</strong> di dashboard InvoiceQu</li>
                    <li>Pilih paket yang sesuai dan lakukan pembayaran</li>
                    <li>Hubungkan kembali Xendit/PayPal Anda di halaman <strong>Pengaturan</strong></li>
                </ol>
            </div>

            <p style=\"margin:24px 0;\">
                <a href=\"https://app.invoicequ.my.id/subscription\" style=\"display:inline-block;background:#DC2626;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:bold;\">Perpanjang Langganan Sekarang</a>
            </p>

            <p style=\"color:#6B7280;font-size:13px;\">Jika ada pertanyaan, jangan ragu untuk menghubungi kami melalui email atau WhatsApp.</p>

            <hr style=\"border:none;border-top:1px solid #E5E7EB;margin:24px 0;\" />
            <p style=\"color:#9CA3AF;font-size:12px;\">Email ini dikirim otomatis oleh sistem InvoiceQu.</p>
        </div>",
        greeting_name,
        plan_name,
        expired_date,
    )
}

async fn build_usage_snapshot(
    env: &Env,
    subscription_db: &NeonClient,
    claims: &JwtClaims,
) -> Result<UsageSnapshot> {
    ensure_free_subscription_when_missing_or_pending(subscription_db, &claims.user_id).await?;

    let row: Option<serde_json::Value> = subscription_db
        .query_one(
            "SELECT
                s.user_id,
                s.plan_id,
                COALESCE(s.invoices_used, 0) AS invoices_used,
                COALESCE(s.clients_used, 0) AS clients_used,
                COALESCE(s.payment_links_used, 0) AS payment_links_used,
                p.name AS plan_name,
                p.display_name AS plan_display_name,
                COALESCE(p.price, 0) AS plan_price,
                COALESCE(p.max_invoices, 5) AS max_invoices,
                COALESCE(p.max_clients, 10) AS max_clients,
                COALESCE(p.max_payment_links, 5) AS max_payment_links
             FROM subscriptions s
             JOIN subscription_plans p ON p.id = s.plan_id
             WHERE s.user_id=$1",
            &[serde_json::json!(claims.user_id)],
        )
        .await?;

    let row = row.ok_or_else(|| Error::RustError("Subscription not found".into()))?;
    let counter_invoices = value_i64(&row, "invoices_used", 0);
    let counter_clients = value_i64(&row, "clients_used", 0);
    let counter_payment_links = value_i64(&row, "payment_links_used", 0);

    let invoices_used = count_user_rows_or_counter(
        env,
        "INVOICE_DB_URL",
        "SELECT COUNT(*) FROM invoices WHERE user_id=$1",
        &claims.user_id,
        counter_invoices,
        "invoice usage",
    )
    .await;
    let clients_used = count_user_rows_or_counter(
        env,
        "CLIENT_DB_URL",
        "SELECT COUNT(*) FROM clients WHERE user_id=$1",
        &claims.user_id,
        counter_clients,
        "client usage",
    )
    .await;
    let payment_links_used = count_user_rows_or_counter(
        env,
        "PAYMENT_DB_URL",
        "SELECT COUNT(*) FROM payment_links WHERE user_id=$1",
        &claims.user_id,
        counter_payment_links,
        "payment link usage",
    )
    .await;

    sync_subscription_counters(
        subscription_db,
        &claims.user_id,
        invoices_used,
        clients_used,
        payment_links_used,
    )
    .await;

    let invoices_limit = value_i64(&row, "max_invoices", 5);
    let clients_limit = value_i64(&row, "max_clients", 10);
    let payment_links_limit = value_i64(&row, "max_payment_links", 5);

    let mut snapshot = UsageSnapshot {
        invoices_used,
        invoices_limit,
        clients_used,
        clients_limit,
        payment_links_used,
        payment_links_limit,
        can_create_invoice: can_create(invoices_used, invoices_limit),
        can_create_client: can_create(clients_used, clients_limit),
        can_create_payment: can_create(payment_links_used, payment_links_limit),
        plan_id: value_string(&row, "plan_id"),
        plan_name: value_string(&row, "plan_name"),
        plan_display_name: value_string(&row, "plan_display_name"),
        plan_price: value_f64(&row, "plan_price", 0.0),
        locked_resources: Vec::new(),
    };

    snapshot.locked_resources = locked_resources(&snapshot)
        .into_iter()
        .map(|resource| resource.key().to_string())
        .collect();

    Ok(snapshot)
}

async fn count_user_rows_or_counter(
    env: &Env,
    secret_name: &str,
    sql: &str,
    user_id: &str,
    fallback: i64,
    label: &str,
) -> i64 {
    match count_user_rows(env, secret_name, sql, user_id).await {
        Ok(count) => count,
        Err(err) => {
            console_log!(
                "[subscriptions] using counter fallback for {}: {}",
                label,
                err
            );
            fallback
        }
    }
}

async fn count_user_rows(env: &Env, secret_name: &str, sql: &str, user_id: &str) -> Result<i64> {
    let url = utils::get_secret(env, secret_name);
    if url.trim().is_empty() {
        return Err(Error::RustError(format!(
            "{} is not configured",
            secret_name
        )));
    }

    let db = NeonClient::from_connection_string(&url)?;
    db.query_scalar(sql, &[serde_json::json!(user_id)]).await
}

async fn sync_subscription_counters(
    db: &NeonClient,
    user_id: &str,
    invoices_used: i64,
    clients_used: i64,
    payment_links_used: i64,
) {
    if let Err(err) = db
        .execute(
            "UPDATE subscriptions
             SET invoices_used=$2, clients_used=$3, payment_links_used=$4, updated_at=NOW()
             WHERE user_id=$1",
            &[
                serde_json::json!(user_id),
                serde_json::json!(invoices_used),
                serde_json::json!(clients_used),
                serde_json::json!(payment_links_used),
            ],
        )
        .await
    {
        console_log!("[subscriptions] failed to sync usage counters: {}", err);
    }
}

fn can_create(used: i64, limit: i64) -> bool {
    limit < 0 || used < limit
}

fn resource_state(snapshot: &UsageSnapshot, resource: UsageResource) -> UsageResourceState {
    let (used, limit, allowed) = match resource {
        UsageResource::Invoices => (
            snapshot.invoices_used,
            snapshot.invoices_limit,
            snapshot.can_create_invoice,
        ),
        UsageResource::Clients => (
            snapshot.clients_used,
            snapshot.clients_limit,
            snapshot.can_create_client,
        ),
        UsageResource::PaymentLinks => (
            snapshot.payment_links_used,
            snapshot.payment_links_limit,
            snapshot.can_create_payment,
        ),
    };

    UsageResourceState {
        used,
        limit,
        allowed,
    }
}

fn locked_resources(snapshot: &UsageSnapshot) -> Vec<UsageResource> {
    [
        UsageResource::Invoices,
        UsageResource::Clients,
        UsageResource::PaymentLinks,
    ]
    .into_iter()
    .filter(|resource| !resource_state(snapshot, *resource).allowed)
    .collect()
}

fn upgrade_message(resource: UsageResource) -> String {
    format!(
        "Upgrade plan untuk {} tanpa batas yang menghambat workflow Anda.",
        resource.recommendation_copy()
    )
}

async fn send_upgrade_recommendation_email(
    env: &Env,
    db: &NeonClient,
    claims: &JwtClaims,
    snapshot: &UsageSnapshot,
    resource: UsageResource,
) -> Result<UpgradeEmailOutcome> {
    if claims.email.trim().is_empty() {
        return Ok(UpgradeEmailOutcome::Skipped);
    }

    ensure_upgrade_recommendations_table(db).await?;

    if upgrade_recommendation_recently_sent(db, &claims.user_id, resource, &snapshot.plan_id)
        .await?
    {
        return Ok(UpgradeEmailOutcome::Skipped);
    }

    let state = resource_state(snapshot, resource);
    let recommendation = recommend_upgrade_plan(db, snapshot, resource).await;
    let subject = format!(
        "Rekomendasi upgrade InvoiceQu untuk {} Anda",
        resource.label()
    );
    let html = build_upgrade_recommendation_html(env, snapshot, resource, &state, &recommendation);

    match notification::send_email_via_resend(env, &claims.email, &subject, &html).await {
        Ok(()) => {
            record_upgrade_recommendation(
                db,
                &claims.user_id,
                resource,
                snapshot,
                &state,
                &recommendation,
                "sent",
                None,
            )
            .await;
            Ok(UpgradeEmailOutcome::Sent)
        }
        Err(err) => {
            console_log!(
                "[subscriptions] upgrade recommendation email failed: {}",
                err
            );
            record_upgrade_recommendation(
                db,
                &claims.user_id,
                resource,
                snapshot,
                &state,
                &recommendation,
                "failed",
                Some(err.to_string()),
            )
            .await;
            Ok(UpgradeEmailOutcome::Failed)
        }
    }
}

async fn ensure_upgrade_recommendations_table(db: &NeonClient) -> Result<()> {
    db.execute(
        "CREATE TABLE IF NOT EXISTS subscription_upgrade_recommendations (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            resource VARCHAR(32) NOT NULL,
            plan_id VARCHAR(64) NOT NULL,
            used_count INTEGER NOT NULL,
            limit_count INTEGER NOT NULL,
            recommended_plan VARCHAR(100) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            last_error TEXT DEFAULT '',
            sent_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )",
        &[],
    )
    .await?;

    db.execute(
        "CREATE INDEX IF NOT EXISTS idx_subscription_upgrade_recommendations_lookup
         ON subscription_upgrade_recommendations (user_id, resource, plan_id, sent_at DESC)",
        &[],
    )
    .await?;

    Ok(())
}

async fn upgrade_recommendation_recently_sent(
    db: &NeonClient,
    user_id: &str,
    resource: UsageResource,
    plan_id: &str,
) -> Result<bool> {
    let count: i64 = db
        .query_scalar(
            "SELECT COUNT(*)
             FROM subscription_upgrade_recommendations
             WHERE user_id=$1
               AND resource=$2
               AND plan_id=$3
               AND status='sent'
               AND sent_at > NOW() - INTERVAL '30 days'",
            &[
                serde_json::json!(user_id),
                serde_json::json!(resource.key()),
                serde_json::json!(plan_id),
            ],
        )
        .await?;

    Ok(count > 0)
}

async fn recommend_upgrade_plan(
    db: &NeonClient,
    snapshot: &UsageSnapshot,
    resource: UsageResource,
) -> UpgradeRecommendation {
    let row: Option<serde_json::Value> = db
        .query_one(
            "SELECT name, display_name, price, max_invoices, max_clients, max_payment_links
             FROM subscription_plans
             WHERE is_active=true AND price > $1
             ORDER BY price ASC
             LIMIT 1",
            &[serde_json::json!(snapshot.plan_price)],
        )
        .await
        .ok()
        .flatten();

    match row {
        Some(row) => UpgradeRecommendation {
            name: value_string(&row, "name"),
            display_name: value_string(&row, "display_name"),
            price: value_f64(&row, "price", 0.0),
            resource_limit: match resource {
                UsageResource::Invoices => value_i64(&row, "max_invoices", -1),
                UsageResource::Clients => value_i64(&row, "max_clients", -1),
                UsageResource::PaymentLinks => value_i64(&row, "max_payment_links", -1),
            },
        },
        None => UpgradeRecommendation {
            name: "enterprise".into(),
            display_name: "Enterprise".into(),
            price: 0.0,
            resource_limit: -1,
        },
    }
}

async fn record_upgrade_recommendation(
    db: &NeonClient,
    user_id: &str,
    resource: UsageResource,
    snapshot: &UsageSnapshot,
    state: &UsageResourceState,
    recommendation: &UpgradeRecommendation,
    status: &str,
    last_error: Option<String>,
) {
    let id = utils::generate_id();
    let sent_at = if status == "sent" {
        serde_json::json!(chrono::Utc::now().to_rfc3339())
    } else {
        serde_json::Value::Null
    };

    if let Err(err) = db
        .execute(
            "INSERT INTO subscription_upgrade_recommendations
                (id, user_id, resource, plan_id, used_count, limit_count, recommended_plan, status, last_error, sent_at, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::timestamptz,NOW(),NOW())",
            &[
                serde_json::json!(id),
                serde_json::json!(user_id),
                serde_json::json!(resource.key()),
                serde_json::json!(snapshot.plan_id),
                serde_json::json!(state.used),
                serde_json::json!(state.limit),
                serde_json::json!(recommendation.display_name),
                serde_json::json!(status),
                serde_json::json!(last_error.unwrap_or_default()),
                sent_at,
            ],
        )
        .await
    {
        console_log!("[subscriptions] failed to record upgrade recommendation: {}", err);
    }
}

fn build_upgrade_recommendation_html(
    env: &Env,
    snapshot: &UsageSnapshot,
    resource: UsageResource,
    state: &UsageResourceState,
    recommendation: &UpgradeRecommendation,
) -> String {
    let plan_name = if snapshot.plan_display_name.trim().is_empty() {
        &snapshot.plan_name
    } else {
        &snapshot.plan_display_name
    };
    let recommended_plan = if recommendation.display_name.trim().is_empty() {
        &recommendation.name
    } else {
        &recommendation.display_name
    };
    let subscription_url = format!("{}/subscription", frontend_url(env));
    let recommended_limit = format_limit(recommendation.resource_limit);
    let current_limit = format_limit(state.limit);
    let price_line = if recommendation.price > 0.0 {
        format!(
            "<p style=\"margin:0 0 8px;\"><strong>Harga mulai</strong>: Rp{}/bulan</p>",
            recommendation.price.round() as i64
        )
    } else {
        "<p style=\"margin:0 0 8px;\"><strong>Harga</strong>: Custom sesuai kebutuhan tim Anda</p>"
            .to_string()
    };

    format!(
        "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px;margin:0 auto;padding:24px;\">
            <h2 style=\"margin:0 0 16px;\">Saatnya upgrade plan InvoiceQu</h2>
            <p>Halo,</p>
            <p>Penggunaan <strong>{}</strong> Anda pada plan <strong>{}</strong> sudah mencapai batas: <strong>{}/{}</strong>.</p>
            <div style=\"border:1px solid #E5E7EB;border-radius:12px;padding:16px;margin:20px 0;background:#F9FAFB;\">
                <p style=\"margin:0 0 8px;\"><strong>Plan sekarang</strong>: {}</p>
                <p style=\"margin:0 0 8px;\"><strong>Rekomendasi</strong>: Upgrade ke {}</p>
                {}
                <p style=\"margin:0;\"><strong>Kapasitas {} di plan rekomendasi</strong>: {}</p>
            </div>
            <p>Dengan upgrade, Anda bisa lanjut {} tanpa harus menghapus data lama.</p>
            <p style=\"margin:24px 0;\">
                <a href=\"{}\" style=\"display:inline-block;background:#DC2626;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;\">Lihat Plan Upgrade</a>
            </p>
            <p style=\"color:#6B7280;font-size:14px;\">Email ini dikirim karena limit fitur Anda tercapai. Kalau sudah upgrade, email ini bisa diabaikan.</p>
        </div>",
        html_escape(resource.label()),
        html_escape(plan_name),
        state.used,
        html_escape(&current_limit),
        html_escape(plan_name),
        html_escape(recommended_plan),
        price_line,
        html_escape(resource.label()),
        html_escape(&recommended_limit),
        html_escape(resource.recommendation_copy()),
        html_escape(&subscription_url)
    )
}

fn format_limit(limit: i64) -> String {
    if limit < 0 {
        "Unlimited".into()
    } else {
        limit.to_string()
    }
}

fn value_string(row: &serde_json::Value, key: &str) -> String {
    row.get(key)
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string()
}

fn value_i64(row: &serde_json::Value, key: &str, default: i64) -> i64 {
    row.get(key)
        .and_then(|v| v.as_i64().or_else(|| v.as_f64().map(|n| n as i64)))
        .unwrap_or(default)
}

fn value_f64(row: &serde_json::Value, key: &str, default: f64) -> f64 {
    row.get(key).and_then(|v| v.as_f64()).unwrap_or(default)
}

fn html_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

async fn ensure_subscription_transactions_table(db: &NeonClient) -> Result<()> {
    db.execute(
        "CREATE TABLE IF NOT EXISTS subscription_transactions (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            plan_id VARCHAR(64) NOT NULL REFERENCES subscription_plans(id),
            amount DOUBLE PRECISION NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            checkout_url TEXT,
            external_id VARCHAR(100),
            xendit_id VARCHAR(100),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )",
        &[],
    )
    .await?;
    db.execute(
        "CREATE INDEX IF NOT EXISTS idx_sub_tx_external_id ON subscription_transactions(external_id)",
        &[],
    )
    .await?;
    db.execute(
        "CREATE INDEX IF NOT EXISTS idx_sub_tx_user_id ON subscription_transactions(user_id)",
        &[],
    )
    .await?;

    Ok(())
}

async fn ensure_free_subscription_when_missing_or_pending(
    db: &NeonClient,
    user_id: &str,
) -> Result<()> {
    let id = utils::generate_id();
    db.execute(
        "INSERT INTO subscriptions (id,user_id,plan_id,status,current_period_start,current_period_end,invoices_used,clients_used,payment_links_used,created_at,updated_at)
         VALUES ($1,$2,'plan_free','active',NOW(),NOW()+INTERVAL '100 years',0,0,0,NOW(),NOW())
         ON CONFLICT (user_id) DO UPDATE SET
            plan_id='plan_free',
            status='active',
            current_period_start=NOW(),
            current_period_end=NOW()+INTERVAL '100 years',
            updated_at=NOW()
         WHERE subscriptions.status='pending'",
        &[serde_json::json!(id), serde_json::json!(user_id)],
    )
    .await?;

    Ok(())
}

async fn activate_subscription(db: &NeonClient, user_id: &str, plan_id: &str) -> Result<()> {
    let id = utils::generate_id();
    db.execute(
        "INSERT INTO subscriptions (id,user_id,plan_id,status,current_period_start,current_period_end,invoices_used,clients_used,payment_links_used,created_at,updated_at)
         VALUES ($1,$2,$3,'active',NOW(),NOW()+INTERVAL '30 days',0,0,0,NOW(),NOW())
         ON CONFLICT (user_id) DO UPDATE SET
            plan_id=$3,
            status='active',
            current_period_start=NOW(),
            current_period_end=NOW()+INTERVAL '30 days',
            updated_at=NOW()",
        &[
            serde_json::json!(id),
            serde_json::json!(user_id),
            serde_json::json!(plan_id),
        ],
    )
    .await?;

    Ok(())
}

async fn create_xendit_invoice(
    env: &Env,
    api_key: &str,
    plan: &SubscriptionPlan,
    user_email: &str,
    external_id: &str,
) -> Result<(String, String)> {
    let url = format!("{}/v2/invoices", xendit_base_url(env));
    let mut payload = serde_json::json!({
        "external_id": external_id,
        "amount": plan.price,
        "description": format!("InvoiceQu {} Plan - Monthly Subscription", plan.display_name),
        "currency": plan.currency,
        "invoice_duration": 86400,
        "success_redirect_url": format!("{}/checkout/success?plan={}&ext={}", landing_url(env), plan.name, external_id),
        "failure_redirect_url": format!("{}/checkout?plan={}&status=failed", landing_url(env), plan.name),
        "items": [{
            "name": format!("Paket {} - Langganan Bulanan", plan.display_name),
            "quantity": 1,
            "price": plan.price,
        }],
    });

    if !user_email.is_empty() {
        if let Some(obj) = payload.as_object_mut() {
            obj.insert(
                "customer".to_string(),
                serde_json::json!({ "email": user_email }),
            );
        }
    }

    let credentials = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        format!("{}:", api_key),
    );
    let headers = Headers::new();
    headers.set("Authorization", &format!("Basic {}", credentials))?;
    headers.set("Content-Type", "application/json")?;

    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_headers(headers);
    init.with_body(Some(wasm_bindgen::JsValue::from_str(
        &serde_json::to_string(&payload).unwrap(),
    )));

    let request = Request::new_with_init(&url, &init)?;
    let mut resp = Fetch::Request(request).send().await?;
    let status_code = resp.status_code();
    let result: serde_json::Value = resp.json().await?;

    if status_code >= 400 {
        return Err(Error::RustError(format!(
            "Xendit create invoice failed ({}): {}",
            status_code, result
        )));
    }

    let checkout_url = result
        .get("invoice_url")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let xendit_id = result
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if checkout_url.is_empty() || xendit_id.is_empty() {
        return Err(Error::RustError(format!(
            "Xendit invoice response missing invoice_url/id: {}",
            result
        )));
    }

    Ok((checkout_url, xendit_id))
}

async fn fetch_xendit_invoice_status(env: &Env, api_key: &str, invoice_id: &str) -> Result<String> {
    let url = format!("{}/v2/invoices/{}", xendit_base_url(env), invoice_id);
    let credentials = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        format!("{}:", api_key),
    );

    let headers = Headers::new();
    headers.set("Authorization", &format!("Basic {}", credentials))?;

    let mut init = RequestInit::new();
    init.with_method(Method::Get);
    init.with_headers(headers);

    let request = Request::new_with_init(&url, &init)?;
    let mut resp = Fetch::Request(request).send().await?;
    let status_code = resp.status_code();
    let result: serde_json::Value = resp.json().await?;

    if status_code >= 400 {
        return Err(Error::RustError(format!(
            "Xendit get invoice failed ({}): {}",
            status_code, result
        )));
    }

    Ok(result
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("UNKNOWN")
        .to_ascii_uppercase())
}

fn xendit_base_url(env: &Env) -> String {
    env.var("XENDIT_BASE_URL")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://api.xendit.co".into())
}

fn frontend_url(env: &Env) -> String {
    env.var("FRONTEND_URL")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://app.invoicequ.my.id".into())
        .trim_end_matches('/')
        .to_string()
}

fn landing_url(env: &Env) -> String {
    env.var("LANDING_URL")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://invoicequ.my.id".into())
        .trim_end_matches('/')
        .to_string()
}

fn is_xendit_public_key(value: &str) -> bool {
    value.trim_start().starts_with("xnd_public_")
}

fn get_auth_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "AUTH_DB_URL");
    NeonClient::from_connection_string(&url)
}

fn get_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "SUBSCRIPTION_DB_URL");
    NeonClient::from_connection_string(&url)
}
