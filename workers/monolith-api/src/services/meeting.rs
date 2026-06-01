//! Meeting Hub service — client/project meeting records with notes and action items.
//! Uses the TASK_DB_URL Neon database alongside tasks, projects, expenses, and toolkit data.

use crate::db::NeonClient;
use crate::middleware::JwtClaims;
use crate::utils;
use serde::{Deserialize, Serialize};
use worker::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Meeting {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub client_id: String,
    #[serde(default)]
    pub client_name: String,
    #[serde(default)]
    pub project_id: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub meeting_url: String,
    #[serde(default)]
    pub provider: String,
    #[serde(default)]
    pub scheduled_at: String,
    #[serde(default)]
    pub duration_minutes: i32,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub agenda: String,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default, deserialize_with = "deserialize_json_array")]
    pub decisions: serde_json::Value,
    #[serde(default, deserialize_with = "deserialize_json_array")]
    pub next_steps: serde_json::Value,
    #[serde(default, deserialize_with = "deserialize_json_array")]
    pub action_items: serde_json::Value,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

const MEETING_COLS: &str = "id::text, user_id::text, COALESCE(client_id::text,'') as client_id, client_name, COALESCE(project_id::text,'') as project_id, project_name, title, meeting_url, provider, COALESCE(scheduled_at::text,'') as scheduled_at, duration_minutes, status, agenda, notes, summary, decisions, next_steps, action_items, created_at::text, updated_at::text";

fn deserialize_json_array<'de, D>(
    deserializer: D,
) -> std::result::Result<serde_json::Value, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let val = serde_json::Value::deserialize(deserializer)?;
    match val {
        serde_json::Value::Array(_) => Ok(val),
        serde_json::Value::String(s) => {
            let parsed =
                serde_json::from_str::<serde_json::Value>(&s).unwrap_or(serde_json::json!([]));
            Ok(if parsed.is_array() {
                parsed
            } else {
                serde_json::json!([])
            })
        }
        _ => Ok(serde_json::json!([])),
    }
}

fn get_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "TASK_DB_URL");
    let url = url.trim().to_string();
    if url.is_empty() {
        return Err(Error::RustError(
            "TASK_DB_URL secret is empty or not set".into(),
        ));
    }
    NeonClient::from_connection_string(&url)
}

async fn ensure_table(db: &NeonClient) -> Result<()> {
    db.execute(
        "CREATE TABLE IF NOT EXISTS meetings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            client_id UUID,
            client_name TEXT NOT NULL DEFAULT '',
            project_id UUID,
            project_name TEXT NOT NULL DEFAULT '',
            title TEXT NOT NULL DEFAULT '',
            meeting_url TEXT NOT NULL DEFAULT '',
            provider TEXT NOT NULL DEFAULT 'other',
            scheduled_at TIMESTAMPTZ,
            duration_minutes INT NOT NULL DEFAULT 30,
            status TEXT NOT NULL DEFAULT 'scheduled',
            agenda TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            summary TEXT NOT NULL DEFAULT '',
            decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
            next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
            action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )",
        &[],
    )
    .await?;

    db.execute(
        "CREATE INDEX IF NOT EXISTS idx_meetings_user_scheduled ON meetings(user_id, scheduled_at DESC)",
        &[],
    )
    .await?;
    db.execute(
        "CREATE INDEX IF NOT EXISTS idx_meetings_user_client ON meetings(user_id, client_id)",
        &[],
    )
    .await?;
    Ok(())
}

fn json_array_string(body: &serde_json::Value, key: &str) -> String {
    let items = body
        .get(key)
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|v| v.as_str().map(|s| serde_json::Value::String(s.to_string())))
        .collect::<Vec<_>>();

    serde_json::Value::Array(items).to_string()
}

pub async fn list_meetings(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let url = req.url()?;
    let status = utils::query_param(&url, "status").unwrap_or_default();
    let search = utils::query_param(&url, "search").unwrap_or_default();
    let client_id = utils::query_param(&url, "client_id").unwrap_or_default();
    let project_id = utils::query_param(&url, "project_id").unwrap_or_default();
    let date_from = utils::query_param(&url, "date_from").unwrap_or_default();
    let date_to = utils::query_param(&url, "date_to").unwrap_or_default();
    let (page, per_page) = utils::parse_pagination(&url);
    let offset = (page - 1) * per_page;

    let db = get_db(env)?;
    ensure_table(&db).await?;

    let mut conditions = vec!["user_id = $1::uuid".to_string()];
    let mut params: Vec<serde_json::Value> = vec![serde_json::json!(claims.user_id)];
    let mut idx = 2;

    if !status.is_empty() {
        conditions.push(format!("status = ${}", idx));
        params.push(serde_json::json!(status));
        idx += 1;
    }
    if !client_id.is_empty() {
        conditions.push(format!("client_id = ${}::uuid", idx));
        params.push(serde_json::json!(client_id));
        idx += 1;
    }
    if !project_id.is_empty() {
        conditions.push(format!("project_id = ${}::uuid", idx));
        params.push(serde_json::json!(project_id));
        idx += 1;
    }
    if !date_from.is_empty() {
        conditions.push(format!("scheduled_at >= ${}::timestamptz", idx));
        params.push(serde_json::json!(date_from));
        idx += 1;
    }
    if !date_to.is_empty() {
        conditions.push(format!("scheduled_at <= ${}::timestamptz", idx));
        params.push(serde_json::json!(date_to));
        idx += 1;
    }
    if !search.is_empty() {
        let like = format!("%{}%", search);
        conditions.push(format!(
            "(title ILIKE ${} OR client_name ILIKE ${} OR project_name ILIKE ${} OR agenda ILIKE ${} OR notes ILIKE ${})",
            idx, idx, idx, idx, idx
        ));
        params.push(serde_json::json!(like));
        idx += 1;
    }

    let where_clause = conditions.join(" AND ");
    let total: i64 = db
        .query_scalar(
            &format!("SELECT COUNT(*) FROM meetings WHERE {}", where_clause),
            &params,
        )
        .await
        .unwrap_or(0);

    params.push(serde_json::json!(per_page));
    params.push(serde_json::json!(offset));
    let meetings: Vec<Meeting> = db
        .query_typed(
            &format!(
                "SELECT {} FROM meetings WHERE {} ORDER BY scheduled_at DESC NULLS LAST, created_at DESC LIMIT ${} OFFSET ${}",
                MEETING_COLS, where_clause, idx, idx + 1
            ),
            &params,
        )
        .await?;

    let total_pages = ((total as i32) + per_page - 1) / per_page;
    utils::json_response(
        &serde_json::json!({"data": meetings, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}),
        200,
    )
}

pub async fn get_meeting(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    ensure_table(&db).await?;
    let meeting: Option<Meeting> = db
        .query_one(
            &format!(
                "SELECT {} FROM meetings WHERE id = $1::uuid AND user_id = $2::uuid",
                MEETING_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(claims.user_id)],
        )
        .await?;

    match meeting {
        Some(m) => utils::json_response(&m, 200),
        None => utils::json_error("Meeting not found", 404),
    }
}

pub async fn create_meeting(req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req
        .clone()?
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let title = body
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();
    if title.is_empty() {
        return utils::json_error("Title is required", 400);
    }

    let db = get_db(env)?;
    ensure_table(&db).await?;

    let meeting: Option<Meeting> = db
        .query_one(
            &format!(
                "INSERT INTO meetings (user_id, client_id, client_name, project_id, project_name, title, meeting_url, provider, scheduled_at, duration_minutes, status, agenda, notes, summary, decisions, next_steps, action_items)
                VALUES ($1::uuid, NULLIF($2, '')::uuid, $3, NULLIF($4, '')::uuid, $5, $6, $7, $8, NULLIF($9, '')::timestamptz, $10, $11, $12, $13, $14, $15::jsonb, $16::jsonb, $17::jsonb)
                RETURNING {}",
                MEETING_COLS
            ),
            &[
                serde_json::json!(claims.user_id),
                serde_json::json!(body.get("client_id").and_then(|v| v.as_str()).unwrap_or("")),
                serde_json::json!(body.get("client_name").and_then(|v| v.as_str()).unwrap_or("")),
                serde_json::json!(body.get("project_id").and_then(|v| v.as_str()).unwrap_or("")),
                serde_json::json!(body.get("project_name").and_then(|v| v.as_str()).unwrap_or("")),
                serde_json::json!(title),
                serde_json::json!(body.get("meeting_url").and_then(|v| v.as_str()).unwrap_or("")),
                serde_json::json!(body.get("provider").and_then(|v| v.as_str()).unwrap_or("other")),
                serde_json::json!(body.get("scheduled_at").and_then(|v| v.as_str()).unwrap_or("")),
                serde_json::json!(body.get("duration_minutes").and_then(|v| v.as_i64()).unwrap_or(30)),
                serde_json::json!(body.get("status").and_then(|v| v.as_str()).unwrap_or("scheduled")),
                serde_json::json!(body.get("agenda").and_then(|v| v.as_str()).unwrap_or("")),
                serde_json::json!(body.get("notes").and_then(|v| v.as_str()).unwrap_or("")),
                serde_json::json!(body.get("summary").and_then(|v| v.as_str()).unwrap_or("")),
                serde_json::json!(json_array_string(&body, "decisions")),
                serde_json::json!(json_array_string(&body, "next_steps")),
                serde_json::json!(json_array_string(&body, "action_items")),
            ],
        )
        .await?;

    match meeting {
        Some(m) => utils::json_response(&m, 201),
        None => utils::json_error("Failed to create meeting", 500),
    }
}

pub async fn update_meeting(
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

    macro_rules! set_text_field {
        ($field:expr, $key:expr, $default:expr) => {
            if let Some(val) = body.get($key) {
                sets.push(format!("{} = ${}", $field, idx));
                params.push(serde_json::json!(val.as_str().unwrap_or($default)));
                idx += 1;
            }
        };
    }

    set_text_field!("title", "title", "");
    set_text_field!("client_name", "client_name", "");
    set_text_field!("project_name", "project_name", "");
    set_text_field!("meeting_url", "meeting_url", "");
    set_text_field!("provider", "provider", "other");
    set_text_field!("status", "status", "scheduled");
    set_text_field!("agenda", "agenda", "");
    set_text_field!("notes", "notes", "");
    set_text_field!("summary", "summary", "");

    if let Some(val) = body.get("duration_minutes") {
        sets.push(format!("duration_minutes = ${}", idx));
        params.push(serde_json::json!(val.as_i64().unwrap_or(30)));
        idx += 1;
    }
    if let Some(val) = body.get("scheduled_at") {
        sets.push(format!("scheduled_at = NULLIF(${}, '')::timestamptz", idx));
        params.push(serde_json::json!(val.as_str().unwrap_or("")));
        idx += 1;
    }
    if let Some(val) = body.get("client_id") {
        sets.push(format!("client_id = NULLIF(${}, '')::uuid", idx));
        params.push(serde_json::json!(val.as_str().unwrap_or("")));
        idx += 1;
    }
    if let Some(val) = body.get("project_id") {
        sets.push(format!("project_id = NULLIF(${}, '')::uuid", idx));
        params.push(serde_json::json!(val.as_str().unwrap_or("")));
        idx += 1;
    }
    for key in ["decisions", "next_steps", "action_items"] {
        if body.get(key).is_some() {
            sets.push(format!("{} = ${}::jsonb", key, idx));
            params.push(serde_json::json!(json_array_string(&body, key)));
            idx += 1;
        }
    }

    sets.push("updated_at = NOW()".to_string());

    if sets.len() <= 1 {
        return utils::json_error("No fields to update", 400);
    }

    params.push(serde_json::json!(id));
    params.push(serde_json::json!(claims.user_id));

    let meeting: Option<Meeting> = db
        .query_one(
            &format!(
                "UPDATE meetings SET {} WHERE id = ${}::uuid AND user_id = ${}::uuid RETURNING {}",
                sets.join(", "),
                idx,
                idx + 1,
                MEETING_COLS
            ),
            &params,
        )
        .await?;

    match meeting {
        Some(m) => utils::json_response(&m, 200),
        None => utils::json_error("Meeting not found", 404),
    }
}

pub async fn delete_meeting(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    ensure_table(&db).await?;
    db.execute(
        "DELETE FROM meetings WHERE id = $1::uuid AND user_id = $2::uuid",
        &[serde_json::json!(id), serde_json::json!(claims.user_id)],
    )
    .await?;
    utils::json_response(
        &serde_json::json!({"message": "Meeting deleted successfully"}),
        200,
    )
}

pub async fn bulk_delete_meetings(req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req.clone()?.json().await?;
    let ids: Vec<String> = body
        .get("ids")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    if ids.is_empty() {
        return utils::json_error("ids is required", 400);
    }
    let db = get_db(env)?;
    ensure_table(&db).await?;
    let pg_arr = utils::to_pg_array(&ids);
    let deleted = db
        .execute(
            "DELETE FROM meetings WHERE user_id = $1::uuid AND id = ANY($2::uuid[])",
            &[serde_json::json!(claims.user_id), serde_json::json!(pg_arr)],
        )
        .await?;
    utils::json_response(
        &serde_json::json!({"message": "Meetings deleted", "deleted": deleted}),
        200,
    )
}

pub async fn meeting_stats(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    ensure_table(&db).await?;

    let rows = db
        .query_as_maps(
            "SELECT status, COUNT(*) as count FROM meetings WHERE user_id = $1::uuid GROUP BY status",
            &[serde_json::json!(claims.user_id)],
        )
        .await?;

    let mut stats = serde_json::json!({
        "scheduled": 0,
        "completed": 0,
        "cancelled": 0,
        "total": 0,
        "upcoming": 0
    });
    let mut total: i64 = 0;
    for row in &rows {
        if let Some(status) = row.get("status").and_then(|v| v.as_str()) {
            let count = row
                .get("count")
                .and_then(|v| {
                    v.as_i64()
                        .or_else(|| v.as_str().and_then(|s| s.parse().ok()))
                })
                .unwrap_or(0);
            stats[status] = serde_json::json!(count);
            total += count;
        }
    }

    let upcoming: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM meetings WHERE user_id = $1::uuid AND status = 'scheduled' AND scheduled_at >= NOW()",
            &[serde_json::json!(claims.user_id)],
        )
        .await
        .unwrap_or(0);

    stats["total"] = serde_json::json!(total);
    stats["upcoming"] = serde_json::json!(upcoming);
    utils::json_response(&stats, 200)
}
