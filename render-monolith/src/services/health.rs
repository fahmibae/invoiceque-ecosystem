//! Business Health Score — computed analytics from existing invoice/client data.

use crate::error::AppError;
use crate::middleware::Auth;
use crate::utils;
use actix_web::{web, HttpResponse};
use serde::Serialize;

#[derive(Debug, Serialize)]
struct HealthScore {
    overall_score: f64,           // 0-100
    collection_rate: f64,         // % of invoices paid on time
    avg_days_to_pay: f64,         // average days from sent to paid
    revenue_trend: String,        // "up", "down", "stable"
    revenue_trend_pct: f64,       // % change month-over-month
    overdue_ratio: f64,           // % of invoices currently overdue
    client_concentration: f64,    // how much top client contributes to revenue (risk)
    top_clients: Vec<ClientScore>,
    worst_clients: Vec<ClientScore>,
    monthly_summary: MonthlySummary,
    breakdown: ScoreBreakdown,
}

#[derive(Debug, Serialize)]
struct ClientScore {
    client_id: String,
    client_name: String,
    total_invoices: i64,
    total_paid: f64,
    avg_days_to_pay: f64,
    on_time_rate: f64,
    reliability_score: f64, // 0-100
}

#[derive(Debug, Serialize)]
struct MonthlySummary {
    this_month_revenue: f64,
    last_month_revenue: f64,
    this_month_invoices: i64,
    last_month_invoices: i64,
    this_month_new_clients: i64,
}

#[derive(Debug, Serialize)]
struct ScoreBreakdown {
    collection_score: f64,  // 0-25
    speed_score: f64,       // 0-25
    growth_score: f64,      // 0-25
    diversity_score: f64,   // 0-25
}

fn db(http: &reqwest::Client) -> Result<crate::db::NeonClient, AppError> {
    utils::get_db("INVOICE_DB_URL", http)
}

fn client_db(http: &reqwest::Client) -> Result<crate::db::NeonClient, AppError> {
    utils::get_db("CLIENT_DB_URL", http)
}

pub async fn get_health_score(
    auth: Auth,
    http: web::Data<reqwest::Client>,
) -> Result<HttpResponse, AppError> {
    let db = db(&http)?;
    let uid = serde_json::json!(auth.0.user_id);

    // === Collection Rate ===
    let total_invoices: i64 = db.query_scalar(
        "SELECT COUNT(*) FROM invoices WHERE user_id=$1 AND status != 'draft'", &[uid.clone()]
    ).await.unwrap_or(0);
    let paid_invoices: i64 = db.query_scalar(
        "SELECT COUNT(*) FROM invoices WHERE user_id=$1 AND status='paid'", &[uid.clone()]
    ).await.unwrap_or(0);
    let overdue_invoices: i64 = db.query_scalar(
        "SELECT COUNT(*) FROM invoices WHERE user_id=$1 AND status='overdue'", &[uid.clone()]
    ).await.unwrap_or(0);
    let collection_rate = if total_invoices > 0 { (paid_invoices as f64 / total_invoices as f64) * 100.0 } else { 100.0 };
    let overdue_ratio = if total_invoices > 0 { (overdue_invoices as f64 / total_invoices as f64) * 100.0 } else { 0.0 };

    // === Average Days to Pay ===
    let avg_days: f64 = db.query_scalar(
        "SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (paid_at - created_at))/86400), 0) FROM invoices WHERE user_id=$1 AND status='paid' AND paid_at IS NOT NULL",
        &[uid.clone()]
    ).await.unwrap_or(0.0);

    // === Revenue Trend (this month vs last month) ===
    let this_month_rev: f64 = db.query_scalar(
        "SELECT COALESCE(SUM(amount_paid),0) FROM invoices WHERE user_id=$1 AND paid_at >= DATE_TRUNC('month', NOW())",
        &[uid.clone()]
    ).await.unwrap_or(0.0);
    let last_month_rev: f64 = db.query_scalar(
        "SELECT COALESCE(SUM(amount_paid),0) FROM invoices WHERE user_id=$1 AND paid_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND paid_at < DATE_TRUNC('month', NOW())",
        &[uid.clone()]
    ).await.unwrap_or(0.0);
    let (revenue_trend, revenue_trend_pct) = if last_month_rev > 0.0 {
        let pct = ((this_month_rev - last_month_rev) / last_month_rev) * 100.0;
        let trend = if pct > 5.0 { "up" } else if pct < -5.0 { "down" } else { "stable" };
        (trend.to_string(), (pct * 100.0).round() / 100.0)
    } else if this_month_rev > 0.0 {
        ("up".to_string(), 100.0)
    } else {
        ("stable".to_string(), 0.0)
    };

    // === Monthly Summary ===
    let this_month_inv: i64 = db.query_scalar(
        "SELECT COUNT(*) FROM invoices WHERE user_id=$1 AND created_at >= DATE_TRUNC('month', NOW())",
        &[uid.clone()]
    ).await.unwrap_or(0);
    let last_month_inv: i64 = db.query_scalar(
        "SELECT COUNT(*) FROM invoices WHERE user_id=$1 AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND created_at < DATE_TRUNC('month', NOW())",
        &[uid.clone()]
    ).await.unwrap_or(0);
    let this_month_clients: i64 = {
        let cdb = client_db(&http)?;
        cdb.query_scalar(
            "SELECT COUNT(*) FROM clients WHERE user_id=$1 AND created_at >= DATE_TRUNC('month', NOW())",
            &[uid.clone()]
        ).await.unwrap_or(0)
    };

    // === Client Concentration (top client % of total revenue) ===
    let total_revenue: f64 = db.query_scalar(
        "SELECT COALESCE(SUM(amount_paid),0) FROM invoices WHERE user_id=$1", &[uid.clone()]
    ).await.unwrap_or(0.0);
    let top_client_revenue: f64 = db.query_scalar(
        "SELECT COALESCE(MAX(client_total),0) FROM (SELECT SUM(amount_paid) as client_total FROM invoices WHERE user_id=$1 AND status='paid' GROUP BY client_id) sub",
        &[uid.clone()]
    ).await.unwrap_or(0.0);
    let client_concentration = if total_revenue > 0.0 { (top_client_revenue / total_revenue) * 100.0 } else { 0.0 };

    // === Top & Worst Clients ===
    let top_clients_raw = db.query_as_maps(
        "SELECT client_id, client_name, COUNT(*) as total_invoices, COALESCE(SUM(amount_paid),0) as total_paid, COALESCE(AVG(CASE WHEN paid_at IS NOT NULL THEN EXTRACT(EPOCH FROM (paid_at - created_at))/86400 END),0) as avg_days FROM invoices WHERE user_id=$1 AND status='paid' GROUP BY client_id, client_name ORDER BY total_paid DESC LIMIT 5",
        &[uid.clone()]
    ).await.unwrap_or_default();

    let top_clients: Vec<ClientScore> = top_clients_raw.into_iter().map(|m| {
        let avg_d = m.get("avg_days").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let reliability = (100.0 - (avg_d * 2.0).min(50.0)).max(0.0);
        ClientScore {
            client_id: m.get("client_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            client_name: m.get("client_name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            total_invoices: m.get("total_invoices").and_then(|v| v.as_i64()).unwrap_or(0),
            total_paid: m.get("total_paid").and_then(|v| v.as_f64()).unwrap_or(0.0),
            avg_days_to_pay: (avg_d * 10.0).round() / 10.0,
            on_time_rate: 0.0,
            reliability_score: (reliability * 10.0).round() / 10.0,
        }
    }).collect();

    let worst_clients_raw = db.query_as_maps(
        "SELECT client_id, client_name, COUNT(*) as total_invoices, COALESCE(SUM(amount_remaining),0) as total_outstanding, COALESCE(AVG(CASE WHEN paid_at IS NOT NULL THEN EXTRACT(EPOCH FROM (paid_at - created_at))/86400 END), 999) as avg_days FROM invoices WHERE user_id=$1 AND status IN ('overdue','sent','partially_paid') GROUP BY client_id, client_name ORDER BY total_outstanding DESC LIMIT 5",
        &[uid.clone()]
    ).await.unwrap_or_default();

    let worst_clients: Vec<ClientScore> = worst_clients_raw.into_iter().map(|m| {
        let avg_d = m.get("avg_days").and_then(|v| v.as_f64()).unwrap_or(999.0);
        let reliability = (100.0 - (avg_d * 2.0).min(100.0)).max(0.0);
        ClientScore {
            client_id: m.get("client_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            client_name: m.get("client_name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            total_invoices: m.get("total_invoices").and_then(|v| v.as_i64()).unwrap_or(0),
            total_paid: m.get("total_outstanding").and_then(|v| v.as_f64()).unwrap_or(0.0),
            avg_days_to_pay: if avg_d > 900.0 { 0.0 } else { (avg_d * 10.0).round() / 10.0 },
            on_time_rate: 0.0,
            reliability_score: (reliability * 10.0).round() / 10.0,
        }
    }).collect();

    // === Calculate Scores ===
    // Collection Score (0-25): based on collection rate
    let collection_score = (collection_rate / 100.0 * 25.0).min(25.0);

    // Speed Score (0-25): based on avg days to pay (lower is better)
    let speed_score = if avg_days <= 7.0 { 25.0 }
        else if avg_days <= 14.0 { 20.0 }
        else if avg_days <= 30.0 { 15.0 }
        else if avg_days <= 60.0 { 10.0 }
        else { 5.0 };

    // Growth Score (0-25): based on revenue trend
    let growth_score = if revenue_trend_pct > 20.0 { 25.0 }
        else if revenue_trend_pct > 10.0 { 20.0 }
        else if revenue_trend_pct > 0.0 { 15.0 }
        else if revenue_trend_pct > -10.0 { 10.0 }
        else { 5.0 };

    // Diversity Score (0-25): based on client concentration (lower concentration = better)
    let diversity_score = if client_concentration < 30.0 { 25.0 }
        else if client_concentration < 50.0 { 20.0 }
        else if client_concentration < 70.0 { 15.0 }
        else if client_concentration < 90.0 { 10.0 }
        else { 5.0 };

    let overall = collection_score + speed_score + growth_score + diversity_score;

    let health = HealthScore {
        overall_score: (overall * 10.0).round() / 10.0,
        collection_rate: (collection_rate * 10.0).round() / 10.0,
        avg_days_to_pay: (avg_days * 10.0).round() / 10.0,
        revenue_trend,
        revenue_trend_pct,
        overdue_ratio: (overdue_ratio * 10.0).round() / 10.0,
        client_concentration: (client_concentration * 10.0).round() / 10.0,
        top_clients,
        worst_clients,
        monthly_summary: MonthlySummary {
            this_month_revenue: this_month_rev,
            last_month_revenue: last_month_rev,
            this_month_invoices: this_month_inv,
            last_month_invoices: last_month_inv,
            this_month_new_clients: this_month_clients,
        },
        breakdown: ScoreBreakdown {
            collection_score: (collection_score * 10.0).round() / 10.0,
            speed_score: (speed_score * 10.0).round() / 10.0,
            growth_score: (growth_score * 10.0).round() / 10.0,
            diversity_score: (diversity_score * 10.0).round() / 10.0,
        },
    };

    utils::json_response(&health, 200)
}
