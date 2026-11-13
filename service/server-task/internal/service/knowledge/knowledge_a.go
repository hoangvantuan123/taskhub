package knowledge

import (
	"context"
	"errors"
	"server-task/internal/domain"
	"server-task/internal/security"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// CreateDoc (A - Tạo tài liệu kiến thức mới)
func (s *KnowledgeService) CreateDoc(ctx context.Context, u *security.UserContext, doc *domain.KnowledgeDoc) (*domain.KnowledgeDoc, error) {
	if doc.Title == "" {
		return nil, errors.New("tiêu đề tài liệu không được để trống")
	}

	doc.IdSeq = uuid.New().String()
	now := time.Now()
	doc.CreatedBy = &u.UserId
	doc.UpdatedBy = &u.UserId
	doc.CreatedAt = now
	doc.UpdatedAt = now
	doc.RowVersion = 1

	s.log.Info("Knowledge document created", zap.String("id", doc.IdSeq), zap.String("title", doc.Title))
	return doc, nil
}
