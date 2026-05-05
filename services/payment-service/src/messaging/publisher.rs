use serde_json;
use std::collections::HashMap;
use reqwest::Client;

pub struct EventPublisher {
    client: Client,
    notification_service_url: String,
    invoice_service_url: String,
}

impl EventPublisher {
    pub fn new(notification_url: String, invoice_url: String) -> Self {
        Self {
            client: Client::new(),
            notification_service_url: notification_url,
            invoice_service_url: invoice_url,
        }
    }

    pub async fn publish_payment_completed(
        &self,
        user_id: &str,
        payment_id: &str,
        invoice_id: Option<&str>,
        amount: f64,
        client_name: &str,
        client_email: &str,
        payment_title: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut event: HashMap<String, serde_json::Value> = HashMap::new();
        event.insert("event_type".to_string(), serde_json::Value::String("payment.completed".to_string()));
        event.insert("user_id".to_string(), serde_json::Value::String(user_id.to_string()));
        event.insert("payment_id".to_string(), serde_json::Value::String(payment_id.to_string()));
        event.insert("invoice_id".to_string(), serde_json::Value::String(invoice_id.unwrap_or("").to_string()));
        event.insert("amount".to_string(), serde_json::json!(amount));
        event.insert("client_name".to_string(), serde_json::Value::String(client_name.to_string()));
        event.insert("client_email".to_string(), serde_json::Value::String(client_email.to_string()));
        event.insert("payment_title".to_string(), serde_json::Value::String(payment_title.to_string()));

        let payload = serde_json::to_vec(&event)?;

        // Send to Notification Service
        let notif_url = format!("{}/events/payment", self.notification_service_url);
        match self.client.post(&notif_url)
            .header("Content-Type", "application/json")
            .body(payload.clone())
            .send().await {
            Ok(res) if res.status().is_success() => {
                log::info!("[PAYMENT] Published payment.completed to notification-service");
            }
            Ok(res) => {
                log::warn!("[PAYMENT] notification-service returned error: {}", res.status());
            }
            Err(e) => {
                log::error!("[PAYMENT] Failed to publish to notification-service: {}", e);
            }
        }

        // Send to Invoice Service if invoice_id is present
        if let Some(inv_id) = invoice_id {
            if !inv_id.is_empty() {
                let inv_url = format!("{}/events/payment", self.invoice_service_url);
                match self.client.post(&inv_url)
                    .header("Content-Type", "application/json")
                    .body(payload)
                    .send().await {
                    Ok(res) if res.status().is_success() => {
                        log::info!("[PAYMENT] Published payment.completed to invoice-service");
                    }
                    Ok(res) => {
                        log::warn!("[PAYMENT] invoice-service returned error: {}", res.status());
                    }
                    Err(e) => {
                        log::error!("[PAYMENT] Failed to publish to invoice-service: {}", e);
                    }
                }
            }
        }

        Ok(())
    }

    pub async fn publish_payment_failed(
        &self,
        user_id: &str,
        payment_id: &str,
        amount: f64,
        client_name: &str,
        client_email: &str,
        payment_title: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut event: HashMap<String, serde_json::Value> = HashMap::new();
        event.insert("event_type".to_string(), serde_json::Value::String("payment.failed".to_string()));
        event.insert("user_id".to_string(), serde_json::Value::String(user_id.to_string()));
        event.insert("payment_id".to_string(), serde_json::Value::String(payment_id.to_string()));
        event.insert("amount".to_string(), serde_json::json!(amount));
        event.insert("client_name".to_string(), serde_json::Value::String(client_name.to_string()));
        event.insert("client_email".to_string(), serde_json::Value::String(client_email.to_string()));
        event.insert("payment_title".to_string(), serde_json::Value::String(payment_title.to_string()));

        let payload = serde_json::to_vec(&event)?;
        let notif_url = format!("{}/events/payment", self.notification_service_url);
        
        match self.client.post(&notif_url)
            .header("Content-Type", "application/json")
            .body(payload)
            .send().await {
            Ok(res) if res.status().is_success() => {
                log::info!("[PAYMENT] Published payment.failed event for payment {}", payment_id);
            }
            Ok(res) => {
                log::warn!("[PAYMENT] notification-service returned error for failed event: {}", res.status());
            }
            Err(e) => {
                log::error!("[PAYMENT] Failed to publish failed event to notification-service: {}", e);
            }
        }

        Ok(())
    }

    pub async fn publish_paymentlink_created(
        &self,
        user_id: &str,
        payment_link_id: &str,
        title: &str,
        description: &str,
        amount: f64,
        currency: &str,
        payment_url: &str,
        invoice_id: Option<&str>,
        client_name: Option<&str>,
        client_email: Option<&str>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut event: HashMap<String, serde_json::Value> = HashMap::new();
        event.insert("event_type".to_string(), serde_json::Value::String("paymentlink.created".to_string()));
        event.insert("user_id".to_string(), serde_json::Value::String(user_id.to_string()));
        event.insert("payment_link_id".to_string(), serde_json::Value::String(payment_link_id.to_string()));
        event.insert("title".to_string(), serde_json::Value::String(title.to_string()));
        event.insert("description".to_string(), serde_json::Value::String(description.to_string()));
        event.insert("amount".to_string(), serde_json::json!(amount));
        event.insert("currency".to_string(), serde_json::Value::String(currency.to_string()));
        event.insert("payment_url".to_string(), serde_json::Value::String(payment_url.to_string()));
        event.insert("invoice_id".to_string(), serde_json::Value::String(invoice_id.unwrap_or("").to_string()));
        event.insert("client_name".to_string(), serde_json::Value::String(client_name.unwrap_or("").to_string()));
        event.insert("client_email".to_string(), serde_json::Value::String(client_email.unwrap_or("").to_string()));

        let payload = serde_json::to_vec(&event)?;
        let notif_url = format!("{}/events/paymentlink", self.notification_service_url);
        
        match self.client.post(&notif_url)
            .header("Content-Type", "application/json")
            .body(payload)
            .send().await {
            Ok(res) if res.status().is_success() => {
                log::info!("[PAYMENT] Published paymentlink.created event for link {}", payment_link_id);
            }
            Ok(res) => {
                log::warn!("[PAYMENT] notification-service returned error for paymentlink: {}", res.status());
            }
            Err(e) => {
                log::error!("[PAYMENT] Failed to publish paymentlink to notification-service: {}", e);
            }
        }

        Ok(())
    }
}
