//! Shared utilities — replaces worker::Response helpers with actix-web HttpResponse.

use actix_web::HttpResponse;
use crate::error::AppError;
use crate::db::NeonClient;

pub fn generate_id() -> String {
    let mut buf = [0u8; 16];
    getrandom::getrandom(&mut buf).expect("getrandom failed");
    hex::encode(buf)
}

pub fn json_response<T: serde::Serialize>(data: &T, status: u16) -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status)
        .unwrap_or(actix_web::http::StatusCode::OK))
        .json(data))
}

pub fn json_error(message: &str, status: u16) -> Result<HttpResponse, AppError> {
    Ok(HttpResponse::build(actix_web::http::StatusCode::from_u16(status)
        .unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR))
        .json(serde_json::json!({"error": message})))
}

pub fn get_env(name: &str) -> String {
    std::env::var(name).unwrap_or_default()
}

pub fn to_pg_array(ids: &[String]) -> String {
    let inner: Vec<String> = ids.iter().map(|id| format!("\"{}\"", id)).collect();
    format!("{{{}}}", inner.join(","))
}

pub fn get_db(env_key: &str, http: &reqwest::Client) -> Result<NeonClient, AppError> {
    let url = get_env(env_key);
    NeonClient::new(&url, http.clone())
}

/// Parse pagination from query string.
pub fn parse_pagination(query: &str) -> (i32, i32) {
    let params: Vec<(String, String)> = url::form_urlencoded::parse(query.as_bytes())
        .into_owned().collect();
    let page = params.iter().find(|(k, _)| k == "page")
        .and_then(|(_, v)| v.parse::<i32>().ok()).unwrap_or(1);
    let per_page = params.iter().find(|(k, _)| k == "per_page" || k == "size")
        .and_then(|(_, v)| v.parse::<i32>().ok()).unwrap_or(10);
    (page.max(1), per_page.clamp(1, 100))
}

pub fn query_param(query: &str, key: &str) -> Option<String> {
    url::form_urlencoded::parse(query.as_bytes())
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.to_string())
}
