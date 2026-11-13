BEGIN;

-- Xóa dữ liệu cũ trong _SECPermissionNode
DELETE FROM "_SECPermissionNode";

-- 1. ROOT MODULES (6 MODULE CHÍNH CỦA WORKMANAGER)
INSERT INTO "_SECPermissionNode" ("Id", "ParentId", "Label", "Kind", "Route", "Description", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
VALUES
  ('overview', NULL, '1. TỔNG QUAN', 'Module', '/app', 'Bảng điều khiển và tổng quan hệ thống', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace', NULL, '2. KHÔNG GIAN LÀM VIỆC', 'Module', '/app/tasks/my', 'Công việc, dự án, lịch trình, phê duyệt và tài liệu', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('organization', NULL, '3. TỔ CHỨC & NHÂN SỰ', 'Module', '/admin/employees', 'Quản lý nhân viên, phòng ban và nhóm làm việc', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('analytics', NULL, '4. PHÂN TÍCH & BÁO CÁO', 'Module', '/app/tasks/reports', 'Báo cáo hiệu suất, tiến độ dự án và chỉ số KPI', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system', NULL, '5. QUẢN TRỊ HỆ THỐNG', 'Module', '/admin/users', 'Vai trò phân quyền, quy trình, cấu hình tổ chức và nhật ký', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('personal', NULL, '6. CÁ NHÂN & HỖ TRỢ', 'Module', '/app/settings', 'Thông báo và cài đặt tài khoản cá nhân', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now());

-- 2. NHÓM MENU (PHÂN CẤP CỦA TỪNG MODULE)
INSERT INTO "_SECPermissionNode" ("Id", "ParentId", "Label", "Kind", "Route", "Description", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
VALUES
  -- 1. TỔNG QUAN
  ('overview:dashboard', 'overview', 'Dashboard', 'Nhóm menu', '/app', 'Bảng điều khiển tổng quan', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 2. KHÔNG GIAN LÀM VIỆC
  ('workspace:tasks', 'workspace', 'Công việc', 'Nhóm menu', '/app/tasks/my', 'Quản lý nhiệm vụ và tiến độ thực thi', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:projects', 'workspace', 'Dự án', 'Nhóm menu', '/app/tasks/projects', 'Quản lý danh mục kế hoạch và dự án', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:calendar', 'workspace', 'Kế hoạch & lịch', 'Nhóm menu', '/app/tasks/calendar', 'Lịch làm việc, timeline và Gantt chart', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:approvals', 'workspace', 'Phê duyệt', 'Nhóm menu', '/app/tasks/supervisor', 'Quy trình kiểm tra và nghiệm thu công việc', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:documents', 'workspace', 'Tài liệu', 'Nhóm menu', '/app/tasks/documents', 'Kho lưu trữ hồ sơ và tài liệu đính kèm', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 3. TỔ CHỨC & NHÂN SỰ
  ('organization:employees', 'organization', 'Nhân viên', 'Nhóm menu', '/admin/employees', 'Hồ sơ nhân viên và trạng thái làm việc', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('organization:departments', 'organization', 'Phòng ban', 'Nhóm menu', '/app/organization/departments', 'Cơ cấu phòng ban và sơ đồ tổ chức', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('organization:teams', 'organization', 'Nhóm làm việc', 'Nhóm menu', '/app/organization/teams', 'Đội nhóm chuyên trách và thành viên', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 4. PHÂN TÍCH & BÁO CÁO
  ('analytics:reports', 'analytics', 'Báo cáo & KPI', 'Nhóm menu', '/app/tasks/reports', 'Hệ thống báo cáo chỉ số và thống kê hiệu suất', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 5. QUẢN TRỊ HỆ THỐNG
  ('system:roles', 'system', 'Vai trò & phân quyền', 'Nhóm menu', '/admin/modules', 'Ma trận quyền, nhóm vai trò và tài khoản', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:workflows', 'system', 'Cấu hình quy trình', 'Nhóm menu', '/admin/workflows', 'Trạng thái công việc, quy tắc chuyển tiếp và tự động hóa', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:config', 'system', 'Cấu hình tổ chức', 'Nhóm menu', '/admin/settings/org', 'Thông tin doanh nghiệp và chính sách dữ liệu', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:audit', 'system', 'Nhật ký & giám sát', 'Nhóm menu', '/admin/audit-logs', 'Nhật ký hoạt động, lịch sử truy cập và giám sát', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 6. CÁ NHÂN & HỖ TRỢ
  ('personal:notifications', 'personal', 'Thông báo', 'Nhóm menu', '/notifications', 'Trung tâm thông báo hệ thống', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('personal:account', 'personal', 'Tài khoản cá nhân', 'Nhóm menu', '/app/settings', 'Hồ sơ người dùng và bảo mật', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now());

-- 3. MENU / MÀN HÌNH (CHI TIẾT TỪNG CHỨC NĂNG)
INSERT INTO "_SECPermissionNode" ("Id", "ParentId", "Label", "Kind", "Route", "Description", "ScopeKey", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
VALUES
  -- 1. TỔNG QUAN
  ('overview:dashboard:personal', 'overview:dashboard', 'Tổng quan cá nhân', 'Menu / Màn hình', '/app?tab=personal', 'Thống kê nhiệm vụ cá nhân', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('overview:dashboard:team', 'overview:dashboard', 'Tổng quan nhóm', 'Menu / Màn hình', '/app?tab=team', 'Thống kê tiến độ phòng ban/đội nhóm', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('overview:dashboard:enterprise', 'overview:dashboard', 'Tổng quan doanh nghiệp', 'Menu / Màn hình', '/app?tab=enterprise', 'Toàn cảnh hoạt động công ty', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 2. KHÔNG GIAN LÀM VIỆC - Công việc
  ('workspace:tasks:my', 'workspace:tasks', 'Công việc của tôi', 'Menu / Màn hình', '/app/tasks/my', 'Xem việc được giao, cập nhật tiến độ, báo cáo hoàn thành', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:tasks:all', 'workspace:tasks', 'Tất cả công việc', 'Menu / Màn hình', '/app/tasks', 'Danh sách tổng hợp toàn bộ công việc', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:tasks:kanban', 'workspace:tasks', 'Kanban Board', 'Menu / Màn hình', '/app/tasks?view=kanban', 'Bảng Kanban kéo thả trực quan theo trạng thái', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:tasks:pending', 'workspace:tasks', 'Công việc chờ duyệt', 'Menu / Màn hình', '/app/tasks/supervisor', 'Các nhiệm vụ đang đợi nghiệm thu', 'approvals', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:tasks:overdue', 'workspace:tasks', 'Công việc quá hạn', 'Menu / Màn hình', '/app/tasks?filter=overdue', 'Cảnh báo nhiệm vụ trễ deadline', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:tasks:recurring', 'workspace:tasks', 'Công việc định kỳ', 'Menu / Màn hình', '/app/tasks?filter=recurring', 'Các công việc lặp lại định kỳ', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:tasks:archived', 'workspace:tasks', 'Công việc đã lưu trữ', 'Menu / Màn hình', '/app/tasks?filter=archived', 'Nhiệm vụ đã hoàn tất và đóng lưu trữ', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 2. KHÔNG GIAN LÀM VIỆC - Dự án
  ('workspace:projects:all', 'workspace:projects', 'Tất cả dự án', 'Menu / Màn hình', '/app/tasks/projects', 'Danh mục dự án của doanh nghiệp', 'projects', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:projects:my', 'workspace:projects', 'Dự án của tôi', 'Menu / Màn hình', '/app/tasks/projects?filter=my', 'Dự án do cá nhân quản lý hoặc tham gia', 'projects', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:projects:active', 'workspace:projects', 'Dự án đang triển khai', 'Menu / Màn hình', '/app/tasks/projects?filter=active', 'Dự án đang trong tiến độ thực hiện', 'projects', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:projects:completed', 'workspace:projects', 'Dự án đã hoàn thành', 'Menu / Màn hình', '/app/tasks/projects?filter=completed', 'Dự án đã nghiệm thu đóng thành công', 'projects', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:projects:archived', 'workspace:projects', 'Dự án lưu trữ', 'Menu / Màn hình', '/app/tasks/projects?filter=archived', 'Kho lưu trữ hồ sơ dự án cũ', 'projects', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 2. KHÔNG GIAN LÀM VIỆC - Kế hoạch & lịch
  ('workspace:calendar:tasks', 'workspace:calendar', 'Lịch công việc', 'Menu / Màn hình', '/app/tasks/calendar', 'Lịch công việc ngày, tuần, tháng', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:calendar:timeline', 'workspace:calendar', 'Timeline', 'Menu / Màn hình', '/app/tasks/calendar?view=timeline', 'Dòng thời gian triển khai công việc', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:calendar:gantt', 'workspace:calendar', 'Biểu đồ Gantt', 'Menu / Màn hình', '/app/tasks/calendar?view=gantt', 'Biểu đồ Gantt thể hiện phụ thuộc và tiến độ', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:calendar:workload', 'workspace:calendar', 'Khối lượng công việc', 'Menu / Màn hình', '/app/tasks/calendar?view=workload', 'Theo dõi tải công việc tránh quá tải nhân sự', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:calendar:milestones', 'workspace:calendar', 'Cột mốc quan trọng', 'Menu / Màn hình', '/app/tasks/calendar?view=milestones', 'Mốc mục tiêu quan trọng của dự án', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 2. KHÔNG GIAN LÀM VIỆC - Phê duyệt
  ('workspace:approvals:pending', 'workspace:approvals', 'Chờ tôi phê duyệt', 'Menu / Màn hình', '/app/tasks/supervisor', 'Hàng đợi duyệt nghiệm thu kết quả công việc', 'approvals', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:approvals:my_requests', 'workspace:approvals', 'Yêu cầu của tôi', 'Menu / Màn hình', '/app/tasks/supervisor?tab=my_requests', 'Các yêu cầu phê duyệt do cá nhân gửi', 'approvals', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:approvals:history', 'workspace:approvals', 'Đã xử lý', 'Menu / Màn hình', '/app/tasks/supervisor?tab=history', 'Lịch sử phê duyệt và nghiệm thu', 'approvals', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 2. KHÔNG GIAN LÀM VIỆC - Tài liệu
  ('workspace:documents:all', 'workspace:documents', 'Tất cả tài liệu', 'Menu / Màn hình', '/app/tasks/documents', 'Kho tài liệu dự án và quy trình', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:documents:my', 'workspace:documents', 'Tài liệu của tôi', 'Menu / Màn hình', '/app/tasks/documents?tab=my', 'Hồ sơ do tôi tải lên', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:documents:shared', 'workspace:documents', 'Tài liệu được chia sẻ', 'Menu / Màn hình', '/app/tasks/documents?tab=shared', 'Hồ sơ được chia sẻ trong phòng/dự án', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:documents:trash', 'workspace:documents', 'Thùng rác', 'Menu / Màn hình', '/app/tasks/documents?tab=trash', 'Tài liệu đã xóa tạm thời', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 3. TỔ CHỨC & NHÂN SỰ - Nhân viên
  ('organization:employees:list', 'organization:employees', 'Danh sách nhân viên', 'Menu / Màn hình', '/admin/employees', 'Quản lý nhân sự toàn doanh nghiệp', 'employees', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('organization:employees:profiles', 'organization:employees', 'Hồ sơ nhân viên', 'Menu / Màn hình', '/admin/employees?tab=profiles', 'Thông tin chi tiết hồ sơ cán bộ nhân viên', 'employees', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('organization:employees:invitations', 'organization:employees', 'Lời mời tham gia', 'Menu / Màn hình', '/admin/employees?tab=invitations', 'Mời nhân viên mới vào hệ thống', 'employees', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('organization:employees:inactive', 'organization:employees', 'Nhân viên ngừng hoạt động', 'Menu / Màn hình', '/admin/employees?tab=inactive', 'Danh sách nhân sự đã thôi việc/nghỉ phép', 'employees', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 3. TỔ CHỨC & NHÂN SỰ - Phòng ban
  ('organization:departments:list', 'organization:departments', 'Danh sách phòng ban', 'Menu / Màn hình', '/app/organization/departments', 'Danh mục phòng ban và phân xưởng', 'employees', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('organization:departments:chart', 'organization:departments', 'Sơ đồ tổ chức', 'Menu / Màn hình', '/app/organization/departments?tab=chart', 'Sơ đồ cơ cấu phân cấp doanh nghiệp', 'employees', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('organization:departments:assignments', 'organization:departments', 'Phân công quản lý', 'Menu / Màn hình', '/app/organization/departments?tab=assignments', 'Chỉ định trưởng phòng và người quản lý', 'employees', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 3. TỔ CHỨC & NHÂN SỰ - Nhóm làm việc
  ('organization:teams:list', 'organization:teams', 'Danh sách nhóm', 'Menu / Màn hình', '/app/organization/teams', 'Đội nhóm làm việc chuyên trách', 'employees', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('organization:teams:my', 'organization:teams', 'Nhóm của tôi', 'Menu / Màn hình', '/app/organization/teams?filter=my', 'Các nhóm cá nhân đang tham gia', 'employees', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('organization:teams:members', 'organization:teams', 'Thành viên nhóm', 'Menu / Màn hình', '/app/organization/teams?filter=members', 'Quản lý thành viên trong nhóm', 'employees', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 4. PHÂN TÍCH & BÁO CÁO - Báo cáo & KPI
  ('analytics:reports:overview', 'analytics:reports', 'Tổng quan báo cáo', 'Menu / Màn hình', '/app/tasks/reports', 'Chỉ số thống kê KPI toàn diện', 'reports', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('analytics:reports:tasks', 'analytics:reports', 'Báo cáo công việc', 'Menu / Màn hình', '/app/tasks/reports?tab=tasks', 'Thống kê tình hình thực hiện công việc', 'reports', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('analytics:reports:projects', 'analytics:reports', 'Báo cáo dự án', 'Menu / Màn hình', '/app/tasks/reports?tab=projects', 'Thống kê tiến độ danh mục dự án', 'reports', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('analytics:reports:employees', 'analytics:reports', 'Báo cáo nhân viên', 'Menu / Màn hình', '/app/tasks/reports?tab=employees', 'Đánh giá KPI và hiệu suất từng nhân sự', 'reports', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('analytics:reports:departments', 'analytics:reports', 'Báo cáo phòng ban', 'Menu / Màn hình', '/app/tasks/reports?tab=departments', 'Hiệu suất hoàn thành theo phòng ban', 'reports', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('analytics:reports:deadlines', 'analytics:reports', 'Tiến độ & deadline', 'Menu / Màn hình', '/app/tasks/reports?tab=deadlines', 'Phân tích tỷ lệ đúng hạn và quá hạn', 'reports', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('analytics:reports:performance', 'analytics:reports', 'Hiệu suất & thời gian', 'Menu / Màn hình', '/app/tasks/reports?tab=performance', 'Thời gian hoàn thành trung bình', 'reports', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('analytics:reports:export', 'analytics:reports', 'Xuất báo cáo', 'Menu / Màn hình', '/app/tasks/reports?tab=export', 'Xuất dữ liệu Excel / PDF định kỳ', 'reports', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 5. QUẢN TRỊ HỆ THỐNG - Vai trò & phân quyền
  ('system:roles:groups', 'system:roles', 'Danh sách vai trò', 'Menu / Màn hình', '/admin/modules?tab=groups', 'Quản lý các nhóm vai trò quyền', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:roles:permissions', 'system:roles', 'Danh sách quyền', 'Menu / Màn hình', '/admin/modules?tab=modules', 'Phạm vi quyền chức năng hệ thống', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:roles:users', 'system:roles', 'Gán quyền người dùng', 'Menu / Màn hình', '/admin/users', 'Quản trị tài khoản và cấp quyền theo nhân sự', 'users', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:roles:matrix', 'system:roles', 'Ma trận phân quyền', 'Menu / Màn hình', '/admin/modules?tab=tree', 'Ma trận chức năng và quyền thao tác', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 5. QUẢN TRỊ HỆ THỐNG - Cấu hình quy trình
  ('system:workflows:list', 'system:workflows', 'Danh sách quy trình', 'Menu / Màn hình', '/admin/workflows', 'Quản lý quy trình xử lý công việc', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:workflows:statuses', 'system:workflows', 'Trạng thái công việc', 'Menu / Màn hình', '/admin/workflows?tab=statuses', 'Định nghĩa trạng thái xử lý', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:workflows:rules', 'system:workflows', 'Quy tắc chuyển trạng thái', 'Menu / Màn hình', '/admin/workflows?tab=rules', 'Điều kiện chuyển bước workflow', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:workflows:templates', 'system:workflows', 'Mẫu công việc', 'Menu / Màn hình', '/admin/workflows?tab=templates', 'Mẫu nhiệm vụ định dạng sẵn', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:workflows:automation', 'system:workflows', 'Tự động hóa', 'Menu / Màn hình', '/admin/workflows?tab=automation', 'Quy tắc tự động giao việc và nhắc hạn', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 5. QUẢN TRỊ HỆ THỐNG - Cấu hình tổ chức
  ('system:config:org', 'system:config', 'Thông tin doanh nghiệp', 'Menu / Màn hình', '/admin/settings/org', 'Thông tin pháp nhân và giờ làm việc', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:config:projects', 'system:config', 'Cấu hình dự án', 'Menu / Màn hình', '/admin/settings/org?tab=projects', 'Quy tắc đặt mã dự án và ngân sách', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:config:notifications', 'system:config', 'Cấu hình thông báo', 'Menu / Màn hình', '/admin/settings/org?tab=notifications', 'Cấu hình email và thông báo đẩy', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:config:integrations', 'system:config', 'Tích hợp hệ thống', 'Menu / Màn hình', '/admin/settings/org?tab=integrations', 'Kết nối ERP, HRM và chữ ký số', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:config:data_policy', 'system:config', 'Chính sách dữ liệu', 'Menu / Màn hình', '/admin/settings/org?tab=data-policy', 'Chính sách sao lưu và thời gian lưu trữ', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 5. QUẢN TRỊ HỆ THỐNG - Nhật ký & giám sát
  ('system:audit:activity', 'system:audit', 'Nhật ký hoạt động', 'Menu / Màn hình', '/admin/audit-logs', 'Nhật ký audit trail toàn hệ thống', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:audit:logins', 'system:audit', 'Lịch sử đăng nhập', 'Menu / Màn hình', '/admin/audit-logs?tab=logins', 'Lịch sử phiên đăng nhập người dùng', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:audit:tasks', 'system:audit', 'Tác vụ nền', 'Menu / Màn hình', '/admin/audit-logs?tab=tasks', 'Giám sát tiến trình nền cronjob', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:audit:monitoring', 'system:audit', 'Giám sát hệ thống', 'Menu / Màn hình', '/admin/audit-logs?tab=monitoring', 'Hiệu năng CPU, RAM, cơ sở dữ liệu', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 6. CÁ NHÂN & HỖ TRỢ
  ('personal:notifications:all', 'personal:notifications', 'Tất cả thông báo', 'Menu / Màn hình', '/notifications', 'Trung tâm nhận thông báo', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('personal:notifications:unread', 'personal:notifications', 'Chưa đọc', 'Menu / Màn hình', '/notifications?tab=unread', 'Các thông báo mới chưa đọc', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('personal:account:profile', 'personal:account', 'Hồ sơ cá nhân', 'Menu / Màn hình', '/app/settings', 'Xem và cập nhật thông tin cá nhân', 'settings', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('personal:account:security', 'personal:account', 'Bảo mật tài khoản', 'Menu / Màn hình', '/app/settings?tab=security', 'Đổi mật khẩu và xác thực', 'settings', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('personal:account:notifications', 'personal:account', 'Tùy chọn thông báo', 'Menu / Màn hình', '/app/settings?tab=notifications', 'Tùy chỉnh nhận thông báo', 'settings', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('personal:account:appearance', 'personal:account', 'Tùy chỉnh giao diện', 'Menu / Màn hình', '/app/settings?tab=appearance', 'Giao diện sáng tối và kích thước chữ', 'settings', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now());

COMMIT;

