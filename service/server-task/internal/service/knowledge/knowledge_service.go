package knowledge

import (
	"server-task/internal/security"
	"server-task/internal/worker"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

type KnowledgeService struct {
	db    *sqlx.DB
	pgx   *pgxpool.Pool
	log   *zap.Logger
	wp    *worker.Pool
	secCl *security.CoreSecurityClient
}

func NewKnowledgeService(
	db *sqlx.DB,
	pgx *pgxpool.Pool,
	log *zap.Logger,
	wp *worker.Pool,
	secCl *security.CoreSecurityClient,
) *KnowledgeService {
	return &KnowledgeService{
		db:    db,
		pgx:   pgx,
		log:   log,
		wp:    wp,
		secCl: secCl,
	}
}
