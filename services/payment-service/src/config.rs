use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub rabbitmq_url: String,
    pub port: u16,
    pub base_payment_url: String,
    pub xendit_api_key: String,
    pub xendit_callback_token: String,
    pub xendit_base_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://postgres:postgres123@localhost:5432/payment_db".to_string()),
            rabbitmq_url: env::var("RABBITMQ_URL")
                .unwrap_or_else(|_| "amqp://invoiceque:invoiceque123@localhost:5672".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "8004".to_string())
                .parse()
                .unwrap_or(8004),
            base_payment_url: env::var("BASE_PAYMENT_URL")
                .unwrap_or_else(|_| "https://pay.invoiceque.id".to_string()),
            xendit_api_key: env::var("XENDIT_API_KEY")
                .unwrap_or_else(|_| "xnd_development_placeholder".to_string()),
            xendit_callback_token: env::var("XENDIT_CALLBACK_TOKEN")
                .unwrap_or_else(|_| "xendit-callback-token-placeholder".to_string()),
            xendit_base_url: env::var("XENDIT_BASE_URL")
                .unwrap_or_else(|_| "https://api.xendit.co".to_string()),
        }
    }
}
