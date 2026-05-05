//! Neon Serverless HTTP SQL client — uses reqwest instead of worker::Fetch.

use crate::error::AppError;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug)]
pub struct NeonClient {
    endpoint: String,
    connection_string: String,
    http: reqwest::Client,
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

#[derive(Debug, Deserialize)]
pub struct NeonResult {
    pub fields: Vec<NeonField>,
    pub rows: Vec<Vec<serde_json::Value>>,
    #[serde(rename = "rowCount")]
    pub row_count: Option<i64>,
    pub command: Option<String>,
}

impl NeonClient {
    pub fn new(conn_str: &str, http: reqwest::Client) -> Result<Self, AppError> {
        let clean = conn_str
            .trim_start_matches("postgresql://")
            .trim_start_matches("postgres://");
        let at_pos = clean.find('@')
            .ok_or_else(|| AppError("Invalid connection string: no @".into()))?;
        let host_and_db = &clean[at_pos + 1..];
        let slash_pos = host_and_db.find('/').unwrap_or(host_and_db.len());
        let host = &host_and_db[..slash_pos];
        let http_host = host.replace("-pooler.", ".");
        let connection_string = conn_str.replace("-pooler.", ".");
        let endpoint = format!("https://{}/sql", http_host);
        Ok(Self { endpoint, connection_string, http })
    }

    pub async fn query(&self, sql: &str, params: &[serde_json::Value]) -> Result<NeonResult, AppError> {
        let payload = NeonQuery { query: sql.to_string(), params: params.to_vec() };
        let resp = self.http.post(&self.endpoint)
            .header("Content-Type", "application/json")
            .header("Neon-Connection-String", &self.connection_string)
            .json(&payload)
            .send().await?;
        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AppError(format!("Neon API error: {}", text)));
        }
        let result: NeonResult = resp.json().await
            .map_err(|e| AppError(format!("Neon parse error: {}", e)))?;
        Ok(result)
    }

    pub async fn query_as_maps(&self, sql: &str, params: &[serde_json::Value])
        -> Result<Vec<serde_json::Map<String, serde_json::Value>>, AppError>
    {
        let result = self.query(sql, params).await?;
        let names: Vec<String> = result.fields.iter().map(|f| f.name.clone()).collect();
        Ok(result.rows.into_iter().map(|row| {
            let mut map = serde_json::Map::new();
            for (i, val) in row.into_iter().enumerate() {
                if let Some(name) = names.get(i) { map.insert(name.clone(), val); }
            }
            map
        }).collect())
    }

    pub async fn query_typed<T: serde::de::DeserializeOwned>(&self, sql: &str, params: &[serde_json::Value])
        -> Result<Vec<T>, AppError>
    {
        let maps = self.query_as_maps(sql, params).await?;
        maps.into_iter().map(|m| {
            serde_json::from_value(serde_json::Value::Object(m))
                .map_err(|e| AppError(format!("Deserialize error: {}", e)))
        }).collect()
    }

    pub async fn query_one<T: serde::de::DeserializeOwned>(&self, sql: &str, params: &[serde_json::Value])
        -> Result<Option<T>, AppError>
    {
        let mut rows: Vec<T> = self.query_typed(sql, params).await?;
        Ok(rows.pop())
    }

    pub async fn execute(&self, sql: &str, params: &[serde_json::Value]) -> Result<i64, AppError> {
        let result = self.query(sql, params).await?;
        Ok(result.row_count.unwrap_or(0))
    }

    pub async fn query_scalar<T: serde::de::DeserializeOwned>(&self, sql: &str, params: &[serde_json::Value])
        -> Result<T, AppError>
    {
        let result = self.query(sql, params).await?;
        let row = result.rows.into_iter().next()
            .ok_or_else(|| AppError("No rows returned".into()))?;
        let val = row.into_iter().next()
            .ok_or_else(|| AppError("No columns returned".into()))?;
        serde_json::from_value(val).map_err(|e| AppError(format!("Scalar error: {}", e)))
    }
}
