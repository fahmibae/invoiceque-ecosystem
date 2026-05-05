//! Neon Serverless HTTP SQL client for Cloudflare Workers.
//! Since CF Workers cannot open TCP sockets, we use Neon's HTTP SQL API.

use serde::{Deserialize, Serialize};
use worker::*;

#[derive(Clone, Debug)]
pub struct NeonClient {
    /// HTTP endpoint: https://<host>/sql
    endpoint: String,
    /// Full connection string for Neon-Connection-String header
    connection_string: String,
}

#[derive(Debug, Serialize)]
struct NeonQuery {
    query: String,
    params: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct NeonField {
    pub name: String,
    #[serde(rename = "dataTypeID")]
    pub data_type_id: Option<i32>,
}

/// Neon HTTP API returns rows as objects (maps) by default.
#[derive(Debug, Deserialize)]
pub struct NeonResult {
    pub fields: Vec<NeonField>,
    pub rows: Vec<serde_json::Map<String, serde_json::Value>>,
    #[serde(rename = "rowCount")]
    pub row_count: Option<i64>,
    pub command: Option<String>,
}

impl NeonClient {
    /// Create a NeonClient from a PostgreSQL connection string.
    /// Converts pooler URL to HTTP API endpoint automatically.
    pub fn from_connection_string(conn_str: &str) -> Result<Self> {
        let clean = conn_str
            .trim_start_matches("postgresql://")
            .trim_start_matches("postgres://");

        // Extract host part: user:pass@host/db
        let at_pos = clean.find('@').ok_or_else(|| Error::RustError("Invalid connection string: no @".into()))?;
        let host_and_db = &clean[at_pos + 1..];
        let slash_pos = host_and_db.find('/').unwrap_or(host_and_db.len());
        let host = &host_and_db[..slash_pos];

        // Remove -pooler suffix for HTTP API endpoint
        let http_host = host.replace("-pooler.", ".");

        // Build non-pooler connection string for the header
        let connection_string = conn_str.replace("-pooler.", ".");

        let endpoint = format!("https://{}/sql", http_host);

        Ok(Self {
            endpoint,
            connection_string,
        })
    }

    /// Execute a single SQL query and return the result.
    pub async fn query(&self, sql: &str, params: &[serde_json::Value]) -> Result<NeonResult> {
        let payload = NeonQuery {
            query: sql.to_string(),
            params: params.to_vec(),
        };

        let body = serde_json::to_string(&payload)
            .map_err(|e| Error::RustError(format!("JSON serialize error: {}", e)))?;

        let mut headers = Headers::new();
        headers.set("Content-Type", "application/json")?;
        headers.set("Neon-Connection-String", &self.connection_string)?;

        let mut init = RequestInit::new();
        init.with_method(Method::Post);
        init.with_headers(headers);
        init.with_body(Some(wasm_bindgen::JsValue::from_str(&body)));

        let request = Request::new_with_init(&self.endpoint, &init)?;
        let mut response = Fetch::Request(request).send().await?;

        if response.status_code() != 200 {
            let text = response.text().await.unwrap_or_default();
            return Err(Error::RustError(format!(
                "Neon API error ({}): {}",
                response.status_code(),
                text
            )));
        }

        // Neon returns the result directly (not wrapped in "results" array)
        let neon_resp: NeonResult = response.json().await
            .map_err(|e| Error::RustError(format!("Neon response parse error: {}", e)))?;

        Ok(neon_resp)
    }

    /// Execute a query and return rows as Vec of serde_json::Map.
    pub async fn query_as_maps(
        &self,
        sql: &str,
        params: &[serde_json::Value],
    ) -> Result<Vec<serde_json::Map<String, serde_json::Value>>> {
        let result = self.query(sql, params).await?;
        Ok(result.rows)
    }

    /// Execute a query and deserialize rows into a typed Vec<T>.
    pub async fn query_typed<T: serde::de::DeserializeOwned>(
        &self,
        sql: &str,
        params: &[serde_json::Value],
    ) -> Result<Vec<T>> {
        let maps = self.query_as_maps(sql, params).await?;
        maps.into_iter()
            .map(|m| {
                serde_json::from_value(serde_json::Value::Object(m))
                    .map_err(|e| Error::RustError(format!("Deserialize error: {}", e)))
            })
            .collect()
    }

    /// Execute a query expecting a single row, return None if not found.
    pub async fn query_one<T: serde::de::DeserializeOwned>(
        &self,
        sql: &str,
        params: &[serde_json::Value],
    ) -> Result<Option<T>> {
        let mut rows: Vec<T> = self.query_typed(sql, params).await?;
        Ok(rows.pop())
    }

    /// Execute a statement (INSERT/UPDATE/DELETE) and return affected row count.
    pub async fn execute(&self, sql: &str, params: &[serde_json::Value]) -> Result<i64> {
        let result = self.query(sql, params).await?;
        Ok(result.row_count.unwrap_or(0))
    }

    /// Execute a query returning a single scalar value.
    /// Handles Neon HTTP API returning numbers as strings.
    pub async fn query_scalar<T: serde::de::DeserializeOwned>(
        &self,
        sql: &str,
        params: &[serde_json::Value],
    ) -> Result<T> {
        let result = self.query(sql, params).await?;
        let row = result.rows.into_iter().next()
            .ok_or_else(|| Error::RustError("No rows returned".into()))?;
        let (_key, val) = row.into_iter().next()
            .ok_or_else(|| Error::RustError("No columns returned".into()))?;

        // Neon HTTP API may return numbers as strings, try parsing
        let parsed_val = match &val {
            serde_json::Value::String(s) => {
                // Try to parse as number first
                if let Ok(n) = s.parse::<i64>() {
                    serde_json::Value::Number(n.into())
                } else if let Ok(n) = s.parse::<f64>() {
                    serde_json::json!(n)
                } else {
                    val
                }
            }
            _ => val,
        };

        serde_json::from_value(parsed_val)
            .map_err(|e| Error::RustError(format!("Scalar deserialize error: {}", e)))
    }
}
