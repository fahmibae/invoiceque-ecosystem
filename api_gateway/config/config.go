package config

import (
	"log"
	"os"
)

type Config struct {
	AuthServiceURL           string
	ClientServiceURL         string
	InvoiceServiceURL        string
	PaymentServiceURL        string
	NotificationServiceURL   string
	SubscriptionServiceURL   string
	JWTSecret                string
	Port                     string
	AllowedOrigins           string
}

func Load() *Config {
	jwtSecret := getEnv("JWT_SECRET", "")
	if jwtSecret == "" {
		log.Println("[GATEWAY] WARNING: JWT_SECRET not set! Using insecure default for development only.")
		jwtSecret = "invoiceque-dev-secret-DO-NOT-USE-IN-PRODUCTION"
	}

	return &Config{
		AuthServiceURL:           getEnv("AUTH_SERVICE_URL", "http://localhost:8001"),
		ClientServiceURL:         getEnv("CLIENT_SERVICE_URL", "http://localhost:8002"),
		InvoiceServiceURL:        getEnv("INVOICE_SERVICE_URL", "http://localhost:8003"),
		PaymentServiceURL:        getEnv("PAYMENT_SERVICE_URL", "http://localhost:8004"),
		NotificationServiceURL:   getEnv("NOTIFICATION_SERVICE_URL", "http://localhost:8005"),
		SubscriptionServiceURL:   getEnv("SUBSCRIPTION_SERVICE_URL", "http://localhost:8006"),
		JWTSecret:                jwtSecret,
		Port:                     getEnv("PORT", "8080"),
		AllowedOrigins:           getEnv("ALLOWED_ORIGINS", "*"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
