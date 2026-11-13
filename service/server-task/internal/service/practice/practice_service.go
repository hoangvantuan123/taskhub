package practice

import (
	"server-task/internal/security"
	"server-task/internal/worker"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

type PracticeService struct {
	db    *sqlx.DB
	pgx   *pgxpool.Pool
	log   *zap.Logger
	wp    *worker.Pool
	secCl *security.CoreSecurityClient
}

func NewPracticeService(
	db *sqlx.DB,
	pgx *pgxpool.Pool,
	log *zap.Logger,
	wp *worker.Pool,
	secCl *security.CoreSecurityClient,
) *PracticeService {
	return &PracticeService{
		db:    db,
		pgx:   pgx,
		log:   log,
		wp:    wp,
		secCl: secCl,
	}
}
