package handlers

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/subscription-service/config"
	"github.com/invoiceque/subscription-service/messaging"
	"github.com/invoiceque/subscription-service/models"
	"github.com/invoiceque/subscription-service/repository"
)

type CheckoutHandler struct {
	repo      *repository.SubscriptionRepository
	cfg       *config.Config
	publisher *messaging.Publisher
}

func NewCheckoutHandler(repo *repository.SubscriptionRepository, cfg *config.Config, publisher *messaging.Publisher) *CheckoutHandler {
	return &CheckoutHandler{repo: repo, cfg: cfg, publisher: publisher}
}

// POST /subscriptions/checkout — Create Xendit invoice for subscription plan
func (h *CheckoutHandler) CreateCheckout(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	userEmail := c.GetHeader("X-User-Email")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.CheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the plan
	plan, err := h.repo.GetPlanByID(req.PlanID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
		return
	}

	// Free plan — just subscribe directly
	if plan.Price <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Free plan doesn't need checkout"})
		return
	}

	// Enterprise plan — checkout can only be created by admin via /admin/enterprise
	if plan.Name == "enterprise" {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Paket Enterprise tidak bisa di-checkout secara langsung. Silakan hubungi tim Sales kami.",
			"contact": "Hubungi admin SaaS untuk mendapatkan link checkout Enterprise.",
		})
		return
	}

	// Generate unique external ID for this transaction
	externalID := fmt.Sprintf("SUB-%s-%s", userID[:8], generateCheckoutID())

	// Create Xendit invoice
	invoiceURL, xenditID, err := h.createXenditInvoice(plan, userEmail, externalID)
	if err != nil {
		log.Printf("[CHECKOUT] Failed to create Xendit invoice: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to create payment invoice"})
		return
	}

	// Save transaction record
	now := time.Now()
	tx := &models.SubscriptionTransaction{
		ID:          generateCheckoutID(),
		UserID:      userID,
		PlanID:      req.PlanID,
		Amount:      plan.Price,
		Status:      "pending",
		CheckoutURL: invoiceURL,
		ExternalID:  externalID,
		XenditID:    xenditID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := h.repo.CreateTransaction(tx); err != nil {
		log.Printf("[CHECKOUT] Failed to save transaction: %v", err)
		// Still return the checkout URL even if DB save fails
	}

	// Publish event: subscription.checkout_created
	h.publishEvent("CheckoutCreated", map[string]interface{}{
		"event_type":   "subscription.checkout_created",
		"user_id":      userID,
		"user_email":   userEmail,
		"plan_id":      req.PlanID,
		"plan_name":    plan.DisplayName,
		"amount":       plan.Price,
		"currency":     plan.Currency,
		"checkout_url": invoiceURL,
		"external_id":  externalID,
	})

	c.JSON(http.StatusOK, models.CheckoutResponse{
		CheckoutURL:   invoiceURL,
		TransactionID: tx.ID,
		ExternalID:    externalID,
	})
}

// POST /subscriptions/checkout/resend/:external_id — Resend/regenerate checkout link
func (h *CheckoutHandler) ResendCheckout(c *gin.Context) {
	externalID := c.Param("external_id")
	if externalID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "external_id required"})
		return
	}

	// Find the original transaction
	oldTx, err := h.repo.GetTransactionByExternalID(externalID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// Only resend if the transaction is pending or expired
	if oldTx.Status == "paid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Transaction already paid"})
		return
	}

	// Get plan details
	plan, err := h.repo.GetPlanByID(oldTx.PlanID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
		return
	}

	// Get user email from header (admin resend) or look up
	userEmail := c.GetHeader("X-User-Email")

	// Generate a new external ID for the new Xendit invoice
	newExternalID := fmt.Sprintf("SUB-%s-%s", oldTx.UserID[:8], generateCheckoutID())

	// Create a new Xendit invoice
	invoiceURL, xenditID, err := h.createXenditInvoice(plan, userEmail, newExternalID)
	if err != nil {
		log.Printf("[CHECKOUT] Failed to create new Xendit invoice for resend: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to create new payment invoice"})
		return
	}

	// Mark old transaction as "resent"
	h.repo.UpdateTransactionStatus(externalID, "resent", oldTx.XenditID)

	// Save new transaction record
	now := time.Now()
	newTx := &models.SubscriptionTransaction{
		ID:          generateCheckoutID(),
		UserID:      oldTx.UserID,
		PlanID:      oldTx.PlanID,
		Amount:      plan.Price,
		Status:      "pending",
		CheckoutURL: invoiceURL,
		ExternalID:  newExternalID,
		XenditID:    xenditID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := h.repo.CreateTransaction(newTx); err != nil {
		log.Printf("[CHECKOUT] Failed to save new transaction: %v", err)
	}

	// Publish event so notification service sends email
	h.publishEvent("CheckoutCreated", map[string]interface{}{
		"event_type":   "subscription.checkout_created",
		"user_id":      oldTx.UserID,
		"user_email":   userEmail,
		"plan_id":      oldTx.PlanID,
		"plan_name":    plan.DisplayName,
		"amount":       plan.Price,
		"currency":     plan.Currency,
		"checkout_url": invoiceURL,
		"external_id":  newExternalID,
		"is_resend":    true,
	})

	log.Printf("[CHECKOUT] ✅ Resent checkout for user=%s, old_external_id=%s, new_external_id=%s", oldTx.UserID, externalID, newExternalID)

	c.JSON(http.StatusOK, gin.H{
		"message":         "Checkout link regenerated and resent",
		"checkout_url":    invoiceURL,
		"external_id":     newExternalID,
		"transaction_id":  newTx.ID,
		"old_external_id": externalID,
	})
}

// POST /subscriptions/webhook — Handle Xendit webhook callback
func (h *CheckoutHandler) HandleWebhook(c *gin.Context) {
	// Verify callback token
	callbackToken := c.GetHeader("x-callback-token")
	if callbackToken != h.cfg.XenditCallbackToken {
		log.Printf("[WEBHOOK] Invalid callback token")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid callback token"})
		return
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
		return
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	externalID, _ := payload["external_id"].(string)
	status, _ := payload["status"].(string)
	xenditID, _ := payload["id"].(string)

	log.Printf("[WEBHOOK] Received: external_id=%s, status=%s, xendit_id=%s", externalID, status, xenditID)

	// Only process subscription-related webhooks
	if len(externalID) < 4 || externalID[:4] != "SUB-" {
		log.Printf("[WEBHOOK] Not a subscription webhook, ignoring")
		c.JSON(http.StatusOK, gin.H{"message": "Ignored - not a subscription"})
		return
	}

	// Find the transaction
	tx, err := h.repo.GetTransactionByExternalID(externalID)
	if err != nil {
		log.Printf("[WEBHOOK] Transaction not found for external_id=%s: %v", externalID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// Already processed
	if tx.Status == "paid" {
		c.JSON(http.StatusOK, gin.H{"message": "Already processed"})
		return
	}

	// Map Xendit status
	var txStatus string
	switch status {
	case "PAID", "SETTLED":
		txStatus = "paid"
	case "EXPIRED":
		txStatus = "expired"
	default:
		txStatus = "pending"
	}

	// Update transaction status
	if err := h.repo.UpdateTransactionStatus(externalID, txStatus, xenditID); err != nil {
		log.Printf("[WEBHOOK] Failed to update transaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update transaction"})
		return
	}

	// Get plan for event data
	plan, _ := h.repo.GetPlanByID(tx.PlanID)
	planName := ""
	if plan != nil {
		planName = plan.DisplayName
	}

	// If paid, activate the subscription
	if txStatus == "paid" {
		if err := h.activateSubscription(tx.UserID, tx.PlanID); err != nil {
			log.Printf("[WEBHOOK] Failed to activate subscription: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to activate subscription"})
			return
		}
		log.Printf("[WEBHOOK] ✅ Subscription activated for user=%s, plan=%s", tx.UserID, tx.PlanID)

		// Publish event: subscription.paid
		h.publishEvent("SubscriptionPaid", map[string]interface{}{
			"event_type":  "subscription.paid",
			"user_id":     tx.UserID,
			"plan_id":     tx.PlanID,
			"plan_name":   planName,
			"amount":      tx.Amount,
			"external_id": externalID,
		})
	}

	// If expired, publish event
	if txStatus == "expired" {
		h.publishEvent("SubscriptionExpired", map[string]interface{}{
			"event_type":   "subscription.expired",
			"user_id":      tx.UserID,
			"plan_id":      tx.PlanID,
			"plan_name":    planName,
			"amount":       tx.Amount,
			"checkout_url": tx.CheckoutURL,
			"external_id":  externalID,
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Webhook processed", "status": txStatus})
}

// GET /subscriptions/checkout/status/:external_id — Check checkout status (polling fallback)
func (h *CheckoutHandler) CheckStatus(c *gin.Context) {
	externalID := c.Param("external_id")
	if externalID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "external_id required"})
		return
	}

	tx, err := h.repo.GetTransactionByExternalID(externalID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// If still pending, check with Xendit directly
	if tx.Status == "pending" && tx.XenditID != "" {
		xenditStatus, err := h.checkXenditInvoiceStatus(tx.XenditID)
		if err == nil && (xenditStatus == "PAID" || xenditStatus == "SETTLED") {
			// Update our records
			h.repo.UpdateTransactionStatus(externalID, "paid", tx.XenditID)
			h.activateSubscription(tx.UserID, tx.PlanID)
			tx.Status = "paid"
			log.Printf("[STATUS-CHECK] ✅ Subscription activated via polling for user=%s", tx.UserID)

			// Publish paid event
			plan, _ := h.repo.GetPlanByID(tx.PlanID)
			planName := ""
			if plan != nil {
				planName = plan.DisplayName
			}
			h.publishEvent("SubscriptionPaid", map[string]interface{}{
				"event_type":  "subscription.paid",
				"user_id":     tx.UserID,
				"plan_id":     tx.PlanID,
				"plan_name":   planName,
				"amount":      tx.Amount,
				"external_id": externalID,
			})
		} else if err == nil && xenditStatus == "EXPIRED" {
			h.repo.UpdateTransactionStatus(externalID, "expired", tx.XenditID)
			tx.Status = "expired"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":      tx.Status,
		"external_id": tx.ExternalID,
		"plan_id":     tx.PlanID,
		"amount":      tx.Amount,
	})
}

// ── Helper functions ──────────────────────────────────────

func (h *CheckoutHandler) createXenditInvoice(plan *models.SubscriptionPlan, userEmail, externalID string) (string, string, error) {
	xenditReq := map[string]interface{}{
		"external_id":      externalID,
		"amount":           plan.Price,
		"currency":         plan.Currency,
		"description":      fmt.Sprintf("InvoiceQue %s Plan - Monthly Subscription", plan.DisplayName),
		"invoice_duration": 86400, // 24 hours
		"customer": map[string]interface{}{
			"email": userEmail,
		},
		"success_redirect_url": fmt.Sprintf("%s/subscription?status=success&plan=%s", h.cfg.FrontendURL, plan.Name),
		"failure_redirect_url": fmt.Sprintf("%s/subscription?status=failed", h.cfg.FrontendURL),
		"items": []map[string]interface{}{
			{
				"name":     fmt.Sprintf("Paket %s - Langganan Bulanan", plan.DisplayName),
				"quantity": 1,
				"price":    plan.Price,
			},
		},
	}

	jsonBody, err := json.Marshal(xenditReq)
	if err != nil {
		return "", "", fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", fmt.Sprintf("%s/v2/invoices", h.cfg.XenditBaseURL), bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", "", fmt.Errorf("failed to create HTTP request: %w", err)
	}

	httpReq.SetBasicAuth(h.cfg.XenditAPIKey, "")
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", "", fmt.Errorf("Xendit request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", "", fmt.Errorf("Xendit error (%d): %s", resp.StatusCode, string(body))
	}

	var xenditResp map[string]interface{}
	if err := json.Unmarshal(body, &xenditResp); err != nil {
		return "", "", fmt.Errorf("failed to parse Xendit response: %w", err)
	}

	invoiceURL, _ := xenditResp["invoice_url"].(string)
	xenditID, _ := xenditResp["id"].(string)

	return invoiceURL, xenditID, nil
}

func (h *CheckoutHandler) activateSubscription(userID, planID string) error {
	// Check if user already has a subscription
	existing, _ := h.repo.GetByUserID(userID)
	if existing != nil {
		// Update existing subscription to new plan
		return h.repo.UpdatePlan(userID, planID)
	}

	// Create new subscription
	now := time.Now()
	periodEnd := now.AddDate(0, 1, 0)
	sub := &models.Subscription{
		ID:                 generateCheckoutID(),
		UserID:             userID,
		PlanID:             planID,
		Status:             "active",
		CurrentPeriodStart: now,
		CurrentPeriodEnd:   &periodEnd,
		CreatedAt:          now,
		UpdatedAt:          now,
	}
	return h.repo.Create(sub)
}

func (h *CheckoutHandler) checkXenditInvoiceStatus(xenditID string) (string, error) {
	httpReq, err := http.NewRequest("GET", fmt.Sprintf("%s/v2/invoices/%s", h.cfg.XenditBaseURL, xenditID), nil)
	if err != nil {
		return "", err
	}
	httpReq.SetBasicAuth(h.cfg.XenditAPIKey, "")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	status, _ := result["status"].(string)
	return status, nil
}

func (h *CheckoutHandler) publishEvent(eventName string, event map[string]interface{}) {
	if h.publisher == nil {
		log.Printf("[SUBSCRIPTION] Publisher not available, skipping event: %s", eventName)
		return
	}

	switch eventName {
	case "CheckoutCreated":
		h.publisher.PublishCheckoutCreated(event)
	case "SubscriptionPaid":
		h.publisher.PublishSubscriptionPaid(event)
	case "SubscriptionExpired":
		h.publisher.PublishSubscriptionExpired(event)
	}
}

func generateCheckoutID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
