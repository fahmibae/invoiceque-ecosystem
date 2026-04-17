package models

import "time"

type Client struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	Name          string    `json:"name"`
	Email         string    `json:"email"`
	Phone         string    `json:"phone"`
	Company       string    `json:"company"`
	Address       string    `json:"address"`
	City          string    `json:"city"`
	TotalInvoices int       `json:"total_invoices"`
	TotalSpent    float64   `json:"total_spent"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type CreateClientRequest struct {
	Name    string `json:"name" binding:"required"`
	Email   string `json:"email" binding:"required,email"`
	Phone   string `json:"phone"`
	Company string `json:"company"`
	Address string `json:"address"`
	City    string `json:"city"`
}

type UpdateClientRequest struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Phone   string `json:"phone"`
	Company string `json:"company"`
	Address string `json:"address"`
	City    string `json:"city"`
}

type ClientListResponse struct {
	Data       []Client `json:"data"`
	Total      int      `json:"total"`
	Page       int      `json:"page"`
	PerPage    int      `json:"per_page"`
	TotalPages int      `json:"total_pages"`
}
