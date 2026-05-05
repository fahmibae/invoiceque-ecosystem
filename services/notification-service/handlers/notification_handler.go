package handlers

import (
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/notification-service/repository"
)

type NotificationHandler struct {
	repo *repository.NotificationRepo
}

func NewNotificationHandler(repo *repository.NotificationRepo) *NotificationHandler {
	return &NotificationHandler{repo: repo}
}

func (h *NotificationHandler) List(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		userID = c.Query("user_id")
	}

	// Parse pagination params with defaults
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 15
	}
	if perPage > 100 {
		perPage = 100
	}

	offset := (page - 1) * perPage

	var notifications []repository.Notification
	var total int
	var err error

	if userID != "" {
		total, err = h.repo.CountByUserID(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count notifications"})
			return
		}
		notifications, err = h.repo.ListByUserIDPaginated(userID, perPage, offset)
	} else {
		total, err = h.repo.CountAll()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count notifications"})
			return
		}
		notifications, err = h.repo.ListAllPaginated(perPage, offset)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	if notifications == nil {
		notifications = []repository.Notification{}
	}

	totalPages := int(math.Ceil(float64(total) / float64(perPage)))

	// Compute unread_count for this user
	var unreadCount int
	if userID != "" {
		unreadCount, _ = h.repo.UnreadCountByUserID(userID)
	}

	c.JSON(http.StatusOK, gin.H{
		"data":         notifications,
		"total":        total,
		"page":         page,
		"per_page":     perPage,
		"total_pages":  totalPages,
		"unread_count": unreadCount,
	})
}

func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID is required"})
		return
	}

	err := h.repo.MarkAsRead(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notification as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}
