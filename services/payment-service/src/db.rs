use sqlx::PgPool;

pub async fn init_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let pool = PgPool::connect(database_url).await?;

    // Run migrations
    sqlx::query(include_str!("../migrations/001_create_payment_links.sql"))
        .execute(&pool)
        .await
        .ok(); // Ignore if already exists

    sqlx::query(include_str!("../migrations/002_create_xendit_accounts.sql"))
        .execute(&pool)
        .await
        .ok(); // Ignore if already exists

    log::info!("[PAYMENT] Database connected and migrations applied");
    Ok(pool)
}
