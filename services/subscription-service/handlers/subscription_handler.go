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

	// Check limits first
	subWithPlan, err := h.repo.GetUsage(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No subscription found"})
		return
	}

	// Check if limit reached
	switch req.Type {
	case "invoice":
		if subWithPlan.Plan.MaxInvoices != -1 && subWithPlan.InvoicesUsed >= subWithPlan.Plan.MaxInvoices {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Invoice limit reached",
				"limit":   subWithPlan.Plan.MaxInvoices,
				"used":    subWithPlan.InvoicesUsed,
				"upgrade": "Upgrade to Pro or Enterprise for more invoices",
			})
			return
		}
	case "client":
		if subWithPlan.Plan.MaxClients != -1 && subWithPlan.ClientsUsed >= subWithPlan.Plan.MaxClients {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Client limit reached",
				"limit":   subWithPlan.Plan.MaxClients,
				"used":    subWithPlan.ClientsUsed,
				"upgrade": "Upgrade to Pro or Enterprise for more clients",
			})
			return
		}
	case "payment_link":
		if subWithPlan.Plan.MaxPaymentLinks != -1 && subWithPlan.PaymentLinksUsed >= subWithPlan.Plan.MaxPaymentLinks {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Payment link limit reached",
				"limit":   subWithPlan.Plan.MaxPaymentLinks,
				"used":    subWithPlan.PaymentLinksUsed,
				"upgrade": "Upgrade to Pro or Enterprise for more payment links",
			})
			return
		}
	}

	if err := h.repo.IncrementUsage(userID, req.Type); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to increment usage"})
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
