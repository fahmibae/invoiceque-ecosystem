package routes

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/api-gateway/config"
	"github.com/invoiceque/api-gateway/middleware"
)

func SetupRoutes(r *gin.Engine, cfg *config.Config) {
	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "api-gateway",
		})
	})

	v1 := r.Group("/api/v1")

	// ── Auth routes (public) ──────────────────────────────────
	auth := v1.Group("/auth")
	{
		auth.Any("/*path", proxyHandler(cfg.AuthServiceURL, "/api/v1"))
	}

	// ── Public routes (no auth required) ──────────────────────
	// Must be registered BEFORE wildcard protected routes to avoid conflict
	v1.GET("/pay/:id", proxyHandler(cfg.PaymentServiceURL, "/api/v1"))
	v1.POST("/webhooks/payments", fixedPathProxy(cfg.PaymentServiceURL, "/payments/webhook"))
	v1.GET("/plans", fixedPathProxy(cfg.SubscriptionServiceURL, "/subscriptions/plans"))

	// ── Protected routes ──────────────────────────────────────
	protected := v1.Group("")
	protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		// Client routes
		protected.Any("/clients", proxyHandler(cfg.ClientServiceURL, "/api/v1"))
		protected.Any("/clients/*path", proxyHandler(cfg.ClientServiceURL, "/api/v1"))

		// Invoice routes
		protected.Any("/invoices", proxyHandler(cfg.InvoiceServiceURL, "/api/v1"))
		protected.Any("/invoices/*path", proxyHandler(cfg.InvoiceServiceURL, "/api/v1"))

		// Dashboard routes
		protected.Any("/dashboard/*path", proxyHandler(cfg.InvoiceServiceURL, "/api/v1"))

		// Invoice Settings routes
		protected.Any("/invoice-settings", proxyHandler(cfg.InvoiceServiceURL, "/api/v1"))

		// Payment routes
		protected.Any("/payments", proxyHandler(cfg.PaymentServiceURL, "/api/v1"))
		protected.Any("/payments/*path", proxyHandler(cfg.PaymentServiceURL, "/api/v1"))

		// Notification routes
		protected.Any("/notifications", proxyHandler(cfg.NotificationServiceURL, "/api/v1"))
		protected.Any("/notifications/*path", proxyHandler(cfg.NotificationServiceURL, "/api/v1"))

		// Subscription routes
		protected.Any("/subscriptions", proxyHandler(cfg.SubscriptionServiceURL, "/api/v1"))
		protected.Any("/subscriptions/*path", proxyHandler(cfg.SubscriptionServiceURL, "/api/v1"))
	}
}

func proxyHandler(targetBaseURL string, stripPrefix string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Build target URL
		path := c.Request.URL.Path
		path = strings.TrimPrefix(path, stripPrefix)
		if path == "" {
			path = "/"
		}

		targetURL := targetBaseURL + path
		if c.Request.URL.RawQuery != "" {
			targetURL += "?" + c.Request.URL.RawQuery
		}

		doProxy(c, targetURL)
	}
}

func fixedPathProxy(targetBaseURL string, fixedPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		targetURL := targetBaseURL + fixedPath
		if c.Request.URL.RawQuery != "" {
			targetURL += "?" + c.Request.URL.RawQuery
		}

		doProxy(c, targetURL)
	}
}

func doProxy(c *gin.Context, targetURL string) {
	log.Printf("[PROXY] %s %s -> %s", c.Request.Method, c.Request.URL.Path, targetURL)
	// Create proxy request
	proxyReq, err := http.NewRequest(c.Request.Method, targetURL, c.Request.Body)
	if err != nil {
		log.Printf("[PROXY] Failed to create request: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to create proxy request"})
		return
	}

	// Copy headers
	for key, values := range c.Request.Header {
		for _, value := range values {
			proxyReq.Header.Add(key, value)
		}
	}

	// Forward user info from JWT
	if userID, exists := c.Get("user_id"); exists {
		proxyReq.Header.Set("X-User-ID", formatValue(userID))
	}
	if email, exists := c.Get("email"); exists {
		proxyReq.Header.Set("X-User-Email", formatValue(email))
	}

	// Execute request
	client := &http.Client{}
	resp, err := client.Do(proxyReq)
	if err != nil {
		log.Printf("[PROXY] Service unavailable for %s: %v", targetURL, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Service unavailable"})
		return
	}
	defer resp.Body.Close()

	// Copy response headers
	for key, values := range resp.Header {
		for _, value := range values {
			c.Header(key, value)
		}
	}

	// Copy response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to read response"})
		return
	}

	c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), body)
}

func formatValue(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}
