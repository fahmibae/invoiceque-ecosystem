use actix_web::{web, HttpRequest, HttpResponse};
use sqlx::PgPool;
use chrono::Utc;
use uuid::Uuid;
use std::sync::Arc;

use crate::models::payment_link::{
    CreatePaymentLinkRequest, UpdatePaymentLinkRequest, PaymentLinkListResponse,
};
use crate::models::xendit_account::{XenditCreateInvoicePayload, XenditCustomer};
use crate::repository::{payment_link_repo, xendit_account_repo, paypal_account_repo};
use crate::models::payment_link::PaymentLink;
use crate::services::xendit::XenditClient;
use crate::services::paypal::PaypalClient;
use crate::BasePaymentUrl;

fn get_user_id(req: &HttpRequest) -> String {
    req.headers()
        .get("X-User-ID")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string()
}

pub async fn list(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> HttpResponse {
    let user_id = get_user_id(&req);
    let page: i32 = query.get("page").and_then(|v| v.parse().ok()).unwrap_or(1);
    let per_page: i32 = query.get("per_page").and_then(|v| v.parse().ok()).unwrap_or(10);

    match payment_link_repo::find_all(pool.get_ref(), &user_id, page, per_page).await {
        Ok((links, total)) => {
            let total_pages = ((total as f64) / (per_page as f64)).ceil() as i32;
            HttpResponse::Ok().json(PaymentLinkListResponse {
                data: links,
                total,
                page,
                per_page,
                total_pages,
            })
        }
        Err(e) => {
            log::error!("[PAYMENT] Failed to fetch payment links: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to fetch payment links"}))
        }
    }
}

pub async fn get(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    path: web::Path<String>,
) -> HttpResponse {
    let user_id = get_user_id(&req);
    let id = path.into_inner();

    match payment_link_repo::find_by_id(pool.get_ref(), &id, &user_id).await {
        Ok(link) => HttpResponse::Ok().json(link),
        Err(_) => HttpResponse::NotFound().json(serde_json::json!({"error": "Payment link not found"})),
    }
}

pub async fn create(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    body: web::Json<CreatePaymentLinkRequest>,
    base_url: web::Data<Arc<BasePaymentUrl>>,
    xendit_client: web::Data<Arc<XenditClient>>,
    paypal_client: web::Data<Arc<PaypalClient>>,
    publisher: web::Data<Arc<crate::messaging::publisher::EventPublisher>>,
) -> HttpResponse {
    let user_id = get_user_id(&req);
    let id = Uuid::new_v4().to_string()[..8].to_uppercase();
    let now = Utc::now();
    let amount = body.amount;
    let currency = body.currency.clone().unwrap_or_else(|| "IDR".to_string());
    let requested_provider = body.payment_provider.clone().unwrap_or_default().to_lowercase();

    let (url, payment_provider, provider_order_id) = match requested_provider.as_str() {
        // ── PayPal flow — order created on-demand at checkout ──
        "paypal" => {
            if !paypal_client.is_configured() {
                return HttpResponse::BadRequest().json(serde_json::json!({
                    "error": "PayPal belum dikonfigurasi oleh platform."
                }));
            }

            // Verify user has PayPal email connected
            match paypal_account_repo::find_by_user_id(pool.get_ref(), &user_id).await {
                Ok(_) => {
                    // PayPal order will be created when payer clicks checkout
                    let pay_url = format!("{}/{}", base_url.0, id);
                    log::info!("[PAYMENT] Created PayPal payment link {} for user {}", id, user_id);
                    (pay_url, Some("paypal".to_string()), None)
                }
                Err(_) => {
                    return HttpResponse::BadRequest().json(serde_json::json!({
                        "error": "PayPal belum terhubung. Silakan hubungkan email PayPal di Settings."
                    }));
                }
            }
        }

        // ── Xendit flow (default for IDR) ──
        "xendit" | "" => {
            match xendit_account_repo::find_by_user_id(pool.get_ref(), &user_id).await {
                Ok(xendit_account) => {
                    let success_url = format!("{}/{}/xendit-return", base_url.0, id);
                    let failure_url = format!("{}/{}", base_url.0, id);

                    let invoice_payload = XenditCreateInvoicePayload {
                        external_id: id.clone(),
                        amount,
                        description: body.title.clone(),
                        currency: currency.clone(),
                        customer: None,
                        success_redirect_url: Some(success_url),
                        failure_redirect_url: Some(failure_url),
                        invoice_duration: Some(86400),
                    };

                    match xendit_client.create_invoice(
                        &xendit_account.xendit_user_id,
                        &invoice_payload,
                    ).await {
                        Ok(xendit_resp) => {
                            log::info!("[PAYMENT] Created Xendit invoice {} for user {}", xendit_resp.id, user_id);
                            (xendit_resp.invoice_url, Some("xendit".to_string()), Some(xendit_resp.id))
                        }
                        Err(e) => {
                            log::error!("[PAYMENT] Xendit invoice creation failed: {}, falling back to direct URL", e);
                            let fallback_url = format!("{}/{}", base_url.0, id);
                            (fallback_url, Some("manual".to_string()), None)
                        }
                    }
                }
                Err(_) => {
                    let direct_url = format!("{}/{}", base_url.0, id);
                    (direct_url, Some("manual".to_string()), None)
                }
            }
        }

        // ── Manual / unknown ──
        _ => {
            let direct_url = format!("{}/{}", base_url.0, id);
            (direct_url, Some("manual".to_string()), None)
        }
    };

    let link = PaymentLink {
        id: id.clone(),
        user_id,
        title: body.title.clone(),
        description: body.description.clone().unwrap_or_default(),
        amount,
        currency,
        status: "active".to_string(),
        url,
        clicks: 0,
        payments: 0,
        invoice_id: body.invoice_id.clone(),
        payment_provider,
        provider_order_id: provider_order_id.clone(),
        expires_at: None,
        created_at: now,
        updated_at: now,
    };

    match payment_link_repo::create(pool.get_ref(), &link).await {
        Ok(created) => {
            log::info!("[PAYMENT] Created payment link: {} (provider: {:?}, order: {:?})", created.id, created.payment_provider, provider_order_id);
            
            // Publish paymentlink.created event so notification-service sends email
            let _ = publisher.publish_paymentlink_created(
                &created.user_id,
                &created.id,
                &created.title,
                &created.description,
                created.amount,
                &created.currency,
                &created.url,
                created.invoice_id.as_deref(),
                body.client_name.as_deref(),
                body.client_email.as_deref(),
            ).await;

            HttpResponse::Created().json(created)
        }
        Err(e) => {
            log::error!("[PAYMENT] Failed to create payment link: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to create payment link"}))
        }
    }
}

pub async fn update(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    path: web::Path<String>,
    body: web::Json<UpdatePaymentLinkRequest>,
) -> HttpResponse {
    let user_id = get_user_id(&req);
    let id = path.into_inner();

    match payment_link_repo::update(
        pool.get_ref(),
        &id,
        &user_id,
        body.title.as_deref(),
        body.description.as_deref(),
        body.amount,
        body.status.as_deref(),
    ).await {
        Ok(updated) => HttpResponse::Ok().json(updated),
        Err(_) => HttpResponse::NotFound().json(serde_json::json!({"error": "Payment link not found"})),
    }
}

pub async fn delete(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    path: web::Path<String>,
) -> HttpResponse {
    let user_id = get_user_id(&req);
    let id = path.into_inner();

    match payment_link_repo::delete(pool.get_ref(), &id, &user_id).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({"message": "Payment link deleted"})),
        Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to delete"})),
    }
}

#[derive(serde::Deserialize)]
pub struct BulkDeleteRequest {
    pub ids: Vec<String>,
}

pub async fn bulk_delete(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    body: web::Json<BulkDeleteRequest>,
) -> HttpResponse {
    let user_id = get_user_id(&req);
    
    if body.ids.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({"error": "ids array is required"}));
    }

    match payment_link_repo::bulk_delete(pool.get_ref(), &body.ids, &user_id).await {
        Ok(deleted) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Payment links deleted",
            "deleted": deleted
        })),
        Err(e) => {
            log::error!("[PAYMENT] Failed to bulk delete payment links: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to delete"}))
        }
    }
}

/// DELETE /payments/by-invoice/{invoice_id} — Cascade delete payment links when an invoice is deleted
pub async fn delete_by_invoice(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    path: web::Path<String>,
) -> HttpResponse {
    let user_id = get_user_id(&req);
    let invoice_id = path.into_inner();

    match payment_link_repo::delete_by_invoice_id(pool.get_ref(), &invoice_id, &user_id).await {
        Ok(deleted) => {
            log::info!("[PAYMENT] Cascade deleted {} payment links for invoice {}", deleted, invoice_id);
            HttpResponse::Ok().json(serde_json::json!({
                "message": "Payment links cleaned up",
                "deleted": deleted
            }))
        }
        Err(e) => {
            log::error!("[PAYMENT] Failed to cascade delete payment links for invoice {}: {}", invoice_id, e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to delete payment links"}))
        }
    }
}

#[derive(serde::Deserialize)]
pub struct BulkInvoiceDeleteRequest {
    pub invoice_ids: Vec<String>,
}

/// POST /payments/by-invoices — Cascade delete payment links when multiple invoices are deleted
pub async fn delete_by_invoices(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    body: web::Json<BulkInvoiceDeleteRequest>,
) -> HttpResponse {
    let user_id = get_user_id(&req);

    if body.invoice_ids.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({"error": "invoice_ids array is required"}));
    }

    match payment_link_repo::delete_by_invoice_ids(pool.get_ref(), &body.invoice_ids, &user_id).await {
        Ok(deleted) => {
            log::info!("[PAYMENT] Cascade deleted {} payment links for {} invoices", deleted, body.invoice_ids.len());
            HttpResponse::Ok().json(serde_json::json!({
                "message": "Payment links cleaned up",
                "deleted": deleted
            }))
        }
        Err(e) => {
            log::error!("[PAYMENT] Failed to cascade delete payment links: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to delete payment links"}))
        }
    }
}

pub async fn get_public(
    pool: web::Data<PgPool>,
    path: web::Path<String>,
) -> HttpResponse {
    let id = path.into_inner();

    match payment_link_repo::find_by_id_public(pool.get_ref(), &id).await {
        Ok(link) => HttpResponse::Ok().json(serde_json::json!({
            "id": link.id,
            "title": link.title,
            "description": link.description,
            "amount": link.amount,
            "currency": link.currency,
            "status": link.status,
            "url": link.url,
            "payment_provider": link.payment_provider,
            "provider_order_id": link.provider_order_id,
        })),
        Err(_) => HttpResponse::NotFound().json(serde_json::json!({"error": "Payment link not found"})),
    }
}

/// POST /pay/{id}/checkout — Create PayPal order on-demand when payer clicks "Pay"
/// Returns the PayPal approval URL for redirect
pub async fn checkout(
    pool: web::Data<PgPool>,
    paypal_client: web::Data<Arc<PaypalClient>>,
    base_url: web::Data<Arc<BasePaymentUrl>>,
    path: web::Path<String>,
) -> HttpResponse {
    let id = path.into_inner();

    // Get payment link (public — no user_id check)
    let link = match payment_link_repo::find_by_id_public(pool.get_ref(), &id).await {
        Ok(l) => l,
        Err(_) => {
            return HttpResponse::NotFound().json(serde_json::json!({"error": "Payment link not found"}));
        }
    };

    if link.status == "completed" {
        return HttpResponse::BadRequest().json(serde_json::json!({"error": "Pembayaran sudah selesai"}));
    }

    let provider = link.payment_provider.as_deref().unwrap_or("manual");

    if provider != "paypal" {
        return HttpResponse::BadRequest().json(serde_json::json!({"error": "Payment link ini bukan PayPal"}));
    }

    if !paypal_client.is_configured() {
        return HttpResponse::BadRequest().json(serde_json::json!({"error": "PayPal belum dikonfigurasi"}));
    }

    // Get user's PayPal email (payee)
    let paypal_account = match paypal_account_repo::find_by_user_id(pool.get_ref(), &link.user_id).await {
        Ok(acc) => acc,
        Err(_) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Pemilik payment link belum menghubungkan PayPal"
            }));
        }
    };

    let return_url = format!("{}/{}/paypal-return", base_url.0, id);
    let cancel_url = format!("{}/{}/paypal-cancel", base_url.0, id);

    match paypal_client.create_order(
        &id,
        link.amount,
        &link.currency,
        &link.title,
        &paypal_account.paypal_email,
        Some(&return_url),
        Some(&cancel_url),
    ).await {
        Ok(order) => {
            // Save the PayPal order ID to the payment link
            let _ = sqlx::query(
                "UPDATE payment_links SET provider_order_id = $1, updated_at = NOW() WHERE id = $2"
            )
            .bind(&order.id)
            .bind(&id)
            .execute(pool.get_ref())
            .await;

            let approve_url = order.links.iter()
                .find(|l| l.rel == "approve")
                .map(|l| l.href.clone())
                .unwrap_or_default();

            log::info!("[PAYMENT] Created PayPal checkout for link {} -> order {}", id, order.id);

            HttpResponse::Ok().json(serde_json::json!({
                "order_id": order.id,
                "approve_url": approve_url
            }))
        }
        Err(e) => {
            log::error!("[PAYMENT] PayPal checkout failed: {}", e);
            HttpResponse::BadGateway().json(serde_json::json!({
                "error": "Gagal membuat order PayPal",
                "details": e.to_string()
            }))
        }
    }
}

/// POST /pay-capture/{id} — Public capture endpoint for PayPal return flow
/// Called by the PayPal return page after payer approves the order
/// This captures the order via PayPal API and marks the payment link as completed
pub async fn capture_public(
    pool: web::Data<PgPool>,
    paypal_client: web::Data<Arc<PaypalClient>>,
    publisher: web::Data<Arc<crate::messaging::publisher::EventPublisher>>,
    path: web::Path<String>,
) -> HttpResponse {
    let id = path.into_inner();

    // Get payment link (public — no user_id check)
    let link = match payment_link_repo::find_by_id_public(pool.get_ref(), &id).await {
        Ok(l) => l,
        Err(_) => {
            return HttpResponse::NotFound().json(serde_json::json!({"error": "Payment link not found"}));
        }
    };

    // Already completed — return success (idempotent)
    if link.status == "completed" {
        return HttpResponse::Ok().json(serde_json::json!({
            "status": "completed",
            "message": "Pembayaran sudah selesai"
        }));
    }

    let provider = link.payment_provider.as_deref().unwrap_or("manual");
    if provider != "paypal" {
        return HttpResponse::BadRequest().json(serde_json::json!({"error": "Payment link ini bukan PayPal"}));
    }

    let order_id = match &link.provider_order_id {
        Some(oid) if !oid.is_empty() => oid.clone(),
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "PayPal order belum dibuat untuk payment link ini"
            }));
        }
    };

    if !paypal_client.is_configured() {
        return HttpResponse::BadRequest().json(serde_json::json!({"error": "PayPal belum dikonfigurasi"}));
    }

    // Capture the approved PayPal order
    match paypal_client.capture_order(&order_id).await {
        Ok(capture) => {
            if capture.status == "COMPLETED" {
                // Mark payment as completed in database
                match payment_link_repo::mark_payment_completed(pool.get_ref(), &link.id).await {
                    Ok(updated_link) => {
                        // Publish event to notification service
                        let _ = publisher.publish_payment_completed(
                            &updated_link.user_id,
                            &updated_link.id,
                            updated_link.invoice_id.as_deref(),
                            updated_link.amount,
                            "PayPal Customer",
                            "",
                            &updated_link.title,
                        ).await;

                        log::info!("[PAYMENT] PayPal payment captured via return flow: link={} order={}", id, order_id);
                    }
                    Err(e) => {
                        log::error!("[PAYMENT] Failed to update payment link after capture: {}", e);
                    }
                }

                HttpResponse::Ok().json(serde_json::json!({
                    "status": "completed",
                    "order_id": capture.id,
                    "message": "Pembayaran berhasil"
                }))
            } else {
                log::warn!("[PAYMENT] PayPal capture status: {} for order {}", capture.status, order_id);
                HttpResponse::Ok().json(serde_json::json!({
                    "status": capture.status.to_lowercase(),
                    "order_id": capture.id
                }))
            }
        }
        Err(e) => {
            // If capture fails with "ORDER_ALREADY_CAPTURED", it means webhook already handled it
            let err_str = e.to_string();
            if err_str.contains("ORDER_ALREADY_CAPTURED") || err_str.contains("UNPROCESSABLE_ENTITY") {
                // Check if payment was already completed by webhook
                if let Ok(current) = payment_link_repo::find_by_id_public(pool.get_ref(), &id).await {
                    if current.status == "completed" {
                        return HttpResponse::Ok().json(serde_json::json!({
                            "status": "completed",
                            "message": "Pembayaran sudah diproses"
                        }));
                    }
                }
                // If not yet completed, mark it (webhook captured but didn't update our DB)
                let _ = payment_link_repo::mark_payment_completed(pool.get_ref(), &id).await;
                return HttpResponse::Ok().json(serde_json::json!({
                    "status": "completed",
                    "message": "Pembayaran berhasil"
                }));
            }

            log::error!("[PAYMENT] PayPal capture failed for link {}: {}", id, e);
            HttpResponse::BadGateway().json(serde_json::json!({
                "error": "Gagal capture pembayaran PayPal",
                "details": err_str
            }))
        }
    }
}

/// GET /pay-status/{id} — Public status check endpoint (works for both Xendit and PayPal)
/// Called by frontend to verify payment status when webhook hasn't arrived yet.
/// For Xendit: queries Xendit API to check invoice status, auto-completes if PAID/SETTLED.
/// For PayPal: just returns current DB status (capture is handled by /pay-capture/{id}).
pub async fn check_status_public(
    pool: web::Data<PgPool>,
    xendit_client: web::Data<Arc<XenditClient>>,
    publisher: web::Data<Arc<crate::messaging::publisher::EventPublisher>>,
    path: web::Path<String>,
) -> HttpResponse {
    let id = path.into_inner();

    // Get payment link (public)
    let link = match payment_link_repo::find_by_id_public(pool.get_ref(), &id).await {
        Ok(l) => l,
        Err(_) => {
            return HttpResponse::NotFound().json(serde_json::json!({"error": "Payment link not found"}));
        }
    };

    // Already completed — return immediately
    if link.status == "completed" {
        return HttpResponse::Ok().json(serde_json::json!({
            "status": "completed",
            "message": "Pembayaran sudah selesai"
        }));
    }

    let provider = link.payment_provider.as_deref().unwrap_or("manual");

    match provider {
        "xendit" => {
            // Need the Xendit invoice ID (stored as provider_order_id)
            let invoice_id = match &link.provider_order_id {
                Some(oid) if !oid.is_empty() => oid.clone(),
                _ => {
                    return HttpResponse::Ok().json(serde_json::json!({
                        "status": "pending",
                        "message": "Menunggu pembayaran"
                    }));
                }
            };

            // Need the user's xendit_user_id for the for-user-id header
            let xendit_user_id = match xendit_account_repo::find_by_user_id(pool.get_ref(), &link.user_id).await {
                Ok(acc) => acc.xendit_user_id,
                Err(_) => {
                    log::warn!("[PAYMENT] No Xendit account for user {} on status check", link.user_id);
                    return HttpResponse::Ok().json(serde_json::json!({
                        "status": "pending",
                        "message": "Menunggu konfirmasi webhook"
                    }));
                }
            };

            // Query Xendit API for actual invoice status
            match xendit_client.get_invoice_status(&xendit_user_id, &invoice_id).await {
                Ok(xendit_status) => {
                    match xendit_status.as_str() {
                        "PAID" | "SETTLED" => {
                            // Mark completed in DB
                            if let Ok(updated) = payment_link_repo::mark_payment_completed(pool.get_ref(), &link.id).await {
                                let _ = publisher.publish_payment_completed(
                                    &updated.user_id,
                                    &updated.id,
                                    updated.invoice_id.as_deref(),
                                    updated.amount,
                                    "Xendit Customer",
                                    "",
                                    &updated.title,
                                ).await;
                                log::info!("[PAYMENT] Xendit payment confirmed via status check: link={} invoice={}", id, invoice_id);
                            }

                            HttpResponse::Ok().json(serde_json::json!({
                                "status": "completed",
                                "message": "Pembayaran Xendit berhasil"
                            }))
                        }
                        "EXPIRED" => {
                            HttpResponse::Ok().json(serde_json::json!({
                                "status": "expired",
                                "message": "Pembayaran sudah kedaluwarsa"
                            }))
                        }
                        other => {
                            HttpResponse::Ok().json(serde_json::json!({
                                "status": "pending",
                                "xendit_status": other,
                                "message": "Menunggu pembayaran"
                            }))
                        }
                    }
                }
                Err(e) => {
                    log::error!("[PAYMENT] Xendit status check failed: {}", e);
                    HttpResponse::Ok().json(serde_json::json!({
                        "status": "pending",
                        "message": "Tidak dapat memverifikasi, menunggu konfirmasi webhook"
                    }))
                }
            }
        }
        // For PayPal and others, just return current DB status
        _ => {
            HttpResponse::Ok().json(serde_json::json!({
                "status": link.status,
                "message": if link.status == "active" { "Menunggu pembayaran" } else { "Status pembayaran" }
            }))
        }
    }
}

