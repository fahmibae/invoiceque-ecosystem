package config

import "os"

type Config struct {
	DBURL string
	Port  string
}

func Load() *Config {
	return &Config{
		DBURL: getEnv("DB_URL", "host=localhost port=5432 user=postgres password=postgres123 dbname=client_db sslmode=disable"),
		Port:  getEnv("PORT", "8002"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
