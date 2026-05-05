//! Payment service — payment links, PayPal, Xendit, webhooks.

use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use crate::db::NeonClient;
use crate::error::AppError;
use crate::middleware::Auth;
use crate::utils;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentLink {
    pub id: String,
    #[serde(default)] pub user_id: String,
    #[serde(default)] pub title: String,
    #[serde(default)] pub description: String,
    #[serde(default)] pub amount: f64,
    #[serde(default)] pub currency: String,
    #[serde(default)] pub status: String,
    #[serde(default)] pub url: String,
    #[serde(default)] pub clicks: i32,
    #[serde(default)] pub payments: i32,
    pub invoice_id: Option<String>,
    pub payment_provider: Option<String>,
    pub provider_order_id: Option<String>,
    pub expires_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

const PL_COLS: &str = "id, user_id, title, description, amount, currency, status, url, clicks, payments, invoice_id, payment_provider, provider_order_id, expires_at::text, created_at::text, updated_at::text";

fn db(http: &reqwest::Client) -> Result<NeonClient, AppError> { utils::get_db("PAYMENT_DB_URL", http) }

pub async fn list(req: HttpRequest, auth: Auth, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let (page, per_page) = utils::parse_pagination(req.query_string());
    let offset = (page - 1) * per_page;
    let db = db(&http)?;
    let total: i64 = db.query_scalar("SELECT COUNT(*) FROM payment_links WHERE user_id=$1", &[serde_json::json!(auth.0.user_id)]).await?;
    let links: Vec<PaymentLink> = db.query_typed(&format!("SELECT {} FROM payment_links WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", PL_COLS),
        &[serde_json::json!(auth.0.user_id), serde_json::json!(per_page), serde_json::json!(offset)]).await?;
    let total_pages = ((total as i32) + per_page - 1) / per_page;
    utils::json_response(&serde_json::json!({"data": links, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}), 200)
}

pub async fn get(path: web::Path<String>, auth: Auth, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    let link: Option<PaymentLink> = db.query_one(&format!("SELECT {} FROM payment_links WHERE id=$1 AND user_id=$2", PL_COLS),
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    match link { Some(l) => utils::json_response(&l, 200), None => utils::json_error("Payment link not found", 404) }
}

pub async fn create(auth: Auth, body: web::Json<serde_json::Value>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let title = body.get("title").and_then(|v| v.as_str()).unwrap_or("");
    let amount = body.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
    if title.is_empty() { return utils::json_error("title required", 400); }
    let id = utils::generate_id();
    let base_url = utils::get_env("BASE_PAYMENT_URL");
    let base = if base_url.is_empty() { "https://app.invoicequ.my.id/pay".to_string() } else { base_url };
    let url = format!("{}/{}", base, id);
    let currency = body.get("currency").and_then(|v| v.as_str()).unwrap_or("IDR");
    let desc = body.get("description").and_then(|v| v.as_str()).unwrap_or("");
    let provider = body.get("payment_provider").and_then(|v| v.as_str());
    let invoice_id = body.get("invoice_id").and_then(|v| v.as_str());
    let db = db(&http)?;
    db.execute("INSERT INTO payment_links (id,user_id,title,description,amount,currency,status,url,clicks,payments,invoice_id,payment_provider,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,'active',$7,0,0,$8,$9,NOW(),NOW())",
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id), serde_json::json!(title), serde_json::json!(desc),
          serde_json::json!(amount), serde_json::json!(currency), serde_json::json!(url),
          serde_json::json!(invoice_id), serde_json::json!(provider)]).await?;
    let link: Option<PaymentLink> = db.query_one(&format!("SELECT {} FROM payment_links WHERE id=$1 AND user_id=$2", PL_COLS),
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    match link { Some(l) => utils::json_response(&l, 201), None => utils::json_error("Failed", 500) }
}

pub async fn update(path: web::Path<String>, auth: Auth, body: web::Json<serde_json::Value>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    let existing: Option<PaymentLink> = db.query_one(&format!("SELECT {} FROM payment_links WHERE id=$1 AND user_id=$2", PL_COLS),
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    let ex = match existing { Some(e) => e, None => return utils::json_error("Payment link not found", 404) };
    db.execute("UPDATE payment_links SET title=$1, description=$2, amount=$3, status=$4, updated_at=NOW() WHERE id=$5 AND user_id=$6",
        &[serde_json::json!(body.get("title").and_then(|v| v.as_str()).unwrap_or(&ex.title)),
          serde_json::json!(body.get("description").and_then(|v| v.as_str()).unwrap_or(&ex.description)),
          serde_json::json!(body.get("amount").and_then(|v| v.as_f64()).unwrap_or(ex.amount)),
          serde_json::json!(body.get("status").and_then(|v| v.as_str()).unwrap_or(&ex.status)),
          serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    let link: Option<PaymentLink> = db.query_one(&format!("SELECT {} FROM payment_links WHERE id=$1 AND user_id=$2", PL_COLS),
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    match link { Some(l) => utils::json_response(&l, 200), None => utils::json_error("Not found", 404) }
}

pub async fn delete(path: web::Path<String>, auth: Auth, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    db(&http)?.execute("DELETE FROM payment_links WHERE id=$1 AND user_id=$2", &[serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    utils::json_response(&serde_json::json!({"message": "Payment link deleted"}), 200)
}

pub async fn bulk_delete(auth: Auth, body: web::Json<serde_json::Value>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let ids: Vec<String> = body.get("ids").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
    if ids.is_empty() { return utils::json_error("ids is required", 400); }
    let deleted = db(&http)?.execute("DELETE FROM payment_links WHERE user_id=$1 AND id=ANY($2)",
        &[serde_json::json!(auth.0.user_id), serde_json::json!(utils::to_pg_array(&ids))]).await?;
    utils::json_response(&serde_json::json!({"message": "Deleted", "deleted": deleted}), 200)
}

// ── Public payment endpoints ──

pub async fn get_public(path: web::Path<String>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    db.execute("UPDATE payment_links SET clicks=clicks+1 WHERE id=$1", &[serde_json::json!(id)]).await.ok();
    let link: Option<PaymentLink> = db.query_one(&format!("SELECT {} FROM payment_links WHERE id=$1 AND status='active'", PL_COLS), &[serde_json::json!(id)]).await?;
    match link { Some(l) => utils::json_response(&l, 200), None => utils::json_error("Payment link not found or inactive", 404) }
}

pub async fn checkout(path: web::Path<String>, body: web::Json<serde_json::Value>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    let link: Option<PaymentLink> = db.query_one(&format!("SELECT {} FROM payment_links WHERE id=$1 AND status='active'", PL_COLS), &[serde_json::json!(id)]).await?;
    let link = match link { Some(l) => l, None => return utils::json_error("Payment link not found", 404) };
    let provider = body.get("provider").and_then(|v| v.as_str()).or(link.payment_provider.as_deref()).unwrap_or("paypal");
    if provider == "paypal" { return create_paypal_order(&http, &db, &link).await; }
    utils::json_error("Unsupported payment provider", 400)
}

pub async fn capture_public(path: web::Path<String>, body: web::Json<serde_json::Value>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let order_id = body.get("order_id").and_then(|v| v.as_str()).unwrap_or("");
    if order_id.is_empty() { return utils::json_error("order_id required", 400); }
    let db = db(&http)?;
    let token = get_paypal_token(&http).await?;
    let base = utils::get_env("PAYPAL_BASE_URL"); let base = if base.is_empty() { "https://api-m.paypal.com" } else { &base };
    let result: serde_json::Value = http.post(&format!("{}/v2/checkout/orders/{}/capture", base, order_id))
        .header("Authorization", format!("Bearer {}", token)).header("Content-Type", "application/json")
        .body("{}").send().await?.json().await?;
    if result.get("status").and_then(|v| v.as_str()) == Some("COMPLETED") {
        db.execute("UPDATE payment_links SET status='paid', payments=payments+1, provider_order_id=$1, updated_at=NOW() WHERE id=$2",
            &[serde_json::json!(order_id), serde_json::json!(id)]).await?;
        let link: Option<PaymentLink> = db.query_one(&format!("SELECT {} FROM payment_links WHERE id=$1", PL_COLS), &[serde_json::json!(id)]).await?;
        if let Some(l) = link {
            if let Some(inv_id) = &l.invoice_id {
                let inv_db = NeonClient::new(&utils::get_env("INVOICE_DB_URL"), (**http).clone())?;
                inv_db.execute("UPDATE invoices SET amount_paid=amount_paid+$1, amount_remaining=GREATEST(amount_remaining-$1,0), status=CASE WHEN amount_remaining-$1<=0 THEN 'paid' ELSE status END, paid_at=CASE WHEN amount_remaining-$1<=0 THEN NOW() ELSE paid_at END WHERE id=$2",
                    &[serde_json::json!(l.amount), serde_json::json!(inv_id)]).await.ok();
            }
        }
    }
    utils::json_response(&result, 200)
}

pub async fn check_status_public(path: web::Path<String>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let link: Option<PaymentLink> = db(&http)?.query_one(&format!("SELECT {} FROM payment_links WHERE id=$1", PL_COLS), &[serde_json::json!(id)]).await?;
    match link { Some(l) => utils::json_response(&serde_json::json!({"status": l.status, "provider_order_id": l.provider_order_id}), 200), None => utils::json_error("Not found", 404) }
}

// ── PayPal account management ──

pub async fn paypal_setup(auth: Auth, body: web::Json<serde_json::Value>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let email = body.get("paypal_email").and_then(|v| v.as_str()).unwrap_or("");
    if email.is_empty() { return utils::json_error("paypal_email is required", 400); }
    let id = uuid::Uuid::new_v4().to_string();
    db(&http)?.execute("INSERT INTO paypal_accounts (id, user_id, paypal_email, status, created_at, updated_at) VALUES ($1,$2,$3,'ACTIVE',NOW(),NOW()) ON CONFLICT (user_id) DO UPDATE SET paypal_email=$3, updated_at=NOW()",
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id), serde_json::json!(email)]).await?;
    utils::json_response(&serde_json::json!({"message": "PayPal account configured", "paypal_email": email}), 200)
}

pub async fn paypal_get_account(auth: Auth, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let acc: Option<serde_json::Value> = db(&http)?.query_one("SELECT id, user_id, paypal_email, status, created_at::text, updated_at::text FROM paypal_accounts WHERE user_id=$1",
        &[serde_json::json!(auth.0.user_id)]).await?;
    match acc { Some(a) => utils::json_response(&a, 200), None => utils::json_error("No PayPal account configured", 404) }
}

pub async fn paypal_delete_account(auth: Auth, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    db(&http)?.execute("DELETE FROM paypal_accounts WHERE user_id=$1", &[serde_json::json!(auth.0.user_id)]).await?;
    utils::json_response(&serde_json::json!({"message": "PayPal account removed"}), 200)
}

pub async fn xendit_setup(auth: Auth, body: web::Json<serde_json::Value>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let email = body.get("account_email").and_then(|v| v.as_str()).unwrap_or("");
    let biz = body.get("business_name").and_then(|v| v.as_str()).unwrap_or("");
    let id = utils::generate_id();
    db(&http)?.execute("INSERT INTO xendit_accounts (id,user_id,xendit_user_id,account_email,business_name,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,'REGISTERED',NOW(),NOW()) ON CONFLICT (user_id) DO UPDATE SET account_email=$4, business_name=$5, updated_at=NOW()",
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id), serde_json::json!(id), serde_json::json!(email), serde_json::json!(biz)]).await?;
    utils::json_response(&serde_json::json!({"message": "Xendit account configured"}), 200)
}

pub async fn xendit_get_account(auth: Auth, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let acc: Option<serde_json::Value> = db(&http)?.query_one("SELECT id, user_id, xendit_user_id, account_email, business_name, status, created_at::text, updated_at::text FROM xendit_accounts WHERE user_id=$1",
        &[serde_json::json!(auth.0.user_id)]).await?;
    match acc { Some(a) => utils::json_response(&a, 200), None => utils::json_error("No Xendit account configured", 404) }
}

pub async fn delete_by_invoice(path: web::Path<String>, auth: Auth, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let invoice_id = path.into_inner();
    let deleted = db(&http)?.execute("DELETE FROM payment_links WHERE user_id=$1 AND invoice_id=$2",
        &[serde_json::json!(auth.0.user_id), serde_json::json!(invoice_id)]).await?;
    utils::json_response(&serde_json::json!({"message": "Payment links deleted", "deleted": deleted}), 200)
}

pub async fn delete_by_invoices(auth: Auth, body: web::Json<serde_json::Value>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let ids: Vec<String> = body.get("invoice_ids").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
    if ids.is_empty() { return utils::json_error("invoice_ids is required", 400); }
    let deleted = db(&http)?.execute("DELETE FROM payment_links WHERE user_id=$1 AND invoice_id=ANY($2)",
        &[serde_json::json!(auth.0.user_id), serde_json::json!(utils::to_pg_array(&ids))]).await?;
    utils::json_response(&serde_json::json!({"message": "Payment links deleted", "deleted": deleted}), 200)
}

pub async fn paypal_capture_order(path: web::Path<String>, _auth: Auth, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let order_id = path.into_inner();
    let token = get_paypal_token(&http).await?;
    let base = utils::get_env("PAYPAL_BASE_URL"); let base = if base.is_empty() { "https://api-m.paypal.com" } else { &base };
    let result: serde_json::Value = http.post(&format!("{}/v2/checkout/orders/{}/capture", base, order_id))
        .header("Authorization", format!("Bearer {}", token)).header("Content-Type", "application/json")
        .body("{}").send().await?.json().await?;
    let pp_status = result.get("status").and_then(|v| v.as_str()).unwrap_or("");
    if pp_status == "COMPLETED" {
        let db = db(&http)?;
        db.execute("UPDATE payment_links SET status='paid', payments=payments+1, updated_at=NOW() WHERE provider_order_id=$1", &[serde_json::json!(order_id)]).await?;
        let link: Option<PaymentLink> = db.query_one(&format!("SELECT {} FROM payment_links WHERE provider_order_id=$1", PL_COLS), &[serde_json::json!(order_id)]).await?;
        if let Some(l) = link {
            if let Some(inv_id) = &l.invoice_id {
                let inv_db = NeonClient::new(&utils::get_env("INVOICE_DB_URL"), (**http).clone())?;
                inv_db.execute("UPDATE invoices SET amount_paid=amount_paid+$1, amount_remaining=GREATEST(amount_remaining-$1,0), status=CASE WHEN amount_remaining-$1<=0 THEN 'paid' ELSE status END, paid_at=CASE WHEN amount_remaining-$1<=0 THEN NOW() ELSE paid_at END WHERE id=$2",
                    &[serde_json::json!(l.amount), serde_json::json!(inv_id)]).await.ok();
            }
        }
    }
    utils::json_response(&serde_json::json!({"status": pp_status, "order_id": order_id, "message": if pp_status == "COMPLETED" { "Payment captured successfully" } else { "Capture pending" }}), 200)
}

// ── Webhooks ──

pub async fn handle_webhook(body: web::Json<serde_json::Value>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let payment_id = body.get("payment_id").or(body.get("id")).and_then(|v| v.as_str()).unwrap_or("");
    let status = body.get("status").and_then(|v| v.as_str()).unwrap_or("");
    if payment_id.is_empty() { return utils::json_response(&serde_json::json!({"status": "ignored"}), 200); }
    if status == "PAID" || status == "COMPLETED" || status == "paid" {
        db(&http)?.execute("UPDATE payment_links SET status='paid', payments=payments+1, updated_at=NOW() WHERE id=$1", &[serde_json::json!(payment_id)]).await?;
    }
    utils::json_response(&serde_json::json!({"status": "processed"}), 200)
}

pub async fn handle_paypal_webhook(body: web::Json<serde_json::Value>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let event_type = body.get("event_type").and_then(|v| v.as_str()).unwrap_or("");
    let resource = body.get("resource").cloned().unwrap_or(serde_json::json!({}));
    let order_id = resource.get("id").and_then(|v| v.as_str()).unwrap_or("");
    if event_type == "PAYMENT.CAPTURE.COMPLETED" || event_type == "CHECKOUT.ORDER.APPROVED" {
        db(&http)?.execute("UPDATE payment_links SET status='paid', payments=payments+1, updated_at=NOW() WHERE provider_order_id=$1", &[serde_json::json!(order_id)]).await?;
    }
    utils::json_response(&serde_json::json!({"status": "ok"}), 200)
}

// ── PayPal helpers ──

async fn get_paypal_token(http: &reqwest::Client) -> Result<String, AppError> {
    let client_id = utils::get_env("PAYPAL_CLIENT_ID");
    let secret = utils::get_env("PAYPAL_SECRET");
    let base = utils::get_env("PAYPAL_BASE_URL"); let base = if base.is_empty() { "https://api-m.paypal.com".to_string() } else { base };
    use base64::Engine;
    let creds = base64::engine::general_purpose::STANDARD.encode(format!("{}:{}", client_id, secret));
    let result: serde_json::Value = http.post(&format!("{}/v1/oauth2/token", base))
        .header("Authorization", format!("Basic {}", creds))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body("grant_type=client_credentials").send().await?.json().await?;
    result.get("access_token").and_then(|v| v.as_str()).map(|s| s.to_string())
        .ok_or_else(|| AppError("Failed to get PayPal token".into()))
}

async fn create_paypal_order(http: &reqwest::Client, db: &NeonClient, link: &PaymentLink) -> Result<HttpResponse, AppError> {
    let client_id = utils::get_env("PAYPAL_CLIENT_ID");
    let secret = utils::get_env("PAYPAL_SECRET");
    if client_id.is_empty() || secret.is_empty() { return utils::json_error("PayPal not configured", 500); }
    let token = get_paypal_token(http).await?;
    let base = utils::get_env("PAYPAL_BASE_URL"); let base = if base.is_empty() { "https://api-m.paypal.com".to_string() } else { base };
    let order_body = serde_json::json!({
        "intent": "CAPTURE",
        "purchase_units": [{"amount": {"currency_code": if link.currency == "IDR" { "USD" } else { &link.currency }, "value": format!("{:.2}", link.amount)}, "description": &link.title}],
        "application_context": {"return_url": format!("https://app.invoicequ.my.id/pay/{}/success", link.id), "cancel_url": format!("https://app.invoicequ.my.id/pay/{}", link.id)}
    });
    let result: serde_json::Value = http.post(&format!("{}/v2/checkout/orders", base))
        .header("Authorization", format!("Bearer {}", token)).json(&order_body).send().await?.json().await?;
    if let Some(pp_order_id) = result.get("id").and_then(|v| v.as_str()) {
        db.execute("UPDATE payment_links SET provider_order_id=$1, payment_provider='paypal', updated_at=NOW() WHERE id=$2",
            &[serde_json::json!(pp_order_id), serde_json::json!(link.id)]).await.ok();
    }
    utils::json_response(&result, 200)
}
