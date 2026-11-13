package questions

import (
	"server-task/internal/security"
	"server-task/internal/worker"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

type QuestionService struct {
	db    *sqlx.DB
	pgx   *pgxpool.Pool
	log   *zap.Logger
	wp    *worker.Pool
	secCl *security.CoreSecurityClient
}

func NewQuestionService(
	db *sqlx.DB,
	pgx *pgxpool.Pool,
	log *zap.Logger,
	wp *worker.Pool,
	secCl *security.CoreSecurityClient,
) *QuestionService {
	return &QuestionService{
		db:    db,
		pgx:   pgx,
		log:   log,
		wp:    wp,
		secCl: secCl,
	}
}
