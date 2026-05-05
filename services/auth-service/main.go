package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

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

	// Connection pool tuning
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

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
		auth.POST("/google", authHandler.GoogleLogin)
		auth.POST("/refresh", authHandler.RefreshToken)
	}

	// Protected routes
	protected := r.Group("/auth")
	protected.Use(middleware.JWTAuth(cfg.JWTSecret))
	{
		protected.GET("/profile", authHandler.Profile)
		protected.PUT("/profile", authHandler.UpdateProfile)
		protected.PUT("/password", authHandler.ChangePassword)

		// Admin routes
		protected.GET("/users", authHandler.ListUsers)
		protected.PUT("/users/:id/role", authHandler.UpdateRole)
		protected.DELETE("/users/:id", authHandler.DeleteUser)
	}

	// Internal routes (service-to-service, no JWT required)
	internal := r.Group("/internal")
	{
		internal.GET("/users/:id", authHandler.GetUserByID)
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
