package practice

import (
	"context"
	"errors"
	"server-task/internal/domain"
	"server-task/internal/security"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// StartPractice (A - Bắt đầu một phiên luyện tập mới)
func (s *PracticeService) StartPractice(ctx context.Context, u *security.UserContext, topicId string) (*domain.PracticeSession, error) {
	if topicId == "" {
		return nil, errors.New("chủ đề luyện tập (topicId) không được để trống")
	}

	session := &domain.PracticeSession{
		IdSeq:          uuid.New().String(),
		UserId:         u.UserId,
		TopicId:        topicId,
		TotalQuestions: 10,
		CorrectCount:   0,
		StartedAt:      time.Now(),
		Status:         "in_progress",
	}

	s.log.Info("Practice session started", zap.String("sessionId", session.IdSeq), zap.String("userId", u.UserId))
	return session, nil
}
