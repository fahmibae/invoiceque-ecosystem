package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/invoice-service/models"
	"github.com/invoiceque/invoice-service/repository"
)

type SettingsHandler struct {
	repo *repository.SettingsRepository
}

func NewSettingsHandler(repo *repository.SettingsRepository) *SettingsHandler {
	return &SettingsHandler{repo: repo}
}

// Get handles GET /invoice-settings
func (h *SettingsHandler) Get(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")

	settings, err := h.repo.FindByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, settings)
}

// Update handles PUT /invoice-settings
func (h *SettingsHandler) Update(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")

	var req models.InvoiceSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Load existing settings and merge
	existing, err := h.repo.FindByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	existing.UserID = userID
	if req.BusinessName != "" {
		existing.BusinessName = req.BusinessName
	}
	if req.BusinessEmail != "" {
		existing.BusinessEmail = req.BusinessEmail
	}
	if req.BusinessPhone != "" {
		existing.BusinessPhone = req.BusinessPhone
	}
	if req.BusinessWebsite != "" {
		existing.BusinessWebsite = req.BusinessWebsite
	}
	if req.BusinessAddress != "" {
		existing.BusinessAddress = req.BusinessAddress
	}
	if req.LogoURL != "" {
		existing.LogoURL = req.LogoURL
	}
	if req.AccentColor != "" {
		existing.AccentColor = req.AccentColor
	}
	if req.FooterText != "" {
		existing.FooterText = req.FooterText
	}

	if err := h.repo.Upsert(existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("[SETTINGS] Updated invoice settings for user %s", userID)
	c.JSON(http.StatusOK, existing)
}
