package models

import "time"

type Invoice struct {
	ID                   string     `json:"id" db:"id"`
	Number               string     `json:"number" db:"invoice_number"`
	UserID               string     `json:"user_id,omitempty" db:"user_id"`
	ClientID             string     `json:"client_id" db:"client_id"`
	ClientName           string     `json:"client_name" db:"client_name"`
	ClientEmail          string     `json:"client_email" db:"client_email"`
	Subtotal             float64    `json:"subtotal" db:"subtotal"`
	Tax                  float64    `json:"tax" db:"tax"`
	Discount             float64    `json:"discount" db:"discount"`
	Total                float64    `json:"total" db:"total"`
	Status               string     `json:"status" db:"status"`
	PaymentType          string     `json:"payment_type" db:"payment_type"`
	DpPercentage         int        `json:"dp_percentage" db:"dp_percentage"`
	DpAmount             float64    `json:"dp_amount" db:"dp_amount"`
	AmountPaid           float64    `json:"amount_paid" db:"amount_paid"`
	AmountRemaining      float64    `json:"amount_remaining" db:"amount_remaining"`
	DueDate              string     `json:"due_date" db:"due_date"`
	CreatedAt            *time.Time `json:"created_at" db:"created_at"`
	PaidAt               *time.Time `json:"paid_at" db:"paid_at"`
	Notes                string     `json:"notes" db:"notes"`
	PaymentLink          string     `json:"payment_link" db:"payment_link"`
	RemainingPaymentLink string     `json:"remaining_payment_link" db:"remaining_payment_link"`
	Items                []InvoiceItem `json:"items" db:"-"`
}

type InvoiceItem struct {
	ID          string  `json:"id" db:"id"`
	InvoiceID   string  `json:"invoice_id,omitempty" db:"invoice_id"`
	Description string  `json:"description" db:"description"`
	Quantity    int     `json:"quantity" db:"quantity"`
	Price       float64 `json:"price" db:"price"`
	Total       float64 `json:"total" db:"total"`
}

type InvoiceSettings struct {
	UserID          string `json:"user_id" db:"user_id"`
	BusinessName    string `json:"business_name" db:"business_name"`
	BusinessEmail   string `json:"business_email" db:"business_email"`
	BusinessPhone   string `json:"business_phone" db:"business_phone"`
	BusinessWebsite string `json:"business_website" db:"business_website"`
	BusinessAddress string `json:"business_address" db:"business_address"`
	LogoURL         string `json:"logo_url" db:"logo_url"`
	AccentColor     string `json:"accent_color" db:"accent_color"`
	FooterText      string `json:"footer_text" db:"footer_text"`
}
