package reports

import (
	"context"
	"server-task/internal/security"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// GenerateSnapshot (A - Khởi tạo snapshot lưu trữ báo cáo định kỳ)
func (s *ReportService) GenerateSnapshot(ctx context.Context, u *security.UserContext, title string) (string, error) {
	snapshotId := uuid.New().String()
	s.log.Info("Report snapshot generated",
		zap.String("snapshotId", snapshotId),
		zap.String("title", title),
		zap.Time("time", time.Now()),
	)
	return snapshotId, nil
}
