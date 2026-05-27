//! Invoice service module — CRUD, dashboard, settings.
//! Mirrors: services/invoice-service (Go)

use crate::db::NeonClient;
use crate::middleware::JwtClaims;
use crate::services::{notification, subscription};
use crate::utils;
use serde::{Deserialize, Serialize};
use worker::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    pub id: String,
    #[serde(default, rename = "number", alias = "invoice_number")]
    pub invoice_number: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub client_id: String,
    #[serde(default)]
    pub client_name: String,
    #[serde(default)]
    pub client_email: String,
    #[serde(default)]
    pub subtotal: f64,
    #[serde(default)]
    pub tax: f64,
    #[serde(default)]
    pub discount: f64,
    #[serde(default)]
    pub total: f64,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub payment_type: String,
    #[serde(default)]
    pub dp_percentage: i32,
    #[serde(default)]
    pub dp_amount: f64,
    #[serde(default)]
    pub amount_paid: f64,
    #[serde(default)]
    pub amount_remaining: f64,
    #[serde(default)]
    pub due_date: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub paid_at: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub payment_link: String,
    #[serde(default)]
    pub remaining_payment_link: String,
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub exchange_rate_idr: f64,
    #[serde(default)]
    pub items: Vec<InvoiceItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceItem {
    pub id: String,
    #[serde(default)]
    pub invoice_id: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub quantity: i32,
    #[serde(default)]
    pub price: f64,
    #[serde(default)]
    pub total: f64,
}

#[derive(Debug, Deserialize)]
pub struct InvoiceRequest {
    pub client_id: String,
    pub client_name: String,
    #[serde(default)]
    pub client_email: String,
    pub items: Vec<ItemRequest>,
    pub tax: Option<f64>,
    pub discount: Option<f64>,
    #[serde(default)]
    pub due_date: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub payment_type: String,
    pub dp_percentage: Option<i32>,
    #[serde(default)]
    pub currency: String,
}

#[derive(Debug, Deserialize)]
pub struct ItemRequest {
    pub description: String,
    pub quantity: i32,
    pub price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoiceSettings {
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub business_name: String,
    #[serde(default)]
    pub business_email: String,
    #[serde(default)]
    pub business_phone: String,
    #[serde(default)]
    pub business_website: String,
    #[serde(default)]
    pub business_address: String,
    #[serde(default)]
    pub logo_url: String,
    #[serde(default)]
    pub accent_color: String,
    #[serde(default)]
    pub footer_text: String,
    #[serde(default)]
    pub bank_name: String,
    #[serde(default)]
    pub bank_account_number: String,
    #[serde(default)]
    pub bank_account_name: String,
}

#[derive(Debug, Deserialize)]
pub struct InvoiceSettingsUpdate {
    #[serde(default)]
    pub business_name: Option<String>,
    #[serde(default)]
    pub business_email: Option<String>,
    #[serde(default)]
    pub business_phone: Option<String>,
    #[serde(default)]
    pub business_website: Option<String>,
    #[serde(default)]
    pub business_address: Option<String>,
    #[serde(default)]
    pub logo_url: Option<String>,
    #[serde(default)]
    pub accent_color: Option<String>,
    #[serde(default)]
    pub footer_text: Option<String>,
    #[serde(default)]
    pub bank_name: Option<String>,
    #[serde(default)]
    pub bank_account_number: Option<String>,
    #[serde(default)]
    pub bank_account_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct InvoiceReminderCandidate {
    pub invoice_id: String,
    #[serde(default)]
    pub invoice_number: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub client_name: String,
    #[serde(default)]
    pub client_email: String,
    #[serde(default)]
    pub amount_due: f64,
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub due_date_key: String,
    #[serde(default)]
    pub due_date_label: String,
    #[serde(default)]
    pub days_before: i32,
    #[serde(default)]
    pub payment_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ReminderStatusRow {
    #[serde(default)]
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct InvoiceReminderRunSummary {
    #[serde(default)]
    pub checked: usize,
    #[serde(default)]
    pub sent: usize,
    #[serde(default)]
    pub skipped: usize,
    #[serde(default)]
    pub failed: usize,
}

const INV_COLS: &str = "id, invoice_number, user_id, client_id, client_name, client_email, subtotal, tax, discount, total, status, payment_type, dp_percentage, dp_amount, amount_paid, amount_remaining, due_date, created_at::text, paid_at::text, notes, payment_link, remaining_payment_link, currency, exchange_rate_idr";

pub async fn list(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let url = req.url()?;
    let status = utils::query_param(&url, "status").unwrap_or_default();
    let page = utils::query_param(&url, "page")
        .and_then(|v| v.parse::<i32>().ok())
        .unwrap_or(0);
    let size = utils::query_param(&url, "size")
        .and_then(|v| v.parse::<i32>().ok())
        .unwrap_or(10);
    let offset = page * size;

    let db = get_db(env)?;

    let (count_sql, data_sql, params_count, params_data) = if status.is_empty() {
        (
            "SELECT COUNT(*) FROM invoices WHERE user_id = $1",
            format!("SELECT {} FROM invoices WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", INV_COLS),
            vec![serde_json::json!(claims.user_id)],
            vec![serde_json::json!(claims.user_id), serde_json::json!(size), serde_json::json!(offset)],
        )
    } else {
        (
            "SELECT COUNT(*) FROM invoices WHERE user_id = $1 AND status = $2",
            format!("SELECT {} FROM invoices WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4", INV_COLS),
            vec![serde_json::json!(claims.user_id), serde_json::json!(status)],
            vec![serde_json::json!(claims.user_id), serde_json::json!(status), serde_json::json!(size), serde_json::json!(offset)],
        )
    };

    let total: i64 = db.query_scalar(count_sql, &params_count).await?;
    let mut invoices: Vec<Invoice> = db.query_typed(&data_sql, &params_data).await?;

    // Load items for each invoice
    for inv in &mut invoices {
        inv.items = db.query_typed(
            "SELECT id, invoice_id, description, quantity, price, total FROM invoice_items WHERE invoice_id = $1",
            &[serde_json::json!(inv.id)],
        ).await.unwrap_or_default();
    }

    let total_pages = if size > 0 {
        ((total as i32) + size - 1) / size
    } else {
        0
    };

    utils::json_response(
        &serde_json::json!({
            "data": invoices, "total": total,
            "page": page, "per_page": size, "total_pages": total_pages,
        }),
        200,
    )
}

pub async fn get(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let inv = fetch_invoice_with_items(&db, &claims.user_id, id).await?;

    match inv {
        Some(i) => utils::json_response(&i, 200),
        None => utils::json_error("Invoice not found", 404),
    }
}

pub async fn create(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: InvoiceRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let db = get_db(env)?;
    if let Some(resp) = subscription::limit_reached_response(env, claims, "invoices").await? {
        return Ok(resp);
    }

    let id = utils::generate_id();

    // Calculate totals
    let subtotal: f64 = body.items.iter().map(|i| i.price * i.quantity as f64).sum();
    let tax = body.tax.unwrap_or(0.0);
    let discount = body.discount.unwrap_or(0.0);
    let total = subtotal + (subtotal * tax / 100.0) - discount;
    let status = if body.status.is_empty() {
        "draft"
    } else {
        &body.status
    };
    let payment_type = if body.payment_type.is_empty() {
        "full"
    } else {
        &body.payment_type
    };
    let dp_pct = body.dp_percentage.unwrap_or(0);
    let dp_amount = if payment_type == "dp" {
        total * dp_pct as f64 / 100.0
    } else {
        0.0
    };
    let amount_remaining = if payment_type == "dp" {
        total - dp_amount
    } else {
        total
    };
    let currency = if body.currency.is_empty() {
        "IDR"
    } else {
        &body.currency
    };

    let inv_number = generate_invoice_number(&db, &id).await?;

    db.execute(
        "INSERT INTO invoices (id, invoice_number, user_id, client_id, client_name, client_email, subtotal, tax, discount, total, status, payment_type, dp_percentage, dp_amount, amount_paid, amount_remaining, due_date, notes, currency) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,0,$15,$16,$17,$18)",
        &[
            serde_json::json!(id), serde_json::json!(inv_number), serde_json::json!(claims.user_id),
            serde_json::json!(body.client_id), serde_json::json!(body.client_name), serde_json::json!(body.client_email),
            serde_json::json!(subtotal), serde_json::json!(tax), serde_json::json!(discount), serde_json::json!(total),
            serde_json::json!(status), serde_json::json!(payment_type), serde_json::json!(dp_pct),
            serde_json::json!(dp_amount), serde_json::json!(amount_remaining),
            serde_json::json!(body.due_date), serde_json::json!(body.notes), serde_json::json!(currency),
        ],
    ).await?;

    // Insert items
    for item in &body.items {
        let item_id = utils::generate_id();
        let item_total = item.price * item.quantity as f64;
        db.execute(
            "INSERT INTO invoice_items (id, invoice_id, description, quantity, price, total) VALUES ($1,$2,$3,$4,$5,$6)",
            &[serde_json::json!(item_id), serde_json::json!(id), serde_json::json!(item.description),
              serde_json::json!(item.quantity), serde_json::json!(item.price), serde_json::json!(item_total)],
        ).await?;
    }

    if status != "draft" && !body.client_email.trim().is_empty() {
        let subject = if payment_type == "dp" {
            format!("Invoice {} - Down Payment Request", inv_number)
        } else {
            format!("Invoice {} - Payment Request", inv_number)
        };

        let html = build_invoice_created_email_html(
            &inv_number,
            &body,
            subtotal,
            tax,
            discount,
            total,
            currency,
            payment_type,
            dp_pct,
            dp_amount,
            amount_remaining,
            "",
        );
        notification::queue_email_via_resend(env, body.client_email.trim(), &subject, &html);
        // Record in-app notification (must be awaited — spawn_local doesn't survive Worker response)
        if let Err(e) = notification::create_notification(
            env,
            &claims.user_id,
            "invoice_sent",
            "Invoice Terkirim",
            &format!(
                "Invoice {} untuk {} telah dibuat dan dikirim.",
                inv_number, body.client_name
            ),
            body.client_email.trim(),
            &subject,
            "sent",
        )
        .await
        {
            console_log!(
                "[NOTIFICATION] Failed to create invoice_sent notification: {}",
                e
            );
        }
    } else if status == "draft" {
        console_log!(
            "[EMAIL] Invoice {} saved as draft, skipping invoice created email",
            inv_number
        );
    } else {
        console_log!(
            "[EMAIL] Client email is empty, skipping invoice created email for {}",
            inv_number
        );
    }

    self::get(env, claims, &id).await
}

pub async fn update(mut req: Request, env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let body: InvoiceRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let db = get_db(env)?;

    let subtotal: f64 = body.items.iter().map(|i| i.price * i.quantity as f64).sum();
    let tax = body.tax.unwrap_or(0.0);
    let discount = body.discount.unwrap_or(0.0);
    let total = subtotal + (subtotal * tax / 100.0) - discount;
    let status = if body.status.is_empty() {
        "draft"
    } else {
        &body.status
    };
    let payment_type = if body.payment_type.is_empty() {
        "full"
    } else {
        &body.payment_type
    };
    let dp_pct = body.dp_percentage.unwrap_or(0);
    let dp_amount = if payment_type == "dp" {
        total * dp_pct as f64 / 100.0
    } else {
        0.0
    };
    let amount_remaining = if payment_type == "dp" {
        total - dp_amount
    } else {
        total
    };
    let currency = if body.currency.is_empty() {
        "IDR"
    } else {
        &body.currency
    };

    db.execute(
        "UPDATE invoices SET client_id=$1, client_name=$2, client_email=$3, subtotal=$4, tax=$5, discount=$6, total=$7, status=$8, payment_type=$9, dp_percentage=$10, dp_amount=$11, amount_remaining=$12, due_date=$13, notes=$14, currency=$15 WHERE id=$16 AND user_id=$17",
        &[
            serde_json::json!(body.client_id), serde_json::json!(body.client_name), serde_json::json!(body.client_email),
            serde_json::json!(subtotal), serde_json::json!(tax), serde_json::json!(discount), serde_json::json!(total),
            serde_json::json!(status), serde_json::json!(payment_type), serde_json::json!(dp_pct),
            serde_json::json!(dp_amount), serde_json::json!(amount_remaining),
            serde_json::json!(body.due_date), serde_json::json!(body.notes), serde_json::json!(currency),
            serde_json::json!(id), serde_json::json!(claims.user_id),
        ],
    ).await?;

    // Replace items
    db.execute(
        "DELETE FROM invoice_items WHERE invoice_id = $1",
        &[serde_json::json!(id)],
    )
    .await?;
    for item in &body.items {
        let item_id = utils::generate_id();
        let item_total = item.price * item.quantity as f64;
        db.execute(
            "INSERT INTO invoice_items (id, invoice_id, description, quantity, price, total) VALUES ($1,$2,$3,$4,$5,$6)",
            &[serde_json::json!(item_id), serde_json::json!(id), serde_json::json!(item.description),
              serde_json::json!(item.quantity), serde_json::json!(item.price), serde_json::json!(item_total)],
        ).await?;
    }

    self::get(env, claims, id).await
}

pub async fn delete(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    db.execute(
        "DELETE FROM invoices WHERE id=$1 AND user_id=$2",
        &[serde_json::json!(id), serde_json::json!(claims.user_id)],
    )
    .await?;
    utils::json_response(
        &serde_json::json!({"message": "Invoice deleted successfully"}),
        200,
    )
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
            "DELETE FROM invoices WHERE user_id=$1 AND id=ANY($2)",
            &[serde_json::json!(claims.user_id), serde_json::json!(pg_arr)],
        )
        .await?;
    utils::json_response(
        &serde_json::json!({"message": "Invoices deleted", "deleted": deleted}),
        200,
    )
}

pub async fn list_linkable(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let invoices: Vec<Invoice> = db.query_typed(
        &format!("SELECT {} FROM invoices WHERE user_id=$1 AND (status != 'paid' OR (payment_type='dp' AND amount_remaining > 0)) ORDER BY created_at DESC", INV_COLS),
        &[serde_json::json!(claims.user_id)],
    ).await?;
    utils::json_response(&serde_json::json!({"data": invoices}), 200)
}

pub async fn send_invoice(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let updated = db
        .execute(
            "UPDATE invoices SET status='sent' WHERE id=$1 AND user_id=$2 AND status='draft'",
            &[serde_json::json!(id), serde_json::json!(claims.user_id)],
        )
        .await?;

    let invoice = fetch_invoice_with_items(&db, &claims.user_id, id).await?;
    if updated > 0 {
        if let Some(ref invoice) = invoice {
            send_invoice_email_from_invoice(env, invoice).await;
            // Record in-app notification (must be awaited — spawn_local doesn't survive Worker response)
            if let Err(e) = notification::create_notification(
                env,
                &claims.user_id,
                "invoice_sent",
                "Invoice Terkirim",
                &format!(
                    "Invoice {} untuk {} telah dikirim.",
                    invoice.invoice_number, invoice.client_name
                ),
                &invoice.client_email,
                &format!("Invoice {} - Payment Request", invoice.invoice_number),
                "sent",
            )
            .await
            {
                console_log!(
                    "[NOTIFICATION] Failed to create invoice_sent notification: {}",
                    e
                );
            }

            // Auto-create payment chaser for this invoice
            auto_create_chaser(&db, &claims.user_id, invoice).await;
        }
    }

    match invoice {
        Some(invoice) => utils::json_response(&invoice, 200),
        None => utils::json_error("Invoice not found", 404),
    }
}

pub async fn get_dashboard_stats(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let uid = serde_json::json!(claims.user_id);

    let fx = "CASE COALESCE(currency,'IDR') \
        WHEN 'IDR' THEN 1 WHEN 'USD' THEN 16200 WHEN 'EUR' THEN 18400 WHEN 'GBP' THEN 20800 \
        WHEN 'SGD' THEN 12300 WHEN 'MYR' THEN 3700 WHEN 'JPY' THEN 108 WHEN 'AUD' THEN 10500 \
        WHEN 'CAD' THEN 12000 WHEN 'CHF' THEN 18600 WHEN 'CNY' THEN 2250 WHEN 'HKD' THEN 2080 \
        WHEN 'INR' THEN 195 WHEN 'PHP' THEN 290 WHEN 'THB' THEN 470 WHEN 'VND' THEN 0.65 \
        WHEN 'NZD' THEN 9800 WHEN 'SEK' THEN 1600 WHEN 'NOK' THEN 1530 WHEN 'DKK' THEN 2470 \
        WHEN 'PLN' THEN 4200 WHEN 'CZK' THEN 720 WHEN 'HUF' THEN 45 WHEN 'BRL' THEN 2850 \
        WHEN 'MXN' THEN 950 WHEN 'TWD' THEN 510 WHEN 'ILS' THEN 4500 WHEN 'RUB' THEN 185 \
        ELSE 1 END";

    let total_revenue: f64 = db
        .query_scalar(
            &format!(
                "SELECT COALESCE(SUM(amount_paid * {}),0) FROM invoices WHERE user_id=$1",
                fx
            ),
            &[uid.clone()],
        )
        .await
        .unwrap_or(0.0);
    let total_invoices: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM invoices WHERE user_id=$1",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let paid_invoices: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM invoices WHERE user_id=$1 AND status='paid'",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let pending_amount: f64 = db.query_scalar(
        &format!("SELECT COALESCE(SUM(amount_remaining * {}),0) FROM invoices WHERE user_id=$1 AND status IN ('sent','outstanding','partially_paid')", fx),
        &[uid.clone()]).await.unwrap_or(0.0);
    let overdue_invoices: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM invoices WHERE user_id=$1 AND status='overdue'",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);

    utils::json_response(
        &serde_json::json!({
            "totalRevenue": total_revenue, "totalInvoices": total_invoices,
            "paidInvoices": paid_invoices, "pendingAmount": pending_amount,
            "overdueInvoices": overdue_invoices, "activePaymentLinks": 0,
        }),
        200,
    )
}

pub async fn get_revenue_chart(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let fx = "CASE COALESCE(currency,'IDR') \
        WHEN 'IDR' THEN 1 WHEN 'USD' THEN 16200 WHEN 'EUR' THEN 18400 WHEN 'GBP' THEN 20800 \
        WHEN 'SGD' THEN 12300 WHEN 'MYR' THEN 3700 WHEN 'JPY' THEN 108 WHEN 'AUD' THEN 10500 \
        WHEN 'CAD' THEN 12000 WHEN 'CHF' THEN 18600 WHEN 'CNY' THEN 2250 WHEN 'HKD' THEN 2080 \
        WHEN 'INR' THEN 195 WHEN 'PHP' THEN 290 WHEN 'THB' THEN 470 WHEN 'VND' THEN 0.65 \
        WHEN 'NZD' THEN 9800 WHEN 'SEK' THEN 1600 WHEN 'NOK' THEN 1530 WHEN 'DKK' THEN 2470 \
        WHEN 'PLN' THEN 4200 WHEN 'CZK' THEN 720 WHEN 'HUF' THEN 45 WHEN 'BRL' THEN 2850 \
        WHEN 'MXN' THEN 950 WHEN 'TWD' THEN 510 WHEN 'ILS' THEN 4500 WHEN 'RUB' THEN 185 \
        ELSE 1 END";
    let rows: Vec<serde_json::Map<String, serde_json::Value>> = db.query_as_maps(
        &format!("SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COALESCE(SUM(amount_paid * {}),0) as revenue FROM invoices WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '12 months' GROUP BY month ORDER BY month", fx),
        &[serde_json::json!(claims.user_id)],
    ).await?;

    let chart: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|m| serde_json::Value::Object(m))
        .collect();
    utils::json_response(&chart, 200)
}

pub async fn get_settings(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let settings: Option<InvoiceSettings> = db.query_one(
        "SELECT user_id, business_name, business_email, business_phone, business_website, business_address, COALESCE(logo_url,'') as logo_url, accent_color, footer_text, bank_name, bank_account_number, bank_account_name FROM invoice_settings WHERE user_id=$1",
        &[serde_json::json!(claims.user_id)],
    ).await?;

    match settings {
        Some(s) => utils::json_response(&s, 200),
        None => utils::json_response(
            &InvoiceSettings {
                user_id: claims.user_id.clone(),
                accent_color: "#DC2626".into(),
                footer_text: "Thank you for your trust.".into(),
                ..Default::default()
            },
            200,
        ),
    }
}

impl Default for InvoiceSettings {
    fn default() -> Self {
        Self {
            user_id: String::new(),
            business_name: String::new(),
            business_email: String::new(),
            business_phone: String::new(),
            business_website: String::new(),
            business_address: String::new(),
            logo_url: String::new(),
            accent_color: "#DC2626".into(),
            footer_text: "Thank you for your trust.".into(),
            bank_name: String::new(),
            bank_account_number: String::new(),
            bank_account_name: String::new(),
        }
    }
}

pub async fn update_settings(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    // Deserialize into an update struct with optional fields so we can
    // preserve existing values when the client omits fields (e.g. logo_url).
    let body: InvoiceSettingsUpdate = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let db = get_db(env)?;
    // Use EXCLUDED in DO UPDATE and COALESCE to keep existing column values
    // when the incoming value is NULL (i.e. field omitted).
    db.execute(
        "INSERT INTO invoice_settings (user_id, business_name, business_email, business_phone, business_website, business_address, logo_url, accent_color, footer_text, bank_name, bank_account_number, bank_account_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (user_id) DO UPDATE SET business_name=COALESCE(EXCLUDED.business_name, invoice_settings.business_name), business_email=COALESCE(EXCLUDED.business_email, invoice_settings.business_email), business_phone=COALESCE(EXCLUDED.business_phone, invoice_settings.business_phone), business_website=COALESCE(EXCLUDED.business_website, invoice_settings.business_website), business_address=COALESCE(EXCLUDED.business_address, invoice_settings.business_address), logo_url=COALESCE(EXCLUDED.logo_url, invoice_settings.logo_url), accent_color=COALESCE(EXCLUDED.accent_color, invoice_settings.accent_color), footer_text=COALESCE(EXCLUDED.footer_text, invoice_settings.footer_text), bank_name=COALESCE(EXCLUDED.bank_name, invoice_settings.bank_name), bank_account_number=COALESCE(EXCLUDED.bank_account_number, invoice_settings.bank_account_number), bank_account_name=COALESCE(EXCLUDED.bank_account_name, invoice_settings.bank_account_name)",
        &[
            serde_json::json!(claims.user_id), serde_json::json!(body.business_name),
            serde_json::json!(body.business_email), serde_json::json!(body.business_phone),
            serde_json::json!(body.business_website), serde_json::json!(body.business_address),
            serde_json::json!(body.logo_url), serde_json::json!(body.accent_color),
            serde_json::json!(body.footer_text), serde_json::json!(body.bank_name),
            serde_json::json!(body.bank_account_number), serde_json::json!(body.bank_account_name),
        ],
    ).await?;

    self::get_settings(env, claims).await
}

pub async fn handle_payment_event(mut req: Request, env: &Env) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let invoice_id = body
        .get("invoice_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let amount = body.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let status = body.get("status").and_then(|v| v.as_str()).unwrap_or("");

    if invoice_id.is_empty() {
        return utils::json_response(&serde_json::json!({"status": "ignored"}), 200);
    }

    let db = get_db(env)?;
    if status == "paid" || status == "COMPLETED" {
        db.execute(
            "UPDATE invoices SET amount_paid = LEAST(total, amount_paid + $1), amount_remaining = GREATEST(total - LEAST(total, amount_paid + $1), 0), status = CASE WHEN GREATEST(total - LEAST(total, amount_paid + $1), 0) <= 0 THEN 'paid' WHEN LEAST(total, amount_paid + $1) > 0 THEN 'partially_paid' ELSE status END, paid_at = CASE WHEN GREATEST(total - LEAST(total, amount_paid + $1), 0) <= 0 THEN COALESCE(paid_at, NOW()) ELSE paid_at END WHERE id = $2",
            &[serde_json::json!(amount), serde_json::json!(invoice_id)],
        ).await?;
    }

    utils::json_response(&serde_json::json!({"status": "processed"}), 200)
}

pub async fn send_due_invoice_reminders(env: &Env) -> Result<InvoiceReminderRunSummary> {
    let db = get_db(env)?;

    ensure_invoice_reminders_table(&db).await?;

    let candidates: Vec<InvoiceReminderCandidate> = db
        .query_typed(
            "WITH normalized AS (
                SELECT
                    id AS invoice_id,
                    invoice_number,
                    user_id,
                    COALESCE(client_name, '') AS client_name,
                    COALESCE(client_email, '') AS client_email,
                    GREATEST(COALESCE(amount_remaining, total - COALESCE(amount_paid, 0)), 0) AS amount_due,
                    COALESCE(currency, 'IDR') AS currency,
                    COALESCE(status, '') AS status,
                    LEFT(COALESCE(due_date, ''), 10) AS due_date_key,
                    COALESCE(payment_link, '') AS payment_link,
                    COALESCE(remaining_payment_link, '') AS remaining_payment_link
                FROM invoices
                WHERE COALESCE(client_email, '') <> ''
                  AND COALESCE(due_date, '') <> ''
                  AND COALESCE(status, '') NOT IN ('draft', 'paid', 'cancelled', 'canceled')
                  AND GREATEST(COALESCE(amount_remaining, total - COALESCE(amount_paid, 0)), 0) > 0
            ),
            prepared AS (
                SELECT
                    *,
                    CASE
                        WHEN due_date_key ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN due_date_key::date
                        ELSE NULL
                    END AS due_on
                FROM normalized
            )
            SELECT
                invoice_id,
                invoice_number,
                user_id,
                client_name,
                client_email,
                amount_due,
                currency,
                status,
                due_date_key,
                TO_CHAR(due_on, 'DD Mon YYYY') AS due_date_label,
                (due_on - (NOW() AT TIME ZONE 'Asia/Jakarta')::date) AS days_before,
                CASE
                    WHEN status = 'partially_paid' AND remaining_payment_link <> '' THEN remaining_payment_link
                    ELSE payment_link
                END AS payment_url
            FROM prepared
            WHERE due_on IS NOT NULL
              AND (due_on - (NOW() AT TIME ZONE 'Asia/Jakarta')::date) IN (14, 7, 1)
            ORDER BY days_before DESC, due_on ASC",
            &[],
        )
        .await?;

    let mut summary = InvoiceReminderRunSummary {
        checked: candidates.len(),
        ..Default::default()
    };

    for candidate in candidates {
        if invoice_reminder_already_sent(&db, &candidate).await? {
            summary.skipped += 1;
            continue;
        }

        let subject = build_invoice_reminder_subject(&candidate);
        let html = build_invoice_reminder_html(&candidate);

        match notification::send_email_via_resend(env, &candidate.client_email, &subject, &html)
            .await
        {
            Ok(()) => {
                upsert_invoice_reminder_attempt(&db, &candidate, "sent", None).await?;
                summary.sent += 1;
            }
            Err(err) => {
                upsert_invoice_reminder_attempt(&db, &candidate, "failed", Some(err.to_string()))
                    .await?;
                summary.failed += 1;
            }
        }
    }

    Ok(summary)
}

async fn ensure_invoice_reminders_table(db: &NeonClient) -> Result<()> {
    db.execute(
        "CREATE TABLE IF NOT EXISTS invoice_due_reminders (
            id VARCHAR(64) PRIMARY KEY,
            invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
            user_id VARCHAR(64) NOT NULL,
            client_email VARCHAR(255) NOT NULL,
            days_before INTEGER NOT NULL CHECK (days_before IN (1, 7, 14)),
            due_date DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT DEFAULT '',
            last_attempted_at TIMESTAMP WITH TIME ZONE,
            sent_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (invoice_id, days_before, due_date)
        )",
        &[],
    )
    .await?;

    db.execute(
        "CREATE INDEX IF NOT EXISTS idx_invoice_due_reminders_lookup
         ON invoice_due_reminders (invoice_id, days_before, due_date)",
        &[],
    )
    .await?;

    Ok(())
}

async fn invoice_reminder_already_sent(
    db: &NeonClient,
    candidate: &InvoiceReminderCandidate,
) -> Result<bool> {
    let existing: Option<ReminderStatusRow> = db
        .query_one(
            "SELECT status
             FROM invoice_due_reminders
             WHERE invoice_id=$1 AND days_before=$2 AND due_date=$3::date
             ORDER BY updated_at DESC
             LIMIT 1",
            &[
                serde_json::json!(candidate.invoice_id),
                serde_json::json!(candidate.days_before),
                serde_json::json!(candidate.due_date_key),
            ],
        )
        .await?;

    Ok(existing
        .map(|row| row.status.eq_ignore_ascii_case("sent"))
        .unwrap_or(false))
}

async fn upsert_invoice_reminder_attempt(
    db: &NeonClient,
    candidate: &InvoiceReminderCandidate,
    status: &str,
    error_message: Option<String>,
) -> Result<()> {
    let error_message = error_message
        .unwrap_or_default()
        .chars()
        .take(500)
        .collect::<String>();

    db.execute(
        "INSERT INTO invoice_due_reminders (
            id, invoice_id, user_id, client_email, days_before, due_date,
            status, attempts, last_error, last_attempted_at, sent_at, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6::date,
            $7, 1, $8, NOW(), CASE WHEN $7 = 'sent' THEN NOW() ELSE NULL END, NOW(), NOW()
        )
        ON CONFLICT (invoice_id, days_before, due_date)
        DO UPDATE SET
            user_id = EXCLUDED.user_id,
            client_email = EXCLUDED.client_email,
            status = EXCLUDED.status,
            attempts = invoice_due_reminders.attempts + 1,
            last_error = EXCLUDED.last_error,
            last_attempted_at = NOW(),
            sent_at = CASE
                WHEN EXCLUDED.status = 'sent'
                    THEN COALESCE(invoice_due_reminders.sent_at, NOW())
                ELSE invoice_due_reminders.sent_at
            END,
            updated_at = NOW()",
        &[
            serde_json::json!(utils::generate_id()),
            serde_json::json!(candidate.invoice_id),
            serde_json::json!(candidate.user_id),
            serde_json::json!(candidate.client_email),
            serde_json::json!(candidate.days_before),
            serde_json::json!(candidate.due_date_key),
            serde_json::json!(status),
            serde_json::json!(error_message),
        ],
    )
    .await?;

    Ok(())
}

fn build_invoice_reminder_subject(candidate: &InvoiceReminderCandidate) -> String {
    match candidate.days_before {
        1 => format!(
            "Invoice Reminder: {} is due tomorrow",
            candidate.invoice_number
        ),
        days => format!(
            "Invoice Reminder: {} is due in {} days",
            candidate.invoice_number, days
        ),
    }
}

fn build_invoice_reminder_html(candidate: &InvoiceReminderCandidate) -> String {
    let client_name = if candidate.client_name.trim().is_empty() {
        "Customer"
    } else {
        &candidate.client_name
    };
    let amount = format_money(candidate.amount_due, &candidate.currency);
    let reminder_copy = match candidate.days_before {
        1 => "is due tomorrow".to_string(),
        days => format!("is due in {} days", days),
    };
    let payment_action = if candidate.payment_url.trim().is_empty() {
        String::new()
    } else {
        format!(
            "<p style=\"margin:24px 0;\">
                <a href=\"{}\" style=\"display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;\">Pay Now</a>
            </p>
            <p style=\"font-size:12px;color:#6B7280;word-break:break-all;\">{}</p>",
            escape_html(&candidate.payment_url),
            escape_html(&candidate.payment_url)
        )
    };

    format!(
        "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px;margin:0 auto;padding:24px;\">
            <h2 style=\"margin:0 0 16px;\">Invoice Reminder</h2>
            <p>Hi {},</p>
            <p>Invoice <strong>{}</strong> {}.</p>
            <div style=\"border:1px solid #E5E7EB;border-radius:12px;padding:16px;margin:20px 0;background:#F9FAFB;\">
                <p style=\"margin:0 0 8px;\"><strong>Invoice No.</strong>: {}</p>
                <p style=\"margin:0 0 8px;\"><strong>Due Date</strong>: {}</p>
                <p style=\"margin:0 0 8px;\"><strong>Outstanding Amount</strong>: {}</p>
                <p style=\"margin:0;\"><strong>Reminder</strong>: H-{}</p>
            </div>
            {}
            <p style=\"color:#6B7280;font-size:14px;\">If you have already paid, please ignore this email.</p>
        </div>",
        escape_html(client_name),
        escape_html(&candidate.invoice_number),
        reminder_copy,
        escape_html(&candidate.invoice_number),
        escape_html(&candidate.due_date_label),
        amount,
        candidate.days_before,
        payment_action
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

fn build_invoice_created_email_html(
    invoice_number: &str,
    body: &InvoiceRequest,
    subtotal: f64,
    tax: f64,
    discount: f64,
    total: f64,
    currency: &str,
    payment_type: &str,
    dp_percentage: i32,
    dp_amount: f64,
    amount_remaining: f64,
    payment_url: &str,
) -> String {
    let client_name = if body.client_name.trim().is_empty() {
        "Customer"
    } else {
        body.client_name.trim()
    };
    let due_date = if body.due_date.trim().is_empty() {
        "-"
    } else {
        body.due_date.trim()
    };
    let items = build_invoice_items_email_rows(&body.items, currency);
    let payment_summary = build_invoice_payment_summary(
        payment_type,
        dp_percentage,
        dp_amount,
        amount_remaining,
        total,
        currency,
    );

    let payment_action = if payment_url.trim().is_empty() {
        String::new()
    } else {
        format!(
            "<p style=\"margin:24px 0;\">
                <a href=\"{}\" style=\"display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;\">Pay Now</a>
            </p>",
            escape_html(payment_url)
        )
    };

    let notes = if body.notes.trim().is_empty() {
        String::new()
    } else {
        format!(
            "<p style=\"margin:18px 0 0;color:#4B5563;\"><strong>Notes:</strong> {}</p>",
            escape_html(body.notes.trim())
        )
    };

    format!(
        "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:680px;margin:0 auto;padding:24px;\">
            <div style=\"border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;background:#ffffff;\">
            <div style=\"background:#111827;color:#ffffff;padding:22px 24px;\">
                <p style=\"margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#D1D5DB;\">InvoiceQu</p>
                <h1 style=\"margin:0;font-size:28px;line-height:1.15;\">Invoice</h1>
            </div>
            <div style=\"padding:24px;\">
            <p>Hi {},</p>
            <p>Here is invoice <strong>{}</strong> for your review and payment.</p>
            <div style=\"display:block;border:1px solid #E5E7EB;border-radius:12px;padding:16px;margin:20px 0;background:#F9FAFB;\">
                <p style=\"margin:0 0 8px;color:#6B7280;font-size:13px;\">Invoice No.</p>
                <p style=\"margin:0 0 12px;font-size:18px;font-weight:700;color:#111827;\">{}</p>
                <p style=\"margin:0 0 8px;color:#6B7280;font-size:13px;\">Due Date</p>
                <p style=\"margin:0;font-weight:600;color:#111827;\">{}</p>
            </div>
            {}
            <table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin:18px 0 0;font-size:14px;overflow-x:auto;width:100%;\">
                <tr>
                    <td style=\"padding:8px 0;color:#6B7280;\">Subtotal</td>
                    <td style=\"padding:8px 0;text-align:right;font-weight:600;\">{}</td>
                </tr>
                <tr>
                    <td style=\"padding:8px 0;color:#6B7280;\">Tax</td>
                    <td style=\"padding:8px 0;text-align:right;font-weight:600;\">{}</td>
                </tr>
                <tr>
                    <td style=\"padding:8px 0;color:#6B7280;\">Discount</td>
                    <td style=\"padding:8px 0;text-align:right;font-weight:600;color:#DC2626;\">- {}</td>
                </tr>
                <tr>
                    <td style=\"padding:14px 0 0;border-top:1px solid #E5E7EB;font-size:16px;font-weight:800;\">Invoice Total</td>
                    <td style=\"padding:14px 0 0;border-top:1px solid #E5E7EB;text-align:right;font-size:18px;font-weight:800;\">{}</td>
                </tr>
            </table>
            {}
            {}
            {}
            <p style=\"color:#6B7280;font-size:14px;margin-top:22px;\">Please contact the invoice sender if you have any questions about this invoice.</p>
            </div>
            </div>
        </div>",
        escape_html(client_name),
        escape_html(invoice_number),
        escape_html(invoice_number),
        escape_html(due_date),
        items,
        format_money(subtotal, currency),
        format_money(tax, currency),
        format_money(discount, currency),
        format_money(total, currency),
        payment_summary,
        payment_action,
        notes
    )
}

async fn fetch_invoice_with_items(
    db: &NeonClient,
    user_id: &str,
    id: &str,
) -> Result<Option<Invoice>> {
    let mut invoice: Option<Invoice> = db
        .query_one(
            &format!(
                "SELECT {} FROM invoices WHERE id = $1 AND user_id = $2",
                INV_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(user_id)],
        )
        .await?;

    if let Some(ref mut invoice) = invoice {
        invoice.items = db
            .query_typed(
                "SELECT id, invoice_id, description, quantity, price, total FROM invoice_items WHERE invoice_id = $1",
                &[serde_json::json!(id)],
            )
            .await
            .unwrap_or_default();
    }

    Ok(invoice)
}

async fn send_invoice_email_from_invoice(env: &Env, invoice: &Invoice) {
    let client_email = invoice.client_email.trim();
    if client_email.is_empty() {
        console_log!(
            "[EMAIL] Client email is empty, skipping invoice created email for {}",
            invoice.invoice_number
        );
        return;
    }

    let subject = if invoice.payment_type == "dp" {
        format!("Invoice {} - Down Payment Request", invoice.invoice_number)
    } else {
        format!("Invoice {} - Payment Request", invoice.invoice_number)
    };
    let payment_url = invoice_payment_url(invoice);
    let body = invoice_request_from_invoice(invoice);
    let html = build_invoice_created_email_html(
        &invoice.invoice_number,
        &body,
        invoice.subtotal,
        invoice.tax,
        invoice.discount,
        invoice.total,
        &invoice.currency,
        &invoice.payment_type,
        invoice.dp_percentage,
        invoice.dp_amount,
        invoice.amount_remaining,
        &payment_url,
    );

    notification::queue_email_via_resend(env, client_email, &subject, &html);
}

fn invoice_request_from_invoice(invoice: &Invoice) -> InvoiceRequest {
    InvoiceRequest {
        client_id: invoice.client_id.clone(),
        client_name: invoice.client_name.clone(),
        client_email: invoice.client_email.clone(),
        items: invoice
            .items
            .iter()
            .map(|item| ItemRequest {
                description: item.description.clone(),
                quantity: item.quantity,
                price: item.price,
            })
            .collect(),
        tax: Some(invoice.tax),
        discount: Some(invoice.discount),
        due_date: invoice.due_date.clone(),
        notes: invoice.notes.clone(),
        status: invoice.status.clone(),
        payment_type: invoice.payment_type.clone(),
        dp_percentage: Some(invoice.dp_percentage),
        currency: invoice.currency.clone(),
    }
}

fn invoice_payment_url(invoice: &Invoice) -> String {
    if invoice.status == "paid" {
        return String::new();
    }

    if invoice.status == "partially_paid" && !invoice.remaining_payment_link.trim().is_empty() {
        return invoice.remaining_payment_link.trim().to_string();
    }

    if !invoice.payment_link.trim().is_empty() {
        return invoice.payment_link.trim().to_string();
    }

    String::new()
}

fn build_invoice_items_email_rows(items: &[ItemRequest], currency: &str) -> String {
    if items.is_empty() {
        return String::new();
    }

    let mut rows = String::new();
    for item in items {
        let item_total = item.price * item.quantity as f64;
        rows.push_str(&format!(
            "<tr>
                <td style=\"padding:10px 12px;border-bottom:1px solid #E5E7EB;\">{}</td>
                <td style=\"padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:center;\">{}</td>
                <td style=\"padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:right;\">{}</td>
                <td style=\"padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:right;font-weight:600;\">{}</td>
            </tr>",
            escape_html(&item.description),
            item.quantity,
            format_money(item.price, currency),
            format_money(item_total, currency)
        ));
    }

    format!(
        "<table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin:18px 0;font-size:14px;overflow-x:auto;width:100%;\">
            <thead>
                <tr style=\"background:#F3F4F6;color:#374151;\">
                    <th style=\"padding:10px 12px;text-align:left;\">Description</th>
                    <th style=\"padding:10px 12px;text-align:center;\">Qty</th>
                    <th style=\"padding:10px 12px;text-align:right;\">Price</th>
                    <th style=\"padding:10px 12px;text-align:right;\">Total</th>
                </tr>
            </thead>
            <tbody>{}</tbody>
        </table>",
        rows
    )
}

fn build_invoice_payment_summary(
    payment_type: &str,
    dp_percentage: i32,
    dp_amount: f64,
    amount_remaining: f64,
    total: f64,
    currency: &str,
) -> String {
    if payment_type == "dp" {
        return format!(
            "<div style=\"border:1px solid #FCA5A5;background:#FEF2F2;border-radius:12px;padding:16px;margin:18px 0 0;\">
                <p style=\"margin:0 0 8px;font-size:13px;font-weight:700;color:#991B1B;letter-spacing:.4px;text-transform:uppercase;\">Down Payment Plan</p>
                <table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"font-size:14px;\">
                    <tr>
                        <td style=\"padding:6px 0;color:#7F1D1D;\">First payment / DP ({}%)</td>
                        <td style=\"padding:6px 0;text-align:right;font-weight:800;color:#7F1D1D;\">{}</td>
                    </tr>
                    <tr>
                        <td style=\"padding:6px 0;color:#7F1D1D;\">Remaining balance</td>
                        <td style=\"padding:6px 0;text-align:right;font-weight:700;color:#7F1D1D;\">{}</td>
                    </tr>
                </table>
            </div>",
            dp_percentage,
            format_money(dp_amount, currency),
            format_money(amount_remaining, currency)
        );
    }

    format!(
        "<div style=\"border:1px solid #D1FAE5;background:#ECFDF5;border-radius:12px;padding:16px;margin:18px 0 0;\">
            <p style=\"margin:0;color:#065F46;font-weight:700;\">Amount due: {}</p>
        </div>",
        format_money(total, currency)
    )
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn get_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "INVOICE_DB_URL");
    NeonClient::from_connection_string(&url)
}

async fn generate_invoice_number(db: &NeonClient, invoice_id: &str) -> Result<String> {
    let date_code: String = db
        .query_scalar(
            "SELECT TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD')",
            &[],
        )
        .await?;
    let unique_code = invoice_id
        .chars()
        .take(6)
        .collect::<String>()
        .to_uppercase();

    Ok(format!("INV-{}-{}", date_code, unique_code))
}

/// Automatically create a payment chaser when an invoice is sent.
/// Silently ignores errors so it never blocks the send flow.
async fn auto_create_chaser(db: &NeonClient, user_id: &str, invoice: &Invoice) {
    // Ensure chaser table exists
    let _ = db.execute("CREATE TABLE IF NOT EXISTS payment_chasers (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, invoice_id TEXT NOT NULL, invoice_number TEXT NOT NULL DEFAULT '', client_name TEXT NOT NULL DEFAULT '', client_email TEXT NOT NULL DEFAULT '', amount_due DOUBLE PRECISION NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'IDR', due_date TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active', total_reminders_sent INTEGER NOT NULL DEFAULT 0, last_reminder_at TIMESTAMPTZ, next_reminder_at TIMESTAMPTZ, schedule TEXT NOT NULL DEFAULT '[-3,0,3,7,14]', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())", &[]).await;

    let id = utils::generate_id();
    let amount_due = if invoice.amount_remaining > 0.0 {
        invoice.amount_remaining
    } else {
        invoice.total
    };

    // Use ON CONFLICT to avoid duplicates if chaser already exists for this invoice
    let result = db.execute(
        "INSERT INTO payment_chasers (id, user_id, invoice_id, invoice_number, client_name, client_email, amount_due, currency, due_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING",
        &[
            serde_json::json!(id), serde_json::json!(user_id), serde_json::json!(invoice.id),
            serde_json::json!(invoice.invoice_number), serde_json::json!(invoice.client_name),
            serde_json::json!(invoice.client_email), serde_json::json!(amount_due),
            serde_json::json!(invoice.currency), serde_json::json!(invoice.due_date),
        ],
    ).await;

    match result {
        Ok(_) => console_log!(
            "[AUTO-CHASER] Created chaser for invoice {}",
            invoice.invoice_number
        ),
        Err(e) => console_log!(
            "[AUTO-CHASER] Failed for invoice {}: {}",
            invoice.invoice_number,
            e
        ),
    }
}
