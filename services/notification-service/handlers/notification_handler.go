package handlers

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type NotificationLog struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Recipient string    `json:"recipient"`
	Subject   string    `json:"subject"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type NotificationHandler struct {
	mu   sync.RWMutex
	logs []NotificationLog
}

func NewNotificationHandler() *NotificationHandler {
	return &NotificationHandler{
		logs: make([]NotificationLog, 0),
	}
}

func (h *NotificationHandler) List(c *gin.Context) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"data":  h.logs,
		"total": len(h.logs),
	})
}

func (h *NotificationHandler) AddLog(logEntry NotificationLog) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.logs = append(h.logs, logEntry)
}
