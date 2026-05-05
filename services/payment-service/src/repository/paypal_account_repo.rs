use sqlx::PgPool;
use crate::models::paypal_account::PaypalAccount;

pub async fn create(pool: &PgPool, account: &PaypalAccount) -> Result<PaypalAccount, sqlx::Error> {
    sqlx::query_as::<_, PaypalAccount>(
        r#"INSERT INTO paypal_accounts (id, user_id, paypal_email, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *"#
    )
    .bind(&account.id)
    .bind(&account.user_id)
    .bind(&account.paypal_email)
    .bind(&account.status)
    .bind(account.created_at)
    .bind(account.updated_at)
    .fetch_one(pool)
    .await
}

pub async fn find_by_user_id(pool: &PgPool, user_id: &str) -> Result<PaypalAccount, sqlx::Error> {
    sqlx::query_as::<_, PaypalAccount>(
        "SELECT * FROM paypal_accounts WHERE user_id = $1"
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
}

pub async fn delete(pool: &PgPool, user_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM paypal_accounts WHERE user_id = $1")
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(())
}
