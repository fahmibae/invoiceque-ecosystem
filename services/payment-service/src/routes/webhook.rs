use actix_web::{web, HttpRequest, HttpResponse};
use sqlx::PgPool;
use std::sync::Arc;

use crate::models::xendit_account::XenditWebhookPayload;
use crate::models::paypal_account::PaypalWebhookEvent;
use crate::repository::payment_link_repo;
use crate::messaging::publisher::EventPublisher;
use crate::services::xendit::XenditClient;
use crate::XenditCallbackToken;

pub async fn handle_webhook(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    publisher: web::Data<Arc<EventPublisher>>,
    callback_token: web::Data<Arc<XenditCallbackToken>>,
    body: web::Json<XenditWebhookPayload>,
) -> HttpResponse {
    // Verify Xendit callback token
    let incoming_token = req.headers()
        .get("x-callback-token")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if !XenditClient::verify_callback_token(incoming_token, &callback_token.0) {
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
                    // Publish event to notification and invoice services
                    let _ = publisher.publish_payment_completed(
                        &link.user_id,
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

            if let Ok(link) = sqlx::query_as::<_, crate::models::payment_link::PaymentLink>(
                "SELECT * FROM payment_links WHERE id = $1"
            )
            .bind(payment_id)
            .fetch_one(pool.get_ref())
            .await {
                let _ = publisher.publish_payment_failed(
                    &link.user_id,
                    payment_id,
                    body.amount,
                    body.payer_email.as_deref().unwrap_or("Customer"),
                    body.payer_email.as_deref().unwrap_or(""),
                    &link.title,
                ).await;
            }

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

/// Handle PayPal webhook events (uses platform PayPal credentials)
pub async fn handle_paypal_webhook(
    pool: web::Data<PgPool>,
    publisher: web::Data<Arc<EventPublisher>>,
    paypal_client: web::Data<Arc<crate::services::paypal::PaypalClient>>,
    body: web::Json<PaypalWebhookEvent>,
) -> HttpResponse {
    log::info!(
        "[PAYMENT] PayPal webhook: id={} event_type={}",
        body.id, body.event_type
    );

    match body.event_type.as_str() {
        "CHECKOUT.ORDER.APPROVED" => {
            // Order approved — auto-capture using platform credentials
            let order_id = body.resource.get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("");

            log::info!("[PAYMENT] PayPal order approved: {}", order_id);

            match sqlx::query_as::<_, crate::models::payment_link::PaymentLink>(
                "SELECT * FROM payment_links WHERE provider_order_id = $1"
            )
            .bind(order_id)
            .fetch_one(pool.get_ref())
            .await {
                Ok(link) => {
                    match paypal_client.capture_order(order_id).await {
                        Ok(capture) if capture.status == "COMPLETED" => {
                            let _ = payment_link_repo::mark_payment_completed(pool.get_ref(), &link.id).await;
                            let _ = publisher.publish_payment_completed(
                                &link.user_id,
                                &link.id,
                                link.invoice_id.as_deref(),
                                link.amount,
                                "PayPal Customer",
                                "",
                                &link.title,
                            ).await;
                            log::info!("[PAYMENT] PayPal payment auto-captured for order {}", order_id);
                        }
                        Ok(capture) => {
                            log::warn!("[PAYMENT] PayPal capture status: {} for order {}", capture.status, order_id);
                        }
                        Err(e) => {
                            log::error!("[PAYMENT] PayPal auto-capture failed: {}", e);
                        }
                    }
                }
                Err(_) => {
                    log::warn!("[PAYMENT] No payment link found for PayPal order {}", order_id);
                }
            }

            HttpResponse::Ok().json(serde_json::json!({
                "status": "ok",
                "message": "PayPal order approved webhook received"
            }))
        }

        "PAYMENT.CAPTURE.COMPLETED" => {
            // Payment captured successfully
            let order_id = body.resource.get("supplementary_data")
                .and_then(|v| v.get("related_ids"))
                .and_then(|v| v.get("order_id"))
                .and_then(|v| v.as_str())
                .unwrap_or("");

            if !order_id.is_empty() {
                match sqlx::query_as::<_, crate::models::payment_link::PaymentLink>(
                    "SELECT * FROM payment_links WHERE provider_order_id = $1 AND status != 'completed'"
                )
                .bind(order_id)
                .fetch_one(pool.get_ref())
                .await {
                    Ok(link) => {
                        let _ = payment_link_repo::mark_payment_completed(pool.get_ref(), &link.id).await;
                        let _ = publisher.publish_payment_completed(
                            &link.user_id,
                            &link.id,
                            link.invoice_id.as_deref(),
                            link.amount,
                            "PayPal Customer",
                            "",
                            &link.title,
                        ).await;
                        log::info!("[PAYMENT] PayPal capture completed for order {}", order_id);
                    }
                    Err(_) => {
                        log::info!("[PAYMENT] Payment already completed or not found for order {}", order_id);
                    }
                }
            }

            HttpResponse::Ok().json(serde_json::json!({
                "status": "ok",
                "message": "PayPal capture completed webhook received"
            }))
        }

        _ => {
            log::info!("[PAYMENT] PayPal webhook event_type: {} (no action)", body.event_type);
            HttpResponse::Ok().json(serde_json::json!({
                "status": "ok",
                "message": "Webhook received"
            }))
        }
    }
}
