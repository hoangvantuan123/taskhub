package reports

import (
	"server-task/internal/security"
	"server-task/internal/worker"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

type ReportService struct {
	db    *sqlx.DB
	pgx   *pgxpool.Pool
	log   *zap.Logger
	wp    *worker.Pool
	secCl *security.CoreSecurityClient
}

func NewReportService(
	db *sqlx.DB,
	pgx *pgxpool.Pool,
	log *zap.Logger,
	wp *worker.Pool,
	secCl *security.CoreSecurityClient,
) *ReportService {
	return &ReportService{
		db:    db,
		pgx:   pgx,
		log:   log,
		wp:    wp,
		secCl: secCl,
	}
}
