package questions

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/domain"
	"server-task/internal/security"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// CreateQuestion (A - Thêm câu hỏi vào ngân hàng)
func (s *QuestionService) CreateQuestion(ctx context.Context, u *security.UserContext, q *domain.Question) (*domain.Question, error) {
	if q.Content == "" || q.Type == "" {
		return nil, errors.New("nội dung và loại câu hỏi không được để trống")
	}

	q.IdSeq = uuid.New().String()
	now := time.Now()
	if q.Status == "" {
		q.Status = "draft"
	}
	if q.Options == "" {
		q.Options = "[]"
	}
	if q.Rubrics == "" {
		q.Rubrics = "[]"
	}
	q.AuthorId = &u.UserId

	query := `
		INSERT INTO "_QSTQuestion" (
			"IdSeq", "LevelId", "FormatId", "SpecialtyId", "TopicId",
			"TargetGroupId", "CognitiveLevelId", "FolderId", "Content", "Explanation",
			"Type", "Options", "Rubrics", "SimulationType", "SimulationId",
			"IsCritical", "CriticalReason", "ImageUrl", "Status", "AuthorId",
			"CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion", "Version"
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
			$21, $21, $22, $22, 1, 1
		) RETURNING "CreatedAt", "UpdatedAt", "RowVersion"`

	err := s.db.QueryRowxContext(ctx, query,
		q.IdSeq, q.LevelId, q.FormatId, q.SpecialtyId, q.TopicId,
		q.TargetGroupId, q.CognitiveLevelId, q.FolderId, q.Content, q.Explanation,
		q.Type, q.Options, q.Rubrics, q.SimulationType, q.SimulationId,
		q.IsCritical, q.CriticalReason, q.ImageUrl, q.Status, q.AuthorId,
		u.UserId, now,
	).Scan(&q.CreatedAt, &q.UpdatedAt, &q.RowVersion)

	if err != nil {
		s.log.Error("Failed to create question", zap.Error(err))
		return nil, fmt.Errorf("không thể tạo câu hỏi: %w", err)
	}

	return q, nil
}

// CreateFolder (A - Thêm thư mục câu hỏi)
func (s *QuestionService) CreateFolder(ctx context.Context, u *security.UserContext, f *domain.QuestionFolder) (*domain.QuestionFolder, error) {
	if f.Name == "" {
		return nil, errors.New("tên thư mục không được để trống")
	}

	f.IdSeq = uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO "_QSTFolder" (
			"IdSeq", "Name", "Description", "LevelId",
			"CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion"
		) VALUES ($1, $2, $3, $4, $5, $5, $6, $6, 1)
		RETURNING "CreatedAt", "UpdatedAt", "RowVersion"`

	err := s.db.QueryRowxContext(ctx, query,
		f.IdSeq, f.Name, f.Description, f.LevelId, u.UserId, now,
	).Scan(&f.CreatedAt, &f.UpdatedAt, &f.RowVersion)

	if err != nil {
		s.log.Error("Failed to create folder", zap.Error(err))
		return nil, fmt.Errorf("không thể tạo thư mục: %w", err)
	}

	return f, nil
}
