//! Quotation Pipeline — CRUD, send, public accept/reject, convert to invoice.

use crate::db::NeonClient;
use crate::middleware::JwtClaims;
use crate::services::notification;
use crate::utils;
use serde::{Deserialize, Serialize};
use worker::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Quotation {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub quotation_number: String,
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
    pub valid_until: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub accept_token: String,
    #[serde(default)]
    pub converted_invoice_id: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
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
    pub quantity: f64,
    #[serde(default)]
    pub price: f64,
    #[serde(default)]
    pub total: f64,
}

const QT_COLS: &str = "id, user_id, quotation_number, client_id, client_name, client_email, subtotal, tax, discount, total, status, COALESCE(valid_until,'') as valid_until, COALESCE(notes,'') as notes, currency, COALESCE(accept_token,'') as accept_token, COALESCE(converted_invoice_id,'') as converted_invoice_id, created_at::text, updated_at::text, accepted_at::text, rejected_at::text";
const QI_COLS: &str = "id, quotation_id, description, quantity, price, total";

fn get_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "INVOICE_DB_URL");
    NeonClient::from_connection_string(&url)
}

async fn ensure_tables(db: &NeonClient) -> Result<()> {
    db.execute("CREATE TABLE IF NOT EXISTS quotations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, quotation_number TEXT NOT NULL DEFAULT '', client_id TEXT NOT NULL DEFAULT '', client_name TEXT NOT NULL DEFAULT '', client_email TEXT NOT NULL DEFAULT '', subtotal DOUBLE PRECISION NOT NULL DEFAULT 0, tax DOUBLE PRECISION NOT NULL DEFAULT 0, discount DOUBLE PRECISION NOT NULL DEFAULT 0, total DOUBLE PRECISION NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', valid_until TEXT, notes TEXT, currency TEXT NOT NULL DEFAULT 'IDR', accept_token TEXT, converted_invoice_id TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), accepted_at TIMESTAMPTZ, rejected_at TIMESTAMPTZ)", &[]).await?;
    db.execute("CREATE TABLE IF NOT EXISTS quotation_items (id TEXT PRIMARY KEY, quotation_id TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', quantity DOUBLE PRECISION NOT NULL DEFAULT 1, price DOUBLE PRECISION NOT NULL DEFAULT 0, total DOUBLE PRECISION NOT NULL DEFAULT 0)", &[]).await?;
    Ok(())
}

async fn load_items(db: &NeonClient, qid: &str) -> Vec<QuotationItem> {
    db.query_typed::<QuotationItem>(
        &format!(
            "SELECT {} FROM quotation_items WHERE quotation_id=$1",
            QI_COLS
        ),
        &[serde_json::json!(qid)],
    )
    .await
    .unwrap_or_default()
}

async fn gen_number(db: &NeonClient, uid: &str) -> String {
    let count: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM quotations WHERE user_id=$1",
            &[serde_json::json!(uid)],
        )
        .await
        .unwrap_or(0);
    let now = chrono::Utc::now();
    format!(
        "QT-{}{:02}-{:03}",
        now.format("%y"),
        now.format("%m"),
        count + 1
    )
}

pub async fn list(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    ensure_tables(&db).await?;
    let url = req.url()?;
    let status = utils::query_param(&url, "status").unwrap_or_default();
    let (page, per_page) = utils::parse_pagination(&url);
    let offset = (page - 1) * per_page;
    let uid = serde_json::json!(claims.user_id);

    let (total, quotations): (i64, Vec<Quotation>) = if status.is_empty() {
        let t: i64 = db
            .query_scalar(
                "SELECT COUNT(*) FROM quotations WHERE user_id=$1",
                &[uid.clone()],
            )
            .await?;
        let q: Vec<Quotation> = db.query_typed(&format!("SELECT {} FROM quotations WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", QT_COLS), &[uid.clone(), serde_json::json!(per_page), serde_json::json!(offset)]).await?;
        (t, q)
    } else {
        let t: i64 = db
            .query_scalar(
                "SELECT COUNT(*) FROM quotations WHERE user_id=$1 AND status=$2",
                &[uid.clone(), serde_json::json!(status)],
            )
            .await?;
        let q: Vec<Quotation> = db.query_typed(&format!("SELECT {} FROM quotations WHERE user_id=$1 AND status=$2 ORDER BY created_at DESC LIMIT $3 OFFSET $4", QT_COLS), &[uid.clone(), serde_json::json!(status), serde_json::json!(per_page), serde_json::json!(offset)]).await?;
        (t, q)
    };

    let mut result = quotations;
    for q in result.iter_mut() {
        q.items = load_items(&db, &q.id).await;
    }
    let total_pages = ((total as i32) + per_page - 1) / per_page;
    utils::json_response(
        &serde_json::json!({"data": result, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}),
        200,
    )
}

pub async fn get(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let q: Option<Quotation> = db
        .query_one(
            &format!(
                "SELECT {} FROM quotations WHERE id=$1 AND user_id=$2",
                QT_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(claims.user_id)],
        )
        .await?;
    match q {
        Some(mut qt) => {
            qt.items = load_items(&db, &qt.id).await;
            utils::json_response(&qt, 200)
        }
        None => utils::json_error("Quotation not found", 404),
    }
}

pub async fn create(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid body".into()))?;
    let db = get_db(env)?;
    ensure_tables(&db).await?;
    let id = utils::generate_id();
    let number = gen_number(&db, &claims.user_id).await;
    let items_raw = body
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let subtotal: f64 = items_raw
        .iter()
        .map(|i| {
            i.get("quantity").and_then(|v| v.as_f64()).unwrap_or(1.0)
                * i.get("price").and_then(|v| v.as_f64()).unwrap_or(0.0)
        })
        .sum();
    let tax = body.get("tax").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let discount = body.get("discount").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let total = subtotal + tax - discount;

    db.execute("INSERT INTO quotations (id,user_id,quotation_number,client_id,client_name,client_email,subtotal,tax,discount,total,valid_until,notes,currency) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
        &[serde_json::json!(id), serde_json::json!(claims.user_id), serde_json::json!(number),
          serde_json::json!(body.get("client_id").and_then(|v| v.as_str()).unwrap_or("")),
          serde_json::json!(body.get("client_name").and_then(|v| v.as_str()).unwrap_or("")),
          serde_json::json!(body.get("client_email").and_then(|v| v.as_str()).unwrap_or("")),
          serde_json::json!(subtotal), serde_json::json!(tax), serde_json::json!(discount), serde_json::json!(total),
          serde_json::json!(body.get("valid_until").and_then(|v| v.as_str()).unwrap_or("")),
          serde_json::json!(body.get("notes").and_then(|v| v.as_str()).unwrap_or("")),
          serde_json::json!(body.get("currency").and_then(|v| v.as_str()).unwrap_or("IDR"))]).await?;

    for item in &items_raw {
        let iid = utils::generate_id();
        let qty = item.get("quantity").and_then(|v| v.as_f64()).unwrap_or(1.0);
        let price = item.get("price").and_then(|v| v.as_f64()).unwrap_or(0.0);
        db.execute("INSERT INTO quotation_items (id,quotation_id,description,quantity,price,total) VALUES ($1,$2,$3,$4,$5,$6)",
            &[serde_json::json!(iid), serde_json::json!(id),
              serde_json::json!(item.get("description").and_then(|v| v.as_str()).unwrap_or("")),
              serde_json::json!(qty), serde_json::json!(price), serde_json::json!(qty * price)]).await?;
    }

    // Notification: quotation created
    let client_name = body
        .get("client_name")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    notification::queue_notification(
        env,
        &claims.user_id,
        "quotation_created",
        "Quotation Dibuat",
        &format!("Quotation {} untuk {} berhasil dibuat", number, client_name),
        client_name,
        &format!("Quotation {} dibuat", number),
        "sent",
    );

    self::get(env, claims, &id).await
}

pub async fn update(mut req: Request, env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let body: serde_json::Value = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid body".into()))?;
    let db = get_db(env)?;
    let existing: Option<Quotation> = db
        .query_one(
            &format!(
                "SELECT {} FROM quotations WHERE id=$1 AND user_id=$2",
                QT_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(claims.user_id)],
        )
        .await?;
    let ex = match existing {
        Some(q) => q,
        None => return utils::json_error("Not found", 404),
    };
    if ex.status != "draft" {
        return utils::json_error("Can only edit draft quotations", 400);
    }

    let items_raw = body
        .get("items")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let subtotal: f64 = items_raw
        .iter()
        .map(|i| {
            i.get("quantity").and_then(|v| v.as_f64()).unwrap_or(1.0)
                * i.get("price").and_then(|v| v.as_f64()).unwrap_or(0.0)
        })
        .sum();
    let tax = body.get("tax").and_then(|v| v.as_f64()).unwrap_or(ex.tax);
    let discount = body
        .get("discount")
        .and_then(|v| v.as_f64())
        .unwrap_or(ex.discount);
    let total = subtotal + tax - discount;

    db.execute("UPDATE quotations SET client_id=$1,client_name=$2,client_email=$3,subtotal=$4,tax=$5,discount=$6,total=$7,valid_until=$8,notes=$9,currency=$10,updated_at=NOW() WHERE id=$11",
        &[serde_json::json!(body.get("client_id").and_then(|v| v.as_str()).unwrap_or(&ex.client_id)),
          serde_json::json!(body.get("client_name").and_then(|v| v.as_str()).unwrap_or(&ex.client_name)),
          serde_json::json!(body.get("client_email").and_then(|v| v.as_str()).unwrap_or(&ex.client_email)),
          serde_json::json!(subtotal), serde_json::json!(tax), serde_json::json!(discount), serde_json::json!(total),
          serde_json::json!(body.get("valid_until").and_then(|v| v.as_str()).unwrap_or(&ex.valid_until)),
          serde_json::json!(body.get("notes").and_then(|v| v.as_str()).unwrap_or(&ex.notes)),
          serde_json::json!(body.get("currency").and_then(|v| v.as_str()).unwrap_or(&ex.currency)),
          serde_json::json!(id)]).await?;

    db.execute(
        "DELETE FROM quotation_items WHERE quotation_id=$1",
        &[serde_json::json!(id)],
    )
    .await?;
    for item in &items_raw {
        let iid = utils::generate_id();
        let qty = item.get("quantity").and_then(|v| v.as_f64()).unwrap_or(1.0);
        let price = item.get("price").and_then(|v| v.as_f64()).unwrap_or(0.0);
        db.execute("INSERT INTO quotation_items (id,quotation_id,description,quantity,price,total) VALUES ($1,$2,$3,$4,$5,$6)",
            &[serde_json::json!(iid), serde_json::json!(id),
              serde_json::json!(item.get("description").and_then(|v| v.as_str()).unwrap_or("")),
              serde_json::json!(qty), serde_json::json!(price), serde_json::json!(qty * price)]).await?;
    }
    self::get(env, claims, id).await
}

pub async fn delete(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    db.execute(
        "DELETE FROM quotation_items WHERE quotation_id=$1",
        &[serde_json::json!(id)],
    )
    .await?;
    db.execute(
        "DELETE FROM quotations WHERE id=$1 AND user_id=$2",
        &[serde_json::json!(id), serde_json::json!(claims.user_id)],
    )
    .await?;
    utils::json_response(&serde_json::json!({"message": "Quotation deleted"}), 200)
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
        "DELETE FROM quotation_items WHERE quotation_id=ANY($1)",
        &[serde_json::json!(pg_arr)],
    )
    .await?;
    let deleted = db
        .execute(
            "DELETE FROM quotations WHERE user_id=$1 AND id=ANY($2)",
            &[serde_json::json!(claims.user_id), serde_json::json!(pg_arr)],
        )
        .await?;
    utils::json_response(
        &serde_json::json!({"message": "Quotations deleted", "deleted": deleted}),
        200,
    )
}

pub async fn send_quotation(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let q: Option<Quotation> = db
        .query_one(
            &format!(
                "SELECT {} FROM quotations WHERE id=$1 AND user_id=$2",
                QT_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(claims.user_id)],
        )
        .await?;
    let qt = match q {
        Some(q) => q,
        None => return utils::json_error("Not found", 404),
    };
    if qt.status != "draft" {
        return utils::json_error("Only draft quotations can be sent", 400);
    }
    let token = utils::generate_id();
    db.execute("UPDATE quotations SET status='sent', accept_token=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3",
        &[serde_json::json!(token), serde_json::json!(id), serde_json::json!(claims.user_id)]).await?;

    // Notification: quotation sent
    notification::queue_notification(
        env,
        &claims.user_id,
        "quotation_sent",
        "Quotation Dikirim",
        &format!(
            "Quotation {} telah dikirim ke {}",
            qt.quotation_number, qt.client_name
        ),
        &qt.client_name,
        &format!("Quotation {} dikirim", qt.quotation_number),
        "sent",
    );

    self::get(env, claims, id).await
}

pub async fn stats(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    ensure_tables(&db).await?;
    let uid = serde_json::json!(claims.user_id);
    let total: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM quotations WHERE user_id=$1",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let draft: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM quotations WHERE user_id=$1 AND status='draft'",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let sent: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM quotations WHERE user_id=$1 AND status='sent'",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let accepted: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM quotations WHERE user_id=$1 AND status='accepted'",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let rejected: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM quotations WHERE user_id=$1 AND status='rejected'",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let converted: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM quotations WHERE user_id=$1 AND status='converted'",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let total_value: f64 = db
        .query_scalar(
            "SELECT COALESCE(SUM(total * CASE currency \
            WHEN 'IDR' THEN 1 WHEN 'USD' THEN 16200 WHEN 'EUR' THEN 18400 WHEN 'GBP' THEN 20800 \
            WHEN 'SGD' THEN 12300 WHEN 'MYR' THEN 3700 WHEN 'JPY' THEN 108 WHEN 'AUD' THEN 10500 \
            WHEN 'CAD' THEN 12000 WHEN 'CHF' THEN 18600 WHEN 'CNY' THEN 2250 WHEN 'HKD' THEN 2080 \
            WHEN 'INR' THEN 195 WHEN 'PHP' THEN 290 WHEN 'THB' THEN 470 WHEN 'VND' THEN 0.65 \
            WHEN 'NZD' THEN 9800 WHEN 'SEK' THEN 1600 WHEN 'NOK' THEN 1530 WHEN 'DKK' THEN 2470 \
            WHEN 'PLN' THEN 4200 WHEN 'CZK' THEN 720 WHEN 'HUF' THEN 45 WHEN 'BRL' THEN 2850 \
            WHEN 'MXN' THEN 950 WHEN 'TWD' THEN 510 WHEN 'ILS' THEN 4500 WHEN 'RUB' THEN 185 \
            ELSE 1 END),0) FROM quotations WHERE user_id=$1",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0.0);
    let conversion_rate = if sent + accepted + converted > 0 {
        ((accepted + converted) as f64 / (sent + accepted + converted) as f64 * 100.0 * 10.0)
            .round()
            / 10.0
    } else {
        0.0
    };
    utils::json_response(
        &serde_json::json!({"total": total, "draft": draft, "sent": sent, "accepted": accepted, "rejected": rejected, "converted": converted, "total_value": total_value, "conversion_rate": conversion_rate}),
        200,
    )
}

// ── Public endpoints ──

pub async fn get_public(env: &Env, token: &str) -> Result<Response> {
    let db = get_db(env)?;
    ensure_tables(&db).await?;
    let q: Option<Quotation> = db
        .query_one(
            &format!("SELECT {} FROM quotations WHERE accept_token=$1", QT_COLS),
            &[serde_json::json!(token)],
        )
        .await?;
    match q {
        Some(mut qt) => {
            qt.items = load_items(&db, &qt.id).await;
            // Fetch business branding for this quotation's owner
            let accent: String = db
                .query_scalar(
                    "SELECT COALESCE(accent_color,'') FROM invoice_settings WHERE user_id=$1",
                    &[serde_json::json!(qt.user_id)],
                )
                .await
                .unwrap_or_default();
            let biz_name: String = db
                .query_scalar(
                    "SELECT COALESCE(business_name,'') FROM invoice_settings WHERE user_id=$1",
                    &[serde_json::json!(qt.user_id)],
                )
                .await
                .unwrap_or_default();
            let biz_logo: String = db
                .query_scalar(
                    "SELECT COALESCE(logo_url,'') FROM invoice_settings WHERE user_id=$1",
                    &[serde_json::json!(qt.user_id)],
                )
                .await
                .unwrap_or_default();
            let mut resp = serde_json::to_value(&qt).unwrap();
            resp["accent_color"] = serde_json::json!(accent);
            resp["business_name"] = serde_json::json!(biz_name);
            resp["business_logo"] = serde_json::json!(biz_logo);
            utils::json_response(&resp, 200)
        }
        None => utils::json_error("Quotation not found", 404),
    }
}

pub async fn accept_quotation(env: &Env, token: &str) -> Result<Response> {
    let db = get_db(env)?;
    // Fetch quotation before updating for notification
    let q: Option<Quotation> = db
        .query_one(
            &format!("SELECT {} FROM quotations WHERE accept_token=$1", QT_COLS),
            &[serde_json::json!(token)],
        )
        .await?;
    db.execute("UPDATE quotations SET status='accepted', accepted_at=NOW(), updated_at=NOW() WHERE accept_token=$1 AND status='sent'", &[serde_json::json!(token)]).await?;

    // Notification: quotation accepted by client
    if let Some(qt) = &q {
        notification::queue_notification(
            env,
            &qt.user_id,
            "quotation_accepted",
            "Quotation Disetujui ✅",
            &format!(
                "{} menyetujui quotation {}",
                qt.client_name, qt.quotation_number
            ),
            &qt.client_name,
            &format!("Quotation {} disetujui", qt.quotation_number),
            "sent",
        );
    }

    get_public(env, token).await
}

pub async fn reject_quotation(env: &Env, token: &str) -> Result<Response> {
    let db = get_db(env)?;
    // Fetch quotation before updating for notification
    let q: Option<Quotation> = db
        .query_one(
            &format!("SELECT {} FROM quotations WHERE accept_token=$1", QT_COLS),
            &[serde_json::json!(token)],
        )
        .await?;
    db.execute("UPDATE quotations SET status='rejected', rejected_at=NOW(), updated_at=NOW() WHERE accept_token=$1 AND status='sent'", &[serde_json::json!(token)]).await?;

    // Notification: quotation rejected by client
    if let Some(qt) = &q {
        notification::queue_notification(
            env,
            &qt.user_id,
            "quotation_rejected",
            "Quotation Ditolak ❌",
            &format!(
                "{} menolak quotation {}",
                qt.client_name, qt.quotation_number
            ),
            &qt.client_name,
            &format!("Quotation {} ditolak", qt.quotation_number),
            "sent",
        );
    }

    get_public(env, token).await
}

pub async fn convert_to_invoice(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let q: Option<Quotation> = db
        .query_one(
            &format!(
                "SELECT {} FROM quotations WHERE id=$1 AND user_id=$2",
                QT_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(claims.user_id)],
        )
        .await?;
    let mut qt = match q {
        Some(q) => q,
        None => return utils::json_error("Not found", 404),
    };
    if qt.status != "accepted" {
        return utils::json_error("Only accepted quotations can be converted", 400);
    }
    qt.items = load_items(&db, &qt.id).await;

    let inv_id = utils::generate_id();
    let count: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM invoices WHERE user_id=$1",
            &[serde_json::json!(claims.user_id)],
        )
        .await
        .unwrap_or(0);
    let now = chrono::Utc::now();
    let inv_number = format!(
        "INV-{}{:02}-{:03}",
        now.format("%y"),
        now.format("%m"),
        count + 1
    );

    // Use NULLIF to convert empty string to NULL for due_date
    let due_date = if qt.valid_until.is_empty() {
        serde_json::json!(null)
    } else {
        serde_json::json!(qt.valid_until)
    };
    let notes = if qt.notes.is_empty() {
        serde_json::json!(null)
    } else {
        serde_json::json!(qt.notes)
    };

    match db.execute(
        "INSERT INTO invoices (id,user_id,invoice_number,client_id,client_name,client_email,subtotal,tax,discount,total,amount_paid,amount_remaining,status,payment_type,dp_percentage,dp_amount,due_date,notes,currency) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$10,'draft','full',0,0,$11,$12,$13)",
        &[serde_json::json!(inv_id), serde_json::json!(claims.user_id), serde_json::json!(inv_number),
          serde_json::json!(qt.client_id), serde_json::json!(qt.client_name), serde_json::json!(qt.client_email),
          serde_json::json!(qt.subtotal), serde_json::json!(qt.tax), serde_json::json!(qt.discount), serde_json::json!(qt.total),
          due_date, notes, serde_json::json!(qt.currency)]
    ).await {
        Ok(_) => {},
        Err(e) => return utils::json_error(&format!("Failed to create invoice: {}", e), 500),
    }

    for item in &qt.items {
        let iid = utils::generate_id();
        let _ = db.execute("INSERT INTO invoice_items (id,invoice_id,description,quantity,price,total) VALUES ($1,$2,$3,$4,$5,$6)",
            &[serde_json::json!(iid), serde_json::json!(inv_id), serde_json::json!(item.description), serde_json::json!(item.quantity), serde_json::json!(item.price), serde_json::json!(item.total)]).await;
    }

    let _ = db.execute("UPDATE quotations SET status='converted', converted_invoice_id=$1, updated_at=NOW() WHERE id=$2", &[serde_json::json!(inv_id), serde_json::json!(id)]).await;

    // Notification: quotation converted to invoice
    notification::queue_notification(
        env,
        &claims.user_id,
        "quotation_converted",
        "Quotation Dikonversi",
        &format!(
            "Quotation {} berhasil dikonversi menjadi invoice {}",
            qt.quotation_number, inv_number
        ),
        &qt.client_name,
        &format!("Quotation → Invoice {}", inv_number),
        "sent",
    );

    utils::json_response(
        &serde_json::json!({"message": "Converted", "invoice_id": inv_id, "invoice_number": inv_number}),
        201,
    )
}
