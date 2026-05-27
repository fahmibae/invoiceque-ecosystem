//! Smart Payment Chaser — automated payment reminder tracking.

use crate::db::NeonClient;
use crate::middleware::JwtClaims;
use crate::services::notification;
use crate::utils;
use serde::{Deserialize, Serialize};
use worker::*;

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
    pub status: String,
    #[serde(default)]
    pub total_reminders_sent: i32,
    #[serde(default)]
    pub last_reminder_at: String,
    #[serde(default)]
    pub next_reminder_at: String,
    #[serde(default)]
    pub schedule: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChaserLog {
    pub id: String,
    #[serde(default)]
    pub chaser_id: String,
    #[serde(default)]
    pub invoice_id: String,
    #[serde(default)]
    pub reminder_type: String,
    #[serde(default)]
    pub day_offset: i32,
    #[serde(default)]
    pub channel: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub message: String,
    #[serde(default)]
    pub sent_at: String,
}

const CH_COLS: &str = "id, user_id, invoice_id, invoice_number, client_name, client_email, amount_due, currency, due_date, status, total_reminders_sent, COALESCE(last_reminder_at::text,'') as last_reminder_at, COALESCE(next_reminder_at::text,'') as next_reminder_at, schedule, created_at::text, updated_at::text";
const LOG_COLS: &str =
    "id, chaser_id, invoice_id, reminder_type, day_offset, channel, status, message, sent_at::text";

fn get_db(env: &Env) -> Result<NeonClient> {
    NeonClient::from_connection_string(&utils::get_secret(env, "INVOICE_DB_URL"))
}

async fn ensure_tables(db: &NeonClient) -> Result<()> {
    db.execute("CREATE TABLE IF NOT EXISTS payment_chasers (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, invoice_id TEXT NOT NULL, invoice_number TEXT NOT NULL DEFAULT '', client_name TEXT NOT NULL DEFAULT '', client_email TEXT NOT NULL DEFAULT '', amount_due DOUBLE PRECISION NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'IDR', due_date TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active', total_reminders_sent INTEGER NOT NULL DEFAULT 0, last_reminder_at TIMESTAMPTZ, next_reminder_at TIMESTAMPTZ, schedule TEXT NOT NULL DEFAULT '[-3,0,3,7,14]', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())", &[]).await?;
    db.execute("CREATE TABLE IF NOT EXISTS chaser_logs (id TEXT PRIMARY KEY, chaser_id TEXT NOT NULL, invoice_id TEXT NOT NULL, reminder_type TEXT NOT NULL DEFAULT '', day_offset INTEGER NOT NULL DEFAULT 0, channel TEXT NOT NULL DEFAULT 'email', status TEXT NOT NULL DEFAULT 'sent', message TEXT NOT NULL DEFAULT '', sent_at TIMESTAMPTZ DEFAULT NOW())", &[]).await?;
    Ok(())
}

pub async fn list(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    ensure_tables(&db).await?;
    let url = req.url()?;
    let status = utils::query_param(&url, "status").unwrap_or_default();
    let (page, per_page) = utils::parse_pagination(&url);
    let offset = (page - 1) * per_page;
    let uid = serde_json::json!(claims.user_id);

    let (total, chasers): (i64, Vec<PaymentChaser>) = if status.is_empty() {
        let t: i64 = db
            .query_scalar(
                "SELECT COUNT(*) FROM payment_chasers WHERE user_id=$1",
                &[uid.clone()],
            )
            .await?;
        let c: Vec<PaymentChaser> = db.query_typed(&format!("SELECT {} FROM payment_chasers WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", CH_COLS), &[uid, serde_json::json!(per_page), serde_json::json!(offset)]).await?;
        (t, c)
    } else {
        let t: i64 = db
            .query_scalar(
                "SELECT COUNT(*) FROM payment_chasers WHERE user_id=$1 AND status=$2",
                &[uid.clone(), serde_json::json!(status)],
            )
            .await?;
        let c: Vec<PaymentChaser> = db.query_typed(&format!("SELECT {} FROM payment_chasers WHERE user_id=$1 AND status=$2 ORDER BY created_at DESC LIMIT $3 OFFSET $4", CH_COLS), &[uid, serde_json::json!(status), serde_json::json!(per_page), serde_json::json!(offset)]).await?;
        (t, c)
    };
    let total_pages = ((total as i32) + per_page - 1) / per_page;
    utils::json_response(
        &serde_json::json!({"data": chasers, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}),
        200,
    )
}

pub async fn create(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid body".into()))?;
    let db = get_db(env)?;
    ensure_tables(&db).await?;
    let invoice_id = body
        .get("invoice_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if invoice_id.is_empty() {
        return utils::json_error("invoice_id is required", 400);
    }

    let existing: Option<PaymentChaser> = db.query_one(&format!("SELECT {} FROM payment_chasers WHERE user_id=$1 AND invoice_id=$2 AND status IN ('active','paused')", CH_COLS), &[serde_json::json!(claims.user_id), serde_json::json!(invoice_id)]).await?;
    if existing.is_some() {
        return utils::json_error("Chaser already exists for this invoice", 409);
    }

    let inv: Option<serde_json::Value> = db.query_one("SELECT invoice_number, client_name, client_email, amount_remaining, currency, due_date, status FROM invoices WHERE id=$1 AND user_id=$2", &[serde_json::json!(invoice_id), serde_json::json!(claims.user_id)]).await?;
    let inv = match inv {
        Some(i) => i,
        None => return utils::json_error("Invoice not found", 404),
    };
    let inv_status = inv.get("status").and_then(|v| v.as_str()).unwrap_or("");
    if inv_status == "paid" || inv_status == "draft" {
        return utils::json_error("Cannot create chaser for paid or draft invoice", 400);
    }

    let inv_number = inv
        .get("invoice_number")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let client_name_val = inv
        .get("client_name")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let schedule = body
        .get("schedule")
        .and_then(|v| v.as_str())
        .unwrap_or("[-3,0,3,7,14]");
    let id = utils::generate_id();
    db.execute("INSERT INTO payment_chasers (id,user_id,invoice_id,invoice_number,client_name,client_email,amount_due,currency,due_date,schedule) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        &[serde_json::json!(id), serde_json::json!(claims.user_id), serde_json::json!(invoice_id),
          serde_json::json!(inv_number),
          serde_json::json!(client_name_val),
          serde_json::json!(inv.get("client_email").and_then(|v| v.as_str()).unwrap_or("")),
          serde_json::json!(inv.get("amount_remaining").and_then(|v| v.as_f64()).unwrap_or(0.0)),
          serde_json::json!(inv.get("currency").and_then(|v| v.as_str()).unwrap_or("IDR")),
          serde_json::json!(inv.get("due_date").and_then(|v| v.as_str()).unwrap_or("")),
          serde_json::json!(schedule)]).await?;

    // Notification: chaser created
    notification::queue_notification(
        env,
        &claims.user_id,
        "chaser_created",
        "Payment Chaser Aktif",
        &format!(
            "Chaser untuk invoice {} ({}) berhasil diaktifkan",
            inv_number, client_name_val
        ),
        client_name_val,
        &format!("Chaser {} aktif", inv_number),
        "sent",
    );

    let chaser: Option<PaymentChaser> = db
        .query_one(
            &format!("SELECT {} FROM payment_chasers WHERE id=$1", CH_COLS),
            &[serde_json::json!(id)],
        )
        .await?;
    match chaser {
        Some(c) => utils::json_response(&c, 201),
        None => utils::json_error("Failed", 500),
    }
}

pub async fn toggle_status(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let c: Option<PaymentChaser> = db
        .query_one(
            &format!(
                "SELECT {} FROM payment_chasers WHERE id=$1 AND user_id=$2",
                CH_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(claims.user_id)],
        )
        .await?;
    let c = match c {
        Some(c) => c,
        None => return utils::json_error("Not found", 404),
    };
    let new_status = if c.status == "active" {
        "paused"
    } else if c.status == "paused" {
        "active"
    } else {
        return utils::json_error("Cannot toggle", 400);
    };
    db.execute(
        "UPDATE payment_chasers SET status=$1, updated_at=NOW() WHERE id=$2",
        &[serde_json::json!(new_status), serde_json::json!(id)],
    )
    .await?;
    let updated: Option<PaymentChaser> = db
        .query_one(
            &format!("SELECT {} FROM payment_chasers WHERE id=$1", CH_COLS),
            &[serde_json::json!(id)],
        )
        .await?;
    match updated {
        Some(c) => utils::json_response(&c, 200),
        None => utils::json_error("Failed", 500),
    }
}

pub async fn delete(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    db.execute(
        "DELETE FROM chaser_logs WHERE chaser_id=$1",
        &[serde_json::json!(id)],
    )
    .await?;
    db.execute(
        "DELETE FROM payment_chasers WHERE id=$1 AND user_id=$2",
        &[serde_json::json!(id), serde_json::json!(claims.user_id)],
    )
    .await?;
    utils::json_response(&serde_json::json!({"message": "Chaser deleted"}), 200)
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
    db.execute(
        "DELETE FROM chaser_logs WHERE chaser_id=ANY($1)",
        &[serde_json::json!(pg_arr)],
    )
    .await?;
    let deleted = db
        .execute(
            "DELETE FROM payment_chasers WHERE user_id=$1 AND id=ANY($2)",
            &[serde_json::json!(claims.user_id), serde_json::json!(pg_arr)],
        )
        .await?;
    utils::json_response(
        &serde_json::json!({"message": "Chasers deleted", "deleted": deleted}),
        200,
    )
}

pub async fn get_logs(env: &Env, claims: &JwtClaims, chaser_id: &str) -> Result<Response> {
    let db = get_db(env)?;
    ensure_tables(&db).await?;
    let c: Option<PaymentChaser> = db
        .query_one(
            &format!(
                "SELECT {} FROM payment_chasers WHERE id=$1 AND user_id=$2",
                CH_COLS
            ),
            &[
                serde_json::json!(chaser_id),
                serde_json::json!(claims.user_id),
            ],
        )
        .await?;
    if c.is_none() {
        return utils::json_error("Not found", 404);
    }
    let logs: Vec<ChaserLog> = db
        .query_typed(
            &format!(
                "SELECT {} FROM chaser_logs WHERE chaser_id=$1 ORDER BY sent_at DESC",
                LOG_COLS
            ),
            &[serde_json::json!(chaser_id)],
        )
        .await
        .unwrap_or_default();
    utils::json_response(&serde_json::json!({"data": logs}), 200)
}

pub async fn send_reminder(env: &Env, claims: &JwtClaims, chaser_id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let c: Option<PaymentChaser> = db
        .query_one(
            &format!(
                "SELECT {} FROM payment_chasers WHERE id=$1 AND user_id=$2",
                CH_COLS
            ),
            &[
                serde_json::json!(chaser_id),
                serde_json::json!(claims.user_id),
            ],
        )
        .await?;
    let c = match c {
        Some(c) => c,
        None => return utils::json_error("Not found", 404),
    };

    if c.client_email.is_empty() {
        return utils::json_error("Client email is empty, cannot send reminder", 400);
    }

    // Fetch full invoice data
    let inv: Option<serde_json::Value> = db.query_one(
        "SELECT invoice_number, client_name, client_email, subtotal, tax, discount, total, amount_paid, amount_remaining, status, payment_type, dp_percentage, dp_amount, due_date, notes, currency, COALESCE(payment_link,'') as payment_link, COALESCE(remaining_payment_link,'') as remaining_payment_link FROM invoices WHERE id=$1",
        &[serde_json::json!(c.invoice_id)]
    ).await?;
    let inv = match inv {
        Some(i) => i,
        None => return utils::json_error("Invoice not found", 500),
    };

    // Fetch invoice items
    #[derive(serde::Deserialize)]
    struct Item {
        description: String,
        quantity: f64,
        price: f64,
        total: f64,
    }
    let items: Vec<Item> = db
        .query_typed(
            "SELECT description, quantity, price, total FROM invoice_items WHERE invoice_id=$1",
            &[serde_json::json!(c.invoice_id)],
        )
        .await
        .unwrap_or_default();

    let currency = inv
        .get("currency")
        .and_then(|v| v.as_str())
        .unwrap_or("IDR");
    let subtotal = inv.get("subtotal").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let tax = inv.get("tax").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let discount = inv.get("discount").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let total = inv
        .get("total")
        .and_then(|v| v.as_f64())
        .unwrap_or(c.amount_due);
    let amount_remaining = inv
        .get("amount_remaining")
        .and_then(|v| v.as_f64())
        .unwrap_or(c.amount_due);
    let payment_type = inv
        .get("payment_type")
        .and_then(|v| v.as_str())
        .unwrap_or("full");
    let dp_pct = inv
        .get("dp_percentage")
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as i32;
    let dp_amount = inv.get("dp_amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let due_date = inv.get("due_date").and_then(|v| v.as_str()).unwrap_or("");
    let notes = inv.get("notes").and_then(|v| v.as_str()).unwrap_or("");
    let inv_status = inv.get("status").and_then(|v| v.as_str()).unwrap_or("");

    // Resolve payment link
    let payment_link = {
        let pl = inv
            .get("payment_link")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let rpl = inv
            .get("remaining_payment_link")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if inv_status == "partially_paid" && !rpl.is_empty() {
            rpl
        } else {
            pl
        }
    };

    // Build item rows
    let items_html = if items.is_empty() {
        String::new()
    } else {
        let mut rows = String::new();
        for item in &items {
            rows.push_str(&format!(
                "<tr>
                    <td style=\"padding:10px 12px;border-bottom:1px solid #E5E7EB;\">{}</td>
                    <td style=\"padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:center;\">{}</td>
                    <td style=\"padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:right;\">{}</td>
                    <td style=\"padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:right;font-weight:600;\">{}</td>
                </tr>",
                escape_html(&item.description), item.quantity, format_money(item.price, currency), format_money(item.total, currency)
            ));
        }
        format!(
            "<table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin:18px 0;font-size:14px;\">
                <thead><tr style=\"background:#F3F4F6;color:#374151;\">
                    <th style=\"padding:10px 12px;text-align:left;\">Description</th>
                    <th style=\"padding:10px 12px;text-align:center;\">Qty</th>
                    <th style=\"padding:10px 12px;text-align:right;\">Price</th>
                    <th style=\"padding:10px 12px;text-align:right;\">Total</th>
                </tr></thead>
                <tbody>{}</tbody>
            </table>", rows)
    };

    // DP summary
    let payment_summary = if payment_type == "dp" {
        format!(
            "<div style=\"border:1px solid #FCA5A5;background:#FEF2F2;border-radius:12px;padding:16px;margin:18px 0 0;\">
                <p style=\"margin:0 0 8px;font-size:13px;font-weight:700;color:#991B1B;letter-spacing:.4px;text-transform:uppercase;\">Down Payment Plan</p>
                <table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"font-size:14px;\">
                    <tr><td style=\"padding:6px 0;color:#7F1D1D;\">First payment / DP ({}%)</td><td style=\"padding:6px 0;text-align:right;font-weight:800;color:#7F1D1D;\">{}</td></tr>
                    <tr><td style=\"padding:6px 0;color:#7F1D1D;\">Remaining balance</td><td style=\"padding:6px 0;text-align:right;font-weight:700;color:#7F1D1D;\">{}</td></tr>
                </table>
            </div>",
            dp_pct, format_money(dp_amount, currency), format_money(amount_remaining, currency))
    } else {
        format!(
            "<div style=\"border:1px solid #D1FAE5;background:#ECFDF5;border-radius:12px;padding:16px;margin:18px 0 0;\">
                <p style=\"margin:0;color:#065F46;font-weight:700;\">Amount due: {}</p>
            </div>",
            format_money(amount_remaining, currency))
    };

    // Pay button
    let pay_button = if payment_link.is_empty() {
        String::new()
    } else {
        format!(
            "<p style=\"margin:24px 0;text-align:center;\">
                <a href=\"{}\" style=\"display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:bold;font-size:15px;\">Pay Now</a>
            </p>", escape_html(&payment_link))
    };

    // Notes
    let notes_html = if notes.is_empty() {
        String::new()
    } else {
        format!(
            "<p style=\"margin:18px 0 0;color:#4B5563;\"><strong>Notes:</strong> {}</p>",
            escape_html(notes)
        )
    };

    let due_date_display = if due_date.is_empty() { "-" } else { due_date };

    let subject = format!("Payment Reminder - {}", c.invoice_number);
    let html_body = format!(
        "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:680px;margin:0 auto;padding:24px;\">
            <div style=\"border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;background:#ffffff;\">
            <div style=\"background:#111827;color:#ffffff;padding:22px 24px;\">
                <p style=\"margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#D1D5DB;\">InvoiceQu</p>
                <h1 style=\"margin:0;font-size:28px;line-height:1.15;\">Payment Reminder</h1>
            </div>
            <div style=\"padding:24px;\">
            <p>Hi {client_name},</p>
            <p>This is a reminder that invoice <strong>{inv_number}</strong> is still awaiting payment.</p>
            <div style=\"display:block;border:1px solid #E5E7EB;border-radius:12px;padding:16px;margin:20px 0;background:#F9FAFB;\">
                <p style=\"margin:0 0 8px;color:#6B7280;font-size:13px;\">Invoice No.</p>
                <p style=\"margin:0 0 12px;font-size:18px;font-weight:700;color:#111827;\">{inv_number}</p>
                <p style=\"margin:0 0 8px;color:#6B7280;font-size:13px;\">Due Date</p>
                <p style=\"margin:0;font-weight:600;color:#111827;\">{due_date}</p>
            </div>
            {items}
            <table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin:18px 0 0;font-size:14px;\">
                <tr><td style=\"padding:8px 0;color:#6B7280;\">Subtotal</td><td style=\"padding:8px 0;text-align:right;font-weight:600;\">{fmt_subtotal}</td></tr>
                <tr><td style=\"padding:8px 0;color:#6B7280;\">Tax</td><td style=\"padding:8px 0;text-align:right;font-weight:600;\">{fmt_tax}</td></tr>
                <tr><td style=\"padding:8px 0;color:#6B7280;\">Discount</td><td style=\"padding:8px 0;text-align:right;font-weight:600;color:#DC2626;\">- {fmt_discount}</td></tr>
                <tr><td style=\"padding:14px 0 0;border-top:1px solid #E5E7EB;font-size:16px;font-weight:800;\">Invoice Total</td><td style=\"padding:14px 0 0;border-top:1px solid #E5E7EB;text-align:right;font-size:18px;font-weight:800;\">{fmt_total}</td></tr>
            </table>
            {payment_summary}
            {pay_button}
            {notes}
            <p style=\"color:#6B7280;font-size:14px;margin-top:22px;\">If you have already paid, please ignore this email.</p>
            </div>
            </div>
        </div>",
        client_name = escape_html(&c.client_name),
        inv_number = escape_html(&c.invoice_number),
        due_date = escape_html(due_date_display),
        items = items_html,
        fmt_subtotal = format_money(subtotal, currency),
        fmt_tax = format_money(tax, currency),
        fmt_discount = format_money(discount, currency),
        fmt_total = format_money(total, currency),
        payment_summary = payment_summary,
        pay_button = pay_button,
        notes = notes_html,
    );

    // Send the actual email
    let amount_formatted = format_money(c.amount_due, &c.currency);
    let email_status = match super::notification::send_email_via_resend(
        env,
        &c.client_email,
        &subject,
        &html_body,
    )
    .await
    {
        Ok(_) => "sent",
        Err(e) => {
            console_log!("[CHASER] Email failed for {}: {}", c.client_email, e);
            "failed"
        }
    };

    let log_id = utils::generate_id();
    let message = format!(
        "Manual reminder for {} ({}) - {} [{}]",
        c.invoice_number, c.client_name, amount_formatted, email_status
    );
    db.execute("INSERT INTO chaser_logs (id,chaser_id,invoice_id,reminder_type,day_offset,channel,status,message) VALUES ($1,$2,$3,'manual',0,'email',$4,$5)",
        &[serde_json::json!(log_id), serde_json::json!(chaser_id), serde_json::json!(c.invoice_id), serde_json::json!(email_status), serde_json::json!(message)]).await?;
    db.execute("UPDATE payment_chasers SET total_reminders_sent=total_reminders_sent+1, last_reminder_at=NOW(), updated_at=NOW() WHERE id=$1", &[serde_json::json!(chaser_id)]).await?;

    if email_status == "failed" {
        return utils::json_error("Reminder logged but email failed to send", 500);
    }

    // Notification: chaser reminder sent
    notification::queue_notification(
        env,
        &claims.user_id,
        "chaser_reminder_sent",
        "Reminder Terkirim",
        &format!(
            "Pengingat pembayaran {} ({}) berhasil dikirim ke {}",
            c.invoice_number, amount_formatted, c.client_email
        ),
        &c.client_name,
        &format!("Reminder {} terkirim", c.invoice_number),
        "sent",
    );

    utils::json_response(
        &serde_json::json!({"message": "Reminder sent", "log_id": log_id}),
        200,
    )
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
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

pub async fn stats(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    ensure_tables(&db).await?;
    let uid = serde_json::json!(claims.user_id);
    let active: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM payment_chasers WHERE user_id=$1 AND status='active'",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let paused: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM payment_chasers WHERE user_id=$1 AND status='paused'",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let completed: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM payment_chasers WHERE user_id=$1 AND status='completed'",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let total_reminders: i64 = db
        .query_scalar(
            "SELECT COALESCE(SUM(total_reminders_sent),0) FROM payment_chasers WHERE user_id=$1",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let total_chasing: f64 = db
        .query_scalar(
            "SELECT COALESCE(SUM(amount_due * CASE currency \
            WHEN 'IDR' THEN 1 WHEN 'USD' THEN 16200 WHEN 'EUR' THEN 18400 WHEN 'GBP' THEN 20800 \
            WHEN 'SGD' THEN 12300 WHEN 'MYR' THEN 3700 WHEN 'JPY' THEN 108 WHEN 'AUD' THEN 10500 \
            WHEN 'CAD' THEN 12000 WHEN 'CHF' THEN 18600 WHEN 'CNY' THEN 2250 WHEN 'HKD' THEN 2080 \
            WHEN 'INR' THEN 195 WHEN 'PHP' THEN 290 WHEN 'THB' THEN 470 WHEN 'VND' THEN 0.65 \
            WHEN 'NZD' THEN 9800 WHEN 'SEK' THEN 1600 WHEN 'NOK' THEN 1530 WHEN 'DKK' THEN 2470 \
            WHEN 'PLN' THEN 4200 WHEN 'CZK' THEN 720 WHEN 'HUF' THEN 45 WHEN 'BRL' THEN 2850 \
            WHEN 'MXN' THEN 950 WHEN 'TWD' THEN 510 WHEN 'ILS' THEN 4500 WHEN 'RUB' THEN 185 \
            ELSE 1 END),0) FROM payment_chasers WHERE user_id=$1 AND status='active'",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0.0);
    utils::json_response(
        &serde_json::json!({"active": active, "paused": paused, "completed": completed, "total_reminders_sent": total_reminders, "total_amount_chasing": total_chasing}),
        200,
    )
}

// ── Automated scheduled chaser processing ──

pub struct ChaserRunSummary {
    pub checked: i64,
    pub sent: i64,
    pub skipped: i64,
    pub failed: i64,
    pub completed: i64,
}

/// Called by cron scheduler. For each active chaser:
/// 1. Check if invoice is now paid → mark chaser completed
/// 2. Parse schedule (e.g. [-3,0,3,7,14]) relative to due_date
/// 3. If today matches a scheduled day AND we haven't sent for this offset yet → send email
pub async fn process_scheduled_chasers(env: &Env) -> Result<ChaserRunSummary> {
    let db = get_db(env)?;
    ensure_tables(&db).await?;

    let mut summary = ChaserRunSummary {
        checked: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        completed: 0,
    };

    // Fetch all active chasers
    let chasers: Vec<PaymentChaser> = db
        .query_typed(
            &format!(
                "SELECT {} FROM payment_chasers WHERE status='active'",
                CH_COLS
            ),
            &[],
        )
        .await
        .unwrap_or_default();

    summary.checked = chasers.len() as i64;

    for c in &chasers {
        // 1. Check if invoice is now paid → auto-complete chaser
        let inv_status: String = db
            .query_scalar::<String>(
                "SELECT COALESCE(status,'') FROM invoices WHERE id=$1",
                &[serde_json::json!(c.invoice_id)],
            )
            .await
            .unwrap_or_default();

        if inv_status == "paid" || inv_status == "cancelled" || inv_status == "canceled" {
            let _ = db
                .execute(
                    "UPDATE payment_chasers SET status='completed', updated_at=NOW() WHERE id=$1",
                    &[serde_json::json!(c.id)],
                )
                .await;
            summary.completed += 1;
            console_log!(
                "[CHASER-CRON] Auto-completed chaser {} (invoice {} is {})",
                c.id,
                c.invoice_number,
                inv_status
            );
            continue;
        }

        // 2. Parse due_date and schedule
        let due_date = match parse_date(&c.due_date) {
            Some(d) => d,
            None => {
                summary.skipped += 1;
                continue;
            }
        };

        let schedule = parse_schedule(&c.schedule);
        let today = chrono::Utc::now().date_naive();
        let days_diff = (today - due_date).num_days() as i32; // positive = overdue, negative = before due

        // Find if today matches any scheduled offset
        // Schedule offsets: -3 = 3 days before due, 0 = due day, 3 = 3 days after, etc.
        let matching_offset = schedule.iter().find(|&&offset| offset == days_diff);

        let offset = match matching_offset {
            Some(&o) => o,
            None => {
                // Also check: if we're past the last schedule offset AND haven't sent the last one
                summary.skipped += 1;
                continue;
            }
        };

        // 3. Check if we already sent for this offset today
        let already_sent: i64 = db.query_scalar(
            "SELECT COUNT(*) FROM chaser_logs WHERE chaser_id=$1 AND day_offset=$2 AND sent_at::date = CURRENT_DATE",
            &[serde_json::json!(c.id), serde_json::json!(offset)]
        ).await.unwrap_or(0);

        if already_sent > 0 {
            summary.skipped += 1;
            continue;
        }

        // 4. Skip if no email
        if c.client_email.is_empty() {
            summary.skipped += 1;
            continue;
        }

        // 5. Build and send the invoice-style email
        let send_result = send_scheduled_email(env, &db, &c, offset).await;

        let email_status = match &send_result {
            Ok(_) => "sent",
            Err(_) => "failed",
        };

        // Log the reminder
        let log_id = utils::generate_id();
        let reminder_type = if offset < 0 {
            "pre_due"
        } else if offset == 0 {
            "due_day"
        } else {
            "overdue"
        };
        let message = format!(
            "Auto reminder [H{:+}] for {} ({}) [{}]",
            offset, c.invoice_number, c.client_name, email_status
        );
        let _ = db.execute(
            "INSERT INTO chaser_logs (id,chaser_id,invoice_id,reminder_type,day_offset,channel,status,message) VALUES ($1,$2,$3,$4,$5,'email',$6,$7)",
            &[serde_json::json!(log_id), serde_json::json!(c.id), serde_json::json!(c.invoice_id),
              serde_json::json!(reminder_type), serde_json::json!(offset),
              serde_json::json!(email_status), serde_json::json!(message)]
        ).await;

        // Update chaser counters
        let _ = db.execute(
            "UPDATE payment_chasers SET total_reminders_sent=total_reminders_sent+1, last_reminder_at=NOW(), updated_at=NOW() WHERE id=$1",
            &[serde_json::json!(c.id)]
        ).await;

        match send_result {
            Ok(_) => {
                summary.sent += 1;
                console_log!(
                    "[CHASER-CRON] Sent H{:+} reminder to {} for {}",
                    offset,
                    c.client_email,
                    c.invoice_number
                );

                // Queue notification for the user
                notification::queue_notification(
                    env,
                    &c.user_id,
                    "chaser_auto_sent",
                    "Auto-Reminder Terkirim",
                    &format!(
                        "Pengingat otomatis H{:+} untuk {} ({}) dikirim ke {}",
                        offset, c.invoice_number, c.client_name, c.client_email
                    ),
                    &c.client_name,
                    &format!("Auto H{:+} {}", offset, c.invoice_number),
                    "sent",
                );
            }
            Err(e) => {
                summary.failed += 1;
                console_log!(
                    "[CHASER-CRON] Failed H{:+} for {} ({}): {}",
                    offset,
                    c.invoice_number,
                    c.client_email,
                    e
                );
            }
        }
    }

    Ok(summary)
}

/// Send invoice-style email for a scheduled chaser trigger
async fn send_scheduled_email(
    env: &Env,
    db: &NeonClient,
    c: &PaymentChaser,
    day_offset: i32,
) -> std::result::Result<(), String> {
    // Fetch full invoice
    let inv: Option<serde_json::Value> = db.query_one(
        "SELECT subtotal, tax, discount, total, amount_remaining, status, payment_type, dp_percentage, dp_amount, due_date, notes, currency, COALESCE(payment_link,'') as payment_link, COALESCE(remaining_payment_link,'') as remaining_payment_link FROM invoices WHERE id=$1",
        &[serde_json::json!(c.invoice_id)]
    ).await.map_err(|e| e.to_string())?;
    let inv = match inv {
        Some(i) => i,
        None => return Err("Invoice not found".into()),
    };

    // Fetch items
    #[derive(serde::Deserialize)]
    struct Item {
        description: String,
        quantity: f64,
        price: f64,
        total: f64,
    }
    let items: Vec<Item> = db
        .query_typed(
            "SELECT description, quantity, price, total FROM invoice_items WHERE invoice_id=$1",
            &[serde_json::json!(c.invoice_id)],
        )
        .await
        .unwrap_or_default();

    let currency = inv
        .get("currency")
        .and_then(|v| v.as_str())
        .unwrap_or("IDR");
    let subtotal = inv.get("subtotal").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let tax = inv.get("tax").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let discount = inv.get("discount").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let total = inv
        .get("total")
        .and_then(|v| v.as_f64())
        .unwrap_or(c.amount_due);
    let amount_remaining = inv
        .get("amount_remaining")
        .and_then(|v| v.as_f64())
        .unwrap_or(c.amount_due);
    let payment_type = inv
        .get("payment_type")
        .and_then(|v| v.as_str())
        .unwrap_or("full");
    let dp_pct = inv
        .get("dp_percentage")
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as i32;
    let dp_amount = inv.get("dp_amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let due_date = inv.get("due_date").and_then(|v| v.as_str()).unwrap_or("");
    let notes = inv.get("notes").and_then(|v| v.as_str()).unwrap_or("");
    let inv_status = inv.get("status").and_then(|v| v.as_str()).unwrap_or("");

    let payment_link = {
        let pl = inv
            .get("payment_link")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let rpl = inv
            .get("remaining_payment_link")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if inv_status == "partially_paid" && !rpl.is_empty() {
            rpl
        } else {
            pl
        }
    };

    // Items table
    let items_html = if items.is_empty() {
        String::new()
    } else {
        let mut rows = String::new();
        for item in &items {
            rows.push_str(&format!(
                "<tr><td style=\"padding:10px 12px;border-bottom:1px solid #E5E7EB;\">{}</td><td style=\"padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:center;\">{}</td><td style=\"padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:right;\">{}</td><td style=\"padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:right;font-weight:600;\">{}</td></tr>",
                escape_html(&item.description), item.quantity, format_money(item.price, currency), format_money(item.total, currency)
            ));
        }
        format!(
            "<table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin:18px 0;font-size:14px;\"><thead><tr style=\"background:#F3F4F6;color:#374151;\"><th style=\"padding:10px 12px;text-align:left;\">Description</th><th style=\"padding:10px 12px;text-align:center;\">Qty</th><th style=\"padding:10px 12px;text-align:right;\">Price</th><th style=\"padding:10px 12px;text-align:right;\">Total</th></tr></thead><tbody>{}</tbody></table>", rows)
    };

    // Payment summary
    let payment_summary = if payment_type == "dp" {
        format!("<div style=\"border:1px solid #FCA5A5;background:#FEF2F2;border-radius:12px;padding:16px;margin:18px 0 0;\"><p style=\"margin:0 0 8px;font-size:13px;font-weight:700;color:#991B1B;text-transform:uppercase;\">Down Payment Plan</p><table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"font-size:14px;\"><tr><td style=\"padding:6px 0;color:#7F1D1D;\">DP ({}%)</td><td style=\"padding:6px 0;text-align:right;font-weight:800;color:#7F1D1D;\">{}</td></tr><tr><td style=\"padding:6px 0;color:#7F1D1D;\">Remaining balance</td><td style=\"padding:6px 0;text-align:right;font-weight:700;color:#7F1D1D;\">{}</td></tr></table></div>",
            dp_pct, format_money(dp_amount, currency), format_money(amount_remaining, currency))
    } else {
        format!("<div style=\"border:1px solid #D1FAE5;background:#ECFDF5;border-radius:12px;padding:16px;margin:18px 0 0;\"><p style=\"margin:0;color:#065F46;font-weight:700;\">Amount due: {}</p></div>",
            format_money(amount_remaining, currency))
    };

    let pay_button = if payment_link.is_empty() {
        String::new()
    } else {
        format!("<p style=\"margin:24px 0;text-align:center;\"><a href=\"{}\" style=\"display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:bold;font-size:15px;\">Pay Now</a></p>", escape_html(&payment_link))
    };

    let notes_html = if notes.is_empty() {
        String::new()
    } else {
        format!(
            "<p style=\"margin:18px 0 0;color:#4B5563;\"><strong>Notes:</strong> {}</p>",
            escape_html(notes)
        )
    };

    let urgency_label = if day_offset < 0 {
        format!("Due in {} days", -day_offset)
    } else if day_offset == 0 {
        "Due today".to_string()
    } else {
        format!("Overdue by {} days", day_offset)
    };

    let due_date_display = if due_date.is_empty() { "-" } else { due_date };

    let subject = if day_offset <= 0 {
        format!("Payment Reminder - {}", c.invoice_number)
    } else {
        format!("⚠️ Invoice Overdue - {}", c.invoice_number)
    };

    let header_bg = if day_offset > 0 { "#991B1B" } else { "#111827" };

    let html_body = format!(
        "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:680px;margin:0 auto;padding:24px;\">
            <div style=\"border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;background:#ffffff;\">
            <div style=\"background:{header_bg};color:#ffffff;padding:22px 24px;\">
                <p style=\"margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#D1D5DB;\">InvoiceQu</p>
                <h1 style=\"margin:0;font-size:28px;line-height:1.15;\">Payment Reminder</h1>
                <p style=\"margin:8px 0 0;font-size:14px;color:#FCA5A5;font-weight:600;\">{urgency}</p>
            </div>
            <div style=\"padding:24px;\">
            <p>Hi {client_name},</p>
            <p>This is a reminder that invoice <strong>{inv_number}</strong> is still awaiting payment.</p>
            <div style=\"display:block;border:1px solid #E5E7EB;border-radius:12px;padding:16px;margin:20px 0;background:#F9FAFB;\">
                <p style=\"margin:0 0 8px;color:#6B7280;font-size:13px;\">Invoice No.</p>
                <p style=\"margin:0 0 12px;font-size:18px;font-weight:700;color:#111827;\">{inv_number}</p>
                <p style=\"margin:0 0 8px;color:#6B7280;font-size:13px;\">Due Date</p>
                <p style=\"margin:0;font-weight:600;color:#111827;\">{due_date}</p>
            </div>
            {items}
            <table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"margin:18px 0 0;font-size:14px;\">
                <tr><td style=\"padding:8px 0;color:#6B7280;\">Subtotal</td><td style=\"padding:8px 0;text-align:right;font-weight:600;\">{fmt_sub}</td></tr>
                <tr><td style=\"padding:8px 0;color:#6B7280;\">Tax</td><td style=\"padding:8px 0;text-align:right;font-weight:600;\">{fmt_tax}</td></tr>
                <tr><td style=\"padding:8px 0;color:#6B7280;\">Discount</td><td style=\"padding:8px 0;text-align:right;font-weight:600;color:#DC2626;\">- {fmt_disc}</td></tr>
                <tr><td style=\"padding:14px 0 0;border-top:1px solid #E5E7EB;font-size:16px;font-weight:800;\">Total</td><td style=\"padding:14px 0 0;border-top:1px solid #E5E7EB;text-align:right;font-size:18px;font-weight:800;\">{fmt_total}</td></tr>
            </table>
            {ps}
            {pb}
            {notes}
            <p style=\"color:#6B7280;font-size:14px;margin-top:22px;\">If you have already paid, please ignore this email.</p>
            </div></div></div>",
        header_bg = header_bg,
        urgency = escape_html(&urgency_label),
        client_name = escape_html(&c.client_name),
        inv_number = escape_html(&c.invoice_number),
        due_date = escape_html(due_date_display),
        items = items_html,
        fmt_sub = format_money(subtotal, currency),
        fmt_tax = format_money(tax, currency),
        fmt_disc = format_money(discount, currency),
        fmt_total = format_money(total, currency),
        ps = payment_summary,
        pb = pay_button,
        notes = notes_html,
    );

    super::notification::send_email_via_resend(env, &c.client_email, &subject, &html_body)
        .await
        .map_err(|e| format!("{}", e))
}

fn parse_date(s: &str) -> Option<chrono::NaiveDate> {
    let s = s.trim();
    // Try common date formats
    chrono::NaiveDate::parse_from_str(&s[..10.min(s.len())], "%Y-%m-%d").ok()
}

fn parse_schedule(s: &str) -> Vec<i32> {
    // Parse "[−3,0,3,7,14]" or similar
    let cleaned = s.replace('[', "").replace(']', "").replace(' ', "");
    cleaned
        .split(',')
        .filter_map(|v| v.parse::<i32>().ok())
        .collect()
}
