package questions

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/domain"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// UpdateQuestion (U - Cập nhật nội dung câu hỏi)
func (s *QuestionService) UpdateQuestion(ctx context.Context, u *security.UserContext, q *domain.Question) (*domain.Question, error) {
	if q.IdSeq == "" {
		return nil, errors.New("IdSeq câu hỏi không được để trống")
	}

	query := `
		UPDATE "_QSTQuestion" SET
			"LevelId" = $1,
			"FormatId" = $2,
			"SpecialtyId" = $3,
			"TopicId" = $4,
			"TargetGroupId" = $5,
			"CognitiveLevelId" = $6,
			"FolderId" = $7,
			"Content" = $8,
			"Explanation" = $9,
			"Type" = $10,
			"Options" = $11,
			"Rubrics" = $12,
			"SimulationType" = $13,
			"SimulationId" = $14,
			"IsCritical" = $15,
			"CriticalReason" = $16,
			"ImageUrl" = $17,
			"Status" = $18,
			"UpdatedBy" = $19,
			"UpdatedAt" = now(),
			"Version" = "Version" + 1,
			"RowVersion" = "RowVersion" + 1
		WHERE "IdSeq" = $20 AND "RowVersion" = $21
		RETURNING "UpdatedAt", "RowVersion", "Version"`

	err := s.db.QueryRowxContext(ctx, query,
		q.LevelId, q.FormatId, q.SpecialtyId, q.TopicId,
		q.TargetGroupId, q.CognitiveLevelId, q.FolderId, q.Content, q.Explanation,
		q.Type, q.Options, q.Rubrics, q.SimulationType, q.SimulationId,
		q.IsCritical, q.CriticalReason, q.ImageUrl, q.Status,
		u.UserId, q.IdSeq, q.RowVersion,
	).Scan(&q.UpdatedAt, &q.RowVersion, &q.Version)

	if err != nil {
		s.log.Error("Failed to update question", zap.Error(err))
		return nil, fmt.Errorf("cập nhật câu hỏi thất bại: %w", err)
	}

	return q, nil
}

// ApproveQuestion (U - Duyệt câu hỏi vào kho chính thức)
func (s *QuestionService) ApproveQuestion(ctx context.Context, u *security.UserContext, questionId string, rowVersion int64) error {
	query := `
		UPDATE "_QSTQuestion" SET
			"Status" = 'published',
			"UpdatedBy" = $1,
			"UpdatedAt" = now(),
			"RowVersion" = "RowVersion" + 1
		WHERE "IdSeq" = $2 AND "RowVersion" = $3`

	res, err := s.db.ExecContext(ctx, query, u.UserId, questionId, rowVersion)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return errors.New("không tìm thấy câu hỏi hoặc phiên bản xung đột")
	}
	return nil
}
