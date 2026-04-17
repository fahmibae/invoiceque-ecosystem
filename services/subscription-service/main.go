package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/subscription-service/config"
	"github.com/invoiceque/subscription-service/handlers"
	"github.com/invoiceque/subscription-service/repository"
	_ "github.com/lib/pq"
)

func main() {
	cfg := config.Load()

	// Connect to database
	db, err := sql.Open("postgres", cfg.DBURL)
	if err != nil {
		log.Fatalf("[SUBSCRIPTION] Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("[SUBSCRIPTION] Database ping failed: %v", err)
	}

	// Run migrations
	runMigrations(db)

	// Initialize
	subRepo := repository.NewSubscriptionRepository(db)
	subHandler := handlers.NewSubscriptionHandler(subRepo)

	// Setup Gin
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "subscription-service"})
	})

	// Public routes
	r.GET("/subscriptions/plans", subHandler.ListPlans)

	// Routes that use X-User-ID header (set by gateway)
	subs := r.Group("/subscriptions")
	{
		subs.GET("/current", subHandler.GetCurrent)
		subs.GET("/usage", subHandler.GetUsage)
		subs.GET("/check", subHandler.CheckLimit)
		subs.POST("/subscribe", subHandler.Subscribe)
		subs.POST("/usage/increment", subHandler.IncrementUsage)
	}

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("[SUBSCRIPTION] Starting Subscription Service on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("[SUBSCRIPTION] Failed to start: %v", err)
	}
}

func runMigrations(db *sql.DB) {
	migration, err := os.ReadFile("migrations/001_create_subscriptions.sql")
	if err != nil {
		log.Printf("[SUBSCRIPTION] Migration file not found, skipping: %v", err)
		return
	}

	if _, err := db.Exec(string(migration)); err != nil {
		log.Printf("[SUBSCRIPTION] Migration warning: %v", err)
	} else {
		log.Println("[SUBSCRIPTION] Migrations applied successfully")
	}
}
