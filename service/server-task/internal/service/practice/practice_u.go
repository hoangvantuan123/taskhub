package practice

import (
	"context"
	"errors"
	"server-task/internal/domain"
	"server-task/internal/security"
	"time"

	"go.uber.org/zap"
)

// CompletePractice (U - Hoàn thành phiên luyện tập và lưu số câu đúng)
func (s *PracticeService) CompletePractice(
	ctx context.Context,
	u *security.UserContext,
	sessionId string,
	correctCount int,
) (*domain.PracticeSession, error) {
	if sessionId == "" {
		return nil, errors.New("sessionId không được để trống")
	}

	now := time.Now()
	res := &domain.PracticeSession{
		IdSeq:        sessionId,
		UserId:       u.UserId,
		CorrectCount: correctCount,
		CompletedAt:  &now,
		Status:       "completed",
	}

	s.log.Info("Practice session completed", zap.String("sessionId", sessionId), zap.Int("correct", correctCount))
	return res, nil
}
