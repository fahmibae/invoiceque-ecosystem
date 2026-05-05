//! Auth service module — register, login, Google OAuth, profile, admin.
//! Mirrors: services/auth-service (Go)

use serde::{Deserialize, Serialize};
use worker::*;

use crate::db::NeonClient;
use crate::middleware;
use crate::utils;

// ── Models ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password: Option<String>,
    #[serde(default)]
    pub company: String,
    #[serde(default)]
    pub phone: String,
    #[serde(default = "default_role")]
    pub role: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

fn default_role() -> String { "user".into() }

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub name: String,
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub company: String,
    #[serde(default)]
    pub phone: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct GoogleLoginRequest {
    pub id_token: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub refresh_token: String,
    pub user: User,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub name: String,
    #[serde(default)]
    pub company: String,
    #[serde(default)]
    pub phone: String,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub old_password: String,
    pub new_password: String,
}

// ── Handlers ──

pub async fn register(mut req: Request, env: &Env) -> Result<Response> {
    let body: RegisterRequest = req.json().await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    if body.name.is_empty() || body.email.is_empty() || body.password.len() < 6 {
        return utils::json_error("Name, email, and password (min 6 chars) are required", 400);
    }

    let db = get_db(env)?;
    let jwt_secret = utils::get_secret(env, "JWT_SECRET");

    // Check existing
    let existing: Option<User> = db.query_one(
        "SELECT id, name, email, password, company, phone, role, created_at::text, updated_at::text FROM users WHERE email = $1",
        &[serde_json::json!(body.email)],
    ).await?;

    if existing.is_some() {
        return utils::json_error("Email already registered", 409);
    }

    let hashed = bcrypt::hash(&body.password, bcrypt::DEFAULT_COST)
        .map_err(|e| Error::RustError(format!("Hash error: {}", e)))?;

    let id = utils::generate_id();
    db.execute(
        "INSERT INTO users (id, name, email, password, company, phone, role, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,'user',NOW(),NOW())",
        &[serde_json::json!(id), serde_json::json!(body.name), serde_json::json!(body.email),
          serde_json::json!(hashed), serde_json::json!(body.company), serde_json::json!(body.phone)],
    ).await?;

    let user = User {
        id: id.clone(), name: body.name, email: body.email.clone(),
        password: None, company: body.company, phone: body.phone,
        role: "user".into(), created_at: None, updated_at: None,
    };

    let token = middleware::generate_jwt(&id, &body.email, "user", &jwt_secret, 24)
        .map_err(|e| Error::RustError(e))?;
    let refresh = middleware::generate_refresh_token(&id, &jwt_secret)
        .map_err(|e| Error::RustError(e))?;

    utils::json_response(&AuthResponse { token, refresh_token: refresh, user }, 201)
}

pub async fn login(mut req: Request, env: &Env) -> Result<Response> {
    let body: LoginRequest = req.json().await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let db = get_db(env)?;
    let jwt_secret = utils::get_secret(env, "JWT_SECRET");

    let user: Option<User> = db.query_one(
        "SELECT id, name, email, password, company, phone, role, created_at::text, updated_at::text FROM users WHERE email = $1",
        &[serde_json::json!(body.email)],
    ).await?;

    let user = match user {
        Some(u) => u,
        None => return utils::json_error("Invalid email or password", 401),
    };

    let pw_hash = user.password.clone().unwrap_or_default();
    let valid = bcrypt::verify(&body.password, &pw_hash)
        .unwrap_or(false);

    if !valid {
        return utils::json_error("Invalid email or password", 401);
    }

    let token = middleware::generate_jwt(&user.id, &user.email, &user.role, &jwt_secret, 24)
        .map_err(|e| Error::RustError(e))?;
    let refresh = middleware::generate_refresh_token(&user.id, &jwt_secret)
        .map_err(|e| Error::RustError(e))?;

    let mut resp_user = user;
    resp_user.password = None;
    utils::json_response(&AuthResponse { token, refresh_token: refresh, user: resp_user }, 200)
}

pub async fn google_login(mut req: Request, env: &Env) -> Result<Response> {
    let body: GoogleLoginRequest = req.json().await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    // Fetch Google userinfo
    let google_url = format!("https://www.googleapis.com/oauth2/v3/userinfo?access_token={}", body.id_token);
    let google_req = Request::new(&google_url, Method::Get)?;
    let mut google_resp = Fetch::Request(google_req).send().await?;

    if google_resp.status_code() != 200 {
        return utils::json_error("Invalid Google token", 401);
    }

    let google_user: serde_json::Value = google_resp.json().await?;
    let email = google_user.get("email").and_then(|v| v.as_str()).unwrap_or("");
    let name = google_user.get("name").and_then(|v| v.as_str()).unwrap_or("");

    if email.is_empty() {
        return utils::json_error("Email not provided by Google", 400);
    }

    let db = get_db(env)?;
    let jwt_secret = utils::get_secret(env, "JWT_SECRET");

    let user: Option<User> = db.query_one(
        "SELECT id, name, email, password, company, phone, role, created_at::text, updated_at::text FROM users WHERE email = $1",
        &[serde_json::json!(email)],
    ).await?;

    let user = match user {
        Some(u) => u,
        None => {
            let id = utils::generate_id();
            let random_pw = utils::generate_id();
            let hashed = bcrypt::hash(&random_pw, bcrypt::DEFAULT_COST)
                .map_err(|e| Error::RustError(format!("Hash error: {}", e)))?;

            db.execute(
                "INSERT INTO users (id, name, email, password, role, created_at, updated_at) VALUES ($1,$2,$3,$4,'user',NOW(),NOW())",
                &[serde_json::json!(id), serde_json::json!(name), serde_json::json!(email), serde_json::json!(hashed)],
            ).await?;

            User {
                id, name: name.to_string(), email: email.to_string(),
                password: None, company: String::new(), phone: String::new(),
                role: "user".into(), created_at: None, updated_at: None,
            }
        }
    };

    let token = middleware::generate_jwt(&user.id, &user.email, &user.role, &jwt_secret, 24)
        .map_err(|e| Error::RustError(e))?;
    let refresh = middleware::generate_refresh_token(&user.id, &jwt_secret)
        .map_err(|e| Error::RustError(e))?;

    let mut resp_user = user;
    resp_user.password = None;
    utils::json_response(&AuthResponse { token, refresh_token: refresh, user: resp_user }, 200)
}

pub async fn refresh_token(mut req: Request, env: &Env) -> Result<Response> {
    let body: RefreshRequest = req.json().await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let jwt_secret = utils::get_secret(env, "JWT_SECRET");
    let claims = middleware::validate_jwt(&body.refresh_token, &jwt_secret)
        .map_err(|_| Error::RustError("Invalid refresh token".into()))?;

    let db = get_db(env)?;
    let user: Option<User> = db.query_one(
        "SELECT id, name, email, password, company, phone, role, created_at::text, updated_at::text FROM users WHERE id = $1",
        &[serde_json::json!(claims.user_id)],
    ).await?;

    let user = match user {
        Some(u) => u,
        None => return utils::json_error("User not found", 401),
    };

    let token = middleware::generate_jwt(&user.id, &user.email, &user.role, &jwt_secret, 24)
        .map_err(|e| Error::RustError(e))?;
    let refresh = middleware::generate_refresh_token(&user.id, &jwt_secret)
        .map_err(|e| Error::RustError(e))?;

    let mut resp_user = user;
    resp_user.password = None;
    utils::json_response(&AuthResponse { token, refresh_token: refresh, user: resp_user }, 200)
}

pub async fn profile(req: &Request, env: &Env, claims: &middleware::JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let user: Option<User> = db.query_one(
        "SELECT id, name, email, company, phone, role, created_at::text, updated_at::text FROM users WHERE id = $1",
        &[serde_json::json!(claims.user_id)],
    ).await?;

    match user {
        Some(u) => utils::json_response(&u, 200),
        None => utils::json_error("User not found", 404),
    }
}

pub async fn update_profile(mut req: Request, env: &Env, claims: &middleware::JwtClaims) -> Result<Response> {
    let body: UpdateProfileRequest = req.json().await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let db = get_db(env)?;
    db.execute(
        "UPDATE users SET name=$1, company=$2, phone=$3, updated_at=NOW() WHERE id=$4",
        &[serde_json::json!(body.name), serde_json::json!(body.company),
          serde_json::json!(body.phone), serde_json::json!(claims.user_id)],
    ).await?;

    let user: Option<User> = db.query_one(
        "SELECT id, name, email, company, phone, role, created_at::text, updated_at::text FROM users WHERE id = $1",
        &[serde_json::json!(claims.user_id)],
    ).await?;

    match user {
        Some(u) => utils::json_response(&u, 200),
        None => utils::json_error("User not found", 404),
    }
}

pub async fn change_password(mut req: Request, env: &Env, claims: &middleware::JwtClaims) -> Result<Response> {
    let body: ChangePasswordRequest = req.json().await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let db = get_db(env)?;
    let user: Option<User> = db.query_one(
        "SELECT id, name, email, password, company, phone, role, created_at::text, updated_at::text FROM users WHERE id = $1",
        &[serde_json::json!(claims.user_id)],
    ).await?;

    let user = match user {
        Some(u) => u,
        None => return utils::json_error("User not found", 404),
    };

    let pw_hash = user.password.unwrap_or_default();
    if !bcrypt::verify(&body.old_password, &pw_hash).unwrap_or(false) {
        return utils::json_error("Incorrect old password", 401);
    }

    if body.new_password.len() < 6 {
        return utils::json_error("New password must be at least 6 characters", 400);
    }

    let hashed = bcrypt::hash(&body.new_password, bcrypt::DEFAULT_COST)
        .map_err(|e| Error::RustError(format!("Hash error: {}", e)))?;

    db.execute(
        "UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2",
        &[serde_json::json!(hashed), serde_json::json!(claims.user_id)],
    ).await?;

    utils::json_response(&serde_json::json!({"message": "Password updated successfully"}), 200)
}

pub async fn get_user_by_id(req: &Request, env: &Env, user_id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let user: Option<User> = db.query_one(
        "SELECT id, name, email, company, phone, role, created_at::text, updated_at::text FROM users WHERE id = $1",
        &[serde_json::json!(user_id)],
    ).await?;

    match user {
        Some(u) => utils::json_response(&serde_json::json!({"id": u.id, "name": u.name, "email": u.email}), 200),
        None => utils::json_error("User not found", 404),
    }
}

pub async fn list_users(req: &Request, env: &Env, claims: &middleware::JwtClaims) -> Result<Response> {
    if claims.role != "admin" {
        return utils::json_error("Forbidden: Admin access required", 403);
    }

    let url = req.url()?;
    let search = utils::query_param(&url, "search").unwrap_or_default();
    let (page, per_page) = utils::parse_pagination(&url);
    let offset = (page - 1) * per_page;

    let db = get_db(env)?;
    let users: Vec<User> = db.query_typed(
        "SELECT id, name, email, company, phone, role, created_at::text, updated_at::text FROM users WHERE ($1::text = '' OR email ILIKE $2 OR name ILIKE $2) ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        &[serde_json::json!(search), serde_json::json!(format!("%{}%", search)),
          serde_json::json!(per_page), serde_json::json!(offset)],
    ).await?;

    let total: i64 = db.query_scalar(
        "SELECT COUNT(*) FROM users WHERE ($1::text = '' OR email ILIKE $2 OR name ILIKE $2)",
        &[serde_json::json!(search), serde_json::json!(format!("%{}%", search))],
    ).await?;

    utils::json_response(&serde_json::json!({"data": users, "total": total, "page": page}), 200)
}

pub async fn update_role(mut req: Request, env: &Env, claims: &middleware::JwtClaims, target_id: &str) -> Result<Response> {
    if claims.role != "admin" {
        return utils::json_error("Forbidden: Admin access required", 403);
    }

    let body: serde_json::Value = req.json().await?;
    let role = body.get("role").and_then(|v| v.as_str()).unwrap_or("");
    if role.is_empty() {
        return utils::json_error("role is required", 400);
    }

    let db = get_db(env)?;
    db.execute(
        "UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2",
        &[serde_json::json!(role), serde_json::json!(target_id)],
    ).await?;

    utils::json_response(&serde_json::json!({"message": "Role updated successfully"}), 200)
}

pub async fn delete_user(env: &Env, claims: &middleware::JwtClaims, target_id: &str) -> Result<Response> {
    if claims.role != "admin" {
        return utils::json_error("Forbidden: Admin access required", 403);
    }

    let db = get_db(env)?;
    db.execute("DELETE FROM users WHERE id=$1", &[serde_json::json!(target_id)]).await?;

    utils::json_response(&serde_json::json!({"message": "User deleted successfully"}), 200)
}

// ── Helper ──

fn get_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "AUTH_DB_URL");
    NeonClient::from_connection_string(&url)
}
