package assessments

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// ListAssessments (Q - Query danh sách bộ đề)
func (s *AssessmentService) ListAssessments(ctx context.Context, u *security.UserContext, statusFilter string) ([]map[string]any, error) {
	where := ""
	args := []any{}
	if statusFilter != "" {
		where = `WHERE a."Status" = $1`
		args = append(args, statusFilter)
	}

	query := fmt.Sprintf(`
		SELECT jsonb_build_object(
			'id', a."IdSeq",
			'code', a."Code",
			'title', a."Title",
			'subjectId', a."SubjectId",
			'subjectName', a."SubjectName",
			'durationMinutes', a."DurationMinutes",
			'totalPoints', a."TotalPoints",
			'passingScore', a."PassingScore",
			'questionCount', COALESCE(cardinality(a."QuestionIds"), 0),
			'status', a."Status",
			'hasCriticalRule', a."HasCriticalRule",
			'publishedAt', a."PublishedAt",
			'rowVersion', a."RowVersion",
			'createdAt', a."CreatedAt"
		)
		FROM "_ASMAssessment" a
		%s
		ORDER BY a."UpdatedAt" DESC`, where)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		s.log.Error("Failed to list assessments", zap.Error(err))
		return nil, fmt.Errorf("không thể lấy danh sách bộ đề: %w", err)
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

// GetAssessmentDetail (Q - Query chi tiết bộ đề thi và các câu hỏi)
func (s *AssessmentService) GetAssessmentDetail(ctx context.Context, u *security.UserContext, assessmentId string) (map[string]any, error) {
	query := `
		SELECT jsonb_build_object(
			'id', a."IdSeq",
			'code', a."Code",
			'title', a."Title",
			'subjectId', a."SubjectId",
			'subjectName', a."SubjectName",
			'durationMinutes', a."DurationMinutes",
			'totalPoints', a."TotalPoints",
			'passingScore', a."PassingScore",
			'questionIds', a."QuestionIds",
			'status', a."Status",
			'registration', a."Registration",
			'hasCriticalRule', a."HasCriticalRule",
			'publishedAt', a."PublishedAt",
			'questions', COALESCE((
				SELECT jsonb_agg(jsonb_build_object(
					'id', q."IdSeq",
					'content', q."Content",
					'type', q."Type",
					'options', q."Options",
					'isCritical', q."IsCritical"
				))
				FROM "_QSTQuestion" q
				WHERE q."IdSeq" = ANY(a."QuestionIds")
			), '[]'::jsonb),
			'rowVersion', a."RowVersion"
		)
		FROM "_ASMAssessment" a
		WHERE a."IdSeq" = $1`

	var b []byte
	err := s.db.QueryRowContext(ctx, query, assessmentId).Scan(&b)
	if err != nil {
		return nil, errors.New("không tìm thấy bộ đề thi")
	}

	var res map[string]any
	_ = json.Unmarshal(b, &res)
	return res, nil
}

// ListBlueprints (Q - Query danh sách blueprint)
func (s *AssessmentService) ListBlueprints(ctx context.Context, u *security.UserContext, mode string) ([]map[string]any, error) {
	query := `
		SELECT jsonb_build_object(
			'id', b."IdSeq",
			'mode', b."Mode",
			'scope', b."Scope",
			'config', b."Config",
			'rowVersion', b."RowVersion",
			'updatedAt', b."UpdatedAt"
		)
		FROM "_ASMBlueprint" b
		WHERE ($1 = '' OR b."Mode" = $1)
		ORDER BY b."UpdatedAt" DESC`

	rows, err := s.db.QueryContext(ctx, query, mode)
	if err != nil {
		return nil, err
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
