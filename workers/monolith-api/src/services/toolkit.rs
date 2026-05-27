//! Freelancer Toolkit service — profession-specific tools (snippets, checklists, palettes, etc.)
//! Uses the TASK_DB_URL Neon database.

use crate::db::NeonClient;
use crate::middleware::JwtClaims;
use crate::utils;
use serde::{Deserialize, Serialize};
use worker::*;

// ── Models ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolkitItem {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub toolkit_type: String,
    #[serde(default)]
    pub project_id: String,
    #[serde(default)]
    pub client_id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default, deserialize_with = "deserialize_content")]
    pub content: serde_json::Value,
    #[serde(default)]
    pub language: String,
    #[serde(default, deserialize_with = "deserialize_tags")]
    pub tags: Vec<String>,
    #[serde(default)]
    pub is_favorited: bool,
    #[serde(default)]
    pub sort_order: i32,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

/// Deserialize tags from either a JSON array or a PostgreSQL array string like "{a,b}".
fn deserialize_tags<'de, D>(deserializer: D) -> std::result::Result<Vec<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let val = serde_json::Value::deserialize(deserializer)?;
    match val {
        serde_json::Value::Array(arr) => Ok(arr
            .into_iter()
            .filter_map(|v| match v {
                serde_json::Value::String(s) => Some(s),
                other => Some(other.to_string()),
            })
            .collect()),
        serde_json::Value::String(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() || trimmed == "{}" {
                return Ok(vec![]);
            }
            if trimmed.starts_with('{') && trimmed.ends_with('}') {
                let inner = &trimmed[1..trimmed.len() - 1];
                return Ok(inner
                    .split(',')
                    .map(|t| t.trim().trim_matches('"').to_string())
                    .filter(|t| !t.is_empty())
                    .collect());
            }
            Ok(vec![s])
        }
        serde_json::Value::Null => Ok(vec![]),
        _ => Ok(vec![]),
    }
}

/// Deserialize content from either a JSON value or a string-encoded JSON.
fn deserialize_content<'de, D>(deserializer: D) -> std::result::Result<serde_json::Value, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let val = serde_json::Value::deserialize(deserializer)?;
    match &val {
        serde_json::Value::String(s) => {
            // Try to parse string as JSON; if it fails, keep as string
            Ok(serde_json::from_str(s).unwrap_or(val))
        }
        _ => Ok(val),
    }
}

// ── DB Helper ───────────────────────────────────────────────────────

const TOOLKIT_COLS: &str = "id::text, user_id::text, toolkit_type, project_id::text, client_id::text, title, content, language, tags, is_favorited, sort_order, created_at::text, updated_at::text";

fn get_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "TASK_DB_URL");
    let url = url.trim().to_string();
    if url.is_empty() {
        return Err(Error::RustError("TASK_DB_URL secret is empty or not set".into()));
    }
    console_log!("[toolkit] DB URL host: {}", url.split('@').last().unwrap_or("???").split('/').next().unwrap_or("???"));
    NeonClient::from_connection_string(&url)
}

// ══════════════════════════════════════════════════════════════════
//  TOOLKIT ITEM ENDPOINTS
// ══════════════════════════════════════════════════════════════════

/// Ensure the toolkit_items table exists (auto-migration).
async fn ensure_table(db: &NeonClient) -> Result<()> {
    db.execute(
        "CREATE TABLE IF NOT EXISTS toolkit_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            toolkit_type VARCHAR(50) NOT NULL DEFAULT 'snippet',
            project_id UUID,
            client_id UUID,
            title VARCHAR(500) NOT NULL DEFAULT '',
            content JSONB DEFAULT '{}',
            language VARCHAR(50) DEFAULT '',
            tags TEXT[] DEFAULT '{}',
            is_favorited BOOLEAN DEFAULT false,
            sort_order INT DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )",
        &[],
    )
    .await?;
    Ok(())
}

pub async fn list_items(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let url = req.url()?;
    let toolkit_type = utils::query_param(&url, "type").unwrap_or_default();
    let search = utils::query_param(&url, "search").unwrap_or_default();
    let language = utils::query_param(&url, "language").unwrap_or_default();
    let favorited = utils::query_param(&url, "favorited").unwrap_or_default();
    let (page, per_page) = utils::parse_pagination(&url);
    let offset = (page - 1) * per_page;
    let db = get_db(env)?;
    ensure_table(&db).await?;

    let mut conditions = vec!["user_id = $1".to_string()];
    let mut params: Vec<serde_json::Value> = vec![serde_json::json!(claims.user_id)];
    let mut idx = 2;

    if !toolkit_type.is_empty() {
        conditions.push(format!("toolkit_type = ${}", idx));
        params.push(serde_json::json!(toolkit_type));
        idx += 1;
    }
    if !search.is_empty() {
        let like = format!("%{}%", search);
        conditions.push(format!("(title ILIKE ${} OR content::text ILIKE ${})", idx, idx));
        params.push(serde_json::json!(like));
        idx += 1;
    }
    if !language.is_empty() {
        conditions.push(format!("language = ${}", idx));
        params.push(serde_json::json!(language));
        idx += 1;
    }
    if favorited == "true" {
        conditions.push("is_favorited = true".to_string());
    }

    let where_clause = conditions.join(" AND ");

    let total: i64 = db
        .query_scalar(
            &format!("SELECT COUNT(*) FROM toolkit_items WHERE {}", where_clause),
            &params,
        )
        .await
        .unwrap_or(0);

    params.push(serde_json::json!(per_page));
    params.push(serde_json::json!(offset));
    let items: Vec<ToolkitItem> = db
        .query_typed(
            &format!(
                "SELECT {} FROM toolkit_items WHERE {} ORDER BY is_favorited DESC, updated_at DESC LIMIT ${} OFFSET ${}",
                TOOLKIT_COLS, where_clause, idx, idx + 1
            ),
            &params,
        )
        .await?;

    let total_pages = ((total as i32) + per_page - 1) / per_page;
    utils::json_response(
        &serde_json::json!({"data": items, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}),
        200,
    )
}

pub async fn get_item(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    ensure_table(&db).await?;
    let item: Option<ToolkitItem> = db
        .query_one(
            &format!(
                "SELECT {} FROM toolkit_items WHERE id = $1::uuid AND user_id = $2::uuid",
                TOOLKIT_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(claims.user_id)],
        )
        .await?;
    match item {
        Some(i) => utils::json_response(&i, 200),
        None => utils::json_error("Toolkit item not found", 404),
    }
}

pub async fn create_item(req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req
        .clone()?
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let title = body.get("title").and_then(|v| v.as_str()).unwrap_or("");
    if title.is_empty() {
        return utils::json_error("Title is required", 400);
    }
    let db = get_db(env)?;
    ensure_table(&db).await?;

    let tags_str = body
        .get("tags")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|t| t.as_str())
                .collect::<Vec<_>>()
                .join(",")
        })
        .unwrap_or_default();

    let content = body
        .get("content")
        .cloned()
        .unwrap_or(serde_json::json!({}));

    let item: Option<ToolkitItem> = db
        .query_one(
            &format!(
                "INSERT INTO toolkit_items (user_id, toolkit_type, project_id, client_id, title, content, language, tags, sort_order) VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5, $6::jsonb, $7, $8::text[], $9) RETURNING {}",
                TOOLKIT_COLS
            ),
            &[
                serde_json::json!(claims.user_id),
                serde_json::json!(body.get("toolkit_type").and_then(|v| v.as_str()).unwrap_or("snippet")),
                serde_json::json!(body.get("project_id").and_then(|v| v.as_str())),
                serde_json::json!(body.get("client_id").and_then(|v| v.as_str())),
                serde_json::json!(title),
                serde_json::json!(content.to_string()),
                serde_json::json!(body.get("language").and_then(|v| v.as_str()).unwrap_or("")),
                serde_json::json!(format!("{{{}}}", tags_str)),
                serde_json::json!(body.get("sort_order").and_then(|v| v.as_i64()).unwrap_or(0)),
            ],
        )
        .await?;

    match item {
        Some(i) => utils::json_response(&i, 201),
        None => utils::json_error("Failed to create toolkit item", 500),
    }
}

pub async fn update_item(
    req: Request,
    env: &Env,
    claims: &JwtClaims,
    id: &str,
) -> Result<Response> {
    let body: serde_json::Value = req
        .clone()?
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let db = get_db(env)?;
    ensure_table(&db).await?;

    let mut sets = Vec::new();
    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut idx = 1;

    macro_rules! set_field {
        ($field:expr, $key:expr, $extract:expr) => {
            if let Some(val) = body.get($key) {
                sets.push(format!("{} = ${}", $field, idx));
                params.push($extract(val));
                idx += 1;
            }
        };
    }

    set_field!("title", "title", |v: &serde_json::Value| serde_json::json!(
        v.as_str().unwrap_or("")
    ));
    set_field!(
        "toolkit_type",
        "toolkit_type",
        |v: &serde_json::Value| serde_json::json!(v.as_str().unwrap_or("snippet"))
    );
    set_field!(
        "language",
        "language",
        |v: &serde_json::Value| serde_json::json!(v.as_str().unwrap_or(""))
    );
    set_field!(
        "sort_order",
        "sort_order",
        |v: &serde_json::Value| serde_json::json!(v.as_i64().unwrap_or(0))
    );
    set_field!(
        "is_favorited",
        "is_favorited",
        |v: &serde_json::Value| serde_json::json!(v.as_bool().unwrap_or(false))
    );

    if let Some(content) = body.get("content") {
        sets.push(format!("content = ${}::jsonb", idx));
        params.push(serde_json::json!(content.to_string()));
        idx += 1;
    }
    if let Some(val) = body.get("project_id") {
        sets.push(format!("project_id = ${}::uuid", idx));
        params.push(serde_json::json!(val.as_str()));
        idx += 1;
    }
    if let Some(val) = body.get("client_id") {
        sets.push(format!("client_id = ${}::uuid", idx));
        params.push(serde_json::json!(val.as_str()));
        idx += 1;
    }
    if let Some(tags) = body.get("tags").and_then(|v| v.as_array()) {
        let tags_str = tags
            .iter()
            .filter_map(|t| t.as_str())
            .collect::<Vec<_>>()
            .join(",");
        sets.push(format!("tags = ${}::text[]", idx));
        params.push(serde_json::json!(format!("{{{}}}", tags_str)));
        idx += 1;
    }

    sets.push("updated_at = NOW()".to_string());

    if sets.is_empty() {
        return utils::json_error("No fields to update", 400);
    }

    params.push(serde_json::json!(id));
    params.push(serde_json::json!(claims.user_id));

    let sql = format!(
        "UPDATE toolkit_items SET {} WHERE id = ${}::uuid AND user_id = ${}::uuid RETURNING {}",
        sets.join(", "),
        idx,
        idx + 1,
        TOOLKIT_COLS
    );

    let item: Option<ToolkitItem> = db.query_one(&sql, &params).await?;
    match item {
        Some(i) => utils::json_response(&i, 200),
        None => utils::json_error("Toolkit item not found", 404),
    }
}

pub async fn delete_item(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    db.execute(
        "DELETE FROM toolkit_items WHERE id = $1::uuid AND user_id = $2::uuid",
        &[serde_json::json!(id), serde_json::json!(claims.user_id)],
    )
    .await?;
    utils::json_response(
        &serde_json::json!({"message": "Toolkit item deleted successfully"}),
        200,
    )
}

pub async fn bulk_delete_items(req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.clone()?.json().await?;
    let ids: Vec<String> = body
        .get("ids")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    if ids.is_empty() {
        return utils::json_error("ids is required", 400);
    }
    let db = get_db(env)?;
    let pg_arr = utils::to_pg_array(&ids);
    let deleted = db
        .execute(
            "DELETE FROM toolkit_items WHERE user_id = $1::uuid AND id = ANY($2::uuid[])",
            &[serde_json::json!(claims.user_id), serde_json::json!(pg_arr)],
        )
        .await?;
    utils::json_response(
        &serde_json::json!({"message": "Toolkit items deleted", "deleted": deleted}),
        200,
    )
}

/// Returns aggregated stats grouped by toolkit_type.
pub async fn toolkit_stats(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    ensure_table(&db).await?;
    let rows = db
        .query_as_maps(
            "SELECT toolkit_type, COUNT(*) as count FROM toolkit_items WHERE user_id = $1::uuid GROUP BY toolkit_type",
            &[serde_json::json!(claims.user_id)],
        )
        .await?;

    let mut stats = serde_json::Map::new();
    let mut total: i64 = 0;
    for row in &rows {
        if let Some(toolkit_type) = row.get("toolkit_type").and_then(|v| v.as_str()) {
            let count = row
                .get("count")
                .and_then(|v| {
                    v.as_i64()
                        .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
                })
                .unwrap_or(0);
            stats.insert(toolkit_type.to_string(), serde_json::json!(count));
            total += count;
        }
    }
    stats.insert("total".to_string(), serde_json::json!(total));

    utils::json_response(&serde_json::Value::Object(stats), 200)
}
