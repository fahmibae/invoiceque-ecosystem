use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PaymentLink {
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub description: String,
    pub amount: f64,
    pub currency: String,
    pub status: String,
    pub url: String,
    pub clicks: i32,
    pub payments: i32,
    pub invoice_id: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePaymentLinkRequest {
    pub title: String,
    pub description: Option<String>,
    pub amount: f64,
    pub currency: Option<String>,
    pub invoice_id: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePaymentLinkRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub amount: Option<f64>,
    pub status: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PaymentLinkListResponse {
    pub data: Vec<PaymentLink>,
    pub total: i64,
    pub page: i32,
    pub per_page: i32,
    pub total_pages: i32,
}

#[derive(Debug, Deserialize)]
pub struct WebhookPayload {
    pub payment_id: String,
    pub status: String,
    pub amount: f64,
}
