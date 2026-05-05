package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/notification-service/config"
	"github.com/invoiceque/notification-service/consumers"
	"github.com/invoiceque/notification-service/handlers"
	"github.com/invoiceque/notification-service/repository"
	"github.com/invoiceque/notification-service/services"
)

func main() {
	cfg := config.Load()

	var repo *repository.NotificationRepo
	if cfg.DatabaseURL != "" {
		var err error
		repo, err = repository.NewNotificationRepo(cfg.DatabaseURL)
		if err != nil {
			log.Printf("[NOTIFICATION] Warning: Failed to connect to database: %v", err)
		} else {
			defer repo.Close()
		}
	} else {
		log.Println("[NOTIFICATION] Warning: DATABASE_URL not set, notifications will not be persisted")
	}

	emailSvc := services.NewEmailService(
		cfg.SMTPHost, cfg.SMTPPort,
		cfg.SMTPUser, cfg.SMTPPass,
		cfg.FromEmail, cfg.ResendAPIKey,
	)

	userLookup := services.NewUserLookupService(cfg.AuthServiceURL)

	// Initialize event processors
	invoiceProcessor := consumers.NewInvoiceConsumer(emailSvc, repo)
	paymentProcessor := consumers.NewPaymentConsumer(emailSvc, repo, userLookup)
	paymentLinkProcessor := consumers.NewPaymentLinkConsumer(emailSvc, repo)
	subscriptionProcessor := consumers.NewSubscriptionConsumer(emailSvc, repo, userLookup)

	// Initialize handlers
	notifHandler := handlers.NewNotificationHandler(repo)
	eventHandler := handlers.NewEventHandler(invoiceProcessor, paymentProcessor, paymentLinkProcessor, subscriptionProcessor)

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "notification-service"})
	})

	r.GET("/notifications", notifHandler.List)
	r.PUT("/notifications/:id/read", notifHandler.MarkAsRead)

	// Event receiving endpoints
	events := r.Group("/events")
	{
		events.POST("/invoice", eventHandler.HandleInvoiceEvent)
		events.POST("/payment", eventHandler.HandlePaymentEvent)
		events.POST("/paymentlink", eventHandler.HandlePaymentLinkEvent)
		events.POST("/subscription", eventHandler.HandleSubscriptionEvent)
	}

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("[NOTIFICATION] Starting Notification Service on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("[NOTIFICATION] Failed to start: %v", err)
	}
}
