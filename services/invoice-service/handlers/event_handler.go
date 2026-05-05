package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/invoice-service/services"
)

type EventHandler struct {
	invoiceService *services.InvoiceService
}

func NewEventHandler(invoiceService *services.InvoiceService) *EventHandler {
	return &EventHandler{invoiceService: invoiceService}
}

type PaymentEvent struct {
	EventType    string  `json:"event_type"`
	UserID       string  `json:"user_id"`
	PaymentID    string  `json:"payment_id"`
	InvoiceID    string  `json:"invoice_id"`
	Amount       float64 `json:"amount"`
	ClientName   string  `json:"client_name"`
	ClientEmail  string  `json:"client_email"`
	PaymentTitle string  `json:"payment_title"`
}

func (h *EventHandler) HandlePaymentEvent(c *gin.Context) {
	var event PaymentEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		log.Printf("[INVOICE] Failed to parse payment event: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	if event.EventType == "payment.completed" && event.InvoiceID != "" {
		h.invoiceService.MarkAsPaid(event.InvoiceID)
		log.Printf("[INVOICE] Marked invoice %s as paid from payment event", event.InvoiceID)
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
