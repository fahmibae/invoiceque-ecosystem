package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/client-service/models"
	"github.com/invoiceque/client-service/repository"
)

type ClientHandler struct {
	clientRepo *repository.ClientRepository
}

func NewClientHandler(repo *repository.ClientRepository) *ClientHandler {
	return &ClientHandler{clientRepo: repo}
}

func (h *ClientHandler) List(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	search := c.DefaultQuery("search", "")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 10
	}

	clients, total, err := h.clientRepo.FindAll(userID, search, page, perPage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch clients"})
		return
	}

	if clients == nil {
		clients = []models.Client{}
	}

	totalPages := (total + perPage - 1) / perPage

	c.JSON(http.StatusOK, models.ClientListResponse{
		Data:       clients,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: totalPages,
	})
}

func (h *ClientHandler) Get(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	id := c.Param("id")

	client, err := h.clientRepo.FindByID(id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found"})
		return
	}

	c.JSON(http.StatusOK, client)
}

func (h *ClientHandler) Create(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")

	var req models.CreateClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	client := &models.Client{
		ID:        generateID(),
		UserID:    userID,
		Name:      req.Name,
		Email:     req.Email,
		Phone:     req.Phone,
		Company:   req.Company,
		Address:   req.Address,
		City:      req.City,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := h.clientRepo.Create(client); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create client"})
		return
	}

	c.JSON(http.StatusCreated, client)
}

func (h *ClientHandler) Update(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	id := c.Param("id")

	client, err := h.clientRepo.FindByID(id, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Client not found"})
		return
	}

	var req models.UpdateClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name != "" {
		client.Name = req.Name
	}
	if req.Email != "" {
		client.Email = req.Email
	}
	if req.Phone != "" {
		client.Phone = req.Phone
	}
	if req.Company != "" {
		client.Company = req.Company
	}
	if req.Address != "" {
		client.Address = req.Address
	}
	if req.City != "" {
		client.City = req.City
	}

	if err := h.clientRepo.Update(client); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update client"})
		return
	}

	c.JSON(http.StatusOK, client)
}

func (h *ClientHandler) Delete(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	id := c.Param("id")

	if err := h.clientRepo.Delete(id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete client"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Client deleted successfully"})
}

func generateID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}
