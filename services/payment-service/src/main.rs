mod config;
mod db;
mod models;
mod repository;
mod routes;
mod messaging;
mod services;

use actix_web::{web, App, HttpServer, HttpResponse, middleware::Logger};
use lapin::Connection;
use lapin::ConnectionProperties;
use std::sync::Arc;

use crate::config::Config;
use crate::messaging::publisher::EventPublisher;
use crate::services::xendit::XenditClient;

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

    // Connect to RabbitMQ with retry
    let rmq_conn = loop {
        match Connection::connect(&cfg.rabbitmq_url, ConnectionProperties::default()).await {
            Ok(conn) => {
                log::info!("[PAYMENT] Connected to RabbitMQ");
                break conn;
            }
            Err(e) => {
                log::warn!("[PAYMENT] Waiting for RabbitMQ... {}", e);
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            }
        }
    };

    let channel = rmq_conn.create_channel().await
        .expect("Failed to create RabbitMQ channel");
    let publisher = Arc::new(EventPublisher::new(channel));
    let base_url = Arc::new(cfg.base_payment_url.clone());

    // Initialize Xendit client
    let xendit_client = Arc::new(XenditClient::new(
        cfg.xendit_api_key.clone(),
        cfg.xendit_base_url.clone(),
    ));
    let xendit_callback_token = Arc::new(cfg.xendit_callback_token.clone());

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
            .route("/payments/{id}", web::get().to(routes::payment_link::get))
            .route("/payments/{id}", web::put().to(routes::payment_link::update))
            .route("/payments/{id}", web::delete().to(routes::payment_link::delete))
            // Public payment page
            .route("/pay/{id}", web::get().to(routes::payment_link::get_public))
            // Xendit sub-account management
            .route("/payments/xendit/setup", web::post().to(routes::xendit_account::setup))
            .route("/payments/xendit/account", web::get().to(routes::xendit_account::get_account))
            // Webhook
            .route("/payments/webhook", web::post().to(routes::webhook::handle_webhook))
    })
    .bind(format!("0.0.0.0:{}", port))?
    .run()
    .await
}
