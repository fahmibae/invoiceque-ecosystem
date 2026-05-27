//! Business Health Score — analytics dashboard with composite scoring.
//! All monetary values are normalized to IDR using exchange_rate_idr for accurate cross-currency comparison.

use crate::db::NeonClient;
use crate::middleware::JwtClaims;
use crate::utils;
use worker::*;

fn get_db(env: &Env) -> Result<NeonClient> {
    NeonClient::from_connection_string(&utils::get_secret(env, "INVOICE_DB_URL"))
}

/// SQL expression to normalize any amount to IDR:
/// If currency=IDR (or exchange_rate_idr=0), use the raw amount; otherwise multiply by exchange_rate_idr.
const TO_IDR_TOTAL: &str = "CASE WHEN UPPER(currency)='IDR' OR COALESCE(exchange_rate_idr,0)=0 THEN total ELSE total * exchange_rate_idr END";
const TO_IDR_REMAINING: &str = "CASE WHEN UPPER(currency)='IDR' OR COALESCE(exchange_rate_idr,0)=0 THEN amount_remaining ELSE amount_remaining * exchange_rate_idr END";

pub async fn get_health_score(env: &Env, claims: &JwtClaims) -> Result<Response> {
    let db = get_db(env)?;
    let uid = serde_json::json!(claims.user_id);

    // ── Collection Score (0-25) ──
    let total_inv: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM invoices WHERE user_id=$1",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let paid_inv: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM invoices WHERE user_id=$1 AND status='paid'",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let collection_rate = if total_inv > 0 {
        paid_inv as f64 / total_inv as f64
    } else {
        0.0
    };
    let collection_score = (collection_rate * 25.0).round();

    // ── Speed Score (0-25) ──
    let avg_days: f64 = db.query_scalar(
        "SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (paid_at - created_at))/86400), 30) FROM invoices WHERE user_id=$1 AND status='paid' AND paid_at IS NOT NULL",
        &[uid.clone()],
    ).await.unwrap_or(30.0);
    let speed_score = if avg_days <= 7.0 {
        25.0
    } else if avg_days <= 14.0 {
        20.0
    } else if avg_days <= 30.0 {
        15.0
    } else if avg_days <= 60.0 {
        8.0
    } else {
        3.0
    };

    // ── Growth Score (0-25) — normalized to IDR ──
    let this_month: f64 = db.query_scalar(
        &format!("SELECT COALESCE(SUM({}),0) FROM invoices WHERE user_id=$1 AND status='paid' AND paid_at >= date_trunc('month', CURRENT_DATE)", TO_IDR_TOTAL),
        &[uid.clone()],
    ).await.unwrap_or(0.0);
    let last_month: f64 = db.query_scalar(
        &format!("SELECT COALESCE(SUM({}),0) FROM invoices WHERE user_id=$1 AND status='paid' AND paid_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' AND paid_at < date_trunc('month', CURRENT_DATE)", TO_IDR_TOTAL),
        &[uid.clone()],
    ).await.unwrap_or(0.0);
    let revenue_trend = if this_month > last_month {
        "up"
    } else if this_month < last_month {
        "down"
    } else {
        "stable"
    };
    let growth_rate = if last_month > 0.0 {
        (this_month - last_month) / last_month
    } else if this_month > 0.0 {
        1.0
    } else {
        0.0
    };
    let revenue_trend_pct = (growth_rate * 100.0).round();
    let growth_score = ((growth_rate.min(1.0).max(-1.0) + 1.0) / 2.0 * 25.0).round();

    // ── Diversity Score (0-25) — normalized to IDR ──
    let unique_clients: i64 = db.query_scalar(
        "SELECT COUNT(DISTINCT client_id) FROM invoices WHERE user_id=$1 AND status='paid' AND paid_at >= CURRENT_DATE - INTERVAL '90 days'",
        &[uid.clone()],
    ).await.unwrap_or(0);
    let top_client_pct: f64 = db.query_scalar(
        &format!("SELECT COALESCE(MAX(client_total) / NULLIF(SUM(client_total),0), 1.0) FROM (SELECT client_id, SUM({}) as client_total FROM invoices WHERE user_id=$1 AND status='paid' AND paid_at >= CURRENT_DATE - INTERVAL '90 days' GROUP BY client_id) sub", TO_IDR_TOTAL),
        &[uid.clone()],
    ).await.unwrap_or(1.0);
    let client_concentration = (top_client_pct * 100.0).round();
    let diversity_score = if unique_clients <= 1 {
        5.0
    } else {
        ((1.0 - top_client_pct) * 25.0 + (unique_clients as f64).min(10.0) / 10.0 * 5.0)
            .min(25.0)
            .round()
    };

    let overall_score =
        (collection_score + speed_score + growth_score + diversity_score).min(100.0);

    // ── Overdue Ratio ──
    let overdue_inv: i64 = db
        .query_scalar(
            "SELECT COUNT(*) FROM invoices WHERE user_id=$1 AND status='overdue'",
            &[uid.clone()],
        )
        .await
        .unwrap_or(0);
    let overdue_ratio = if total_inv > 0 {
        (overdue_inv as f64 / total_inv as f64 * 100.0).round()
    } else {
        0.0
    };

    // ── Monthly Summary ──
    let this_month_invoices: i64 = db.query_scalar(
        "SELECT COUNT(*) FROM invoices WHERE user_id=$1 AND created_at >= date_trunc('month', CURRENT_DATE)", &[uid.clone()]
    ).await.unwrap_or(0);
    let last_month_invoices: i64 = db.query_scalar(
        "SELECT COUNT(*) FROM invoices WHERE user_id=$1 AND created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' AND created_at < date_trunc('month', CURRENT_DATE)", &[uid.clone()]
    ).await.unwrap_or(0);
    let this_month_new_clients: i64 = db.query_scalar(
        "SELECT COUNT(DISTINCT client_id) FROM invoices WHERE user_id=$1 AND created_at >= date_trunc('month', CURRENT_DATE)", &[uid.clone()]
    ).await.unwrap_or(0);

    // ── Top Clients (best payers) — normalized to IDR ──
    let top_rows = db.query_as_maps(
        &format!("SELECT client_id, client_name, SUM({to_idr}) as total_paid, COUNT(*) as total_invoices,
         ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (paid_at - created_at))/86400), 0)) as avg_days_to_pay,
         ROUND(COUNT(CASE WHEN status='paid' THEN 1 END)::numeric / NULLIF(COUNT(*),0) * 100) as on_time_rate,
         ROUND(COUNT(CASE WHEN status='paid' THEN 1 END)::numeric / NULLIF(COUNT(*),0) * 100) as reliability_score
         FROM invoices WHERE user_id=$1 AND status='paid'
         GROUP BY client_id, client_name ORDER BY total_paid DESC LIMIT 5", to_idr = TO_IDR_TOTAL),
        &[uid.clone()]
    ).await.unwrap_or_default();

    // ── Worst Clients (highest outstanding) — normalized to IDR ──
    let worst_rows = db.query_as_maps(
        &format!("SELECT client_id, client_name, SUM({to_idr}) as total_paid, COUNT(*) as total_invoices,
         0 as avg_days_to_pay,
         ROUND(COUNT(CASE WHEN status='paid' THEN 1 END)::numeric / NULLIF(COUNT(*),0) * 100) as on_time_rate,
         GREATEST(0, 100 - ROUND(COUNT(CASE WHEN status IN ('overdue','sent') THEN 1 END)::numeric / NULLIF(COUNT(*),0) * 100)) as reliability_score
         FROM invoices WHERE user_id=$1 AND status IN ('sent','overdue') AND amount_remaining > 0
         GROUP BY client_id, client_name ORDER BY total_paid DESC LIMIT 5", to_idr = TO_IDR_REMAINING),
        &[uid.clone()]
    ).await.unwrap_or_default();

    utils::json_response(
        &serde_json::json!({
            "overall_score": overall_score,
            "collection_rate": (collection_rate * 100.0).round(),
            "avg_days_to_pay": avg_days.round(),
            "revenue_trend": revenue_trend,
            "revenue_trend_pct": revenue_trend_pct,
            "overdue_ratio": overdue_ratio,
            "client_concentration": client_concentration,
            "breakdown": {
                "collection_score": collection_score,
                "speed_score": speed_score,
                "growth_score": growth_score,
                "diversity_score": diversity_score
            },
            "monthly_summary": {
                "this_month_revenue": this_month,
                "last_month_revenue": last_month,
                "this_month_invoices": this_month_invoices,
                "last_month_invoices": last_month_invoices,
                "this_month_new_clients": this_month_new_clients
            },
            "total_clients_active": unique_clients,
            "top_clients": top_rows,
            "worst_clients": worst_rows
        }),
        200,
    )
}
