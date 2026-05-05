//! Payment service module — payment links, PayPal, Xendit, webhooks.
//! Mirrors: services/payment-service (Rust/Actix)

use serde::{Deserialize, Serialize};
use worker::*;
use crate::db::NeonClient;
use crate::middleware::JwtClaims;
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
    #[serde(default)] pub invoice_id: String,
    #[serde(default)] pub payment_provider: String,
    #[serde(default)] pub provider_order_id: String,
    #[serde(default)] pub expires_at: String,
    #[serde(default)] pub created_at: String,
    #[serde(default)] pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreatePaymentLinkRequest {
    pub title: String,
    pub description: Option<String>,
    pub amount: f64,
    pub currency: Option<String>,
    pub invoice_id: Option<String>,
    pub expires_at: Option<String>,
    pub payment_provider: Option<String>,
    pub client_name: Option<String>,
    pub client_email: Option<String>,
}

const PL_COLS: &str = "id, user_id, title, description, amount, currency, status, url, clicks, payments, invoice_id, payment_provider, provider_order_id, expires_at::text, created_at::text, updated_at::text";

pub async fn list(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let url = req.url()?;
    let (page, per_page) = utils::parse_pagination(&url);
    let offset = (page - 1) * per_page;
    let db = get_db(env)?;

    let total: i64 = db.query_scalar("SELECT COUNT(*) FROM payment_links WHERE user_id=$1",
        &[serde_json::json!(claims.user_id)]).await?;
    let links: Vec<PaymentLink> = db.query_typed(
        &format!("SELECT {} FROM payment_links WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", PL_COLS),
        &[serde_json::json!(claims.user_id), serde_json::json!(per_page), serde_json::json!(offset)],
    ).await?;

    let total_pages = ((total as i32) + per_page - 1) / per_page;
    utils::json_response(&serde_json::json!({
        "data": links, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages,
    }), 200)
}

pub async fn get(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let link: Option<PaymentLink> = db.query_one(
        &format!("SELECT {} FROM payment_links WHERE id=$1 AND user_id=$2", PL_COLS),
        &[serde_json::json!(id), serde_json::json!(claims.user_id)],
    ).await?;
    match link {
        Some(l) => utils::json_response(&l, 200),
        None => utils::json_error("Payment link not found", 404),
    }
}

pub async fn create(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: CreatePaymentLinkRequest = req.json().await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let id = utils::generate_id();
    let base_url = env.var("BASE_PAYMENT_URL").map(|v| v.to_string()).unwrap_or_else(|_| "https://app.invoicequ.my.id/pay".into());
    let url = format!("{}/{}", base_url, id);
    let currency = body.currency.unwrap_or_else(|| "IDR".into());
    let desc = body.description.unwrap_or_default();
    let provider = body.payment_provider.clone();

    let db = get_db(env)?;
    db.execute(
        "INSERT INTO payment_links (id,user_id,title,description,amount,currency,status,url,clicks,payments,invoice_id,payment_provider,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,'active',$7,0,0,$8,$9,NOW(),NOW())",
        &[serde_json::json!(id), serde_json::json!(claims.user_id), serde_json::json!(body.title),
          serde_json::json!(desc), serde_json::json!(body.amount), serde_json::json!(currency),
          serde_json::json!(url), serde_json::json!(body.invoice_id), serde_json::json!(provider)],
    ).await?;

    self::get(env, claims, &id).await
}

pub async fn update(mut req: Request, env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let db = get_db(env)?;

    let existing: Option<PaymentLink> = db.query_one(
        &format!("SELECT {} FROM payment_links WHERE id=$1 AND user_id=$2", PL_COLS),
        &[serde_json::json!(id), serde_json::json!(claims.user_id)],
    ).await?;
    if existing.is_none() { return utils::json_error("Payment link not found", 404); }
    let existing = existing.unwrap();

    let title = body.get("title").and_then(|v| v.as_str()).unwrap_or(&existing.title);
    let desc = body.get("description").and_then(|v| v.as_str()).unwrap_or(&existing.description);
    let amount = body.get("amount").and_then(|v| v.as_f64()).unwrap_or(existing.amount);
    let status = body.get("status").and_then(|v| v.as_str()).unwrap_or(&existing.status);

    db.execute(
        "UPDATE payment_links SET title=$1, description=$2, amount=$3, status=$4, updated_at=NOW() WHERE id=$5 AND user_id=$6",
        &[serde_json::json!(title), serde_json::json!(desc), serde_json::json!(amount),
          serde_json::json!(status), serde_json::json!(id), serde_json::json!(claims.user_id)],
    ).await?;

    self::get(env, claims, id).await
}

pub async fn delete(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    db.execute("DELETE FROM payment_links WHERE id=$1 AND user_id=$2",
        &[serde_json::json!(id), serde_json::json!(claims.user_id)]).await?;
    utils::json_response(&serde_json::json!({"message": "Payment link deleted"}), 200)
}

pub async fn bulk_delete(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let ids: Vec<String> = body.get("ids").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
    if ids.is_empty() { return utils::json_error("ids is required", 400); }
    let db = get_db(env)?;
    let pg_arr = utils::to_pg_array(&ids);
    let deleted = db.execute("DELETE FROM payment_links WHERE user_id=$1 AND id=ANY($2)",
        &[serde_json::json!(claims.user_id), serde_json::json!(pg_arr)]).await?;
    utils::json_response(&serde_json::json!({"message": "Deleted", "deleted": deleted}), 200)
}

// ── Public payment page ──

pub async fn get_public(env: &Env, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    // Increment clicks
    db.execute("UPDATE payment_links SET clicks=clicks+1 WHERE id=$1", &[serde_json::json!(id)]).await.ok();
    let link: Option<PaymentLink> = db.query_one(
        &format!("SELECT {} FROM payment_links WHERE id=$1 AND status='active'", PL_COLS),
        &[serde_json::json!(id)],
    ).await?;
    match link {
        Some(l) => utils::json_response(&l, 200),
        None => utils::json_error("Payment link not found or inactive", 404),
    }
}

pub async fn checkout(mut req: Request, env: &Env, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let link: Option<PaymentLink> = db.query_one(
        &format!("SELECT {} FROM payment_links WHERE id=$1 AND status='active'", PL_COLS),
        &[serde_json::json!(id)],
    ).await?;

    let link = match link {
        Some(l) => l,
        None => return utils::json_error("Payment link not found", 404),
    };

    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let provider = body.get("provider").and_then(|v| v.as_str())
        .or(if link.payment_provider.is_empty() { None } else { Some(link.payment_provider.as_str()) }).unwrap_or("paypal");

    if provider == "paypal" {
        return create_paypal_order(env, &db, &link, &body).await;
    }

    utils::json_error("Unsupported payment provider", 400)
}

pub async fn capture_public(mut req: Request, env: &Env, id: &str) -> Result<Response> {
    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let order_id = body.get("order_id").and_then(|v| v.as_str()).unwrap_or("");
    if order_id.is_empty() { return utils::json_error("order_id required", 400); }

    let db = get_db(env)?;
    // Get PayPal credentials
    let client_id = utils::get_secret(env, "PAYPAL_CLIENT_ID");
    let secret = utils::get_secret(env, "PAYPAL_SECRET");
    let base_url = env.var("PAYPAL_BASE_URL").map(|v| v.to_string()).unwrap_or_else(|_| "https://api-m.paypal.com".into());

    let token = get_paypal_token(&base_url, &client_id, &secret).await?;
    let capture_url = format!("{}/v2/checkout/orders/{}/capture", base_url, order_id);

    let mut headers = Headers::new();
    headers.set("Authorization", &format!("Bearer {}", token))?;
    headers.set("Content-Type", "application/json")?;

    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_headers(headers);
    init.with_body(Some(wasm_bindgen::JsValue::from_str("{}")));

    let request = Request::new_with_init(&capture_url, &init)?;
    let mut resp = Fetch::Request(request).send().await?;
    let result: serde_json::Value = resp.json().await?;

    let pp_status = result.get("status").and_then(|v| v.as_str()).unwrap_or("");
    if pp_status == "COMPLETED" {
        db.execute("UPDATE payment_links SET status='paid', payments=payments+1, provider_order_id=$1, updated_at=NOW() WHERE id=$2",
            &[serde_json::json!(order_id), serde_json::json!(id)]).await?;

        // Notify invoice service internally
        let link: Option<PaymentLink> = db.query_one(
            &format!("SELECT {} FROM payment_links WHERE id=$1", PL_COLS),
            &[serde_json::json!(id)],
        ).await?;
        if let Some(l) = link {
            if !l.invoice_id.is_empty() {
                let inv_db = NeonClient::from_connection_string(&utils::get_secret(env, "INVOICE_DB_URL"))?;
                inv_db.execute(
                    "UPDATE invoices SET amount_paid=amount_paid+$1, amount_remaining=GREATEST(amount_remaining-$1,0), status=CASE WHEN amount_remaining-$1<=0 THEN 'paid' ELSE status END, paid_at=CASE WHEN amount_remaining-$1<=0 THEN NOW() ELSE paid_at END WHERE id=$2",
                    &[serde_json::json!(l.amount), serde_json::json!(&l.invoice_id)],
                ).await.ok();
            }
        }
    }

    utils::json_response(&result, 200)
}

pub async fn check_status_public(env: &Env, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let link: Option<PaymentLink> = db.query_one(
        &format!("SELECT {} FROM payment_links WHERE id=$1", PL_COLS),
        &[serde_json::json!(id)],
    ).await?;
    match link {
        Some(l) => utils::json_response(&serde_json::json!({"status": l.status, "provider_order_id": l.provider_order_id}), 200),
        None => utils::json_error("Not found", 404),
    }
}

// ── PayPal account management ──

pub async fn paypal_setup(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let email = body.get("paypal_email").and_then(|v| v.as_str()).unwrap_or("");
    if email.is_empty() { return utils::json_error("paypal_email is required", 400); }

    let db = get_db(env)?;
    let id = uuid::Uuid::new_v4().to_string();
    db.execute(
        "INSERT INTO paypal_accounts (id, user_id, paypal_email, status, created_at, updated_at) VALUES ($1,$2,$3,'ACTIVE',NOW(),NOW()) ON CONFLICT (user_id) DO UPDATE SET paypal_email=$3, updated_at=NOW()",
        &[serde_json::json!(id), serde_json::json!(claims.user_id), serde_json::json!(email)],
    ).await?;

    utils::json_response(&serde_json::json!({"message": "PayPal account configured", "paypal_email": email}), 200)
}

pub async fn paypal_get_account(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let acc: Option<serde_json::Value> = db.query_one(
        "SELECT id, user_id, paypal_email, status, created_at::text, updated_at::text FROM paypal_accounts WHERE user_id=$1",
        &[serde_json::json!(claims.user_id)],
    ).await?;
    match acc {
        Some(a) => utils::json_response(&a, 200),
        None => utils::json_error("No PayPal account configured", 404),
    }
}

pub async fn paypal_delete_account(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    db.execute("DELETE FROM paypal_accounts WHERE user_id=$1", &[serde_json::json!(claims.user_id)]).await?;
    utils::json_response(&serde_json::json!({"message": "PayPal account removed"}), 200)
}

// ── Xendit account management ──

pub async fn xendit_setup(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let db = get_db(env)?;
    let email = body.get("account_email").and_then(|v| v.as_str()).unwrap_or("");
    let biz = body.get("business_name").and_then(|v| v.as_str()).unwrap_or("");

    let id = utils::generate_id();
    db.execute(
        "INSERT INTO xendit_accounts (id,user_id,xendit_user_id,account_email,business_name,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,'REGISTERED',NOW(),NOW()) ON CONFLICT (user_id) DO UPDATE SET account_email=$4, business_name=$5, updated_at=NOW()",
        &[serde_json::json!(id), serde_json::json!(claims.user_id), serde_json::json!(id),
          serde_json::json!(email), serde_json::json!(biz)],
    ).await?;

    utils::json_response(&serde_json::json!({"message": "Xendit account configured"}), 200)
}

pub async fn xendit_get_account(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let acc: Option<serde_json::Value> = db.query_one(
        "SELECT id, user_id, xendit_user_id, account_email, business_name, status, created_at::text, updated_at::text FROM xendit_accounts WHERE user_id=$1",
        &[serde_json::json!(claims.user_id)],
    ).await?;
    match acc {
        Some(a) => utils::json_response(&a, 200),
        None => utils::json_error("No Xendit account configured", 404),
    }
}

// ── Cascade delete by invoice ──

pub async fn delete_by_invoice(env: &Env, claims: &JwtClaims, invoice_id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let deleted = db.execute(
        "DELETE FROM payment_links WHERE user_id=$1 AND invoice_id=$2",
        &[serde_json::json!(claims.user_id), serde_json::json!(invoice_id)],
    ).await?;
    utils::json_response(&serde_json::json!({"message": "Payment links deleted", "deleted": deleted}), 200)
}

pub async fn delete_by_invoices(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let invoice_ids: Vec<String> = body.get("invoice_ids")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    if invoice_ids.is_empty() { return utils::json_error("invoice_ids is required", 400); }

    let db = get_db(env)?;
    let pg_arr = utils::to_pg_array(&invoice_ids);
    let deleted = db.execute(
        "DELETE FROM payment_links WHERE user_id=$1 AND invoice_id=ANY($2)",
        &[serde_json::json!(claims.user_id), serde_json::json!(pg_arr)],
    ).await?;
    utils::json_response(&serde_json::json!({"message": "Payment links deleted", "deleted": deleted}), 200)
}

// ── PayPal capture (protected route) ──

pub async fn paypal_capture_order(env: &Env, _claims: &JwtClaims, order_id: &str) -> Result<Response> {
    let client_id = utils::get_secret(env, "PAYPAL_CLIENT_ID");
    let secret = utils::get_secret(env, "PAYPAL_SECRET");
    let base_url = env.var("PAYPAL_BASE_URL").map(|v| v.to_string()).unwrap_or_else(|_| "https://api-m.paypal.com".into());

    let token = get_paypal_token(&base_url, &client_id, &secret).await?;
    let capture_url = format!("{}/v2/checkout/orders/{}/capture", base_url, order_id);

    let mut headers = Headers::new();
    headers.set("Authorization", &format!("Bearer {}", token))?;
    headers.set("Content-Type", "application/json")?;

    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_headers(headers);
    init.with_body(Some(wasm_bindgen::JsValue::from_str("{}")));

    let request = Request::new_with_init(&capture_url, &init)?;
    let mut resp = Fetch::Request(request).send().await?;
    let result: serde_json::Value = resp.json().await?;

    let pp_status = result.get("status").and_then(|v| v.as_str()).unwrap_or("");

    if pp_status == "COMPLETED" {
        let db = get_db(env)?;
        db.execute(
            "UPDATE payment_links SET status='paid', payments=payments+1, updated_at=NOW() WHERE provider_order_id=$1",
            &[serde_json::json!(order_id)],
        ).await?;

        // Update linked invoice
        let link: Option<PaymentLink> = db.query_one(
            &format!("SELECT {} FROM payment_links WHERE provider_order_id=$1", PL_COLS),
            &[serde_json::json!(order_id)],
        ).await?;
        if let Some(l) = link {
            if !l.invoice_id.is_empty() {
                let inv_db = NeonClient::from_connection_string(&utils::get_secret(env, "INVOICE_DB_URL"))?;
                inv_db.execute(
                    "UPDATE invoices SET amount_paid=amount_paid+$1, amount_remaining=GREATEST(amount_remaining-$1,0), status=CASE WHEN amount_remaining-$1<=0 THEN 'paid' ELSE status END, paid_at=CASE WHEN amount_remaining-$1<=0 THEN NOW() ELSE paid_at END WHERE id=$2",
                    &[serde_json::json!(l.amount), serde_json::json!(&l.invoice_id)],
                ).await.ok();
            }
        }
    }

    utils::json_response(&serde_json::json!({
        "status": pp_status,
        "order_id": order_id,
        "message": if pp_status == "COMPLETED" { "Payment captured successfully" } else { "Capture pending" },
    }), 200)
}

// ── Webhook handlers ──

pub async fn handle_webhook(mut req: Request, env: &Env) -> Result<Response> {
    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let payment_id = body.get("payment_id").or(body.get("id")).and_then(|v| v.as_str()).unwrap_or("");
    let status = body.get("status").and_then(|v| v.as_str()).unwrap_or("");

    if payment_id.is_empty() { return utils::json_response(&serde_json::json!({"status": "ignored"}), 200); }

    let db = get_db(env)?;
    if status == "PAID" || status == "COMPLETED" || status == "paid" {
        db.execute("UPDATE payment_links SET status='paid', payments=payments+1, updated_at=NOW() WHERE id=$1",
            &[serde_json::json!(payment_id)]).await?;
    }

    utils::json_response(&serde_json::json!({"status": "processed"}), 200)
}

pub async fn handle_paypal_webhook(mut req: Request, env: &Env) -> Result<Response> {
    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let event_type = body.get("event_type").and_then(|v| v.as_str()).unwrap_or("");
    let resource = body.get("resource").cloned().unwrap_or(serde_json::json!({}));
    let order_id = resource.get("id").and_then(|v| v.as_str()).unwrap_or("");

    if event_type == "PAYMENT.CAPTURE.COMPLETED" || event_type == "CHECKOUT.ORDER.APPROVED" {
        let db = get_db(env)?;
        db.execute("UPDATE payment_links SET status='paid', payments=payments+1, updated_at=NOW() WHERE provider_order_id=$1",
            &[serde_json::json!(order_id)]).await?;
    }

    utils::json_response(&serde_json::json!({"status": "ok"}), 200)
}

// ── PayPal helpers ──

async fn get_paypal_token(base_url: &str, client_id: &str, secret: &str) -> Result<String> {
    let token_url = format!("{}/v1/oauth2/token", base_url);
    let credentials = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, format!("{}:{}", client_id, secret));

    let mut headers = Headers::new();
    headers.set("Authorization", &format!("Basic {}", credentials))?;
    headers.set("Content-Type", "application/x-www-form-urlencoded")?;

    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_headers(headers);
    init.with_body(Some(wasm_bindgen::JsValue::from_str("grant_type=client_credentials")));

    let request = Request::new_with_init(&token_url, &init)?;
    let mut resp = Fetch::Request(request).send().await?;
    let result: serde_json::Value = resp.json().await?;

    result.get("access_token").and_then(|v| v.as_str()).map(|s| s.to_string())
        .ok_or_else(|| Error::RustError("Failed to get PayPal token".into()))
}

async fn create_paypal_order(env: &Env, db: &NeonClient, link: &PaymentLink, _body: &serde_json::Value) -> Result<Response> {
    let client_id = utils::get_secret(env, "PAYPAL_CLIENT_ID");
    let secret = utils::get_secret(env, "PAYPAL_SECRET");
    let base_url = env.var("PAYPAL_BASE_URL").map(|v| v.to_string()).unwrap_or_else(|_| "https://api-m.paypal.com".into());

    if client_id.is_empty() || secret.is_empty() {
        return utils::json_error("PayPal not configured", 500);
    }

    let token = get_paypal_token(&base_url, &client_id, &secret).await?;
    let order_url = format!("{}/v2/checkout/orders", base_url);

    let order_body = serde_json::json!({
        "intent": "CAPTURE",
        "purchase_units": [{
            "amount": {
                "currency_code": if link.currency == "IDR" { "USD" } else { &link.currency },
                "value": format!("{:.2}", link.amount),
            },
            "description": &link.title,
        }],
        "application_context": {
            "return_url": format!("https://app.invoicequ.my.id/pay/{}/success", link.id),
            "cancel_url": format!("https://app.invoicequ.my.id/pay/{}", link.id),
        }
    });

    let mut headers = Headers::new();
    headers.set("Authorization", &format!("Bearer {}", token))?;
    headers.set("Content-Type", "application/json")?;

    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_headers(headers);
    init.with_body(Some(wasm_bindgen::JsValue::from_str(&serde_json::to_string(&order_body).unwrap())));

    let request = Request::new_with_init(&order_url, &init)?;
    let mut resp = Fetch::Request(request).send().await?;
    let result: serde_json::Value = resp.json().await?;

    // Store order ID
    if let Some(pp_order_id) = result.get("id").and_then(|v| v.as_str()) {
        db.execute("UPDATE payment_links SET provider_order_id=$1, payment_provider='paypal', updated_at=NOW() WHERE id=$2",
            &[serde_json::json!(pp_order_id), serde_json::json!(link.id)]).await.ok();
    }

    utils::json_response(&result, 200)
}

fn get_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "PAYMENT_DB_URL");
    NeonClient::from_connection_string(&url)
}
