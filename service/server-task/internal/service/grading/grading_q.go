package grading

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// ListGradingQueue (Q - Query danh sách bài thi đang chờ chấm hoặc đã chấm)
func (s *GradingService) ListGradingQueue(ctx context.Context, u *security.UserContext, statusFilter string) ([]map[string]any, error) {
	where := `WHERE att."GradingStatus" IN ('submitted', 'needs_grading', 'graded')`
	args := []any{}
	if statusFilter != "" {
		where += ` AND att."GradingStatus" = $1`
		args = append(args, statusFilter)
	}

	query := fmt.Sprintf(`
		SELECT jsonb_build_object(
			'attemptId', att."IdSeq",
			'sessionId', s."IdSeq",
			'sessionTitle', s."Title",
			'candidateId', att."UserId",
			'candidateName', COALESCE(usr."Name", usr."Username"),
			'candidateEmail', usr."Email",
			'submittedAt', att."SubmittedAt",
			'gradingStatus', att."GradingStatus",
			'totalScore', att."TotalScore",
			'maxScore', att."MaxScore",
			'isPassed', att."IsPassed",
			'feedback', att."Feedback",
			'gradedAt', att."GradedAt"
		)
		FROM "_ASMExamAttempt" att
		JOIN "_ASMExamSession" s ON s."IdSeq" = att."ExamSessionId"
		LEFT JOIN "_USRAccountDirectory" usr ON usr."Id" = att."UserId"
		%s
		ORDER BY att."SubmittedAt" DESC`, where)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		s.log.Error("Failed to list grading queue", zap.Error(err))
		return nil, fmt.Errorf("không thể lấy hàng đợi chấm thi: %w", err)
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

// GetGradingDetail (Q - Query chi tiết bài làm của thí sinh để chấm điểm tự luận)
func (s *GradingService) GetGradingDetail(ctx context.Context, u *security.UserContext, attemptId string) (map[string]any, error) {
	query := `
		SELECT jsonb_build_object(
			'attemptId', att."IdSeq",
			'sessionId', s."IdSeq",
			'sessionTitle', s."Title",
			'candidateName', COALESCE(usr."Name", usr."Username"),
			'candidateEmail', usr."Email",
			'submittedAt', att."SubmittedAt",
			'answers', att."Answers",
			'totalScore', att."TotalScore",
			'maxScore', att."MaxScore",
			'passingScore', att."PassingScore",
			'gradingStatus', att."GradingStatus",
			'feedback', att."Feedback",
			'questions', COALESCE((
				SELECT jsonb_agg(jsonb_build_object(
					'id', q."IdSeq",
					'content', q."Content",
					'type', q."Type",
					'options', q."Options",
					'rubrics', q."Rubrics",
					'isCritical', q."IsCritical"
				))
				FROM "_QSTQuestion" q
				WHERE q."IdSeq" = ANY(a."QuestionIds")
			), '[]'::jsonb)
		)
		FROM "_ASMExamAttempt" att
		JOIN "_ASMExamSession" s ON s."IdSeq" = att."ExamSessionId"
		JOIN "_ASMAssessment" a ON a."IdSeq" = att."AssessmentId"
		LEFT JOIN "_USRAccountDirectory" usr ON usr."Id" = att."UserId"
		WHERE att."IdSeq" = $1`

	var b []byte
	err := s.db.QueryRowContext(ctx, query, attemptId).Scan(&b)
	if err != nil {
		return nil, errors.New("không tìm thấy bài thi để chấm")
	}

	var res map[string]any
	_ = json.Unmarshal(b, &res)
	return res, nil
}
