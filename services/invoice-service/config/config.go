package config

import "os"

type Config struct {
	DBURL                  string
	Port                   string
	NotificationServiceURL string
	PaymentServiceURL      string
}

func Load() *Config {
	// Build DB URL from individual env vars or use a combined one
	dbURL := getEnv("DB_URL", "")
	if dbURL == "" {
		dbURL = "host=" + getEnv("DB_HOST", "localhost") +
			" port=" + getEnv("DB_PORT", "5432") +
			" user=" + getEnv("SPRING_DATASOURCE_USERNAME", "postgres") +
			" password=" + getEnv("SPRING_DATASOURCE_PASSWORD", "postgres123") +
			" dbname=" + getEnv("DB_NAME", "invoice_db") +
			" sslmode=" + getEnv("DB_SSLMODE", "disable")
	}

	return &Config{
		DBURL:                  dbURL,
		Port:                   getEnv("PORT", getEnv("SERVER_PORT", "8003")),
		NotificationServiceURL: getEnv("NOTIFICATION_SERVICE_URL", "http://localhost:8005"),
		PaymentServiceURL:      getEnv("PAYMENT_SERVICE_URL", "http://localhost:8004"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
