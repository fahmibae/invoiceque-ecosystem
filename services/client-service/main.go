package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/invoiceque/client-service/config"
	"github.com/invoiceque/client-service/handlers"
	"github.com/invoiceque/client-service/repository"
	_ "github.com/lib/pq"
)

func main() {
	cfg := config.Load()

	db, err := sql.Open("postgres", cfg.DBURL)
	if err != nil {
		log.Fatalf("[CLIENT] Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("[CLIENT] Database ping failed: %v", err)
	}

	runMigrations(db)

	clientRepo := repository.NewClientRepository(db)
	clientHandler := handlers.NewClientHandler(clientRepo)

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "client-service"})
	})

	clients := r.Group("/clients")
	{
		clients.GET("", clientHandler.List)
		clients.GET("/:id", clientHandler.Get)
		clients.POST("", clientHandler.Create)
		clients.PUT("/:id", clientHandler.Update)
		clients.DELETE("/:id", clientHandler.Delete)
	}

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("[CLIENT] Starting Client Service on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("[CLIENT] Failed to start: %v", err)
	}
}

func runMigrations(db *sql.DB) {
	migration, err := os.ReadFile("migrations/001_create_clients.sql")
	if err != nil {
		log.Printf("[CLIENT] Migration file not found, skipping: %v", err)
		return
	}
	if _, err := db.Exec(string(migration)); err != nil {
		log.Printf("[CLIENT] Migration warning: %v", err)
	} else {
		log.Println("[CLIENT] Migrations applied successfully")
	}
}
