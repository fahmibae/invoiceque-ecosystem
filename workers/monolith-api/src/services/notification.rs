//! Notification service module — event-driven email notifications + DB-backed notification log.
//! Mirrors: services/notification-service (Go)
//! Notifications are persisted in the `notifications` table and queried by the frontend.

use crate::db::NeonClient;
use crate::utils;
use serde::{Deserialize, Serialize};
use wasm_bindgen_futures::spawn_local;
use worker::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default, rename = "type")]
    pub notification_type: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub message: String,
    #[serde(default)]
    pub recipient: String,
    #[serde(default)]
    pub subject: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub is_read: bool,
    #[serde(default)]
    pub created_at: String,
}

const NOTIF_COLS: &str = "id, user_id, notification_type AS type, title, message, recipient, subject, status, is_read, created_at::text";

// ────────────────────────────────────────────────────────
//  DB helpers
// ────────────────────────────────────────────────────────

fn get_db(env: &Env) -> Result<NeonClient> {
    // Primary: use dedicated NOTIFICATION_DB_URL (notification-service Neon project)
    // Fallback: INVOICE_DB_URL for backwards compat
    let url = {
        let notif_url = utils::get_secret(env, "NOTIFICATION_DB_URL");
        if notif_url.is_empty() {
            utils::get_secret(env, "INVOICE_DB_URL")
        } else {
            notif_url
        }
    };
    NeonClient::from_connection_string(&url)
}

/// Ensure the notifications table exists (idempotent).
pub async fn ensure_notifications_table(db: &NeonClient) -> Result<()> {
    db.execute(
        "CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            notification_type VARCHAR(50) NOT NULL DEFAULT 'system',
            title VARCHAR(255) NOT NULL DEFAULT '',
            message TEXT NOT NULL DEFAULT '',
            recipient VARCHAR(255) NOT NULL DEFAULT '',
            subject VARCHAR(255) NOT NULL DEFAULT '',
            status VARCHAR(20) NOT NULL DEFAULT 'sent',
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )",
        &[],
    )
    .await?;

    db.execute(
        "CREATE INDEX IF NOT EXISTS idx_notifications_user_created
         ON notifications (user_id, created_at DESC)",
        &[],
    )
    .await?;

    db.execute(
        "CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
         ON notifications (user_id, is_read) WHERE is_read = FALSE",
        &[],
    )
    .await?;

    Ok(())
}

// ────────────────────────────────────────────────────────
//  Public API handlers
// ────────────────────────────────────────────────────────

/// GET /notifications — list notifications for the authenticated user with pagination.
pub async fn list_notifications(
    req: &Request,
    env: &Env,
    claims: &crate::middleware::JwtClaims,
) -> Result<Response> {
    let db = get_db(env)?;
    ensure_notifications_table(&db).await?;

    let url = req.url()?;
    let (page, per_page) = utils::parse_pagination(&url);
    let offset = (page - 1) * per_page;

    let total: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1",
            &[serde_json::json!(claims.user_id)],
        )
        .await
        .unwrap_or(0);

    let unread_count: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
            &[serde_json::json!(claims.user_id)],
        )
        .await
        .unwrap_or(0);

    let notifications: Vec<Notification> = db
        .query_typed(
            &format!(
                "SELECT {} FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
                NOTIF_COLS
            ),
            &[
                serde_json::json!(claims.user_id),
                serde_json::json!(per_page),
                serde_json::json!(offset),
            ],
        )
        .await
        .unwrap_or_default();

    let total_pages = if per_page > 0 {
        ((total as i32) + per_page - 1) / per_page
    } else {
        0
    };

    utils::json_response(
        &serde_json::json!({
            "data": notifications,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
            "unread_count": unread_count,
        }),
        200,
    )
}

/// PUT /notifications/:id/read — mark a single notification as read.
pub async fn mark_as_read(
    env: &Env,
    claims: &crate::middleware::JwtClaims,
    id: &str,
) -> Result<Response> {
    let db = get_db(env)?;
    db.execute(
        "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
        &[serde_json::json!(id), serde_json::json!(claims.user_id)],
    )
    .await?;

    utils::json_response(
        &serde_json::json!({"message": "Notification marked as read"}),
        200,
    )
}

/// PUT /notifications/read-all — mark ALL notifications as read for the current user.
pub async fn mark_all_as_read(
    env: &Env,
    claims: &crate::middleware::JwtClaims,
) -> Result<Response> {
    let db = get_db(env)?;
    let updated = db
        .execute(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
            &[serde_json::json!(claims.user_id)],
        )
        .await?;

    utils::json_response(
        &serde_json::json!({"message": "All notifications marked as read", "updated": updated}),
        200,
    )
}

/// DELETE /notifications/:id — delete a single notification.
pub async fn delete_notification(
    env: &Env,
    claims: &crate::middleware::JwtClaims,
    id: &str,
) -> Result<Response> {
    let db = get_db(env)?;
    let deleted = db
        .execute(
            "DELETE FROM notifications WHERE id = $1 AND user_id = $2",
            &[serde_json::json!(id), serde_json::json!(claims.user_id)],
        )
        .await?;

    if deleted == 0 {
        return utils::json_error("Notification not found", 404);
    }

    utils::json_response(&serde_json::json!({"message": "Notification deleted"}), 200)
}

/// DELETE /notifications — delete ALL notifications for the current user.
pub async fn delete_all_notifications(
    env: &Env,
    claims: &crate::middleware::JwtClaims,
) -> Result<Response> {
    let db = get_db(env)?;
    let deleted = db
        .execute(
            "DELETE FROM notifications WHERE user_id = $1",
            &[serde_json::json!(claims.user_id)],
        )
        .await?;

    utils::json_response(
        &serde_json::json!({"message": "All notifications deleted", "deleted": deleted}),
        200,
    )
}

/// POST /notifications/delete-batch — delete selected notifications by IDs.
pub async fn delete_batch_notifications(
    req: &mut Request,
    env: &Env,
    claims: &crate::middleware::JwtClaims,
) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let ids = body["ids"]
        .as_array()
        .ok_or_else(|| Error::RustError("Missing 'ids' array".into()))?;

    if ids.is_empty() {
        return utils::json_error("No IDs provided", 400);
    }

    if ids.len() > 100 {
        return utils::json_error("Cannot delete more than 100 notifications at once", 400);
    }

    let db = get_db(env)?;

    // Build parameterized query: DELETE ... WHERE id IN ($2,$3,...) AND user_id = $1
    let placeholders: Vec<String> = ids
        .iter()
        .enumerate()
        .map(|(i, _)| format!("${}", i + 2))
        .collect();
    let sql = format!(
        "DELETE FROM notifications WHERE user_id = $1 AND id IN ({})",
        placeholders.join(",")
    );

    let mut params: Vec<serde_json::Value> = vec![serde_json::json!(claims.user_id)];
    for id in ids {
        params.push(id.clone());
    }

    let deleted = db.execute(&sql, &params).await?;

    utils::json_response(
        &serde_json::json!({"message": "Selected notifications deleted", "deleted": deleted}),
        200,
    )
}

// ────────────────────────────────────────────────────────
//  Internal: create notifications from other services
// ────────────────────────────────────────────────────────

/// Insert a notification row into the DB (fire-and-forget via spawn_local).
/// This is the main entry point for other services to record a notification.
pub fn queue_notification(
    env: &Env,
    user_id: &str,
    notification_type: &str,
    title: &str,
    message: &str,
    recipient: &str,
    subject: &str,
    status: &str,
) {
    let db = match get_db(env) {
        Ok(db) => db,
        Err(e) => {
            console_log!("[NOTIFICATION] Failed to get DB: {}", e);
            return;
        }
    };

    let id = utils::generate_id();
    let user_id = user_id.to_string();
    let notification_type = notification_type.to_string();
    let title = title.to_string();
    let message = message.to_string();
    let recipient = recipient.to_string();
    let subject = subject.to_string();
    let status = status.to_string();

    spawn_local(async move {
        if let Err(e) = ensure_notifications_table(&db).await {
            console_log!("[NOTIFICATION] ensure table err: {}", e);
            return;
        }
        if let Err(e) = db
            .execute(
                "INSERT INTO notifications (id, user_id, notification_type, title, message, recipient, subject, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
                &[
                    serde_json::json!(id),
                    serde_json::json!(user_id),
                    serde_json::json!(notification_type),
                    serde_json::json!(title),
                    serde_json::json!(message),
                    serde_json::json!(recipient),
                    serde_json::json!(subject),
                    serde_json::json!(status),
                ],
            )
            .await
        {
            console_log!("[NOTIFICATION] insert err: {}", e);
        }
    });
}

/// Convenience: create a notification synchronously (awaitable).
pub async fn create_notification(
    env: &Env,
    user_id: &str,
    notification_type: &str,
    title: &str,
    message: &str,
    recipient: &str,
    subject: &str,
    status: &str,
) -> Result<()> {
    let db = get_db(env)?;
    ensure_notifications_table(&db).await?;

    let id = utils::generate_id();
    db.execute(
        "INSERT INTO notifications (id, user_id, notification_type, title, message, recipient, subject, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        &[
            serde_json::json!(id),
            serde_json::json!(user_id),
            serde_json::json!(notification_type),
            serde_json::json!(title),
            serde_json::json!(message),
            serde_json::json!(recipient),
            serde_json::json!(subject),
            serde_json::json!(status),
        ],
    ).await?;

    Ok(())
}

// ────────────────────────────────────────────────────────
//  Email sending (unchanged)
// ────────────────────────────────────────────────────────

/// Send an email notification via Resend API (utility for internal use)
pub async fn send_email_via_resend(
    env: &Env,
    to: &str,
    subject: &str,
    html_body: &str,
) -> Result<()> {
    let api_key = utils::get_secret(env, "RESEND_API_KEY");
    if api_key.is_empty() {
        return Err(Error::RustError(format!(
            "RESEND_API_KEY not set, unable to send email to {}",
            to
        )));
    }

    let from_email = env
        .var("FROM_EMAIL")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "noreply@invoicequ.my.id".into());

    send_email_via_resend_with_config(&api_key, &from_email, to, subject, html_body).await
}

pub fn queue_email_via_resend(env: &Env, to: &str, subject: &str, html_body: &str) {
    let api_key = utils::get_secret(env, "RESEND_API_KEY");
    if api_key.is_empty() {
        console_log!(
            "[EMAIL] RESEND_API_KEY not set, unable to queue email to {}",
            to
        );
        return;
    }

    let from_email = env
        .var("FROM_EMAIL")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "noreply@invoicequ.my.id".into());

    let to = to.to_string();
    let subject = subject.to_string();
    let html_body = html_body.to_string();

    spawn_local(async move {
        if let Err(err) =
            send_email_via_resend_with_config(&api_key, &from_email, &to, &subject, &html_body)
                .await
        {
            console_log!(
                "[EMAIL] Background send failed for {} ({}): {}",
                to,
                subject,
                err
            );
        }
    });
}

async fn send_email_via_resend_with_config(
    api_key: &str,
    from_email: &str,
    to: &str,
    subject: &str,
    html_body: &str,
) -> Result<()> {
    let body = serde_json::json!({
        "from": from_email,
        "to": [to],
        "subject": subject,
        "html": html_body,
    });

    let mut headers = Headers::new();
    headers.set("Authorization", &format!("Bearer {}", api_key))?;
    headers.set("Content-Type", "application/json")?;

    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_headers(headers);
    init.with_body(Some(wasm_bindgen::JsValue::from_str(
        &serde_json::to_string(&body).unwrap(),
    )));

    let request = Request::new_with_init("https://api.resend.com/emails", &init)?;
    let mut resp = Fetch::Request(request).send().await?;

    if resp.status_code() >= 400 {
        let body = resp.text().await.unwrap_or_default();
        return Err(Error::RustError(format!(
            "Resend API error ({}): {}",
            resp.status_code(),
            body
        )));
    }

    Ok(())
}
