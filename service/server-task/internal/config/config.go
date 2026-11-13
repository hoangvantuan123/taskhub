package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Env              string
	ServiceName      string
	PortGrpc         int
	PortHttp         int
	PostgresHost     string
	PostgresPort     int
	PostgresUser     string
	PostgresPass     string
	PostgresDB       string
	CoreServerGRPC   string
	JwtSecret        string
	PostgresMaxConns int
	PostgresMinConns int
}

var Cfg Config

func Load() {
	if err := godotenv.Load(); err != nil {
		log.Println("[server-task] No .env file found, using system environment variables")
	}

	env := getEnv("NODE_ENV", "dev")
	jwtSecret := strings.Trim(strings.TrimSpace(getEnv("JWT_SECRET", "")), "'\"")
	if jwtSecret == "" {
		jwtSecret = getEnv("SKILLHUB_JWT_SECRET", "P@5sW0rD!$R3c3nT@2024")
	}

	Cfg = Config{
		Env:              env,
		ServiceName:      getEnv("SERVICE_NAME", "server-task"),
		PortGrpc:         getEnvAsInt("PORT_GRPC", 60053),
		PortHttp:         getEnvAsInt("PORT_HTTP", 8083),
		PostgresHost:     getEnv("POSTGRES_HOST", "localhost"),
		PostgresPort:     getEnvAsInt("POSTGRES_PORT", 5432),
		PostgresUser:     getEnv("POSTGRES_USER", "postgres"),
		PostgresPass:     getEnv("POSTGRES_PASSWORD", "AdminErp#"),
		PostgresDB:       getEnv("POSTGRES_DB", "taskgs"),
		CoreServerGRPC:   getEnv("CORE_SERVER_GRPC", "127.0.0.1:60051"),
		JwtSecret:        jwtSecret,
		PostgresMaxConns: getEnvAsInt("POSTGRES_MAX_CONNS", 50),
		PostgresMinConns: getEnvAsInt("POSTGRES_MIN_CONNS", 10),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getEnvAsInt(key string, fallback int) int {
	strValue := getEnv(key, "")
	if value, err := strconv.Atoi(strValue); err == nil {
		return value
	}
	return fallback
}
