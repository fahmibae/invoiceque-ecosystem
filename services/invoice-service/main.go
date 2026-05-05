package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"

	"github.com/invoiceque/invoice-service/config"
	"github.com/invoiceque/invoice-service/handlers"
	"github.com/invoiceque/invoice-service/messaging"
	"github.com/invoiceque/invoice-service/repository"
	"github.com/invoiceque/invoice-service/services"
)

func main() {
	cfg := config.Load()

	// Connect to PostgreSQL
	// Add binary_parameters=yes to avoid PgBouncer prepared statement conflicts with Neon
	dbURL := cfg.DBURL
	if !strings.Contains(dbURL, "binary_parameters") {
		if strings.Contains(dbURL, "?") {
			dbURL += "&binary_parameters=yes"
		} else {
			dbURL += "?binary_parameters=yes"
		}
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("[INVOICE] Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Connection pool tuning (binary_parameters=yes handles PgBouncer compatibility)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatalf("[INVOICE] Database ping failed: %v", err)
	}
	log.Println("[INVOICE] Connected to PostgreSQL")

	// Run migrations
	runMigrations(db)

	// Initialize components
	invoiceRepo := repository.NewInvoiceRepository(db)
	settingsRepo := repository.NewSettingsRepository(db)

	publisher := messaging.NewPublisher(cfg.NotificationServiceURL)

	paymentClient := services.NewPaymentServiceClient(cfg.PaymentServiceURL)
	pdfGenerator := services.NewPdfGeneratorService(settingsRepo)
	invoiceService := services.NewInvoiceService(invoiceRepo, publisher, pdfGenerator, paymentClient)

	// Initialize handlers
	invoiceHandler := handlers.NewInvoiceHandler(invoiceService, pdfGenerator, invoiceRepo)
	dashboardHandler := handlers.NewDashboardHandler(invoiceService)
	settingsHandler := handlers.NewSettingsHandler(settingsRepo)
	eventHandler := handlers.NewEventHandler(invoiceService)

	// Setup Gin router
	r := gin.Default()

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "invoice-service"})
	})

	// Event receiving endpoint (from payment-service)
	r.POST("/events/payment", eventHandler.HandlePaymentEvent)

	// Invoice routes (matching Java InvoiceController)
	invoices := r.Group("/invoices")
	{
		invoices.GET("", invoiceHandler.List)
		invoices.POST("", invoiceHandler.Create)
		invoices.POST("/bulk-delete", invoiceHandler.BulkDelete)
		invoices.GET("/linkable", invoiceHandler.ListLinkable)
		invoices.GET("/:id", invoiceHandler.Get)
		invoices.GET("/:id/pdf", invoiceHandler.DownloadPdf)
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
