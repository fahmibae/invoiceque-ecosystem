//! Expense Tracker service — track business expenses for freelancers.
//! Uses the TASK_DB_URL Neon database.

use crate::db::NeonClient;
use crate::middleware::JwtClaims;
use crate::utils;
use serde::{Deserialize, Serialize};
use worker::*;

// ── Models ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Expense {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub project_id: String,
    #[serde(default)]
    pub client_id: String,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub amount: f64,
    #[serde(default)]
    pub currency: String,
    #[serde(default)]
    pub expense_date: String,
    #[serde(default)]
    pub receipt_url: String,
    #[serde(default)]
    pub is_tax_deductible: bool,
    #[serde(default)]
    pub is_recurring: bool,
    #[serde(default)]
    pub recurring_interval: String,
    #[serde(default, deserialize_with = "deserialize_tags")]
    pub tags: Vec<String>,
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

// ── Constants ───────────────────────────────────────────────────────

const EXPENSE_COLS: &str = "id::text, user_id::text, project_id::text, client_id::text, category, title, description, amount, currency, expense_date::text, receipt_url, is_tax_deductible, is_recurring, recurring_interval, tags, created_at::text, updated_at::text";

const EXPENSE_CATEGORIES: &[&str] = &[
    "software",
    "hardware",
    "internet",
    "hosting",
    "domain",
    "subscription",
    "coworking",
    "travel",
    "food",
    "office_supplies",
    "marketing",
    "education",
    "insurance",
    "tax",
    "contractor",
    "communication",
    "utilities",
    "other",
];

// ── DB Helper ───────────────────────────────────────────────────────

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

/// Ensure the expenses table exists (auto-migration).
async fn ensure_table(db: &NeonClient) -> Result<()> {
    db.execute(
        "CREATE TABLE IF NOT EXISTS expenses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL,
            project_id TEXT,
            client_id TEXT,
            category TEXT NOT NULL DEFAULT 'other',
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            amount NUMERIC(12,2) NOT NULL DEFAULT 0,
            currency TEXT NOT NULL DEFAULT 'IDR',
            expense_date DATE DEFAULT CURRENT_DATE,
            receipt_url TEXT DEFAULT '',
            is_tax_deductible BOOLEAN NOT NULL DEFAULT false,
            is_recurring BOOLEAN NOT NULL DEFAULT false,
            recurring_interval TEXT DEFAULT '',
            tags JSONB DEFAULT '[]'::jsonb,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        )",
        &[],
    )
    .await?;
    Ok(())
}

// ══════════════════════════════════════════════════════════════════
//  EXPENSE ENDPOINTS
// ══════════════════════════════════════════════════════════════════

pub async fn list_expenses(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let url = req.url()?;
    let category = utils::query_param(&url, "category").unwrap_or_default();
    let search = utils::query_param(&url, "search").unwrap_or_default();
    let date_from = utils::query_param(&url, "date_from").unwrap_or_default();
    let date_to = utils::query_param(&url, "date_to").unwrap_or_default();
    let project_id = utils::query_param(&url, "project_id").unwrap_or_default();
    let client_id = utils::query_param(&url, "client_id").unwrap_or_default();
    let tax_deductible = utils::query_param(&url, "tax_deductible").unwrap_or_default();
    let (page, per_page) = utils::parse_pagination(&url);
    let offset = (page - 1) * per_page;

    let db = get_db(env)?;
    ensure_table(&db).await?;

    let mut conditions = vec!["user_id = $1".to_string()];
    let mut params: Vec<serde_json::Value> = vec![serde_json::json!(claims.user_id)];
    let mut idx = 2;

    if !category.is_empty() {
        conditions.push(format!("category = ${}", idx));
        params.push(serde_json::json!(category));
        idx += 1;
    }
    if !search.is_empty() {
        let like = format!("%{}%", search);
        conditions.push(format!(
            "(title ILIKE ${} OR description ILIKE ${})",
            idx, idx
        ));
        params.push(serde_json::json!(like));
        idx += 1;
    }
    if !date_from.is_empty() {
        conditions.push(format!("expense_date >= ${}::date", idx));
        params.push(serde_json::json!(date_from));
        idx += 1;
    }
    if !date_to.is_empty() {
        conditions.push(format!("expense_date <= ${}::date", idx));
        params.push(serde_json::json!(date_to));
        idx += 1;
    }
    if !project_id.is_empty() {
        conditions.push(format!("project_id = ${}", idx));
        params.push(serde_json::json!(project_id));
        idx += 1;
    }
    if !client_id.is_empty() {
        conditions.push(format!("client_id = ${}", idx));
        params.push(serde_json::json!(client_id));
        idx += 1;
    }
    if tax_deductible == "true" {
        conditions.push("is_tax_deductible = true".to_string());
    }

    let where_clause = conditions.join(" AND ");

    let total: i64 = db
        .query_scalar(
            &format!(
                "SELECT COUNT(*) FROM expenses WHERE {}",
                where_clause
            ),
            &params,
        )
        .await
        .unwrap_or(0);

    params.push(serde_json::json!(per_page));
    params.push(serde_json::json!(offset));
    let items: Vec<Expense> = db
        .query_typed(
            &format!(
                "SELECT {} FROM expenses WHERE {} ORDER BY expense_date DESC, created_at DESC LIMIT ${} OFFSET ${}",
                EXPENSE_COLS, where_clause, idx, idx + 1
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

pub async fn get_expense(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    ensure_table(&db).await?;
    let item: Option<Expense> = db
        .query_one(
            &format!(
                "SELECT {} FROM expenses WHERE id = $1::uuid AND user_id = $2",
                EXPENSE_COLS
            ),
            &[serde_json::json!(id), serde_json::json!(claims.user_id)],
        )
        .await?;
    match item {
        Some(i) => utils::json_response(&i, 200),
        None => utils::json_error("Expense not found", 404),
    }
}

pub async fn create_expense(req: Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let body: serde_json::Value = req
        .clone()?
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid request body".into()))?;

    let title = body.get("title").and_then(|v| v.as_str()).unwrap_or("");
    if title.is_empty() {
        return utils::json_error("Title is required", 400);
    }
    let amount = body
        .get("amount")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);
    if amount <= 0.0 {
        return utils::json_error("Amount must be greater than 0", 400);
    }

    let db = get_db(env)?;
    ensure_table(&db).await?;

    let category = body
        .get("category")
        .and_then(|v| v.as_str())
        .unwrap_or("other");
    // Validate category
    if !EXPENSE_CATEGORIES.contains(&category) {
        return utils::json_error(
            &format!(
                "Invalid category. Must be one of: {}",
                EXPENSE_CATEGORIES.join(", ")
            ),
            400,
        );
    }

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

    let item: Option<Expense> = db
        .query_one(
            &format!(
                "INSERT INTO expenses (user_id, project_id, client_id, category, title, description, amount, currency, expense_date, receipt_url, is_tax_deductible, is_recurring, recurring_interval, tags) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::date, CURRENT_DATE), $10, $11, $12, $13, $14::jsonb) RETURNING {}",
                EXPENSE_COLS
            ),
            &[
                serde_json::json!(claims.user_id),
                serde_json::json!(body.get("project_id").and_then(|v| v.as_str())),
                serde_json::json!(body.get("client_id").and_then(|v| v.as_str())),
                serde_json::json!(category),
                serde_json::json!(title),
                serde_json::json!(body.get("description").and_then(|v| v.as_str()).unwrap_or("")),
                serde_json::json!(amount),
                serde_json::json!(body.get("currency").and_then(|v| v.as_str()).unwrap_or("IDR")),
                serde_json::json!(body.get("expense_date").and_then(|v| v.as_str())),
                serde_json::json!(body.get("receipt_url").and_then(|v| v.as_str()).unwrap_or("")),
                serde_json::json!(body.get("is_tax_deductible").and_then(|v| v.as_bool()).unwrap_or(false)),
                serde_json::json!(body.get("is_recurring").and_then(|v| v.as_bool()).unwrap_or(false)),
                serde_json::json!(body.get("recurring_interval").and_then(|v| v.as_str()).unwrap_or("")),
                serde_json::json!(serde_json::json!(body.get("tags").cloned().unwrap_or(serde_json::json!([]))).to_string()),
            ],
        )
        .await?;

    match item {
        Some(i) => utils::json_response(&i, 201),
        None => utils::json_error("Failed to create expense", 500),
    }
}

pub async fn update_expense(
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
        "description",
        "description",
        |v: &serde_json::Value| serde_json::json!(v.as_str().unwrap_or(""))
    );
    set_field!(
        "amount",
        "amount",
        |v: &serde_json::Value| serde_json::json!(v.as_f64().unwrap_or(0.0))
    );
    set_field!(
        "currency",
        "currency",
        |v: &serde_json::Value| serde_json::json!(v.as_str().unwrap_or("IDR"))
    );
    set_field!(
        "receipt_url",
        "receipt_url",
        |v: &serde_json::Value| serde_json::json!(v.as_str().unwrap_or(""))
    );
    set_field!(
        "is_tax_deductible",
        "is_tax_deductible",
        |v: &serde_json::Value| serde_json::json!(v.as_bool().unwrap_or(false))
    );
    set_field!(
        "is_recurring",
        "is_recurring",
        |v: &serde_json::Value| serde_json::json!(v.as_bool().unwrap_or(false))
    );
    set_field!(
        "recurring_interval",
        "recurring_interval",
        |v: &serde_json::Value| serde_json::json!(v.as_str().unwrap_or(""))
    );

    if let Some(cat) = body.get("category").and_then(|v| v.as_str()) {
        if !EXPENSE_CATEGORIES.contains(&cat) {
            return utils::json_error("Invalid category", 400);
        }
        sets.push(format!("category = ${}", idx));
        params.push(serde_json::json!(cat));
        idx += 1;
    }
    if let Some(val) = body.get("expense_date").and_then(|v| v.as_str()) {
        sets.push(format!("expense_date = ${}::date", idx));
        params.push(serde_json::json!(val));
        idx += 1;
    }
    if let Some(val) = body.get("project_id") {
        sets.push(format!("project_id = ${}", idx));
        params.push(serde_json::json!(val.as_str()));
        idx += 1;
    }
    if let Some(val) = body.get("client_id") {
        sets.push(format!("client_id = ${}", idx));
        params.push(serde_json::json!(val.as_str()));
        idx += 1;
    }
    if let Some(tags) = body.get("tags") {
        sets.push(format!("tags = ${}::jsonb", idx));
        params.push(serde_json::json!(tags.to_string()));
        idx += 1;
    }

    sets.push("updated_at = NOW()".to_string());

    if sets.len() <= 1 {
        return utils::json_error("No fields to update", 400);
    }

    params.push(serde_json::json!(id));
    params.push(serde_json::json!(claims.user_id));

    let sql = format!(
        "UPDATE expenses SET {} WHERE id = ${}::uuid AND user_id = ${} RETURNING {}",
        sets.join(", "),
        idx,
        idx + 1,
        EXPENSE_COLS
    );

    let item: Option<Expense> = db.query_one(&sql, &params).await?;
    match item {
        Some(i) => utils::json_response(&i, 200),
        None => utils::json_error("Expense not found", 404),
    }
}

pub async fn delete_expense(env: &Env, claims: &JwtClaims, id: &str) -> Result<Response> {
    let db = get_db(env)?;
    db.execute(
        "DELETE FROM expenses WHERE id = $1::uuid AND user_id = $2",
        &[serde_json::json!(id), serde_json::json!(claims.user_id)],
    )
    .await?;
    utils::json_response(
        &serde_json::json!({"message": "Expense deleted successfully"}),
        200,
    )
}

pub async fn bulk_delete_expenses(
    req: Request,
    env: &Env,
    claims: &JwtClaims,
) -> Result<Response> {
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
            "DELETE FROM expenses WHERE user_id = $1 AND id = ANY($2::uuid[])",
            &[
                serde_json::json!(claims.user_id),
                serde_json::json!(pg_arr),
            ],
        )
        .await?;
    utils::json_response(
        &serde_json::json!({"message": "Expenses deleted", "deleted": deleted}),
        200,
    )
}

/// Returns aggregated expense stats: by category, monthly totals, tax deductible total.
pub async fn expense_stats(req: &Request, env: &Env, claims: &JwtClaims) -> Result<Response> {
    let url = req.url()?;
    let year = utils::query_param(&url, "year").unwrap_or_default();

    let db = get_db(env)?;
    ensure_table(&db).await?;

    // Year filter
    let year_filter = if !year.is_empty() {
        format!(" AND EXTRACT(YEAR FROM expense_date) = {}", year)
    } else {
        String::new()
    };

    // Total expense
    let total_amount: f64 = db
        .query_scalar(
            &format!(
                "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = $1{}",
                year_filter
            ),
            &[serde_json::json!(claims.user_id)],
        )
        .await
        .unwrap_or(0.0);

    // Tax deductible total
    let tax_deductible_total: f64 = db
        .query_scalar(
            &format!(
                "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = $1 AND is_tax_deductible = true{}",
                year_filter
            ),
            &[serde_json::json!(claims.user_id)],
        )
        .await
        .unwrap_or(0.0);

    // Total count
    let total_count: i64 = db
        .query_scalar(
            &format!(
                "SELECT COUNT(*) FROM expenses WHERE user_id = $1{}",
                year_filter
            ),
            &[serde_json::json!(claims.user_id)],
        )
        .await
        .unwrap_or(0);

    // By category
    let category_rows = db
        .query_as_maps(
            &format!(
                "SELECT category, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = $1{} GROUP BY category ORDER BY total DESC",
                year_filter
            ),
            &[serde_json::json!(claims.user_id)],
        )
        .await?;

    let categories: Vec<serde_json::Value> = category_rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "category": row.get("category").and_then(|v| v.as_str()).unwrap_or("other"),
                "count": row.get("count").and_then(|v| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse().ok()))).unwrap_or(0),
                "total": row.get("total").and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok()))).unwrap_or(0.0),
            })
        })
        .collect();

    // Monthly breakdown (last 12 months)
    let monthly_rows = db
        .query_as_maps(
            "SELECT TO_CHAR(expense_date, 'YYYY-MM') as month, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE user_id = $1 AND expense_date >= (CURRENT_DATE - INTERVAL '12 months') GROUP BY month ORDER BY month ASC",
            &[serde_json::json!(claims.user_id)],
        )
        .await?;

    let monthly: Vec<serde_json::Value> = monthly_rows
        .iter()
        .map(|row| {
            serde_json::json!({
                "month": row.get("month").and_then(|v| v.as_str()).unwrap_or(""),
                "total": row.get("total").and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse().ok()))).unwrap_or(0.0),
                "count": row.get("count").and_then(|v| v.as_i64().or_else(|| v.as_str().and_then(|s| s.parse().ok()))).unwrap_or(0),
            })
        })
        .collect();

    // This month vs last month
    let this_month: f64 = db
        .query_scalar(
            "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = $1 AND expense_date >= DATE_TRUNC('month', CURRENT_DATE)",
            &[serde_json::json!(claims.user_id)],
        )
        .await
        .unwrap_or(0.0);

    let last_month: f64 = db
        .query_scalar(
            "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = $1 AND expense_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND expense_date < DATE_TRUNC('month', CURRENT_DATE)",
            &[serde_json::json!(claims.user_id)],
        )
        .await
        .unwrap_or(0.0);

    utils::json_response(
        &serde_json::json!({
            "total_amount": total_amount,
            "total_count": total_count,
            "tax_deductible_total": tax_deductible_total,
            "this_month": this_month,
            "last_month": last_month,
            "by_category": categories,
            "monthly": monthly,
        }),
        200,
    )
}

/// Returns available expense categories.
pub async fn expense_categories() -> Result<Response> {
    utils::json_response(
        &serde_json::json!({
            "categories": EXPENSE_CATEGORIES,
        }),
        200,
    )
}
