package config

import "os"

type Config struct {
	DatabaseURL    string
	Port           string
	SMTPHost       string
	SMTPPort       string
	SMTPUser       string
	SMTPPass       string
	FromEmail      string
	AuthServiceURL string
	ResendAPIKey   string
}

func Load() *Config {
	return &Config{
		DatabaseURL:    getEnv("DATABASE_URL", ""),
		Port:           getEnv("PORT", "8005"),
		SMTPHost:       getEnv("SMTP_HOST", ""),
		SMTPPort:       getEnv("SMTP_PORT", "587"),
		SMTPUser:       getEnv("SMTP_USER", ""),
		SMTPPass:       getEnv("SMTP_PASS", ""),
		FromEmail:      getEnv("FROM_EMAIL", "noreply@invoiceque.id"),
		AuthServiceURL: getEnv("AUTH_SERVICE_URL", "http://localhost:8001"),
		ResendAPIKey:   getEnv("RESEND_API_KEY", ""),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
