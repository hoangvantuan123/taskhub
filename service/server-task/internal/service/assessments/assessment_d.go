package assessments

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// DeleteAssessment (D - Xóa bộ đề thi)
func (s *AssessmentService) DeleteAssessment(ctx context.Context, u *security.UserContext, assessmentId string) error {
	if assessmentId == "" {
		return errors.New("assessmentId không được để trống")
	}

	// Kiểm tra xem bộ đề đã được dùng trong ca thi nào chưa
	var sessionCount int
	_ = s.db.GetContext(ctx, &sessionCount, `SELECT count(*) FROM "_ASMExamSession" WHERE "AssessmentId" = $1`, assessmentId)
	if sessionCount > 0 {
		return fmt.Errorf("không thể xóa bộ đề đã được gắn vào %d ca thi", sessionCount)
	}

	res, err := s.db.ExecContext(ctx, `DELETE FROM "_ASMAssessment" WHERE "IdSeq" = $1`, assessmentId)
	if err != nil {
		s.log.Error("Failed to delete assessment", zap.Error(err))
		return fmt.Errorf("xóa bộ đề thất bại: %w", err)
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		return errors.New("không tìm thấy bộ đề để xóa")
	}

	s.log.Info("Assessment deleted", zap.String("assessmentId", assessmentId), zap.String("userId", u.UserId))
	return nil
}

// DeleteBlueprint (D - Xóa ma trận đề thi)
func (s *AssessmentService) DeleteBlueprint(ctx context.Context, u *security.UserContext, blueprintId string) error {
	if blueprintId == "" {
		return errors.New("blueprintId không được để trống")
	}

	res, err := s.db.ExecContext(ctx, `DELETE FROM "_ASMBlueprint" WHERE "IdSeq" = $1`, blueprintId)
	if err != nil {
		s.log.Error("Failed to delete blueprint", zap.Error(err))
		return fmt.Errorf("xóa blueprint thất bại: %w", err)
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		return errors.New("không tìm thấy blueprint để xóa")
	}

	return nil
}
