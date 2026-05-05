mod config;
mod db;
mod models;
mod repository;
mod routes;
mod messaging;
mod services;

use actix_web::{web, App, HttpServer, HttpResponse, middleware::Logger};
use std::sync::Arc;

use crate::config::Config;
use crate::messaging::publisher::EventPublisher;
use crate::services::xendit::XenditClient;
use crate::services::paypal::PaypalClient;

/// Newtype wrapper for base payment URL to avoid app_data type collision
pub struct BasePaymentUrl(pub String);

/// Newtype wrapper for Xendit callback token to avoid app_data type collision
pub struct XenditCallbackToken(pub String);

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    let cfg = Config::from_env();

    // Connect to database with retry
    let pool = loop {
        match db::init_pool(&cfg.database_url).await {
            Ok(pool) => break pool,
            Err(e) => {
                log::warn!("[PAYMENT] Waiting for database... {}", e);
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            }
        }
    };

    let publisher = Arc::new(EventPublisher::new(
        cfg.notification_service_url.clone(),
        cfg.invoice_service_url.clone(),
    ));
    let base_url = Arc::new(BasePaymentUrl(cfg.base_payment_url.clone()));

    // Initialize Xendit client
    let xendit_client = Arc::new(XenditClient::new(
        cfg.xendit_api_key.clone(),
        cfg.xendit_base_url.clone(),
    ));
    let xendit_callback_token = Arc::new(XenditCallbackToken(cfg.xendit_callback_token.clone()));

    // Initialize PayPal client (platform credentials, payments routed to user's email)
    let paypal_client = Arc::new(PaypalClient::new(
        cfg.paypal_base_url.clone(),
        cfg.paypal_client_id.clone(),
        cfg.paypal_secret.clone(),
    ));
    if paypal_client.is_configured() {
        log::info!("[PAYMENT] PayPal gateway configured ✓");
    } else {
        log::warn!("[PAYMENT] PayPal not configured — set PAYPAL_CLIENT_ID and PAYPAL_SECRET");
    }

    let port = cfg.port;

    log::info!("[PAYMENT] Starting Payment Service on :{}", port);

    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(publisher.clone()))
            .app_data(web::Data::new(base_url.clone()))
            .app_data(web::Data::new(xendit_client.clone()))
            .app_data(web::Data::new(xendit_callback_token.clone()))
            .app_data(web::Data::new(paypal_client.clone()))
            // Health check
            .route("/health", web::get().to(|| async {
                HttpResponse::Ok().json(serde_json::json!({
                    "status": "healthy",
                    "service": "payment-service"
                }))
            }))
            // Payment link CRUD
            .route("/payments", web::get().to(routes::payment_link::list))
            .route("/payments", web::post().to(routes::payment_link::create))
            // NOTE: specific sub-paths MUST come before the {id} wildcard
            .route("/payments/bulk-delete", web::post().to(routes::payment_link::bulk_delete))
            .route("/payments/by-invoice/{invoice_id}", web::delete().to(routes::payment_link::delete_by_invoice))
            .route("/payments/by-invoices", web::post().to(routes::payment_link::delete_by_invoices))
            .route("/payments/{id}", web::get().to(routes::payment_link::get))
            .route("/payments/{id}", web::put().to(routes::payment_link::update))
            .route("/payments/{id}", web::delete().to(routes::payment_link::delete))
            // Public payment page + checkout
            .route("/pay/{id}", web::get().to(routes::payment_link::get_public))
            .route("/pay-checkout/{id}", web::post().to(routes::payment_link::checkout))
            .route("/pay-capture/{id}", web::post().to(routes::payment_link::capture_public))
            .route("/pay-status/{id}", web::get().to(routes::payment_link::check_status_public))
            // Xendit sub-account management
            .route("/payments/xendit/setup", web::post().to(routes::xendit_account::setup))
            .route("/payments/xendit/account", web::get().to(routes::xendit_account::get_account))
            // PayPal per-user account management
            .route("/payments/paypal/setup", web::post().to(routes::paypal_account::setup))
            .route("/payments/paypal/account", web::get().to(routes::paypal_account::get_account))
            .route("/payments/paypal/account", web::delete().to(routes::paypal_account::delete_account))
            .route("/payments/paypal/capture/{order_id}", web::post().to(routes::paypal_account::capture_order))
            // Webhook
            .route("/payments/webhook", web::post().to(routes::webhook::handle_webhook))
            .route("/payments/webhook/paypal", web::post().to(routes::webhook::handle_paypal_webhook))
    })
    .bind(format!("0.0.0.0:{}", port))?
    .run()
    .await
}
