//! Auth service — register, login, Google OAuth, profile, admin.

use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use crate::error::AppError;
use crate::middleware::{self, Auth};
use crate::utils;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password: Option<String>,
    #[serde(default)] pub company: String,
    #[serde(default)] pub phone: String,
    #[serde(default = "default_role")] pub role: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}
fn default_role() -> String { "user".into() }

#[derive(Debug, Deserialize)] pub struct RegisterReq { pub name: String, pub email: String, pub password: String, #[serde(default)] pub company: String, #[serde(default)] pub phone: String }
#[derive(Debug, Deserialize)] pub struct LoginReq { pub email: String, pub password: String }
#[derive(Debug, Deserialize)] pub struct GoogleLoginReq { pub id_token: String }
#[derive(Debug, Deserialize)] pub struct RefreshReq { pub refresh_token: String }
#[derive(Debug, Deserialize)] pub struct UpdateProfileReq { pub name: String, #[serde(default)] pub company: String, #[serde(default)] pub phone: String }
#[derive(Debug, Deserialize)] pub struct ChangePasswordReq { pub old_password: String, pub new_password: String }

#[derive(Debug, Serialize)]
pub struct AuthResponse { pub token: String, pub refresh_token: String, pub user: User }

fn db(http: &reqwest::Client) -> Result<crate::db::NeonClient, AppError> {
    utils::get_db("AUTH_DB_URL", http)
}

pub async fn register(body: web::Json<RegisterReq>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    if body.name.is_empty() || body.email.is_empty() || body.password.len() < 6 {
        return utils::json_error("Name, email, and password (min 6 chars) are required", 400);
    }
    let db = db(&http)?;
    let jwt_secret = utils::get_env("JWT_SECRET");
    let existing: Option<User> = db.query_one(
        "SELECT id, name, email, password, company, phone, role, created_at::text, updated_at::text FROM users WHERE email = $1",
        &[serde_json::json!(body.email)],
    ).await?;
    if existing.is_some() { return utils::json_error("Email already registered", 409); }
    let hashed = bcrypt::hash(&body.password, bcrypt::DEFAULT_COST)
        .map_err(|e| AppError(format!("Hash error: {}", e)))?;
    let id = utils::generate_id();
    db.execute(
        "INSERT INTO users (id, name, email, password, company, phone, role, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,'user',NOW(),NOW())",
        &[serde_json::json!(id), serde_json::json!(body.name), serde_json::json!(body.email),
          serde_json::json!(hashed), serde_json::json!(body.company), serde_json::json!(body.phone)],
    ).await?;
    let user = User { id: id.clone(), name: body.name.clone(), email: body.email.clone(), password: None, company: body.company.clone(), phone: body.phone.clone(), role: "user".into(), created_at: None, updated_at: None };
    let token = middleware::generate_jwt(&id, &body.email, "user", &jwt_secret, 24).map_err(|e| AppError(e))?;
    let refresh = middleware::generate_refresh_token(&id, &jwt_secret).map_err(|e| AppError(e))?;
    utils::json_response(&AuthResponse { token, refresh_token: refresh, user }, 201)
}

pub async fn login(body: web::Json<LoginReq>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let db = db(&http)?;
    let jwt_secret = utils::get_env("JWT_SECRET");
    let user: Option<User> = db.query_one(
        "SELECT id, name, email, password, company, phone, role, created_at::text, updated_at::text FROM users WHERE email = $1",
        &[serde_json::json!(body.email)],
    ).await?;
    let user = match user { Some(u) => u, None => return utils::json_error("Invalid email or password", 401) };
    let pw_hash = user.password.clone().unwrap_or_default();
    if !bcrypt::verify(&body.password, &pw_hash).unwrap_or(false) {
        return utils::json_error("Invalid email or password", 401);
    }
    let token = middleware::generate_jwt(&user.id, &user.email, &user.role, &jwt_secret, 24).map_err(|e| AppError(e))?;
    let refresh = middleware::generate_refresh_token(&user.id, &jwt_secret).map_err(|e| AppError(e))?;
    let mut u = user; u.password = None;
    utils::json_response(&AuthResponse { token, refresh_token: refresh, user: u }, 200)
}

pub async fn google_login(body: web::Json<GoogleLoginReq>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let google_url = format!("https://www.googleapis.com/oauth2/v3/userinfo?access_token={}", body.id_token);
    let google_resp = http.get(&google_url).send().await?;
    if !google_resp.status().is_success() { return utils::json_error("Invalid Google token", 401); }
    let google_user: serde_json::Value = google_resp.json().await?;
    let email = google_user.get("email").and_then(|v| v.as_str()).unwrap_or("");
    let name = google_user.get("name").and_then(|v| v.as_str()).unwrap_or("");
    if email.is_empty() { return utils::json_error("Email not provided by Google", 400); }
    let db = db(&http)?;
    let jwt_secret = utils::get_env("JWT_SECRET");
    let user: Option<User> = db.query_one(
        "SELECT id, name, email, password, company, phone, role, created_at::text, updated_at::text FROM users WHERE email = $1",
        &[serde_json::json!(email)],
    ).await?;
    let user = match user {
        Some(u) => u,
        None => {
            let id = utils::generate_id();
            let hashed = bcrypt::hash(&utils::generate_id(), bcrypt::DEFAULT_COST).map_err(|e| AppError(format!("{}", e)))?;
            db.execute("INSERT INTO users (id, name, email, password, role, created_at, updated_at) VALUES ($1,$2,$3,$4,'user',NOW(),NOW())",
                &[serde_json::json!(id), serde_json::json!(name), serde_json::json!(email), serde_json::json!(hashed)]).await?;
            User { id, name: name.to_string(), email: email.to_string(), password: None, company: String::new(), phone: String::new(), role: "user".into(), created_at: None, updated_at: None }
        }
    };
    let token = middleware::generate_jwt(&user.id, &user.email, &user.role, &jwt_secret, 24).map_err(|e| AppError(e))?;
    let refresh = middleware::generate_refresh_token(&user.id, &jwt_secret).map_err(|e| AppError(e))?;
    let mut u = user; u.password = None;
    utils::json_response(&AuthResponse { token, refresh_token: refresh, user: u }, 200)
}

pub async fn refresh_token(body: web::Json<RefreshReq>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let jwt_secret = utils::get_env("JWT_SECRET");
    let claims = middleware::validate_jwt(&body.refresh_token, &jwt_secret).map_err(|_| AppError("Invalid refresh token".into()))?;
    let db = db(&http)?;
    let user: Option<User> = db.query_one("SELECT id, name, email, password, company, phone, role, created_at::text, updated_at::text FROM users WHERE id = $1", &[serde_json::json!(claims.user_id)]).await?;
    let user = match user { Some(u) => u, None => return utils::json_error("User not found", 401) };
    let token = middleware::generate_jwt(&user.id, &user.email, &user.role, &jwt_secret, 24).map_err(|e| AppError(e))?;
    let refresh = middleware::generate_refresh_token(&user.id, &jwt_secret).map_err(|e| AppError(e))?;
    let mut u = user; u.password = None;
    utils::json_response(&AuthResponse { token, refresh_token: refresh, user: u }, 200)
}

pub async fn profile(auth: Auth, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let db = db(&http)?;
    let user: Option<User> = db.query_one("SELECT id, name, email, company, phone, role, created_at::text, updated_at::text FROM users WHERE id = $1", &[serde_json::json!(auth.0.user_id)]).await?;
    match user { Some(u) => utils::json_response(&u, 200), None => utils::json_error("User not found", 404) }
}

pub async fn update_profile(auth: Auth, body: web::Json<UpdateProfileReq>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let db = db(&http)?;
    db.execute("UPDATE users SET name=$1, company=$2, phone=$3, updated_at=NOW() WHERE id=$4",
        &[serde_json::json!(body.name), serde_json::json!(body.company), serde_json::json!(body.phone), serde_json::json!(auth.0.user_id)]).await?;
    let user: Option<User> = db.query_one("SELECT id, name, email, company, phone, role, created_at::text, updated_at::text FROM users WHERE id = $1", &[serde_json::json!(auth.0.user_id)]).await?;
    match user { Some(u) => utils::json_response(&u, 200), None => utils::json_error("User not found", 404) }
}

pub async fn change_password(auth: Auth, body: web::Json<ChangePasswordReq>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let db = db(&http)?;
    let user: Option<User> = db.query_one("SELECT id, name, email, password, company, phone, role, created_at::text, updated_at::text FROM users WHERE id = $1", &[serde_json::json!(auth.0.user_id)]).await?;
    let user = match user { Some(u) => u, None => return utils::json_error("User not found", 404) };
    if !bcrypt::verify(&body.old_password, &user.password.unwrap_or_default()).unwrap_or(false) {
        return utils::json_error("Incorrect old password", 401);
    }
    if body.new_password.len() < 6 { return utils::json_error("New password must be at least 6 characters", 400); }
    let hashed = bcrypt::hash(&body.new_password, bcrypt::DEFAULT_COST).map_err(|e| AppError(format!("{}", e)))?;
    db.execute("UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2", &[serde_json::json!(hashed), serde_json::json!(auth.0.user_id)]).await?;
    utils::json_response(&serde_json::json!({"message": "Password updated successfully"}), 200)
}

pub async fn get_user_by_id(path: web::Path<String>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    let uid = path.into_inner();
    let db = db(&http)?;
    let user: Option<User> = db.query_one("SELECT id, name, email, company, phone, role, created_at::text, updated_at::text FROM users WHERE id = $1", &[serde_json::json!(uid)]).await?;
    match user {
        Some(u) => utils::json_response(&serde_json::json!({"id": u.id, "name": u.name, "email": u.email}), 200),
        None => utils::json_error("User not found", 404),
    }
}

pub async fn list_users(req: HttpRequest, auth: Auth, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    if auth.0.role != "admin" { return utils::json_error("Forbidden: Admin access required", 403); }
    let qs = req.query_string();
    let search = utils::query_param(qs, "search").unwrap_or_default();
    let (page, per_page) = utils::parse_pagination(qs);
    let offset = (page - 1) * per_page;
    let db = db(&http)?;
    let users: Vec<User> = db.query_typed(
        "SELECT id, name, email, company, phone, role, created_at::text, updated_at::text FROM users WHERE ($1::text = '' OR email ILIKE $2 OR name ILIKE $2) ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        &[serde_json::json!(search), serde_json::json!(format!("%{}%", search)), serde_json::json!(per_page), serde_json::json!(offset)],
    ).await?;
    let total: i64 = db.query_scalar("SELECT COUNT(*) FROM users WHERE ($1::text = '' OR email ILIKE $2 OR name ILIKE $2)",
        &[serde_json::json!(search), serde_json::json!(format!("%{}%", search))]).await?;
    utils::json_response(&serde_json::json!({"data": users, "total": total, "page": page}), 200)
}

pub async fn update_role(path: web::Path<String>, auth: Auth, body: web::Json<serde_json::Value>, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    if auth.0.role != "admin" { return utils::json_error("Forbidden: Admin access required", 403); }
    let target_id = path.into_inner();
    let role = body.get("role").and_then(|v| v.as_str()).unwrap_or("");
    if role.is_empty() { return utils::json_error("role is required", 400); }
    let db = db(&http)?;
    db.execute("UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2", &[serde_json::json!(role), serde_json::json!(target_id)]).await?;
    utils::json_response(&serde_json::json!({"message": "Role updated successfully"}), 200)
}

pub async fn delete_user(path: web::Path<String>, auth: Auth, http: web::Data<reqwest::Client>) -> Result<HttpResponse, AppError> {
    if auth.0.role != "admin" { return utils::json_error("Forbidden: Admin access required", 403); }
    let target_id = path.into_inner();
    let db = db(&http)?;
    db.execute("DELETE FROM users WHERE id=$1", &[serde_json::json!(target_id)]).await?;
    utils::json_response(&serde_json::json!({"message": "User deleted successfully"}), 200)
}
