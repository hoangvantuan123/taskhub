package database

import (
	"context"
	"fmt"
	"net/url"
	"server-task/internal/config"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"go.uber.org/zap"
)

var (
	SqlxDB  *sqlx.DB
	PgxPool *pgxpool.Pool
)

func Connect(log *zap.Logger) error {
	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(config.Cfg.PostgresUser, config.Cfg.PostgresPass),
		Host:   fmt.Sprintf("%s:%d", config.Cfg.PostgresHost, config.Cfg.PostgresPort),
		Path:   config.Cfg.PostgresDB,
	}
	q := u.Query()
	q.Set("sslmode", "disable")
	u.RawQuery = q.Encode()

	db, err := sqlx.Connect("postgres", u.String())
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	db.SetMaxOpenConns(config.Cfg.PostgresMaxConns)
	db.SetMaxIdleConns(config.Cfg.PostgresMinConns)
	db.SetConnMaxLifetime(1 * time.Hour)
	db.SetConnMaxIdleTime(15 * time.Minute)

	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	SqlxDB = db
	log.Info("Connected to PostgreSQL via SQLX successfully", zap.String("db", config.Cfg.PostgresDB))

	return nil
}

func ConnectPgx(log *zap.Logger) error {
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=disable",
		config.Cfg.PostgresUser, url.QueryEscape(config.Cfg.PostgresPass),
		config.Cfg.PostgresHost, config.Cfg.PostgresPort,
		config.Cfg.PostgresDB)

	poolConfig, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return fmt.Errorf("unable to parse pgx config: %w", err)
	}

	poolConfig.MaxConns = int32(config.Cfg.PostgresMaxConns)
	poolConfig.MinConns = int32(config.Cfg.PostgresMinConns)
	poolConfig.MaxConnLifetime = time.Hour
	poolConfig.MaxConnIdleTime = 15 * time.Minute

	pool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		return fmt.Errorf("unable to create pgx connection pool: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		return fmt.Errorf("failed to ping pgxpool: %w", err)
	}

	PgxPool = pool
	log.Info("Connected to PostgreSQL via PGXPOOL successfully")
	return nil
}
