package knowledge

import (
	"context"
	"server-task/internal/security"
)

// ListDocs (Q - Query tìm kiếm tài liệu trong kho kiến thức)
func (s *KnowledgeService) ListDocs(ctx context.Context, u *security.UserContext, keyword string) ([]map[string]any, error) {
	// Trả về danh sách tài liệu hướng dẫn và cẩm nang
	return []map[string]any{
		{
			"id":         "doc-1",
			"title":      "Quy chuẩn kiểm tra chất lượng an toàn nhà xưởng",
			"category":   "An toàn",
			"summary":    "Hướng dẫn thực hiện kiểm tra an toàn ca sáng và quy trình dừng khẩn cấp E-Stop",
			"attachment": "safety_guide_v2.pdf",
			"updatedAt":  "2026-10-15T08:00:00Z",
		},
		{
			"id":         "doc-2",
			"title":      "Sổ tay kỹ thuật điều hành sản xuất ERP",
			"category":   "Kỹ thuật",
			"summary":    "Tài liệu thao tác phân bổ lệnh điều phối và xử lý ngoại lệ quy trình",
			"attachment": "erp_ops_manual.pdf",
			"updatedAt":  "2026-10-18T10:30:00Z",
		},
	}, nil
}
