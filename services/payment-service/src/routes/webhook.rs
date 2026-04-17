use actix_web::{web, HttpRequest, HttpResponse};
use sqlx::PgPool;
use std::sync::Arc;

use crate::models::xendit_account::XenditWebhookPayload;
use crate::repository::payment_link_repo;
use crate::messaging::publisher::EventPublisher;
use crate::services::xendit::XenditClient;

pub async fn handle_webhook(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    publisher: web::Data<Arc<EventPublisher>>,
    callback_token: web::Data<Arc<String>>,
    body: web::Json<XenditWebhookPayload>,
) -> HttpResponse {
    // Verify Xendit callback token
    let incoming_token = req.headers()
        .get("x-callback-token")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if !XenditClient::verify_callback_token(incoming_token, callback_token.as_ref()) {
        log::warn!("[PAYMENT] Invalid webhook callback token");
        return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Invalid callback token"}));
    }

    log::info!(
        "[PAYMENT] Xendit webhook: id={} external_id={} status={} amount={}",
        body.id, body.external_id, body.status, body.amount
    );

    // external_id is our payment link ID
    let payment_id = &body.external_id;

    match body.status.as_str() {
        "PAID" | "SETTLED" => {
            match payment_link_repo::mark_payment_completed(pool.get_ref(), payment_id).await {
                Ok(link) => {
                    // Publish event via RabbitMQ
                    let _ = publisher.publish_payment_completed(
                        &link.id,
                        link.invoice_id.as_deref(),
                        body.amount,
                        body.payer_email.as_deref().unwrap_or("Customer"),
                        body.payer_email.as_deref().unwrap_or(""),
                        &link.title,
                    ).await;

                    log::info!("[PAYMENT] Payment {} completed via Xendit", payment_id);
                    HttpResponse::Ok().json(serde_json::json!({
                        "status": "ok",
                        "message": "Payment completed"
                    }))
                }
                Err(e) => {
                    log::error!("[PAYMENT] Failed to mark payment as completed: {}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to process webhook"}))
                }
            }
        }
        "EXPIRED" | "FAILED" => {
            log::warn!("[PAYMENT] Payment {} failed/expired via Xendit", payment_id);

            let _ = publisher.publish_payment_failed(
                payment_id,
                body.amount,
                body.payer_email.as_deref().unwrap_or("Customer"),
                body.payer_email.as_deref().unwrap_or(""),
                payment_id,
            ).await;

            HttpResponse::Ok().json(serde_json::json!({
                "status": "ok",
                "message": "Payment failure recorded"
            }))
        }
        _ => {
            log::info!("[PAYMENT] Xendit webhook status: {} (no action)", body.status);
            HttpResponse::Ok().json(serde_json::json!({
                "status": "ok",
                "message": "Webhook received"
            }))
        }
    }
}
