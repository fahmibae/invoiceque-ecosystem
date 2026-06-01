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
mod services;
mod utils;

use worker::*;

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let allowed_origins = env
        .var("ALLOWED_ORIGINS")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "*".into());

    // Extract Origin header BEFORE request is consumed
    let origin = req
        .headers()
        .get("Origin")
        .ok()
        .flatten()
        .unwrap_or_default();

    // Handle CORS preflight for all routes
    if req.method() == Method::Options {
        return middleware::cors_preflight_with_origin(&origin, &allowed_origins);
    }

    let url = req.url()?;
    let path = url.path();
    let method = req.method();

    // Route the request and wrap response with CORS
    let result = route(req, &env, &path, method).await;

    match result {
        Ok(resp) => middleware::with_cors_origin(resp, &origin, &allowed_origins),
        Err(e) => {
            let error_resp = utils::json_error(&format!("Internal error: {}", e), 500)?;
            middleware::with_cors_origin(error_resp, &origin, &allowed_origins)
        }
    }
}

#[event(scheduled)]
async fn scheduled(event: ScheduledEvent, env: Env, _ctx: ScheduleContext) {
    console_log!("[CRON] Running scheduled jobs for trigger {}", event.cron());

    match services::subscription::send_due_renewal_reminders(&env).await {
        Ok(summary) => console_log!(
            "[CRON] Subscription renewal reminders complete: checked={}, sent={}, skipped={}, failed={}",
            summary.checked,
            summary.sent,
            summary.skipped,
            summary.failed
        ),
        Err(err) => console_log!("[CRON] Subscription renewal reminder job failed: {}", err),
    }

    match services::subscription::enforce_expired_subscriptions(&env).await {
        Ok(summary) => console_log!(
            "[CRON] Expired subscription enforcement complete: checked={}, downgraded={}, skipped={}, failed={}",
            summary.checked,
            summary.downgraded,
            summary.skipped,
            summary.failed
        ),
        Err(err) => console_log!("[CRON] Expired subscription enforcement failed: {}", err),
    }

    match services::invoice::send_due_invoice_reminders(&env).await {
        Ok(summary) => console_log!(
            "[CRON] Invoice due reminders complete: checked={}, sent={}, skipped={}, failed={}",
            summary.checked,
            summary.sent,
            summary.skipped,
            summary.failed
        ),
        Err(err) => console_log!("[CRON] Invoice due reminder job failed: {}", err),
    }

    match services::payment::send_due_payment_link_reminders(&env).await {
        Ok(summary) => console_log!(
            "[CRON] Payment link due reminders complete: checked={}, sent={}, skipped={}, failed={}",
            summary.checked,
            summary.sent,
            summary.skipped,
            summary.failed
        ),
        Err(err) => console_log!("[CRON] Payment link due reminder job failed: {}", err),
    }

    match services::chaser::process_scheduled_chasers(&env).await {
        Ok(summary) => console_log!(
            "[CRON] Payment chasers complete: checked={}, sent={}, skipped={}, failed={}, auto_completed={}",
            summary.checked,
            summary.sent,
            summary.skipped,
            summary.failed,
            summary.completed
        ),
        Err(err) => console_log!("[CRON] Payment chaser job failed: {}", err),
    }
}

async fn route(mut req: Request, env: &Env, path: &str, method: Method) -> Result<Response> {
    let jwt_secret = utils::get_secret(env, "JWT_SECRET");

    // ── Health check ──
    if path == "/health" || path == "/api/v1/health" {
        return utils::json_response(
            &serde_json::json!({
                "status": "healthy",
                "service": "invoicequ-monolith-worker",
                "version": "1.0.0",
            }),
            200,
        );
    }

    // Debug endpoints removed for production security

    // ══════════════════════════════════════════════════════════
    //  PUBLIC ROUTES (no JWT required)
    // ══════════════════════════════════════════════════════════

    // ── Auth public routes ──
    if path == "/api/v1/auth/register-checkout" && method == Method::Post {
        return services::auth::register_checkout(req, env).await;
    }
    if path == "/api/v1/auth/register" && method == Method::Post {
        return services::auth::register(req, env).await;
    }
    if path == "/api/v1/auth/login" && method == Method::Post {
        return services::auth::login(req, env).await;
    }
    if path == "/api/v1/auth/verify-email" && method == Method::Post {
        return services::auth::verify_email(req, env).await;
    }
    if path == "/api/v1/auth/resend-verification" && method == Method::Post {
        return services::auth::resend_verification(req, env).await;
    }
    if path == "/api/v1/auth/forgot-password" && method == Method::Post {
        return services::auth::forgot_password(req, env).await;
    }
    if path == "/api/v1/auth/reset-password" && method == Method::Post {
        return services::auth::reset_password(req, env).await;
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

    // ── Public quotation routes ──
    if let Some(token) = strip_prefix(path, "/api/v1/quote/") {
        let parts: Vec<&str> = token.split('/').collect();
        if parts.len() == 1 && method == Method::Get {
            return services::quotation::get_public(&env, parts[0]).await;
        }
        if parts.len() == 2 && parts[1] == "accept" && method == Method::Post {
            return services::quotation::accept_quotation(&env, parts[0]).await;
        }
        if parts.len() == 2 && parts[1] == "reject" && method == Method::Post {
            return services::quotation::reject_quotation(&env, parts[0]).await;
        }
    }

    // ── Public portal route ──
    if let Some(token) = strip_prefix(path, "/api/v1/portal/") {
        // Exclude management subpaths handled by protected routes below
        let is_management =
            token == "links" || token.starts_with("generate/") || token.starts_with("revoke/");
        if !is_management && !token.contains('/') && method == Method::Get {
            return services::portal::get_portal(&env, token).await;
        }
    }

    // ══════════════════════════════════════════════════════════
    //  PROTECTED ROUTES (JWT or API Key required)
    // ══════════════════════════════════════════════════════════

    let auth_ctx = match middleware::extract_auth_dual(&req, &env, &jwt_secret).await {
        Ok(c) => c,
        Err(resp) => return Ok(resp),
    };

    // Derive JwtClaims for backward compatibility with existing service handlers
    let claims = middleware::JwtClaims {
        user_id: auth_ctx.user_id.clone(),
        email: auth_ctx.email.clone(),
        role: auth_ctx.role.clone(),
    };

    // ── API Key management routes (JWT-only, not accessible via API keys) ──
    if path == "/api/v1/api-keys" || path == "/api/v1/api-keys/" {
        if auth_ctx.auth_type != middleware::AuthType::Jwt {
            return utils::json_error("API key management requires JWT authentication", 403);
        }
        return match method {
            Method::Get => services::api_key::list_api_keys(&req, &env, &claims).await,
            Method::Post => services::api_key::create_api_key(req, &env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
    }
    if path == "/api/v1/api-keys/scopes" && method == Method::Get {
        return services::api_key::list_scopes().await;
    }
    if let Some(id) = strip_prefix(path, "/api/v1/api-keys/") {
        if !id.contains('/') {
            if auth_ctx.auth_type != middleware::AuthType::Jwt {
                return utils::json_error("API key management requires JWT authentication", 403);
            }
            return match method {
                Method::Put => services::api_key::update_api_key(req, &env, &claims, id).await,
                Method::Delete => services::api_key::revoke_api_key(&env, &claims, id).await,
                _ => utils::json_error("Method not allowed", 405),
            };
        }
    }

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
            return utils::json_error(
                "PDF generation not available in Worker mode. Use client-side rendering.",
                501,
            );
        }
    }

    // ── Dashboard routes ──
    if path == "/api/v1/dashboard/stats" && method == Method::Get {
        return services::invoice::get_dashboard_stats(env, &claims).await;
    }
    if path == "/api/v1/dashboard/revenue-chart" && method == Method::Get {
        return services::invoice::get_revenue_chart(&req, env, &claims).await;
    }
    if path == "/api/v1/dashboard/health-score" && method == Method::Get {
        return services::health::get_health_score(env, &claims).await;
    }

    // ── Quotation routes ──
    if path == "/api/v1/quotations" {
        return match method {
            Method::Get => services::quotation::list(&req, env, &claims).await,
            Method::Post => services::quotation::create(req, env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
    }
    if path == "/api/v1/quotations/stats" && method == Method::Get {
        return services::quotation::stats(env, &claims).await;
    }
    if path == "/api/v1/quotations/bulk-delete" && method == Method::Post {
        return services::quotation::bulk_delete(req, env, &claims).await;
    }
    if let Some(rest) = strip_prefix(path, "/api/v1/quotations/") {
        let parts: Vec<&str> = rest.split('/').collect();
        let id = parts[0];
        if parts.len() == 1 {
            return match method {
                Method::Get => services::quotation::get(env, &claims, id).await,
                Method::Put => services::quotation::update(req, env, &claims, id).await,
                Method::Delete => services::quotation::delete(env, &claims, id).await,
                _ => utils::json_error("Method not allowed", 405),
            };
        }
        if parts.len() == 2 && parts[1] == "send" && method == Method::Put {
            return services::quotation::send_quotation(env, &claims, id).await;
        }
        if parts.len() == 2 && parts[1] == "convert" && method == Method::Post {
            return services::quotation::convert_to_invoice(env, &claims, id).await;
        }
    }

    // ── Payment Chaser routes ──
    if path == "/api/v1/chasers" {
        return match method {
            Method::Get => services::chaser::list(&req, env, &claims).await,
            Method::Post => services::chaser::create(req, env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
    }
    if path == "/api/v1/chasers/stats" && method == Method::Get {
        return services::chaser::stats(env, &claims).await;
    }
    if path == "/api/v1/chasers/bulk-delete" && method == Method::Post {
        return services::chaser::bulk_delete(req, env, &claims).await;
    }
    if let Some(rest) = strip_prefix(path, "/api/v1/chasers/") {
        let parts: Vec<&str> = rest.split('/').collect();
        let id = parts[0];
        if parts.len() == 1 && method == Method::Delete {
            return services::chaser::delete(env, &claims, id).await;
        }
        if parts.len() == 2 && parts[1] == "toggle" && method == Method::Put {
            return services::chaser::toggle_status(env, &claims, id).await;
        }
        if parts.len() == 2 && parts[1] == "send" && method == Method::Post {
            return services::chaser::send_reminder(env, &claims, id).await;
        }
        if parts.len() == 2 && parts[1] == "logs" && method == Method::Get {
            return services::chaser::get_logs(env, &claims, id).await;
        }
    }

    // ── Portal management routes (protected) ──
    if path == "/api/v1/portal/links" && method == Method::Get {
        return services::portal::list_portal_links(env, &claims).await;
    }
    if path == "/api/v1/portal/bulk-delete" && method == Method::Post {
        return services::portal::bulk_delete(req, env, &claims).await;
    }
    if let Some(client_id) = strip_prefix(path, "/api/v1/portal/generate/") {
        if method == Method::Post {
            return services::portal::generate_portal_link(env, &claims, client_id).await;
        }
    }
    if let Some(client_id) = strip_prefix(path, "/api/v1/portal/revoke/") {
        if method == Method::Delete {
            return services::portal::revoke_portal_link(env, &claims, client_id).await;
        }
    }
    if let Some(client_id) = strip_prefix(path, "/api/v1/portal/update/") {
        if method == Method::Put {
            let body = req.text().await.unwrap_or_default();
            return services::portal::update_portal_link(env, &claims, client_id, &body).await;
        }
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
    if path == "/api/v1/payments/xendit/account" {
        return match method {
            Method::Get => services::payment::xendit_get_account(env, &claims).await,
            Method::Delete => services::payment::xendit_delete_account(env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
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
    if path == "/api/v1/notifications" && method == Method::Delete {
        return services::notification::delete_all_notifications(env, &claims).await;
    }
    if path == "/api/v1/notifications/read-all" && method == Method::Put {
        return services::notification::mark_all_as_read(env, &claims).await;
    }
    if path == "/api/v1/notifications/delete-batch" && method == Method::Post {
        return services::notification::delete_batch_notifications(&mut req, env, &claims).await;
    }
    if let Some(rest) = strip_prefix(path, "/api/v1/notifications/") {
        if rest.ends_with("/read") && method == Method::Put {
            let id = rest.trim_end_matches("/read");
            return services::notification::mark_as_read(env, &claims, id).await;
        }
        if !rest.contains('/') && method == Method::Delete {
            return services::notification::delete_notification(env, &claims, rest).await;
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
    if path == "/api/v1/subscriptions/upgrade-recommendation" && method == Method::Post {
        return services::subscription::send_upgrade_recommendation(req, env, &claims).await;
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

    // ── Task routes ──
    if path == "/api/v1/tasks" {
        return match method {
            Method::Get => services::task::list_tasks(&req, env, &claims).await,
            Method::Post => services::task::create_task(req, env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
    }
    if path == "/api/v1/tasks/stats" && method == Method::Get {
        return services::task::task_stats(env, &claims).await;
    }
    if path == "/api/v1/tasks/bulk-delete" && method == Method::Post {
        return services::task::bulk_delete_tasks(req, env, &claims).await;
    }
    if let Some(id) = strip_prefix(path, "/api/v1/tasks/") {
        if !id.contains('/') {
            return match method {
                Method::Get => services::task::get_task(env, &claims, id).await,
                Method::Put => services::task::update_task(req, env, &claims, id).await,
                Method::Delete => services::task::delete_task(env, &claims, id).await,
                _ => utils::json_error("Method not allowed", 405),
            };
        }
    }

    // ── Meeting routes ──
    if path == "/api/v1/meetings" {
        return match method {
            Method::Get => services::meeting::list_meetings(&req, env, &claims).await,
            Method::Post => services::meeting::create_meeting(req, env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
    }
    if path == "/api/v1/meetings/stats" && method == Method::Get {
        return services::meeting::meeting_stats(env, &claims).await;
    }
    if path == "/api/v1/meetings/bulk-delete" && method == Method::Post {
        return services::meeting::bulk_delete_meetings(req, env, &claims).await;
    }
    if let Some(id) = strip_prefix(path, "/api/v1/meetings/") {
        if !id.contains('/') {
            return match method {
                Method::Get => services::meeting::get_meeting(env, &claims, id).await,
                Method::Put => services::meeting::update_meeting(req, env, &claims, id).await,
                Method::Delete => services::meeting::delete_meeting(env, &claims, id).await,
                _ => utils::json_error("Method not allowed", 405),
            };
        }
    }

    // ── Project routes ──
    if path == "/api/v1/projects" {
        return match method {
            Method::Get => services::task::list_projects(&req, env, &claims).await,
            Method::Post => services::task::create_project(req, env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
    }
    if let Some(id) = strip_prefix(path, "/api/v1/projects/") {
        if !id.contains('/') {
            return match method {
                Method::Get => services::task::get_project(env, &claims, id).await,
                Method::Put => services::task::update_project(req, env, &claims, id).await,
                Method::Delete => services::task::delete_project(env, &claims, id).await,
                _ => utils::json_error("Method not allowed", 405),
            };
        }
    }

    // ── Time Entry routes ──
    if path == "/api/v1/time-entries" {
        return match method {
            Method::Get => services::task::list_time_entries(&req, env, &claims).await,
            Method::Post => services::task::create_time_entry(req, env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
    }
    if path == "/api/v1/time-entries/stats" && method == Method::Get {
        return services::task::time_entry_stats(env, &claims).await;
    }
    if let Some(id) = strip_prefix(path, "/api/v1/time-entries/") {
        if !id.contains('/') && method == Method::Delete {
            return services::task::delete_time_entry(env, &claims, id).await;
        }
    }

    // ── Expense routes ──
    if path == "/api/v1/expenses" {
        return match method {
            Method::Get => services::expense::list_expenses(&req, env, &claims).await,
            Method::Post => services::expense::create_expense(req, env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
    }
    if path == "/api/v1/expenses/stats" && method == Method::Get {
        return services::expense::expense_stats(&req, env, &claims).await;
    }
    if path == "/api/v1/expenses/categories" && method == Method::Get {
        return services::expense::expense_categories().await;
    }
    if path == "/api/v1/expenses/bulk-delete" && method == Method::Post {
        return services::expense::bulk_delete_expenses(req, env, &claims).await;
    }
    if let Some(id) = strip_prefix(path, "/api/v1/expenses/") {
        if !id.contains('/') {
            return match method {
                Method::Get => services::expense::get_expense(env, &claims, id).await,
                Method::Put => services::expense::update_expense(req, env, &claims, id).await,
                Method::Delete => services::expense::delete_expense(env, &claims, id).await,
                _ => utils::json_error("Method not allowed", 405),
            };
        }
    }

    // ── Toolkit routes ──
    if path == "/api/v1/toolkit" {
        let result = match method {
            Method::Get => services::toolkit::list_items(&req, env, &claims).await,
            Method::Post => services::toolkit::create_item(req, env, &claims).await,
            _ => utils::json_error("Method not allowed", 405),
        };
        return match result {
            Ok(r) => Ok(r),
            Err(e) => utils::json_error(&format!("Toolkit error: {}", e), 500),
        };
    }
    if path == "/api/v1/toolkit/stats" && method == Method::Get {
        let result = services::toolkit::toolkit_stats(env, &claims).await;
        return match result {
            Ok(r) => Ok(r),
            Err(e) => utils::json_error(&format!("Toolkit stats error: {}", e), 500),
        };
    }
    if path == "/api/v1/toolkit/bulk-delete" && method == Method::Post {
        return services::toolkit::bulk_delete_items(req, env, &claims).await;
    }
    if let Some(id) = strip_prefix(path, "/api/v1/toolkit/") {
        if !id.contains('/') {
            let result = match method {
                Method::Get => services::toolkit::get_item(env, &claims, id).await,
                Method::Put => services::toolkit::update_item(req, env, &claims, id).await,
                Method::Delete => services::toolkit::delete_item(env, &claims, id).await,
                _ => utils::json_error("Method not allowed", 405),
            };
            return match result {
                Ok(r) => Ok(r),
                Err(e) => utils::json_error(&format!("Toolkit item error: {}", e), 500),
            };
        }
    }

    // ── 404 ──
    utils::json_error(&format!("Not found: {} {}", method, path), 404)
}

/// Helper to extract path suffix after a prefix.
fn strip_prefix<'a>(path: &'a str, prefix: &str) -> Option<&'a str> {
    path.strip_prefix(prefix).filter(|s| !s.is_empty())
}
