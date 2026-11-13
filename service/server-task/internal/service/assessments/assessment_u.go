package assessments

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/domain"
	"server-task/internal/security"
	"time"

	"github.com/lib/pq"
	"go.uber.org/zap"
)

// UpdateAssessment (U - Cập nhật bộ đề)
func (s *AssessmentService) UpdateAssessment(ctx context.Context, u *security.UserContext, a *domain.Assessment) (*domain.Assessment, error) {
	if a.IdSeq == "" {
		return nil, errors.New("IdSeq bộ đề không được để trống")
	}

	query := `
		UPDATE "_ASMAssessment" SET
			"Title" = $1,
			"SubjectId" = $2,
			"SubjectName" = $3,
			"DurationMinutes" = $4,
			"TotalPoints" = $5,
			"PassingScore" = $6,
			"QuestionIds" = $7,
			"Registration" = $8,
			"HasCriticalRule" = $9,
			"UpdatedBy" = $10,
			"UpdatedAt" = now(),
			"RowVersion" = "RowVersion" + 1
		WHERE "IdSeq" = $11 AND "RowVersion" = $12
		RETURNING "UpdatedAt", "RowVersion"`

	err := s.db.QueryRowxContext(ctx, query,
		a.Title, a.SubjectId, a.SubjectName, a.DurationMinutes, a.TotalPoints, a.PassingScore,
		pq.Array(a.QuestionIds), a.Registration, a.HasCriticalRule,
		u.UserId, a.IdSeq, a.RowVersion,
	).Scan(&a.UpdatedAt, &a.RowVersion)

	if err != nil {
		s.log.Error("Failed to update assessment", zap.Error(err))
		return nil, fmt.Errorf("cập nhật bộ đề thất bại: %w", err)
	}

	return a, nil
}

// PublishAssessment (U - Xuất bản bộ đề thi)
func (s *AssessmentService) PublishAssessment(ctx context.Context, u *security.UserContext, assessmentId string, rowVersion int64) error {
	now := time.Now()
	query := `
		UPDATE "_ASMAssessment" SET
			"Status" = 'published',
			"PublishedAt" = $1,
			"UpdatedBy" = $2,
			"UpdatedAt" = now(),
			"RowVersion" = "RowVersion" + 1
		WHERE "IdSeq" = $3 AND "RowVersion" = $4`

	res, err := s.db.ExecContext(ctx, query, now, u.UserId, assessmentId, rowVersion)
	if err != nil {
		s.log.Error("Failed to publish assessment", zap.Error(err))
		return fmt.Errorf("xuất bản bộ đề thất bại: %w", err)
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		return errors.New("không tìm thấy bộ đề hoặc phiên bản bị xung đột")
	}

	return nil
}

// UpdateBlueprint (U - Cập nhật cấu hình blueprint)
func (s *AssessmentService) UpdateBlueprint(ctx context.Context, u *security.UserContext, b *domain.Blueprint) (*domain.Blueprint, error) {
	if b.IdSeq == "" {
		return nil, errors.New("IdSeq blueprint không được để trống")
	}

	query := `
		UPDATE "_ASMBlueprint" SET
			"Config" = $1,
			"Scope" = $2,
			"UpdatedBy" = $3,
			"UpdatedAt" = now(),
			"RowVersion" = "RowVersion" + 1
		WHERE "IdSeq" = $4 AND "RowVersion" = $5
		RETURNING "UpdatedAt", "RowVersion"`

	err := s.db.QueryRowxContext(ctx, query,
		b.Config, b.Scope, u.UserId, b.IdSeq, b.RowVersion,
	).Scan(&b.UpdatedAt, &b.RowVersion)

	if err != nil {
		s.log.Error("Failed to update blueprint", zap.Error(err))
		return nil, fmt.Errorf("cập nhật blueprint thất bại: %w", err)
	}

	return b, nil
}
