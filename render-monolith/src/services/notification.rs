//! Notification service — stubs + Resend email via reqwest.

use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use crate::error::AppError;
use crate::middleware::Auth;
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

pub async fn list_notifications(_auth: Auth) -> Result<HttpResponse, AppError> {
    utils::json_response(&serde_json::json!({"data": Vec::<Notification>::new(), "total": 0}), 200)
}

pub async fn mark_as_read(_path: web::Path<String>, _auth: Auth) -> Result<HttpResponse, AppError> {
    utils::json_response(&serde_json::json!({"message": "Notification marked as read"}), 200)
}

pub async fn send_email_via_resend(http: &reqwest::Client, to: &str, subject: &str, html_body: &str) {
    let api_key = utils::get_env("RESEND_API_KEY");
    if api_key.is_empty() {
        log::info!("[NOTIFICATION] RESEND_API_KEY not set, skipping email to {}", to);
        return;
    }
    let from_email = utils::get_env("FROM_EMAIL");
    let from = if from_email.is_empty() { "noreply@invoicequ.my.id".to_string() } else { from_email };
    let body = serde_json::json!({"from": from, "to": [to], "subject": subject, "html": html_body});
    let resp = http.post("https://api.resend.com/emails")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body)
        .send().await;
    if let Err(e) = resp { log::error!("[NOTIFICATION] Resend error: {}", e); }
}
