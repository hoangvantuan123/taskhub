package questions

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// ListQuestions (Q - Query tìm kiếm câu hỏi có phân trang và lọc)
func (s *QuestionService) ListQuestions(
	ctx context.Context,
	u *security.UserContext,
	folderId, topicId, statusFilter string,
	limit, offset int,
) ([]map[string]any, int, error) {
	if limit <= 0 {
		limit = 20
	}
	where := `WHERE 1=1`
	args := []any{}

	if folderId != "" {
		args = append(args, folderId)
		where += fmt.Sprintf(` AND q."FolderId" = $%d`, len(args))
	}
	if topicId != "" {
		args = append(args, topicId)
		where += fmt.Sprintf(` AND q."TopicId" = $%d`, len(args))
	}
	if statusFilter != "" {
		args = append(args, statusFilter)
		where += fmt.Sprintf(` AND q."Status" = $%d`, len(args))
	}

	var total int
	countQuery := fmt.Sprintf(`SELECT count(*) FROM "_QSTQuestion" q %s`, where)
	_ = s.db.GetContext(ctx, &total, countQuery, args...)

	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT jsonb_build_object(
			'id', q."IdSeq",
			'content', q."Content",
			'type', q."Type",
			'levelId', q."LevelId",
			'formatId', q."FormatId",
			'specialtyId', q."SpecialtyId",
			'topicId', q."TopicId",
			'folderId', q."FolderId",
			'options', q."Options",
			'isCritical', q."IsCritical",
			'status', q."Status",
			'version', q."Version",
			'rowVersion', q."RowVersion",
			'updatedAt', q."UpdatedAt"
		)
		FROM "_QSTQuestion" q
		%s
		ORDER BY q."UpdatedAt" DESC
		LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		s.log.Error("Failed to list questions", zap.Error(err))
		return nil, 0, fmt.Errorf("không thể truy vấn ngân hàng câu hỏi: %w", err)
	}
	defer rows.Close()

	var result []map[string]any
	for rows.Next() {
		var b []byte
		if err := rows.Scan(&b); err != nil {
			return nil, 0, err
		}
		var item map[string]any
		_ = json.Unmarshal(b, &item)
		result = append(result, item)
	}

	return result, total, nil
}

// GetQuestionDetail (Q - Query chi tiết 1 câu hỏi)
func (s *QuestionService) GetQuestionDetail(ctx context.Context, u *security.UserContext, questionId string) (map[string]any, error) {
	query := `
		SELECT jsonb_build_object(
			'id', q."IdSeq",
			'content', q."Content",
			'explanation', q."Explanation",
			'type', q."Type",
			'levelId', q."LevelId",
			'formatId', q."FormatId",
			'specialtyId', q."SpecialtyId",
			'topicId', q."TopicId",
			'targetGroupId', q."TargetGroupId",
			'cognitiveLevelId', q."CognitiveLevelId",
			'folderId', q."FolderId",
			'options', q."Options",
			'rubrics', q."Rubrics",
			'simulationType', q."SimulationType",
			'simulationId', q."SimulationId",
			'isCritical', q."IsCritical",
			'criticalReason', q."CriticalReason",
			'imageUrl', q."ImageUrl",
			'status', q."Status",
			'authorId', q."AuthorId",
			'version', q."Version",
			'rowVersion', q."RowVersion",
			'createdAt', q."CreatedAt",
			'updatedAt', q."UpdatedAt"
		)
		FROM "_QSTQuestion" q
		WHERE q."IdSeq" = $1`

	var b []byte
	err := s.db.QueryRowContext(ctx, query, questionId).Scan(&b)
	if err != nil {
		return nil, errors.New("không tìm thấy câu hỏi")
	}

	var res map[string]any
	_ = json.Unmarshal(b, &res)
	return res, nil
}

// ListFolders (Q - Query danh sách thư mục)
func (s *QuestionService) ListFolders(ctx context.Context, u *security.UserContext) ([]map[string]any, error) {
	query := `
		SELECT jsonb_build_object(
			'id', f."IdSeq",
			'name', f."Name",
			'description', f."Description",
			'levelId', f."LevelId",
			'questionCount', COALESCE((SELECT count(*) FROM "_QSTQuestion" q WHERE q."FolderId"=f."IdSeq"), 0),
			'rowVersion', f."RowVersion"
		)
		FROM "_QSTFolder" f
		ORDER BY f."Name" ASC`

	rows, err := s.db.QueryContext(ctx, query)
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
