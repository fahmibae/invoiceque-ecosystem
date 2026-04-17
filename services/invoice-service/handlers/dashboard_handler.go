package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/invoice-service/services"
)

type DashboardHandler struct {
	service *services.InvoiceService
}

func NewDashboardHandler(svc *services.InvoiceService) *DashboardHandler {
	return &DashboardHandler{service: svc}
}

// GetStats handles GET /dashboard/stats
func (h *DashboardHandler) GetStats(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")

	stats, err := h.service.GetDashboardStats(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetRevenueChart handles GET /dashboard/revenue-chart
func (h *DashboardHandler) GetRevenueChart(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	months, _ := strconv.Atoi(c.DefaultQuery("months", "6"))

	chart, err := h.service.GetRevenueChart(userID, months)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, chart)
}
