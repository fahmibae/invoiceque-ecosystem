//! Client service — CRUD operations.

use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use crate::error::AppError;
use crate::middleware::Auth;
use crate::utils;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Client {
    pub id: String, pub user_id: String, pub name: String, pub email: String,
    #[serde(default)] pub phone: String, #[serde(default)] pub company: String,
    #[serde(default)] pub address: String, #[serde(default)] pub city: String,
    #[serde(default)] pub total_invoices: i32, #[serde(default)] pub total_spent: f64,
    pub created_at: Option<String>, pub updated_at: Option<String>,
}

const CL_COLS: &str = "id, user_id, name, email, phone, company, address, city, total_invoices, total_spent, created_at::text, updated_at::text";

fn db(http: &reqwest::Client) -> Result<crate::db::NeonClient, AppError> { utils::get_db("CLIENT_DB_URL", http) }

pub async fn list(req: HttpRequest, auth: Auth, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let qs = req.query_string();
    let search = utils::query_param(qs, "search").unwrap_or_default();
    let (page, per_page) = utils::parse_pagination(qs);
    let offset = (page - 1) * per_page;
    let db = db(&http)?;
    let (total, clients): (i64, Vec<Client>) = if search.is_empty() {
        let t: i64 = db.query_scalar("SELECT COUNT(*) FROM clients WHERE user_id = $1", &[serde_json::json!(auth.0.user_id)]).await?;
        let c: Vec<Client> = db.query_typed(&format!("SELECT {} FROM clients WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", CL_COLS),
            &[serde_json::json!(auth.0.user_id), serde_json::json!(per_page), serde_json::json!(offset)]).await?;
        (t, c)
    } else {
        let like = format!("%{}%", search);
        let t: i64 = db.query_scalar("SELECT COUNT(*) FROM clients WHERE user_id = $1 AND (name ILIKE $2 OR email ILIKE $2 OR company ILIKE $2)",
            &[serde_json::json!(auth.0.user_id), serde_json::json!(like)]).await?;
        let c: Vec<Client> = db.query_typed(&format!("SELECT {} FROM clients WHERE user_id = $1 AND (name ILIKE $2 OR email ILIKE $2 OR company ILIKE $2) ORDER BY created_at DESC LIMIT $3 OFFSET $4", CL_COLS),
            &[serde_json::json!(auth.0.user_id), serde_json::json!(like), serde_json::json!(per_page), serde_json::json!(offset)]).await?;
        (t, c)
    };
    let total_pages = ((total as i32) + per_page - 1) / per_page;
    utils::json_response(&serde_json::json!({"data": clients, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}), 200)
}

pub async fn get(path: web::Path<String>, auth: Auth, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    let client: Option<Client> = db.query_one(&format!("SELECT {} FROM clients WHERE id = $1 AND user_id = $2", CL_COLS),
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    match client { Some(c) => utils::json_response(&c, 200), None => utils::json_error("Client not found", 404) }
}

pub async fn create(auth: Auth, body: web::Json<serde_json::Value>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let name = body.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let email = body.get("email").and_then(|v| v.as_str()).unwrap_or("");
    if name.is_empty() || email.is_empty() { return utils::json_error("Name and email are required", 400); }
    let id = utils::generate_id();
    let db = db(&http)?;
    db.execute("INSERT INTO clients (id,user_id,name,email,phone,company,address,city,total_invoices,total_spent,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,0,NOW(),NOW())",
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id), serde_json::json!(name), serde_json::json!(email),
          serde_json::json!(body.get("phone").and_then(|v| v.as_str()).unwrap_or("")),
          serde_json::json!(body.get("company").and_then(|v| v.as_str()).unwrap_or("")),
          serde_json::json!(body.get("address").and_then(|v| v.as_str()).unwrap_or("")),
          serde_json::json!(body.get("city").and_then(|v| v.as_str()).unwrap_or(""))]).await?;
    let client: Option<Client> = db.query_one(&format!("SELECT {} FROM clients WHERE id = $1 AND user_id = $2", CL_COLS),
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    match client { Some(c) => utils::json_response(&c, 201), None => utils::json_error("Failed to create client", 500) }
}

pub async fn update(path: web::Path<String>, auth: Auth, body: web::Json<serde_json::Value>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    let existing: Option<Client> = db.query_one(&format!("SELECT {} FROM clients WHERE id=$1 AND user_id=$2", CL_COLS),
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    let ex = match existing { Some(c) => c, None => return utils::json_error("Client not found", 404) };
    db.execute("UPDATE clients SET name=$1,email=$2,phone=$3,company=$4,address=$5,city=$6,updated_at=NOW() WHERE id=$7 AND user_id=$8",
        &[serde_json::json!(body.get("name").and_then(|v| v.as_str()).unwrap_or(&ex.name)),
          serde_json::json!(body.get("email").and_then(|v| v.as_str()).unwrap_or(&ex.email)),
          serde_json::json!(body.get("phone").and_then(|v| v.as_str()).unwrap_or(&ex.phone)),
          serde_json::json!(body.get("company").and_then(|v| v.as_str()).unwrap_or(&ex.company)),
          serde_json::json!(body.get("address").and_then(|v| v.as_str()).unwrap_or(&ex.address)),
          serde_json::json!(body.get("city").and_then(|v| v.as_str()).unwrap_or(&ex.city)),
          serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    let client: Option<Client> = db.query_one(&format!("SELECT {} FROM clients WHERE id = $1 AND user_id = $2", CL_COLS),
        &[serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    match client { Some(c) => utils::json_response(&c, 200), None => utils::json_error("Client not found", 404) }
}

pub async fn delete(path: web::Path<String>, auth: Auth, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let id = path.into_inner();
    let db = db(&http)?;
    db.execute("DELETE FROM clients WHERE id=$1 AND user_id=$2", &[serde_json::json!(id), serde_json::json!(auth.0.user_id)]).await?;
    utils::json_response(&serde_json::json!({"message": "Client deleted successfully"}), 200)
}

pub async fn bulk_delete(auth: Auth, body: web::Json<serde_json::Value>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let ids: Vec<String> = body.get("ids").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default();
    if ids.is_empty() { return utils::json_error("ids is required", 400); }
    let db = db(&http)?;
    let deleted = db.execute("DELETE FROM clients WHERE user_id=$1 AND id=ANY($2)",
        &[serde_json::json!(auth.0.user_id), serde_json::json!(utils::to_pg_array(&ids))]).await?;
    utils::json_response(&serde_json::json!({"message": "Clients deleted", "deleted": deleted}), 200)
}
