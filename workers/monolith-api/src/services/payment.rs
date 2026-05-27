//! Payment service module — payment links, PayPal, Xendit, webhooks.
//! Mirrors: services/payment-service (Rust/Actix)

use crate::db::NeonClient;
use crate::middleware::JwtClaims;
use crate::services::notification;
use crate::services::subscription;
use crate::utils;
use serde::{Deserialize, Serialize};
use worker::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentLink {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub amount: f64,
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub clicks: i32,
    #[serde(default)]
    pub payments: i32,
    #[serde(default)]
    pub invoice_id: String,
    #[serde(default)]
    pub payment_provider: String,
    #[serde(default)]
    pub provider_order_id: String,
    #[serde(default)]
    pub expires_at: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PaymentReminderCandidate {
    pub payment_link_id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub client_name: String,
    #[serde(default)]
    pub client_email: String,
    #[serde(default)]
    pub amount: f64,
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub payment_url: String,
    #[serde(default)]
    pub expires_at: String,
    #[serde(default)]
    pub expires_at_label: String,
    #[serde(default)]
    pub days_before: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ReminderStatusRow {
    #[serde(default)]
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PaymentReminderRunSummary {
    #[serde(default)]
    pub checked: usize,
    #[serde(default)]
    pub sent: usize,
    #[serde(default)]
    pub skipped: usize,
    #[serde(default)]
    pub failed: usize,
}

const PL_COLS: &str = "id, user_id, title, description, amount, currency, status, url, clicks, payments, invoice_id, payment_provider, provider_order_id, expires_at::text, created_at::text, updated_at::text";

pub async fn list(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let url = req.url()?;
    let (page, per_page) = utils::parse_pagination(&url);
    let offset = (page - 1) * per_page;
    let db = get_db(env)?;

    let total: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM payment_links WHERE user_id=$1",
            &[serde_json::json!(claims.user_id)],
        )
        .await?;
    let links: Vec<PaymentLink> = db.query_typed(
        &format!("SELECT {} FROM payment_links WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", PL_COLS),
        &[serde_json::json!(claims.user_id), serde_json::json!(per_page), serde_json::json!(offset)],
    ).await?;

    let total_pages = ((total as i32) + per_page - 1) / per_page;
    utils::json_response(
        &serde_json::json!({
            "data": links, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages,
        }),
        200,
    )
}

pub async fn get(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let link: Option<PaymentLink> = db
        .query_one(
            &format!(
                "SELECT {} FROM payment_links WHERE id=$1 AND user_id=$2",
                PL_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(claims.user_id)],
        )
        .await?;
    match link {
        Some(l) => utils::json_response(&l, 200),
        None => utils::json_error("Payment link not found", 404),
    }
}

pub async fn create(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: CreatePaymentLinkRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    if let Some(resp) = subscription::limit_reached_response(env, claims, "payment_links").await? {
        return Ok(resp);
    }

    let id = utils::generate_id();
    let base_url = env
        .var("BASE_PAYMENT_URL")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://app.invoicequ.my.id/pay".into());
    let url = format!("{}/{}", base_url, id);
    let currency = body.currency.unwrap_or_else(|| "IDR".into());
    let desc = body.description.unwrap_or_default();
    let provider = body.payment_provider.clone();
    let invoice_id = body.invoice_id.clone();
    let client_name = body.client_name.unwrap_or_default();
    let client_email = body.client_email.unwrap_or_default();
    let expires_at = body
        .expires_at
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| serde_json::json!(value))
        .unwrap_or(serde_json::Value::Null);

    let db = get_db(env)?;
    ensure_payment_link_contact_columns(&db).await?;
    db.execute(
        "INSERT INTO payment_links (id,user_id,title,description,amount,currency,status,url,clicks,payments,invoice_id,payment_provider,expires_at,client_name,client_email,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,'active',$7,0,0,$8,$9,$10::timestamptz,$11,$12,NOW(),NOW())",
        &[serde_json::json!(id), serde_json::json!(claims.user_id), serde_json::json!(body.title),
          serde_json::json!(desc), serde_json::json!(body.amount), serde_json::json!(currency),
          serde_json::json!(url), serde_json::json!(invoice_id), serde_json::json!(provider), expires_at,
          serde_json::json!(client_name), serde_json::json!(client_email)],
    ).await?;

    if let Some(invoice_id) = invoice_id.as_deref().filter(|value| !value.is_empty()) {
        attach_payment_link_to_invoice(env, invoice_id, &url)
            .await
            .ok();
    }

    // Record in-app notification (must be awaited — spawn_local doesn't survive Worker response)
    if let Err(e) = notification::create_notification(
        env,
        &claims.user_id,
        "payment_link_created",
        "Payment Link Dibuat",
        &format!(
            "Payment link \"{}\" sebesar {} {} telah dibuat.",
            body.title, currency, body.amount
        ),
        "",
        "",
        "sent",
    )
    .await
    {
        console_log!(
            "[NOTIFICATION] Failed to create payment_link_created notification: {}",
            e
        );
    }

    self::get(env, claims, &id).await
}

pub async fn update(mut req: Request, env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let db = get_db(env)?;

    let existing: Option<PaymentLink> = db
        .query_one(
            &format!(
                "SELECT {} FROM payment_links WHERE id=$1 AND user_id=$2",
                PL_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(claims.user_id)],
        )
        .await?;
    if existing.is_none() {
        return utils::json_error("Payment link not found", 404);
    }
    let existing = existing.unwrap();

    let title = body
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or(&existing.title);
    let desc = body
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or(&existing.description);
    let amount = body
        .get("amount")
        .and_then(|v| v.as_f64())
        .unwrap_or(existing.amount);
    let status = body
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or(&existing.status);

    db.execute(
        "UPDATE payment_links SET title=$1, description=$2, amount=$3, status=$4, updated_at=NOW() WHERE id=$5 AND user_id=$6",
        &[serde_json::json!(title), serde_json::json!(desc), serde_json::json!(amount),
          serde_json::json!(status), serde_json::json!(id), serde_json::json!(claims.user_id)],
    ).await?;

    self::get(env, claims, id).await
}

pub async fn delete(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    db.execute(
        "DELETE FROM payment_links WHERE id=$1 AND user_id=$2",
        &[serde_json::json!(id), serde_json::json!(claims.user_id)],
    )
    .await?;
    utils::json_response(&serde_json::json!({"message": "Payment link deleted"}), 200)
}

pub async fn bulk_delete(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let ids: Vec<String> = body
        .get("ids")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    if ids.is_empty() {
        return utils::json_error("ids is required", 400);
    }
    let db = get_db(env)?;
    let pg_arr = utils::to_pg_array(&ids);
    let deleted = db
        .execute(
            "DELETE FROM payment_links WHERE user_id=$1 AND id=ANY($2)",
            &[serde_json::json!(claims.user_id), serde_json::json!(pg_arr)],
        )
        .await?;
    utils::json_response(
        &serde_json::json!({"message": "Deleted", "deleted": deleted}),
        200,
    )
}

// ── Public payment page ──

pub async fn get_public(env: &Env, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    // Increment clicks
    db.execute(
        "UPDATE payment_links SET clicks=clicks+1 WHERE id=$1",
        &[serde_json::json!(id)],
    )
    .await
    .ok();
    let link: Option<PaymentLink> = db
        .query_one(
            &format!("SELECT {} FROM payment_links WHERE id=$1", PL_COLS),
            &[serde_json::json!(id)],
        )
        .await?;
    match link {
        Some(l) => utils::json_response(&l, 200),
        None => utils::json_error("Payment link not found or inactive", 404),
    }
}

pub async fn checkout(mut req: Request, env: &Env, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let link: Option<PaymentLink> = db
        .query_one(
            &format!("SELECT {} FROM payment_links WHERE id=$1", PL_COLS),
            &[serde_json::json!(id)],
        )
        .await?;

    let link = match link {
        Some(l) => l,
        None => return utils::json_error("Payment link not found", 404),
    };

    if is_completed_status(&link.status) {
        return utils::json_error("Payment has already been completed", 400);
    }
    if !link.status.eq_ignore_ascii_case("active") {
        return utils::json_error("Payment link not active", 400);
    }

    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let provider = body
        .get("provider")
        .and_then(|v| v.as_str())
        .or(if link.payment_provider.is_empty() {
            None
        } else {
            Some(link.payment_provider.as_str())
        })
        .unwrap_or("paypal");

    if provider == "paypal" {
        const PAYPAL_CURRENCIES: &[&str] = &[
            "AUD", "BRL", "CAD", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD", "HUF", "ILS", "INR",
            "JPY", "MXN", "MYR", "NOK", "NZD", "PHP", "PLN", "RUB", "SEK", "SGD", "THB", "TWD",
            "USD",
        ];
        let cur = link.currency.to_uppercase();
        if !PAYPAL_CURRENCIES.contains(&cur.as_str()) {
            return utils::json_response(
                &serde_json::json!({
                    "error": format!("PayPal does not support {}. Please use: {}", cur, PAYPAL_CURRENCIES.join(", ")),
                }),
                400,
            );
        }
        return create_paypal_order(env, &db, &link, &body).await;
    }
    if provider == "xendit" {
        const XENDIT_CURRENCIES: &[&str] = &["IDR", "PHP", "THB", "VND", "MYR", "USD"];
        let cur = link.currency.to_uppercase();
        if !XENDIT_CURRENCIES.contains(&cur.as_str()) {
            return utils::json_response(
                &serde_json::json!({
                    "error": format!("Xendit does not support {}. Please use: {}", cur, XENDIT_CURRENCIES.join(", ")),
                }),
                400,
            );
        }
        return create_xendit_checkout(env, &db, &link).await;
    }

    utils::json_error("Unsupported payment provider", 400)
}

pub async fn capture_public(mut req: Request, env: &Env, id: &str) -> Result<Response> {
    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let db = get_db(env)?;
    let link: Option<PaymentLink> = db
        .query_one(
            &format!("SELECT {} FROM payment_links WHERE id=$1", PL_COLS),
            &[serde_json::json!(id)],
        )
        .await?;
    let link = match link {
        Some(l) => l,
        None => return utils::json_error("Payment link not found", 404),
    };

    if is_completed_status(&link.status) {
        return utils::json_response(
            &serde_json::json!({
                "status": "completed",
                "message": "Payment has already been completed",
            }),
            200,
        );
    }

    let provider = if link.payment_provider.is_empty() {
        "manual"
    } else {
        link.payment_provider.as_str()
    };
    if provider != "paypal" {
        return utils::json_error("This payment link is not configured for PayPal", 400);
    }

    let order_id = body
        .get("order_id")
        .and_then(|v| v.as_str())
        .or(if link.provider_order_id.is_empty() {
            None
        } else {
            Some(link.provider_order_id.as_str())
        })
        .unwrap_or("");
    if order_id.is_empty() {
        return utils::json_error(
            "A PayPal order has not been created for this payment link",
            400,
        );
    }

    let client_id = utils::get_secret(env, "PAYPAL_CLIENT_ID");
    let secret = utils::get_secret(env, "PAYPAL_SECRET");
    let base_url = paypal_base_url(env);

    if client_id.is_empty() || secret.is_empty() {
        return utils::json_error("PayPal not configured", 500);
    }

    let token = get_paypal_token(&base_url, &client_id, &secret).await?;
    let capture_url = format!("{}/v2/checkout/orders/{}/capture", base_url, order_id);

    let headers = Headers::new();
    headers.set("Authorization", &format!("Bearer {}", token))?;
    headers.set("Content-Type", "application/json")?;

    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_headers(headers);
    init.with_body(Some(wasm_bindgen::JsValue::from_str("{}")));

    let request = Request::new_with_init(&capture_url, &init)?;
    let mut resp = Fetch::Request(request).send().await?;
    let status_code = resp.status_code();
    let result: serde_json::Value = resp.json().await?;

    if status_code >= 400 {
        if is_paypal_order_already_captured(&result) {
            complete_paypal_link(env, &db, &link, order_id).await?;
            return utils::json_response(
                &serde_json::json!({
                    "status": "completed",
                    "order_id": order_id,
                    "message": "Payment has already been processed",
                }),
                200,
            );
        }

        return utils::json_response(
            &serde_json::json!({
                "error": "Failed to capture PayPal payment",
                "details": result,
            }),
            502,
        );
    }

    let pp_status = result.get("status").and_then(|v| v.as_str()).unwrap_or("");
    if pp_status == "COMPLETED" {
        complete_paypal_link(env, &db, &link, order_id).await?;

        return utils::json_response(
            &serde_json::json!({
                "status": "completed",
                "order_id": order_id,
                "message": "Payment successful",
            }),
            200,
        );
    }

    utils::json_response(
        &serde_json::json!({
            "status": pp_status.to_ascii_lowercase(),
            "order_id": order_id,
        }),
        200,
    )
}

pub async fn check_status_public(env: &Env, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let link: Option<PaymentLink> = db
        .query_one(
            &format!("SELECT {} FROM payment_links WHERE id=$1", PL_COLS),
            &[serde_json::json!(id)],
        )
        .await?;
    let link = match link {
        Some(l) => l,
        None => return utils::json_error("Not found", 404),
    };

    if is_completed_status(&link.status) {
        return utils::json_response(
            &serde_json::json!({"status": "completed", "provider_order_id": link.provider_order_id}),
            200,
        );
    }

    if link.payment_provider.eq_ignore_ascii_case("xendit") && !link.provider_order_id.is_empty() {
        let api_key = utils::get_secret(env, "XENDIT_API_KEY");
        if api_key.is_empty() {
            return utils::json_response(
                &serde_json::json!({
                "status": link.status,
                    "provider_order_id": link.provider_order_id,
                    "message": "Xendit not configured",
                }),
                200,
            );
        }
        if is_xendit_public_key(&api_key) {
            return utils::json_response(
                &serde_json::json!({
                    "status": link.status,
                    "provider_order_id": link.provider_order_id,
                    "message": "XENDIT_API_KEY is a public key. Use a Xendit secret API key for server-side invoices.",
                }),
                200,
            );
        }

        let xendit_user_id: Option<String> = db
            .query_one::<serde_json::Value>(
                "SELECT xendit_user_id FROM xendit_accounts WHERE user_id=$1",
                &[serde_json::json!(&link.user_id)],
            )
            .await?
            .and_then(|account| {
                account
                    .get("xendit_user_id")
                    .and_then(|v| v.as_str())
                    .map(|value| value.to_string())
            });

        if let Some(xendit_user_id) = xendit_user_id {
            match fetch_xendit_invoice(env, &api_key, &xendit_user_id, &link.provider_order_id)
                .await
            {
                Ok(invoice) => {
                    let xendit_status = invoice
                        .get("status")
                        .and_then(|v| v.as_str())
                        .unwrap_or("UNKNOWN")
                        .to_ascii_uppercase();

                    if matches!(xendit_status.as_str(), "PAID" | "SETTLED") {
                        complete_payment_link(env, &db, &link, Some(&link.provider_order_id))
                            .await?;
                        return utils::json_response(
                            &serde_json::json!({
                                "status": "completed",
                                "provider_order_id": link.provider_order_id,
                                "xendit_status": xendit_status,
                            }),
                            200,
                        );
                    }

                    if xendit_status == "EXPIRED" {
                        return utils::json_response(
                            &serde_json::json!({
                                "status": "expired",
                                "provider_order_id": link.provider_order_id,
                                "xendit_status": xendit_status,
                            }),
                            200,
                        );
                    }

                    return utils::json_response(
                        &serde_json::json!({
                            "status": "pending",
                            "provider_order_id": link.provider_order_id,
                            "xendit_status": xendit_status,
                        }),
                        200,
                    );
                }
                Err(err) => {
                    let err_msg = err.to_string();
                    // If Xendit can't find the invoice (404), it likely expired
                    let resolved_status = if err_msg.contains("404") || err_msg.contains("not find")
                    {
                        "expired"
                    } else {
                        &link.status
                    };
                    return utils::json_response(
                        &serde_json::json!({
                            "status": resolved_status,
                            "provider_order_id": link.provider_order_id,
                            "message": format!("Xendit status check failed: {}", err_msg),
                        }),
                        200,
                    );
                }
            }
        }
    }

    utils::json_response(
        &serde_json::json!({"status": link.status, "provider_order_id": link.provider_order_id}),
        200,
    )
}

// ── PayPal account management ──

pub async fn paypal_setup(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let email = body
        .get("paypal_email")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if email.is_empty() {
        return utils::json_error("paypal_email is required", 400);
    }

    let db = get_db(env)?;
    let id = uuid::Uuid::new_v4().to_string();
    db.execute(
        "INSERT INTO paypal_accounts (id, user_id, paypal_email, status, created_at, updated_at) VALUES ($1,$2,$3,'ACTIVE',NOW(),NOW()) ON CONFLICT (user_id) DO UPDATE SET paypal_email=$3, updated_at=NOW()",
        &[serde_json::json!(id), serde_json::json!(claims.user_id), serde_json::json!(email)],
    ).await?;

    utils::json_response(
        &serde_json::json!({"message": "PayPal account configured", "paypal_email": email}),
        200,
    )
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
    db.execute(
        "DELETE FROM paypal_accounts WHERE user_id=$1",
        &[serde_json::json!(claims.user_id)],
    )
    .await?;
    utils::json_response(
        &serde_json::json!({"message": "PayPal account removed"}),
        200,
    )
}

// ── Xendit account management ──

pub async fn xendit_setup(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let db = get_db(env)?;
    let email = body
        .get("account_email")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let biz = body
        .get("business_name")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if email.is_empty() {
        return utils::json_error("account_email is required", 400);
    }
    if biz.is_empty() {
        return utils::json_error("business_name is required", 400);
    }

    let api_key = utils::get_secret(env, "XENDIT_API_KEY");
    if api_key.is_empty() {
        return utils::json_error("Xendit not configured", 500);
    }
    if is_xendit_public_key(&api_key) {
        return utils::json_error(
            "XENDIT_API_KEY is a public key. Use a Xendit secret API key, not xnd_public_...",
            500,
        );
    }

    // Try to create a new sub-account first
    let xendit_account = match create_xendit_sub_account(env, &api_key, email, biz).await {
        Ok(account) => account,
        Err(err) => {
            let err_msg = err.to_string();
            // If account already exists (duplicate email), try to look up the existing one
            if err_msg.contains("409")
                || err_msg.contains("DUPLICATE")
                || err_msg.contains("already")
                || err_msg.contains("unique")
            {
                match fetch_xendit_account_by_email(env, &api_key, email).await {
                    Ok(Some(existing)) => existing,
                    Ok(None) => {
                        return utils::json_response(
                            &serde_json::json!({
                                "error": "Email sudah terdaftar di Xendit tapi tidak ditemukan. Coba email lain atau hubungi support.",
                                "details": err_msg,
                            }),
                            409,
                        )
                    }
                    Err(lookup_err) => {
                        return utils::json_response(
                            &serde_json::json!({
                                "error": "Email sudah terdaftar di Xendit",
                                "details": format!("Create: {} | Lookup: {}", err_msg, lookup_err),
                            }),
                            409,
                        )
                    }
                }
            } else {
                return utils::json_response(
                    &serde_json::json!({
                        "error": "Failed to create Xendit account",
                        "details": err_msg,
                    }),
                    502,
                );
            }
        }
    };
    let xendit_user_id = match xendit_account.get("id").and_then(|v| v.as_str()) {
        Some(id) if !id.is_empty() => id.to_string(),
        _ => {
            return utils::json_response(
                &serde_json::json!({
                    "error": "Failed to create Xendit account",
                    "details": xendit_account,
                }),
                502,
            )
        }
    };
    let xendit_status = xendit_account
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("REGISTERED");

    let id = utils::generate_id();
    let account: Option<serde_json::Value> = db
        .query_one(
            "INSERT INTO xendit_accounts (id,user_id,xendit_user_id,account_email,business_name,status,account_type,platform_fee_percent,created_at,updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,'MANAGED',1.0,NOW(),NOW())
             ON CONFLICT (user_id) DO UPDATE SET
                xendit_user_id=$3,
                account_email=$4,
                business_name=$5,
                status=$6,
                account_type='MANAGED',
                updated_at=NOW()
             RETURNING id, user_id, xendit_user_id, account_email, business_name, status, platform_fee_percent, created_at::text, updated_at::text",
            &[
                serde_json::json!(id),
                serde_json::json!(claims.user_id),
                serde_json::json!(xendit_user_id),
                serde_json::json!(email),
                serde_json::json!(biz),
                serde_json::json!(xendit_status),
            ],
        )
        .await?;

    match account {
        Some(account) => utils::json_response(&account, 200),
        None => utils::json_error("Failed to save Xendit account", 500),
    }
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

pub async fn xendit_delete_account(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;

    // Verify the account exists
    let acc: Option<serde_json::Value> = db
        .query_one(
            "SELECT xendit_user_id FROM xendit_accounts WHERE user_id=$1",
            &[serde_json::json!(claims.user_id)],
        )
        .await?;

    if acc.is_none() {
        return utils::json_error("No Xendit account configured", 404);
    }

    // Soft disconnect: only remove from our database.
    // The sub-account stays active on XenPlatform so:
    //  - Pending transactions can still settle
    //  - The user can reconnect with the same email later
    db.execute(
        "DELETE FROM xendit_accounts WHERE user_id=$1",
        &[serde_json::json!(claims.user_id)],
    )
    .await?;

    utils::json_response(
        &serde_json::json!({"message": "Xendit account disconnected"}),
        200,
    )
}

// ── Cascade delete by invoice ──

pub async fn delete_by_invoice(
    env: &Env,
    claims: &JwtClaims,
    invoice_id: &str,
) -> Result<Response> {
    let db = get_db(env)?;
    let deleted = db
        .execute(
            "DELETE FROM payment_links WHERE user_id=$1 AND invoice_id=$2",
            &[
                serde_json::json!(claims.user_id),
                serde_json::json!(invoice_id),
            ],
        )
        .await?;
    utils::json_response(
        &serde_json::json!({"message": "Payment links deleted", "deleted": deleted}),
        200,
    )
}

pub async fn delete_by_invoices(
    mut req: Request,
    env: &Env,
    claims: &JwtClaims,
) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let invoice_ids: Vec<String> = body
        .get("invoice_ids")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    if invoice_ids.is_empty() {
        return utils::json_error("invoice_ids is required", 400);
    }

    let db = get_db(env)?;
    let pg_arr = utils::to_pg_array(&invoice_ids);
    let deleted = db
        .execute(
            "DELETE FROM payment_links WHERE user_id=$1 AND invoice_id=ANY($2)",
            &[serde_json::json!(claims.user_id), serde_json::json!(pg_arr)],
        )
        .await?;
    utils::json_response(
        &serde_json::json!({"message": "Payment links deleted", "deleted": deleted}),
        200,
    )
}

// ── PayPal capture (protected route) ──

pub async fn paypal_capture_order(
    env: &Env,
    _claims: &JwtClaims,
    order_id: &str,
) -> Result<Response> {
    let client_id = utils::get_secret(env, "PAYPAL_CLIENT_ID");
    let secret = utils::get_secret(env, "PAYPAL_SECRET");
    let base_url = env
        .var("PAYPAL_BASE_URL")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://api-m.paypal.com".into());

    let token = get_paypal_token(&base_url, &client_id, &secret).await?;
    let capture_url = format!("{}/v2/checkout/orders/{}/capture", base_url, order_id);

    let headers = Headers::new();
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
        let link: Option<PaymentLink> = db
            .query_one(
                &format!(
                    "SELECT {} FROM payment_links WHERE provider_order_id=$1",
                    PL_COLS
                ),
                &[serde_json::json!(order_id)],
            )
            .await?;
        if let Some(l) = link {
            complete_payment_link(env, &db, &l, Some(order_id)).await?;
        }
    }

    utils::json_response(
        &serde_json::json!({
            "status": pp_status,
            "order_id": order_id,
            "message": if pp_status == "COMPLETED" { "Payment captured successfully" } else { "Capture pending" },
        }),
        200,
    )
}

// ── Webhook handlers ──

pub async fn handle_webhook(mut req: Request, env: &Env) -> Result<Response> {
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
    let external_id = body
        .get("external_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let payment_id = body
        .get("payment_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let provider_order_id = body.get("id").and_then(|v| v.as_str()).unwrap_or("");
    let status = body.get("status").and_then(|v| v.as_str()).unwrap_or("");

    if external_id.is_empty() && payment_id.is_empty() && provider_order_id.is_empty() {
        return utils::json_response(&serde_json::json!({"status": "ignored"}), 200);
    }

    let db = get_db(env)?;
    if is_paid_provider_status(status) {
        let link =
            find_webhook_payment_link(&db, external_id, payment_id, provider_order_id).await?;
        if let Some(link) = link {
            let order_id = if provider_order_id.is_empty() {
                None
            } else {
                Some(provider_order_id)
            };
            complete_payment_link(env, &db, &link, order_id).await?;
        }
    }

    utils::json_response(&serde_json::json!({"status": "processed"}), 200)
}

pub async fn handle_paypal_webhook(mut req: Request, env: &Env) -> Result<Response> {
    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let event_type = body
        .get("event_type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let resource = body
        .get("resource")
        .cloned()
        .unwrap_or(serde_json::json!({}));
    let order_id = resource.get("id").and_then(|v| v.as_str()).unwrap_or("");

    if event_type == "PAYMENT.CAPTURE.COMPLETED" || event_type == "CHECKOUT.ORDER.APPROVED" {
        let db = get_db(env)?;
        let link: Option<PaymentLink> = db
            .query_one(
                &format!(
                    "SELECT {} FROM payment_links WHERE provider_order_id=$1",
                    PL_COLS
                ),
                &[serde_json::json!(order_id)],
            )
            .await?;
        if let Some(link) = link {
            complete_payment_link(env, &db, &link, Some(order_id)).await?;
        }
    }

    utils::json_response(&serde_json::json!({"status": "ok"}), 200)
}

// ── PayPal helpers ──

async fn get_paypal_token(base_url: &str, client_id: &str, secret: &str) -> Result<String> {
    let token_url = format!("{}/v1/oauth2/token", base_url);
    let credentials = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        format!("{}:{}", client_id, secret),
    );

    let headers = Headers::new();
    headers.set("Authorization", &format!("Basic {}", credentials))?;
    headers.set("Content-Type", "application/x-www-form-urlencoded")?;

    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_headers(headers);
    init.with_body(Some(wasm_bindgen::JsValue::from_str(
        "grant_type=client_credentials",
    )));

    let request = Request::new_with_init(&token_url, &init)?;
    let mut resp = Fetch::Request(request).send().await?;
    let status_code = resp.status_code();
    let result: serde_json::Value = resp.json().await?;

    if status_code >= 400 {
        let message = result
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("invalid_token_response");
        return Err(Error::RustError(format!(
            "PayPal token request failed ({}): {}",
            status_code, message
        )));
    }

    result
        .get("access_token")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| Error::RustError("Failed to get PayPal token".into()))
}

async fn create_paypal_order(
    env: &Env,
    db: &NeonClient,
    link: &PaymentLink,
    _body: &serde_json::Value,
) -> Result<Response> {
    let client_id = utils::get_secret(env, "PAYPAL_CLIENT_ID");
    let secret = utils::get_secret(env, "PAYPAL_SECRET");
    let base_url = paypal_base_url(env);

    if client_id.is_empty() || secret.is_empty() {
        return utils::json_error("PayPal not configured", 500);
    }

    let paypal_account: Option<serde_json::Value> = db
        .query_one(
            "SELECT paypal_email FROM paypal_accounts WHERE user_id=$1",
            &[serde_json::json!(&link.user_id)],
        )
        .await?;
    let payee_email = paypal_account.and_then(|account| {
        account
            .get("paypal_email")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    });
    let payee_email = match payee_email {
        Some(email) if !email.is_empty() => email,
        _ => return utils::json_error("Pemilik payment link belum menghubungkan PayPal", 400),
    };

    let token = get_paypal_token(&base_url, &client_id, &secret).await?;
    let order_url = format!("{}/v2/checkout/orders", base_url);
    let payment_base_url = payment_page_base_url(env);

    let order_body = serde_json::json!({
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": &link.id,
            "amount": {
                "currency_code": &link.currency,
                "value": format!("{:.2}", link.amount),
            },
            "description": &link.title,
            "payee": {
                "email_address": payee_email,
            },
        }],
        "application_context": {
            "return_url": format!("{}/{}/paypal-return", payment_base_url, link.id),
            "cancel_url": format!("{}/{}/paypal-cancel", payment_base_url, link.id),
            "brand_name": "InvoiceQu",
            "user_action": "PAY_NOW",
        }
    });

    let headers = Headers::new();
    headers.set("Authorization", &format!("Bearer {}", token))?;
    headers.set("Content-Type", "application/json")?;

    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_headers(headers);
    init.with_body(Some(wasm_bindgen::JsValue::from_str(
        &serde_json::to_string(&order_body).unwrap(),
    )));

    let request = Request::new_with_init(&order_url, &init)?;
    let mut resp = Fetch::Request(request).send().await?;
    let status_code = resp.status_code();
    let result: serde_json::Value = resp.json().await?;

    if status_code >= 400 {
        return utils::json_response(
            &serde_json::json!({
                "error": "Failed to create PayPal order",
                "details": result,
            }),
            502,
        );
    }

    let approve_url = result
        .get("links")
        .and_then(|links| links.as_array())
        .and_then(|links| {
            links
                .iter()
                .find(|link| link.get("rel").and_then(|rel| rel.as_str()) == Some("approve"))
                .and_then(|link| link.get("href").and_then(|href| href.as_str()))
        })
        .unwrap_or("")
        .to_string();

    // Store order ID
    let pp_order_id = match result.get("id").and_then(|v| v.as_str()) {
        Some(order_id) => order_id.to_string(),
        None => {
            return utils::json_response(
                &serde_json::json!({
                    "error": "Failed to create PayPal order",
                    "details": result,
                }),
                502,
            )
        }
    };

    if approve_url.is_empty() {
        return utils::json_response(
            &serde_json::json!({
                "error": "Failed to get PayPal approval URL",
                "details": result,
            }),
            502,
        );
    }

    db.execute("UPDATE payment_links SET provider_order_id=$1, payment_provider='paypal', updated_at=NOW() WHERE id=$2",
        &[serde_json::json!(&pp_order_id), serde_json::json!(&link.id)]).await.ok();

    utils::json_response(
        &serde_json::json!({
            "order_id": pp_order_id,
            "approve_url": approve_url,
        }),
        200,
    )
}

async fn create_xendit_checkout(
    env: &Env,
    db: &NeonClient,
    link: &PaymentLink,
) -> Result<Response> {
    let api_key = utils::get_secret(env, "XENDIT_API_KEY");
    if api_key.is_empty() {
        return utils::json_error("Xendit not configured", 500);
    }
    if is_xendit_public_key(&api_key) {
        return utils::json_error(
            "XENDIT_API_KEY is a public key. Use a Xendit secret API key, not xnd_public_...",
            500,
        );
    }

    let xendit_account: Option<serde_json::Value> = db
        .query_one(
            "SELECT xendit_user_id, account_email, business_name FROM xendit_accounts WHERE user_id=$1",
            &[serde_json::json!(&link.user_id)],
        )
        .await?;
    let xendit_account = match xendit_account {
        Some(account) => account,
        None => return utils::json_error("Pemilik payment link belum menghubungkan Xendit", 400),
    };
    let mut xendit_user_id = match xendit_account
        .get("xendit_user_id")
        .and_then(|v| v.as_str())
    {
        Some(user_id) if !user_id.is_empty() => user_id.to_string(),
        _ => return utils::json_error("Pemilik payment link belum menghubungkan Xendit", 400),
    };
    let account_email = xendit_account
        .get("account_email")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let business_name = xendit_account
        .get("business_name")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    // Older worker builds stored a local 32-char hex ID as xendit_user_id.
    // Repair that record lazily so existing users do not need manual DB fixes.
    if is_local_generated_id(&xendit_user_id)
        && !account_email.is_empty()
        && !business_name.is_empty()
    {
        let repaired_account =
            create_xendit_sub_account(env, &api_key, account_email, business_name).await?;
        if let Some(repaired_id) = repaired_account.get("id").and_then(|v| v.as_str()) {
            let repaired_status = repaired_account
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("REGISTERED");
            db.execute(
                "UPDATE xendit_accounts SET xendit_user_id=$1, status=$2, account_type='MANAGED', updated_at=NOW() WHERE user_id=$3",
                &[
                    serde_json::json!(repaired_id),
                    serde_json::json!(repaired_status),
                    serde_json::json!(&link.user_id),
                ],
            )
            .await?;
            xendit_user_id = repaired_id.to_string();
        }
    }

    if !link.provider_order_id.is_empty() {
        // Try to reuse the existing Xendit invoice; if it has expired / been
        // deleted (Xendit returns 404 "Could not find invoice by id"), clear
        // the stale provider_order_id and fall through to create a fresh one.
        match fetch_xendit_invoice(env, &api_key, &xendit_user_id, &link.provider_order_id).await {
            Ok(inv) => {
                let xendit_status = inv
                    .get("status")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_ascii_uppercase();
                if xendit_status == "EXPIRED" {
                    // Expired — clear and create a new invoice below
                    console_log!(
                        "[XENDIT] Invoice {} expired, creating new one for link {}",
                        link.provider_order_id,
                        link.id
                    );
                    db.execute(
                        "UPDATE payment_links SET provider_order_id='', updated_at=NOW() WHERE id=$1",
                        &[serde_json::json!(&link.id)],
                    ).await.ok();
                } else {
                    // Still valid — return the checkout URL
                    let checkout_url = inv
                        .get("invoice_url")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    if !checkout_url.is_empty() {
                        return utils::json_response(
                            &serde_json::json!({
                                "invoice_id": link.provider_order_id,
                                "invoice_url": checkout_url,
                                "checkout_url": checkout_url,
                            }),
                            200,
                        );
                    }
                    // No URL — fall through to create a new invoice
                    db.execute(
                        "UPDATE payment_links SET provider_order_id='', updated_at=NOW() WHERE id=$1",
                        &[serde_json::json!(&link.id)],
                    ).await.ok();
                }
            }
            Err(err) => {
                // Xendit returned 404 or another error — stale invoice
                console_log!(
                    "[XENDIT] Failed to fetch invoice {} for link {}: {} — creating new one",
                    link.provider_order_id,
                    link.id,
                    err
                );
                db.execute(
                    "UPDATE payment_links SET provider_order_id='', updated_at=NOW() WHERE id=$1",
                    &[serde_json::json!(&link.id)],
                )
                .await
                .ok();
            }
        }
    }

    let result = match create_xendit_invoice(env, &api_key, &xendit_user_id, link).await {
        Ok(result) => result,
        Err(err) => {
            return utils::json_response(
                &serde_json::json!({
                    "error": "Failed to create Xendit invoice",
                    "details": err.to_string(),
                }),
                502,
            )
        }
    };

    let xendit_invoice_id = match result.get("id").and_then(|v| v.as_str()) {
        Some(id) => id.to_string(),
        None => {
            return utils::json_response(
                &serde_json::json!({
                    "error": "Failed to create Xendit invoice",
                    "details": result,
                }),
                502,
            )
        }
    };
    let checkout_url = match result.get("invoice_url").and_then(|v| v.as_str()) {
        Some(url) if !url.is_empty() => url.to_string(),
        _ => {
            return utils::json_response(
                &serde_json::json!({
                    "error": "Failed to get Xendit invoice URL",
                    "details": result,
                }),
                502,
            )
        }
    };

    db.execute(
        "UPDATE payment_links SET provider_order_id=$1, payment_provider='xendit', url=$2, updated_at=NOW() WHERE id=$3",
        &[serde_json::json!(&xendit_invoice_id), serde_json::json!(&checkout_url), serde_json::json!(&link.id)],
    ).await.ok();

    utils::json_response(
        &serde_json::json!({
            "invoice_id": xendit_invoice_id,
            "invoice_url": checkout_url,
            "checkout_url": checkout_url,
        }),
        200,
    )
}

async fn create_xendit_sub_account(
    env: &Env,
    api_key: &str,
    email: &str,
    business_name: &str,
) -> Result<serde_json::Value> {
    let url = format!("{}/v2/accounts", xendit_base_url(env));
    let payload = serde_json::json!({
        "email": email,
        "type": "MANAGED",
        "public_profile": {
            "business_name": business_name,
        },
    });

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
            "Xendit create account failed ({}): {}",
            status_code, result
        )));
    }

    Ok(result)
}

/// Look up an existing XenPlatform sub-account by email.
/// Returns Ok(Some(account_json)) if found, Ok(None) if not found.
async fn fetch_xendit_account_by_email(
    env: &Env,
    api_key: &str,
    email: &str,
) -> Result<Option<serde_json::Value>> {
    // Simple URL-encode for email (mainly the @ sign)
    let encoded_email = email.replace('@', "%40").replace('+', "%2B");
    let url = format!(
        "{}/v2/accounts?email={}",
        xendit_base_url(env),
        encoded_email
    );

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
            "Xendit account lookup failed ({}): {}",
            status_code, result
        )));
    }

    // Response can be an array of accounts or a single object
    if let Some(arr) = result.as_array() {
        // Return the first matching account
        if let Some(account) = arr.first() {
            return Ok(Some(account.clone()));
        }
    } else if result.get("id").is_some() {
        // Single account object returned
        return Ok(Some(result));
    }

    Ok(None)
}

async fn create_xendit_invoice(
    env: &Env,
    api_key: &str,
    xendit_user_id: &str,
    link: &PaymentLink,
) -> Result<serde_json::Value> {
    let base_url = xendit_base_url(env);
    let payment_base_url = payment_page_base_url(env);
    let invoice_url = format!("{}/v2/invoices", base_url);
    let payload = serde_json::json!({
        "external_id": &link.id,
        "amount": link.amount,
        "description": &link.title,
        "currency": &link.currency,
        "success_redirect_url": format!("{}/{}/xendit-return", payment_base_url, link.id),
        "failure_redirect_url": format!("{}/{}", payment_base_url, link.id),
        "invoice_duration": 86400,
    });

    let credentials = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        format!("{}:", api_key),
    );
    let headers = Headers::new();
    headers.set("Authorization", &format!("Basic {}", credentials))?;
    headers.set("Content-Type", "application/json")?;
    headers.set("for-user-id", xendit_user_id)?;

    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_headers(headers);
    init.with_body(Some(wasm_bindgen::JsValue::from_str(
        &serde_json::to_string(&payload).unwrap(),
    )));

    let request = Request::new_with_init(&invoice_url, &init)?;
    let mut resp = Fetch::Request(request).send().await?;
    let status_code = resp.status_code();
    let result: serde_json::Value = resp.json().await?;

    if status_code >= 400 {
        return Err(Error::RustError(format!(
            "Xendit create invoice failed ({}): {}",
            status_code, result
        )));
    }

    Ok(result)
}

async fn fetch_xendit_invoice(
    env: &Env,
    api_key: &str,
    xendit_user_id: &str,
    invoice_id: &str,
) -> Result<serde_json::Value> {
    let url = format!("{}/v2/invoices/{}", xendit_base_url(env), invoice_id);
    let credentials = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        format!("{}:", api_key),
    );

    let headers = Headers::new();
    headers.set("Authorization", &format!("Basic {}", credentials))?;
    headers.set("for-user-id", xendit_user_id)?;

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

    Ok(result)
}

fn is_local_generated_id(value: &str) -> bool {
    value.len() == 32 && value.as_bytes().iter().all(|byte| byte.is_ascii_hexdigit())
}

fn is_xendit_public_key(value: &str) -> bool {
    value.trim_start().starts_with("xnd_public_")
}

#[allow(dead_code)]
async fn get_xendit_invoice_checkout_url(
    env: &Env,
    api_key: &str,
    xendit_user_id: &str,
    invoice_id: &str,
) -> Result<Response> {
    let base_url = xendit_base_url(env);
    let url = format!("{}/v2/invoices/{}", base_url, invoice_id);
    let credentials = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        format!("{}:", api_key),
    );

    let headers = Headers::new();
    headers.set("Authorization", &format!("Basic {}", credentials))?;
    headers.set("for-user-id", xendit_user_id)?;

    let mut init = RequestInit::new();
    init.with_method(Method::Get);
    init.with_headers(headers);

    let request = Request::new_with_init(&url, &init)?;
    let mut resp = Fetch::Request(request).send().await?;
    let status_code = resp.status_code();
    let result: serde_json::Value = resp.json().await?;

    if status_code >= 400 {
        return utils::json_response(
            &serde_json::json!({
                "error": "Failed to fetch Xendit invoice",
                "details": result,
            }),
            502,
        );
    }

    let checkout_url = result
        .get("invoice_url")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if checkout_url.is_empty() {
        return utils::json_response(
            &serde_json::json!({
                "error": "Failed to get Xendit invoice URL",
                "details": result,
            }),
            502,
        );
    }

    utils::json_response(
        &serde_json::json!({
            "invoice_id": invoice_id,
            "invoice_url": checkout_url,
            "checkout_url": checkout_url,
        }),
        200,
    )
}

fn get_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "PAYMENT_DB_URL");
    NeonClient::from_connection_string(&url)
}

pub async fn send_due_payment_link_reminders(env: &Env) -> Result<PaymentReminderRunSummary> {
    let db = get_db(env)?;

    ensure_payment_link_contact_columns(&db).await?;
    ensure_payment_link_reminders_table(&db).await?;

    let candidates: Vec<PaymentReminderCandidate> = db
        .query_typed(
            "SELECT
                id AS payment_link_id,
                user_id,
                title,
                COALESCE(client_name, '') AS client_name,
                COALESCE(client_email, '') AS client_email,
                amount,
                COALESCE(currency, 'IDR') AS currency,
                url AS payment_url,
                expires_at::text AS expires_at,
                TO_CHAR(expires_at AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY HH24:MI') AS expires_at_label,
                ((expires_at AT TIME ZONE 'Asia/Jakarta')::date - (NOW() AT TIME ZONE 'Asia/Jakarta')::date) AS days_before
             FROM payment_links
             WHERE COALESCE(invoice_id, '') = ''
               AND COALESCE(client_email, '') <> ''
               AND expires_at IS NOT NULL
               AND expires_at > NOW()
               AND LOWER(COALESCE(status, '')) NOT IN ('completed', 'paid', 'cancelled', 'canceled', 'expired')
               AND ((expires_at AT TIME ZONE 'Asia/Jakarta')::date - (NOW() AT TIME ZONE 'Asia/Jakarta')::date) IN (14, 7, 1)
             ORDER BY days_before DESC, expires_at ASC",
            &[],
        )
        .await?;

    let mut summary = PaymentReminderRunSummary {
        checked: candidates.len(),
        ..Default::default()
    };

    for candidate in candidates {
        if payment_link_reminder_already_sent(&db, &candidate).await? {
            summary.skipped += 1;
            continue;
        }

        let subject = build_payment_link_reminder_subject(&candidate);
        let html = build_payment_link_reminder_html(&candidate);

        match notification::send_email_via_resend(env, &candidate.client_email, &subject, &html)
            .await
        {
            Ok(()) => {
                upsert_payment_link_reminder_attempt(&db, &candidate, "sent", None).await?;
                summary.sent += 1;
            }
            Err(err) => {
                upsert_payment_link_reminder_attempt(
                    &db,
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

async fn ensure_payment_link_contact_columns(db: &NeonClient) -> Result<()> {
    db.execute(
        "ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS client_name VARCHAR(255) DEFAULT ''",
        &[],
    )
    .await?;
    db.execute(
        "ALTER TABLE payment_links ADD COLUMN IF NOT EXISTS client_email VARCHAR(255) DEFAULT ''",
        &[],
    )
    .await?;

    Ok(())
}

async fn ensure_payment_link_reminders_table(db: &NeonClient) -> Result<()> {
    db.execute(
        "CREATE TABLE IF NOT EXISTS payment_link_due_reminders (
            id VARCHAR(64) PRIMARY KEY,
            payment_link_id VARCHAR(64) NOT NULL REFERENCES payment_links(id) ON DELETE CASCADE,
            user_id VARCHAR(64) NOT NULL,
            client_email VARCHAR(255) NOT NULL,
            days_before INTEGER NOT NULL CHECK (days_before IN (1, 7, 14)),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT DEFAULT '',
            last_attempted_at TIMESTAMP WITH TIME ZONE,
            sent_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (payment_link_id, days_before, expires_at)
        )",
        &[],
    )
    .await?;
    db.execute(
        "CREATE INDEX IF NOT EXISTS idx_payment_link_due_reminders_lookup
         ON payment_link_due_reminders (payment_link_id, days_before, expires_at)",
        &[],
    )
    .await?;

    Ok(())
}

async fn payment_link_reminder_already_sent(
    db: &NeonClient,
    candidate: &PaymentReminderCandidate,
) -> Result<bool> {
    let existing: Option<ReminderStatusRow> = db
        .query_one(
            "SELECT status
             FROM payment_link_due_reminders
             WHERE payment_link_id=$1 AND days_before=$2 AND expires_at=$3::timestamptz
             ORDER BY updated_at DESC
             LIMIT 1",
            &[
                serde_json::json!(candidate.payment_link_id),
                serde_json::json!(candidate.days_before),
                serde_json::json!(candidate.expires_at),
            ],
        )
        .await?;

    Ok(existing
        .map(|row| row.status.eq_ignore_ascii_case("sent"))
        .unwrap_or(false))
}

async fn upsert_payment_link_reminder_attempt(
    db: &NeonClient,
    candidate: &PaymentReminderCandidate,
    status: &str,
    error_message: Option<String>,
) -> Result<()> {
    let error_message = error_message
        .unwrap_or_default()
        .chars()
        .take(500)
        .collect::<String>();

    db.execute(
        "INSERT INTO payment_link_due_reminders (
            id, payment_link_id, user_id, client_email, days_before, expires_at,
            status, attempts, last_error, last_attempted_at, sent_at, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6::timestamptz,
            $7, 1, $8, NOW(), CASE WHEN $7 = 'sent' THEN NOW() ELSE NULL END, NOW(), NOW()
        )
        ON CONFLICT (payment_link_id, days_before, expires_at)
        DO UPDATE SET
            user_id = EXCLUDED.user_id,
            client_email = EXCLUDED.client_email,
            status = EXCLUDED.status,
            attempts = payment_link_due_reminders.attempts + 1,
            last_error = EXCLUDED.last_error,
            last_attempted_at = NOW(),
            sent_at = CASE
                WHEN EXCLUDED.status = 'sent'
                    THEN COALESCE(payment_link_due_reminders.sent_at, NOW())
                ELSE payment_link_due_reminders.sent_at
            END,
            updated_at = NOW()",
        &[
            serde_json::json!(utils::generate_id()),
            serde_json::json!(candidate.payment_link_id),
            serde_json::json!(candidate.user_id),
            serde_json::json!(candidate.client_email),
            serde_json::json!(candidate.days_before),
            serde_json::json!(candidate.expires_at),
            serde_json::json!(status),
            serde_json::json!(error_message),
        ],
    )
    .await?;

    Ok(())
}

fn build_payment_link_reminder_subject(candidate: &PaymentReminderCandidate) -> String {
    match candidate.days_before {
        1 => format!("Payment Reminder: {} is due tomorrow", candidate.title),
        days => format!(
            "Payment Reminder: {} is due in {} days",
            candidate.title, days
        ),
    }
}

fn build_payment_link_reminder_html(candidate: &PaymentReminderCandidate) -> String {
    let client_name = if candidate.client_name.trim().is_empty() {
        "Customer"
    } else {
        &candidate.client_name
    };
    let amount = format_money(candidate.amount, &candidate.currency);
    let reminder_copy = match candidate.days_before {
        1 => "is due tomorrow".to_string(),
        days => format!("is due in {} days", days),
    };

    format!(
        "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px;margin:0 auto;padding:24px;\">
            <h2 style=\"margin:0 0 16px;\">Payment Reminder</h2>
            <p>Hi {},</p>
            <p>Payment request <strong>{}</strong> {}.</p>
            <div style=\"border:1px solid #E5E7EB;border-radius:12px;padding:16px;margin:20px 0;background:#F9FAFB;\">
                <p style=\"margin:0 0 8px;\"><strong>Payment Request</strong>: {}</p>
                <p style=\"margin:0 0 8px;\"><strong>Due Date</strong>: {} WIB</p>
                <p style=\"margin:0 0 8px;\"><strong>Amount</strong>: {}</p>
                <p style=\"margin:0;\"><strong>Reminder</strong>: H-{}</p>
            </div>
            <p style=\"margin:24px 0;\">
                <a href=\"{}\" style=\"display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;\">Pay Now</a>
            </p>
            <p style=\"font-size:12px;color:#6B7280;word-break:break-all;\">{}</p>
            <p style=\"color:#6B7280;font-size:14px;\">If you have already paid, please ignore this email.</p>
        </div>",
        escape_html(client_name),
        escape_html(&candidate.title),
        reminder_copy,
        escape_html(&candidate.title),
        escape_html(&candidate.expires_at_label),
        amount,
        candidate.days_before,
        escape_html(&candidate.payment_url),
        escape_html(&candidate.payment_url)
    )
}

fn format_money(amount: f64, currency: &str) -> String {
    let rounded = amount.round() as i64;
    let raw = rounded.abs().to_string();
    let mut formatted = String::new();

    for (i, ch) in raw.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            formatted.push('.');
        }
        formatted.push(ch);
    }

    let mut formatted: String = formatted.chars().rev().collect();
    if rounded < 0 {
        formatted.insert(0, '-');
    }

    if currency.eq_ignore_ascii_case("IDR") {
        format!("Rp {}", formatted)
    } else {
        format!("{} {}", currency, formatted)
    }
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn paypal_base_url(env: &Env) -> String {
    env.var("PAYPAL_BASE_URL")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://api-m.paypal.com".into())
}

fn xendit_base_url(env: &Env) -> String {
    env.var("XENDIT_BASE_URL")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://api.xendit.co".into())
}

fn payment_page_base_url(env: &Env) -> String {
    env.var("BASE_PAYMENT_URL")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://app.invoicequ.my.id/pay".into())
        .trim_end_matches('/')
        .to_string()
}

fn is_completed_status(status: &str) -> bool {
    let normalized = status.to_ascii_lowercase();
    normalized == "completed" || normalized == "paid"
}

fn is_paypal_order_already_captured(result: &serde_json::Value) -> bool {
    result
        .get("details")
        .and_then(|details| details.as_array())
        .map(|details| {
            details.iter().any(|detail| {
                detail.get("issue").and_then(|issue| issue.as_str())
                    == Some("ORDER_ALREADY_CAPTURED")
            })
        })
        .unwrap_or(false)
        || result.to_string().contains("ORDER_ALREADY_CAPTURED")
}

async fn complete_paypal_link(
    env: &Env,
    db: &NeonClient,
    link: &PaymentLink,
    order_id: &str,
) -> Result<()> {
    complete_payment_link(env, db, link, Some(order_id)).await
}

async fn complete_payment_link(
    env: &Env,
    db: &NeonClient,
    link: &PaymentLink,
    provider_order_id: Option<&str>,
) -> Result<()> {
    let updated = match provider_order_id.filter(|value| !value.is_empty()) {
        Some(order_id) => {
            db.execute(
                "UPDATE payment_links SET status='completed', payments=payments+1, provider_order_id=COALESCE(NULLIF(provider_order_id,''), $1), updated_at=NOW() WHERE id=$2 AND LOWER(status) NOT IN ('completed','paid')",
                &[serde_json::json!(order_id), serde_json::json!(&link.id)],
            ).await?
        }
        None => {
            db.execute(
                "UPDATE payment_links SET status='completed', payments=payments+1, updated_at=NOW() WHERE id=$1 AND LOWER(status) NOT IN ('completed','paid')",
                &[serde_json::json!(&link.id)],
            ).await?
        }
    };

    if updated > 0 {
        apply_invoice_payment(env, db, link).await.ok();

        // Record in-app notification for payment received (must be awaited — spawn_local doesn't survive Worker response)
        if let Err(e) = notification::create_notification(
            env,
            &link.user_id,
            "payment_received",
            "Pembayaran Diterima",
            &format!(
                "Pembayaran sebesar {} {} untuk \"{}\" telah diterima.",
                link.currency, link.amount, link.title
            ),
            "",
            "",
            "sent",
        )
        .await
        {
            console_log!(
                "[NOTIFICATION] Failed to create payment_received notification: {}",
                e
            );
        }
    }

    Ok(())
}

async fn apply_invoice_payment(
    env: &Env,
    payment_db: &NeonClient,
    link: &PaymentLink,
) -> Result<()> {
    if link.invoice_id.is_empty() {
        return Ok(());
    }

    let inv_db = NeonClient::from_connection_string(&utils::get_secret(env, "INVOICE_DB_URL"))?;
    let invoice: Option<serde_json::Value> = inv_db.query_one(
        "UPDATE invoices SET amount_paid=LEAST(total, amount_paid+$1), amount_remaining=GREATEST(total-LEAST(total, amount_paid+$1),0), status=CASE WHEN GREATEST(total-LEAST(total, amount_paid+$1),0)<=0 THEN 'paid' WHEN LEAST(total, amount_paid+$1)>0 THEN 'partially_paid' ELSE status END, paid_at=CASE WHEN GREATEST(total-LEAST(total, amount_paid+$1),0)<=0 THEN COALESCE(paid_at,NOW()) ELSE paid_at END WHERE id=$2 RETURNING id, invoice_number, user_id, client_name, client_email, total, due_date::text, status, payment_type, amount_paid, amount_remaining, remaining_payment_link, currency",
        &[serde_json::json!(link.amount), serde_json::json!(&link.invoice_id)],
    ).await?;

    if let Some(ref invoice) = invoice {
        let new_status = invoice.get("status").and_then(|v| v.as_str()).unwrap_or("");

        if new_status == "paid" {
            // Send payment confirmation email
            send_payment_confirmation_email(env, invoice).await;
        } else if new_status == "partially_paid" {
            // Create remaining payment link for DP flow
            maybe_create_remaining_payment_link(env, payment_db, &inv_db, invoice, link)
                .await
                .ok();
        }
    }

    Ok(())
}

async fn send_payment_confirmation_email(env: &Env, invoice: &serde_json::Value) {
    let invoice_number = invoice
        .get("invoice_number")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let client_email = invoice
        .get("client_email")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    let user_id = invoice
        .get("user_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    // 1) Send confirmation email to client
    if !client_email.is_empty() {
        let subject = format!("Invoice {} Payment Successful", invoice_number);
        let html = build_payment_confirmation_email_html(invoice, false);
        notification::queue_email_via_resend(env, client_email, &subject, &html);
    } else {
        console_log!(
            "[EMAIL] Client email empty, skipping payment confirmation for {}",
            invoice_number
        );
    }

    // 2) Send notification email to user (invoice owner)
    if !user_id.is_empty() {
        let user_db_result =
            NeonClient::from_connection_string(&utils::get_secret(env, "AUTH_DB_URL"));
        if let Ok(user_db) = user_db_result {
            let user: Option<serde_json::Value> = user_db
                .query_one(
                    "SELECT email, name FROM users WHERE id=$1",
                    &[serde_json::json!(user_id)],
                )
                .await
                .unwrap_or(None);
            if let Some(user) = user {
                let user_email = user
                    .get("email")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if !user_email.is_empty() {
                    let subject = format!("💰 Pembayaran Diterima — Invoice {}", invoice_number);
                    let html = build_payment_confirmation_email_html(invoice, true);
                    notification::queue_email_via_resend(env, &user_email, &subject, &html);
                }
            }
        }
    }
}

fn build_payment_confirmation_email_html(invoice: &serde_json::Value, is_owner: bool) -> String {
    let invoice_number = invoice
        .get("invoice_number")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let client_name = invoice
        .get("client_name")
        .and_then(|v| v.as_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(if is_owner { "Pelanggan" } else { "Customer" });
    let total = invoice.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let amount_paid = invoice
        .get("amount_paid")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let currency = invoice
        .get("currency")
        .and_then(|v| v.as_str())
        .unwrap_or("IDR");
    let due_date = invoice
        .get("due_date")
        .and_then(|v| v.as_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("-");

    let (greeting, intro, footer) = if is_owner {
        (
            "Halo,".to_string(),
            format!(
                "Pembayaran dari <strong>{}</strong> untuk invoice <strong>{}</strong> telah diterima.",
                escape_html(client_name),
                escape_html(invoice_number)
            ),
            "Pembayaran ini telah dicatat secara otomatis di akun InvoiceQu Anda.".to_string(),
        )
    } else {
        (
            format!("Hi {},", escape_html(client_name)),
            format!(
                "Thank you. Your payment for invoice <strong>{}</strong> has been received and confirmed.",
                escape_html(invoice_number)
            ),
            "Please keep this email as your payment receipt. Thank you for your trust."
                .to_string(),
        )
    };

    let header_title = if is_owner {
        "Pembayaran Diterima 💰"
    } else {
        "Payment Successful"
    };

    let status_label = if is_owner {
        "✅ Invoice Lunas"
    } else {
        "Paid"
    };

    let status_desc = if is_owner {
        format!(
            "Invoice untuk {} sudah dibayar penuh.",
            escape_html(client_name)
        )
    } else {
        "This invoice has been paid in full. There is no remaining balance.".to_string()
    };
    let invoice_label = if is_owner {
        "No. Invoice"
    } else {
        "Invoice No."
    };
    let due_date_label = if is_owner { "Jatuh Tempo" } else { "Due Date" };
    let total_label = if is_owner {
        "Total Invoice"
    } else {
        "Invoice Total"
    };
    let paid_label = if is_owner {
        "Total Dibayar"
    } else {
        "Total Paid"
    };

    format!(
        "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:680px;margin:0 auto;padding:24px;\">
            <div style=\"border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;background:#ffffff;\">
                <div style=\"background:#047857;color:#ffffff;padding:22px 24px;\">
                    <p style=\"margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#D1FAE5;\">InvoiceQu</p>
                    <h1 style=\"margin:0;font-size:26px;line-height:1.15;\">{}</h1>
                </div>
                <div style=\"padding:24px;\">
                    <p>{}</p>
                    <p>{}</p>
                    <div style=\"border:1px solid #D1FAE5;background:#ECFDF5;border-radius:12px;padding:16px;margin:20px 0;\">
                        <p style=\"margin:0;color:#065F46;font-weight:800;font-size:16px;\">{}</p>
                        <p style=\"margin:6px 0 0;color:#047857;\">{}</p>
                    </div>
                    <table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"font-size:14px;margin:18px 0;\">
                        <tr>
                            <td style=\"padding:8px 0;color:#6B7280;\">{}</td>
                            <td style=\"padding:8px 0;text-align:right;font-weight:700;\">{}</td>
                        </tr>
                        <tr>
                            <td style=\"padding:8px 0;color:#6B7280;\">Client</td>
                            <td style=\"padding:8px 0;text-align:right;font-weight:600;\">{}</td>
                        </tr>
                        <tr>
                            <td style=\"padding:8px 0;color:#6B7280;\">{}</td>
                            <td style=\"padding:8px 0;text-align:right;font-weight:600;\">{}</td>
                        </tr>
                        <tr>
                            <td style=\"padding:8px 0;color:#6B7280;\">{}</td>
                            <td style=\"padding:8px 0;text-align:right;font-weight:600;\">{}</td>
                        </tr>
                        <tr>
                            <td style=\"padding:14px 0 0;border-top:1px solid #E5E7EB;font-size:16px;font-weight:800;\">{}</td>
                            <td style=\"padding:14px 0 0;border-top:1px solid #E5E7EB;text-align:right;font-size:18px;font-weight:800;color:#047857;\">{}</td>
                        </tr>
                    </table>
                    <p style=\"color:#6B7280;font-size:14px;margin-top:22px;\">{}</p>
                </div>
            </div>
        </div>",
        header_title,
        greeting,
        intro,
        status_label,
        status_desc,
        invoice_label,
        escape_html(invoice_number),
        escape_html(client_name),
        due_date_label,
        escape_html(due_date),
        total_label,
        format_money(total, currency),
        paid_label,
        format_money(amount_paid, currency),
        footer
    )
}

async fn maybe_create_remaining_payment_link(
    env: &Env,
    payment_db: &NeonClient,
    inv_db: &NeonClient,
    invoice: &serde_json::Value,
    source_link: &PaymentLink,
) -> Result<()> {
    let payment_type = invoice
        .get("payment_type")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let status = invoice.get("status").and_then(|v| v.as_str()).unwrap_or("");
    let remaining = invoice
        .get("amount_remaining")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let existing_link = invoice
        .get("remaining_payment_link")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if payment_type != "dp"
        || status != "partially_paid"
        || remaining <= 0.0
        || !existing_link.is_empty()
    {
        return Ok(());
    }

    let invoice_id = invoice.get("id").and_then(|v| v.as_str()).unwrap_or("");
    let invoice_number = invoice
        .get("invoice_number")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let client_name = invoice
        .get("client_name")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let currency = invoice
        .get("currency")
        .and_then(|v| v.as_str())
        .unwrap_or(&source_link.currency);
    if invoice_id.is_empty() {
        return Ok(());
    }

    let id = utils::generate_id();
    let url = format!("{}/{}", payment_page_base_url(env), id);
    let title = format!(
        "Remaining Balance for Invoice {} — {}",
        invoice_number, client_name
    );
    let description = format!("Remaining payment for {}", client_name);

    payment_db.execute(
        "INSERT INTO payment_links (id,user_id,title,description,amount,currency,status,url,clicks,payments,invoice_id,payment_provider,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,'active',$7,0,0,$8,$9,NOW(),NOW())",
        &[
            serde_json::json!(&id),
            serde_json::json!(&source_link.user_id),
            serde_json::json!(title),
            serde_json::json!(description),
            serde_json::json!(remaining),
            serde_json::json!(currency),
            serde_json::json!(&url),
            serde_json::json!(invoice_id),
            serde_json::json!(&source_link.payment_provider),
        ],
    ).await?;

    inv_db.execute(
        "UPDATE invoices SET remaining_payment_link=$1 WHERE id=$2 AND (remaining_payment_link IS NULL OR remaining_payment_link='')",
        &[serde_json::json!(url), serde_json::json!(invoice_id)],
    ).await?;

    send_dp_remaining_payment_email(env, invoice, remaining, currency, &url).await;

    Ok(())
}

async fn send_dp_remaining_payment_email(
    env: &Env,
    invoice: &serde_json::Value,
    remaining: f64,
    currency: &str,
    payment_url: &str,
) {
    let client_email = invoice
        .get("client_email")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    if client_email.is_empty() {
        console_log!("[EMAIL] Client email is empty, skipping DP remaining payment email");
        return;
    }

    let invoice_number = invoice
        .get("invoice_number")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let subject = format!("Invoice {} - Remaining Balance", invoice_number);
    let html = build_dp_remaining_payment_email_html(invoice, remaining, currency, payment_url);

    notification::queue_email_via_resend(env, client_email, &subject, &html);
}

fn build_dp_remaining_payment_email_html(
    invoice: &serde_json::Value,
    remaining: f64,
    currency: &str,
    payment_url: &str,
) -> String {
    let invoice_number = invoice
        .get("invoice_number")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let client_name = invoice
        .get("client_name")
        .and_then(|v| v.as_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("Customer");
    let total = invoice.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let amount_paid = invoice
        .get("amount_paid")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    let due_date = invoice
        .get("due_date")
        .and_then(|v| v.as_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("-");

    format!(
        "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:680px;margin:0 auto;padding:24px;\">
            <div style=\"border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;background:#ffffff;\">
                <div style=\"background:#111827;color:#ffffff;padding:22px 24px;\">
                    <p style=\"margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#D1D5DB;\">InvoiceQu</p>
                    <h1 style=\"margin:0;font-size:26px;line-height:1.15;\">Remaining Invoice Balance</h1>
                </div>
                <div style=\"padding:24px;\">
                    <p>Hi {},</p>
                    <p>Thank you. We have received your down payment for invoice <strong>{}</strong>. Here are the remaining balance details.</p>
                    <div style=\"border:1px solid #D1FAE5;background:#ECFDF5;border-radius:12px;padding:16px;margin:20px 0;\">
                        <p style=\"margin:0;color:#065F46;font-weight:800;\">Down payment received</p>
                        <p style=\"margin:6px 0 0;color:#047857;\">Please complete the remaining balance using the link below.</p>
                    </div>
                    <table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"font-size:14px;margin:18px 0;\">
                        <tr>
                            <td style=\"padding:8px 0;color:#6B7280;\">Invoice No.</td>
                            <td style=\"padding:8px 0;text-align:right;font-weight:700;\">{}</td>
                        </tr>
                        <tr>
                            <td style=\"padding:8px 0;color:#6B7280;\">Due Date</td>
                            <td style=\"padding:8px 0;text-align:right;font-weight:600;\">{}</td>
                        </tr>
                        <tr>
                            <td style=\"padding:8px 0;color:#6B7280;\">Invoice Total</td>
                            <td style=\"padding:8px 0;text-align:right;font-weight:600;\">{}</td>
                        </tr>
                        <tr>
                            <td style=\"padding:8px 0;color:#6B7280;\">Paid</td>
                            <td style=\"padding:8px 0;text-align:right;font-weight:600;color:#047857;\">{}</td>
                        </tr>
                        <tr>
                            <td style=\"padding:14px 0 0;border-top:1px solid #E5E7EB;font-size:16px;font-weight:800;\">Remaining Balance</td>
                            <td style=\"padding:14px 0 0;border-top:1px solid #E5E7EB;text-align:right;font-size:18px;font-weight:800;color:#991B1B;\">{}</td>
                        </tr>
                    </table>
                    <p style=\"margin:24px 0 12px;\">
                        <a href=\"{}\" style=\"display:inline-block;background:#DC2626;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;\">Pay Remaining Balance</a>
                    </p>
                    <p style=\"font-size:12px;color:#6B7280;word-break:break-all;margin:0;\">{}</p>
                    <p style=\"color:#6B7280;font-size:14px;margin-top:22px;\">If you have already paid, please ignore this email.</p>
                </div>
            </div>
        </div>",
        escape_html(client_name),
        escape_html(invoice_number),
        escape_html(invoice_number),
        escape_html(due_date),
        format_money(total, currency),
        format_money(amount_paid, currency),
        format_money(remaining, currency),
        escape_html(payment_url),
        escape_html(payment_url)
    )
}

async fn attach_payment_link_to_invoice(env: &Env, invoice_id: &str, url: &str) -> Result<()> {
    let inv_db = NeonClient::from_connection_string(&utils::get_secret(env, "INVOICE_DB_URL"))?;
    inv_db.execute(
        "UPDATE invoices SET payment_link=CASE WHEN status!='partially_paid' AND (payment_link IS NULL OR payment_link='') THEN $1 ELSE payment_link END, remaining_payment_link=CASE WHEN status='partially_paid' AND amount_remaining>0 AND (remaining_payment_link IS NULL OR remaining_payment_link='') THEN $1 ELSE remaining_payment_link END WHERE id=$2",
        &[serde_json::json!(url), serde_json::json!(invoice_id)],
    ).await?;

    Ok(())
}

async fn find_webhook_payment_link(
    db: &NeonClient,
    external_id: &str,
    payment_id: &str,
    provider_order_id: &str,
) -> Result<Option<PaymentLink>> {
    if !external_id.is_empty() {
        let link = db
            .query_one(
                &format!("SELECT {} FROM payment_links WHERE id=$1", PL_COLS),
                &[serde_json::json!(external_id)],
            )
            .await?;
        if link.is_some() {
            return Ok(link);
        }
    }

    if !payment_id.is_empty() {
        let link = db
            .query_one(
                &format!(
                    "SELECT {} FROM payment_links WHERE id=$1 OR provider_order_id=$1",
                    PL_COLS
                ),
                &[serde_json::json!(payment_id)],
            )
            .await?;
        if link.is_some() {
            return Ok(link);
        }
    }

    if !provider_order_id.is_empty() {
        return db
            .query_one(
                &format!(
                    "SELECT {} FROM payment_links WHERE provider_order_id=$1",
                    PL_COLS
                ),
                &[serde_json::json!(provider_order_id)],
            )
            .await;
    }

    Ok(None)
}

fn is_paid_provider_status(status: &str) -> bool {
    matches!(
        status.to_ascii_uppercase().as_str(),
        "PAID" | "SETTLED" | "COMPLETED" | "SUCCEEDED" | "SUCCESS"
    )
}
