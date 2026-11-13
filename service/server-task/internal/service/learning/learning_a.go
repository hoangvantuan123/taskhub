package learning

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/domain"
	"server-task/internal/security"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// CreateCourse (A - Thêm mới khóa học)
func (s *LearningService) CreateCourse(ctx context.Context, u *security.UserContext, course *domain.Course) (*domain.Course, error) {
	if course.Code == "" || course.Title == "" {
		return nil, errors.New("mã và tên khóa học không được để trống")
	}

	course.IdSeq = uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO "_LRNCourse" (
			"IdSeq", "Code", "Title", "Category", "DurationHours", "Description",
			"Status", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1)
		RETURNING "CreatedAt", "UpdatedAt", "RowVersion"`

	err := s.db.QueryRowxContext(ctx, query,
		course.IdSeq, course.Code, course.Title, course.Category, course.DurationHours,
		course.Description, course.Status, u.UserId, u.UserId, now, now,
	).Scan(&course.CreatedAt, &course.UpdatedAt, &course.RowVersion)

	if err != nil {
		s.log.Error("Failed to create course", zap.Error(err))
		return nil, fmt.Errorf("không thể tạo khóa học: %w", err)
	}

	return course, nil
}

// AddLesson (A - Thêm bài học vào khóa học)
func (s *LearningService) AddLesson(ctx context.Context, u *security.UserContext, lesson *domain.Lesson) (*domain.Lesson, error) {
	if lesson.CourseId == "" || lesson.Title == "" {
		return nil, errors.New("CourseId và tiêu đề bài học không được để trống")
	}

	lesson.IdSeq = uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO "_LRNLesson" (
			"IdSeq", "CourseId", "Title", "OrderIndex", "Content", "VideoUrl",
			"CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
		RETURNING "CreatedAt", "UpdatedAt", "RowVersion"`

	err := s.db.QueryRowxContext(ctx, query,
		lesson.IdSeq, lesson.CourseId, lesson.Title, lesson.OrderIndex, lesson.Content,
		lesson.VideoUrl, u.UserId, u.UserId, now, now,
	).Scan(&lesson.CreatedAt, &lesson.UpdatedAt, &lesson.RowVersion)

	if err != nil {
		s.log.Error("Failed to add lesson", zap.Error(err))
		return nil, fmt.Errorf("không thể thêm bài học: %w", err)
	}

	return lesson, nil
}
