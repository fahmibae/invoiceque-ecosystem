//! InvoiceQu Monolithic Cloudflare Worker
//! Combines all microservices into a single Worker deployment.
//!
//! Original services (preserved in /services/ for future microservice use):
//!   - auth-service (Go)         → services::auth
//!   - client-service (Go)       → services::client
//!   - invoice-service (Go)      → services::invoice
//!   - payment-service (Rust)    → services::payment
//!   - notification-service (Go) → services::notification
//!   - subscription-service (Go) → services::subscription
//!   - api-gateway (Go)          → this router (lib.rs)

mod db;
mod middleware;
mod utils;
mod services;

use worker::*;

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let allowed_origins = env.var("ALLOWED_ORIGINS")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "*".into());

    // Handle CORS preflight for all routes
    if req.method() == Method::Options {
        return middleware::cors_preflight(&req, &allowed_origins);
    }

    let url = req.url()?;
    let path = url.path();
    let method = req.method();

    // Route the request and wrap response with CORS
    let result = route(req, &env, &path, method).await;

    match result {
        Ok(resp) => {
            // Re-parse URL for CORS (req consumed by route)
            let dummy_req = Request::new(&url.to_string(), Method::Get)?;
            middleware::with_cors(resp, &dummy_req, &allowed_origins)
        }
        Err(e) => {
            let error_resp = utils::json_error(&format!("Internal error: {}", e), 500)?;
            let dummy_req = Request::new(&url.to_string(), Method::Get)?;
            middleware::with_cors(error_resp, &dummy_req, &allowed_origins)
        }
    }
}

async fn route(req: Request, env: &Env, path: &str, method: Method) -> Result<Response> {
    let jwt_secret = utils::get_secret(env, "JWT_SECRET");

    // ── Health check ──
    if path == "/health" || path == "/api/v1/health" {
        return utils::json_response(&serde_json::json!({
            "status": "healthy",
            "service": "invoicequ-monolith-worker",
            "version": "1.0.0",
        }), 200);
    }

    // ══════════════════════════════════════════════════════════
    //  PUBLIC ROUTES (no JWT required)
    // ══════════════════════════════════════════════════════════

    // ── Auth public routes ──
    if path == "/api/v1/auth/register" && method == Method::Post {
        return services::auth::register(req, env).await;
    }
    if path == "/api/v1/auth/login" && method == Method::Post {
        return services::auth::login(req, env).await;
    }
    if path == "/api/v1/auth/google" && method == Method::Post {
        return services::auth::google_login(req, env).await;
    }
    if path == "/api/v1/auth/refresh" && method == Method::Post {
        return services::auth::refresh_token(req, env).await;
    }

    // ── Public payment routes ──
    if let Some(id) = strip_prefix(path, "/api/v1/pay/") {
        if !id.contains('/') {
            return match method {
                Method::Get => services::payment::get_public(env, id).await,
                _ => utils::json_error("Method not allowed", 405),
            };
        }
    }
    if let Some(id) = strip_prefix(path, "/api/v1/pay-checkout/") {
        if method == Method::Post {
            return services::payment::checkout(req, env, id).await;
        }
    }
    if let Some(id) = strip_prefix(path, "/api/v1/pay-capture/") {
        if method == Method::Post {
            return services::payment::capture_public(req, env, id).await;
        }
    }
    if let Some(id) = strip_prefix(path, "/api/v1/pay-status/") {
        if method == Method::Get {
            return services::payment::check_status_public(env, id).await;
        }
    }

    // ── Webhook routes (public) ──
    if path == "/api/v1/webhooks/payments" && method == Method::Post {
        return services::payment::handle_webhook(req, env).await;
    }
    if path == "/api/v1/webhooks/paypal" && method == Method::Post {
        return services::payment::handle_paypal_webhook(req, env).await;
    }
    if path == "/api/v1/webhooks/subscription" && method == Method::Post {
        return services::subscription::handle_webhook(req, env).await;
    }

    // ── Public subscription routes ──
    if path == "/api/v1/plans" && method == Method::Get {
        return services::subscription::list_plans(env).await;
    }
    if let Some(ext_id) = strip_prefix(path, "/api/v1/subscription/checkout/status/") {
        if method == Method::Get {
            return services::subscription::checkout_status(env, ext_id).await;
        }
    }

    // ── Invoice payment event (internal/service-to-service) ──
    if path == "/api/v1/events/payment" && method == Method::Post {
        return services::invoice::handle_payment_event(req, env).await;
    }

    // ── Internal user lookup ──
    if let Some(uid) = strip_prefix(path, "/api/v1/internal/users/") {
        if method == Method::Get {
            return services::auth::get_user_by_id(&req, env, uid).await;
        }
    }

    // ══════════════════════════════════════════════════════════
    //  PROTECTED ROUTES (JWT required)
    // ══════════════════════════════════════════════════════════

    let claims = match middleware::extract_auth(&req, &jwt_secret) {
        Ok(c) => c,
        Err(resp) => return Ok(resp),
    };

    // ── Auth protected routes ──
    if path == "/api/v1/auth/profile" {
        return match method {
            Method::Get => services::auth::profile(&req, env, &claims).await,
            Method::Put => services::auth::update_profile(req, env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
    }
    if path == "/api/v1/auth/password" && method == Method::Put {
        return services::auth::change_password(req, env, &claims).await;
    }
    if path == "/api/v1/auth/users" && method == Method::Get {
        return services::auth::list_users(&req, env, &claims).await;
    }
    if let Some(rest) = strip_prefix(path, "/api/v1/auth/users/") {
        if let Some(id) = rest.split('/').next() {
            if rest.ends_with("/role") && method == Method::Put {
                return services::auth::update_role(req, env, &claims, id).await;
            }
            if method == Method::Delete && !rest.contains('/') {
                return services::auth::delete_user(env, &claims, id).await;
            }
        }
    }

    // ── Client routes ──
    if path == "/api/v1/clients" {
        return match method {
            Method::Get => services::client::list(&req, env, &claims).await,
            Method::Post => services::client::create(req, env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
    }
    if path == "/api/v1/clients/bulk-delete" && method == Method::Post {
        return services::client::bulk_delete(req, env, &claims).await;
    }
    if let Some(id) = strip_prefix(path, "/api/v1/clients/") {
        if !id.contains('/') {
            return match method {
                Method::Get => services::client::get(env, &claims, id).await,
                Method::Put => services::client::update(req, env, &claims, id).await,
                Method::Delete => services::client::delete(env, &claims, id).await,
                _ => utils::json_error("Method not allowed", 405),
            };
        }
    }

    // ── Invoice routes ──
    if path == "/api/v1/invoices" {
        return match method {
            Method::Get => services::invoice::list(&req, env, &claims).await,
            Method::Post => services::invoice::create(req, env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
    }
    if path == "/api/v1/invoices/bulk-delete" && method == Method::Post {
        return services::invoice::bulk_delete(req, env, &claims).await;
    }
    if path == "/api/v1/invoices/linkable" && method == Method::Get {
        return services::invoice::list_linkable(env, &claims).await;
    }
    if let Some(rest) = strip_prefix(path, "/api/v1/invoices/") {
        let parts: Vec<&str> = rest.split('/').collect();
        let id = parts[0];
        if parts.len() == 1 {
            return match method {
                Method::Get => services::invoice::get(env, &claims, id).await,
                Method::Put => services::invoice::update(req, env, &claims, id).await,
                Method::Delete => services::invoice::delete(env, &claims, id).await,
                _ => utils::json_error("Method not allowed", 405),
            };
        }
        if parts.len() == 2 && parts[1] == "send" && method == Method::Put {
            return services::invoice::send_invoice(env, &claims, id).await;
        }
        if parts.len() == 2 && parts[1] == "pdf" && method == Method::Get {
            // PDF generation is not available in WASM — return a JSON stub
            // Frontend can use client-side PDF libs (jsPDF, html2pdf) instead
            return utils::json_error("PDF generation not available in Worker mode. Use client-side rendering.", 501);
        }
    }

    // ── Dashboard routes ──
    if path == "/api/v1/dashboard/stats" && method == Method::Get {
        return services::invoice::get_dashboard_stats(env, &claims).await;
    }
    if path == "/api/v1/dashboard/revenue-chart" && method == Method::Get {
        return services::invoice::get_revenue_chart(&req, env, &claims).await;
    }

    // ── Invoice settings routes ──
    if path == "/api/v1/invoice-settings" {
        return match method {
            Method::Get => services::invoice::get_settings(env, &claims).await,
            Method::Put => services::invoice::update_settings(req, env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
    }

    // ── Payment routes ──
    if path == "/api/v1/payments" {
        return match method {
            Method::Get => services::payment::list(&req, env, &claims).await,
            Method::Post => services::payment::create(req, env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
    }
    if path == "/api/v1/payments/bulk-delete" && method == Method::Post {
        return services::payment::bulk_delete(req, env, &claims).await;
    }
    if path == "/api/v1/payments/by-invoices" && method == Method::Post {
        return services::payment::delete_by_invoices(req, env, &claims).await;
    }
    if path == "/api/v1/payments/paypal/setup" && method == Method::Post {
        return services::payment::paypal_setup(req, env, &claims).await;
    }
    if path == "/api/v1/payments/paypal/account" {
        return match method {
            Method::Get => services::payment::paypal_get_account(env, &claims).await,
            Method::Delete => services::payment::paypal_delete_account(env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
    }
    if path == "/api/v1/payments/xendit/setup" && method == Method::Post {
        return services::payment::xendit_setup(req, env, &claims).await;
    }
    if path == "/api/v1/payments/xendit/account" && method == Method::Get {
        return services::payment::xendit_get_account(env, &claims).await;
    }
    if let Some(order_id) = strip_prefix(path, "/api/v1/payments/paypal/capture/") {
        if method == Method::Post {
            return services::payment::paypal_capture_order(env, &claims, order_id).await;
        }
    }
    if let Some(invoice_id) = strip_prefix(path, "/api/v1/payments/by-invoice/") {
        if method == Method::Delete {
            return services::payment::delete_by_invoice(env, &claims, invoice_id).await;
        }
    }
    if let Some(rest) = strip_prefix(path, "/api/v1/payments/") {
        if !rest.contains('/') {
            return match method {
                Method::Get => services::payment::get(env, &claims, rest).await,
                Method::Put => services::payment::update(req, env, &claims, rest).await,
                Method::Delete => services::payment::delete(env, &claims, rest).await,
                _ => utils::json_error("Method not allowed", 405),
            };
        }
    }

    // ── Notification routes ──
    if path == "/api/v1/notifications" && method == Method::Get {
        return services::notification::list_notifications(&req, env, &claims).await;
    }
    if let Some(rest) = strip_prefix(path, "/api/v1/notifications/") {
        if rest.ends_with("/read") && method == Method::Put {
            let id = rest.trim_end_matches("/read");
            return services::notification::mark_as_read(env, &claims, id).await;
        }
    }

    // ── Subscription routes ──
    if path == "/api/v1/subscriptions/current" && method == Method::Get {
        return services::subscription::get_current(env, &claims).await;
    }
    if path == "/api/v1/subscriptions/usage" && method == Method::Get {
        return services::subscription::get_usage(env, &claims).await;
    }
    if path == "/api/v1/subscriptions/check" && method == Method::Get {
        return services::subscription::check_limit(&req, env, &claims).await;
    }
    if path == "/api/v1/subscriptions/subscribe" && method == Method::Post {
        return services::subscription::subscribe(req, env, &claims).await;
    }
    if path == "/api/v1/subscriptions/usage/increment" && method == Method::Post {
        return services::subscription::increment_usage(req, env, &claims).await;
    }
    if path == "/api/v1/subscriptions/checkout" && method == Method::Post {
        return services::subscription::create_checkout(req, env, &claims).await;
    }
    if path == "/api/v1/subscriptions/plans" && method == Method::Get {
        return services::subscription::list_plans(env).await;
    }
    if path == "/api/v1/subscriptions/all" && method == Method::Get {
        return services::subscription::list_all(env, &claims).await;
    }
    if let Some(rest) = strip_prefix(path, "/api/v1/subscriptions/plans/") {
        if method == Method::Put {
            return services::subscription::update_plan(req, env, &claims, rest).await;
        }
    }

    // ── 404 ──
    utils::json_error(&format!("Not found: {} {}", method, path), 404)
}

/// Helper to extract path suffix after a prefix.
fn strip_prefix<'a>(path: &'a str, prefix: &str) -> Option<&'a str> {
    path.strip_prefix(prefix).filter(|s| !s.is_empty())
}
