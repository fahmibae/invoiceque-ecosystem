//! Payment service — payment links, PayPal, Xendit, webhooks.

use crate::db::NeonClient;
use crate::error::AppError;
use crate::middleware::Auth;
use crate::utils;
use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};

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
    pub invoice_id: Option<String>,
    pub payment_provider: Option<String>,
    pub provider_order_id: Option<String>,
    pub expires_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

const PL_COLS: &str = "id, user_id, title, description, amount, currency, status, url, clicks, payments, invoice_id, payment_provider, provider_order_id, expires_at::text, created_at::text, updated_at::text";

fn db(http: &reqwest::Client) -> Result<NeonClient, AppError> {
    utils::get_db("PAYMENT_DB_URL", http)
}

pub async fn list(
    req: HttpRequest,
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let (page, per_page) = utils::parse_pagination(req.query_string());
    let offset = (page - 1) * per_page;
    let db = db(&http)?;
    let total: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM payment_links WHERE user_id=$1",
            &[serde_json::json!(auth.0.user_id)],
        )
        .await?;
    let links: Vec<PaymentLink> = db.query_typed(&format!("SELECT {} FROM payment_links WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", PL_COLS),
        &[serde_json::json!(auth.0.user_id), serde_json::json!(per_page), serde_json::json!(offset)]).await?;
    let total_pages = ((total as i32) + per_page - 1) / per_page;
    utils::json_response(
        &serde_json::json!({"data": links, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}),
        200,
    )
}

pub async fn get(
    path: web::Path<String>,
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    let link: Option<PaymentLink> = db
        .query_one(
            &format!(
                "SELECT {} FROM payment_links WHERE id=$1 AND user_id=$2",
                PL_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(auth.0.user_id)],
        )
        .await?;
    match link {
        Some(l) => utils::json_response(&l, 200),
        None => utils::json_error("Payment link not found", 404),
    }
}

pub async fn create(
    auth: Auth,
    body: web::Json<serde_json::Value>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let title = body.get("title").and_then(|v| v.as_str()).unwrap_or("");
    let amount = body.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
    if title.is_empty() {
        return utils::json_error("title required", 400);
    }
    let id = utils::generate_id();
    let base_url = utils::get_env("BASE_PAYMENT_URL");
    let base = if base_url.is_empty() {
        "https://app.invoicequ.my.id/pay".to_string()
    } else {
        base_url
    };
    let url = format!("{}/{}", base, id);
    let currency = body
        .get("currency")
        .and_then(|v| v.as_str())
        .unwrap_or("IDR");
    let desc = body
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let provider = body.get("payment_provider").and_then(|v| v.as_str());
    let invoice_id = body.get("invoice_id").and_then(|v| v.as_str());
    let db = db(&http)?;
    db.execute("INSERT INTO payment_links (id,user_id,title,description,amount,currency,status,url,clicks,payments,invoice_id,payment_provider,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,'active',$7,0,0,$8,$9,NOW(),NOW())",
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id), serde_json::json!(title), serde_json::json!(desc),
          serde_json::json!(amount), serde_json::json!(currency), serde_json::json!(url),
          serde_json::json!(invoice_id), serde_json::json!(provider)]).await?;
    if let Some(invoice_id) = invoice_id.filter(|value| !value.is_empty()) {
        attach_payment_link_to_invoice(&http, invoice_id, &url)
            .await
            .ok();
    }
    let link: Option<PaymentLink> = db
        .query_one(
            &format!(
                "SELECT {} FROM payment_links WHERE id=$1 AND user_id=$2",
                PL_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(auth.0.user_id)],
        )
        .await?;
    match link {
        Some(l) => utils::json_response(&l, 201),
        None => utils::json_error("Failed", 500),
    }
}

pub async fn update(
    path: web::Path<String>,
    auth: Auth,
    body: web::Json<serde_json::Value>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    let existing: Option<PaymentLink> = db
        .query_one(
            &format!(
                "SELECT {} FROM payment_links WHERE id=$1 AND user_id=$2",
                PL_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(auth.0.user_id)],
        )
        .await?;
    let ex = match existing {
        Some(e) => e,
        None => return utils::json_error("Payment link not found", 404),
    };
    db.execute("UPDATE payment_links SET title=$1, description=$2, amount=$3, status=$4, updated_at=NOW() WHERE id=$5 AND user_id=$6",
        &[serde_json::json!(body.get("title").and_then(|v| v.as_str()).unwrap_or(&ex.title)),
          serde_json::json!(body.get("description").and_then(|v| v.as_str()).unwrap_or(&ex.description)),
          serde_json::json!(body.get("amount").and_then(|v| v.as_f64()).unwrap_or(ex.amount)),
          serde_json::json!(body.get("status").and_then(|v| v.as_str()).unwrap_or(&ex.status)),
          serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    let link: Option<PaymentLink> = db
        .query_one(
            &format!(
                "SELECT {} FROM payment_links WHERE id=$1 AND user_id=$2",
                PL_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(auth.0.user_id)],
        )
        .await?;
    match link {
        Some(l) => utils::json_response(&l, 200),
        None => utils::json_error("Not found", 404),
    }
}

pub async fn delete(
    path: web::Path<String>,
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    db(&http)?
        .execute(
            "DELETE FROM payment_links WHERE id=$1 AND user_id=$2",
            &[serde_json::json!(id), serde_json::json!(auth.0.user_id)],
        )
        .await?;
    utils::json_response(&serde_json::json!({"message": "Payment link deleted"}), 200)
}

pub async fn bulk_delete(
    auth: Auth,
    body: web::Json<serde_json::Value>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let ids: Vec<String> = body
        .get("ids")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    if ids.is_empty() {
        return utils::json_error("ids is required", 400);
    }
    let deleted = db(&http)?
        .execute(
            "DELETE FROM payment_links WHERE user_id=$1 AND id=ANY($2)",
            &[
                serde_json::json!(auth.0.user_id),
                serde_json::json!(utils::to_pg_array(&ids)),
            ],
        )
        .await?;
    utils::json_response(
        &serde_json::json!({"message": "Deleted", "deleted": deleted}),
        200,
    )
}

// ── Public payment endpoints ──

pub async fn get_public(
    path: web::Path<String>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
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

pub async fn checkout(
    path: web::Path<String>,
    body: Option<web::Json<serde_json::Value>>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
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
        return utils::json_error("Pembayaran sudah selesai", 400);
    }
    if !link.status.eq_ignore_ascii_case("active") {
        return utils::json_error("Payment link not active", 400);
    }
    let body = body
        .map(|b| b.into_inner())
        .unwrap_or_else(|| serde_json::json!({}));
    let provider = body
        .get("provider")
        .and_then(|v| v.as_str())
        .or(link.payment_provider.as_deref())
        .unwrap_or("paypal");
    if provider == "paypal" {
        return create_paypal_order(&http, &db, &link).await;
    }
    if provider == "xendit" {
        return create_xendit_checkout(&http, &db, &link).await;
    }
    utils::json_error("Unsupported payment provider", 400)
}

pub async fn capture_public(
    path: web::Path<String>,
    body: Option<web::Json<serde_json::Value>>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let body = body
        .map(|b| b.into_inner())
        .unwrap_or_else(|| serde_json::json!({}));
    let db = db(&http)?;
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
            &serde_json::json!({"status": "completed", "message": "Pembayaran sudah selesai"}),
            200,
        );
    }
    let provider = link.payment_provider.as_deref().unwrap_or("manual");
    if provider != "paypal" {
        return utils::json_error("Payment link ini bukan PayPal", 400);
    }
    let order_id = body
        .get("order_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or_else(|| link.provider_order_id.clone())
        .unwrap_or_default();
    if order_id.is_empty() {
        return utils::json_error("PayPal order belum dibuat untuk payment link ini", 400);
    }
    let client_id = utils::get_env("PAYPAL_CLIENT_ID");
    let secret = utils::get_env("PAYPAL_SECRET");
    if client_id.is_empty() || secret.is_empty() {
        return utils::json_error("PayPal not configured", 500);
    }
    let token = get_paypal_token(&http).await?;
    let base = paypal_base_url();
    let resp = http
        .post(&format!("{}/v2/checkout/orders/{}/capture", base, order_id))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body("{}")
        .send()
        .await?;
    let status = resp.status();
    let result: serde_json::Value = resp.json().await?;
    if !status.is_success() {
        if is_paypal_order_already_captured(&result) {
            complete_paypal_link(&http, &db, &link, &order_id).await?;
            return utils::json_response(
                &serde_json::json!({"status": "completed", "order_id": order_id, "message": "Pembayaran sudah diproses"}),
                200,
            );
        }

        return utils::json_response(
            &serde_json::json!({"error": "Gagal capture pembayaran PayPal", "details": result}),
            502,
        );
    }
    if result.get("status").and_then(|v| v.as_str()) == Some("COMPLETED") {
        complete_paypal_link(&http, &db, &link, &order_id).await?;
        return utils::json_response(
            &serde_json::json!({"status": "completed", "order_id": order_id, "message": "Pembayaran berhasil"}),
            200,
        );
    }
    let pp_status = result.get("status").and_then(|v| v.as_str()).unwrap_or("");
    utils::json_response(
        &serde_json::json!({"status": pp_status.to_ascii_lowercase(), "order_id": order_id}),
        200,
    )
}

pub async fn check_status_public(
    path: web::Path<String>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
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

    if link.payment_provider.as_deref() == Some("xendit") {
        if let Some(invoice_id) = link
            .provider_order_id
            .as_deref()
            .filter(|id| !id.is_empty())
        {
            let api_key = utils::get_env("XENDIT_API_KEY");
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
                match fetch_xendit_invoice(&http, &api_key, &xendit_user_id, invoice_id).await {
                    Ok(invoice) => {
                        let xendit_status = invoice
                            .get("status")
                            .and_then(|v| v.as_str())
                            .unwrap_or("UNKNOWN")
                            .to_ascii_uppercase();

                        if matches!(xendit_status.as_str(), "PAID" | "SETTLED") {
                            complete_payment_link(&http, &db, &link, Some(invoice_id)).await?;
                            return utils::json_response(
                                &serde_json::json!({
                                    "status": "completed",
                                    "provider_order_id": invoice_id,
                                    "xendit_status": xendit_status,
                                }),
                                200,
                            );
                        }

                        if xendit_status == "EXPIRED" {
                            return utils::json_response(
                                &serde_json::json!({
                                    "status": "expired",
                                    "provider_order_id": invoice_id,
                                    "xendit_status": xendit_status,
                                }),
                                200,
                            );
                        }

                        return utils::json_response(
                            &serde_json::json!({
                                "status": "pending",
                                "provider_order_id": invoice_id,
                                "xendit_status": xendit_status,
                            }),
                            200,
                        );
                    }
                    Err(err) => {
                        return utils::json_response(
                            &serde_json::json!({
                                "status": link.status,
                                "provider_order_id": invoice_id,
                                "message": format!("Xendit status check failed: {}", err),
                            }),
                            200,
                        );
                    }
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

pub async fn paypal_setup(
    auth: Auth,
    body: web::Json<serde_json::Value>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let email = body
        .get("paypal_email")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if email.is_empty() {
        return utils::json_error("paypal_email is required", 400);
    }
    let id = uuid::Uuid::new_v4().to_string();
    db(&http)?.execute("INSERT INTO paypal_accounts (id, user_id, paypal_email, status, created_at, updated_at) VALUES ($1,$2,$3,'ACTIVE',NOW(),NOW()) ON CONFLICT (user_id) DO UPDATE SET paypal_email=$3, updated_at=NOW()",
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id), serde_json::json!(email)]).await?;
    utils::json_response(
        &serde_json::json!({"message": "PayPal account configured", "paypal_email": email}),
        200,
    )
}

pub async fn paypal_get_account(
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let acc: Option<serde_json::Value> = db(&http)?.query_one("SELECT id, user_id, paypal_email, status, created_at::text, updated_at::text FROM paypal_accounts WHERE user_id=$1",
        &[serde_json::json!(auth.0.user_id)]).await?;
    match acc {
        Some(a) => utils::json_response(&a, 200),
        None => utils::json_error("No PayPal account configured", 404),
    }
}

pub async fn paypal_delete_account(
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    db(&http)?
        .execute(
            "DELETE FROM paypal_accounts WHERE user_id=$1",
            &[serde_json::json!(auth.0.user_id)],
        )
        .await?;
    utils::json_response(
        &serde_json::json!({"message": "PayPal account removed"}),
        200,
    )
}

pub async fn xendit_setup(
    auth: Auth,
    body: web::Json<serde_json::Value>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
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

    let api_key = utils::get_env("XENDIT_API_KEY");
    if api_key.is_empty() {
        return utils::json_error("Xendit not configured", 500);
    }

    let xendit_account = match create_xendit_sub_account(&http, &api_key, email, biz).await {
        Ok(account) => account,
        Err(err) => {
            return utils::json_response(
                &serde_json::json!({
                    "error": "Failed to create Xendit account",
                    "details": err.to_string(),
                }),
                502,
            )
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
    let account: Option<serde_json::Value> = db(&http)?
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
                serde_json::json!(auth.0.user_id),
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

pub async fn xendit_get_account(
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let acc: Option<serde_json::Value> = db(&http)?.query_one("SELECT id, user_id, xendit_user_id, account_email, business_name, status, created_at::text, updated_at::text FROM xendit_accounts WHERE user_id=$1",
        &[serde_json::json!(auth.0.user_id)]).await?;
    match acc {
        Some(a) => utils::json_response(&a, 200),
        None => utils::json_error("No Xendit account configured", 404),
    }
}

pub async fn delete_by_invoice(
    path: web::Path<String>,
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let invoice_id = path.into_inner();
    let deleted = db(&http)?
        .execute(
            "DELETE FROM payment_links WHERE user_id=$1 AND invoice_id=$2",
            &[
                serde_json::json!(auth.0.user_id),
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
    auth: Auth,
    body: web::Json<serde_json::Value>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let ids: Vec<String> = body
        .get("invoice_ids")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    if ids.is_empty() {
        return utils::json_error("invoice_ids is required", 400);
    }
    let deleted = db(&http)?
        .execute(
            "DELETE FROM payment_links WHERE user_id=$1 AND invoice_id=ANY($2)",
            &[
                serde_json::json!(auth.0.user_id),
                serde_json::json!(utils::to_pg_array(&ids)),
            ],
        )
        .await?;
    utils::json_response(
        &serde_json::json!({"message": "Payment links deleted", "deleted": deleted}),
        200,
    )
}

pub async fn paypal_capture_order(
    path: web::Path<String>,
    _auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let order_id = path.into_inner();
    let token = get_paypal_token(&http).await?;
    let base = utils::get_env("PAYPAL_BASE_URL");
    let base = if base.is_empty() {
        "https://api-m.paypal.com"
    } else {
        &base
    };
    let result: serde_json::Value = http
        .post(&format!("{}/v2/checkout/orders/{}/capture", base, order_id))
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .body("{}")
        .send()
        .await?
        .json()
        .await?;
    let pp_status = result.get("status").and_then(|v| v.as_str()).unwrap_or("");
    if pp_status == "COMPLETED" {
        let db = db(&http)?;
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
            complete_payment_link(&http, &db, &l, Some(&order_id)).await?;
        }
    }
    utils::json_response(
        &serde_json::json!({"status": pp_status, "order_id": order_id, "message": if pp_status == "COMPLETED" { "Payment captured successfully" } else { "Capture pending" }}),
        200,
    )
}

// ── Webhooks ──

pub async fn handle_webhook(
    body: web::Json<serde_json::Value>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
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
    if is_paid_provider_status(status) {
        let db = db(&http)?;
        let link =
            find_webhook_payment_link(&db, external_id, payment_id, provider_order_id).await?;
        if let Some(link) = link {
            let order_id = if provider_order_id.is_empty() {
                None
            } else {
                Some(provider_order_id)
            };
            complete_payment_link(&http, &db, &link, order_id).await?;
        }
    }
    utils::json_response(&serde_json::json!({"status": "processed"}), 200)
}

pub async fn handle_paypal_webhook(
    body: web::Json<serde_json::Value>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
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
        let db = db(&http)?;
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
            complete_payment_link(&http, &db, &link, Some(order_id)).await?;
        }
    }
    utils::json_response(&serde_json::json!({"status": "ok"}), 200)
}

// ── PayPal helpers ──

async fn get_paypal_token(http: &reqwest::Client) -> Result<String, AppError> {
    let client_id = utils::get_env("PAYPAL_CLIENT_ID");
    let secret = utils::get_env("PAYPAL_SECRET");
    let base = paypal_base_url();
    use base64::Engine;
    let creds =
        base64::engine::general_purpose::STANDARD.encode(format!("{}:{}", client_id, secret));
    let resp = http
        .post(&format!("{}/v1/oauth2/token", base))
        .header("Authorization", format!("Basic {}", creds))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body("grant_type=client_credentials")
        .send()
        .await?;
    let status = resp.status();
    let result: serde_json::Value = resp.json().await?;
    if !status.is_success() {
        let message = result
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("invalid_token_response");
        return Err(AppError(format!(
            "PayPal token request failed ({}): {}",
            status, message
        )));
    }
    result
        .get("access_token")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| AppError("Failed to get PayPal token".into()))
}

async fn create_paypal_order(
    http: &reqwest::Client,
    db: &NeonClient,
    link: &PaymentLink,
) -> Result<HttpResponse, AppError> {
    let client_id = utils::get_env("PAYPAL_CLIENT_ID");
    let secret = utils::get_env("PAYPAL_SECRET");
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
    let token = get_paypal_token(http).await?;
    let base = paypal_base_url();
    let payment_base_url = payment_page_base_url();
    let order_body = serde_json::json!({
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": &link.id,
            "amount": {"currency_code": &link.currency, "value": format!("{:.2}", link.amount)},
            "description": &link.title,
            "payee": {"email_address": payee_email}
        }],
        "application_context": {
            "return_url": format!("{}/{}/paypal-return", payment_base_url, link.id),
            "cancel_url": format!("{}/{}/paypal-cancel", payment_base_url, link.id),
            "brand_name": "InvoiceQu",
            "user_action": "PAY_NOW"
        }
    });
    let resp = http
        .post(&format!("{}/v2/checkout/orders", base))
        .header("Authorization", format!("Bearer {}", token))
        .json(&order_body)
        .send()
        .await?;
    let status = resp.status();
    let result: serde_json::Value = resp.json().await?;
    if !status.is_success() {
        return utils::json_response(
            &serde_json::json!({"error": "Gagal membuat order PayPal", "details": result}),
            502,
        );
    }
    let pp_order_id = match result.get("id").and_then(|v| v.as_str()) {
        Some(order_id) => order_id.to_string(),
        None => {
            return utils::json_response(
                &serde_json::json!({"error": "Gagal membuat order PayPal", "details": result}),
                502,
            )
        }
    };
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
    if approve_url.is_empty() {
        return utils::json_response(
            &serde_json::json!({"error": "Gagal mendapatkan URL persetujuan PayPal", "details": result}),
            502,
        );
    }
    db.execute("UPDATE payment_links SET provider_order_id=$1, payment_provider='paypal', updated_at=NOW() WHERE id=$2",
        &[serde_json::json!(&pp_order_id), serde_json::json!(&link.id)]).await.ok();
    utils::json_response(
        &serde_json::json!({"order_id": pp_order_id, "approve_url": approve_url}),
        200,
    )
}

async fn create_xendit_checkout(
    http: &reqwest::Client,
    db: &NeonClient,
    link: &PaymentLink,
) -> Result<HttpResponse, AppError> {
    let api_key = utils::get_env("XENDIT_API_KEY");
    if api_key.is_empty() {
        return utils::json_error("Xendit not configured", 500);
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

    // Older monolith builds stored a local 32-char hex ID as xendit_user_id.
    // Repair that record lazily so existing users do not need manual DB fixes.
    if is_local_generated_id(&xendit_user_id)
        && !account_email.is_empty()
        && !business_name.is_empty()
    {
        let repaired_account =
            create_xendit_sub_account(http, &api_key, account_email, business_name).await?;
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

    if let Some(invoice_id) = &link.provider_order_id {
        if !invoice_id.is_empty() {
            return get_xendit_invoice_checkout_url(http, &api_key, &xendit_user_id, invoice_id)
                .await;
        }
    }

    let payment_base_url = payment_page_base_url();
    let payload = serde_json::json!({
        "external_id": &link.id,
        "amount": link.amount,
        "description": &link.title,
        "currency": &link.currency,
        "success_redirect_url": format!("{}/{}/xendit-return", payment_base_url, link.id),
        "failure_redirect_url": format!("{}/{}", payment_base_url, link.id),
        "invoice_duration": 86400,
    });

    let result = match create_xendit_invoice(http, &api_key, &xendit_user_id, &payload).await {
        Ok(result) => result,
        Err(err) => {
            return utils::json_response(
                &serde_json::json!({
                    "error": "Gagal membuat invoice Xendit",
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
                &serde_json::json!({"error": "Gagal membuat invoice Xendit", "details": result}),
                502,
            )
        }
    };
    let checkout_url = match result.get("invoice_url").and_then(|v| v.as_str()) {
        Some(url) if !url.is_empty() => url.to_string(),
        _ => {
            return utils::json_response(
                &serde_json::json!({"error": "Gagal mendapatkan URL invoice Xendit", "details": result}),
                502,
            )
        }
    };

    db.execute("UPDATE payment_links SET provider_order_id=$1, payment_provider='xendit', url=$2, updated_at=NOW() WHERE id=$3",
        &[serde_json::json!(&xendit_invoice_id), serde_json::json!(&checkout_url), serde_json::json!(&link.id)]).await.ok();

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
    http: &reqwest::Client,
    api_key: &str,
    email: &str,
    business_name: &str,
) -> Result<serde_json::Value, AppError> {
    let payload = serde_json::json!({
        "email": email,
        "type": "MANAGED",
        "public_profile": {
            "business_name": business_name,
        },
    });

    let resp = http
        .post(&format!("{}/v2/accounts", xendit_base_url()))
        .basic_auth(api_key, Some(""))
        .json(&payload)
        .send()
        .await?;
    let status = resp.status();
    let result: serde_json::Value = resp.json().await?;

    if !status.is_success() {
        return Err(AppError(format!(
            "Xendit create account failed ({}): {}",
            status, result
        )));
    }

    Ok(result)
}

async fn create_xendit_invoice(
    http: &reqwest::Client,
    api_key: &str,
    xendit_user_id: &str,
    payload: &serde_json::Value,
) -> Result<serde_json::Value, AppError> {
    let resp = http
        .post(&format!("{}/v2/invoices", xendit_base_url()))
        .basic_auth(api_key, Some(""))
        .header("for-user-id", xendit_user_id)
        .json(payload)
        .send()
        .await?;
    let status = resp.status();
    let result: serde_json::Value = resp.json().await?;

    if !status.is_success() {
        return Err(AppError(format!(
            "Xendit create invoice failed ({}): {}",
            status, result
        )));
    }

    Ok(result)
}

async fn fetch_xendit_invoice(
    http: &reqwest::Client,
    api_key: &str,
    xendit_user_id: &str,
    invoice_id: &str,
) -> Result<serde_json::Value, AppError> {
    let resp = http
        .get(&format!("{}/v2/invoices/{}", xendit_base_url(), invoice_id))
        .basic_auth(api_key, Some(""))
        .header("for-user-id", xendit_user_id)
        .send()
        .await?;
    let status = resp.status();
    let result: serde_json::Value = resp.json().await?;

    if !status.is_success() {
        return Err(AppError(format!(
            "Xendit get invoice failed ({}): {}",
            status, result
        )));
    }

    Ok(result)
}

fn is_local_generated_id(value: &str) -> bool {
    value.len() == 32 && value.as_bytes().iter().all(|byte| byte.is_ascii_hexdigit())
}

async fn get_xendit_invoice_checkout_url(
    http: &reqwest::Client,
    api_key: &str,
    xendit_user_id: &str,
    invoice_id: &str,
) -> Result<HttpResponse, AppError> {
    let base = xendit_base_url();
    let resp = http
        .get(&format!("{}/v2/invoices/{}", base, invoice_id))
        .basic_auth(api_key, Some(""))
        .header("for-user-id", xendit_user_id)
        .send()
        .await?;
    let status = resp.status();
    let result: serde_json::Value = resp.json().await?;
    if !status.is_success() {
        return utils::json_response(
            &serde_json::json!({"error": "Gagal mengambil invoice Xendit", "details": result}),
            502,
        );
    }
    let checkout_url = result
        .get("invoice_url")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if checkout_url.is_empty() {
        return utils::json_response(
            &serde_json::json!({"error": "Gagal mendapatkan URL invoice Xendit", "details": result}),
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

fn paypal_base_url() -> String {
    let base = utils::get_env("PAYPAL_BASE_URL");
    if base.is_empty() {
        "https://api-m.paypal.com".to_string()
    } else {
        base
    }
}

fn xendit_base_url() -> String {
    let base = utils::get_env("XENDIT_BASE_URL");
    if base.is_empty() {
        "https://api.xendit.co".to_string()
    } else {
        base
    }
}

fn payment_page_base_url() -> String {
    let base = utils::get_env("BASE_PAYMENT_URL");
    let base = if base.is_empty() {
        "https://app.invoicequ.my.id/pay".to_string()
    } else {
        base
    };
    base.trim_end_matches('/').to_string()
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
    http: &reqwest::Client,
    db: &NeonClient,
    link: &PaymentLink,
    order_id: &str,
) -> Result<(), AppError> {
    complete_payment_link(http, db, link, Some(order_id)).await
}

async fn complete_payment_link(
    http: &reqwest::Client,
    db: &NeonClient,
    link: &PaymentLink,
    provider_order_id: Option<&str>,
) -> Result<(), AppError> {
    let updated = match provider_order_id.filter(|value| !value.is_empty()) {
        Some(order_id) => db.execute(
            "UPDATE payment_links SET status='completed', payments=payments+1, provider_order_id=COALESCE(NULLIF(provider_order_id,''), $1), updated_at=NOW() WHERE id=$2 AND LOWER(status) NOT IN ('completed','paid')",
            &[serde_json::json!(order_id), serde_json::json!(&link.id)],
        ).await?,
        None => db.execute(
            "UPDATE payment_links SET status='completed', payments=payments+1, updated_at=NOW() WHERE id=$1 AND LOWER(status) NOT IN ('completed','paid')",
            &[serde_json::json!(&link.id)],
        ).await?,
    };

    if updated > 0 {
        apply_invoice_payment(http, db, link).await.ok();
    }

    Ok(())
}

async fn apply_invoice_payment(
    http: &reqwest::Client,
    payment_db: &NeonClient,
    link: &PaymentLink,
) -> Result<(), AppError> {
    let Some(inv_id) = &link.invoice_id else {
        return Ok(());
    };
    if inv_id.is_empty() {
        return Ok(());
    }

    let inv_db = NeonClient::new(&utils::get_env("INVOICE_DB_URL"), http.clone())?;
    let invoice: Option<serde_json::Value> = inv_db.query_one(
        "UPDATE invoices SET amount_paid=LEAST(total, amount_paid+$1), amount_remaining=GREATEST(total-LEAST(total, amount_paid+$1),0), status=CASE WHEN GREATEST(total-LEAST(total, amount_paid+$1),0)<=0 THEN 'paid' WHEN LEAST(total, amount_paid+$1)>0 THEN 'partially_paid' ELSE status END, paid_at=CASE WHEN GREATEST(total-LEAST(total, amount_paid+$1),0)<=0 THEN COALESCE(paid_at,NOW()) ELSE paid_at END WHERE id=$2 RETURNING id, invoice_number, user_id, client_name, client_email, total, status, payment_type, amount_paid, amount_remaining, remaining_payment_link, currency",
        &[serde_json::json!(link.amount), serde_json::json!(inv_id)],
    ).await?;

    if let Some(invoice) = invoice {
        maybe_create_remaining_payment_link(http, payment_db, &inv_db, &invoice, link)
            .await
            .ok();
    }

    Ok(())
}

async fn maybe_create_remaining_payment_link(
    http: &reqwest::Client,
    payment_db: &NeonClient,
    inv_db: &NeonClient,
    invoice: &serde_json::Value,
    source_link: &PaymentLink,
) -> Result<(), AppError> {
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
    let url = format!("{}/{}", payment_page_base_url(), id);
    let title = format!("Pelunasan Invoice {} — {}", invoice_number, client_name);
    let description = format!("Sisa pembayaran untuk {}", client_name);

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

    let _ = http;
    Ok(())
}

async fn attach_payment_link_to_invoice(
    http: &reqwest::Client,
    invoice_id: &str,
    url: &str,
) -> Result<(), AppError> {
    let inv_db = NeonClient::new(&utils::get_env("INVOICE_DB_URL"), http.clone())?;
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
) -> Result<Option<PaymentLink>, AppError> {
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
