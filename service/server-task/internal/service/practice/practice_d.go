package practice

import (
	"context"
	"errors"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// AbandonPractice (D - Hủy phiên luyện tập đang diễn ra)
func (s *PracticeService) AbandonPractice(ctx context.Context, u *security.UserContext, sessionId string) error {
	if sessionId == "" {
		return errors.New("sessionId không được để trống")
	}

	s.log.Info("Practice session abandoned", zap.String("sessionId", sessionId), zap.String("userId", u.UserId))
	return nil
}
