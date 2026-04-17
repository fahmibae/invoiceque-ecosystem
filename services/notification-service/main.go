package main

import (
	"fmt"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/invoiceque/notification-service/config"
	"github.com/invoiceque/notification-service/consumers"
	"github.com/invoiceque/notification-service/handlers"
	"github.com/invoiceque/notification-service/services"
)

func main() {
	cfg := config.Load()

	// Connect to RabbitMQ with retry
	var conn *amqp.Connection
	var err error
	for i := 0; i < 30; i++ {
		conn, err = amqp.Dial(cfg.RabbitMQURL)
		if err == nil {
			break
		}
		log.Printf("[NOTIFICATION] Waiting for RabbitMQ... attempt %d/30", i+1)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("[NOTIFICATION] Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()
	log.Println("[NOTIFICATION] Connected to RabbitMQ")

	// Initialize email service
	emailSvc := services.NewEmailService(
		cfg.SMTPHost, cfg.SMTPPort,
		cfg.SMTPUser, cfg.SMTPPass,
		cfg.FromEmail,
	)

	// Start consumers
	invoiceConsumer := consumers.NewInvoiceConsumer(emailSvc)
	if err := invoiceConsumer.Start(conn); err != nil {
		log.Fatalf("[NOTIFICATION] Failed to start invoice consumer: %v", err)
	}

	paymentConsumer := consumers.NewPaymentConsumer(emailSvc)
	if err := paymentConsumer.Start(conn); err != nil {
		log.Fatalf("[NOTIFICATION] Failed to start payment consumer: %v", err)
	}

	// HTTP server for health check and notification logs
	notifHandler := handlers.NewNotificationHandler()

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "notification-service"})
	})

	r.GET("/notifications", notifHandler.List)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("[NOTIFICATION] Starting Notification Service on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("[NOTIFICATION] Failed to start: %v", err)
	}
}
