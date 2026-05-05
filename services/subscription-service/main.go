package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/subscription-service/config"
	"github.com/invoiceque/subscription-service/handlers"
	"github.com/invoiceque/subscription-service/messaging"
	"github.com/invoiceque/subscription-service/repository"
	"github.com/invoiceque/subscription-service/scheduler"
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

	// Connection pool tuning
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatalf("[SUBSCRIPTION] Database ping failed: %v", err)
	}

	// Run migrations
	runMigrations(db)

	// Initialize REST publisher for notification events
	publisher := messaging.NewPublisher(cfg.NotificationServiceURL)

	// Initialize
	subRepo := repository.NewSubscriptionRepository(db)
	subHandler := handlers.NewSubscriptionHandler(subRepo)
	checkoutHandler := handlers.NewCheckoutHandler(subRepo, cfg, publisher)

	// Start background scheduler for expiry reminders (2h before expire)
	scheduler.StartExpiryReminder(subRepo, publisher)

	// Setup Gin
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "subscription-service"})
	})

	// Public routes
	r.GET("/subscriptions/plans", subHandler.ListPlans)

	// Public webhook route (called by Xendit, no auth)
	r.POST("/subscriptions/webhook", checkoutHandler.HandleWebhook)

	// Public status check (used by frontend polling)
	r.GET("/subscriptions/checkout/status/:external_id", checkoutHandler.CheckStatus)

	// Routes that use X-User-ID header (set by gateway)
	subs := r.Group("/subscriptions")
	{
		subs.GET("/current", subHandler.GetCurrent)
		subs.GET("/usage", subHandler.GetUsage)
		subs.GET("/check", subHandler.CheckLimit)
		subs.POST("/subscribe", subHandler.Subscribe)
		subs.POST("/usage/increment", subHandler.IncrementUsage)
		subs.POST("/checkout", checkoutHandler.CreateCheckout)
		subs.POST("/checkout/resend/:external_id", checkoutHandler.ResendCheckout)

		// Admin endpoints
		subs.GET("/all", subHandler.ListAll)
		subs.GET("/transactions", subHandler.ListTransactions)
		subs.PUT("/plans/:id", subHandler.UpdatePlan)
	}

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("[SUBSCRIPTION] Starting Subscription Service on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("[SUBSCRIPTION] Failed to start: %v", err)
	}
}

func runMigrations(db *sql.DB) {
	files := []string{
		"migrations/001_create_subscriptions.sql",
		"migrations/002_create_subscription_transactions.sql",
		"migrations/003_add_reminder_sent.sql",
	}

	for _, file := range files {
		migration, err := os.ReadFile(file)
		if err != nil {
			log.Printf("[SUBSCRIPTION] Migration file %s not found, skipping: %v", file, err)
			continue
		}

		if _, err := db.Exec(string(migration)); err != nil {
			log.Printf("[SUBSCRIPTION] Migration warning for %s: %v", file, err)
		} else {
			log.Printf("[SUBSCRIPTION] Migration %s applied successfully", file)
		}
	}
}
