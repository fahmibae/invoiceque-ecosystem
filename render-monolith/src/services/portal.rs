//! Client Portal service — public token-based access for clients to view their invoices/quotations.

use crate::error::AppError;
use crate::middleware::Auth;
use crate::utils;
use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortalToken {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub client_id: String,
    #[serde(default)]
    pub token: String,
    #[serde(default)]
    pub client_name: String,
    #[serde(default)]
    pub client_email: String,
    #[serde(default)]
    pub is_active: bool,
    pub created_at: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize)]
struct PortalDashboard {
    client: PortalClientInfo,
    invoices: Vec<PortalInvoice>,
    quotations: Vec<PortalQuotation>,
    stats: PortalStats,
}

#[derive(Debug, Serialize)]
struct PortalClientInfo {
    name: String,
    email: String,
    company: String,
    business_name: String,
    business_logo: String,
    accent_color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PortalInvoice {
    id: String,
    #[serde(default)]
    invoice_number: String,
    #[serde(default)]
    total: f64,
    #[serde(default)]
    amount_paid: f64,
    #[serde(default)]
    amount_remaining: f64,
    #[serde(default)]
    status: String,
    #[serde(default)]
    currency: String,
    #[serde(default)]
    due_date: String,
    #[serde(default)]
    payment_link: String,
    pub created_at: Option<String>,
    pub paid_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PortalQuotation {
    id: String,
    #[serde(default)]
    quotation_number: String,
    #[serde(default)]
    total: f64,
    #[serde(default)]
    status: String,
    #[serde(default)]
    currency: String,
    #[serde(default)]
    valid_until: String,
    #[serde(default)]
    accept_token: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize)]
struct PortalStats {
    total_invoices: i64,
    total_paid: f64,
    total_outstanding: f64,
    total_quotations: i64,
}

fn db(http: &reqwest::Client) -> Result<crate::db::NeonClient, AppError> {
    utils::get_db("INVOICE_DB_URL", http)
}

fn client_db(http: &reqwest::Client) -> Result<crate::db::NeonClient, AppError> {
    utils::get_db("CLIENT_DB_URL", http)
}

async fn ensure_table(db: &crate::db::NeonClient) -> Result<(), AppError> {
    db.execute(
        "CREATE TABLE IF NOT EXISTS client_portal_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            client_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            client_name TEXT NOT NULL DEFAULT '',
            client_email TEXT NOT NULL DEFAULT '',
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ
        )",
        &[],
    )
    .await?;
    Ok(())
}

/// Generate or get existing portal link for a client
pub async fn generate_portal_link(
    path: web::Path<String>,
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let client_id = path.into_inner();
    let db = db(&http)?;
    ensure_table(&db).await?;

    // Check if there's an existing active token
    let existing: Option<PortalToken> = db
        .query_one(
            "SELECT id, user_id, client_id, token, client_name, client_email, is_active, created_at::text, expires_at::text FROM client_portal_tokens WHERE user_id=$1 AND client_id=$2 AND is_active=true",
            &[serde_json::json!(auth.0.user_id), serde_json::json!(client_id)],
        )
        .await?;

    if let Some(t) = existing {
        return utils::json_response(&t, 200);
    }

    // Get client info from client DB
    let cdb = client_db(&http)?;
    let client_info: Option<serde_json::Value> = cdb
        .query_one(
            "SELECT name, email FROM clients WHERE id=$1 AND user_id=$2",
            &[serde_json::json!(client_id), serde_json::json!(auth.0.user_id)],
        )
        .await?;
    let (client_name, client_email) = match client_info {
        Some(c) => (
            c.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            c.get("email").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        ),
        None => return utils::json_error("Client not found", 404),
    };

    let id = utils::generate_id();
    let token = utils::generate_id();
    db.execute(
        "INSERT INTO client_portal_tokens (id, user_id, client_id, token, client_name, client_email) VALUES ($1,$2,$3,$4,$5,$6)",
        &[
            serde_json::json!(id), serde_json::json!(auth.0.user_id), serde_json::json!(client_id),
            serde_json::json!(token), serde_json::json!(client_name), serde_json::json!(client_email),
        ],
    )
    .await?;

    let created: Option<PortalToken> = db
        .query_one(
            "SELECT id, user_id, client_id, token, client_name, client_email, is_active, created_at::text, expires_at::text FROM client_portal_tokens WHERE id=$1",
            &[serde_json::json!(id)],
        )
        .await?;
    match created {
        Some(t) => utils::json_response(&t, 201),
        None => utils::json_error("Failed to create portal link", 500),
    }
}

/// Revoke portal link
pub async fn revoke_portal_link(
    path: web::Path<String>,
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let client_id = path.into_inner();
    let db = db(&http)?;
    db.execute(
        "UPDATE client_portal_tokens SET is_active=false WHERE user_id=$1 AND client_id=$2",
        &[serde_json::json!(auth.0.user_id), serde_json::json!(client_id)],
    )
    .await?;
    utils::json_response(&serde_json::json!({"message": "Portal link revoked"}), 200)
}

/// List all portal tokens for user
pub async fn list_portal_links(
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let db = db(&http)?;
    ensure_table(&db).await?;
    let tokens: Vec<PortalToken> = db
        .query_typed(
            "SELECT id, user_id, client_id, token, client_name, client_email, is_active, created_at::text, expires_at::text FROM client_portal_tokens WHERE user_id=$1 AND is_active=true ORDER BY created_at DESC",
            &[serde_json::json!(auth.0.user_id)],
        )
        .await?;
    utils::json_response(&serde_json::json!({"data": tokens}), 200)
}

/// Public: Get client portal dashboard by token
pub async fn get_portal(
    path: web::Path<String>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let token = path.into_inner();
    let db = db(&http)?;
    ensure_table(&db).await?;

    let pt: Option<PortalToken> = db
        .query_one(
            "SELECT id, user_id, client_id, token, client_name, client_email, is_active, created_at::text, expires_at::text FROM client_portal_tokens WHERE token=$1 AND is_active=true",
            &[serde_json::json!(token)],
        )
        .await?;
    let pt = match pt {
        Some(t) => t,
        None => return utils::json_error("Portal not found or expired", 404),
    };

    // Get business info
    let settings: Option<serde_json::Value> = db
        .query_one(
            "SELECT business_name, COALESCE(logo_url,'') as logo_url, accent_color FROM invoice_settings WHERE user_id=$1",
            &[serde_json::json!(pt.user_id)],
        )
        .await
        .unwrap_or(None);
    let biz_name = settings.as_ref().and_then(|s| s.get("business_name")).and_then(|v| v.as_str()).unwrap_or("").to_string();
    let biz_logo = settings.as_ref().and_then(|s| s.get("logo_url")).and_then(|v| v.as_str()).unwrap_or("").to_string();
    let accent = settings.as_ref().and_then(|s| s.get("accent_color")).and_then(|v| v.as_str()).unwrap_or("#DC2626").to_string();

    // Get invoices for this client
    let invoices: Vec<PortalInvoice> = db
        .query_typed(
            "SELECT id, invoice_number, total, amount_paid, amount_remaining, status, currency, due_date, COALESCE(payment_link,'') as payment_link, created_at::text, paid_at::text FROM invoices WHERE user_id=$1 AND client_id=$2 ORDER BY created_at DESC",
            &[serde_json::json!(pt.user_id), serde_json::json!(pt.client_id)],
        )
        .await
        .unwrap_or_default();

    // Get quotations for this client
    let quotations: Vec<PortalQuotation> = db
        .query_typed(
            "SELECT id, quotation_number, total, status, currency, valid_until, accept_token, created_at::text FROM quotations WHERE user_id=$1 AND client_id=$2 ORDER BY created_at DESC",
            &[serde_json::json!(pt.user_id), serde_json::json!(pt.client_id)],
        )
        .await
        .unwrap_or_default();

    let total_paid: f64 = invoices.iter().map(|i| i.amount_paid).sum();
    let total_outstanding: f64 = invoices.iter().filter(|i| i.status != "paid" && i.status != "draft").map(|i| i.amount_remaining).sum();

    let dashboard = PortalDashboard {
        client: PortalClientInfo {
            name: pt.client_name.clone(),
            email: pt.client_email.clone(),
            company: String::new(),
            business_name: biz_name,
            business_logo: biz_logo,
            accent_color: accent,
        },
        stats: PortalStats {
            total_invoices: invoices.len() as i64,
            total_paid,
            total_outstanding,
            total_quotations: quotations.len() as i64,
        },
        invoices,
        quotations,
    };

    utils::json_response(&dashboard, 200)
}
