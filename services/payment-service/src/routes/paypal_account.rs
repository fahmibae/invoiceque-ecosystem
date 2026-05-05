use actix_web::{web, HttpRequest, HttpResponse};
use sqlx::PgPool;
use chrono::Utc;
use uuid::Uuid;
use std::sync::Arc;

use crate::models::paypal_account::{ConnectPaypalRequest, PaypalAccount, PaypalAccountResponse};
use crate::repository::paypal_account_repo;
use crate::services::paypal::PaypalClient;

fn get_user_id(req: &HttpRequest) -> String {
    req.headers()
        .get("X-User-ID")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string()
}

/// POST /payments/paypal/setup — Connect user's PayPal (just email)
pub async fn setup(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    body: web::Json<ConnectPaypalRequest>,
) -> HttpResponse {
    let user_id = get_user_id(&req);
    if user_id.is_empty() {
        return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"}));
    }

    // Validate email format
    if !body.paypal_email.contains('@') || body.paypal_email.len() < 5 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Email PayPal tidak valid"
        }));
    }

    // Check if already connected
    if let Ok(existing) = paypal_account_repo::find_by_user_id(pool.get_ref(), &user_id).await {
        return HttpResponse::Conflict().json(serde_json::json!({
            "error": "PayPal sudah terhubung",
            "account": PaypalAccountResponse::from(existing)
        }));
    }

    let now = Utc::now();
    let account = PaypalAccount {
        id: Uuid::new_v4().to_string(),
        user_id,
        paypal_email: body.paypal_email.clone(),
        status: "ACTIVE".to_string(),
        created_at: now,
        updated_at: now,
    };

    match paypal_account_repo::create(pool.get_ref(), &account).await {
        Ok(created) => {
            log::info!("[PAYMENT] Connected PayPal for user: {} -> {}", created.user_id, created.paypal_email);
            HttpResponse::Created().json(PaypalAccountResponse::from(created))
        }
        Err(e) => {
            log::error!("[PAYMENT] Failed to save PayPal connection: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Gagal menyimpan"}))
        }
    }
}

/// GET /payments/paypal/account — Get user's connected PayPal
pub async fn get_account(
    req: HttpRequest,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let user_id = get_user_id(&req);

    match paypal_account_repo::find_by_user_id(pool.get_ref(), &user_id).await {
        Ok(account) => HttpResponse::Ok().json(PaypalAccountResponse::from(account)),
        Err(_) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "PayPal belum terhubung. Silakan hubungkan email PayPal Anda di Settings."
        })),
    }
}

/// DELETE /payments/paypal/account — Disconnect PayPal
pub async fn delete_account(
    req: HttpRequest,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let user_id = get_user_id(&req);

    match paypal_account_repo::delete(pool.get_ref(), &user_id).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({"message": "PayPal berhasil diputus"})),
        Err(e) => {
            log::error!("[PAYMENT] Failed to delete PayPal connection: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Gagal menghapus"}))
        }
    }
}

/// POST /payments/paypal/capture/{order_id} — Capture approved PayPal order
pub async fn capture_order(
    pool: web::Data<PgPool>,
    paypal_client: web::Data<Arc<PaypalClient>>,
    publisher: web::Data<Arc<crate::messaging::publisher::EventPublisher>>,
    path: web::Path<String>,
) -> HttpResponse {
    let order_id = path.into_inner();

    if !paypal_client.is_configured() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "PayPal is not configured on the platform"
        }));
    }

    match paypal_client.capture_order(&order_id).await {
        Ok(capture) => {
            if capture.status == "COMPLETED" {
                if let Ok(link) = sqlx::query_as::<_, crate::models::payment_link::PaymentLink>(
                    "UPDATE payment_links SET payments = payments + 1, status = 'completed', updated_at = NOW() WHERE provider_order_id = $1 RETURNING *"
                )
                .bind(&order_id)
                .fetch_one(pool.get_ref())
                .await {
                    let _ = publisher.publish_payment_completed(
                        &link.user_id,
                        &link.id,
                        link.invoice_id.as_deref(),
                        link.amount,
                        "PayPal Customer",
                        "",
                        &link.title,
                    ).await;

                    log::info!("[PAYMENT] PayPal payment captured for order {}", order_id);
                }

                HttpResponse::Ok().json(serde_json::json!({
                    "status": "completed",
                    "order_id": capture.id,
                    "message": "Pembayaran berhasil"
                }))
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "status": capture.status.to_lowercase(),
                    "order_id": capture.id
                }))
            }
        }
        Err(e) => {
            log::error!("[PAYMENT] PayPal capture failed: {}", e);
            HttpResponse::BadGateway().json(serde_json::json!({
                "error": "Gagal capture pembayaran PayPal",
                "details": e.to_string()
            }))
        }
    }
}
