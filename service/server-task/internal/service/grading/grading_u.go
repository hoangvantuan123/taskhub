package grading

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/security"
	"time"

	"go.uber.org/zap"
)

// UpdateGrade (U - Cập nhật điểm phúc khảo hoặc điều chỉnh nhận xét bài thi)
func (s *GradingService) UpdateGrade(
	ctx context.Context,
	u *security.UserContext,
	attemptId string,
	newScore float64,
	feedback string,
) error {
	if attemptId == "" {
		return errors.New("attemptId không được để trống")
	}

	var attempt struct {
		MaxScore     float64 `db:"MaxScore"`
		PassingScore float64 `db:"PassingScore"`
		FailedRule   bool    `db:"FailedCriticalRule"`
	}
	err := s.db.GetContext(ctx, &attempt, `
		SELECT "MaxScore", "PassingScore", "FailedCriticalRule" 
		FROM "_ASMExamAttempt" WHERE "IdSeq" = $1`, attemptId)
	if err != nil {
		return errors.New("không tìm thấy bài thi")
	}

	if newScore > attempt.MaxScore {
		newScore = attempt.MaxScore
	}
	isPassed := newScore >= attempt.PassingScore && !attempt.FailedRule

	now := time.Now()
	query := `
		UPDATE "_ASMExamAttempt" SET
			"TotalScore" = $1,
			"IsPassed" = $2,
			"Feedback" = $3,
			"GradedBy" = $4,
			"GradedAt" = $5,
			"UpdatedAt" = now(),
			"RowVersion" = "RowVersion" + 1
		WHERE "IdSeq" = $6`

	_, err = s.db.ExecContext(ctx, query, newScore, isPassed, feedback, u.UserId, now, attemptId)
	if err != nil {
		s.log.Error("Failed to update grade", zap.Error(err))
		return fmt.Errorf("cập nhật điểm bài thi thất bại: %w", err)
	}

	return nil
}
