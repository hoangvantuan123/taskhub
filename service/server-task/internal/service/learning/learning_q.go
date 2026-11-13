package learning

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// ListCourses (Q - Query danh sách khóa học)
func (s *LearningService) ListCourses(ctx context.Context, u *security.UserContext, categoryFilter string) ([]map[string]any, error) {
	where := `WHERE c."Status" = 'published'`
	args := []any{}
	if u.Role == "admin" || u.Role == "author" {
		where = `WHERE 1=1`
	}
	if categoryFilter != "" {
		where += ` AND c."Category" = $1`
		args = append(args, categoryFilter)
	}

	query := fmt.Sprintf(`
		SELECT jsonb_build_object(
			'id', c."IdSeq",
			'code', c."Code",
			'title', c."Title",
			'category', c."Category",
			'durationHours', c."DurationHours",
			'description', c."Description",
			'status', c."Status",
			'lessonCount', COALESCE((SELECT count(*) FROM "_LRNLesson" l WHERE l."CourseId"=c."IdSeq"), 0),
			'rowVersion', c."RowVersion",
			'createdAt', c."CreatedAt"
		)
		FROM "_LRNCourse" c
		%s
		ORDER BY c."CreatedAt" DESC`, where)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		s.log.Error("Failed to list courses", zap.Error(err))
		return nil, fmt.Errorf("không thể lấy danh sách khóa học: %w", err)
	}
	defer rows.Close()

	var result []map[string]any
	for rows.Next() {
		var b []byte
		if err := rows.Scan(&b); err != nil {
			return nil, err
		}
		var item map[string]any
		_ = json.Unmarshal(b, &item)
		result = append(result, item)
	}

	return result, nil
}

// GetCourseDetail (Q - Query chi tiết khóa học bao gồm bài học)
func (s *LearningService) GetCourseDetail(ctx context.Context, u *security.UserContext, courseId string) (map[string]any, error) {
	query := `
		SELECT jsonb_build_object(
			'id', c."IdSeq",
			'code', c."Code",
			'title', c."Title",
			'category', c."Category",
			'durationHours', c."DurationHours",
			'description', c."Description",
			'status', c."Status",
			'lessons', COALESCE((
				SELECT jsonb_agg(jsonb_build_object(
					'id', l."IdSeq",
					'title', l."Title",
					'orderIndex', l."OrderIndex",
					'content', l."Content",
					'videoUrl', l."VideoUrl",
					'rowVersion', l."RowVersion"
				) ORDER BY l."OrderIndex" ASC)
				FROM "_LRNLesson" l
				WHERE l."CourseId" = c."IdSeq"
			), '[]'::jsonb),
			'rowVersion', c."RowVersion"
		)
		FROM "_LRNCourse" c
		WHERE c."IdSeq" = $1`

	var b []byte
	err := s.db.QueryRowContext(ctx, query, courseId).Scan(&b)
	if err != nil {
		return nil, errors.New("không tìm thấy khóa học")
	}

	var res map[string]any
	_ = json.Unmarshal(b, &res)
	return res, nil
}
