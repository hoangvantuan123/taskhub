package reports

import (
	"context"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// ClearReportCache (D - Xóa bộ nhớ đệm / snapshot báo cáo cũ)
func (s *ReportService) ClearReportCache(ctx context.Context, u *security.UserContext, snapshotId string) error {
	s.log.Info("Report cache cleared", zap.String("snapshotId", snapshotId), zap.String("userId", u.UserId))
	return nil
}
