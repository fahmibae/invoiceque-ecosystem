//! Notification service — stubs + Resend email via reqwest.

use crate::error::AppError;
use crate::middleware::Auth;
use crate::utils;
use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub notification_type: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub message: String,
    #[serde(default)]
    pub is_read: bool,
    pub created_at: Option<String>,
}

pub async fn list_notifications(_auth: Auth) -> Result<HttpResponse, AppError> {
    utils::json_response(
        &serde_json::json!({"data": Vec::<Notification>::new(), "total": 0}),
        200,
    )
}

pub async fn mark_as_read(_path: web::Path<String>, _auth: Auth) -> Result<HttpResponse, AppError> {
    utils::json_response(
        &serde_json::json!({"message": "Notification marked as read"}),
        200,
    )
}

pub async fn send_email_via_resend(
    http: &reqwest::Client,
    to: &str,
    subject: &str,
    html_body: &str,
) -> Result<(), AppError> {
    let api_key = utils::get_env("RESEND_API_KEY");
    if api_key.is_empty() {
        return Err(AppError(format!(
            "RESEND_API_KEY not set, unable to send email to {}",
            to
        )));
    }
    let from_email = utils::get_env("FROM_EMAIL");
    let from = if from_email.is_empty() {
        "noreply@invoicequ.my.id".to_string()
    } else {
        from_email
    };
    let body = serde_json::json!({"from": from, "to": [to], "subject": subject, "html": html_body});
    let resp = http
        .post("https://api.resend.com/emails")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body)
        .send()
        .await;

    let resp = resp?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError(format!("Resend API error ({}): {}", status, body)));
    }

    Ok(())
}
