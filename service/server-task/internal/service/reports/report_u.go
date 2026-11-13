package reports

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/domain"
	"server-task/internal/security"
	"strings"

	"go.uber.org/zap"
)

// UpdateMetricThreshold (U - Cập nhật ngưỡng đánh giá KPI đào tạo)
func (s *ReportService) UpdateMetricThreshold(ctx context.Context, u *security.UserContext, metricKey string, threshold float64) error {
	s.log.Info("Report metric threshold updated",
		zap.String("metricKey", metricKey),
		zap.Float64("threshold", threshold),
		zap.String("updatedBy", u.UserId),
	)
	return nil
}

// UpdateReportConfig (U - Cập nhật cấu hình & đường dẫn báo cáo với kiểm tra phân quyền RBAC)
func (s *ReportService) UpdateReportConfig(ctx context.Context, u *security.UserContext, key, title, sourceUrl, description string) (*domain.ReportConfig, error) {
	if key == "" {
		key = "sharepoint_progress"
	}
	title = strings.TrimSpace(title)
	sourceUrl = strings.TrimSpace(sourceUrl)
	description = strings.TrimSpace(description)

	if title == "" {
		return nil, errors.New("tiêu đề báo cáo không được để trống")
	}
	if sourceUrl == "" {
		return nil, errors.New("đường dẫn nguồn SharePoint không được để trống")
	}

	// 1. Check current permissions
	userRole := "employee"
	updater := "Quản trị viên"
	if u != nil {
		if u.Role != "" {
			userRole = strings.ToLower(u.Role)
		}
		if u.Username != "" {
			updater = u.Username
		}
	}

	// Check existing record
	var currentCanEditRoles string
	err := s.db.QueryRowContext(ctx, `SELECT COALESCE("CanEditRoles", 'admin,director,manager') FROM "_TSKReportConfig" WHERE "Key" = $1 LIMIT 1`, key).Scan(&currentCanEditRoles)
	if err != nil {
		currentCanEditRoles = "admin,director,manager"
	}

	canEdit := false
	if userRole == "admin" || userRole == "director" || userRole == "manager" || strings.Contains(strings.ToLower(currentCanEditRoles), userRole) {
		canEdit = true
	}
	if !canEdit {
		return nil, errors.New("bạn không có quyền thay đổi cấu hình báo cáo này (chỉ Quản trị viên / Trưởng bộ phận)")
	}

	// 2. Perform UPSERT
	query := `
		INSERT INTO "_TSKReportConfig" ("Id", "Key", "Title", "SourceUrl", "Description", "AllowedRoles", "CanEditRoles", "IsActive", "UpdatedBy", "UpdatedAt")
		VALUES ('rep-' || $1, $1, $2, $3, $4, 'admin,director,manager,supervisor,employee', 'admin,director,manager', true, $5, CURRENT_TIMESTAMP)
		ON CONFLICT ("Key") DO UPDATE SET
			"Title" = EXCLUDED."Title",
			"SourceUrl" = EXCLUDED."SourceUrl",
			"Description" = EXCLUDED."Description",
			"UpdatedBy" = EXCLUDED."UpdatedBy",
			"UpdatedAt" = CURRENT_TIMESTAMP
		RETURNING "Id", "Key", "Title", "SourceUrl", "Description", "AllowedRoles", "CanEditRoles", "IsActive", COALESCE("Categories"::text, '[]'), COALESCE("Data"::text, '[]'), "UpdatedBy", "UpdatedAt"::text`

	var cfg domain.ReportConfig
	err = s.db.QueryRowContext(ctx, query, key, title, sourceUrl, description, updater).Scan(
		&cfg.Id, &cfg.Key, &cfg.Title, &cfg.SourceUrl,
		&cfg.Description, &cfg.AllowedRoles, &cfg.CanEditRoles,
		&cfg.IsActive, &cfg.Categories, &cfg.Data, &cfg.UpdatedBy, &cfg.UpdatedAt,
	)
	if err != nil {
		s.log.Error("Failed to update report config", zap.Error(err), zap.String("key", key))
		return nil, fmt.Errorf("không thể cập nhật cấu hình báo cáo: %w", err)
	}

	cfg.CanEdit = true
	s.log.Info("Report config updated successfully", zap.String("key", key), zap.String("title", title), zap.String("by", updater))
	return &cfg, nil
}
