use reqwest::Client;
use crate::models::paypal_account::{
    PaypalTokenResponse, PaypalCreateOrderPayload, PaypalOrderResponse,
    PaypalCaptureResponse, PaypalPurchaseUnit, PaypalAmount,
    PaypalApplicationContext, PaypalPayee,
};

pub struct PaypalClient {
    client: Client,
    base_url: String,
    client_id: String,
    client_secret: String,
}

impl PaypalClient {
    pub fn new(base_url: String, client_id: String, client_secret: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
            client_id,
            client_secret,
        }
    }

    /// Check if PayPal is configured on the platform
    pub fn is_configured(&self) -> bool {
        !self.client_id.is_empty() && !self.client_secret.is_empty()
    }

    /// Get an OAuth2 access token using platform credentials
    async fn get_access_token(&self) -> Result<String, Box<dyn std::error::Error>> {
        let resp = self.client
            .post(format!("{}/v1/oauth2/token", self.base_url))
            .basic_auth(&self.client_id, Some(&self.client_secret))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body("grant_type=client_credentials")
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("PayPal token request failed ({}): {}", status, body).into());
        }

        let token_resp: PaypalTokenResponse = resp.json().await?;
        Ok(token_resp.access_token)
    }

    /// Create a PayPal order — payment goes to `payee_email` (user's PayPal email)
    pub async fn create_order(
        &self,
        external_id: &str,
        amount: f64,
        currency: &str,
        description: &str,
        payee_email: &str,
        return_url: Option<&str>,
        cancel_url: Option<&str>,
    ) -> Result<PaypalOrderResponse, Box<dyn std::error::Error>> {
        let access_token = self.get_access_token().await?;

        let payload = PaypalCreateOrderPayload {
            intent: "CAPTURE".to_string(),
            purchase_units: vec![PaypalPurchaseUnit {
                reference_id: external_id.to_string(),
                description: description.to_string(),
                amount: PaypalAmount {
                    currency_code: currency.to_string(),
                    value: format!("{:.2}", amount),
                },
                payee: Some(PaypalPayee {
                    email_address: payee_email.to_string(),
                }),
            }],
            application_context: Some(PaypalApplicationContext {
                return_url: return_url.map(|s| s.to_string()),
                cancel_url: cancel_url.map(|s| s.to_string()),
                brand_name: "InvoiceQue".to_string(),
                user_action: "PAY_NOW".to_string(),
            }),
        };

        let resp = self.client
            .post(format!("{}/v2/checkout/orders", self.base_url))
            .bearer_auth(&access_token)
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("PayPal create order failed ({}): {}", status, body).into());
        }

        let order: PaypalOrderResponse = resp.json().await?;
        Ok(order)
    }

    /// Capture a previously approved PayPal order
    pub async fn capture_order(
        &self,
        order_id: &str,
    ) -> Result<PaypalCaptureResponse, Box<dyn std::error::Error>> {
        let access_token = self.get_access_token().await?;

        let resp = self.client
            .post(format!("{}/v2/checkout/orders/{}/capture", self.base_url, order_id))
            .bearer_auth(&access_token)
            .header("Content-Type", "application/json")
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("PayPal capture order failed ({}): {}", status, body).into());
        }

        let capture: PaypalCaptureResponse = resp.json().await?;
        Ok(capture)
    }

    /// Get order details
    pub async fn get_order(
        &self,
        order_id: &str,
    ) -> Result<PaypalOrderResponse, Box<dyn std::error::Error>> {
        let access_token = self.get_access_token().await?;

        let resp = self.client
            .get(format!("{}/v2/checkout/orders/{}", self.base_url, order_id))
            .bearer_auth(&access_token)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(format!("PayPal get order failed ({}): {}", status, body).into());
        }

        let order: PaypalOrderResponse = resp.json().await?;
        Ok(order)
    }
}
