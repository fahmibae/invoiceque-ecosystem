//! InvoiceQu Monolith — Actix-web server for Render deployment.
//! Port of the Cloudflare Worker monolith to a standard Rust HTTP server.

mod db;
mod error;
mod middleware;
mod utils;
mod services;

use actix_cors::Cors;
use actix_web::{web, App, HttpResponse, HttpServer};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    let port: u16 = std::env::var("PORT").ok()
        .and_then(|p| p.parse().ok()).unwrap_or(8080);
    let http_client = reqwest::Client::new();

    log::info!("🚀 InvoiceQu Monolith starting on port {}", port);

    HttpServer::new(move || {
        let allowed = std::env::var("ALLOWED_ORIGINS").unwrap_or_else(|_| "*".into());
        let origins: Vec<String> = allowed.split(',').map(|s| s.trim().to_string()).collect();

        let mut cors = Cors::default()
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
            .allowed_headers(vec!["Content-Type", "Authorization", "X-User-ID", "X-User-Email"])
            .supports_credentials()
            .max_age(86400);

        for origin in &origins {
            if origin == "*" {
                cors = Cors::permissive();
                break;
            }
            cors = cors.allowed_origin(origin);
        }

        App::new()
            .wrap(cors)
            .app_data(web::Data::new(http_client.clone()))
            .app_data(web::JsonConfig::default().limit(10 * 1024 * 1024))
            // ── Health ──
            .route("/health", web::get().to(health))
            .route("/api/v1/health", web::get().to(health))
            // ── Auth public ──
            .route("/api/v1/auth/register", web::post().to(services::auth::register))
            .route("/api/v1/auth/login", web::post().to(services::auth::login))
            .route("/api/v1/auth/google", web::post().to(services::auth::google_login))
            .route("/api/v1/auth/refresh", web::post().to(services::auth::refresh_token))
            // ── Auth protected ──
            .route("/api/v1/auth/profile", web::get().to(services::auth::profile))
            .route("/api/v1/auth/profile", web::put().to(services::auth::update_profile))
            .route("/api/v1/auth/password", web::put().to(services::auth::change_password))
            .route("/api/v1/auth/users", web::get().to(services::auth::list_users))
            .route("/api/v1/auth/users/{id}/role", web::put().to(services::auth::update_role))
            .route("/api/v1/auth/users/{id}", web::delete().to(services::auth::delete_user))
            // ── Internal ──
            .route("/api/v1/internal/users/{id}", web::get().to(services::auth::get_user_by_id))
            // ── Clients ──
            .route("/api/v1/clients", web::get().to(services::client::list))
            .route("/api/v1/clients", web::post().to(services::client::create))
            .route("/api/v1/clients/bulk-delete", web::post().to(services::client::bulk_delete))
            .route("/api/v1/clients/{id}", web::get().to(services::client::get))
            .route("/api/v1/clients/{id}", web::put().to(services::client::update))
            .route("/api/v1/clients/{id}", web::delete().to(services::client::delete))
            // ── Invoices ──
            .route("/api/v1/invoices", web::get().to(services::invoice::list))
            .route("/api/v1/invoices", web::post().to(services::invoice::create))
            .route("/api/v1/invoices/bulk-delete", web::post().to(services::invoice::bulk_delete))
            .route("/api/v1/invoices/linkable", web::get().to(services::invoice::list_linkable))
            .route("/api/v1/invoices/{id}", web::get().to(services::invoice::get))
            .route("/api/v1/invoices/{id}", web::put().to(services::invoice::update))
            .route("/api/v1/invoices/{id}", web::delete().to(services::invoice::delete))
            .route("/api/v1/invoices/{id}/send", web::put().to(services::invoice::send_invoice))
            // ── Dashboard ──
            .route("/api/v1/dashboard/stats", web::get().to(services::invoice::get_dashboard_stats))
            .route("/api/v1/dashboard/revenue-chart", web::get().to(services::invoice::get_revenue_chart))
            // ── Invoice Settings ──
            .route("/api/v1/invoice-settings", web::get().to(services::invoice::get_settings))
            .route("/api/v1/invoice-settings", web::put().to(services::invoice::update_settings))
            // ── Payment events ──
            .route("/api/v1/events/payment", web::post().to(services::invoice::handle_payment_event))
            // ── Payments ──
            .route("/api/v1/payments", web::get().to(services::payment::list))
            .route("/api/v1/payments", web::post().to(services::payment::create))
            .route("/api/v1/payments/bulk-delete", web::post().to(services::payment::bulk_delete))
            .route("/api/v1/payments/by-invoices", web::post().to(services::payment::delete_by_invoices))
            .route("/api/v1/payments/paypal/setup", web::post().to(services::payment::paypal_setup))
            .route("/api/v1/payments/paypal/account", web::get().to(services::payment::paypal_get_account))
            .route("/api/v1/payments/paypal/account", web::delete().to(services::payment::paypal_delete_account))
            .route("/api/v1/payments/paypal/capture/{order_id}", web::post().to(services::payment::paypal_capture_order))
            .route("/api/v1/payments/xendit/setup", web::post().to(services::payment::xendit_setup))
            .route("/api/v1/payments/xendit/account", web::get().to(services::payment::xendit_get_account))
            .route("/api/v1/payments/by-invoice/{invoice_id}", web::delete().to(services::payment::delete_by_invoice))
            .route("/api/v1/payments/{id}", web::get().to(services::payment::get))
            .route("/api/v1/payments/{id}", web::put().to(services::payment::update))
            .route("/api/v1/payments/{id}", web::delete().to(services::payment::delete))
            // ── Public payment ──
            .route("/api/v1/pay/{id}", web::get().to(services::payment::get_public))
            .route("/api/v1/pay-checkout/{id}", web::post().to(services::payment::checkout))
            .route("/api/v1/pay-capture/{id}", web::post().to(services::payment::capture_public))
            .route("/api/v1/pay-status/{id}", web::get().to(services::payment::check_status_public))
            // ── Webhooks ──
            .route("/api/v1/webhooks/payments", web::post().to(services::payment::handle_webhook))
            .route("/api/v1/webhooks/paypal", web::post().to(services::payment::handle_paypal_webhook))
            .route("/api/v1/webhooks/subscription", web::post().to(services::subscription::handle_webhook))
            // ── Notifications ──
            .route("/api/v1/notifications", web::get().to(services::notification::list_notifications))
            .route("/api/v1/notifications/{id}/read", web::put().to(services::notification::mark_as_read))
            // ── Subscriptions ──
            .route("/api/v1/plans", web::get().to(services::subscription::list_plans))
            .route("/api/v1/subscriptions/current", web::get().to(services::subscription::get_current))
            .route("/api/v1/subscriptions/usage", web::get().to(services::subscription::get_usage))
            .route("/api/v1/subscriptions/check", web::get().to(services::subscription::check_limit))
            .route("/api/v1/subscriptions/subscribe", web::post().to(services::subscription::subscribe))
            .route("/api/v1/subscriptions/usage/increment", web::post().to(services::subscription::increment_usage))
            .route("/api/v1/subscriptions/checkout", web::post().to(services::subscription::create_checkout))
            .route("/api/v1/subscriptions/plans", web::get().to(services::subscription::list_plans))
            .route("/api/v1/subscriptions/all", web::get().to(services::subscription::list_all))
            .route("/api/v1/subscriptions/plans/{id}", web::put().to(services::subscription::update_plan))
            .route("/api/v1/subscription/checkout/status/{ext_id}", web::get().to(services::subscription::checkout_status))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}

async fn health() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "service": "invoicequ-monolith-render",
        "version": "1.0.0",
    }))
}
