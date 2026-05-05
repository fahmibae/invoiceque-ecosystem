//! Shared utilities: ID generation, query helpers, JSON responses.

use worker::*;

/// Generate a random hex ID (32 chars, matching Go's generateID).
pub fn generate_id() -> String {
    let mut buf = [0u8; 16];
    getrandom::getrandom(&mut buf).expect("getrandom failed");
    hex::encode(buf)
}

/// Build a JSON success response.
pub fn json_response<T: serde::Serialize>(data: &T, status: u16) -> Result<Response> {
    Response::from_json(data).map(|r| r.with_status(status))
}

/// Build a JSON error response.
pub fn json_error(message: &str, status: u16) -> Result<Response> {
    Response::from_json(&serde_json::json!({"error": message}))
        .map(|r| r.with_status(status))
}

/// Parse pagination query params from URL.
pub fn parse_pagination(url: &Url) -> (i32, i32) {
    let page = url.query_pairs()
        .find(|(k, _)| k == "page")
        .and_then(|(_, v)| v.parse::<i32>().ok())
        .unwrap_or(1);
    let per_page = url.query_pairs()
        .find(|(k, _)| k == "per_page" || k == "size")
        .and_then(|(_, v)| v.parse::<i32>().ok())
        .unwrap_or(10);
    (page.max(1), per_page.clamp(1, 100))
}

/// Get a query param value from URL.
pub fn query_param(url: &Url, key: &str) -> Option<String> {
    url.query_pairs()
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.to_string())
}

/// Get the secret value from env, with a fallback.
pub fn get_secret(env: &Env, name: &str) -> String {
    env.secret(name)
        .map(|s| s.to_string())
        .or_else(|_| env.var(name).map(|v| v.to_string()))
        .unwrap_or_default()
}

/// Convert a PostgreSQL text array from Vec<String> to SQL array literal.
pub fn to_pg_array(ids: &[String]) -> String {
    let inner: Vec<String> = ids.iter().map(|id| format!("\"{}\"", id)).collect();
    format!("{{{}}}", inner.join(","))
}
