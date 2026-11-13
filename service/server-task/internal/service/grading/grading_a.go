package grading

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/domain"
	"server-task/internal/security"
	"time"

	"go.uber.org/zap"
)

// SubmitScore (A - Lưu điểm chấm bài thi tự luận lần đầu)
func (s *GradingService) SubmitScore(ctx context.Context, u *security.UserContext, sub *domain.GradingScoreSubmission) error {
	if sub.AttemptId == "" {
		return errors.New("attemptId không được để trống")
	}

	var attempt domain.ExamAttempt
	err := s.db.GetContext(ctx, &attempt, `SELECT * FROM "_ASMExamAttempt" WHERE "IdSeq" = $1`, sub.AttemptId)
	if err != nil {
		return errors.New("không tìm thấy bài thi cần chấm")
	}

	now := time.Now()
	var essayTotal float64
	for _, score := range sub.Scores {
		essayTotal += score
	}

	finalScore := attempt.TotalScore + essayTotal
	if finalScore > attempt.MaxScore {
		finalScore = attempt.MaxScore
	}
	isPassed := finalScore >= attempt.PassingScore && !attempt.FailedCriticalRule

	query := `
		UPDATE "_ASMExamAttempt" SET
			"TotalScore" = $1,
			"IsPassed" = $2,
			"GradingStatus" = 'graded',
			"GradedBy" = $3,
			"GradedAt" = $4,
			"Feedback" = $5,
			"UpdatedAt" = now(),
			"RowVersion" = "RowVersion" + 1
		WHERE "IdSeq" = $6`

	_, err = s.db.ExecContext(ctx, query, finalScore, isPassed, u.UserId, now, sub.Feedback, sub.AttemptId)
	if err != nil {
		s.log.Error("Failed to submit grading score", zap.Error(err))
		return fmt.Errorf("lưu điểm chấm thi thất bại: %w", err)
	}

	s.log.Info("Exam attempt graded",
		zap.String("attemptId", sub.AttemptId),
		zap.Float64("finalScore", finalScore),
		zap.String("grader", u.UserId),
	)

	return nil
}
