package grading

import (
	"server-task/internal/security"
	"server-task/internal/worker"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

type GradingService struct {
	db    *sqlx.DB
	pgx   *pgxpool.Pool
	log   *zap.Logger
	wp    *worker.Pool
	secCl *security.CoreSecurityClient
}

func NewGradingService(
	db *sqlx.DB,
	pgx *pgxpool.Pool,
	log *zap.Logger,
	wp *worker.Pool,
	secCl *security.CoreSecurityClient,
) *GradingService {
	return &GradingService{
		db:    db,
		pgx:   pgx,
		log:   log,
		wp:    wp,
		secCl: secCl,
	}
}
