//! Auth service module — register, login, Google OAuth, profile, admin.
//! Mirrors: services/auth-service (Go)

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use worker::*;

use crate::db::NeonClient;
use crate::middleware;
use crate::services::notification;
use crate::utils;

// ── Models ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub email: String,
    #[serde(skip_serializing)]
    pub password: Option<String>,
    #[serde(default)]
    pub company: String,
    #[serde(default)]
    pub phone: String,
    #[serde(default = "default_role")]
    pub role: String,
    #[serde(default)]
    pub email_verified: bool,
    #[serde(default)]
    pub email_verified_at: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

fn default_role() -> String {
    "user".into()
}

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
pub struct VerifyEmailRequest {
    pub token: String,
}

#[derive(Debug, Deserialize)]
pub struct ResendVerificationRequest {
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
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

#[derive(Debug, Serialize)]
pub struct VerificationRequiredResponse {
    pub message: String,
    pub email: String,
    pub requires_verification: bool,
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

const USER_SELECT_WITH_PASSWORD: &str = "SELECT id, name, email, password, company, phone, role, COALESCE(email_verified, FALSE) AS email_verified, email_verified_at::text, created_at::text, updated_at::text FROM users";
const USER_SELECT_PUBLIC: &str = "SELECT id, name, email, company, phone, role, COALESCE(email_verified, FALSE) AS email_verified, email_verified_at::text, created_at::text, updated_at::text FROM users";

async fn ensure_email_verification_schema(db: &NeonClient) -> Result<()> {
    db.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE",
        &[],
    )
    .await?;
    db.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE",
        &[],
    )
    .await?;
    db.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_hash VARCHAR(128)",
        &[],
    )
    .await?;
    db.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP WITH TIME ZONE",
        &[],
    )
    .await?;
    db.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMP WITH TIME ZONE",
        &[],
    )
    .await?;
    db.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(128)",
        &[],
    )
    .await?;
    db.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP WITH TIME ZONE",
        &[],
    )
    .await?;
    db.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_sent_at TIMESTAMP WITH TIME ZONE",
        &[],
    )
    .await?;
    Ok(())
}

fn normalize_email(email: &str) -> String {
    email.trim().to_lowercase()
}

fn generate_verification_token() -> Result<String> {
    let mut buf = [0u8; 32];
    getrandom::getrandom(&mut buf).map_err(|e| Error::RustError(format!("Token error: {}", e)))?;
    Ok(hex::encode(buf))
}

fn hash_verification_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}

async fn store_verification_token(db: &NeonClient, user_id: &str) -> Result<String> {
    let token = generate_verification_token()?;
    let token_hash = hash_verification_token(&token);
    db.execute(
        "UPDATE users SET email_verified=FALSE, email_verified_at=NULL, email_verification_token_hash=$1, email_verification_expires_at=NOW() + INTERVAL '24 hours', email_verification_sent_at=NOW(), updated_at=NOW() WHERE id=$2",
        &[serde_json::json!(token_hash), serde_json::json!(user_id)],
    )
    .await?;
    Ok(token)
}

async fn store_password_reset_token(db: &NeonClient, user_id: &str) -> Result<String> {
    let token = generate_verification_token()?;
    let token_hash = hash_verification_token(&token);
    db.execute(
        "UPDATE users SET password_reset_token_hash=$1, password_reset_expires_at=NOW() + INTERVAL '1 hour', password_reset_sent_at=NOW(), updated_at=NOW() WHERE id=$2",
        &[serde_json::json!(token_hash), serde_json::json!(user_id)],
    )
    .await?;
    Ok(token)
}

fn frontend_base_url(env: &Env) -> String {
    let from_frontend = env
        .var("FRONTEND_URL")
        .map(|v| v.to_string())
        .unwrap_or_default();
    let from_public = env
        .var("NEXT_PUBLIC_APP_URL")
        .map(|v| v.to_string())
        .unwrap_or_default();
    let from_app = env
        .var("APP_URL")
        .map(|v| v.to_string())
        .unwrap_or_default();
    let base = if !from_frontend.is_empty() {
        from_frontend
    } else if !from_public.is_empty() {
        from_public
    } else if !from_app.is_empty() {
        from_app
    } else {
        "https://app.invoicequ.my.id".to_string()
    };
    base.trim_end_matches('/').to_string()
}

fn escape_html(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

async fn send_verification_email(env: &Env, name: &str, email: &str, token: &str) -> Result<()> {
    let verify_url = format!("{}/verify-email?token={}", frontend_base_url(env), token);
    let safe_name = escape_html(name);
    let safe_url = escape_html(&verify_url);
    let html = format!(
        r#"
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
          <h2 style="margin:0 0 12px;color:#DC2626">Verifikasi email InvoiceQu</h2>
          <p>Halo {safe_name},</p>
          <p>Terima kasih sudah mendaftar. Klik tombol di bawah ini untuk mengaktifkan akun InvoiceQu Anda.</p>
          <p style="margin:28px 0">
            <a href="{safe_url}" style="background:#DC2626;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;display:inline-block">Verifikasi Email</a>
          </p>
          <p style="font-size:13px;color:#6B7280">Link ini berlaku selama 24 jam. Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
          <p style="font-size:12px;color:#9CA3AF;word-break:break-all">{safe_url}</p>
        </div>
        "#
    );
    notification::send_email_via_resend(env, email, "Verifikasi email InvoiceQu", &html).await
}

async fn send_password_reset_email(env: &Env, name: &str, email: &str, token: &str) -> Result<()> {
    let reset_url = format!("{}/reset-password?token={}", frontend_base_url(env), token);
    let safe_name = escape_html(name);
    let safe_url = escape_html(&reset_url);
    let html = format!(
        r#"
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
          <h2 style="margin:0 0 12px;color:#DC2626">Reset password InvoiceQu</h2>
          <p>Halo {safe_name},</p>
          <p>Kami menerima permintaan untuk mengganti password akun InvoiceQu Anda. Klik tombol di bawah ini untuk membuat password baru.</p>
          <p style="margin:28px 0">
            <a href="{safe_url}" style="background:#DC2626;color:white;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;display:inline-block">Reset Password</a>
          </p>
          <p style="font-size:13px;color:#6B7280">Link ini berlaku selama 1 jam. Jika Anda tidak meminta reset password, abaikan email ini.</p>
          <p style="font-size:12px;color:#9CA3AF;word-break:break-all">{safe_url}</p>
        </div>
        "#
    );
    notification::send_email_via_resend(env, email, "Reset password InvoiceQu", &html).await
}

// ── Handlers ──

pub async fn register(mut req: Request, env: &Env) -> Result<Response> {
    let body: RegisterRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let email = normalize_email(&body.email);
    if body.name.trim().is_empty() || email.is_empty() || body.password.len() < 6 {
        return utils::json_error("Name, email, and password (min 6 chars) are required", 400);
    }

    let db = get_db(env)?;
    ensure_email_verification_schema(&db).await?;

    // Check existing
    let existing: Option<User> = db
        .query_one(
            &format!("{} WHERE email = $1", USER_SELECT_WITH_PASSWORD),
            &[serde_json::json!(email)],
        )
        .await?;

    if let Some(existing_user) = existing {
        if !existing_user.email_verified {
            let token = store_verification_token(&db, &existing_user.id).await?;
            send_verification_email(env, &existing_user.name, &existing_user.email, &token).await?;
            return utils::json_response(
                &VerificationRequiredResponse {
                    message: "Email verifikasi sudah dikirim ulang. Silakan cek inbox Anda.".into(),
                    email: existing_user.email,
                    requires_verification: true,
                },
                200,
            );
        }
        return utils::json_error("Email already registered", 409);
    }

    let hashed = bcrypt::hash(&body.password, bcrypt::DEFAULT_COST)
        .map_err(|e| Error::RustError(format!("Hash error: {}", e)))?;

    let id = utils::generate_id();
    let token = generate_verification_token()?;
    let token_hash = hash_verification_token(&token);
    db.execute(
        "INSERT INTO users (id, name, email, password, company, phone, role, email_verified, email_verification_token_hash, email_verification_expires_at, email_verification_sent_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,'user',FALSE,$7,NOW() + INTERVAL '24 hours',NOW(),NOW(),NOW())",
        &[serde_json::json!(id), serde_json::json!(body.name), serde_json::json!(email),
          serde_json::json!(hashed), serde_json::json!(body.company), serde_json::json!(body.phone), serde_json::json!(token_hash)],
    ).await?;

    send_verification_email(env, &body.name, &email, &token).await?;

    utils::json_response(
        &VerificationRequiredResponse {
            message: "Pendaftaran berhasil. Kami sudah mengirim link verifikasi ke email Anda."
                .into(),
            email,
            requires_verification: true,
        },
        201,
    )
}

pub async fn verify_email(mut req: Request, env: &Env) -> Result<Response> {
    let body: VerifyEmailRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    if body.token.trim().is_empty() {
        return utils::json_error("Token verifikasi wajib diisi", 400);
    }

    let db = get_db(env)?;
    ensure_email_verification_schema(&db).await?;
    let token_hash = hash_verification_token(body.token.trim());
    let user: Option<User> = db.query_one(
        "UPDATE users SET email_verified=TRUE, email_verified_at=NOW(), email_verification_token_hash=NULL, email_verification_expires_at=NULL, updated_at=NOW() WHERE email_verification_token_hash=$1 AND email_verification_expires_at > NOW() RETURNING id, name, email, company, phone, role, email_verified, email_verified_at::text, created_at::text, updated_at::text",
        &[serde_json::json!(token_hash)],
    ).await?;

    match user {
        Some(user) => utils::json_response(
            &serde_json::json!({"message": "Email berhasil diverifikasi. Silakan login.", "user": user}),
            200,
        ),
        None => utils::json_error("Token verifikasi tidak valid atau sudah kedaluwarsa", 400),
    }
}

pub async fn resend_verification(mut req: Request, env: &Env) -> Result<Response> {
    let body: ResendVerificationRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let email = normalize_email(&body.email);
    if email.is_empty() {
        return utils::json_error("Email wajib diisi", 400);
    }

    let db = get_db(env)?;
    ensure_email_verification_schema(&db).await?;
    let user: Option<User> = db
        .query_one(
            &format!("{} WHERE email = $1", USER_SELECT_WITH_PASSWORD),
            &[serde_json::json!(email)],
        )
        .await?;

    if let Some(user) = user {
        if !user.email_verified {
            let token = store_verification_token(&db, &user.id).await?;
            send_verification_email(env, &user.name, &user.email, &token).await?;
        }
    }

    utils::json_response(
        &serde_json::json!({"message": "Jika email terdaftar dan belum diverifikasi, kami mengirim ulang link verifikasi."}),
        200,
    )
}

pub async fn forgot_password(mut req: Request, env: &Env) -> Result<Response> {
    let body: ForgotPasswordRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let email = normalize_email(&body.email);
    if email.is_empty() {
        return utils::json_error("Email wajib diisi", 400);
    }

    let db = get_db(env)?;
    ensure_email_verification_schema(&db).await?;
    let user: Option<User> = db
        .query_one(
            &format!("{} WHERE email = $1", USER_SELECT_WITH_PASSWORD),
            &[serde_json::json!(email)],
        )
        .await?;

    if let Some(user) = user {
        let token = store_password_reset_token(&db, &user.id).await?;
        send_password_reset_email(env, &user.name, &user.email, &token).await?;
    }

    utils::json_response(
        &serde_json::json!({"message": "Jika email terdaftar, link reset password akan dikirim."}),
        200,
    )
}

pub async fn reset_password(mut req: Request, env: &Env) -> Result<Response> {
    let body: ResetPasswordRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    if body.token.trim().is_empty() {
        return utils::json_error("Token reset password wajib diisi", 400);
    }
    if body.new_password.len() < 6 {
        return utils::json_error("Password baru minimal 6 karakter", 400);
    }

    let db = get_db(env)?;
    ensure_email_verification_schema(&db).await?;
    let token_hash = hash_verification_token(body.token.trim());
    let hashed = bcrypt::hash(&body.new_password, bcrypt::DEFAULT_COST)
        .map_err(|e| Error::RustError(format!("Hash error: {}", e)))?;
    let user: Option<User> = db.query_one(
        "UPDATE users SET password=$2, email_verified=TRUE, email_verified_at=COALESCE(email_verified_at, NOW()), password_reset_token_hash=NULL, password_reset_expires_at=NULL, updated_at=NOW() WHERE password_reset_token_hash=$1 AND password_reset_expires_at > NOW() RETURNING id, name, email, company, phone, role, email_verified, email_verified_at::text, created_at::text, updated_at::text",
        &[serde_json::json!(token_hash), serde_json::json!(hashed)],
    ).await?;

    match user {
        Some(user) => utils::json_response(
            &serde_json::json!({"message": "Password berhasil direset. Silakan login dengan password baru.", "user": user}),
            200,
        ),
        None => utils::json_error(
            "Token reset password tidak valid atau sudah kedaluwarsa",
            400,
        ),
    }
}

pub async fn login(mut req: Request, env: &Env) -> Result<Response> {
    let body: LoginRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let db = get_db(env)?;
    ensure_email_verification_schema(&db).await?;
    let jwt_secret = utils::get_secret(env, "JWT_SECRET");
    let email = normalize_email(&body.email);

    let user: Option<User> = db
        .query_one(
            &format!("{} WHERE email = $1", USER_SELECT_WITH_PASSWORD),
            &[serde_json::json!(email)],
        )
        .await?;

    let user = match user {
        Some(u) => u,
        None => return utils::json_error("Invalid email or password", 401),
    };

    let pw_hash = user.password.clone().unwrap_or_default();
    let valid = bcrypt::verify(&body.password, &pw_hash).unwrap_or(false);

    if !valid {
        return utils::json_error("Invalid email or password", 401);
    }
    if !user.email_verified {
        return utils::json_error(
            "Email belum diverifikasi. Silakan cek inbox Anda atau kirim ulang email verifikasi.",
            403,
        );
    }

    let token = middleware::generate_jwt(&user.id, &user.email, &user.role, &jwt_secret, 24)
        .map_err(|e| Error::RustError(e))?;
    let refresh = middleware::generate_refresh_token(&user.id, &jwt_secret)
        .map_err(|e| Error::RustError(e))?;

    let mut resp_user = user;
    resp_user.password = None;
    utils::json_response(
        &AuthResponse {
            token,
            refresh_token: refresh,
            user: resp_user,
        },
        200,
    )
}

pub async fn google_login(mut req: Request, env: &Env) -> Result<Response> {
    let body: GoogleLoginRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    // Fetch Google userinfo
    let google_url = format!(
        "https://www.googleapis.com/oauth2/v3/userinfo?access_token={}",
        body.id_token
    );
    let google_req = Request::new(&google_url, Method::Get)?;
    let mut google_resp = Fetch::Request(google_req).send().await?;

    if google_resp.status_code() != 200 {
        return utils::json_error("Invalid Google token", 401);
    }

    let google_user: serde_json::Value = google_resp.json().await?;
    let email = google_user
        .get("email")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let name = google_user
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if email.is_empty() {
        return utils::json_error("Email not provided by Google", 400);
    }

    let db = get_db(env)?;
    ensure_email_verification_schema(&db).await?;
    let jwt_secret = utils::get_secret(env, "JWT_SECRET");

    let user: Option<User> = db
        .query_one(
            &format!("{} WHERE email = $1", USER_SELECT_WITH_PASSWORD),
            &[serde_json::json!(email)],
        )
        .await?;

    let user = match user {
        Some(mut u) => {
            if !u.email_verified {
                db.execute(
                    "UPDATE users SET email_verified=TRUE, email_verified_at=COALESCE(email_verified_at, NOW()), email_verification_token_hash=NULL, email_verification_expires_at=NULL, updated_at=NOW() WHERE id=$1",
                    &[serde_json::json!(u.id.clone())],
                )
                .await?;
                u.email_verified = true;
            }
            u
        }
        None => {
            let id = utils::generate_id();
            let random_pw = utils::generate_id();
            let hashed = bcrypt::hash(&random_pw, bcrypt::DEFAULT_COST)
                .map_err(|e| Error::RustError(format!("Hash error: {}", e)))?;

            db.execute(
                "INSERT INTO users (id, name, email, password, role, email_verified, email_verified_at, created_at, updated_at) VALUES ($1,$2,$3,$4,'user',TRUE,NOW(),NOW(),NOW())",
                &[serde_json::json!(id), serde_json::json!(name), serde_json::json!(email), serde_json::json!(hashed)],
            ).await?;

            User {
                id,
                name: name.to_string(),
                email: email.to_string(),
                password: None,
                company: String::new(),
                phone: String::new(),
                role: "user".into(),
                email_verified: true,
                email_verified_at: String::new(),
                created_at: String::new(),
                updated_at: String::new(),
            }
        }
    };

    let token = middleware::generate_jwt(&user.id, &user.email, &user.role, &jwt_secret, 24)
        .map_err(|e| Error::RustError(e))?;
    let refresh = middleware::generate_refresh_token(&user.id, &jwt_secret)
        .map_err(|e| Error::RustError(e))?;

    let mut resp_user = user;
    resp_user.password = None;
    utils::json_response(
        &AuthResponse {
            token,
            refresh_token: refresh,
            user: resp_user,
        },
        200,
    )
}

pub async fn refresh_token(mut req: Request, env: &Env) -> Result<Response> {
    let body: RefreshRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let jwt_secret = utils::get_secret(env, "JWT_SECRET");
    let claims = middleware::validate_jwt(&body.refresh_token, &jwt_secret)
        .map_err(|_| Error::RustError("Invalid refresh token".into()))?;

    let db = get_db(env)?;
    ensure_email_verification_schema(&db).await?;
    let user: Option<User> = db
        .query_one(
            &format!("{} WHERE id = $1", USER_SELECT_WITH_PASSWORD),
            &[serde_json::json!(claims.user_id)],
        )
        .await?;

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
    utils::json_response(
        &AuthResponse {
            token,
            refresh_token: refresh,
            user: resp_user,
        },
        200,
    )
}

pub async fn profile(
    _req: &Request,
    env: &Env,
    claims: &middleware::JwtClaims,
) -> Result<Response> {
    let db = get_db(env)?;
    ensure_email_verification_schema(&db).await?;
    let user: Option<User> = db
        .query_one(
            &format!("{} WHERE id = $1", USER_SELECT_PUBLIC),
            &[serde_json::json!(claims.user_id)],
        )
        .await?;

    match user {
        Some(u) => utils::json_response(&u, 200),
        None => utils::json_error("User not found", 404),
    }
}

pub async fn update_profile(
    mut req: Request,
    env: &Env,
    claims: &middleware::JwtClaims,
) -> Result<Response> {
    let body: UpdateProfileRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let db = get_db(env)?;
    ensure_email_verification_schema(&db).await?;
    db.execute(
        "UPDATE users SET name=$1, company=$2, phone=$3, updated_at=NOW() WHERE id=$4",
        &[
            serde_json::json!(body.name),
            serde_json::json!(body.company),
            serde_json::json!(body.phone),
            serde_json::json!(claims.user_id),
        ],
    )
    .await?;

    let user: Option<User> = db
        .query_one(
            &format!("{} WHERE id = $1", USER_SELECT_PUBLIC),
            &[serde_json::json!(claims.user_id)],
        )
        .await?;

    match user {
        Some(u) => utils::json_response(&u, 200),
        None => utils::json_error("User not found", 404),
    }
}

pub async fn change_password(
    mut req: Request,
    env: &Env,
    claims: &middleware::JwtClaims,
) -> Result<Response> {
    let body: ChangePasswordRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let db = get_db(env)?;
    ensure_email_verification_schema(&db).await?;
    let user: Option<User> = db
        .query_one(
            &format!("{} WHERE id = $1", USER_SELECT_WITH_PASSWORD),
            &[serde_json::json!(claims.user_id)],
        )
        .await?;

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
    )
    .await?;

    utils::json_response(
        &serde_json::json!({"message": "Password updated successfully"}),
        200,
    )
}

pub async fn get_user_by_id(_req: &Request, env: &Env, user_id: &str) -> Result<Response> {
    let db = get_db(env)?;
    ensure_email_verification_schema(&db).await?;
    let user: Option<User> = db
        .query_one(
            &format!("{} WHERE id = $1", USER_SELECT_PUBLIC),
            &[serde_json::json!(user_id)],
        )
        .await?;

    match user {
        Some(u) => utils::json_response(
            &serde_json::json!({"id": u.id, "name": u.name, "email": u.email}),
            200,
        ),
        None => utils::json_error("User not found", 404),
    }
}

pub async fn list_users(
    req: &Request,
    env: &Env,
    claims: &middleware::JwtClaims,
) -> Result<Response> {
    if claims.role != "admin" {
        return utils::json_error("Forbidden: Admin access required", 403);
    }

    let url = req.url()?;
    let search = utils::query_param(&url, "search").unwrap_or_default();
    let (page, per_page) = utils::parse_pagination(&url);
    let offset = (page - 1) * per_page;

    let db = get_db(env)?;
    ensure_email_verification_schema(&db).await?;
    let users: Vec<User> = db.query_typed(
        &format!("{} WHERE ($1::text = '' OR email ILIKE $2 OR name ILIKE $2) ORDER BY created_at DESC LIMIT $3 OFFSET $4", USER_SELECT_PUBLIC),
        &[serde_json::json!(search), serde_json::json!(format!("%{}%", search)),
          serde_json::json!(per_page), serde_json::json!(offset)],
    ).await?;

    let total: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM users WHERE ($1::text = '' OR email ILIKE $2 OR name ILIKE $2)",
            &[
                serde_json::json!(search),
                serde_json::json!(format!("%{}%", search)),
            ],
        )
        .await?;

    utils::json_response(
        &serde_json::json!({"data": users, "total": total, "page": page}),
        200,
    )
}

pub async fn update_role(
    mut req: Request,
    env: &Env,
    claims: &middleware::JwtClaims,
    target_id: &str,
) -> Result<Response> {
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
    )
    .await?;

    utils::json_response(
        &serde_json::json!({"message": "Role updated successfully"}),
        200,
    )
}

pub async fn delete_user(
    env: &Env,
    claims: &middleware::JwtClaims,
    target_id: &str,
) -> Result<Response> {
    if claims.role != "admin" {
        return utils::json_error("Forbidden: Admin access required", 403);
    }

    let db = get_db(env)?;
    db.execute(
        "DELETE FROM users WHERE id=$1",
        &[serde_json::json!(target_id)],
    )
    .await?;

    utils::json_response(
        &serde_json::json!({"message": "User deleted successfully"}),
        200,
    )
}

// ── Checkout-specific register (auto-verify, return JWT) ──

pub async fn register_checkout(mut req: Request, env: &Env) -> Result<Response> {
    let body: RegisterRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let email = normalize_email(&body.email);
    if body.name.trim().is_empty() || email.is_empty() || body.password.len() < 6 {
        return utils::json_error("Name, email, and password (min 6 chars) are required", 400);
    }

    let db = get_db(env)?;
    ensure_email_verification_schema(&db).await?;
    let jwt_secret = utils::get_secret(env, "JWT_SECRET");

    // Check if user already exists
    let existing: Option<User> = db
        .query_one(
            &format!("{} WHERE email = $1", USER_SELECT_WITH_PASSWORD),
            &[serde_json::json!(email)],
        )
        .await?;

    let user = if let Some(mut existing_user) = existing {
        // Existing user — verify password and auto-verify email if needed
        let pw_hash = existing_user.password.clone().unwrap_or_default();
        let valid = bcrypt::verify(&body.password, &pw_hash).unwrap_or(false);
        if !valid {
            return utils::json_error(
                "Email sudah terdaftar. Gunakan password yang benar atau login dari dashboard.",
                409,
            );
        }
        // Auto-verify email for checkout flow
        if !existing_user.email_verified {
            db.execute(
                "UPDATE users SET email_verified=TRUE, email_verified_at=COALESCE(email_verified_at, NOW()), email_verification_token_hash=NULL, email_verification_expires_at=NULL, updated_at=NOW() WHERE id=$1",
                &[serde_json::json!(existing_user.id)],
            ).await?;
            existing_user.email_verified = true;
        }
        existing_user
    } else {
        // New user — create with auto-verified email
        let hashed = bcrypt::hash(&body.password, bcrypt::DEFAULT_COST)
            .map_err(|e| Error::RustError(format!("Hash error: {}", e)))?;

        let id = utils::generate_id();
        db.execute(
            "INSERT INTO users (id, name, email, password, company, phone, role, email_verified, email_verified_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,'user',TRUE,NOW(),NOW(),NOW())",
            &[serde_json::json!(id), serde_json::json!(body.name), serde_json::json!(email),
              serde_json::json!(hashed), serde_json::json!(body.company), serde_json::json!(body.phone)],
        ).await?;

        User {
            id,
            name: body.name.clone(),
            email: email.clone(),
            password: None,
            company: body.company.clone(),
            phone: body.phone.clone(),
            role: "user".into(),
            email_verified: true,
            email_verified_at: String::new(),
            created_at: String::new(),
            updated_at: String::new(),
        }
    };

    let token = middleware::generate_jwt(&user.id, &user.email, &user.role, &jwt_secret, 24)
        .map_err(|e| Error::RustError(e))?;
    let refresh = middleware::generate_refresh_token(&user.id, &jwt_secret)
        .map_err(|e| Error::RustError(e))?;

    let mut resp_user = user;
    resp_user.password = None;
    utils::json_response(
        &AuthResponse {
            token,
            refresh_token: refresh,
            user: resp_user,
        },
        200,
    )
}

// ── Helper ──

fn get_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "AUTH_DB_URL");
    NeonClient::from_connection_string(&url)
}
