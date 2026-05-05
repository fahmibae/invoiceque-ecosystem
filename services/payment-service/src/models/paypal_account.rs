use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

/// User's PayPal connection — only requires their PayPal email
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PaypalAccount {
    pub id: String,
    pub user_id: String,
    pub paypal_email: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ConnectPaypalRequest {
    pub paypal_email: String,
}

#[derive(Debug, Serialize)]
pub struct PaypalAccountResponse {
    pub id: String,
    pub paypal_email: String,
    pub status: String,
}

impl From<PaypalAccount> for PaypalAccountResponse {
    fn from(account: PaypalAccount) -> Self {
        Self {
            id: account.id,
            paypal_email: account.paypal_email,
            status: account.status,
        }
    }
}

// ── PayPal REST API types ─────────────────────────────

#[derive(Debug, Serialize)]
pub struct PaypalCreateOrderPayload {
    pub intent: String,
    pub purchase_units: Vec<PaypalPurchaseUnit>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub application_context: Option<PaypalApplicationContext>,
}

#[derive(Debug, Serialize)]
pub struct PaypalPurchaseUnit {
    pub reference_id: String,
    pub description: String,
    pub amount: PaypalAmount,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payee: Option<PaypalPayee>,
}

#[derive(Debug, Serialize)]
pub struct PaypalAmount {
    pub currency_code: String,
    pub value: String,
}

/// Routes payment to a specific PayPal email (the user's)
#[derive(Debug, Serialize)]
pub struct PaypalPayee {
    pub email_address: String,
}

#[derive(Debug, Serialize)]
pub struct PaypalApplicationContext {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub return_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cancel_url: Option<String>,
    pub brand_name: String,
    pub user_action: String,
}

#[derive(Debug, Deserialize)]
pub struct PaypalTokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: i64,
}

#[derive(Debug, Deserialize)]
pub struct PaypalOrderResponse {
    pub id: String,
    pub status: String,
    #[serde(default)]
    pub links: Vec<PaypalLink>,
}

#[derive(Debug, Deserialize)]
pub struct PaypalLink {
    pub href: String,
    pub rel: String,
    #[serde(default)]
    pub method: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PaypalCaptureResponse {
    pub id: String,
    pub status: String,
    #[serde(default)]
    pub purchase_units: Vec<PaypalCapturedPurchaseUnit>,
}

#[derive(Debug, Deserialize)]
pub struct PaypalCapturedPurchaseUnit {
    pub reference_id: Option<String>,
    #[serde(default)]
    pub payments: Option<PaypalPayments>,
}

#[derive(Debug, Deserialize)]
pub struct PaypalPayments {
    #[serde(default)]
    pub captures: Vec<PaypalCapture>,
}

#[derive(Debug, Deserialize)]
pub struct PaypalCapture {
    pub id: String,
    pub status: String,
    pub amount: Option<PaypalCapturedAmount>,
}

#[derive(Debug, Deserialize)]
pub struct PaypalCapturedAmount {
    pub currency_code: String,
    pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct PaypalWebhookEvent {
    pub id: String,
    pub event_type: String,
    pub resource: serde_json::Value,
}
