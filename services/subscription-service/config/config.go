package config

import "os"

type Config struct {
	DBURL                  string
	Port                   string
	NotificationServiceURL string
	XenditAPIKey           string
	XenditCallbackToken    string
	XenditBaseURL          string
	FrontendURL            string
}

func Load() *Config {
	return &Config{
		DBURL:                  getEnv("DB_URL", "host=localhost port=5432 user=postgres password=postgres123 dbname=subscription_db sslmode=disable"),
		Port:                   getEnv("PORT", "8006"),
		NotificationServiceURL: getEnv("NOTIFICATION_SERVICE_URL", "http://localhost:8005"),
		XenditAPIKey:           getEnv("XENDIT_API_KEY", "xnd_development_placeholder"),
		XenditCallbackToken:    getEnv("XENDIT_CALLBACK_TOKEN", "xendit-callback-token-placeholder"),
		XenditBaseURL:          getEnv("XENDIT_BASE_URL", "https://api.xendit.co"),
		FrontendURL:            getEnv("FRONTEND_URL", "https://invoicequ.my.id"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
