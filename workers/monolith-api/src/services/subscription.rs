//! Subscription service module — plans, user subscriptions, checkout.
//! Mirrors: services/subscription-service (Go)

use serde::{Deserialize, Serialize};
use worker::*;
use crate::db::NeonClient;
use crate::middleware::JwtClaims;
use crate::utils;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionPlan {
    pub id: String,
    pub name: String,
    pub display_name: String,
    #[serde(default)] pub price: f64,
    #[serde(default)] pub currency: String,
    #[serde(default)] pub billing_period: String,
    #[serde(default)] pub max_invoices: i32,
    #[serde(default)] pub max_clients: i32,
    #[serde(default)] pub max_payment_links: i32,
    #[serde(default)] pub features: String,
    #[serde(default)] pub is_active: bool,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subscription {
    pub id: String,
    pub user_id: String,
    pub plan_id: String,
    #[serde(default)] pub status: String,
    pub current_period_start: Option<String>,
    pub current_period_end: Option<String>,
    #[serde(default)] pub invoices_used: i32,
    #[serde(default)] pub clients_used: i32,
    #[serde(default)] pub payment_links_used: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

const PLAN_COLS: &str = "id, name, display_name, price, currency, billing_period, max_invoices, max_clients, max_payment_links, features, is_active, created_at::text";
const SUB_COLS: &str = "id, user_id, plan_id, status, current_period_start::text, current_period_end::text, invoices_used, clients_used, payment_links_used, created_at::text, updated_at::text";

pub async fn list_plans(env: &Env) -> Result<Response> {
    let db = get_db(env)?;
    let plans: Vec<SubscriptionPlan> = db.query_typed(
        &format!("SELECT {} FROM subscription_plans WHERE is_active=true ORDER BY price ASC", PLAN_COLS),
        &[],
    ).await?;
    utils::json_response(&plans, 200)
}

pub async fn get_current(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let sub: Option<serde_json::Value> = db.query_one(
        &format!("SELECT s.*, p.name as plan_name, p.display_name, p.max_invoices, p.max_clients, p.max_payment_links, p.features FROM subscriptions s JOIN subscription_plans p ON s.plan_id=p.id WHERE s.user_id=$1"),
        &[serde_json::json!(claims.user_id)],
    ).await?;

    match sub {
        Some(s) => utils::json_response(&s, 200),
        None => {
            // Auto-create free subscription
            let id = utils::generate_id();
            db.execute(
                "INSERT INTO subscriptions (id,user_id,plan_id,status,current_period_start,current_period_end,invoices_used,clients_used,payment_links_used,created_at,updated_at) VALUES ($1,$2,'plan_free','active',NOW(),NOW()+INTERVAL '100 years',0,0,0,NOW(),NOW()) ON CONFLICT (user_id) DO NOTHING",
                &[serde_json::json!(id), serde_json::json!(claims.user_id)],
            ).await?;

            let sub: Option<serde_json::Value> = db.query_one(
                "SELECT s.*, p.name as plan_name, p.display_name, p.max_invoices, p.max_clients, p.max_payment_links, p.features FROM subscriptions s JOIN subscription_plans p ON s.plan_id=p.id WHERE s.user_id=$1",
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
    let sub: Option<Subscription> = db.query_one(
        &format!("SELECT {} FROM subscriptions WHERE user_id=$1", SUB_COLS),
        &[serde_json::json!(claims.user_id)],
    ).await?;

    match sub {
        Some(s) => utils::json_response(&serde_json::json!({
            "invoices_used": s.invoices_used,
            "clients_used": s.clients_used,
            "payment_links_used": s.payment_links_used,
        }), 200),
        None => utils::json_response(&serde_json::json!({
            "invoices_used": 0, "clients_used": 0, "payment_links_used": 0,
        }), 200),
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
                "invoices" => (r.get("invoices_used").and_then(|v| v.as_i64()).unwrap_or(0),
                               r.get("max_invoices").and_then(|v| v.as_i64()).unwrap_or(5)),
                "clients" => (r.get("clients_used").and_then(|v| v.as_i64()).unwrap_or(0),
                              r.get("max_clients").and_then(|v| v.as_i64()).unwrap_or(10)),
                "payment_links" => (r.get("payment_links_used").and_then(|v| v.as_i64()).unwrap_or(0),
                                    r.get("max_payment_links").and_then(|v| v.as_i64()).unwrap_or(5)),
                _ => (0, 999),
            };
            max < 0 || used < max // -1 means unlimited
        }
        None => true, // No subscription = allow (will auto-create free)
    };

    utils::json_response(&serde_json::json!({"allowed": allowed, "resource": resource}), 200)
}

pub async fn subscribe(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let plan_id = body.get("plan_id").and_then(|v| v.as_str()).unwrap_or("");
    if plan_id.is_empty() { return utils::json_error("plan_id is required", 400); }

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
        &format!("UPDATE subscriptions SET {}={}+1, updated_at=NOW() WHERE user_id=$1", col, col),
        &[serde_json::json!(claims.user_id)],
    ).await?;

    utils::json_response(&serde_json::json!({"message": "Usage incremented"}), 200)
}

pub async fn create_checkout(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let plan_id = body.get("plan_id").and_then(|v| v.as_str()).unwrap_or("");
    if plan_id.is_empty() { return utils::json_error("plan_id required", 400); }

    let db = get_db(env)?;
    let plan: Option<SubscriptionPlan> = db.query_one(
        &format!("SELECT {} FROM subscription_plans WHERE id=$1", PLAN_COLS),
        &[serde_json::json!(plan_id)],
    ).await?;

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

    utils::json_response(&serde_json::json!({
        "external_id": external_id,
        "plan": plan,
        "checkout_url": format!("https://app.invoicequ.my.id/subscription/checkout/{}", external_id),
    }), 200)
}

pub async fn checkout_status(env: &Env, external_id: &str) -> Result<Response> {
    // Extract subscription ID from external_id
    let sub_id = external_id.trim_start_matches("SUB-");
    let db = get_db(env)?;
    let sub: Option<Subscription> = db.query_one(
        &format!("SELECT {} FROM subscriptions WHERE id=$1", SUB_COLS),
        &[serde_json::json!(sub_id)],
    ).await?;

    match sub {
        Some(s) => utils::json_response(&serde_json::json!({"status": s.status, "id": s.id}), 200),
        None => utils::json_error("Checkout not found", 404),
    }
}

pub async fn handle_webhook(mut req: Request, env: &Env) -> Result<Response> {
    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let external_id = body.get("external_id").and_then(|v| v.as_str()).unwrap_or("");
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

// Admin endpoints
pub async fn list_all(env: &Env, claims: &JwtClaims) -> Result<Response> {
    if claims.role != "admin" { return utils::json_error("Forbidden", 403); }
    let db = get_db(env)?;
    let subs: Vec<Subscription> = db.query_typed(
        &format!("SELECT {} FROM subscriptions ORDER BY created_at DESC", SUB_COLS), &[],
    ).await?;
    utils::json_response(&serde_json::json!({"data": subs}), 200)
}

pub async fn update_plan(mut req: Request, env: &Env, claims: &JwtClaims, plan_id: &str) -> Result<Response> {
    if claims.role != "admin" { return utils::json_error("Forbidden", 403); }
    let body: serde_json::Value = req.json().await?;
    let db = get_db(env)?;

    let price = body.get("price").and_then(|v| v.as_f64());
    let max_inv = body.get("max_invoices").and_then(|v| v.as_i64());
    let max_cli = body.get("max_clients").and_then(|v| v.as_i64());
    let max_pl = body.get("max_payment_links").and_then(|v| v.as_i64());

    if let Some(p) = price {
        db.execute("UPDATE subscription_plans SET price=$1 WHERE id=$2", &[serde_json::json!(p), serde_json::json!(plan_id)]).await?;
    }
    if let Some(v) = max_inv {
        db.execute("UPDATE subscription_plans SET max_invoices=$1 WHERE id=$2", &[serde_json::json!(v), serde_json::json!(plan_id)]).await?;
    }
    if let Some(v) = max_cli {
        db.execute("UPDATE subscription_plans SET max_clients=$1 WHERE id=$2", &[serde_json::json!(v), serde_json::json!(plan_id)]).await?;
    }
    if let Some(v) = max_pl {
        db.execute("UPDATE subscription_plans SET max_payment_links=$1 WHERE id=$2", &[serde_json::json!(v), serde_json::json!(plan_id)]).await?;
    }

    utils::json_response(&serde_json::json!({"message": "Plan updated"}), 200)
}

fn get_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "SUBSCRIPTION_DB_URL");
    NeonClient::from_connection_string(&url)
}
