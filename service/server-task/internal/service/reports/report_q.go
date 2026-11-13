package reports

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"server-task/internal/domain"
	"server-task/internal/security"
	"strings"

	"go.uber.org/zap"
)

// GetSummary (Q - Query báo cáo tổng quan chỉ số đào tạo và thi cử)
func (s *ReportService) GetSummary(ctx context.Context, u *security.UserContext) (*domain.ReportSummary, error) {
	var summary domain.ReportSummary

	query := `
		SELECT 
			COALESCE(count(DISTINCT "UserId"), 0) AS "TotalCandidates",
			COALESCE(count(DISTINCT "ExamSessionId"), 0) AS "TotalSessions",
			COALESCE(count(*) FILTER (WHERE "IsPassed" = true), 0) AS "TotalPassed",
			COALESCE(count(*) FILTER (WHERE "IsPassed" = false AND "GradingStatus" = 'graded'), 0) AS "TotalFailed",
			COALESCE(avg("TotalScore"), 0) AS "AverageScore"
		FROM "_ASMExamAttempt"`

	err := s.db.QueryRowContext(ctx, query).Scan(
		&summary.TotalCandidates,
		&summary.TotalSessions,
		&summary.TotalPassed,
		&summary.TotalFailed,
		&summary.AverageScore,
	)
	if err != nil {
		s.log.Error("Failed to query report summary", zap.Error(err))
		return &domain.ReportSummary{}, nil
	}

	totalGraded := summary.TotalPassed + summary.TotalFailed
	if totalGraded > 0 {
		summary.PassRate = (float64(summary.TotalPassed) / float64(totalGraded)) * 100
	}

	return &summary, nil
}

// GetDepartmentStats (Q - Query thống kê thi cử theo phòng ban)
func (s *ReportService) GetDepartmentStats(ctx context.Context, u *security.UserContext) ([]domain.DepartmentExamStat, error) {
	query := `
		SELECT 
			COALESCE(NULLIF(usr."Department", ''), 'Chưa phân bổ') AS "DepartmentName",
			count(att."IdSeq") AS "CandidateCount",
			count(att."IdSeq") FILTER (WHERE att."IsPassed" = true) AS "PassCount",
			COALESCE(avg(att."TotalScore"), 0) AS "AverageScore"
		FROM "_ASMExamAttempt" att
		LEFT JOIN "_USRAccountDirectory" usr ON usr."Id" = att."UserId"
		WHERE att."GradingStatus" = 'graded'
		GROUP BY usr."Department"
		ORDER BY "CandidateCount" DESC`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		s.log.Error("Failed to query department stats", zap.Error(err))
		return nil, nil
	}
	defer rows.Close()

	var stats []domain.DepartmentExamStat
	for rows.Next() {
		var stat domain.DepartmentExamStat
		var passCount int
		if err := rows.Scan(&stat.DepartmentName, &stat.CandidateCount, &passCount, &stat.AverageScore); err == nil {
			stat.PassCount = passCount
			if stat.CandidateCount > 0 {
				stat.PassRate = (float64(stat.PassCount) / float64(stat.CandidateCount)) * 100
			}
			stats = append(stats, stat)
		}
	}

	return stats, nil
}

// GetReportConfig (Q - Lấy cấu hình báo cáo theo key với kiểm tra phân quyền)
func (s *ReportService) GetReportConfig(ctx context.Context, u *security.UserContext, key string) (*domain.ReportConfig, error) {
	if key == "" {
		key = "sharepoint_progress"
	}

	query := `
		SELECT 
			"Id", "Key", "Title", "SourceUrl", 
			COALESCE("Description", '') AS "Description",
			COALESCE("AllowedRoles", 'admin,director,manager,supervisor,employee') AS "AllowedRoles",
			COALESCE("CanEditRoles", 'admin,director,manager') AS "CanEditRoles",
			COALESCE("IsActive", true) AS "IsActive",
			COALESCE("Categories"::text, '[]') AS "Categories",
			COALESCE("Data"::text, '[]') AS "Data",
			COALESCE("UpdatedBy", '') AS "UpdatedBy",
			COALESCE("UpdatedAt"::text, '') AS "UpdatedAt"
		FROM "_TSKReportConfig"
		WHERE "Key" = $1
		LIMIT 1`

	var cfg domain.ReportConfig
	err := s.db.QueryRowContext(ctx, query, key).Scan(
		&cfg.Id, &cfg.Key, &cfg.Title, &cfg.SourceUrl,
		&cfg.Description, &cfg.AllowedRoles, &cfg.CanEditRoles,
		&cfg.IsActive, &cfg.Categories, &cfg.Data, &cfg.UpdatedBy, &cfg.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Fallback default
			return &domain.ReportConfig{
				Id:           "rep-sharepoint-01",
				Key:          key,
				Title:        "Báo cáo tiến độ SharePoint",
				SourceUrl:    "https://goldsunpackagingvn-my.sharepoint.com/:x:/g/personal/tuanhv_goldsun_com_vn/ETPMS_Tien_Do_Bao_Cao_Cong_Viec_2026",
				Description:  "Theo dõi tiến độ báo cáo công việc các bộ phận, chuyên viên theo danh mục phân cấp và tăng trưởng từ SharePoint Goldsun",
				AllowedRoles: "admin,director,manager,supervisor,employee",
				CanEditRoles: "admin,director,manager",
				IsActive:     true,
				Categories:   `["Sản xuất", "Kho", "Dashboard", "Biên bản họp", "Đào tạo/ theo dõi"]`,
				Data:         `[{"id":"sp-task-1","stt":1,"requestDate":"4/11/2026","requestDepartment":"","requester":"","module":"Sản xuất","feature":"Lệnh triển khai","description":"Báo cáo thể hiện được các cđ chưa được kéo lệnh triển khai từ đơn hàng bán SO -> thêm cột trạng thái đã kéo ltk và cột đóng đơn hàng","directImpact":"","receivingDepartment":"ERP","receiver":"Mrs Phương","completionTime":"6/11/2026","status":"in_progress","statusLabel":"chưa hoàn thành","priority":"","actionPlan":"Trao đổi với brv hoàn thiện yêu cầu","assigneeOrWatcher":"","deadline":"","secondaryCategory":""},{"id":"sp-task-2","stt":2,"requestDate":"6/11/2026","requestDepartment":"","requester":"","module":"Sản xuất","feature":"Lệnh thao tác","description":"Thêm cột thời gian tạo, thời gian sửa trên chi tiết từng dòng lệnh thao tác","directImpact":"","receivingDepartment":"ERP","receiver":"Mrs Phương","completionTime":"6/11/2026","status":"completed","statusLabel":"Hoàn thành","priority":"","actionPlan":"Trao đổi với brv hoàn thiện yêu cầu","assigneeOrWatcher":"","deadline":"6/11/2026","secondaryCategory":""},{"id":"sp-task-3","stt":3,"requestDate":"9/11/2026","requestDepartment":"ERP","requester":"Mrs Phương","module":"Kho","feature":"Phân tích toàn trình module kho","description":"Phân tích toàn trình module kho BRV - Kho MES\n1.  hoàn thiện báo cáo vướng mắc cần xử lý nếu có để giảm thao tác cho người dùng và mapping với thiết kế mới của MES chỗ Mr Hoàn EPS\n2. Hoàn thiện yêu cầu của Mr Cường\n 3. Tổng hợp toàn bộ hướng dẫn sử dụng phần MES của Mr Hoàn/ phần Brv đang có/ hình ảnh test","directImpact":"ko nắm rõ logic ko hỗ trợ và phân tích qui trình chuẩn được","receivingDepartment":"ERP","receiver":"Mrs Thương","completionTime":"","status":"in_progress","statusLabel":"chưa hoàn thành","priority":"Ưu tiên","actionPlan":"Mr Khiêm làm việc với Brv, Thương đi sâu vào tìm hiểu phân tích\n-> hoàn thiện báo cáo vướng mắc cần xử lý nếu có để giảm thao tác cho người dùng và mapping với thiết kế mới của MES chỗ Mr Hoàn EPS","assigneeOrWatcher":"Mrs Thương","deadline":"15/11/2026","secondaryCategory":""},{"id":"sp-task-4","stt":4,"requestDate":"7/11/2026","requestDepartment":"ERP","requester":"Mrs Phương","module":"Dashboard","feature":"Theo dõi tiến độ công việc","description":"Tuấn xây dashboard quản lý, theo dõi tiến độ báo cáo công việc của mn trong phòng kèm biểu đồ tăng trưởng","directImpact":"Theo dõi phân tích khối lượng công việc trong phòng","receivingDepartment":"ERP","receiver":"Mr Tuấn","completionTime":"","status":"in_progress","statusLabel":"chưa hoàn thành","priority":"Ưu tiên","actionPlan":"Xây dựng web  quản lý công việc tạo công việc, theo dõi các công việc, giao việc, \nXây dựng báo cáo phân tích biểu đồ tiến độ công việc","assigneeOrWatcher":"Mrs Phương","deadline":"15/11/2026","secondaryCategory":""},{"id":"sp-task-5","stt":5,"requestDate":"7/11/2026","requestDepartment":"ERP","requester":"Mrs Phương","module":"Biên bản họp","feature":"Giao ban hàng ngày","description":"1. nhận file ghi âm\n2. chạy AI ra biên bản họp\n3. đẩy các đầu việc sau họp vào sheet \"đầu việc sau họp GB MES\" trên link chung","directImpact":"Theo dõi nội dung thống nhất, đầu việc liên quan dự án MES","receivingDepartment":"ERP","receiver":"Mr Minh","completionTime":"","status":"recurring","statusLabel":"Theo dõi hàng ngày","priority":"","actionPlan":"Mr Minh theo dõi và hoàn thiện hàng ngày","assigneeOrWatcher":"Mrs Phương","deadline":"","secondaryCategory":""},{"id":"sp-task-6","stt":6,"requestDate":"7/11/2026","requestDepartment":"ERP","requester":"Mrs Phương","module":"Đào tạo/ theo dõi","feature":"Toolkit","description":"Đào tạo, theo dõi Mr Tuấn Anh đpsx 1A thực hiện hàng ngày. Tiếp nhận, hoàn thiện yêu cầu chỉnh sửa nếu có","directImpact":"","receivingDepartment":"ERP","receiver":"Mr Tuấn","completionTime":"11/9/2026","status":"completed","statusLabel":"Hoàn Thành","priority":"","actionPlan":"Đào tạo sử dụng 3 chức năng quyết toán lệnh công đoạn, lệnh thao tác, dời ngày thao tác","assigneeOrWatcher":"Mr Tuấn","deadline":"11/9/2026","secondaryCategory":""},{"id":"sp-task-7","stt":7,"requestDate":"7/11/2026","requestDepartment":"ERP","requester":"Mrs Phương","module":"Sản xuất","feature":"Báo cáo P3","description":"Thêm c cột ngày sửa của chi tiết ltt ở báo cáo P3","directImpact":"","receivingDepartment":"ERP","receiver":"Mrs Phương","completionTime":"","status":"in_progress","statusLabel":"chưa hoàn thành","priority":"","actionPlan":"Trao đổi với brv hoàn thiện yêu cầu","assigneeOrWatcher":"Mrs Phương","deadline":"","secondaryCategory":""}]`,
				UpdatedBy:    "Hệ thống",
				CanEdit:      true,
			}, nil
		}
		s.log.Error("Failed to query report config", zap.Error(err), zap.String("key", key))
		return nil, fmt.Errorf("không thể tải cấu hình báo cáo: %w", err)
	}

	userRole := "employee"
	if u != nil && u.Role != "" {
		userRole = strings.ToLower(u.Role)
	}

	// RBAC View check:
	canView := false
	if userRole == "admin" || userRole == "director" || userRole == "manager" || strings.Contains(strings.ToLower(cfg.AllowedRoles), userRole) {
		canView = true
	}
	if !canView {
		return nil, errors.New("bạn không có quyền truy cập báo cáo này")
	}

	// RBAC Edit check:
	if userRole == "admin" || userRole == "director" || userRole == "manager" || strings.Contains(strings.ToLower(cfg.CanEditRoles), userRole) {
		cfg.CanEdit = true
	} else {
		cfg.CanEdit = false
	}

	return &cfg, nil
}
