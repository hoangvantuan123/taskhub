package learning

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/domain"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// UpdateCourse (U - Cập nhật thông tin khóa học)
func (s *LearningService) UpdateCourse(ctx context.Context, u *security.UserContext, course *domain.Course) (*domain.Course, error) {
	if course.IdSeq == "" {
		return nil, errors.New("IdSeq khóa học không được để trống")
	}

	query := `
		UPDATE "_LRNCourse" SET
			"Title" = $1,
			"Category" = $2,
			"DurationHours" = $3,
			"Description" = $4,
			"Status" = $5,
			"UpdatedBy" = $6,
			"UpdatedAt" = now(),
			"RowVersion" = "RowVersion" + 1
		WHERE "IdSeq" = $7 AND "RowVersion" = $8
		RETURNING "UpdatedAt", "RowVersion"`

	err := s.db.QueryRowxContext(ctx, query,
		course.Title, course.Category, course.DurationHours, course.Description,
		course.Status, u.UserId, course.IdSeq, course.RowVersion,
	).Scan(&course.UpdatedAt, &course.RowVersion)

	if err != nil {
		s.log.Error("Failed to update course", zap.Error(err))
		return nil, fmt.Errorf("cập nhật khóa học thất bại: %w", err)
	}

	return course, nil
}

// UpdateLesson (U - Cập nhật nội dung bài học)
func (s *LearningService) UpdateLesson(ctx context.Context, u *security.UserContext, lesson *domain.Lesson) (*domain.Lesson, error) {
	if lesson.IdSeq == "" {
		return nil, errors.New("IdSeq bài học không được để trống")
	}

	query := `
		UPDATE "_LRNLesson" SET
			"Title" = $1,
			"OrderIndex" = $2,
			"Content" = $3,
			"VideoUrl" = $4,
			"UpdatedBy" = $5,
			"UpdatedAt" = now(),
			"RowVersion" = "RowVersion" + 1
		WHERE "IdSeq" = $6 AND "RowVersion" = $7
		RETURNING "UpdatedAt", "RowVersion"`

	err := s.db.QueryRowxContext(ctx, query,
		lesson.Title, lesson.OrderIndex, lesson.Content, lesson.VideoUrl,
		u.UserId, lesson.IdSeq, lesson.RowVersion,
	).Scan(&lesson.UpdatedAt, &lesson.RowVersion)

	if err != nil {
		s.log.Error("Failed to update lesson", zap.Error(err))
		return nil, fmt.Errorf("cập nhật bài học thất bại: %w", err)
	}

	return lesson, nil
}
