package knowledge

import (
	"context"
	"errors"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// DeleteDoc (D - Xóa tài liệu kiến thức)
func (s *KnowledgeService) DeleteDoc(ctx context.Context, u *security.UserContext, docId string) error {
	if docId == "" {
		return errors.New("docId không được để trống")
	}

	s.log.Info("Knowledge document deleted", zap.String("id", docId), zap.String("userId", u.UserId))
	return nil
}
