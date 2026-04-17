use lapin::{Channel, BasicProperties, options::BasicPublishOptions};
use serde_json;
use std::collections::HashMap;

pub struct EventPublisher {
    channel: Channel,
}

impl EventPublisher {
    pub fn new(channel: Channel) -> Self {
        Self { channel }
    }

    pub async fn publish_payment_completed(
        &self,
        payment_id: &str,
        invoice_id: Option<&str>,
        amount: f64,
        client_name: &str,
        client_email: &str,
        payment_title: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut event: HashMap<String, serde_json::Value> = HashMap::new();
        event.insert("event_type".to_string(), serde_json::Value::String("payment.completed".to_string()));
        event.insert("payment_id".to_string(), serde_json::Value::String(payment_id.to_string()));
        event.insert("invoice_id".to_string(), serde_json::Value::String(invoice_id.unwrap_or("").to_string()));
        event.insert("amount".to_string(), serde_json::json!(amount));
        event.insert("client_name".to_string(), serde_json::Value::String(client_name.to_string()));
        event.insert("client_email".to_string(), serde_json::Value::String(client_email.to_string()));
        event.insert("payment_title".to_string(), serde_json::Value::String(payment_title.to_string()));

        let payload = serde_json::to_vec(&event)?;

        self.channel
            .basic_publish(
                "invoiceque.events",
                "payment.completed",
                BasicPublishOptions::default(),
                &payload,
                BasicProperties::default()
                    .with_content_type("application/json".into()),
            )
            .await?
            .await?;

        log::info!("[PAYMENT] Published payment.completed event for payment {}", payment_id);
        Ok(())
    }

    pub async fn publish_payment_failed(
        &self,
        payment_id: &str,
        amount: f64,
        client_name: &str,
        client_email: &str,
        payment_title: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut event: HashMap<String, serde_json::Value> = HashMap::new();
        event.insert("event_type".to_string(), serde_json::Value::String("payment.failed".to_string()));
        event.insert("payment_id".to_string(), serde_json::Value::String(payment_id.to_string()));
        event.insert("amount".to_string(), serde_json::json!(amount));
        event.insert("client_name".to_string(), serde_json::Value::String(client_name.to_string()));
        event.insert("client_email".to_string(), serde_json::Value::String(client_email.to_string()));
        event.insert("payment_title".to_string(), serde_json::Value::String(payment_title.to_string()));

        let payload = serde_json::to_vec(&event)?;

        self.channel
            .basic_publish(
                "invoiceque.events",
                "payment.failed",
                BasicPublishOptions::default(),
                &payload,
                BasicProperties::default()
                    .with_content_type("application/json".into()),
            )
            .await?
            .await?;

        log::info!("[PAYMENT] Published payment.failed event for payment {}", payment_id);
        Ok(())
    }
}
