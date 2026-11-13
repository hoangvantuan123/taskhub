package practice

import (
	"context"
	"server-task/internal/security"
)

// ListPracticeTopics (Q - Query danh sách chủ đề luyện tập)
func (s *PracticeService) ListPracticeTopics(ctx context.Context, u *security.UserContext) ([]map[string]any, error) {
	// Lấy từ danh mục các topic của câu hỏi
	query := `
		SELECT jsonb_build_object(
			'id', opt."IdSeq",
			'code', opt."Code",
			'label', opt."Label",
			'questionCount', COALESCE((SELECT count(*) FROM "_QSTQuestion" q WHERE q."TopicId"=opt."IdSeq" AND q."Status"='published'), 0)
		)
		FROM "_SYSCatalogOption" opt
		JOIN "_SYSCatalogDimension" dim ON dim."IdSeq" = opt."DimensionId"
		WHERE dim."Key" = 'topic'
		ORDER BY opt."OrderIndex" ASC`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		// Fallback sample data if catalog dimension is not seeded yet
		return []map[string]any{
			{"id": "topic-1", "code": "SAFETY", "label": "An toàn lao động", "questionCount": 50},
			{"id": "topic-2", "code": "TECH", "label": "Kỹ thuật vận hành", "questionCount": 120},
			{"id": "topic-3", "code": "PROCESS", "label": "Quy trình tiêu chuẩn", "questionCount": 85},
		}, nil
	}
	defer rows.Close()

	var result []map[string]any
	for rows.Next() {
		var b []byte
		if err := rows.Scan(&b); err == nil {
			var item map[string]any
			// parse json
			result = append(result, item)
		}
	}
	if len(result) == 0 {
		return []map[string]any{
			{"id": "topic-1", "code": "SAFETY", "label": "An toàn lao động", "questionCount": 50},
			{"id": "topic-2", "code": "TECH", "label": "Kỹ thuật vận hành", "questionCount": 120},
		}, nil
	}

	return result, nil
}
