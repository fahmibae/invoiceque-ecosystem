//! Quotation service — CRUD, send, accept/reject, convert to invoice.

use crate::error::AppError;
use crate::middleware::Auth;
use crate::utils;
use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Quotation {
    pub id: String,
    #[serde(default)]
    pub quotation_number: String,
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
    pub status: String, // draft, sent, accepted, rejected, expired, converted
    #[serde(default)]
    pub valid_until: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub accept_token: String,
    #[serde(default)]
    pub converted_invoice_id: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub accepted_at: Option<String>,
    pub rejected_at: Option<String>,
    #[serde(default)]
    pub items: Vec<QuotationItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotationItem {
    pub id: String,
    #[serde(default)]
    pub quotation_id: String,
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
pub struct QuotationRequest {
    pub client_id: String,
    pub client_name: String,
    #[serde(default)]
    pub client_email: String,
    pub items: Vec<ItemReq>,
    pub tax: Option<f64>,
    pub discount: Option<f64>,
    #[serde(default)]
    pub valid_until: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub currency: String,
}

#[derive(Debug, Deserialize)]
pub struct ItemReq {
    pub description: String,
    pub quantity: i32,
    pub price: f64,
}

const QT_COLS: &str = "id, quotation_number, user_id, client_id, client_name, client_email, subtotal, tax, discount, total, status, valid_until, notes, currency, accept_token, COALESCE(converted_invoice_id,'') as converted_invoice_id, created_at::text, updated_at::text, accepted_at::text, rejected_at::text";

fn db(http: &reqwest::Client) -> Result<crate::db::NeonClient, AppError> {
    utils::get_db("INVOICE_DB_URL", http)
}

async fn ensure_table(db: &crate::db::NeonClient) -> Result<(), AppError> {
    db.execute(
        "CREATE TABLE IF NOT EXISTS quotations (
            id TEXT PRIMARY KEY,
            quotation_number TEXT NOT NULL DEFAULT '',
            user_id TEXT NOT NULL,
            client_id TEXT NOT NULL DEFAULT '',
            client_name TEXT NOT NULL DEFAULT '',
            client_email TEXT NOT NULL DEFAULT '',
            subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
            tax DOUBLE PRECISION NOT NULL DEFAULT 0,
            discount DOUBLE PRECISION NOT NULL DEFAULT 0,
            total DOUBLE PRECISION NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'draft',
            valid_until TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            currency TEXT NOT NULL DEFAULT 'IDR',
            accept_token TEXT NOT NULL DEFAULT '',
            converted_invoice_id TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            accepted_at TIMESTAMPTZ,
            rejected_at TIMESTAMPTZ
        )",
        &[],
    )
    .await?;
    db.execute(
        "CREATE TABLE IF NOT EXISTS quotation_items (
            id TEXT PRIMARY KEY,
            quotation_id TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            quantity INTEGER NOT NULL DEFAULT 0,
            price DOUBLE PRECISION NOT NULL DEFAULT 0,
            total DOUBLE PRECISION NOT NULL DEFAULT 0
        )",
        &[],
    )
    .await?;
    Ok(())
}

pub async fn list(
    req: HttpRequest,
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let db = db(&http)?;
    ensure_table(&db).await?;
    let qs = req.query_string();
    let status = utils::query_param(qs, "status").unwrap_or_default();
    let (page, per_page) = utils::parse_pagination(qs);
    let offset = (page - 1) * per_page;

    let (total, quotations): (i64, Vec<Quotation>) = if status.is_empty() {
        let t: i64 = db
            .query_scalar(
                "SELECT COUNT(*) FROM quotations WHERE user_id = $1",
                &[serde_json::json!(auth.0.user_id)],
            )
            .await?;
        let q: Vec<Quotation> = db
            .query_typed(
                &format!(
                    "SELECT {} FROM quotations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
                    QT_COLS
                ),
                &[
                    serde_json::json!(auth.0.user_id),
                    serde_json::json!(per_page),
                    serde_json::json!(offset),
                ],
            )
            .await?;
        (t, q)
    } else {
        let t: i64 = db
            .query_scalar(
                "SELECT COUNT(*) FROM quotations WHERE user_id = $1 AND status = $2",
                &[
                    serde_json::json!(auth.0.user_id),
                    serde_json::json!(status),
                ],
            )
            .await?;
        let q: Vec<Quotation> = db
            .query_typed(
                &format!(
                    "SELECT {} FROM quotations WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
                    QT_COLS
                ),
                &[
                    serde_json::json!(auth.0.user_id),
                    serde_json::json!(status),
                    serde_json::json!(per_page),
                    serde_json::json!(offset),
                ],
            )
            .await?;
        (t, q)
    };

    let mut result = quotations;
    for q in &mut result {
        q.items = db
            .query_typed(
                "SELECT id, quotation_id, description, quantity, price, total FROM quotation_items WHERE quotation_id = $1",
                &[serde_json::json!(q.id)],
            )
            .await
            .unwrap_or_default();
    }

    let total_pages = ((total as i32) + per_page - 1) / per_page;
    utils::json_response(
        &serde_json::json!({"data": result, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}),
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
    ensure_table(&db).await?;
    let mut q: Option<Quotation> = db
        .query_one(
            &format!(
                "SELECT {} FROM quotations WHERE id = $1 AND user_id = $2",
                QT_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(auth.0.user_id)],
        )
        .await?;
    if let Some(ref mut qt) = q {
        qt.items = db
            .query_typed(
                "SELECT id, quotation_id, description, quantity, price, total FROM quotation_items WHERE quotation_id = $1",
                &[serde_json::json!(id)],
            )
            .await
            .unwrap_or_default();
    }
    match q {
        Some(qt) => utils::json_response(&qt, 200),
        None => utils::json_error("Quotation not found", 404),
    }
}

pub async fn create(
    auth: Auth,
    body: web::Json<QuotationRequest>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let db = db(&http)?;
    ensure_table(&db).await?;
    let id = utils::generate_id();
    let subtotal: f64 = body.items.iter().map(|i| i.price * i.quantity as f64).sum();
    let tax = body.tax.unwrap_or(0.0);
    let discount = body.discount.unwrap_or(0.0);
    let total = subtotal + (subtotal * tax / 100.0) - discount;
    let currency = if body.currency.is_empty() { "IDR" } else { &body.currency };
    let accept_token = utils::generate_id();
    let qt_number = generate_quotation_number(&db, &id).await?;

    db.execute(
        "INSERT INTO quotations (id, quotation_number, user_id, client_id, client_name, client_email, subtotal, tax, discount, total, status, valid_until, notes, currency, accept_token) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11,$12,$13,$14)",
        &[
            serde_json::json!(id), serde_json::json!(qt_number), serde_json::json!(auth.0.user_id),
            serde_json::json!(body.client_id), serde_json::json!(body.client_name), serde_json::json!(body.client_email),
            serde_json::json!(subtotal), serde_json::json!(tax), serde_json::json!(discount), serde_json::json!(total),
            serde_json::json!(body.valid_until), serde_json::json!(body.notes), serde_json::json!(currency),
            serde_json::json!(accept_token),
        ],
    )
    .await?;

    for item in &body.items {
        let item_id = utils::generate_id();
        let item_total = item.price * item.quantity as f64;
        db.execute(
            "INSERT INTO quotation_items (id, quotation_id, description, quantity, price, total) VALUES ($1,$2,$3,$4,$5,$6)",
            &[
                serde_json::json!(item_id), serde_json::json!(id), serde_json::json!(item.description),
                serde_json::json!(item.quantity), serde_json::json!(item.price), serde_json::json!(item_total),
            ],
        )
        .await?;
    }

    let mut q: Option<Quotation> = db
        .query_one(
            &format!("SELECT {} FROM quotations WHERE id = $1", QT_COLS),
            &[serde_json::json!(id)],
        )
        .await?;
    if let Some(ref mut qt) = q {
        qt.items = db
            .query_typed(
                "SELECT id, quotation_id, description, quantity, price, total FROM quotation_items WHERE quotation_id = $1",
                &[serde_json::json!(id)],
            )
            .await
            .unwrap_or_default();
    }
    match q {
        Some(qt) => utils::json_response(&qt, 201),
        None => utils::json_error("Failed to create quotation", 500),
    }
}

pub async fn update(
    path: web::Path<String>,
    auth: Auth,
    body: web::Json<QuotationRequest>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    ensure_table(&db).await?;
    let subtotal: f64 = body.items.iter().map(|i| i.price * i.quantity as f64).sum();
    let tax = body.tax.unwrap_or(0.0);
    let discount = body.discount.unwrap_or(0.0);
    let total = subtotal + (subtotal * tax / 100.0) - discount;
    let currency = if body.currency.is_empty() { "IDR" } else { &body.currency };

    db.execute(
        "UPDATE quotations SET client_id=$1, client_name=$2, client_email=$3, subtotal=$4, tax=$5, discount=$6, total=$7, valid_until=$8, notes=$9, currency=$10, updated_at=NOW() WHERE id=$11 AND user_id=$12 AND status IN ('draft','sent')",
        &[
            serde_json::json!(body.client_id), serde_json::json!(body.client_name), serde_json::json!(body.client_email),
            serde_json::json!(subtotal), serde_json::json!(tax), serde_json::json!(discount), serde_json::json!(total),
            serde_json::json!(body.valid_until), serde_json::json!(body.notes), serde_json::json!(currency),
            serde_json::json!(id), serde_json::json!(auth.0.user_id),
        ],
    )
    .await?;

    db.execute("DELETE FROM quotation_items WHERE quotation_id = $1", &[serde_json::json!(id)]).await?;
    for item in &body.items {
        let item_id = utils::generate_id();
        let item_total = item.price * item.quantity as f64;
        db.execute(
            "INSERT INTO quotation_items (id, quotation_id, description, quantity, price, total) VALUES ($1,$2,$3,$4,$5,$6)",
            &[
                serde_json::json!(item_id), serde_json::json!(id), serde_json::json!(item.description),
                serde_json::json!(item.quantity), serde_json::json!(item.price), serde_json::json!(item_total),
            ],
        )
        .await?;
    }

    let mut q: Option<Quotation> = db
        .query_one(
            &format!("SELECT {} FROM quotations WHERE id = $1 AND user_id = $2", QT_COLS),
            &[serde_json::json!(id), serde_json::json!(auth.0.user_id)],
        )
        .await?;
    if let Some(ref mut qt) = q {
        qt.items = db.query_typed("SELECT id, quotation_id, description, quantity, price, total FROM quotation_items WHERE quotation_id = $1", &[serde_json::json!(id)]).await.unwrap_or_default();
    }
    match q {
        Some(qt) => utils::json_response(&qt, 200),
        None => utils::json_error("Quotation not found", 404),
    }
}

pub async fn delete(
    path: web::Path<String>,
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    db.execute("DELETE FROM quotation_items WHERE quotation_id = $1", &[serde_json::json!(id)]).await?;
    db.execute("DELETE FROM quotations WHERE id=$1 AND user_id=$2", &[serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    utils::json_response(&serde_json::json!({"message": "Quotation deleted"}), 200)
}

pub async fn send_quotation(
    path: web::Path<String>,
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    db.execute(
        "UPDATE quotations SET status='sent', updated_at=NOW() WHERE id=$1 AND user_id=$2 AND status='draft'",
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id)],
    ).await?;
    let q: Option<Quotation> = db.query_one(&format!("SELECT {} FROM quotations WHERE id = $1 AND user_id = $2", QT_COLS), &[serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    match q {
        Some(qt) => utils::json_response(&qt, 200),
        None => utils::json_error("Quotation not found", 404),
    }
}

/// Public endpoint — client accepts quotation via token
pub async fn accept_quotation(
    path: web::Path<String>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let token = path.into_inner();
    let db = db(&http)?;
    ensure_table(&db).await?;
    let q: Option<Quotation> = db.query_one(&format!("SELECT {} FROM quotations WHERE accept_token = $1", QT_COLS), &[serde_json::json!(token)]).await?;
    let qt = match q {
        Some(qt) => qt,
        None => return utils::json_error("Quotation not found", 404),
    };
    if qt.status != "sent" {
        return utils::json_error(&format!("Cannot accept quotation with status '{}'", qt.status), 400);
    }
    db.execute("UPDATE quotations SET status='accepted', accepted_at=NOW(), updated_at=NOW() WHERE accept_token=$1", &[serde_json::json!(token)]).await?;
    let updated: Option<Quotation> = db.query_one(&format!("SELECT {} FROM quotations WHERE accept_token = $1", QT_COLS), &[serde_json::json!(token)]).await?;
    match updated {
        Some(qt) => utils::json_response(&qt, 200),
        None => utils::json_error("Failed", 500),
    }
}

/// Public endpoint — client rejects quotation via token
pub async fn reject_quotation(
    path: web::Path<String>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let token = path.into_inner();
    let db = db(&http)?;
    ensure_table(&db).await?;
    db.execute("UPDATE quotations SET status='rejected', rejected_at=NOW(), updated_at=NOW() WHERE accept_token=$1 AND status='sent'", &[serde_json::json!(token)]).await?;
    let updated: Option<Quotation> = db.query_one(&format!("SELECT {} FROM quotations WHERE accept_token = $1", QT_COLS), &[serde_json::json!(token)]).await?;
    match updated {
        Some(qt) => utils::json_response(&qt, 200),
        None => utils::json_error("Quotation not found", 404),
    }
}

/// Public endpoint — view quotation by token
pub async fn get_public(
    path: web::Path<String>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let token = path.into_inner();
    let db = db(&http)?;
    ensure_table(&db).await?;
    let mut q: Option<Quotation> = db.query_one(&format!("SELECT {} FROM quotations WHERE accept_token = $1", QT_COLS), &[serde_json::json!(token)]).await?;
    if let Some(ref mut qt) = q {
        qt.items = db.query_typed("SELECT id, quotation_id, description, quantity, price, total FROM quotation_items WHERE quotation_id = $1", &[serde_json::json!(qt.id)]).await.unwrap_or_default();
    }
    match q {
        Some(qt) => utils::json_response(&qt, 200),
        None => utils::json_error("Quotation not found", 404),
    }
}

/// Convert accepted quotation to invoice
pub async fn convert_to_invoice(
    path: web::Path<String>,
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    ensure_table(&db).await?;
    let mut q: Option<Quotation> = db.query_one(&format!("SELECT {} FROM quotations WHERE id = $1 AND user_id = $2", QT_COLS), &[serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    let qt = match q {
        Some(ref qt) if qt.status == "accepted" => qt.clone(),
        Some(_) => return utils::json_error("Only accepted quotations can be converted", 400),
        None => return utils::json_error("Quotation not found", 404),
    };

    // Load quotation items
    let items: Vec<QuotationItem> = db.query_typed("SELECT id, quotation_id, description, quantity, price, total FROM quotation_items WHERE quotation_id = $1", &[serde_json::json!(id)]).await.unwrap_or_default();

    // Create invoice from quotation
    let inv_id = utils::generate_id();
    let date_code: String = db.query_scalar("SELECT TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD')", &[]).await?;
    let unique_code = inv_id.chars().take(6).collect::<String>().to_uppercase();
    let inv_number = format!("INV-{}-{}", date_code, unique_code);

    db.execute(
        "INSERT INTO invoices (id, invoice_number, user_id, client_id, client_name, client_email, subtotal, tax, discount, total, status, payment_type, dp_percentage, dp_amount, amount_paid, amount_remaining, due_date, notes, currency) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','full',0,0,0,$10,'',$11,$12)",
        &[
            serde_json::json!(inv_id), serde_json::json!(inv_number), serde_json::json!(auth.0.user_id),
            serde_json::json!(qt.client_id), serde_json::json!(qt.client_name), serde_json::json!(qt.client_email),
            serde_json::json!(qt.subtotal), serde_json::json!(qt.tax), serde_json::json!(qt.discount), serde_json::json!(qt.total),
            serde_json::json!(qt.notes), serde_json::json!(qt.currency),
        ],
    ).await?;

    for item in &items {
        let item_id = utils::generate_id();
        db.execute(
            "INSERT INTO invoice_items (id, invoice_id, description, quantity, price, total) VALUES ($1,$2,$3,$4,$5,$6)",
            &[serde_json::json!(item_id), serde_json::json!(inv_id), serde_json::json!(item.description), serde_json::json!(item.quantity), serde_json::json!(item.price), serde_json::json!(item.total)],
        ).await?;
    }

    // Mark quotation as converted
    db.execute("UPDATE quotations SET status='converted', converted_invoice_id=$1, updated_at=NOW() WHERE id=$2", &[serde_json::json!(inv_id), serde_json::json!(id)]).await?;

    utils::json_response(&serde_json::json!({"message": "Quotation converted to invoice", "invoice_id": inv_id, "invoice_number": inv_number}), 200)
}

/// Dashboard stats for quotations
pub async fn stats(
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let db = db(&http)?;
    ensure_table(&db).await?;
    let uid = serde_json::json!(auth.0.user_id);
    let total: i64 = db.query_scalar("SELECT COUNT(*) FROM quotations WHERE user_id=$1", &[uid.clone()]).await.unwrap_or(0);
    let draft: i64 = db.query_scalar("SELECT COUNT(*) FROM quotations WHERE user_id=$1 AND status='draft'", &[uid.clone()]).await.unwrap_or(0);
    let sent: i64 = db.query_scalar("SELECT COUNT(*) FROM quotations WHERE user_id=$1 AND status='sent'", &[uid.clone()]).await.unwrap_or(0);
    let accepted: i64 = db.query_scalar("SELECT COUNT(*) FROM quotations WHERE user_id=$1 AND status='accepted'", &[uid.clone()]).await.unwrap_or(0);
    let rejected: i64 = db.query_scalar("SELECT COUNT(*) FROM quotations WHERE user_id=$1 AND status='rejected'", &[uid.clone()]).await.unwrap_or(0);
    let converted: i64 = db.query_scalar("SELECT COUNT(*) FROM quotations WHERE user_id=$1 AND status='converted'", &[uid.clone()]).await.unwrap_or(0);
    let total_value: f64 = db.query_scalar("SELECT COALESCE(SUM(total),0) FROM quotations WHERE user_id=$1", &[uid.clone()]).await.unwrap_or(0.0);
    let conversion_rate = if sent + accepted + rejected + converted > 0 {
        ((accepted + converted) as f64 / (sent + accepted + rejected + converted) as f64) * 100.0
    } else {
        0.0
    };

    utils::json_response(&serde_json::json!({
        "total": total, "draft": draft, "sent": sent, "accepted": accepted,
        "rejected": rejected, "converted": converted, "total_value": total_value,
        "conversion_rate": (conversion_rate * 100.0).round() / 100.0
    }), 200)
}

async fn generate_quotation_number(db: &crate::db::NeonClient, qt_id: &str) -> Result<String, AppError> {
    let date_code: String = db.query_scalar("SELECT TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD')", &[]).await?;
    let unique_code = qt_id.chars().take(6).collect::<String>().to_uppercase();
    Ok(format!("QT-{}-{}", date_code, unique_code))
}
