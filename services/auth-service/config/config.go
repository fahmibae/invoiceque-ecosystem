package config

import (
	"log"
	"os"
)

type Config struct {
	DBURL     string
	JWTSecret string
	Port      string
}

func Load() *Config {
	jwtSecret := getEnv("JWT_SECRET", "")
	if jwtSecret == "" {
		log.Println("[AUTH] WARNING: JWT_SECRET not set! Using insecure default for development only.")
		jwtSecret = "invoiceque-dev-secret-DO-NOT-USE-IN-PRODUCTION"
	}

	return &Config{
		DBURL:     getEnv("DB_URL", "host=localhost port=5432 user=postgres password=postgres123 dbname=auth_db sslmode=disable"),
		JWTSecret: jwtSecret,
		Port:      getEnv("PORT", "8001"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
