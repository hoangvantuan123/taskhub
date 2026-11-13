package assessments

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/domain"
	"server-task/internal/security"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"go.uber.org/zap"
)

// CreateAssessment (A - Tạo bộ đề thi mới)
func (s *AssessmentService) CreateAssessment(ctx context.Context, u *security.UserContext, a *domain.Assessment) (*domain.Assessment, error) {
	if a.Code == "" || a.Title == "" {
		return nil, errors.New("mã và tên bộ đề không được để trống")
	}
	if a.DurationMinutes <= 0 {
		a.DurationMinutes = 45
	}
	if a.TotalPoints <= 0 {
		a.TotalPoints = 10
	}
	if a.PassingScore < 0 || a.PassingScore > a.TotalPoints {
		a.PassingScore = a.TotalPoints * 0.5
	}
	if a.Status == "" {
		a.Status = "draft"
	}
	if a.Registration == "" {
		a.Registration = "{}"
	}

	a.IdSeq = uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO "_ASMAssessment" (
			"IdSeq", "Code", "Title", "SubjectId", "SubjectName",
			"DurationMinutes", "TotalPoints", "PassingScore", "QuestionIds",
			"Status", "Registration", "HasCriticalRule",
			"CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 1)
		RETURNING "CreatedAt", "UpdatedAt", "RowVersion"`

	err := s.db.QueryRowxContext(ctx, query,
		a.IdSeq, a.Code, a.Title, a.SubjectId, a.SubjectName,
		a.DurationMinutes, a.TotalPoints, a.PassingScore, pq.Array(a.QuestionIds),
		a.Status, a.Registration, a.HasCriticalRule,
		u.UserId, u.UserId, now, now,
	).Scan(&a.CreatedAt, &a.UpdatedAt, &a.RowVersion)

	if err != nil {
		s.log.Error("Failed to create assessment", zap.Error(err))
		return nil, fmt.Errorf("không thể tạo bộ đề: %w", err)
	}

	return a, nil
}

// CreateBlueprint (A - Tạo cấu trúc ma trận đề thi)
func (s *AssessmentService) CreateBlueprint(ctx context.Context, u *security.UserContext, b *domain.Blueprint) (*domain.Blueprint, error) {
	if b.Mode == "" || b.Config == "" {
		return nil, errors.New("chế độ (mode) và cấu hình (config) blueprint là bắt buộc")
	}

	b.IdSeq = uuid.New().String()
	now := time.Now()
	if b.Scope == "" {
		b.Scope = "{}"
	}

	query := `
		INSERT INTO "_ASMBlueprint" (
			"IdSeq", "Mode", "Scope", "Config",
			"CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
		RETURNING "CreatedAt", "UpdatedAt", "RowVersion"`

	err := s.db.QueryRowxContext(ctx, query,
		b.IdSeq, b.Mode, b.Scope, b.Config,
		u.UserId, u.UserId, now, now,
	).Scan(&b.CreatedAt, &b.UpdatedAt, &b.RowVersion)

	if err != nil {
		s.log.Error("Failed to create blueprint", zap.Error(err))
		return nil, fmt.Errorf("không thể tạo ma trận đề: %w", err)
	}

	return b, nil
}
