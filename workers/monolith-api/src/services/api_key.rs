//! API Key management service for external integrations.
//! Enables VS Code extensions, CI/CD, Zapier, and other clients to authenticate
//! via long-lived API keys instead of short-lived JWT tokens.

use serde::{Deserialize, Serialize};
use worker::*;

use crate::db::NeonClient;
use crate::middleware::JwtClaims;
use crate::utils;

// ── Data types ──

/// An API key as stored in the database (key_hash is never exposed).
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiKey {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub key_prefix: String,
    #[serde(default)]
    pub scopes: Vec<String>,
    #[serde(default)]
    pub last_used_at: String,
    #[serde(default)]
    pub expires_at: String,
    #[serde(default)]
    pub is_active: bool,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

/// Context extracted from a valid API key.
#[derive(Debug, Clone)]
pub struct ApiKeyContext {
    pub user_id: String,
    pub email: String,
    pub scopes: Vec<String>,
    pub key_id: String,
}

/// Request body for creating an API key.
#[derive(Debug, Deserialize)]
pub struct CreateApiKeyRequest {
    pub name: String,
    #[serde(default)]
    pub scopes: Vec<String>,
    /// ISO 8601 expiration date, or null for never expires
    pub expires_at: Option<String>,
}

/// Request body for updating an API key.
#[derive(Debug, Deserialize)]
pub struct UpdateApiKeyRequest {
    pub name: Option<String>,
    pub scopes: Option<Vec<String>>,
    pub is_active: Option<bool>,
}

// ── Valid scopes ──

const VALID_SCOPES: &[&str] = &[
    "tasks:read",
    "tasks:write",
    "time:read",
    "time:write",
    "projects:read",
    "projects:write",
    "invoices:read",
    "invoices:write",
    "clients:read",
    "clients:write",
    "expenses:read",
    "expenses:write",
    "meetings:read",
    "meetings:write",
    "toolkit:read",
    "toolkit:write",
    "profile:read",
    "notifications:read",
];

/// Check if a scope string is valid.
fn is_valid_scope(scope: &str) -> bool {
    VALID_SCOPES.contains(&scope)
}

/// Check if the given scopes include the required scope.
pub fn has_scope(scopes: &[String], required: &str) -> bool {
    scopes.iter().any(|s| s == "*" || s == required)
}

// ── Database helpers ──

fn get_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "AUTH_DB_URL");
    NeonClient::from_connection_string(&url)
}

/// Ensure the api_keys table exists.
async fn ensure_table(db: &NeonClient) -> Result<()> {
    db.execute(
        "CREATE TABLE IF NOT EXISTS api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            key_hash VARCHAR(256) NOT NULL,
            key_prefix VARCHAR(12) NOT NULL,
            scopes TEXT[] DEFAULT '{}',
            last_used_at TIMESTAMPTZ,
            expires_at TIMESTAMPTZ,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )",
        &[],
    )
    .await?;
    Ok(())
}

// ── Key generation ──

/// Generate a new API key string: `iq_live_<32 random hex chars>`
fn generate_api_key() -> String {
    let mut buf = [0u8; 24];
    getrandom::getrandom(&mut buf).expect("getrandom failed");
    format!("iq_live_{}", hex::encode(buf))
}

/// Extract the prefix from a key (first 12 chars including `iq_live_` + 4).
fn key_prefix(key: &str) -> String {
    key.chars().take(12).collect()
}

// ── API key validation (used by middleware) ──

/// Validate an API key and return the associated user context.
/// This is called from the middleware layer.
pub async fn validate_api_key(key: &str, env: &Env) -> std::result::Result<ApiKeyContext, String> {
    let db = get_db(env).map_err(|e| format!("DB error: {}", e))?;

    let prefix = key_prefix(key);

    // Step 1: Find keys with matching prefix (no JOIN to avoid type issues)
    let rows: Vec<ApiKeyRow> = db
        .query_typed(
            "SELECT id::text, user_id::text, key_hash, scopes,
                    COALESCE(expires_at::text, '') as expires_at
             FROM api_keys
             WHERE key_prefix = $1 AND is_active = true",
            &[serde_json::Value::String(prefix)],
        )
        .await
        .map_err(|e| format!("DB query error: {}", e))?;

    if rows.is_empty() {
        return Err("Invalid API key".into());
    }

    // Step 2: Verify hash against each matching row
    for row in &rows {
        let hash_ok = bcrypt::verify(key, &row.key_hash).unwrap_or(false);

        if hash_ok {
            // Check expiration
            if !row.expires_at.is_empty() {
                if let Ok(exp) = chrono::DateTime::parse_from_rfc3339(&row.expires_at) {
                    if chrono::Utc::now() > exp {
                        return Err("API key has expired".into());
                    }
                }
            }

            // Step 3: Fetch user email
            let email = match db
                .query_typed::<EmailRow>(
                    "SELECT email FROM users WHERE id = $1",
                    &[serde_json::Value::String(row.user_id.clone())],
                )
                .await
            {
                Ok(emails) if !emails.is_empty() => emails[0].email.clone(),
                _ => String::new(),
            };

            // Update last_used_at (best-effort)
            let _ = db
                .execute(
                    "UPDATE api_keys SET last_used_at = NOW() WHERE id = $1::uuid",
                    &[serde_json::Value::String(row.id.clone())],
                )
                .await;

            return Ok(ApiKeyContext {
                user_id: row.user_id.clone(),
                email,
                scopes: row.scopes.clone(),
                key_id: row.id.clone(),
            });
        }
    }

    Err("Invalid API key".into())
}

#[derive(Debug, Deserialize)]
struct ApiKeyRow {
    #[serde(default)]
    id: String,
    #[serde(default)]
    user_id: String,
    #[serde(default)]
    key_hash: String,
    #[serde(default)]
    scopes: Vec<String>,
    #[serde(default)]
    expires_at: String,
}

#[derive(Debug, Deserialize)]
struct EmailRow {
    #[serde(default)]
    email: String,
}

// ══════════════════════════════════════════════════════════
//  CRUD Endpoints
// ══════════════════════════════════════════════════════════

/// POST /api/v1/api-keys — Create a new API key.
/// Returns the full key ONCE (never stored/returned again).
pub async fn create_api_key(
    mut req: Request,
    env: &Env,
    claims: &JwtClaims,
) -> Result<Response> {
    let body: CreateApiKeyRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid JSON body".into()))?;

    // Validate name
    let name = body.name.trim();
    if name.is_empty() || name.len() > 100 {
        return utils::json_error("Name is required and must be 100 chars or less", 400);
    }

    // Validate scopes
    let scopes = if body.scopes.is_empty() {
        // Default scopes for convenience
        vec![
            "tasks:read".to_string(),
            "tasks:write".to_string(),
            "time:read".to_string(),
            "time:write".to_string(),
            "projects:read".to_string(),
            "projects:write".to_string(),
            "profile:read".to_string(),
        ]
    } else {
        for scope in &body.scopes {
            if !is_valid_scope(scope) {
                return utils::json_error(
                    &format!("Invalid scope: '{}'. Valid scopes: {:?}", scope, VALID_SCOPES),
                    400,
                );
            }
        }
        body.scopes
    };

    let db = get_db(env)?;
    ensure_table(&db).await?;

    // Check limit: max 5 active keys per user
    let count: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM api_keys WHERE user_id = $1::uuid AND is_active = true",
            &[serde_json::Value::String(claims.user_id.clone())],
        )
        .await
        .unwrap_or(0);

    if count >= 5 {
        return utils::json_error(
            "Maximum 5 active API keys per account. Please revoke an existing key first.",
            400,
        );
    }

    // Generate key and hash
    let raw_key = generate_api_key();
    let prefix = key_prefix(&raw_key);
    let hash = bcrypt::hash(&raw_key, 10)
        .map_err(|e| Error::RustError(format!("Hash error: {}", e)))?;

    // Convert scopes to PG array
    let scopes_pg = utils::to_pg_array(&scopes);

    // Build insert
    let expires_param = match &body.expires_at {
        Some(exp) if !exp.is_empty() => serde_json::Value::String(exp.clone()),
        _ => serde_json::Value::Null,
    };

    let result: Option<InsertedKey> = db
        .query_one(
            "INSERT INTO api_keys (user_id, name, key_hash, key_prefix, scopes, expires_at)
             VALUES ($1::uuid, $2, $3, $4, $5::text[], $6::timestamptz)
             RETURNING id::text, created_at::text",
            &[
                serde_json::Value::String(claims.user_id.clone()),
                serde_json::Value::String(name.to_string()),
                serde_json::Value::String(hash),
                serde_json::Value::String(prefix.clone()),
                serde_json::Value::String(scopes_pg),
                expires_param,
            ],
        )
        .await?;

    let inserted = result.ok_or_else(|| Error::RustError("Insert failed".into()))?;

    // Return the full key ONCE — it will never be retrievable again
    utils::json_response(
        &serde_json::json!({
            "data": {
                "id": inserted.id,
                "name": name,
                "key": raw_key,
                "key_prefix": prefix,
                "scopes": scopes,
                "created_at": inserted.created_at,
            },
            "meta": {
                "warning": "Store this API key securely. It will not be shown again."
            }
        }),
        201,
    )
}

#[derive(Debug, Deserialize)]
struct InsertedKey {
    #[serde(default)]
    id: String,
    #[serde(default)]
    created_at: String,
}

/// GET /api/v1/api-keys — List all API keys for the current user.
/// Keys are masked (only prefix shown).
pub async fn list_api_keys(
    _req: &Request,
    env: &Env,
    claims: &JwtClaims,
) -> Result<Response> {
    let db = get_db(env)?;
    ensure_table(&db).await?;

    let keys: Vec<ApiKey> = db
        .query_typed(
            "SELECT id::text, user_id::text, name, key_prefix, scopes,
                    COALESCE(last_used_at::text, '') as last_used_at,
                    COALESCE(expires_at::text, '') as expires_at,
                    is_active,
                    created_at::text, updated_at::text
             FROM api_keys
             WHERE user_id = $1::uuid
             ORDER BY created_at DESC",
            &[serde_json::Value::String(claims.user_id.clone())],
        )
        .await?;

    utils::json_response(
        &serde_json::json!({
            "data": keys,
            "meta": {
                "total": keys.len(),
                "available_scopes": VALID_SCOPES,
            }
        }),
        200,
    )
}

/// DELETE /api/v1/api-keys/:id — Revoke (deactivate) an API key.
pub async fn revoke_api_key(
    env: &Env,
    claims: &JwtClaims,
    key_id: &str,
) -> Result<Response> {
    let db = get_db(env)?;

    let affected = db
        .execute(
            "UPDATE api_keys SET is_active = false, updated_at = NOW()
             WHERE id = $1::uuid AND user_id = $2::uuid",
            &[
                serde_json::Value::String(key_id.to_string()),
                serde_json::Value::String(claims.user_id.clone()),
            ],
        )
        .await?;

    if affected == 0 {
        return utils::json_error("API key not found", 404);
    }

    utils::json_response(
        &serde_json::json!({
            "data": { "id": key_id, "is_active": false },
            "meta": { "message": "API key revoked successfully" }
        }),
        200,
    )
}

/// PUT /api/v1/api-keys/:id — Update API key name, scopes, or active status.
pub async fn update_api_key(
    mut req: Request,
    env: &Env,
    claims: &JwtClaims,
    key_id: &str,
) -> Result<Response> {
    let body: UpdateApiKeyRequest = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid JSON body".into()))?;

    let db = get_db(env)?;

    // Build dynamic UPDATE
    let mut set_parts: Vec<String> = vec!["updated_at = NOW()".to_string()];
    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut idx = 1;

    if let Some(name) = &body.name {
        let name = name.trim();
        if name.is_empty() || name.len() > 100 {
            return utils::json_error("Name must be 1-100 chars", 400);
        }
        set_parts.push(format!("name = ${}", idx));
        params.push(serde_json::Value::String(name.to_string()));
        idx += 1;
    }

    if let Some(scopes) = &body.scopes {
        for scope in scopes {
            if !is_valid_scope(scope) {
                return utils::json_error(
                    &format!("Invalid scope: '{}'. Valid: {:?}", scope, VALID_SCOPES),
                    400,
                );
            }
        }
        let scopes_pg = utils::to_pg_array(scopes);
        set_parts.push(format!("scopes = ${}::text[]", idx));
        params.push(serde_json::Value::String(scopes_pg));
        idx += 1;
    }

    if let Some(active) = body.is_active {
        set_parts.push(format!("is_active = ${}", idx));
        params.push(serde_json::Value::Bool(active));
        idx += 1;
    }

    // Add WHERE params
    params.push(serde_json::Value::String(key_id.to_string()));
    let key_idx = idx;
    params.push(serde_json::Value::String(claims.user_id.clone()));
    let user_idx = idx + 1;

    let sql = format!(
        "UPDATE api_keys SET {} WHERE id = ${}::uuid AND user_id = ${}::uuid",
        set_parts.join(", "),
        key_idx,
        user_idx,
    );

    let affected = db.execute(&sql, &params).await?;

    if affected == 0 {
        return utils::json_error("API key not found", 404);
    }

    utils::json_response(
        &serde_json::json!({
            "data": { "id": key_id, "updated": true },
            "meta": { "message": "API key updated successfully" }
        }),
        200,
    )
}

/// GET /api/v1/api-keys/scopes — List all available scopes.
pub async fn list_scopes() -> Result<Response> {
    utils::json_response(
        &serde_json::json!({
            "data": VALID_SCOPES,
            "meta": {
                "total": VALID_SCOPES.len(),
                "description": "Available API key permission scopes"
            }
        }),
        200,
    )
}
