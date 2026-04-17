use actix_web::{web, HttpRequest, HttpResponse};
use sqlx::PgPool;
use chrono::Utc;
use uuid::Uuid;
use std::sync::Arc;

use crate::models::xendit_account::{CreateXenditAccountRequest, XenditAccount, XenditAccountResponse};
use crate::repository::xendit_account_repo;
use crate::services::xendit::XenditClient;

fn get_user_id(req: &HttpRequest) -> String {
    req.headers()
        .get("X-User-ID")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string()
}

/// POST /payments/xendit/setup — Create Xendit sub-account for tenant
pub async fn setup(
    req: HttpRequest,
    pool: web::Data<PgPool>,
    xendit_client: web::Data<Arc<XenditClient>>,
    body: web::Json<CreateXenditAccountRequest>,
) -> HttpResponse {
    let user_id = get_user_id(&req);
    if user_id.is_empty() {
        return HttpResponse::Unauthorized().json(serde_json::json!({"error": "Unauthorized"}));
    }

    // Check if already has account
    if let Ok(existing) = xendit_account_repo::find_by_user_id(pool.get_ref(), &user_id).await {
        return HttpResponse::Conflict().json(serde_json::json!({
            "error": "Xendit account already exists",
            "account": XenditAccountResponse::from(existing)
        }));
    }

    // Create sub-account via Xendit API
    let xendit_response = match xendit_client.create_sub_account(
        &body.account_email,
        &body.business_name,
    ).await {
        Ok(resp) => resp,
        Err(e) => {
            log::error!("[PAYMENT] Failed to create Xendit sub-account: {}", e);
            return HttpResponse::BadGateway().json(serde_json::json!({
                "error": "Failed to create Xendit account",
                "details": e.to_string()
            }));
        }
    };

    // Save to DB
    let now = Utc::now();
    let account = XenditAccount {
        id: Uuid::new_v4().to_string(),
        user_id,
        xendit_user_id: xendit_response.id,
        account_email: body.account_email.clone(),
        business_name: body.business_name.clone(),
        status: xendit_response.status.unwrap_or_else(|| "REGISTERED".to_string()),
        account_type: "MANAGED".to_string(),
        platform_fee_percent: 1.0,
        created_at: now,
        updated_at: now,
    };

    match xendit_account_repo::create(pool.get_ref(), &account).await {
        Ok(created) => {
            log::info!("[PAYMENT] Created Xendit sub-account for user: {}", created.user_id);
            HttpResponse::Created().json(XenditAccountResponse::from(created))
        }
        Err(e) => {
            log::error!("[PAYMENT] Failed to save Xendit account: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "Failed to save account"}))
        }
    }
}

/// GET /payments/xendit/account — Get tenant's Xendit account
pub async fn get_account(
    req: HttpRequest,
    pool: web::Data<PgPool>,
) -> HttpResponse {
    let user_id = get_user_id(&req);

    match xendit_account_repo::find_by_user_id(pool.get_ref(), &user_id).await {
        Ok(account) => HttpResponse::Ok().json(XenditAccountResponse::from(account)),
        Err(_) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Xendit account not found. Please setup first via POST /payments/xendit/setup"
        })),
    }
}
