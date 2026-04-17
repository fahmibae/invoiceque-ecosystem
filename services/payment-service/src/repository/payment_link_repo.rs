use sqlx::PgPool;
use crate::models::payment_link::PaymentLink;

pub async fn create(pool: &PgPool, link: &PaymentLink) -> Result<PaymentLink, sqlx::Error> {
    let result = sqlx::query_as::<_, PaymentLink>(
        r#"INSERT INTO payment_links (id, user_id, title, description, amount, currency, status, url, clicks, payments, invoice_id, expires_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *"#
    )
    .bind(&link.id)
    .bind(&link.user_id)
    .bind(&link.title)
    .bind(&link.description)
    .bind(&link.amount)
    .bind(&link.currency)
    .bind(&link.status)
    .bind(&link.url)
    .bind(link.clicks)
    .bind(link.payments)
    .bind(&link.invoice_id)
    .bind(link.expires_at)
    .bind(link.created_at)
    .bind(link.updated_at)
    .fetch_one(pool)
    .await?;

    Ok(result)
}

pub async fn find_all(pool: &PgPool, user_id: &str, page: i32, per_page: i32) -> Result<(Vec<PaymentLink>, i64), sqlx::Error> {
    let offset = (page - 1) * per_page;

    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM payment_links WHERE user_id = $1")
        .bind(user_id)
        .fetch_one(pool)
        .await?;

    let links = sqlx::query_as::<_, PaymentLink>(
        "SELECT * FROM payment_links WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
    )
    .bind(user_id)
    .bind(per_page)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok((links, total.0))
}

pub async fn find_by_id(pool: &PgPool, id: &str, user_id: &str) -> Result<PaymentLink, sqlx::Error> {
    sqlx::query_as::<_, PaymentLink>(
        "SELECT * FROM payment_links WHERE id = $1 AND user_id = $2"
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(pool)
    .await
}

pub async fn find_by_id_public(pool: &PgPool, id: &str) -> Result<PaymentLink, sqlx::Error> {
    // Also increment clicks
    sqlx::query("UPDATE payment_links SET clicks = clicks + 1 WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await?;

    sqlx::query_as::<_, PaymentLink>("SELECT * FROM payment_links WHERE id = $1")
        .bind(id)
        .fetch_one(pool)
        .await
}

pub async fn update(pool: &PgPool, id: &str, user_id: &str, title: Option<&str>, description: Option<&str>, amount: Option<f64>, status: Option<&str>) -> Result<PaymentLink, sqlx::Error> {
    // Build dynamic update
    let current = find_by_id(pool, id, user_id).await?;

    let new_title = title.unwrap_or(&current.title);
    let new_desc = description.unwrap_or(&current.description);
    let new_status = status.unwrap_or(&current.status);

    let result = sqlx::query_as::<_, PaymentLink>(
        "UPDATE payment_links SET title = $1, description = $2, status = $3, updated_at = NOW() WHERE id = $4 AND user_id = $5 RETURNING *"
    )
    .bind(new_title)
    .bind(new_desc)
    .bind(new_status)
    .bind(id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    Ok(result)
}

pub async fn delete(pool: &PgPool, id: &str, user_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM payment_links WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn mark_payment_completed(pool: &PgPool, id: &str) -> Result<PaymentLink, sqlx::Error> {
    sqlx::query_as::<_, PaymentLink>(
        "UPDATE payment_links SET payments = payments + 1, status = 'completed', updated_at = NOW() WHERE id = $1 RETURNING *"
    )
    .bind(id)
    .fetch_one(pool)
    .await
}
