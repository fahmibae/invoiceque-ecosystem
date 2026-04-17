use sqlx::PgPool;
use crate::models::xendit_account::XenditAccount;

pub async fn create(pool: &PgPool, account: &XenditAccount) -> Result<XenditAccount, sqlx::Error> {
    sqlx::query_as::<_, XenditAccount>(
        r#"INSERT INTO xendit_accounts (id, user_id, xendit_user_id, account_email, business_name, status, account_type, platform_fee_percent, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *"#
    )
    .bind(&account.id)
    .bind(&account.user_id)
    .bind(&account.xendit_user_id)
    .bind(&account.account_email)
    .bind(&account.business_name)
    .bind(&account.status)
    .bind(&account.account_type)
    .bind(account.platform_fee_percent)
    .bind(account.created_at)
    .bind(account.updated_at)
    .fetch_one(pool)
    .await
}

pub async fn find_by_user_id(pool: &PgPool, user_id: &str) -> Result<XenditAccount, sqlx::Error> {
    sqlx::query_as::<_, XenditAccount>(
        "SELECT * FROM xendit_accounts WHERE user_id = $1"
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
}

pub async fn find_by_xendit_id(pool: &PgPool, xendit_user_id: &str) -> Result<XenditAccount, sqlx::Error> {
    sqlx::query_as::<_, XenditAccount>(
        "SELECT * FROM xendit_accounts WHERE xendit_user_id = $1"
    )
    .bind(xendit_user_id)
    .fetch_one(pool)
    .await
}

pub async fn update_status(pool: &PgPool, user_id: &str, status: &str) -> Result<XenditAccount, sqlx::Error> {
    sqlx::query_as::<_, XenditAccount>(
        "UPDATE xendit_accounts SET status = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *"
    )
    .bind(status)
    .bind(user_id)
    .fetch_one(pool)
    .await
}
