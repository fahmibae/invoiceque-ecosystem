package repository

import (
	"database/sql"
	"time"

	"github.com/invoiceque/subscription-service/models"
)

type SubscriptionRepository struct {
	db *sql.DB
}

func NewSubscriptionRepository(db *sql.DB) *SubscriptionRepository {
	return &SubscriptionRepository{db: db}
}

// ── Plans ─────────────────────────────────────────────

func (r *SubscriptionRepository) GetAllPlans() ([]models.SubscriptionPlan, error) {
	rows, err := r.db.Query(`SELECT id, name, display_name, price, currency, billing_period, max_invoices, max_clients, max_payment_links, features, is_active, created_at FROM subscription_plans WHERE is_active = true ORDER BY price ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []models.SubscriptionPlan
	for rows.Next() {
		var p models.SubscriptionPlan
		if err := rows.Scan(&p.ID, &p.Name, &p.DisplayName, &p.Price, &p.Currency, &p.BillingPeriod, &p.MaxInvoices, &p.MaxClients, &p.MaxPaymentLinks, &p.Features, &p.IsActive, &p.CreatedAt); err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, nil
}

func (r *SubscriptionRepository) GetPlanByID(id string) (*models.SubscriptionPlan, error) {
	p := &models.SubscriptionPlan{}
	err := r.db.QueryRow(`SELECT id, name, display_name, price, currency, billing_period, max_invoices, max_clients, max_payment_links, features, is_active, created_at FROM subscription_plans WHERE id = $1`, id).Scan(
		&p.ID, &p.Name, &p.DisplayName, &p.Price, &p.Currency, &p.BillingPeriod, &p.MaxInvoices, &p.MaxClients, &p.MaxPaymentLinks, &p.Features, &p.IsActive, &p.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return p, nil
}

// ── Admin: Update plan settings ───────────────────────
func (r *SubscriptionRepository) UpdatePlanSettings(id string, plan *models.SubscriptionPlan) error {
	_, err := r.db.Exec(`UPDATE subscription_plans SET display_name = $1, price = $2, billing_period = $3, max_invoices = $4, max_clients = $5, max_payment_links = $6, features = $7, is_active = $8 WHERE id = $9`,
		plan.DisplayName, plan.Price, plan.BillingPeriod, plan.MaxInvoices, plan.MaxClients, plan.MaxPaymentLinks, plan.Features, plan.IsActive, id,
	)
	return err
}

// ── Subscriptions ─────────────────────────────────────

func (r *SubscriptionRepository) GetByUserID(userID string) (*models.Subscription, error) {
	s := &models.Subscription{}
	err := r.db.QueryRow(`SELECT id, user_id, plan_id, status, current_period_start, current_period_end, invoices_used, clients_used, payment_links_used, created_at, updated_at FROM subscriptions WHERE user_id = $1`, userID).Scan(
		&s.ID, &s.UserID, &s.PlanID, &s.Status, &s.CurrentPeriodStart, &s.CurrentPeriodEnd, &s.InvoicesUsed, &s.ClientsUsed, &s.PaymentLinksUsed, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (r *SubscriptionRepository) Create(s *models.Subscription) error {
	_, err := r.db.Exec(`INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, invoices_used, clients_used, payment_links_used, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		s.ID, s.UserID, s.PlanID, s.Status, s.CurrentPeriodStart, s.CurrentPeriodEnd, s.InvoicesUsed, s.ClientsUsed, s.PaymentLinksUsed, s.CreatedAt, s.UpdatedAt,
	)
	return err
}

func (r *SubscriptionRepository) UpdatePlan(userID, planID string) error {
	now := time.Now()
	periodEnd := now.AddDate(0, 1, 0) // 1 month from now
	_, err := r.db.Exec(`UPDATE subscriptions SET plan_id = $1, current_period_start = $2, current_period_end = $3, invoices_used = 0, clients_used = 0, payment_links_used = 0, updated_at = $4 WHERE user_id = $5`,
		planID, now, periodEnd, now, userID,
	)
	return err
}

func (r *SubscriptionRepository) IncrementUsage(userID, usageType string) (bool, error) {
	// Atomic check-and-increment: only increments if within limit (prevents TOCTOU race)
	var query string
	switch usageType {
	case "invoice":
		query = `UPDATE subscriptions SET invoices_used = invoices_used + 1, updated_at = NOW()
			WHERE user_id = $1 AND (
				(SELECT max_invoices FROM subscription_plans WHERE id = subscriptions.plan_id) = -1
				OR invoices_used < (SELECT max_invoices FROM subscription_plans WHERE id = subscriptions.plan_id)
			)`
	case "client":
		query = `UPDATE subscriptions SET clients_used = clients_used + 1, updated_at = NOW()
			WHERE user_id = $1 AND (
				(SELECT max_clients FROM subscription_plans WHERE id = subscriptions.plan_id) = -1
				OR clients_used < (SELECT max_clients FROM subscription_plans WHERE id = subscriptions.plan_id)
			)`
	case "payment_link":
		query = `UPDATE subscriptions SET payment_links_used = payment_links_used + 1, updated_at = NOW()
			WHERE user_id = $1 AND (
				(SELECT max_payment_links FROM subscription_plans WHERE id = subscriptions.plan_id) = -1
				OR payment_links_used < (SELECT max_payment_links FROM subscription_plans WHERE id = subscriptions.plan_id)
			)`
	default:
		return false, nil
	}
	result, err := r.db.Exec(query, userID)
	if err != nil {
		return false, err
	}
	rows, _ := result.RowsAffected()
	return rows > 0, nil // false = limit reached (no rows updated)
}

func (r *SubscriptionRepository) GetUsage(userID string) (*models.SubscriptionWithPlan, error) {
	row := r.db.QueryRow(`
		SELECT s.id, s.user_id, s.plan_id, s.status, s.invoices_used, s.clients_used, s.payment_links_used,
		       s.current_period_start, s.current_period_end, s.created_at, s.updated_at,
		       p.id, p.name, p.display_name, p.price, p.currency,
		       p.max_invoices, p.max_clients, p.max_payment_links,
		       p.features, p.is_active
		FROM subscriptions s
		JOIN subscription_plans p ON s.plan_id = p.id
		WHERE s.user_id = $1`, userID)

	var sub models.Subscription
	var plan models.SubscriptionPlan
	var features sql.NullString

	err := row.Scan(
		&sub.ID, &sub.UserID, &sub.PlanID, &sub.Status,
		&sub.InvoicesUsed, &sub.ClientsUsed, &sub.PaymentLinksUsed,
		&sub.CurrentPeriodStart, &sub.CurrentPeriodEnd, &sub.CreatedAt, &sub.UpdatedAt,
		&plan.ID, &plan.Name, &plan.DisplayName, &plan.Price, &plan.Currency,
		&plan.MaxInvoices, &plan.MaxClients, &plan.MaxPaymentLinks,
		&features, &plan.IsActive,
	)
	if err != nil {
		return nil, err
	}

	if features.Valid {
		plan.Features = features.String
	}

	return &models.SubscriptionWithPlan{
		Subscription: sub,
		Plan:         plan,
	}, nil
}

// ── Transactions ──────────────────────────────────────

func (r *SubscriptionRepository) CreateTransaction(tx *models.SubscriptionTransaction) error {
	_, err := r.db.Exec(`INSERT INTO subscription_transactions (id, user_id, plan_id, amount, status, checkout_url, external_id, xendit_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		tx.ID, tx.UserID, tx.PlanID, tx.Amount, tx.Status, tx.CheckoutURL, tx.ExternalID, tx.XenditID, tx.CreatedAt, tx.UpdatedAt,
	)
	return err
}

func (r *SubscriptionRepository) GetTransactionByExternalID(externalID string) (*models.SubscriptionTransaction, error) {
	tx := &models.SubscriptionTransaction{}
	err := r.db.QueryRow(`SELECT id, user_id, plan_id, amount, status, checkout_url, external_id, COALESCE(xendit_id, ''), created_at, updated_at FROM subscription_transactions WHERE external_id = $1`, externalID).Scan(
		&tx.ID, &tx.UserID, &tx.PlanID, &tx.Amount, &tx.Status, &tx.CheckoutURL, &tx.ExternalID, &tx.XenditID, &tx.CreatedAt, &tx.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return tx, nil
}

func (r *SubscriptionRepository) UpdateTransactionStatus(externalID, status, xenditID string) error {
	_, err := r.db.Exec(`UPDATE subscription_transactions SET status = $1, xendit_id = $2, updated_at = NOW() WHERE external_id = $3`,
		status, xenditID, externalID,
	)
	return err
}

func (r *SubscriptionRepository) GetTransactionByID(id string) (*models.SubscriptionTransaction, error) {
	tx := &models.SubscriptionTransaction{}
	err := r.db.QueryRow(`SELECT id, user_id, plan_id, amount, status, checkout_url, external_id, COALESCE(xendit_id, ''), created_at, updated_at FROM subscription_transactions WHERE id = $1`, id).Scan(
		&tx.ID, &tx.UserID, &tx.PlanID, &tx.Amount, &tx.Status, &tx.CheckoutURL, &tx.ExternalID, &tx.XenditID, &tx.CreatedAt, &tx.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return tx, nil
}

// ── Admin: List all subscriptions ─────────────────────
func (r *SubscriptionRepository) ListAllSubscriptions() ([]models.SubscriptionWithPlan, error) {
	rows, err := r.db.Query(`
		SELECT s.id, s.user_id, s.plan_id, s.status, s.current_period_start, s.current_period_end,
			   s.invoices_used, s.clients_used, s.payment_links_used, s.created_at, s.updated_at,
			   p.id, p.name, p.display_name, p.price, p.currency, p.billing_period,
			   p.max_invoices, p.max_clients, p.max_payment_links, p.features, p.is_active, p.created_at
		FROM subscriptions s
		JOIN subscription_plans p ON s.plan_id = p.id
		ORDER BY s.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.SubscriptionWithPlan
	for rows.Next() {
		var sw models.SubscriptionWithPlan
		if err := rows.Scan(
			&sw.ID, &sw.UserID, &sw.PlanID, &sw.Status, &sw.CurrentPeriodStart, &sw.CurrentPeriodEnd,
			&sw.InvoicesUsed, &sw.ClientsUsed, &sw.PaymentLinksUsed, &sw.CreatedAt, &sw.UpdatedAt,
			&sw.Plan.ID, &sw.Plan.Name, &sw.Plan.DisplayName, &sw.Plan.Price, &sw.Plan.Currency, &sw.Plan.BillingPeriod,
			&sw.Plan.MaxInvoices, &sw.Plan.MaxClients, &sw.Plan.MaxPaymentLinks, &sw.Plan.Features, &sw.Plan.IsActive, &sw.Plan.CreatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, sw)
	}
	return result, nil
}

// ── Admin: List all transactions ──────────────────────
func (r *SubscriptionRepository) ListAllTransactions() ([]models.SubscriptionTransaction, error) {
	rows, err := r.db.Query(`SELECT id, user_id, plan_id, amount, status, checkout_url, external_id, COALESCE(xendit_id, ''), created_at, updated_at FROM subscription_transactions ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var txs []models.SubscriptionTransaction
	for rows.Next() {
		var tx models.SubscriptionTransaction
		if err := rows.Scan(&tx.ID, &tx.UserID, &tx.PlanID, &tx.Amount, &tx.Status, &tx.CheckoutURL, &tx.ExternalID, &tx.XenditID, &tx.CreatedAt, &tx.UpdatedAt); err != nil {
			return nil, err
		}
		txs = append(txs, tx)
	}
	return txs, nil
}

// ── Reminder: Find pending transactions near expiry ───────
func (r *SubscriptionRepository) GetPendingTransactionsNearExpiry() ([]models.SubscriptionTransaction, error) {
	// Find transactions that are:
	// - status = 'pending'
	// - created 22+ hours ago (2 hours before the 24h Xendit invoice expiry)
	// - reminder_sent = false (or NULL)
	rows, err := r.db.Query(`
		SELECT id, user_id, plan_id, amount, status, checkout_url, external_id, COALESCE(xendit_id, ''), created_at, updated_at
		FROM subscription_transactions
		WHERE status = 'pending'
		  AND created_at <= NOW() - INTERVAL '22 hours'
		  AND created_at > NOW() - INTERVAL '24 hours'
		  AND COALESCE(reminder_sent, false) = false
		ORDER BY created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var txs []models.SubscriptionTransaction
	for rows.Next() {
		var tx models.SubscriptionTransaction
		if err := rows.Scan(&tx.ID, &tx.UserID, &tx.PlanID, &tx.Amount, &tx.Status, &tx.CheckoutURL, &tx.ExternalID, &tx.XenditID, &tx.CreatedAt, &tx.UpdatedAt); err != nil {
			return nil, err
		}
		txs = append(txs, tx)
	}
	return txs, nil
}

// ── Mark reminder as sent ─────────────────────────────────
func (r *SubscriptionRepository) MarkReminderSent(externalID string) error {
	_, err := r.db.Exec(`UPDATE subscription_transactions SET reminder_sent = true WHERE external_id = $1`, externalID)
	return err
}

