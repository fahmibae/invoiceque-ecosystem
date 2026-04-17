use actix_web::{web, HttpRequest, HttpResponse};
use sqlx::PgPool;
use chrono::Utc;
use uuid::Uuid;
use std::sync::Arc;

use crate::models::payment_link::{
    CreatePaymentLinkRequest, UpdatePaymentLinkRequest, PaymentLinkListResponse,
};
use crate::models::xendit_account::{XenditCreateInvoicePayload, XenditCustomer};
use crate::repository::{payment_link_repo, xendit_account_repo};
use crate::models::payment_link::PaymentLink;
use crate::services::xendit::XenditClient;

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
    base_url: web::Data<Arc<String>>,
    xendit_client: web::Data<Arc<XenditClient>>,
) -> HttpResponse {
    let user_id = get_user_id(&req);
    let id = Uuid::new_v4().to_string()[..8].to_uppercase();
    let now = Utc::now();
    let amount = body.amount;

    // Try to create Xendit invoice if tenant has sub-account
    let (url, xendit_invoice_id) = match xendit_account_repo::find_by_user_id(pool.get_ref(), &user_id).await {
        Ok(xendit_account) => {
            // Tenant has Xendit sub-account — create invoice via Xendit
            let invoice_payload = XenditCreateInvoicePayload {
                external_id: id.clone(),
                amount,
                description: body.title.clone(),
                currency: body.currency.clone().unwrap_or_else(|| "IDR".to_string()),
                customer: None,
                success_redirect_url: None,
                failure_redirect_url: None,
                invoice_duration: Some(86400), // 24 hours
            };

            match xendit_client.create_invoice(
                &xendit_account.xendit_user_id,
                &invoice_payload,
            ).await {
                Ok(xendit_resp) => {
                    log::info!("[PAYMENT] Created Xendit invoice {} for user {}", xendit_resp.id, user_id);
                    (xendit_resp.invoice_url, Some(xendit_resp.id))
                }
                Err(e) => {
                    log::error!("[PAYMENT] Xendit invoice creation failed: {}, falling back to direct URL", e);
                    let fallback_url = format!("{}/{}", base_url.as_ref(), id);
                    (fallback_url, None)
                }
            }
        }
        Err(_) => {
            // No Xendit account — use direct payment URL
            let direct_url = format!("{}/{}", base_url.as_ref(), id);
            (direct_url, None)
        }
    };

    let link = PaymentLink {
        id: id.clone(),
        user_id,
        title: body.title.clone(),
        description: body.description.clone().unwrap_or_default(),
        amount,
        currency: body.currency.clone().unwrap_or_else(|| "IDR".to_string()),
        status: "active".to_string(),
        url,
        clicks: 0,
        payments: 0,
        invoice_id: body.invoice_id.clone(),
        expires_at: None,
        created_at: now,
        updated_at: now,
    };

    match payment_link_repo::create(pool.get_ref(), &link).await {
        Ok(created) => {
            log::info!("[PAYMENT] Created payment link: {} (xendit: {:?})", created.id, xendit_invoice_id);
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
        })),
        Err(_) => HttpResponse::NotFound().json(serde_json::json!({"error": "Payment link not found"})),
    }
}
