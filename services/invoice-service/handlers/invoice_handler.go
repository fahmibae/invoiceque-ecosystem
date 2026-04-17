package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/invoice-service/models"
	"github.com/invoiceque/invoice-service/repository"
	"github.com/invoiceque/invoice-service/services"
)

type InvoiceHandler struct {
	service      *services.InvoiceService
	pdfGenerator *services.PdfGeneratorService
	repo         *repository.InvoiceRepository
}

func NewInvoiceHandler(
	svc *services.InvoiceService,
	pdfGen *services.PdfGeneratorService,
	repo *repository.InvoiceRepository,
) *InvoiceHandler {
	return &InvoiceHandler{
		service:      svc,
		pdfGenerator: pdfGen,
		repo:         repo,
	}
}

// List handles GET /invoices
func (h *InvoiceHandler) List(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "0"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "10"))

	data, total, totalPages, err := h.service.FindAll(userID, status, page, size)
	if err != nil {
		log.Printf("[INVOICE] Error listing invoices: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":        data,
		"total":       total,
		"page":        page,
		"per_page":    size,
		"total_pages": totalPages,
	})
}

// Get handles GET /invoices/:id
func (h *InvoiceHandler) Get(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetHeader("X-User-ID")

	resp, err := h.service.FindByID(id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// DownloadPdf handles GET /invoices/:id/pdf
func (h *InvoiceHandler) DownloadPdf(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetHeader("X-User-ID")

	inv, err := h.repo.FindByIDAndUserID(id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	pdfBytes, err := h.pdfGenerator.GenerateInvoicePdf(inv)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate PDF"})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename=\""+inv.Number+".pdf\"")
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

// Create handles POST /invoices
func (h *InvoiceHandler) Create(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")

	var req models.InvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.service.Create(req, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// Update handles PUT /invoices/:id
func (h *InvoiceHandler) Update(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetHeader("X-User-ID")

	var req models.InvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.service.Update(id, req, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// Delete handles DELETE /invoices/:id
func (h *InvoiceHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetHeader("X-User-ID")

	if err := h.service.Delete(id, userID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invoice deleted successfully"})
}

// Send handles PUT /invoices/:id/send
func (h *InvoiceHandler) Send(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetHeader("X-User-ID")

	resp, err := h.service.SendInvoice(id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
