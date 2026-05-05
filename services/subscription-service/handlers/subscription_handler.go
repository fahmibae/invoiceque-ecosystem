package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/subscription-service/models"
	"github.com/invoiceque/subscription-service/repository"
)

type SubscriptionHandler struct {
	repo *repository.SubscriptionRepository
}

func NewSubscriptionHandler(repo *repository.SubscriptionRepository) *SubscriptionHandler {
	return &SubscriptionHandler{repo: repo}
}

// GET /subscriptions/plans — List all available plans (public)
func (h *SubscriptionHandler) ListPlans(c *gin.Context) {
	plans, err := h.repo.GetAllPlans()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plans"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": plans})
}

// GET /subscriptions/current — Get current user's subscription
func (h *SubscriptionHandler) GetCurrent(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	subWithPlan, err := h.repo.GetUsage(userID)
	if err != nil {
		// User has no subscription — auto-assign Free plan
		sub := h.autoAssignFreePlan(userID)
		if sub == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create subscription"})
			return
		}
		// Retry
		subWithPlan, err = h.repo.GetUsage(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subscription"})
			return
		}
	}

	c.JSON(http.StatusOK, subWithPlan)
}

// GET /subscriptions/usage — Get usage limits for current user
func (h *SubscriptionHandler) GetUsage(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	subWithPlan, err := h.repo.GetUsage(userID)
	if err != nil {
		// Auto-assign free plan
		h.autoAssignFreePlan(userID)
		subWithPlan, err = h.repo.GetUsage(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch usage"})
			return
		}
	}

	usage := models.UsageResponse{
		InvoicesUsed:      subWithPlan.InvoicesUsed,
		InvoicesLimit:     subWithPlan.Plan.MaxInvoices,
		ClientsUsed:       subWithPlan.ClientsUsed,
		ClientsLimit:      subWithPlan.Plan.MaxClients,
		PaymentLinksUsed:  subWithPlan.PaymentLinksUsed,
		PaymentLinksLimit: subWithPlan.Plan.MaxPaymentLinks,
		CanCreateInvoice:  subWithPlan.Plan.MaxInvoices == -1 || subWithPlan.InvoicesUsed < subWithPlan.Plan.MaxInvoices,
		CanCreateClient:   subWithPlan.Plan.MaxClients == -1 || subWithPlan.ClientsUsed < subWithPlan.Plan.MaxClients,
		CanCreatePayment:  subWithPlan.Plan.MaxPaymentLinks == -1 || subWithPlan.PaymentLinksUsed < subWithPlan.Plan.MaxPaymentLinks,
	}

	c.JSON(http.StatusOK, usage)
}

// POST /subscriptions/subscribe — Subscribe to a plan
func (h *SubscriptionHandler) Subscribe(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.SubscribeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify plan exists
	plan, err := h.repo.GetPlanByID(req.PlanID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
		return
	}

	// Enterprise plan cannot be subscribed directly — must go through admin/sales
	if plan.Name == "enterprise" {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Paket Enterprise tidak bisa diaktifkan secara langsung. Silakan hubungi tim Sales kami.",
			"contact": "Hubungi admin SaaS untuk mendapatkan link checkout Enterprise.",
		})
		return
	}

	// Check if user already has a subscription
	existing, _ := h.repo.GetByUserID(userID)
	if existing != nil {
		// Update existing subscription
		if err := h.repo.UpdatePlan(userID, req.PlanID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update subscription"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"message": "Subscription updated",
			"plan":    plan,
		})
		return
	}

	// Create new subscription
	now := time.Now()
	periodEnd := now.AddDate(0, 1, 0)
	sub := &models.Subscription{
		ID:                 generateID(),
		UserID:             userID,
		PlanID:             req.PlanID,
		Status:             "active",
		CurrentPeriodStart: now,
		CurrentPeriodEnd:   &periodEnd,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := h.repo.Create(sub); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create subscription"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":      "Subscribed successfully",
		"subscription": sub,
		"plan":         plan,
	})
}

// POST /subscriptions/usage/increment — Increment usage counter (called by other services)
func (h *SubscriptionHandler) IncrementUsage(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.IncrementUsageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Atomic check-and-increment (prevents race condition)
	incremented, err := h.repo.IncrementUsage(userID, req.Type)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to increment usage"})
		return
	}

	if !incremented {
		// Limit reached — fetch details for error message
		subWithPlan, _ := h.repo.GetUsage(userID)
		if subWithPlan != nil {
			switch req.Type {
			case "invoice":
				c.JSON(http.StatusForbidden, gin.H{
					"error":   "Invoice limit reached",
					"limit":   subWithPlan.Plan.MaxInvoices,
					"used":    subWithPlan.InvoicesUsed,
					"upgrade": "Upgrade to Pro or Enterprise for more invoices",
				})
			case "client":
				c.JSON(http.StatusForbidden, gin.H{
					"error":   "Client limit reached",
					"limit":   subWithPlan.Plan.MaxClients,
					"used":    subWithPlan.ClientsUsed,
					"upgrade": "Upgrade to Pro or Enterprise for more clients",
				})
			case "payment_link":
				c.JSON(http.StatusForbidden, gin.H{
					"error":   "Payment link limit reached",
					"limit":   subWithPlan.Plan.MaxPaymentLinks,
					"used":    subWithPlan.PaymentLinksUsed,
					"upgrade": "Upgrade to Pro or Enterprise for more payment links",
				})
			default:
				c.JSON(http.StatusForbidden, gin.H{"error": "Limit reached"})
			}
		} else {
			c.JSON(http.StatusForbidden, gin.H{"error": "Limit reached"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Usage incremented", "type": req.Type})
}

// GET /subscriptions/check — Check if user can perform action (used by gateway middleware)
func (h *SubscriptionHandler) CheckLimit(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	resourceType := c.Query("type") // "invoice", "client", "payment_link"

	if userID == "" || resourceType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id and type required"})
		return
	}

	subWithPlan, err := h.repo.GetUsage(userID)
	if err != nil {
		// No subscription = auto-assign free
		h.autoAssignFreePlan(userID)
		subWithPlan, err = h.repo.GetUsage(userID)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"allowed": false, "reason": "No subscription"})
			return
		}
	}

	allowed := true
	switch resourceType {
	case "invoice":
		allowed = subWithPlan.Plan.MaxInvoices == -1 || subWithPlan.InvoicesUsed < subWithPlan.Plan.MaxInvoices
	case "client":
		allowed = subWithPlan.Plan.MaxClients == -1 || subWithPlan.ClientsUsed < subWithPlan.Plan.MaxClients
	case "payment_link":
		allowed = subWithPlan.Plan.MaxPaymentLinks == -1 || subWithPlan.PaymentLinksUsed < subWithPlan.Plan.MaxPaymentLinks
	}

	c.JSON(http.StatusOK, gin.H{
		"allowed": allowed,
		"plan":    subWithPlan.Plan.Name,
		"tier":    subWithPlan.Plan.DisplayName,
	})
}

// PUT /subscriptions/plans/:id — Admin: Update plan settings
func (h *SubscriptionHandler) UpdatePlan(c *gin.Context) {
	planID := c.Param("id")
	if planID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plan ID required"})
		return
	}

	// Verify plan exists
	existing, err := h.repo.GetPlanByID(planID)
	if err != nil || existing == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
		return
	}

	var req models.SubscriptionPlan
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Use existing values as fallback
	if req.DisplayName == "" {
		req.DisplayName = existing.DisplayName
	}
	if req.BillingPeriod == "" {
		req.BillingPeriod = existing.BillingPeriod
	}
	if req.Features == "" {
		req.Features = existing.Features
	}

	if err := h.repo.UpdatePlanSettings(planID, &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update plan"})
		return
	}

	// Fetch updated plan
	updated, _ := h.repo.GetPlanByID(planID)
	c.JSON(http.StatusOK, gin.H{"message": "Plan updated", "data": updated})
}

// GET /subscriptions/all — Admin: List all user subscriptions
func (h *SubscriptionHandler) ListAll(c *gin.Context) {
	subs, err := h.repo.ListAllSubscriptions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subscriptions"})
		return
	}
	if subs == nil {
		subs = []models.SubscriptionWithPlan{}
	}
	c.JSON(http.StatusOK, gin.H{"data": subs})
}

// GET /subscriptions/transactions — Admin: List all transactions
func (h *SubscriptionHandler) ListTransactions(c *gin.Context) {
	txs, err := h.repo.ListAllTransactions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}
	if txs == nil {
		txs = []models.SubscriptionTransaction{}
	}
	c.JSON(http.StatusOK, gin.H{"data": txs})
}

func (h *SubscriptionHandler) autoAssignFreePlan(userID string) *models.Subscription {
	now := time.Now()
	periodEnd := now.AddDate(0, 1, 0)
	sub := &models.Subscription{
		ID:                 generateID(),
		UserID:             userID,
		PlanID:             "plan_free",
		Status:             "active",
		CurrentPeriodStart: now,
		CurrentPeriodEnd:   &periodEnd,
		CreatedAt:          now,
		UpdatedAt:          now,
	}
	if err := h.repo.Create(sub); err != nil {
		return nil
	}
	return sub
}

func generateID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
