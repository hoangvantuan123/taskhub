package exams

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"server-task/internal/domain"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// ListSessions (Q - Query danh sách ca thi)
func (s *ExamService) ListSessions(ctx context.Context, u *security.UserContext, statusFilter string) ([]map[string]any, error) {
	where := ""
	args := []any{}
	if statusFilter != "" {
		where = "WHERE e.\"Status\" = $1"
		args = append(args, statusFilter)
	}

	query := fmt.Sprintf(`
		SELECT jsonb_build_object(
			'id', e."IdSeq",
			'code', e."Code",
			'title', e."Title",
			'assessmentId', e."AssessmentId",
			'assessmentCode', COALESCE(a."Code", ''),
			'assessmentTitle', COALESCE(a."Title", ''),
			'durationMinutes', COALESCE(a."DurationMinutes", 45),
			'questionCount', COALESCE(cardinality(a."QuestionIds"), 0),
			'totalPoints', COALESCE(a."TotalPoints", 10),
			'passingScore', COALESCE(a."PassingScore", 5),
			'startTime', e."StartTime",
			'endTime', e."EndTime",
			'location', e."Location",
			'targetScope', e."TargetScope",
			'maxAttempts', e."MaxAttempts",
			'securityConfig', e."SecurityConfig",
			'status', e."Status",
			'attemptCount', COALESCE((SELECT count(*) FROM "_ASMExamAttempt" att WHERE att."ExamSessionId"=e."IdSeq"), 0),
			'myAttemptCount', COALESCE((SELECT count(*) FROM "_ASMExamAttempt" att WHERE att."ExamSessionId"=e."IdSeq" AND att."UserId"=$%d), 0),
			'rowVersion', e."RowVersion"
		)
		FROM "_ASMExamSession" e
		LEFT JOIN "_ASMAssessment" a ON a."IdSeq" = e."AssessmentId"
		%s
		ORDER BY e."StartTime" DESC`, len(args)+1, where)

	args = append(args, u.UserId)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		s.log.Error("Failed to list exam sessions", zap.Error(err))
		return nil, fmt.Errorf("không thể truy vấn danh sách ca thi: %w", err)
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

// GetSessionDetail (Q - Query chi tiết 1 ca thi)
func (s *ExamService) GetSessionDetail(ctx context.Context, u *security.UserContext, sessionId string) (map[string]any, error) {
	query := `
		SELECT jsonb_build_object(
			'id', e."IdSeq",
			'code', e."Code",
			'title', e."Title",
			'assessmentId', e."AssessmentId",
			'assessmentCode', COALESCE(a."Code", ''),
			'assessmentTitle', COALESCE(a."Title", ''),
			'durationMinutes', COALESCE(a."DurationMinutes", 45),
			'questionCount', COALESCE(cardinality(a."QuestionIds"), 0),
			'totalPoints', COALESCE(a."TotalPoints", 10),
			'passingScore', COALESCE(a."PassingScore", 5),
			'startTime', e."StartTime",
			'endTime', e."EndTime",
			'location', e."Location",
			'targetScope', e."TargetScope",
			'maxAttempts', e."MaxAttempts",
			'securityConfig', e."SecurityConfig",
			'status', e."Status",
			'rowVersion', e."RowVersion"
		)
		FROM "_ASMExamSession" e
		LEFT JOIN "_ASMAssessment" a ON a."IdSeq" = e."AssessmentId"
		WHERE e."IdSeq" = $1`

	var b []byte
	err := s.db.QueryRowContext(ctx, query, sessionId).Scan(&b)
	if err != nil {
		return nil, errors.New("không tìm thấy thông tin ca thi")
	}

	var res map[string]any
	_ = json.Unmarshal(b, &res)
	return res, nil
}

// ListMyExams (Q - Query các kỳ thi của tôi)
func (s *ExamService) ListMyExams(ctx context.Context, u *security.UserContext) ([]map[string]any, error) {
	query := `
		SELECT jsonb_build_object(
			'sessionId', e."IdSeq",
			'sessionCode', e."Code",
			'sessionTitle', e."Title",
			'assessmentTitle', COALESCE(a."Title", ''),
			'durationMinutes', COALESCE(a."DurationMinutes", 45),
			'startTime', e."StartTime",
			'endTime', e."EndTime",
			'status', e."Status",
			'attempts', COALESCE((
				SELECT jsonb_agg(jsonb_build_object(
					'attemptId', att."IdSeq",
					'attemptNumber', att."AttemptNumber",
					'startedAt', att."StartedAt",
					'submittedAt', att."SubmittedAt",
					'totalScore', att."TotalScore",
					'maxScore', att."MaxScore",
					'isPassed', att."IsPassed",
					'gradingStatus', att."GradingStatus"
				) ORDER BY att."AttemptNumber" DESC)
				FROM "_ASMExamAttempt" att
				WHERE att."ExamSessionId" = e."IdSeq" AND att."UserId" = $1
			), '[]'::jsonb)
		)
		FROM "_ASMExamSession" e
		LEFT JOIN "_ASMAssessment" a ON a."IdSeq" = e."AssessmentId"
		WHERE e."Status" IN ('scheduled', 'in_progress', 'completed')
		ORDER BY e."StartTime" DESC`

	rows, err := s.db.QueryContext(ctx, query, u.UserId)
	if err != nil {
		s.log.Error("Failed to list my exams", zap.Error(err))
		return nil, fmt.Errorf("không thể tải danh sách kỳ thi của bạn: %w", err)
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

// GetAttemptDetail (Q - Query chi tiết bài làm)
func (s *ExamService) GetAttemptDetail(ctx context.Context, u *security.UserContext, attemptId string) (*domain.ExamAttempt, error) {
	var attempt domain.ExamAttempt
	err := s.db.GetContext(ctx, &attempt, `SELECT * FROM "_ASMExamAttempt" WHERE "IdSeq" = $1`, attemptId)
	if err != nil {
		return nil, errors.New("không tìm thấy bài làm")
	}

	// Chỉ cho phép chủ sở hữu hoặc admin/giám thị xem
	if attempt.UserId != u.UserId && u.Role != "admin" && u.Role != "exam_manager" && u.Role != "grader" {
		return nil, errors.New("bạn không có quyền xem bài làm này")
	}

	return &attempt, nil
}
