//! Client Portal — token-based public dashboard for clients.

use crate::db::NeonClient;
use crate::middleware::JwtClaims;
use crate::utils;
use serde::{Deserialize, Serialize};
use worker::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortalToken {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub client_id: String,
    #[serde(default)]
    pub token: String,
    #[serde(default)]
    pub client_name: String,
    #[serde(default)]
    pub client_email: String,
    #[serde(default)]
    pub is_active: bool,
    #[serde(default)]
    pub created_at: String,
    pub expires_at: Option<String>,
}

const PT_COLS: &str = "id, user_id, client_id, token, client_name, client_email, is_active, created_at::text, expires_at::text";

fn get_inv_db(env: &Env) -> Result<NeonClient> {
    NeonClient::from_connection_string(&utils::get_secret(env, "INVOICE_DB_URL"))
}
fn get_cl_db(env: &Env) -> Result<NeonClient> {
    NeonClient::from_connection_string(&utils::get_secret(env, "CLIENT_DB_URL"))
}

async fn ensure_table(db: &NeonClient) -> Result<()> {
    db.execute("CREATE TABLE IF NOT EXISTS client_portal_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, client_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE, client_name TEXT NOT NULL DEFAULT '', client_email TEXT NOT NULL DEFAULT '', is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), expires_at TIMESTAMPTZ)", &[]).await?;
    Ok(())
}

pub async fn list_portal_links(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_inv_db(env)?;
    ensure_table(&db).await?;
    let links: Vec<PortalToken> = db
        .query_typed(
            &format!(
                "SELECT {} FROM client_portal_tokens WHERE user_id=$1 ORDER BY created_at DESC",
                PT_COLS
            ),
            &[serde_json::json!(claims.user_id)],
        )
        .await?;
    utils::json_response(&serde_json::json!({"data": links}), 200)
}

pub async fn generate_portal_link(
    env: &Env,
    claims: &JwtClaims,
    client_id: &str,
) -> Result<Response> {
    let db = get_inv_db(env)?;
    ensure_table(&db).await?;
    // Check existing
    let existing: Option<PortalToken> = db.query_one(&format!("SELECT {} FROM client_portal_tokens WHERE user_id=$1 AND client_id=$2 AND is_active=true", PT_COLS), &[serde_json::json!(claims.user_id), serde_json::json!(client_id)]).await?;
    if let Some(e) = existing {
        return utils::json_response(&e, 200);
    }

    // Get client info
    let cl_db = get_cl_db(env)?;
    let client: Option<serde_json::Value> = cl_db
        .query_one(
            "SELECT name, email FROM clients WHERE id=$1 AND user_id=$2",
            &[
                serde_json::json!(client_id),
                serde_json::json!(claims.user_id),
            ],
        )
        .await?;
    let (name, email) = match client {
        Some(c) => (
            c.get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            c.get("email")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
        ),
        None => return utils::json_error("Client not found", 404),
    };

    let id = utils::generate_id();
    let token = utils::generate_id();
    db.execute("INSERT INTO client_portal_tokens (id,user_id,client_id,token,client_name,client_email) VALUES ($1,$2,$3,$4,$5,$6)",
        &[serde_json::json!(id), serde_json::json!(claims.user_id), serde_json::json!(client_id), serde_json::json!(token), serde_json::json!(name), serde_json::json!(email)]).await?;

    let link: Option<PortalToken> = db
        .query_one(
            &format!("SELECT {} FROM client_portal_tokens WHERE id=$1", PT_COLS),
            &[serde_json::json!(id)],
        )
        .await?;
    match link {
        Some(l) => utils::json_response(&l, 201),
        None => utils::json_error("Failed", 500),
    }
}

pub async fn revoke_portal_link(
    env: &Env,
    claims: &JwtClaims,
    client_id: &str,
) -> Result<Response> {
    let db = get_inv_db(env)?;
    db.execute(
        "UPDATE client_portal_tokens SET is_active=false WHERE user_id=$1 AND client_id=$2",
        &[
            serde_json::json!(claims.user_id),
            serde_json::json!(client_id),
        ],
    )
    .await?;
    utils::json_response(
        &serde_json::json!({"message": "Portal access revoked"}),
        200,
    )
}

pub async fn bulk_delete(mut req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let ids: Vec<String> = body
        .get("ids")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    if ids.is_empty() {
        return utils::json_error("ids is required", 400);
    }
    let db = get_inv_db(env)?;
    let pg_arr = utils::to_pg_array(&ids);
    let deleted = db
        .execute(
            "DELETE FROM client_portal_tokens WHERE user_id=$1 AND id=ANY($2)",
            &[serde_json::json!(claims.user_id), serde_json::json!(pg_arr)],
        )
        .await?;
    utils::json_response(
        &serde_json::json!({"message": "Portal links deleted", "deleted": deleted}),
        200,
    )
}

pub async fn update_portal_link(
    env: &Env,
    claims: &JwtClaims,
    client_id: &str,
    body: &str,
) -> Result<Response> {
    #[derive(Deserialize)]
    struct UpdateBody {
        name: Option<String>,
        email: Option<String>,
    }
    let payload: UpdateBody = serde_json::from_str(body)
        .map_err(|e| worker::Error::RustError(format!("Invalid JSON: {}", e)))?;

    let db = get_inv_db(env)?;
    ensure_table(&db).await?;

    // Update portal token record
    if let Some(ref name) = payload.name {
        db.execute("UPDATE client_portal_tokens SET client_name=$1 WHERE user_id=$2 AND client_id=$3 AND is_active=true",
            &[serde_json::json!(name), serde_json::json!(claims.user_id), serde_json::json!(client_id)]).await?;
    }
    if let Some(ref email) = payload.email {
        db.execute("UPDATE client_portal_tokens SET client_email=$1 WHERE user_id=$2 AND client_id=$3 AND is_active=true",
            &[serde_json::json!(email), serde_json::json!(claims.user_id), serde_json::json!(client_id)]).await?;
    }

    // Also update the client record in clients DB
    let cl_db = get_cl_db(env)?;
    if let Some(ref name) = payload.name {
        cl_db
            .execute(
                "UPDATE clients SET name=$1 WHERE id=$2 AND user_id=$3",
                &[
                    serde_json::json!(name),
                    serde_json::json!(client_id),
                    serde_json::json!(claims.user_id),
                ],
            )
            .await?;
    }
    if let Some(ref email) = payload.email {
        cl_db
            .execute(
                "UPDATE clients SET email=$1 WHERE id=$2 AND user_id=$3",
                &[
                    serde_json::json!(email),
                    serde_json::json!(client_id),
                    serde_json::json!(claims.user_id),
                ],
            )
            .await?;
    }

    // Return updated portal link
    let link: Option<PortalToken> = db.query_one(&format!("SELECT {} FROM client_portal_tokens WHERE user_id=$1 AND client_id=$2 AND is_active=true", PT_COLS),
        &[serde_json::json!(claims.user_id), serde_json::json!(client_id)]).await?;
    match link {
        Some(l) => utils::json_response(&l, 200),
        None => utils::json_error("Portal link not found", 404),
    }
}

pub async fn get_portal(env: &Env, token: &str) -> Result<Response> {
    let db = get_inv_db(env)?;
    ensure_table(&db).await?;
    let pt: Option<PortalToken> = db
        .query_one(
            &format!(
                "SELECT {} FROM client_portal_tokens WHERE token=$1 AND is_active=true",
                PT_COLS
            ),
            &[serde_json::json!(token)],
        )
        .await?;
    let pt = match pt {
        Some(p) => p,
        None => return utils::json_error("Portal not found or expired", 404),
    };

    // Get business info
    let settings: Option<serde_json::Value> = db
        .query_one(
            "SELECT business_name, logo_url, accent_color FROM invoice_settings WHERE user_id=$1",
            &[serde_json::json!(pt.user_id)],
        )
        .await
        .unwrap_or(None);
    let bname = settings
        .as_ref()
        .and_then(|s| s.get("business_name"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let blog = settings
        .as_ref()
        .and_then(|s| s.get("logo_url"))
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let bcolor = settings
        .as_ref()
        .and_then(|s| s.get("accent_color"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    // Get invoices
    let invoices = db.query_as_maps("SELECT id, invoice_number, total, amount_paid, amount_remaining, status, currency, COALESCE(due_date,'') as due_date, COALESCE(payment_link,'') as payment_link, created_at::text, paid_at::text FROM invoices WHERE user_id=$1 AND client_id=$2 ORDER BY created_at DESC", &[serde_json::json!(pt.user_id), serde_json::json!(pt.client_id)]).await.unwrap_or_default();
    let quotations = db.query_as_maps("SELECT id, quotation_number, total, status, currency, COALESCE(valid_until,'') as valid_until, COALESCE(accept_token,'') as accept_token, created_at::text FROM quotations WHERE user_id=$1 AND client_id=$2 ORDER BY created_at DESC", &[serde_json::json!(pt.user_id), serde_json::json!(pt.client_id)]).await.unwrap_or_default();

    let total_inv = invoices.len() as i64;
    let total_paid: f64 = invoices
        .iter()
        .filter(|i| i.get("status").and_then(|v| v.as_str()) == Some("paid"))
        .map(|i| i.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0))
        .sum();
    let total_outstanding: f64 = invoices
        .iter()
        .filter(|i| i.get("status").and_then(|v| v.as_str()) != Some("paid"))
        .map(|i| {
            i.get("amount_remaining")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0)
        })
        .sum();

    utils::json_response(
        &serde_json::json!({
            "client": {"name": pt.client_name, "email": pt.client_email, "company": "", "business_name": bname, "business_logo": blog, "accent_color": bcolor},
            "invoices": invoices, "quotations": quotations,
            "stats": {"total_invoices": total_inv, "total_paid": total_paid, "total_outstanding": total_outstanding, "total_quotations": quotations.len()}
        }),
        200,
    )
}
