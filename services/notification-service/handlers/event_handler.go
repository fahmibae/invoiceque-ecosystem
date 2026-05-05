package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/notification-service/consumers"
)

// EventHandler receives events via REST API from other microservices
type EventHandler struct {
	invoiceProcessor      *consumers.InvoiceConsumer
	paymentProcessor      *consumers.PaymentConsumer
	paymentLinkProcessor  *consumers.PaymentLinkConsumer
	subscriptionProcessor *consumers.SubscriptionConsumer
}

func NewEventHandler(
	invoiceProcessor *consumers.InvoiceConsumer,
	paymentProcessor *consumers.PaymentConsumer,
	paymentLinkProcessor *consumers.PaymentLinkConsumer,
	subscriptionProcessor *consumers.SubscriptionConsumer,
) *EventHandler {
	return &EventHandler{
		invoiceProcessor:      invoiceProcessor,
		paymentProcessor:      paymentProcessor,
		paymentLinkProcessor:  paymentLinkProcessor,
		subscriptionProcessor: subscriptionProcessor,
	}
}

// POST /events/invoice — Receive invoice events from invoice-service
func (h *EventHandler) HandleInvoiceEvent(c *gin.Context) {
	var event consumers.InvoiceEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		log.Printf("[NOTIFICATION] Failed to parse invoice event: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event payload"})
		return
	}

	log.Printf("[NOTIFICATION] Received invoice event via REST: %s for invoice %s", event.EventType, event.InvoiceNum)
	h.invoiceProcessor.ProcessEvent(event)
	c.JSON(http.StatusOK, gin.H{"status": "ok", "event": event.EventType})
}

// POST /events/payment — Receive payment events from payment-service
func (h *EventHandler) HandlePaymentEvent(c *gin.Context) {
	var event consumers.PaymentEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		log.Printf("[NOTIFICATION] Failed to parse payment event: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event payload"})
		return
	}

	log.Printf("[NOTIFICATION] Received payment event via REST: %s for payment %s", event.EventType, event.PaymentID)
	h.paymentProcessor.ProcessEvent(event)
	c.JSON(http.StatusOK, gin.H{"status": "ok", "event": event.EventType})
}

// POST /events/paymentlink — Receive payment link events from payment-service
func (h *EventHandler) HandlePaymentLinkEvent(c *gin.Context) {
	var event consumers.PaymentLinkEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		log.Printf("[NOTIFICATION] Failed to parse paymentlink event: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event payload"})
		return
	}

	log.Printf("[NOTIFICATION] Received paymentlink event via REST: %s for link %s", event.EventType, event.PaymentLinkID)
	h.paymentLinkProcessor.ProcessEvent(event)
	c.JSON(http.StatusOK, gin.H{"status": "ok", "event": event.EventType})
}

// POST /events/subscription — Receive subscription events from subscription-service
func (h *EventHandler) HandleSubscriptionEvent(c *gin.Context) {
	var event consumers.SubscriptionEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		log.Printf("[NOTIFICATION] Failed to parse subscription event: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event payload"})
		return
	}

	log.Printf("[NOTIFICATION] Received subscription event via REST: %s for user %s", event.EventType, event.UserID)
	h.subscriptionProcessor.ProcessEvent(event)
	c.JSON(http.StatusOK, gin.H{"status": "ok", "event": event.EventType})
}
