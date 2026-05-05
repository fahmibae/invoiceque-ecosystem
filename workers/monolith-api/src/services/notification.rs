//! Notification service module — event-driven email notifications.
//! Mirrors: services/notification-service (Go)
//! Note: In the monolith, notifications are triggered internally (direct function calls)
//! instead of HTTP inter-service calls. Email sending uses Resend API or SMTP via HTTP.

use serde::{Deserialize, Serialize};
use worker::*;
use crate::utils;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: String,
    #[serde(default)] pub user_id: String,
    #[serde(default)] pub notification_type: String,
    #[serde(default)] pub title: String,
    #[serde(default)] pub message: String,
    #[serde(default)] pub is_read: bool,
    pub created_at: Option<String>,
}

/// Handle POST /events/invoice — process invoice notification events
pub async fn handle_invoice_event(mut req: Request, _env: &Env) -> Result<Response> {
    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let event_type = body.get("event_type").and_then(|v| v.as_str()).unwrap_or("");

    console_log!("[NOTIFICATION] Invoice event received: {}", event_type);

    // In a full implementation, this would send emails via Resend API
    // For now, log the event and return success
    utils::json_response(&serde_json::json!({"status": "processed", "event_type": event_type}), 200)
}

/// Handle POST /events/payment — process payment notification events
pub async fn handle_payment_event(mut req: Request, _env: &Env) -> Result<Response> {
    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let event_type = body.get("event_type").and_then(|v| v.as_str()).unwrap_or("");

    console_log!("[NOTIFICATION] Payment event received: {}", event_type);
    utils::json_response(&serde_json::json!({"status": "processed", "event_type": event_type}), 200)
}

/// Handle POST /events/paymentlink — process payment link notification events
pub async fn handle_payment_link_event(mut req: Request, _env: &Env) -> Result<Response> {
    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let event_type = body.get("event_type").and_then(|v| v.as_str()).unwrap_or("");

    console_log!("[NOTIFICATION] PaymentLink event received: {}", event_type);
    utils::json_response(&serde_json::json!({"status": "processed", "event_type": event_type}), 200)
}

/// Handle POST /events/subscription — process subscription notification events
pub async fn handle_subscription_event(mut req: Request, _env: &Env) -> Result<Response> {
    let body: serde_json::Value = req.json().await.unwrap_or(serde_json::json!({}));
    let event_type = body.get("event_type").and_then(|v| v.as_str()).unwrap_or("");

    console_log!("[NOTIFICATION] Subscription event received: {}", event_type);
    utils::json_response(&serde_json::json!({"status": "processed", "event_type": event_type}), 200)
}

/// GET /notifications — list notifications for a user (stub, no DB for notification in monolith)
pub async fn list_notifications(req: &Request, _env: &Env, claims: &crate::middleware::JwtClaims) -> Result<Response> {
    // Notification service originally had optional DB persistence
    // Return empty list for now — can be enhanced with D1 or Neon DB later
    utils::json_response(&serde_json::json!({
        "data": Vec::<Notification>::new(),
        "total": 0,
    }), 200)
}

/// PUT /notifications/:id/read — mark notification as read (stub)
pub async fn mark_as_read(_env: &Env, _claims: &crate::middleware::JwtClaims, _id: &str) -> Result<Response> {
    utils::json_response(&serde_json::json!({"message": "Notification marked as read"}), 200)
}

/// Send an email notification via Resend API (utility for internal use)
pub async fn send_email_via_resend(
    env: &Env,
    to: &str,
    subject: &str,
    html_body: &str,
) -> Result<()> {
    let api_key = utils::get_secret(env, "RESEND_API_KEY");
    if api_key.is_empty() {
        console_log!("[NOTIFICATION] RESEND_API_KEY not set, skipping email to {}", to);
        return Ok(());
    }

    let from_email = env.var("FROM_EMAIL").map(|v| v.to_string()).unwrap_or_else(|_| "noreply@invoicequ.my.id".into());

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
    init.with_body(Some(wasm_bindgen::JsValue::from_str(&serde_json::to_string(&body).unwrap())));

    let request = Request::new_with_init("https://api.resend.com/emails", &init)?;
    let resp = Fetch::Request(request).send().await?;

    if resp.status_code() >= 400 {
        console_log!("[NOTIFICATION] Resend API error: {}", resp.status_code());
    }

    Ok(())
}
