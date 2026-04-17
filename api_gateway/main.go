package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/api-gateway/config"
	"github.com/invoiceque/api-gateway/middleware"
	"github.com/invoiceque/api-gateway/routes"
)

func main() {
	cfg := config.Load()

	r := gin.New()

	// Global middleware
	r.Use(middleware.Logger())
	r.Use(gin.Recovery())

	// Security: strip internal headers BEFORE anything else
	r.Use(middleware.StripInternalHeaders())

	// Security headers (X-Content-Type-Options, X-Frame-Options, CSP, etc.)
	r.Use(middleware.SecurityHeaders())

	// CORS — use ALLOWED_ORIGINS env var for production
	corsConfig := middleware.DefaultCORSConfig()
	if origins := os.Getenv("ALLOWED_ORIGINS"); origins != "" {
		corsConfig.AllowedOrigins = strings.Split(origins, ",")
	}
	r.Use(middleware.CORS(corsConfig))

	// Rate limiter
	r.Use(middleware.RateLimiter(120)) // 120 requests/minute per IP

	// Setup routes
	routes.SetupRoutes(r, cfg)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("[GATEWAY] Starting API Gateway on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("[GATEWAY] Failed to start: %v", err)
	}
}
