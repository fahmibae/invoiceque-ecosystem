//! Invoice service module — CRUD, dashboard, settings.
//! Mirrors: services/invoice-service (Go)

use serde::{Deserialize, Serialize};
use worker::*;
use crate::db::NeonClient;
use crate::middleware::JwtClaims;
use crate::utils;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    pub id: String,
    #[serde(default, rename = "number", alias = "invoice_number")] pub invoice_number: String,
    #[serde(default)] pub user_id: String,
    #[serde(default)] pub client_id: String,
    #[serde(default)] pub client_name: String,
    #[serde(default)] pub client_email: String,
    #[serde(default)] pub subtotal: f64,
    #[serde(default)] pub tax: f64,
    #[serde(default)] pub discount: f64,
    #[serde(default)] pub total: f64,
    #[serde(default)] pub status: String,
    #[serde(default)] pub payment_type: String,
    #[serde(default)] pub dp_percentage: i32,
    #[serde(default)] pub dp_amount: f64,
    #[serde(default)] pub amount_paid: f64,
    #[serde(default)] pub amount_remaining: f64,
    #[serde(default)] pub due_date: String,
    #[serde(default)] pub created_at: String,
    #[serde(default)] pub paid_at: String,
    #[serde(default)] pub notes: String,
    #[serde(default)] pub payment_link: String,
    #[serde(default)] pub remaining_payment_link: String,
    #[serde(default)] pub currency: String,
    #[serde(default)] pub exchange_rate_idr: f64,
    #[serde(default)] pub items: Vec<InvoiceItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceItem {
    pub id: String,
    #[serde(default)] pub invoice_id: String,
    #[serde(default)] pub description: String,
    #[serde(default)] pub quantity: i32,
    #[serde(default)] pub price: f64,
    #[serde(default)] pub total: f64,
}

#[derive(Debug, Deserialize)]
pub struct InvoiceRequest {
    pub client_id: String,
    pub client_name: String,
    #[serde(default)] pub client_email: String,
    pub items: Vec<ItemRequest>,
    pub tax: Option<f64>,
    pub discount: Option<f64>,
    #[serde(default)] pub due_date: String,
    #[serde(default)] pub notes: String,
    #[serde(default)] pub status: String,
    #[serde(default)] pub payment_type: String,
    pub dp_percentage: Option<i32>,
    #[serde(default)] pub currency: String,
}

#[derive(Debug, Deserialize)]
pub struct ItemRequest {
    pub description: String,
    pub quantity: i32,
    pub price: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoiceSettings {
    #[serde(default)] pub user_id: String,
    #[serde(default)] pub business_name: String,
    #[serde(default)] pub business_email: String,
    #[serde(default)] pub business_phone: String,
    #[serde(default)] pub business_website: String,
    #[serde(default)] pub business_address: String,
    #[serde(default)] pub logo_url: String,
    #[serde(default)] pub accent_color: String,
    #[serde(default)] pub footer_text: String,
    #[serde(default)] pub bank_name: String,
    #[serde(default)] pub bank_account_number: String,
    #[serde(default)] pub bank_account_name: String,
}

const INV_COLS: &str = "id, invoice_number, user_id, client_id, client_name, client_email, subtotal, tax, discount, total, status, payment_type, dp_percentage, dp_amount, amount_paid, amount_remaining, due_date, created_at::text, paid_at::text, notes, payment_link, remaining_payment_link, currency, exchange_rate_idr";

pub async fn list(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let url = req.url()?;
    let status = utils::query_param(&url, "status").unwrap_or_default();
    let page = utils::query_param(&url, "page").and_then(|v| v.parse::<i32>().ok()).unwrap_or(0);
    let size = utils::query_param(&url, "size").and_then(|v| v.parse::<i32>().ok()).unwrap_or(10);
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

    let total_pages = if size > 0 { ((total as i32) + size - 1) / size } else { 0 };

    utils::json_response(&serde_json::json!({
        "data": invoices, "total": total,
        "page": page, "per_page": size, "total_pages": total_pages,
    }), 200)
}

pub async fn get(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let mut inv: Option<Invoice> = db.query_one(
        &format!("SELECT {} FROM invoices WHERE id = $1 AND user_id = $2", INV_COLS),
        &[serde_json::json!(id), serde_json::json!(claims.user_id)],
    ).await?;

    if let Some(ref mut invoice) = inv {
        invoice.items = db.query_typed(
            "SELECT id, invoice_id, description, quantity, price, total FROM invoice_items WHERE invoice_id = $1",
            &[serde_json::json!(id)],
        ).await.unwrap_or_default();
    }

    match inv {
        Some(i) => utils::json_response(&i, 200),
        None => utils::json_error("Invoice not found", 404),
    }
}

pub async fn create(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: InvoiceRequest = req.json().await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let db = get_db(env)?;
    let id = utils::generate_id();

    // Calculate totals
    let subtotal: f64 = body.items.iter().map(|i| i.price * i.quantity as f64).sum();
    let tax = body.tax.unwrap_or(0.0);
    let discount = body.discount.unwrap_or(0.0);
    let total = subtotal + (subtotal * tax / 100.0) - discount;
    let status = if body.status.is_empty() { "draft" } else { &body.status };
    let payment_type = if body.payment_type.is_empty() { "full" } else { &body.payment_type };
    let dp_pct = body.dp_percentage.unwrap_or(0);
    let dp_amount = if payment_type == "dp" { total * dp_pct as f64 / 100.0 } else { 0.0 };
    let amount_remaining = if payment_type == "dp" { total - dp_amount } else { total };
    let currency = if body.currency.is_empty() { "IDR" } else { &body.currency };

    // Generate invoice number
    let count: i64 = db.query_scalar(
        "SELECT COUNT(*) FROM invoices WHERE user_id = $1",
        &[serde_json::json!(claims.user_id)],
    ).await.unwrap_or(0);
    let inv_number = format!("INV-{:04}", count + 1);

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

    self::get(env, claims, &id).await
}

pub async fn update(mut req: Request, env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let body: InvoiceRequest = req.json().await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let db = get_db(env)?;

    let subtotal: f64 = body.items.iter().map(|i| i.price * i.quantity as f64).sum();
    let tax = body.tax.unwrap_or(0.0);
    let discount = body.discount.unwrap_or(0.0);
    let total = subtotal + (subtotal * tax / 100.0) - discount;
    let status = if body.status.is_empty() { "draft" } else { &body.status };
    let payment_type = if body.payment_type.is_empty() { "full" } else { &body.payment_type };
    let dp_pct = body.dp_percentage.unwrap_or(0);
    let dp_amount = if payment_type == "dp" { total * dp_pct as f64 / 100.0 } else { 0.0 };
    let amount_remaining = if payment_type == "dp" { total - dp_amount } else { total };
    let currency = if body.currency.is_empty() { "IDR" } else { &body.currency };

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
    db.execute("DELETE FROM invoice_items WHERE invoice_id = $1", &[serde_json::json!(id)]).await?;
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
    db.execute("DELETE FROM invoices WHERE id=$1 AND user_id=$2",
        &[serde_json::json!(id), serde_json::json!(claims.user_id)]).await?;
    utils::json_response(&serde_json::json!({"message": "Invoice deleted successfully"}), 200)
}

pub async fn bulk_delete(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let ids: Vec<String> = body.get("ids").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
    if ids.is_empty() { return utils::json_error("ids is required", 400); }

    let db = get_db(env)?;
    let pg_arr = utils::to_pg_array(&ids);
    let deleted = db.execute("DELETE FROM invoices WHERE user_id=$1 AND id=ANY($2)",
        &[serde_json::json!(claims.user_id), serde_json::json!(pg_arr)]).await?;
    utils::json_response(&serde_json::json!({"message": "Invoices deleted", "deleted": deleted}), 200)
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
    db.execute("UPDATE invoices SET status='sent' WHERE id=$1 AND user_id=$2 AND status='draft'",
        &[serde_json::json!(id), serde_json::json!(claims.user_id)]).await?;
    self::get(env, claims, id).await
}

pub async fn get_dashboard_stats(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let uid = serde_json::json!(claims.user_id);

    let total_revenue: f64 = db.query_scalar("SELECT COALESCE(SUM(amount_paid),0) FROM invoices WHERE user_id=$1", &[uid.clone()]).await.unwrap_or(0.0);
    let total_invoices: i64 = db.query_scalar("SELECT COUNT(*) FROM invoices WHERE user_id=$1", &[uid.clone()]).await.unwrap_or(0);
    let paid_invoices: i64 = db.query_scalar("SELECT COUNT(*) FROM invoices WHERE user_id=$1 AND status='paid'", &[uid.clone()]).await.unwrap_or(0);
    let pending_amount: f64 = db.query_scalar("SELECT COALESCE(SUM(amount_remaining),0) FROM invoices WHERE user_id=$1 AND status IN ('sent','outstanding')", &[uid.clone()]).await.unwrap_or(0.0);
    let overdue_invoices: i64 = db.query_scalar("SELECT COUNT(*) FROM invoices WHERE user_id=$1 AND status='overdue'", &[uid.clone()]).await.unwrap_or(0);

    utils::json_response(&serde_json::json!({
        "totalRevenue": total_revenue, "totalInvoices": total_invoices,
        "paidInvoices": paid_invoices, "pendingAmount": pending_amount,
        "overdueInvoices": overdue_invoices, "activePaymentLinks": 0,
    }), 200)
}

pub async fn get_revenue_chart(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let rows: Vec<serde_json::Map<String, serde_json::Value>> = db.query_as_maps(
        "SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COALESCE(SUM(amount_paid),0) as revenue FROM invoices WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '12 months' GROUP BY month ORDER BY month",
        &[serde_json::json!(claims.user_id)],
    ).await?;

    let chart: Vec<serde_json::Value> = rows.into_iter().map(|m| serde_json::Value::Object(m)).collect();
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
        None => utils::json_response(&InvoiceSettings {
            user_id: claims.user_id.clone(), accent_color: "#DC2626".into(),
            footer_text: "Terima kasih atas kepercayaan Anda 🙏".into(),
            ..Default::default()
        }, 200),
    }
}

impl Default for InvoiceSettings {
    fn default() -> Self {
        Self {
            user_id: String::new(), business_name: String::new(), business_email: String::new(),
            business_phone: String::new(), business_website: String::new(), business_address: String::new(),
            logo_url: String::new(), accent_color: "#DC2626".into(),
            footer_text: "Terima kasih atas kepercayaan Anda 🙏".into(),
            bank_name: String::new(), bank_account_number: String::new(), bank_account_name: String::new(),
        }
    }
}

pub async fn update_settings(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: InvoiceSettings = req.json().await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let db = get_db(env)?;
    db.execute(
        "INSERT INTO invoice_settings (user_id, business_name, business_email, business_phone, business_website, business_address, logo_url, accent_color, footer_text, bank_name, bank_account_number, bank_account_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (user_id) DO UPDATE SET business_name=$2, business_email=$3, business_phone=$4, business_website=$5, business_address=$6, logo_url=$7, accent_color=$8, footer_text=$9, bank_name=$10, bank_account_number=$11, bank_account_name=$12",
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
    let invoice_id = body.get("invoice_id").and_then(|v| v.as_str()).unwrap_or("");
    let amount = body.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let status = body.get("status").and_then(|v| v.as_str()).unwrap_or("");

    if invoice_id.is_empty() {
        return utils::json_response(&serde_json::json!({"status": "ignored"}), 200);
    }

    let db = get_db(env)?;
    if status == "paid" || status == "COMPLETED" {
        db.execute(
            "UPDATE invoices SET amount_paid = amount_paid + $1, amount_remaining = GREATEST(amount_remaining - $1, 0), status = CASE WHEN amount_remaining - $1 <= 0 THEN 'paid' ELSE status END, paid_at = CASE WHEN amount_remaining - $1 <= 0 THEN NOW() ELSE paid_at END WHERE id = $2",
            &[serde_json::json!(amount), serde_json::json!(invoice_id)],
        ).await?;
    }

    utils::json_response(&serde_json::json!({"status": "processed"}), 200)
}

fn get_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "INVOICE_DB_URL");
    NeonClient::from_connection_string(&url)
}
