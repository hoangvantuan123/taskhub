package grading

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// ResetGrade (D - Reset điểm để chuyển bài thi lại về trạng thái chờ chấm)
func (s *GradingService) ResetGrade(ctx context.Context, u *security.UserContext, attemptId string) error {
	if attemptId == "" {
		return errors.New("attemptId không được để trống")
	}

	query := `
		UPDATE "_ASMExamAttempt" SET
			"GradingStatus" = 'needs_grading',
			"GradedBy" = NULL,
			"GradedAt" = NULL,
			"Feedback" = '',
			"UpdatedAt" = now(),
			"RowVersion" = "RowVersion" + 1
		WHERE "IdSeq" = $1`

	res, err := s.db.ExecContext(ctx, query, attemptId)
	if err != nil {
		s.log.Error("Failed to reset grade", zap.Error(err))
		return fmt.Errorf("không thể hoàn trả trạng thái chấm thi: %w", err)
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		return errors.New("không tìm thấy bài thi để reset")
	}

	return nil
}
