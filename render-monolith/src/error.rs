use actix_web::{HttpResponse, ResponseError};
use std::fmt;

#[derive(Debug)]
pub struct AppError(pub String);

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        log::error!("AppError: {}", self.0);
        HttpResponse::InternalServerError()
            .json(serde_json::json!({"error": self.0}))
    }
}

impl From<String> for AppError {
    fn from(s: String) -> Self { AppError(s) }
}
impl From<&str> for AppError {
    fn from(s: &str) -> Self { AppError(s.to_string()) }
}
impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self { AppError(format!("HTTP error: {}", e)) }
}
impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self { AppError(format!("JSON error: {}", e)) }
}
