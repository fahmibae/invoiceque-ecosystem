package config

import "os"

type Config struct {
	RabbitMQURL string
	Port        string
	SMTPHost    string
	SMTPPort    string
	SMTPUser    string
	SMTPPass    string
	FromEmail   string
}

func Load() *Config {
	return &Config{
		RabbitMQURL: getEnv("RABBITMQ_URL", "amqp://invoiceque:invoiceque123@localhost:5672"),
		Port:        getEnv("PORT", "8005"),
		SMTPHost:    getEnv("SMTP_HOST", ""),
		SMTPPort:    getEnv("SMTP_PORT", "587"),
		SMTPUser:    getEnv("SMTP_USER", ""),
		SMTPPass:    getEnv("SMTP_PASS", ""),
		FromEmail:   getEnv("FROM_EMAIL", "noreply@invoiceque.id"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
