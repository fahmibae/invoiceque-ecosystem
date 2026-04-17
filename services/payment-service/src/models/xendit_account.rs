use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct XenditAccount {
    pub id: String,
    pub user_id: String,
    pub xendit_user_id: String,
    pub account_email: String,
    pub business_name: String,
    pub status: String,
    pub account_type: String,
    pub platform_fee_percent: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateXenditAccountRequest {
    pub account_email: String,
    pub business_name: String,
}

#[derive(Debug, Serialize)]
pub struct XenditAccountResponse {
    pub id: String,
    pub xendit_user_id: String,
    pub account_email: String,
    pub business_name: String,
    pub status: String,
    pub platform_fee_percent: f64,
}

impl From<XenditAccount> for XenditAccountResponse {
    fn from(account: XenditAccount) -> Self {
        Self {
            id: account.id,
            xendit_user_id: account.xendit_user_id,
            account_email: account.account_email,
            business_name: account.business_name,
            status: account.status,
            platform_fee_percent: account.platform_fee_percent,
        }
    }
}

// Xendit API types
#[derive(Debug, Serialize)]
pub struct XenditCreateAccountPayload {
    pub email: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub public_profile: XenditPublicProfile,
}

#[derive(Debug, Serialize)]
pub struct XenditPublicProfile {
    pub business_name: String,
}

#[derive(Debug, Deserialize)]
pub struct XenditCreateAccountResponse {
    pub id: String,
    pub email: String,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct XenditCreateInvoicePayload {
    pub external_id: String,
    pub amount: f64,
    pub description: String,
    pub currency: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customer: Option<XenditCustomer>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub success_redirect_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure_redirect_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub invoice_duration: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct XenditCustomer {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub given_names: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mobile_number: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct XenditCreateInvoiceResponse {
    pub id: String,
    pub invoice_url: String,
    pub external_id: String,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct XenditWebhookPayload {
    pub id: String,
    pub external_id: String,
    pub status: String,
    pub amount: f64,
    #[serde(default)]
    pub user_id: Option<String>,
    #[serde(default)]
    pub payer_email: Option<String>,
    #[serde(default)]
    pub payment_method: Option<String>,
    #[serde(default)]
    pub payment_channel: Option<String>,
}
