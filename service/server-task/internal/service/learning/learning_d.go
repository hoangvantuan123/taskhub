package learning

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// DeleteCourse (D - Xóa khóa học)
func (s *LearningService) DeleteCourse(ctx context.Context, u *security.UserContext, courseId string) error {
	if courseId == "" {
		return errors.New("courseId không được để trống")
	}

	// Xóa các bài học con trước
	_, _ = s.db.ExecContext(ctx, `DELETE FROM "_LRNLesson" WHERE "CourseId" = $1`, courseId)

	res, err := s.db.ExecContext(ctx, `DELETE FROM "_LRNCourse" WHERE "IdSeq" = $1`, courseId)
	if err != nil {
		s.log.Error("Failed to delete course", zap.Error(err))
		return fmt.Errorf("xóa khóa học thất bại: %w", err)
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		return errors.New("không tìm thấy khóa học để xóa")
	}

	s.log.Info("Course deleted", zap.String("courseId", courseId), zap.String("userId", u.UserId))
	return nil
}

// DeleteLesson (D - Xóa bài học)
func (s *LearningService) DeleteLesson(ctx context.Context, u *security.UserContext, lessonId string) error {
	if lessonId == "" {
		return errors.New("lessonId không được để trống")
	}

	res, err := s.db.ExecContext(ctx, `DELETE FROM "_LRNLesson" WHERE "IdSeq" = $1`, lessonId)
	if err != nil {
		s.log.Error("Failed to delete lesson", zap.Error(err))
		return fmt.Errorf("xóa bài học thất bại: %w", err)
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		return errors.New("không tìm thấy bài học để xóa")
	}

	return nil
}
