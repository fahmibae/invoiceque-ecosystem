package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/invoiceque/invoice-service/config"
	"github.com/invoiceque/invoice-service/handlers"
	"github.com/invoiceque/invoice-service/messaging"
	"github.com/invoiceque/invoice-service/repository"
	"github.com/invoiceque/invoice-service/services"
)

func main() {
	cfg := config.Load()

	// Connect to PostgreSQL
	db, err := sql.Open("postgres", cfg.DBURL)
	if err != nil {
		log.Fatalf("[INVOICE] Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("[INVOICE] Database ping failed: %v", err)
	}
	log.Println("[INVOICE] Connected to PostgreSQL")

	// Run migrations
	runMigrations(db)

	// Connect to RabbitMQ with retry
	var conn *amqp.Connection
	for i := 0; i < 30; i++ {
		conn, err = amqp.Dial(cfg.RabbitMQURL)
		if err == nil {
			break
		}
		log.Printf("[INVOICE] Waiting for RabbitMQ... attempt %d/30", i+1)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("[INVOICE] Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()
	log.Println("[INVOICE] Connected to RabbitMQ")

	// Initialize components
	invoiceRepo := repository.NewInvoiceRepository(db)
	settingsRepo := repository.NewSettingsRepository(db)

	publisher, err := messaging.NewPublisher(conn)
	if err != nil {
		log.Fatalf("[INVOICE] Failed to create publisher: %v", err)
	}

	paymentClient := services.NewPaymentServiceClient(cfg.PaymentServiceURL)
	pdfGenerator := services.NewPdfGeneratorService(settingsRepo)
	invoiceService := services.NewInvoiceService(invoiceRepo, publisher, pdfGenerator, paymentClient)

	// Start payment event consumer
	paymentConsumer := messaging.NewPaymentEventConsumer(invoiceService.MarkAsPaid)
	if err := paymentConsumer.Start(conn); err != nil {
		log.Fatalf("[INVOICE] Failed to start payment consumer: %v", err)
	}

	// Initialize handlers
	invoiceHandler := handlers.NewInvoiceHandler(invoiceService, pdfGenerator, invoiceRepo)
	dashboardHandler := handlers.NewDashboardHandler(invoiceService)
	settingsHandler := handlers.NewSettingsHandler(settingsRepo)

	// Setup Gin router
	r := gin.Default()

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "invoice-service"})
	})

	// Invoice routes (matching Java InvoiceController)
	invoices := r.Group("/invoices")
	{
		invoices.GET("", invoiceHandler.List)
		invoices.GET("/:id", invoiceHandler.Get)
		invoices.GET("/:id/pdf", invoiceHandler.DownloadPdf)
		invoices.POST("", invoiceHandler.Create)
		invoices.PUT("/:id", invoiceHandler.Update)
		invoices.DELETE("/:id", invoiceHandler.Delete)
		invoices.PUT("/:id/send", invoiceHandler.Send)
	}

	// Dashboard routes (matching Java DashboardController)
	dashboard := r.Group("/dashboard")
	{
		dashboard.GET("/stats", dashboardHandler.GetStats)
		dashboard.GET("/revenue-chart", dashboardHandler.GetRevenueChart)
	}

	// Settings routes (matching Java InvoiceSettingsController)
	r.GET("/invoice-settings", settingsHandler.Get)
	r.PUT("/invoice-settings", settingsHandler.Update)

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("[INVOICE] Starting Invoice Service (Go) on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("[INVOICE] Failed to start: %v", err)
	}
}

func runMigrations(db *sql.DB) {
	migration, err := os.ReadFile("migrations/001_create_tables.sql")
	if err != nil {
		log.Printf("[INVOICE] Migration file not found, skipping: %v", err)
		return
	}
	if _, err := db.Exec(string(migration)); err != nil {
		log.Printf("[INVOICE] Migration warning: %v", err)
	} else {
		log.Println("[INVOICE] Migrations applied successfully")
	}
}
