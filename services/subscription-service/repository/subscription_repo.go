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

func (r *SubscriptionRepository) IncrementUsage(userID, usageType string) error {
	var query string
	switch usageType {
	case "invoice":
		query = `UPDATE subscriptions SET invoices_used = invoices_used + 1, updated_at = NOW() WHERE user_id = $1`
	case "client":
		query = `UPDATE subscriptions SET clients_used = clients_used + 1, updated_at = NOW() WHERE user_id = $1`
	case "payment_link":
		query = `UPDATE subscriptions SET payment_links_used = payment_links_used + 1, updated_at = NOW() WHERE user_id = $1`
	default:
		return nil
	}
	_, err := r.db.Exec(query, userID)
	return err
}

func (r *SubscriptionRepository) GetUsage(userID string) (*models.SubscriptionWithPlan, error) {
	sub, err := r.GetByUserID(userID)
	if err != nil {
		return nil, err
	}
	plan, err := r.GetPlanByID(sub.PlanID)
	if err != nil {
		return nil, err
	}
	return &models.SubscriptionWithPlan{
		Subscription: *sub,
		Plan:         *plan,
	}, nil
}
