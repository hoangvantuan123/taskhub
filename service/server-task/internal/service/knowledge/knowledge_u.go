package knowledge

import (
	"context"
	"errors"
	"server-task/internal/domain"
	"server-task/internal/security"
	"time"

	"go.uber.org/zap"
)

// UpdateDoc (U - Cập nhật nội dung tài liệu kiến thức)
func (s *KnowledgeService) UpdateDoc(ctx context.Context, u *security.UserContext, doc *domain.KnowledgeDoc) (*domain.KnowledgeDoc, error) {
	if doc.IdSeq == "" {
		return nil, errors.New("IdSeq tài liệu không được để trống")
	}

	now := time.Now()
	doc.UpdatedBy = &u.UserId
	doc.UpdatedAt = now
	doc.RowVersion++

	s.log.Info("Knowledge document updated", zap.String("id", doc.IdSeq), zap.String("title", doc.Title))
	return doc, nil
}
