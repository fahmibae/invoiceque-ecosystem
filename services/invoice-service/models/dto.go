package models

// InvoiceRequest mirrors the Java InvoiceRequest DTO
type InvoiceRequest struct {
	ClientID     string        `json:"client_id" binding:"required"`
	ClientName   string        `json:"client_name" binding:"required"`
	ClientEmail  string        `json:"client_email"`
	Items        []ItemRequest `json:"items" binding:"required"`
	Tax          *float64      `json:"tax"`
	Discount     *float64      `json:"discount"`
	DueDate      string        `json:"due_date"`
	Notes        string        `json:"notes"`
	Status       string        `json:"status"`
	PaymentType  string        `json:"payment_type"`
	DpPercentage *int          `json:"dp_percentage"`
}

type ItemRequest struct {
	Description string  `json:"description" binding:"required"`
	Quantity    int     `json:"quantity" binding:"required"`
	Price       float64 `json:"price" binding:"required"`
}

// InvoiceResponse mirrors the Java InvoiceResponse DTO
type InvoiceResponse struct {
	ID                   string         `json:"id"`
	Number               string         `json:"number"`
	ClientID             string         `json:"client_id"`
	ClientName           string         `json:"client_name"`
	ClientEmail          string         `json:"client_email"`
	Items                []ItemResponse `json:"items"`
	Subtotal             float64        `json:"subtotal"`
	Tax                  float64        `json:"tax"`
	Discount             float64        `json:"discount"`
	Total                float64        `json:"total"`
	Status               string         `json:"status"`
	PaymentType          string         `json:"payment_type"`
	DpPercentage         int            `json:"dp_percentage"`
	DpAmount             float64        `json:"dp_amount"`
	AmountPaid           float64        `json:"amount_paid"`
	AmountRemaining      float64        `json:"amount_remaining"`
	DueDate              string         `json:"due_date"`
	CreatedAt            interface{}    `json:"created_at"`
	PaidAt               interface{}    `json:"paid_at"`
	Notes                string         `json:"notes"`
	PaymentLink          string         `json:"payment_link"`
	RemainingPaymentLink string         `json:"remaining_payment_link"`
}

type ItemResponse struct {
	ID          string  `json:"id"`
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	Price       float64 `json:"price"`
	Total       float64 `json:"total"`
}

// DashboardStatsResponse mirrors the Java DashboardStatsResponse DTO
type DashboardStatsResponse struct {
	TotalRevenue       float64 `json:"totalRevenue"`
	TotalInvoices      int64   `json:"totalInvoices"`
	PaidInvoices       int64   `json:"paidInvoices"`
	PendingAmount      float64 `json:"pendingAmount"`
	OverdueInvoices    int64   `json:"overdueInvoices"`
	ActivePaymentLinks int64   `json:"activePaymentLinks"`
}

// RevenueChartItem mirrors the Java RevenueChartItem DTO
type RevenueChartItem struct {
	Month   string  `json:"month"`
	Revenue float64 `json:"revenue"`
}

// ToResponse converts an Invoice model to InvoiceResponse DTO
func ToResponse(inv *Invoice) InvoiceResponse {
	items := make([]ItemResponse, len(inv.Items))
	for i, item := range inv.Items {
		items[i] = ItemResponse{
			ID:          item.ID,
			Description: item.Description,
			Quantity:    item.Quantity,
			Price:       item.Price,
			Total:       item.Total,
		}
	}

	return InvoiceResponse{
		ID:                   inv.ID,
		Number:               inv.Number,
		ClientID:             inv.ClientID,
		ClientName:           inv.ClientName,
		ClientEmail:          inv.ClientEmail,
		Items:                items,
		Subtotal:             inv.Subtotal,
		Tax:                  inv.Tax,
		Discount:             inv.Discount,
		Total:                inv.Total,
		Status:               inv.Status,
		PaymentType:          inv.PaymentType,
		DpPercentage:         inv.DpPercentage,
		DpAmount:             inv.DpAmount,
		AmountPaid:           inv.AmountPaid,
		AmountRemaining:      inv.AmountRemaining,
		DueDate:              inv.DueDate,
		CreatedAt:            inv.CreatedAt,
		PaidAt:               inv.PaidAt,
		Notes:                inv.Notes,
		PaymentLink:          inv.PaymentLink,
		RemainingPaymentLink: inv.RemainingPaymentLink,
	}
}
