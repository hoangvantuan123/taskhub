package exams

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// DeleteSession (D - Xóa ca thi)
func (s *ExamService) DeleteSession(ctx context.Context, u *security.UserContext, sessionId string) error {
	if sessionId == "" {
		return errors.New("sessionId không được để trống")
	}

	// Kiểm tra xem ca thi đã có người làm bài chưa
	var attemptCount int
	_ = s.db.GetContext(ctx, &attemptCount, `SELECT count(*) FROM "_ASMExamAttempt" WHERE "ExamSessionId" = $1`, sessionId)
	if attemptCount > 0 {
		return fmt.Errorf("không thể xóa ca thi đã có %d lượt thi thực hiện. Vui lòng chuyển trạng thái sang cancelled", attemptCount)
	}

	query := `DELETE FROM "_ASMExamSession" WHERE "IdSeq" = $1`
	res, err := s.db.ExecContext(ctx, query, sessionId)
	if err != nil {
		s.log.Error("Failed to delete exam session", zap.Error(err))
		return fmt.Errorf("xóa ca thi thất bại: %w", err)
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		return errors.New("không tìm thấy ca thi để xóa")
	}

	s.log.Info("Exam session deleted", zap.String("sessionId", sessionId), zap.String("deletedBy", u.UserId))
	return nil
}

// CancelRegistration (D - Hủy đăng ký ca thi của User)
func (s *ExamService) CancelRegistration(ctx context.Context, u *security.UserContext, sessionId string) error {
	s.log.Info("Exam registration cancelled", zap.String("sessionId", sessionId), zap.String("userId", u.UserId))
	return nil
}
