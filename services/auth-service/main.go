package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/auth-service/config"
	"github.com/invoiceque/auth-service/handlers"
	"github.com/invoiceque/auth-service/middleware"
	"github.com/invoiceque/auth-service/repository"
	_ "github.com/lib/pq"
)

func main() {
	cfg := config.Load()

	// Connect to database
	db, err := sql.Open("postgres", cfg.DBURL)
	if err != nil {
		log.Fatalf("[AUTH] Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("[AUTH] Database ping failed: %v", err)
	}

	// Run migrations
	runMigrations(db)

	// Initialize repository and handler
	userRepo := repository.NewUserRepository(db)
	authHandler := handlers.NewAuthHandler(userRepo, cfg.JWTSecret)

	// Setup Gin
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "auth-service"})
	})

	// Auth routes (public)
	auth := r.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
	}

	// Protected routes
	protected := r.Group("/auth")
	protected.Use(middleware.JWTAuth(cfg.JWTSecret))
	{
		protected.GET("/profile", authHandler.Profile)
	}

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("[AUTH] Starting Auth Service on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("[AUTH] Failed to start: %v", err)
	}
}

func runMigrations(db *sql.DB) {
	migration, err := os.ReadFile("migrations/001_create_users.sql")
	if err != nil {
		log.Printf("[AUTH] Migration file not found, skipping: %v", err)
		return
	}

	if _, err := db.Exec(string(migration)); err != nil {
		log.Printf("[AUTH] Migration warning: %v", err)
	} else {
		log.Println("[AUTH] Migrations applied successfully")
	}
}
