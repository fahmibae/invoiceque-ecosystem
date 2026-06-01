//! Middleware: JWT authentication, CORS handling, security headers.

use hmac::{Hmac, Mac};
use sha2::Sha256;
use worker::*;

type HmacSha256 = Hmac<Sha256>;

/// Claims extracted from a valid JWT token.
#[derive(Debug, Clone)]
pub struct JwtClaims {
    pub user_id: String,
    pub email: String,
    pub role: String,
}

/// The type of authentication used.
#[derive(Debug, Clone, PartialEq)]
pub enum AuthType {
    Jwt,
    ApiKey,
}

/// Unified auth context that works for both JWT and API Key auth.
#[derive(Debug, Clone)]
pub struct AuthContext {
    pub user_id: String,
    pub email: String,
    pub role: String,
    pub auth_type: AuthType,
    /// Scopes for API key auth. JWT always gets `["*"]`.
    pub scopes: Vec<String>,
}

/// Validate a JWT token and extract claims.
pub fn validate_jwt(token: &str, secret: &str) -> std::result::Result<JwtClaims, String> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Err("Invalid token format".into());
    }

    let header_payload = format!("{}.{}", parts[0], parts[1]);

    // Verify signature
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| "Invalid secret key".to_string())?;
    mac.update(header_payload.as_bytes());

    let signature = base64_url_decode(parts[2])?;
    mac.verify_slice(&signature)
        .map_err(|_| "Invalid or expired token".to_string())?;

    // Decode payload
    let payload_bytes = base64_url_decode(parts[1])?;
    let payload: serde_json::Value =
        serde_json::from_slice(&payload_bytes).map_err(|_| "Invalid token payload".to_string())?;

    // Check expiration
    if let Some(exp) = payload.get("exp").and_then(|v| v.as_f64()) {
        let now = chrono::Utc::now().timestamp() as f64;
        if now > exp {
            return Err("Invalid or expired token".into());
        }
    }

    Ok(JwtClaims {
        user_id: payload
            .get("user_id")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        email: payload
            .get("email")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        role: payload
            .get("role")
            .and_then(|v| v.as_str())
            .unwrap_or("user")
            .to_string(),
    })
}

/// Generate a JWT token with given claims.
pub fn generate_jwt(
    user_id: &str,
    email: &str,
    role: &str,
    secret: &str,
    duration_hours: i64,
) -> std::result::Result<String, String> {
    let header = serde_json::json!({"alg": "HS256", "typ": "JWT"});
    let now = chrono::Utc::now().timestamp();

    let payload = serde_json::json!({
        "user_id": user_id,
        "email": email,
        "role": role,
        "iat": now,
        "exp": now + (duration_hours * 3600),
    });

    let header_b64 = base64_url_encode(&serde_json::to_vec(&header).map_err(|e| e.to_string())?);
    let payload_b64 = base64_url_encode(&serde_json::to_vec(&payload).map_err(|e| e.to_string())?);
    let message = format!("{}.{}", header_b64, payload_b64);

    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| "Invalid secret key".to_string())?;
    mac.update(message.as_bytes());
    let signature = mac.finalize().into_bytes();
    let sig_b64 = base64_url_encode(&signature);

    Ok(format!("{}.{}", message, sig_b64))
}

/// Generate a refresh token (7 days).
pub fn generate_refresh_token(user_id: &str, secret: &str) -> std::result::Result<String, String> {
    let header = serde_json::json!({"alg": "HS256", "typ": "JWT"});
    let now = chrono::Utc::now().timestamp();

    let payload = serde_json::json!({
        "user_id": user_id,
        "type": "refresh",
        "iat": now,
        "exp": now + (7 * 24 * 3600),
    });

    let header_b64 = base64_url_encode(&serde_json::to_vec(&header).map_err(|e| e.to_string())?);
    let payload_b64 = base64_url_encode(&serde_json::to_vec(&payload).map_err(|e| e.to_string())?);
    let message = format!("{}.{}", header_b64, payload_b64);

    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| "Invalid secret key".to_string())?;
    mac.update(message.as_bytes());
    let signature = mac.finalize().into_bytes();
    let sig_b64 = base64_url_encode(&signature);

    Ok(format!("{}.{}", message, sig_b64))
}

/// Extract JWT claims from Authorization header. Returns None if not present.
pub fn extract_auth(req: &Request, jwt_secret: &str) -> std::result::Result<JwtClaims, Response> {
    let auth_header = req.headers().get("Authorization").ok().flatten();
    let auth_header = match auth_header {
        Some(h) => h,
        None => {
            return Err(Response::from_json(
                &serde_json::json!({"error": "Authorization header required"}),
            )
            .unwrap()
            .with_status(401))
        }
    };

    let token = if auth_header.to_lowercase().starts_with("bearer ") {
        &auth_header[7..]
    } else {
        return Err(Response::from_json(
            &serde_json::json!({"error": "Invalid authorization format"}),
        )
        .unwrap()
        .with_status(401));
    };

    validate_jwt(token, jwt_secret).map_err(|e| {
        Response::from_json(&serde_json::json!({"error": e}))
            .unwrap()
            .with_status(401)
    })
}

/// Extract authentication from either JWT Bearer token or API Key.
/// Returns a unified AuthContext that works for both auth methods.
///
/// Supported formats:
/// - `Authorization: Bearer <jwt_token>` — standard JWT auth
/// - `Authorization: ApiKey <iq_live_xxx>` — API key auth
/// - `Authorization: Bearer <iq_live_xxx>` — API key via Bearer (convenience)
pub async fn extract_auth_dual(
    req: &Request,
    env: &worker::Env,
    jwt_secret: &str,
) -> std::result::Result<AuthContext, Response> {
    let auth_header = req.headers().get("Authorization").ok().flatten();
    let auth_header = match auth_header {
        Some(h) => h,
        None => {
            return Err(Response::from_json(
                &serde_json::json!({"error": "Authorization header required"}),
            )
            .unwrap()
            .with_status(401))
        }
    };

    // Check for API Key format: "ApiKey iq_live_xxx" or "Bearer iq_live_xxx"
    let token_value = if auth_header.starts_with("ApiKey ") || auth_header.starts_with("apikey ") {
        Some(&auth_header[7..])
    } else if auth_header.to_lowercase().starts_with("bearer ") {
        let val = &auth_header[7..];
        if val.starts_with("iq_live_") || val.starts_with("iq_test_") {
            Some(val)
        } else {
            None // It's a JWT token, handle below
        }
    } else {
        None
    };

    // If we detected an API key, validate it
    if let Some(api_key) = token_value {
        if api_key.starts_with("iq_live_") || api_key.starts_with("iq_test_") {
            match crate::services::api_key::validate_api_key(api_key, env).await {
                Ok(ctx) => {
                    return Ok(AuthContext {
                        user_id: ctx.user_id,
                        email: ctx.email,
                        role: "user".to_string(),
                        auth_type: AuthType::ApiKey,
                        scopes: ctx.scopes,
                    });
                }
                Err(e) => {
                    return Err(Response::from_json(
                        &serde_json::json!({"error": e}),
                    )
                    .unwrap()
                    .with_status(401));
                }
            }
        }
    }

    // Fall back to JWT auth
    let token = if auth_header.to_lowercase().starts_with("bearer ") {
        &auth_header[7..]
    } else {
        return Err(Response::from_json(
            &serde_json::json!({"error": "Invalid authorization format. Use 'Bearer <jwt>' or 'ApiKey <key>'"}),
        )
        .unwrap()
        .with_status(401));
    };

    match validate_jwt(token, jwt_secret) {
        Ok(claims) => Ok(AuthContext {
            user_id: claims.user_id,
            email: claims.email,
            role: claims.role,
            auth_type: AuthType::Jwt,
            scopes: vec!["*".to_string()],
        }),
        Err(e) => Err(Response::from_json(&serde_json::json!({"error": e}))
            .unwrap()
            .with_status(401)),
    }
}

/// Build CORS headers for a response.
pub fn cors_headers(req: &Request, allowed_origins: &str) -> Headers {
    let origin = req
        .headers()
        .get("Origin")
        .ok()
        .flatten()
        .unwrap_or_default();
    cors_headers_from_origin(&origin, allowed_origins)
}

/// Build CORS headers from a pre-extracted origin string.
pub fn cors_headers_from_origin(origin: &str, allowed_origins: &str) -> Headers {
    let mut headers = Headers::new();

    let origins: Vec<&str> = allowed_origins.split(',').map(|s| s.trim()).collect();
    if !origin.is_empty() && (origins.contains(&"*") || origins.iter().any(|o| *o == origin)) {
        let _ = headers.set("Access-Control-Allow-Origin", origin);
    }

    let _ = headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    );
    let _ = headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-User-ID, X-User-Email",
    );
    let _ = headers.set("Access-Control-Max-Age", "86400");
    let _ = headers.set("Access-Control-Allow-Credentials", "true");
    headers
}

/// Build a CORS preflight response.
pub fn cors_preflight(req: &Request, allowed_origins: &str) -> Result<Response> {
    let origin = req
        .headers()
        .get("Origin")
        .ok()
        .flatten()
        .unwrap_or_default();
    cors_preflight_with_origin(&origin, allowed_origins)
}

/// Build a CORS preflight response from a pre-extracted origin.
pub fn cors_preflight_with_origin(origin: &str, allowed_origins: &str) -> Result<Response> {
    let mut resp = Response::empty()?.with_status(204);
    let cors = cors_headers_from_origin(origin, allowed_origins);
    for (k, v) in cors.entries() {
        resp.headers_mut().set(&k, &v)?;
    }
    Ok(resp)
}

/// Apply CORS headers to an existing response.
pub fn with_cors(mut resp: Response, req: &Request, allowed_origins: &str) -> Result<Response> {
    let origin = req
        .headers()
        .get("Origin")
        .ok()
        .flatten()
        .unwrap_or_default();
    with_cors_origin(resp, &origin, allowed_origins)
}

/// Apply CORS headers using a pre-extracted origin string.
pub fn with_cors_origin(
    mut resp: Response,
    origin: &str,
    allowed_origins: &str,
) -> Result<Response> {
    let cors = cors_headers_from_origin(origin, allowed_origins);
    for (k, v) in cors.entries() {
        resp.headers_mut().set(&k, &v)?;
    }
    // Security headers
    resp.headers_mut()
        .set("X-Content-Type-Options", "nosniff")?;
    resp.headers_mut().set("X-Frame-Options", "DENY")?;
    Ok(resp)
}

// ── Base64 URL-safe helpers ──

fn base64_url_encode(data: &[u8]) -> String {
    use base64::Engine;
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(data)
}

fn base64_url_decode(s: &str) -> std::result::Result<Vec<u8>, String> {
    use base64::Engine;
    // Handle both padded and unpadded
    base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(s)
        .or_else(|_| base64::engine::general_purpose::URL_SAFE.decode(s))
        .map_err(|e| format!("Base64 decode error: {}", e))
}
