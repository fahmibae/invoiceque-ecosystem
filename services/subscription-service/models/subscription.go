package models

import "time"

type SubscriptionPlan struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	DisplayName     string    `json:"display_name"`
	Price           float64   `json:"price"`
	Currency        string    `json:"currency"`
	BillingPeriod   string    `json:"billing_period"`
	MaxInvoices     int       `json:"max_invoices"`
	MaxClients      int       `json:"max_clients"`
	MaxPaymentLinks int       `json:"max_payment_links"`
	Features        string    `json:"features"`
	IsActive        bool      `json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
}

type Subscription struct {
	ID                 string    `json:"id"`
	UserID             string    `json:"user_id"`
	PlanID             string    `json:"plan_id"`
	Status             string    `json:"status"`
	CurrentPeriodStart time.Time `json:"current_period_start"`
	CurrentPeriodEnd   *time.Time `json:"current_period_end"`
	InvoicesUsed       int       `json:"invoices_used"`
	ClientsUsed        int       `json:"clients_used"`
	PaymentLinksUsed   int       `json:"payment_links_used"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type SubscriptionWithPlan struct {
	Subscription
	Plan SubscriptionPlan `json:"plan"`
}

type UsageResponse struct {
	InvoicesUsed     int  `json:"invoices_used"`
	InvoicesLimit    int  `json:"invoices_limit"`
	ClientsUsed      int  `json:"clients_used"`
	ClientsLimit     int  `json:"clients_limit"`
	PaymentLinksUsed int  `json:"payment_links_used"`
	PaymentLinksLimit int `json:"payment_links_limit"`
	CanCreateInvoice bool `json:"can_create_invoice"`
	CanCreateClient  bool `json:"can_create_client"`
	CanCreatePayment bool `json:"can_create_payment"`
}

type SubscribeRequest struct {
	PlanID string `json:"plan_id" binding:"required"`
}

type IncrementUsageRequest struct {
	Type string `json:"type" binding:"required"` // "invoice", "client", "payment_link"
}
