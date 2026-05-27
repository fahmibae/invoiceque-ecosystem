//! Task & Project service — CRUD operations with Neon task-service DB.

use crate::db::NeonClient;
use crate::middleware::JwtClaims;
use crate::utils;
use serde::{Deserialize, Serialize};
use worker::*;

// ── Models ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub project_id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub priority: String,
    #[serde(default)]
    pub client_id: String,
    #[serde(default)]
    pub client_name: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub due_date: String,
    #[serde(default)]
    pub hourly_rate: i64,
    #[serde(default)]
    pub estimated_hours: f64,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub sort_order: i32,
    #[serde(default)]
    pub completed_at: String,
    #[serde(default)]
    pub invoice_generated: bool,
    #[serde(default)]
    pub invoice_id: String,
    #[serde(default = "default_currency")]
    pub currency: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

fn default_currency() -> String {
    "IDR".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub client_id: String,
    #[serde(default)]
    pub client_name: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub budget: i64,
    #[serde(default)]
    pub hourly_rate: i64,
    #[serde(default)]
    pub color: String,
    #[serde(default)]
    pub start_date: String,
    #[serde(default)]
    pub deadline: String,
    #[serde(default = "default_currency")]
    pub currency: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

// ── DB Helper ───────────────────────────────────────────────────────

const TASK_COLS: &str = "id::text, user_id::text, project_id::text, title, description, status, priority, client_id::text, client_name, project_name, due_date::text, hourly_rate, estimated_hours, tags, sort_order, completed_at::text, invoice_generated, invoice_id::text, currency, created_at::text, updated_at::text";

const PROJECT_COLS: &str = "id::text, user_id::text, name, description, client_id::text, client_name, status, budget, hourly_rate, color, start_date::text, deadline::text, currency, created_at::text, updated_at::text";

fn get_db(env: &Env) -> Result<NeonClient> {
    let url = utils::get_secret(env, "TASK_DB_URL");
    NeonClient::from_connection_string(&url)
}

// ══════════════════════════════════════════════════════════════════
//  TASK ENDPOINTS
// ══════════════════════════════════════════════════════════════════

pub async fn list_tasks(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let url = req.url()?;
    let status_filter = utils::query_param(&url, "status").unwrap_or_default();
    let priority_filter = utils::query_param(&url, "priority").unwrap_or_default();
    let search = utils::query_param(&url, "search").unwrap_or_default();
    let (page, per_page) = utils::parse_pagination(&url);
    let offset = (page - 1) * per_page;
    let db = get_db(env)?;

    let mut conditions = vec!["user_id = $1".to_string()];
    let mut params: Vec<serde_json::Value> = vec![serde_json::json!(claims.user_id)];
    let mut idx = 2;

    if !status_filter.is_empty() {
        conditions.push(format!("status = ${}", idx));
        params.push(serde_json::json!(status_filter));
        idx += 1;
    }
    if !priority_filter.is_empty() {
        conditions.push(format!("priority = ${}", idx));
        params.push(serde_json::json!(priority_filter));
        idx += 1;
    }
    if !search.is_empty() {
        let like = format!("%{}%", search);
        conditions.push(format!(
            "(title ILIKE ${} OR project_name ILIKE ${})",
            idx, idx
        ));
        params.push(serde_json::json!(like));
        idx += 1;
    }

    let where_clause = conditions.join(" AND ");

    let total: i64 = db
        .query_scalar(
            &format!("SELECT COUNT(*) FROM tasks WHERE {}", where_clause),
            &params,
        )
        .await?;

    params.push(serde_json::json!(per_page));
    params.push(serde_json::json!(offset));
    let tasks: Vec<Task> = db
        .query_typed(
            &format!(
                "SELECT {} FROM tasks WHERE {} ORDER BY sort_order ASC, created_at DESC LIMIT ${} OFFSET ${}",
                TASK_COLS, where_clause, idx, idx + 1
            ),
            &params,
        )
        .await?;

    let total_pages = ((total as i32) + per_page - 1) / per_page;
    utils::json_response(
        &serde_json::json!({"data": tasks, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}),
        200,
    )
}

pub async fn get_task(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let task: Option<Task> = db
        .query_one(
            &format!(
                "SELECT {} FROM tasks WHERE id = $1::uuid AND user_id = $2::uuid",
                TASK_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(claims.user_id)],
        )
        .await?;
    match task {
        Some(t) => utils::json_response(&t, 200),
        None => utils::json_error("Task not found", 404),
    }
}

pub async fn create_task(req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
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

    let task: Option<Task> = db.query_one(
        &format!("INSERT INTO tasks (user_id, project_id, title, description, status, priority, client_id, client_name, project_name, due_date, hourly_rate, estimated_hours, tags, sort_order, currency) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::uuid, $8, $9, $10::date, $11, $12, $13::text[], $14, $15) RETURNING {}", TASK_COLS),
        &[
            serde_json::json!(claims.user_id),
            serde_json::json!(body.get("project_id").and_then(|v| v.as_str())),
            serde_json::json!(title),
            serde_json::json!(body.get("description").and_then(|v| v.as_str()).unwrap_or("")),
            serde_json::json!(body.get("status").and_then(|v| v.as_str()).unwrap_or("todo")),
            serde_json::json!(body.get("priority").and_then(|v| v.as_str()).unwrap_or("medium")),
            serde_json::json!(body.get("client_id").and_then(|v| v.as_str())),
            serde_json::json!(body.get("client_name").and_then(|v| v.as_str()).unwrap_or("")),
            serde_json::json!(body.get("project_name").and_then(|v| v.as_str()).unwrap_or("")),
            serde_json::json!(body.get("due_date").and_then(|v| v.as_str())),
            serde_json::json!(body.get("hourly_rate").and_then(|v| v.as_i64()).unwrap_or(0)),
            serde_json::json!(body.get("estimated_hours").and_then(|v| v.as_f64()).unwrap_or(0.0)),
            serde_json::json!(format!("{{{}}}", tags_str)),
            serde_json::json!(body.get("sort_order").and_then(|v| v.as_i64()).unwrap_or(0)),
            serde_json::json!(body.get("currency").and_then(|v| v.as_str()).unwrap_or("IDR")),
        ],
    ).await?;

    match task {
        Some(t) => utils::json_response(&t, 201),
        None => utils::json_error("Failed to create task", 500),
    }
}

pub async fn update_task(
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
        "description",
        "description",
        |v: &serde_json::Value| serde_json::json!(v.as_str().unwrap_or(""))
    );
    set_field!(
        "status",
        "status",
        |v: &serde_json::Value| serde_json::json!(v.as_str().unwrap_or("todo"))
    );
    set_field!(
        "priority",
        "priority",
        |v: &serde_json::Value| serde_json::json!(v.as_str().unwrap_or("medium"))
    );
    set_field!(
        "client_name",
        "client_name",
        |v: &serde_json::Value| serde_json::json!(v.as_str().unwrap_or(""))
    );
    set_field!(
        "project_name",
        "project_name",
        |v: &serde_json::Value| serde_json::json!(v.as_str().unwrap_or(""))
    );
    set_field!(
        "hourly_rate",
        "hourly_rate",
        |v: &serde_json::Value| serde_json::json!(v.as_i64().unwrap_or(0))
    );
    set_field!(
        "estimated_hours",
        "estimated_hours",
        |v: &serde_json::Value| serde_json::json!(v.as_f64().unwrap_or(0.0))
    );
    set_field!(
        "sort_order",
        "sort_order",
        |v: &serde_json::Value| serde_json::json!(v.as_i64().unwrap_or(0))
    );
    set_field!(
        "invoice_generated",
        "invoice_generated",
        |v: &serde_json::Value| serde_json::json!(v.as_bool().unwrap_or(false))
    );
    set_field!(
        "currency",
        "currency",
        |v: &serde_json::Value| serde_json::json!(v.as_str().unwrap_or("IDR"))
    );

    if let Some(val) = body.get("due_date") {
        sets.push(format!("due_date = ${}::date", idx));
        params.push(serde_json::json!(val.as_str()));
        idx += 1;
    }
    if let Some(val) = body.get("invoice_id") {
        sets.push(format!("invoice_id = ${}::uuid", idx));
        params.push(serde_json::json!(val.as_str()));
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

    // Handle completed_at: set when status=done, clear otherwise
    if let Some(status) = body.get("status").and_then(|v| v.as_str()) {
        if status == "done" {
            sets.push("completed_at = NOW()".to_string());
        } else {
            sets.push("completed_at = NULL".to_string());
        }
    }

    sets.push("updated_at = NOW()".to_string());

    if sets.is_empty() {
        return utils::json_error("No fields to update", 400);
    }

    params.push(serde_json::json!(id));
    params.push(serde_json::json!(claims.user_id));

    let sql = format!(
        "UPDATE tasks SET {} WHERE id = ${}::uuid AND user_id = ${}::uuid RETURNING {}",
        sets.join(", "),
        idx,
        idx + 1,
        TASK_COLS
    );

    let task: Option<Task> = db.query_one(&sql, &params).await?;
    match task {
        Some(t) => utils::json_response(&t, 200),
        None => utils::json_error("Task not found", 404),
    }
}

pub async fn delete_task(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    db.execute(
        "DELETE FROM tasks WHERE id = $1::uuid AND user_id = $2::uuid",
        &[serde_json::json!(id), serde_json::json!(claims.user_id)],
    )
    .await?;
    utils::json_response(
        &serde_json::json!({"message": "Task deleted successfully"}),
        200,
    )
}

pub async fn bulk_delete_tasks(req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
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
            "DELETE FROM tasks WHERE user_id = $1::uuid AND id = ANY($2::uuid[])",
            &[serde_json::json!(claims.user_id), serde_json::json!(pg_arr)],
        )
        .await?;
    utils::json_response(
        &serde_json::json!({"message": "Tasks deleted", "deleted": deleted}),
        200,
    )
}

pub async fn task_stats(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let rows = db
        .query_as_maps(
            "SELECT status, COUNT(*) as count FROM tasks WHERE user_id = $1::uuid GROUP BY status",
            &[serde_json::json!(claims.user_id)],
        )
        .await?;

    let mut stats = serde_json::json!({
        "backlog": 0, "todo": 0, "inprogress": 0, "done": 0, "total": 0
    });
    let mut total: i64 = 0;
    for row in &rows {
        if let Some(status) = row.get("status").and_then(|v| v.as_str()) {
            let count = row
                .get("count")
                .and_then(|v| {
                    v.as_i64()
                        .or_else(|| v.as_str().and_then(|s| s.parse::<i64>().ok()))
                })
                .unwrap_or(0);
            stats[status] = serde_json::json!(count);
            total += count;
        }
    }
    stats["total"] = serde_json::json!(total);

    utils::json_response(&stats, 200)
}

// ══════════════════════════════════════════════════════════════════
//  PROJECT ENDPOINTS
// ══════════════════════════════════════════════════════════════════

pub async fn list_projects(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let url = req.url()?;
    let status_filter = utils::query_param(&url, "status").unwrap_or_default();
    let search = utils::query_param(&url, "search").unwrap_or_default();
    let (page, per_page) = utils::parse_pagination(&url);
    let offset = (page - 1) * per_page;
    let db = get_db(env)?;

    let mut conditions = vec!["user_id = $1".to_string()];
    let mut params: Vec<serde_json::Value> = vec![serde_json::json!(claims.user_id)];
    let mut idx = 2;

    if !status_filter.is_empty() {
        conditions.push(format!("status = ${}", idx));
        params.push(serde_json::json!(status_filter));
        idx += 1;
    }
    if !search.is_empty() {
        let like = format!("%{}%", search);
        conditions.push(format!(
            "(name ILIKE ${} OR client_name ILIKE ${})",
            idx, idx
        ));
        params.push(serde_json::json!(like));
        idx += 1;
    }

    let where_clause = conditions.join(" AND ");

    let total: i64 = db
        .query_scalar(
            &format!("SELECT COUNT(*) FROM projects WHERE {}", where_clause),
            &params,
        )
        .await?;

    params.push(serde_json::json!(per_page));
    params.push(serde_json::json!(offset));
    let projects: Vec<Project> = db
        .query_typed(
            &format!(
                "SELECT {} FROM projects WHERE {} ORDER BY created_at DESC LIMIT ${} OFFSET ${}",
                PROJECT_COLS,
                where_clause,
                idx,
                idx + 1
            ),
            &params,
        )
        .await?;

    let total_pages = ((total as i32) + per_page - 1) / per_page;
    utils::json_response(
        &serde_json::json!({"data": projects, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}),
        200,
    )
}

pub async fn get_project(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    let project: Option<Project> = db
        .query_one(
            &format!(
                "SELECT {} FROM projects WHERE id = $1::uuid AND user_id = $2::uuid",
                PROJECT_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(claims.user_id)],
        )
        .await?;
    match project {
        Some(p) => utils::json_response(&p, 200),
        None => utils::json_error("Project not found", 404),
    }
}

pub async fn create_project(req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req
        .clone()?
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let name = body.get("name").and_then(|v| v.as_str()).unwrap_or("");
    if name.is_empty() {
        return utils::json_error("Name is required", 400);
    }
    let db = get_db(env)?;

    let project: Option<Project> = db.query_one(
        &format!("INSERT INTO projects (user_id, name, description, client_id, client_name, status, budget, hourly_rate, color, start_date, deadline, currency) VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6, $7, $8, $9, $10::date, $11::date, $12) RETURNING {}", PROJECT_COLS),
        &[
            serde_json::json!(claims.user_id),
            serde_json::json!(name),
            serde_json::json!(body.get("description").and_then(|v| v.as_str()).unwrap_or("")),
            serde_json::json!(body.get("client_id").and_then(|v| v.as_str())),
            serde_json::json!(body.get("client_name").and_then(|v| v.as_str()).unwrap_or("")),
            serde_json::json!(body.get("status").and_then(|v| v.as_str()).unwrap_or("active")),
            serde_json::json!(body.get("budget").and_then(|v| v.as_i64()).unwrap_or(0)),
            serde_json::json!(body.get("hourly_rate").and_then(|v| v.as_i64()).unwrap_or(0)),
            serde_json::json!(body.get("color").and_then(|v| v.as_str()).unwrap_or("#DC2626")),
            serde_json::json!(body.get("start_date").and_then(|v| v.as_str())),
            serde_json::json!(body.get("deadline").and_then(|v| v.as_str())),
            serde_json::json!(body.get("currency").and_then(|v| v.as_str()).unwrap_or("IDR")),
        ],
    ).await?;

    match project {
        Some(p) => utils::json_response(&p, 201),
        None => utils::json_error("Failed to create project", 500),
    }
}

pub async fn update_project(
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

    let mut sets = Vec::new();
    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut idx = 1;

    macro_rules! set_str {
        ($field:expr, $key:expr) => {
            if let Some(val) = body.get($key).and_then(|v| v.as_str()) {
                sets.push(format!("{} = ${}", $field, idx));
                params.push(serde_json::json!(val));
                idx += 1;
            }
        };
    }
    macro_rules! set_int {
        ($field:expr, $key:expr) => {
            if let Some(val) = body.get($key).and_then(|v| v.as_i64()) {
                sets.push(format!("{} = ${}", $field, idx));
                params.push(serde_json::json!(val));
                idx += 1;
            }
        };
    }

    set_str!("name", "name");
    set_str!("description", "description");
    set_str!("client_name", "client_name");
    set_str!("status", "status");
    set_str!("color", "color");
    set_str!("currency", "currency");
    set_int!("budget", "budget");
    set_int!("hourly_rate", "hourly_rate");

    if let Some(val) = body.get("client_id") {
        sets.push(format!("client_id = ${}::uuid", idx));
        params.push(serde_json::json!(val.as_str()));
        idx += 1;
    }
    if let Some(val) = body.get("start_date") {
        sets.push(format!("start_date = ${}::date", idx));
        params.push(serde_json::json!(val.as_str()));
        idx += 1;
    }
    if let Some(val) = body.get("deadline") {
        sets.push(format!("deadline = ${}::date", idx));
        params.push(serde_json::json!(val.as_str()));
        idx += 1;
    }

    sets.push("updated_at = NOW()".to_string());

    params.push(serde_json::json!(id));
    params.push(serde_json::json!(claims.user_id));

    let sql = format!(
        "UPDATE projects SET {} WHERE id = ${}::uuid AND user_id = ${}::uuid RETURNING {}",
        sets.join(", "),
        idx,
        idx + 1,
        PROJECT_COLS
    );

    let project: Option<Project> = db.query_one(&sql, &params).await?;
    match project {
        Some(p) => utils::json_response(&p, 200),
        None => utils::json_error("Project not found", 404),
    }
}

pub async fn delete_project(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    db.execute(
        "DELETE FROM projects WHERE id = $1::uuid AND user_id = $2::uuid",
        &[serde_json::json!(id), serde_json::json!(claims.user_id)],
    )
    .await?;
    utils::json_response(
        &serde_json::json!({"message": "Project deleted successfully"}),
        200,
    )
}

// ══════════════════════════════════════════════════════════════════
//  TIME ENTRY ENDPOINTS
// ══════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeEntry {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub task_id: String,
    #[serde(default)]
    pub task_title: String,
    #[serde(default)]
    pub project_name: String,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub start_time: String,
    #[serde(default)]
    pub end_time: String,
    #[serde(default)]
    pub duration_seconds: i64,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub created_at: String,
}

const TIME_ENTRY_COLS: &str = "id::text, user_id::text, task_id::text, task_title, project_name, date::text, start_time::text, end_time::text, duration_seconds, notes, created_at::text";

pub async fn list_time_entries(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let url = req.url()?;
    let date_filter = utils::query_param(&url, "date").unwrap_or_default();
    let date_from = utils::query_param(&url, "date_from").unwrap_or_default();
    let date_to = utils::query_param(&url, "date_to").unwrap_or_default();
    let (page, per_page) = utils::parse_pagination(&url);
    let offset = (page - 1) * per_page;
    let db = get_db(env)?;

    let mut conditions = vec!["user_id = $1".to_string()];
    let mut params: Vec<serde_json::Value> = vec![serde_json::json!(claims.user_id)];
    let mut idx = 2;

    if !date_filter.is_empty() {
        conditions.push(format!("date = ${}::date", idx));
        params.push(serde_json::json!(date_filter));
        idx += 1;
    }
    if !date_from.is_empty() {
        conditions.push(format!("date >= ${}::date", idx));
        params.push(serde_json::json!(date_from));
        idx += 1;
    }
    if !date_to.is_empty() {
        conditions.push(format!("date <= ${}::date", idx));
        params.push(serde_json::json!(date_to));
        idx += 1;
    }

    let where_clause = conditions.join(" AND ");

    let total: i64 = db
        .query_scalar(
            &format!("SELECT COUNT(*) FROM time_entries WHERE {}", where_clause),
            &params,
        )
        .await?;

    params.push(serde_json::json!(per_page));
    params.push(serde_json::json!(offset));
    let entries: Vec<TimeEntry> = db
        .query_typed(
            &format!(
                "SELECT {} FROM time_entries WHERE {} ORDER BY date DESC, start_time DESC LIMIT ${} OFFSET ${}",
                TIME_ENTRY_COLS, where_clause, idx, idx + 1
            ),
            &params,
        )
        .await?;

    let total_pages = ((total as i32) + per_page - 1) / per_page;
    utils::json_response(
        &serde_json::json!({"data": entries, "total": total, "page": page, "per_page": per_page, "total_pages": total_pages}),
        200,
    )
}

pub async fn create_time_entry(req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req
        .clone()?
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let task_title = body
        .get("task_title")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if task_title.is_empty() {
        return utils::json_error("task_title is required", 400);
    }

    let db = get_db(env)?;
    let entry: Option<TimeEntry> = db.query_one(
        &format!(
            "INSERT INTO time_entries (user_id, task_id, task_title, project_name, date, start_time, end_time, duration_seconds, notes) VALUES ($1::uuid, $2::uuid, $3, $4, $5::date, $6::time, $7::time, $8, $9) RETURNING {}",
            TIME_ENTRY_COLS
        ),
        &[
            serde_json::json!(claims.user_id),
            serde_json::json!(body.get("task_id").and_then(|v| v.as_str())),
            serde_json::json!(task_title),
            serde_json::json!(body.get("project_name").and_then(|v| v.as_str()).unwrap_or("")),
            serde_json::json!(body.get("date").and_then(|v| v.as_str()).unwrap_or("")),
            serde_json::json!(body.get("start_time").and_then(|v| v.as_str()).unwrap_or("00:00")),
            serde_json::json!(body.get("end_time").and_then(|v| v.as_str()).unwrap_or("00:00")),
            serde_json::json!(body.get("duration_seconds").and_then(|v| v.as_i64()).unwrap_or(0)),
            serde_json::json!(body.get("notes").and_then(|v| v.as_str()).unwrap_or("")),
        ],
    ).await?;

    match entry {
        Some(e) => utils::json_response(&e, 201),
        None => utils::json_error("Failed to create time entry", 500),
    }
}

pub async fn delete_time_entry(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    db.execute(
        "DELETE FROM time_entries WHERE id = $1::uuid AND user_id = $2::uuid",
        &[serde_json::json!(id), serde_json::json!(claims.user_id)],
    )
    .await?;
    utils::json_response(&serde_json::json!({"message": "Time entry deleted"}), 200)
}

pub async fn time_entry_stats(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let today_secs: i64 = db
        .query_scalar(
            "SELECT COALESCE(SUM(duration_seconds), 0) FROM time_entries WHERE user_id = $1::uuid AND date = CURRENT_DATE",
            &[serde_json::json!(claims.user_id)],
        )
        .await
        .unwrap_or(0);

    let week_secs: i64 = db
        .query_scalar(
            "SELECT COALESCE(SUM(duration_seconds), 0) FROM time_entries WHERE user_id = $1::uuid AND date >= date_trunc('week', CURRENT_DATE)",
            &[serde_json::json!(claims.user_id)],
        )
        .await
        .unwrap_or(0);

    let month_secs: i64 = db
        .query_scalar(
            "SELECT COALESCE(SUM(duration_seconds), 0) FROM time_entries WHERE user_id = $1::uuid AND date >= date_trunc('month', CURRENT_DATE)",
            &[serde_json::json!(claims.user_id)],
        )
        .await
        .unwrap_or(0);

    utils::json_response(
        &serde_json::json!({
            "today_seconds": today_secs,
            "week_seconds": week_secs,
            "month_seconds": month_secs,
        }),
        200,
    )
}
