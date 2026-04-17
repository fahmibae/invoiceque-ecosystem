use reqwest::Client;
use crate::models::xendit_account::{
    XenditCreateAccountPayload, XenditCreateAccountResponse,
    XenditCreateInvoicePayload, XenditCreateInvoiceResponse,
    XenditPublicProfile,
};

pub struct XenditClient {
    client: Client,
    api_key: String,
    base_url: String,
}

impl XenditClient {
    pub fn new(api_key: String, base_url: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url,
        }
    }

    /// Create a MANAGED sub-account for a tenant
    pub async fn create_sub_account(
        &self,
        email: &str,
        business_name: &str,
    ) -> Result<XenditCreateAccountResponse, Box<dyn std::error::Error>> {
        let payload = XenditCreateAccountPayload {
            email: email.to_string(),
            account_type: "MANAGED".to_string(),
            public_profile: XenditPublicProfile {
                business_name: business_name.to_string(),
            },
        };

        let resp = self.client
            .post(format!("{}/v2/accounts", self.base_url))
            .basic_auth(&self.api_key, Some(""))
            .json(&payload)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Xendit create account failed ({}): {}", status, body).into());
        }

        let account: XenditCreateAccountResponse = resp.json().await?;
        Ok(account)
    }

    /// Create an invoice on behalf of a sub-account (for-user-id header)
    pub async fn create_invoice(
        &self,
        xendit_user_id: &str,
        payload: &XenditCreateInvoicePayload,
    ) -> Result<XenditCreateInvoiceResponse, Box<dyn std::error::Error>> {
        let resp = self.client
            .post(format!("{}/v2/invoices", self.base_url))
            .basic_auth(&self.api_key, Some(""))
            .header("for-user-id", xendit_user_id)
            .json(payload)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("Xendit create invoice failed ({}): {}", status, body).into());
        }

        let invoice: XenditCreateInvoiceResponse = resp.json().await?;
        Ok(invoice)
    }

    /// Verify webhook callback token
    pub fn verify_callback_token(incoming_token: &str, expected_token: &str) -> bool {
        incoming_token == expected_token
    }
}
