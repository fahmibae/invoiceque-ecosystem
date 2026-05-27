//! Smart Payment Chaser — automated payment reminder sequences.

use crate::error::AppError;
use crate::middleware::Auth;
use crate::utils;
use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentChaser {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub invoice_id: String,
    #[serde(default)]
    pub invoice_number: String,
    #[serde(default)]
    pub client_name: String,
    #[serde(default)]
    pub client_email: String,
    #[serde(default)]
    pub amount_due: f64,
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub due_date: String,
    #[serde(default)]
    pub status: String, // active, paused, completed, cancelled
    #[serde(default)]
    pub total_reminders_sent: i32,
    #[serde(default)]
    pub last_reminder_at: String,
    #[serde(default)]
    pub next_reminder_at: String,
    #[serde(default)]
    pub schedule: String, // JSON array of day offsets like [-3, 0, 3, 7, 14]
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChaserLog {
    pub id: String,
    #[serde(default)]
    pub chaser_id: String,
    #[serde(default)]
    pub invoice_id: String,
    #[serde(default)]
    pub reminder_type: String, // before_due, on_due, overdue_3d, overdue_7d, overdue_14d
    #[serde(default)]
    pub day_offset: i32,
    #[serde(default)]
    pub channel: String, // email, whatsapp, telegram
    #[serde(default)]
    pub status: String,  // sent, failed, skipped
    #[serde(default)]
    pub message: String,
    pub sent_at: Option<String>,
}

const CHASER_COLS: &str = "id, user_id, invoice_id, invoice_number, client_name, client_email, amount_due, currency, due_date, status, total_reminders_sent, COALESCE(last_reminder_at::text,'') as last_reminder_at, COALESCE(next_reminder_at::text,'') as next_reminder_at, schedule, created_at::text, updated_at::text";
const LOG_COLS: &str = "id, chaser_id, invoice_id, reminder_type, day_offset, channel, status, message, sent_at::text";

fn db(http: &reqwest::Client) -> Result<crate::db::NeonClient, AppError> {
    utils::get_db("INVOICE_DB_URL", http)
}

async fn ensure_table(db: &crate::db::NeonClient) -> Result<(), AppError> {
    db.execute(
        "CREATE TABLE IF NOT EXISTS payment_chasers (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            invoice_id TEXT NOT NULL,
            invoice_number TEXT NOT NULL DEFAULT '',
            client_name TEXT NOT NULL DEFAULT '',
            client_email TEXT NOT NULL DEFAULT '',
            amount_due DOUBLE PRECISION NOT NULL DEFAULT 0,
            currency TEXT NOT NULL DEFAULT 'IDR',
            due_date TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'active',
            total_reminders_sent INTEGER NOT NULL DEFAULT 0,
            last_reminder_at TIMESTAMPTZ,
            next_reminder_at TIMESTAMPTZ,
            schedule TEXT NOT NULL DEFAULT '[-3,0,3,7,14]',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )",
        &[],
    )
    .await?;
    db.execute(
        "CREATE TABLE IF NOT EXISTS chaser_logs (
            id TEXT PRIMARY KEY,
            chaser_id TEXT NOT NULL,
            invoice_id TEXT NOT NULL,
            reminder_type TEXT NOT NULL DEFAULT '',
            day_offset INTEGER NOT NULL DEFAULT 0,
            channel TEXT NOT NULL DEFAULT 'email',
            status TEXT NOT NULL DEFAULT 'sent',
            message TEXT NOT NULL DEFAULT '',
            sent_at TIMESTAMPTZ DEFAULT NOW()
        )",
        &[],
    )
    .await?;
    Ok(())
}

/// List all chasers for user
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

    let (total, chasers): (i64, Vec<PaymentChaser>) = if status.is_empty() {
        let t: i64 = db.query_scalar("SELECT COUNT(*) FROM payment_chasers WHERE user_id=$1", &[serde_json::json!(auth.0.user_id)]).await?;
        let c: Vec<PaymentChaser> = db.query_typed(
            &format!("SELECT {} FROM payment_chasers WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", CHASER_COLS),
            &[serde_json::json!(auth.0.user_id), serde_json::json!(per_page), serde_json::json!(offset)],
        ).await?;
        (t, c)
    } else {
        let t: i64 = db.query_scalar("SELECT COUNT(*) FROM payment_chasers WHERE user_id=$1 AND status=$2", &[serde_json::json!(auth.0.user_id), serde_json::json!(status)]).await?;
        let c: Vec<PaymentChaser> = db.query_typed(
            &format!("SELECT {} FROM payment_chasers WHERE user_id=$1 AND status=$2 ORDER BY created_at DESC LIMIT $3 OFFSET $4", CHASER_COLS),
            &[serde_json::json!(auth.0.user_id), serde_json::json!(status), serde_json::json!(per_page), serde_json::json!(offset)],
        ).await?;
        (t, c)
    };

    let total_pages = ((total as i32) + per_page - 1) / per_page;
    utils::json_response(&serde_json::json!({"data": chasers, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}), 200)
}

/// Create a chaser for an invoice
pub async fn create(
    auth: Auth,
    body: web::Json<serde_json::Value>,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let db = db(&http)?;
    ensure_table(&db).await?;
    let invoice_id = body.get("invoice_id").and_then(|v| v.as_str()).unwrap_or("");
    if invoice_id.is_empty() {
        return utils::json_error("invoice_id is required", 400);
    }

    // Check if chaser already exists for this invoice
    let existing: Option<PaymentChaser> = db.query_one(
        &format!("SELECT {} FROM payment_chasers WHERE user_id=$1 AND invoice_id=$2 AND status IN ('active','paused')", CHASER_COLS),
        &[serde_json::json!(auth.0.user_id), serde_json::json!(invoice_id)],
    ).await?;
    if existing.is_some() {
        return utils::json_error("Chaser already exists for this invoice", 409);
    }

    // Get invoice details
    let inv: Option<serde_json::Value> = db.query_one(
        "SELECT invoice_number, client_name, client_email, amount_remaining, currency, due_date, status FROM invoices WHERE id=$1 AND user_id=$2",
        &[serde_json::json!(invoice_id), serde_json::json!(auth.0.user_id)],
    ).await?;
    let inv = match inv {
        Some(i) => i,
        None => return utils::json_error("Invoice not found", 404),
    };
    let inv_status = inv.get("status").and_then(|v| v.as_str()).unwrap_or("");
    if inv_status == "paid" || inv_status == "draft" {
        return utils::json_error("Cannot create chaser for paid or draft invoice", 400);
    }

    let schedule = body.get("schedule").and_then(|v| v.as_str()).unwrap_or("[-3,0,3,7,14]");
    let id = utils::generate_id();

    db.execute(
        &format!("INSERT INTO payment_chasers (id, user_id, invoice_id, invoice_number, client_name, client_email, amount_due, currency, due_date, schedule) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)"),
        &[
            serde_json::json!(id), serde_json::json!(auth.0.user_id), serde_json::json!(invoice_id),
            serde_json::json!(inv.get("invoice_number").and_then(|v| v.as_str()).unwrap_or("")),
            serde_json::json!(inv.get("client_name").and_then(|v| v.as_str()).unwrap_or("")),
            serde_json::json!(inv.get("client_email").and_then(|v| v.as_str()).unwrap_or("")),
            serde_json::json!(inv.get("amount_remaining").and_then(|v| v.as_f64()).unwrap_or(0.0)),
            serde_json::json!(inv.get("currency").and_then(|v| v.as_str()).unwrap_or("IDR")),
            serde_json::json!(inv.get("due_date").and_then(|v| v.as_str()).unwrap_or("")),
            serde_json::json!(schedule),
        ],
    ).await?;

    let chaser: Option<PaymentChaser> = db.query_one(&format!("SELECT {} FROM payment_chasers WHERE id=$1", CHASER_COLS), &[serde_json::json!(id)]).await?;
    match chaser {
        Some(c) => utils::json_response(&c, 201),
        None => utils::json_error("Failed to create chaser", 500),
    }
}

/// Pause/resume a chaser
pub async fn toggle_status(
    path: web::Path<String>,
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    let chaser: Option<PaymentChaser> = db.query_one(
        &format!("SELECT {} FROM payment_chasers WHERE id=$1 AND user_id=$2", CHASER_COLS),
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id)],
    ).await?;
    let c = match chaser {
        Some(c) => c,
        None => return utils::json_error("Chaser not found", 404),
    };
    let new_status = if c.status == "active" { "paused" } else if c.status == "paused" { "active" } else { return utils::json_error("Cannot toggle completed/cancelled chaser", 400); };
    db.execute("UPDATE payment_chasers SET status=$1, updated_at=NOW() WHERE id=$2", &[serde_json::json!(new_status), serde_json::json!(id)]).await?;
    let updated: Option<PaymentChaser> = db.query_one(&format!("SELECT {} FROM payment_chasers WHERE id=$1", CHASER_COLS), &[serde_json::json!(id)]).await?;
    match updated {
        Some(c) => utils::json_response(&c, 200),
        None => utils::json_error("Failed", 500),
    }
}

/// Delete a chaser
pub async fn delete(
    path: web::Path<String>,
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    db.execute("DELETE FROM chaser_logs WHERE chaser_id=$1", &[serde_json::json!(id)]).await?;
    db.execute("DELETE FROM payment_chasers WHERE id=$1 AND user_id=$2", &[serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    utils::json_response(&serde_json::json!({"message": "Chaser deleted"}), 200)
}

/// Get chaser logs for an invoice
pub async fn get_logs(
    path: web::Path<String>,
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let chaser_id = path.into_inner();
    let db = db(&http)?;
    ensure_table(&db).await?;
    // Verify ownership
    let chaser: Option<PaymentChaser> = db.query_one(
        &format!("SELECT {} FROM payment_chasers WHERE id=$1 AND user_id=$2", CHASER_COLS),
        &[serde_json::json!(chaser_id), serde_json::json!(auth.0.user_id)],
    ).await?;
    if chaser.is_none() {
        return utils::json_error("Chaser not found", 404);
    }
    let logs: Vec<ChaserLog> = db.query_typed(
        &format!("SELECT {} FROM chaser_logs WHERE chaser_id=$1 ORDER BY sent_at DESC", LOG_COLS),
        &[serde_json::json!(chaser_id)],
    ).await.unwrap_or_default();
    utils::json_response(&serde_json::json!({"data": logs}), 200)
}

/// Send a manual reminder right now
pub async fn send_reminder(
    path: web::Path<String>,
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let chaser_id = path.into_inner();
    let db = db(&http)?;
    ensure_table(&db).await?;
    let chaser: Option<PaymentChaser> = db.query_one(
        &format!("SELECT {} FROM payment_chasers WHERE id=$1 AND user_id=$2", CHASER_COLS),
        &[serde_json::json!(chaser_id), serde_json::json!(auth.0.user_id)],
    ).await?;
    let c = match chaser {
        Some(c) => c,
        None => return utils::json_error("Chaser not found", 404),
    };

    // Log the manual reminder
    let log_id = utils::generate_id();
    let message = format!(
        "Manual reminder sent for {} ({}) - Amount due: {} {}",
        c.invoice_number, c.client_name, c.currency, c.amount_due
    );
    db.execute(
        "INSERT INTO chaser_logs (id, chaser_id, invoice_id, reminder_type, day_offset, channel, status, message) VALUES ($1,$2,$3,'manual',0,'email','sent',$4)",
        &[serde_json::json!(log_id), serde_json::json!(chaser_id), serde_json::json!(c.invoice_id), serde_json::json!(message)],
    ).await?;
    db.execute(
        "UPDATE payment_chasers SET total_reminders_sent = total_reminders_sent + 1, last_reminder_at = NOW(), updated_at = NOW() WHERE id=$1",
        &[serde_json::json!(chaser_id)],
    ).await?;

    utils::json_response(&serde_json::json!({"message": "Reminder sent", "log_id": log_id}), 200)
}

/// Dashboard stats for chasers
pub async fn stats(
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let db = db(&http)?;
    ensure_table(&db).await?;
    let uid = serde_json::json!(auth.0.user_id);
    let active: i64 = db.query_scalar("SELECT COUNT(*) FROM payment_chasers WHERE user_id=$1 AND status='active'", &[uid.clone()]).await.unwrap_or(0);
    let paused: i64 = db.query_scalar("SELECT COUNT(*) FROM payment_chasers WHERE user_id=$1 AND status='paused'", &[uid.clone()]).await.unwrap_or(0);
    let completed: i64 = db.query_scalar("SELECT COUNT(*) FROM payment_chasers WHERE user_id=$1 AND status='completed'", &[uid.clone()]).await.unwrap_or(0);
    let total_reminders: i64 = db.query_scalar("SELECT COALESCE(SUM(total_reminders_sent),0) FROM payment_chasers WHERE user_id=$1", &[uid.clone()]).await.unwrap_or(0);
    let total_chasing: f64 = db.query_scalar("SELECT COALESCE(SUM(amount_due),0) FROM payment_chasers WHERE user_id=$1 AND status='active'", &[uid.clone()]).await.unwrap_or(0.0);

    utils::json_response(&serde_json::json!({
        "active": active, "paused": paused, "completed": completed,
        "total_reminders_sent": total_reminders, "total_amount_chasing": total_chasing
    }), 200)
}
