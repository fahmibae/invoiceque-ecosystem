//! Middleware: JWT auth, CORS — platform-agnostic JWT logic stays the same.

use actix_web::{HttpRequest, FromRequest, dev::Payload};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::future::{Ready, ready};

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone)]
pub struct JwtClaims {
    pub user_id: String,
    pub email: String,
    pub role: String,
}

/// Actix-web extractor for JWT authentication.
pub struct Auth(pub JwtClaims);

impl FromRequest for Auth {
    type Error = actix_web::Error;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _payload: &mut Payload) -> Self::Future {
        let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_default();
        let auth_header = req.headers().get("Authorization")
            .and_then(|v| v.to_str().ok()).map(|s| s.to_string());
        let auth_header = match auth_header {
            Some(h) => h,
            None => return ready(Err(actix_web::error::ErrorUnauthorized(
                serde_json::json!({"error": "Authorization header required"})
            ))),
        };
        let token = if auth_header.to_lowercase().starts_with("bearer ") {
            &auth_header[7..]
        } else {
            return ready(Err(actix_web::error::ErrorUnauthorized(
                serde_json::json!({"error": "Invalid authorization format"})
            )));
        };
        match validate_jwt(token, &jwt_secret) {
            Ok(claims) => ready(Ok(Auth(claims))),
            Err(e) => ready(Err(actix_web::error::ErrorUnauthorized(
                serde_json::json!({"error": e})
            ))),
        }
    }
}

pub fn validate_jwt(token: &str, secret: &str) -> Result<JwtClaims, String> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 { return Err("Invalid token format".into()); }
    let header_payload = format!("{}.{}", parts[0], parts[1]);
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| "Invalid secret key".to_string())?;
    mac.update(header_payload.as_bytes());
    let signature = base64_url_decode(parts[2])?;
    mac.verify_slice(&signature).map_err(|_| "Invalid or expired token".to_string())?;
    let payload_bytes = base64_url_decode(parts[1])?;
    let payload: serde_json::Value = serde_json::from_slice(&payload_bytes)
        .map_err(|_| "Invalid token payload".to_string())?;
    if let Some(exp) = payload.get("exp").and_then(|v| v.as_f64()) {
        let now = chrono::Utc::now().timestamp() as f64;
        if now > exp { return Err("Invalid or expired token".into()); }
    }
    Ok(JwtClaims {
        user_id: payload.get("user_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        email: payload.get("email").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        role: payload.get("role").and_then(|v| v.as_str()).unwrap_or("user").to_string(),
    })
}

pub fn generate_jwt(user_id: &str, email: &str, role: &str, secret: &str, duration_hours: i64)
    -> Result<String, String>
{
    let header = serde_json::json!({"alg": "HS256", "typ": "JWT"});
    let now = chrono::Utc::now().timestamp();
    let payload = serde_json::json!({
        "user_id": user_id, "email": email, "role": role,
        "iat": now, "exp": now + (duration_hours * 3600),
    });
    let h = base64_url_encode(&serde_json::to_vec(&header).map_err(|e| e.to_string())?);
    let p = base64_url_encode(&serde_json::to_vec(&payload).map_err(|e| e.to_string())?);
    let message = format!("{}.{}", h, p);
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| "Invalid secret key".to_string())?;
    mac.update(message.as_bytes());
    let sig = base64_url_encode(&mac.finalize().into_bytes());
    Ok(format!("{}.{}", message, sig))
}

pub fn generate_refresh_token(user_id: &str, secret: &str) -> Result<String, String> {
    let header = serde_json::json!({"alg": "HS256", "typ": "JWT"});
    let now = chrono::Utc::now().timestamp();
    let payload = serde_json::json!({
        "user_id": user_id, "type": "refresh",
        "iat": now, "exp": now + (7 * 24 * 3600),
    });
    let h = base64_url_encode(&serde_json::to_vec(&header).map_err(|e| e.to_string())?);
    let p = base64_url_encode(&serde_json::to_vec(&payload).map_err(|e| e.to_string())?);
    let message = format!("{}.{}", h, p);
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| "Invalid secret key".to_string())?;
    mac.update(message.as_bytes());
    let sig = base64_url_encode(&mac.finalize().into_bytes());
    Ok(format!("{}.{}", message, sig))
}

fn base64_url_encode(data: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(data)
}

fn base64_url_decode(s: &str) -> Result<Vec<u8>, String> {
    use base64::Engine;
    base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(s)
        .or_else(|_| base64::engine::general_purpose::URL_SAFE.decode(s))
        .map_err(|e| format!("Base64 decode error: {}", e))
}
