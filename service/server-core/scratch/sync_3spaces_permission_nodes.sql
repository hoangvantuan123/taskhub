BEGIN;

-- Xóa các node cũ trong _SECPermissionNode
DELETE FROM "_SECPermissionNode";

-- 1. ROOT MODULES (3 KHÔNG GIAN + CHUNG & CÁ NHÂN)
INSERT INTO "_SECPermissionNode" ("Id", "ParentId", "Label", "Kind", "Route", "Description", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
VALUES
  ('workspace', NULL, 'Không gian Làm việc', 'Module', '', 'Không gian làm việc cá nhân và tiến độ', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management', NULL, 'Không gian Quản lý', 'Module', '', 'Không gian quản lý, giao việc và nhân sự', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system', NULL, 'Không gian Hệ thống', 'Module', '', 'Quản trị hệ thống, tài khoản và phân quyền', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('personal', NULL, 'Chung & Cá nhân', 'Module', '', 'Tiện ích cá nhân và thiết lập', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now());

-- 2. NHÓM MENU
INSERT INTO "_SECPermissionNode" ("Id", "ParentId", "Label", "Kind", "Route", "Description", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
VALUES
  -- Trong Không gian Làm việc:
  ('workspace:tasks', 'workspace', 'Công việc & Lịch trình', 'Nhóm menu', '', 'Công việc cá nhân, lịch trình và báo cáo', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  
  -- Trong Không gian Quản lý:
  ('management:tasks', 'management', 'Điều hành công việc & Dự án', 'Nhóm menu', '', 'Giao việc cấp bậc, dự án và nghiệm thu', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:org', 'management', 'Cơ cấu & Nhân sự', 'Nhóm menu', '', 'Hồ sơ nhân viên và cơ cấu tổ chức', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  
  -- Trong Không gian Hệ thống:
  ('system:admin', 'system', 'Quản trị hệ thống & Cấu hình', 'Nhóm menu', '', 'Tài khoản người dùng, phân quyền và danh mục', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- Trong Chung & Cá nhân:
  ('personal:utilities', 'personal', 'Tiện ích cá nhân', 'Nhóm menu', '', 'Trang chủ, thông báo và cài đặt cá nhân', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now());

-- 3. MENU / MÀN HÌNH
INSERT INTO "_SECPermissionNode" ("Id", "ParentId", "Label", "Kind", "Route", "Description", "ScopeKey", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
VALUES
  -- 1. KHÔNG GIAN LÀM VIỆC:
  ('workspace:tasks:menu:my', 'workspace:tasks', 'Công việc của tôi', 'Menu / Màn hình', '/app/tasks/my', 'Xem nhiệm vụ được giao, cập nhật tiến độ, báo cáo hoàn thành', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:tasks:menu:calendar', 'workspace:tasks', 'Lịch & Hạn chót', 'Menu / Màn hình', '/app/tasks/calendar', 'Lịch công việc cá nhân, deadline và mốc hạn', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('workspace:tasks:menu:reports', 'workspace:tasks', 'Báo cáo & Thống kê KPI', 'Menu / Màn hình', '/app/tasks/reports', 'Theo dõi hiệu suất làm việc và tỷ lệ hoàn thành', 'reports', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 2. KHÔNG GIAN QUẢN LÝ:
  ('management:tasks:menu:delegated', 'management:tasks', 'Cấp bậc & Giao việc', 'Menu / Màn hình', '/app/tasks/delegated', 'Giao việc 4 cấp bậc (Công ty, Phòng ban, Dự án, Tổ nhóm)', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:list', 'management:tasks', 'Bảng công việc toàn diện', 'Menu / Màn hình', '/app/tasks', 'Quản lý danh sách công việc toàn công ty và Kanban', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:projects', 'management:tasks', 'Kế hoạch & Dự án', 'Menu / Màn hình', '/app/tasks/projects', 'Quản lý dự án, mốc tiến độ và phân bổ nguồn lực', 'projects', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:approvals', 'management:tasks', 'Quy trình & Phê duyệt', 'Menu / Màn hình', '/app/tasks/supervisor', 'Quy trình nghiệm thu, phê duyệt hoàn thành hoặc yêu cầu làm lại', 'approvals', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:org:menu:employees', 'management:org', 'Hồ sơ & Quản lý nhân sự', 'Menu / Màn hình', '/admin/employees', 'Hồ sơ nhân viên, cấp bậc, đơn vị và liên kết tài khoản', 'employees', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:org:menu:teams', 'management:org', 'Cơ cấu & Đội nhóm', 'Menu / Màn hình', '/app/organization/teams', 'Sơ đồ cơ cấu tổ chức, phòng ban và đội nhóm làm việc', 'employees', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 3. KHÔNG GIAN HỆ THỐNG:
  ('system:admin:menu:users', 'system:admin', 'Tài khoản người dùng', 'Menu / Màn hình', '/admin/users', 'Quản trị tài khoản đăng nhập (liên kết với Hồ sơ nhân sự)', 'users', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:admin:menu:modules', 'system:admin', 'Module & Phân quyền', 'Menu / Màn hình', '/admin/modules', 'Đăng ký module hệ thống, cây phân cấp chức năng và phân quyền vai trò', 'modules', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:admin:menu:catalog', 'system:admin', 'Danh mục hệ thống', 'Menu / Màn hình', '/admin/catalog', 'Danh mục cấp bậc, phòng ban, vị trí và tham số cấu hình', 'catalog', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- 4. CHUNG & CÁ NHÂN:
  ('personal:utilities:menu:dashboard', 'personal:utilities', 'Tổng quan công việc', 'Menu / Màn hình', '/app', 'Bảng điều khiển tổng quan cá nhân và công ty', 'tasks', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('personal:utilities:menu:settings', 'personal:utilities', 'Cài đặt cá nhân', 'Menu / Màn hình', '/app/settings', 'Đổi mật khẩu, cài đặt giao diện và hồ sơ cá nhân', 'settings', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('personal:utilities:menu:notifications', 'personal:utilities', 'Thông báo', 'Menu / Màn hình', '/notifications', 'Thông báo nhắc việc, phê duyệt và quá hạn', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now());

-- 4. CHỨC NĂNG & QUYỀN THAO TÁC CƠ BẢN
-- tasks:view, create, update, delete
INSERT INTO "_SECPermissionNode" ("Id", "ParentId", "Label", "Kind", "Route", "Description", "ScopeKey", "Action", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt")
VALUES
  -- Tasks functions
  ('management:tasks:menu:list:func:0', 'management:tasks:menu:list', 'Xem công việc', 'Chức năng', '/app/tasks', 'Xem danh sách / chi tiết', 'tasks', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:list:func:0:view', 'management:tasks:menu:list:func:0', 'Xem danh sách / chi tiết', 'Quyền thao tác', 'tasks:view', 'Quyền xem công việc', 'tasks', 'view', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:list:func:1', 'management:tasks:menu:list', 'Tạo công việc', 'Chức năng', '/app/tasks/create', 'Giao việc mới', 'tasks', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:list:func:1:create', 'management:tasks:menu:list:func:1', 'Thêm mới', 'Quyền thao tác', 'tasks:create', 'Quyền tạo công việc', 'tasks', 'create', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:list:func:2', 'management:tasks:menu:list', 'Cập nhật công việc', 'Chức năng', '/app/tasks/edit', 'Chỉnh sửa công việc', 'tasks', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:list:func:2:update', 'management:tasks:menu:list:func:2', 'Chỉnh sửa', 'Quyền thao tác', 'tasks:update', 'Quyền sửa công việc', 'tasks', 'update', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:list:func:3', 'management:tasks:menu:list', 'Xóa công việc', 'Chức năng', '/app/tasks/delete', 'Xóa công việc', 'tasks', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:list:func:3:delete', 'management:tasks:menu:list:func:3', 'Xóa', 'Quyền thao tác', 'tasks:delete', 'Quyền xóa công việc', 'tasks', 'delete', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- Approvals functions
  ('management:tasks:menu:approvals:func:0', 'management:tasks:menu:approvals', 'Xem phê duyệt', 'Chức năng', '/app/tasks/supervisor', 'Xem danh sách chờ duyệt', 'approvals', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:approvals:func:0:view', 'management:tasks:menu:approvals:func:0', 'Xem danh sách / chi tiết', 'Quyền thao tác', 'approvals:view', 'Quyền xem duyệt', 'approvals', 'view', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:approvals:func:1', 'management:tasks:menu:approvals', 'Phê duyệt nghiệm thu', 'Chức năng', '/app/tasks/supervisor/approve', 'Nghiệm thu hoàn thành', 'approvals', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:approvals:func:1:approve', 'management:tasks:menu:approvals:func:1', 'Phê duyệt', 'Quyền thao tác', 'approvals:approve', 'Quyền duyệt nghiệm thu', 'approvals', 'approve', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:approvals:func:2', 'management:tasks:menu:approvals', 'Từ chối làm lại', 'Chức năng', '/app/tasks/supervisor/reject', 'Yêu cầu làm lại', 'approvals', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:approvals:func:2:reject', 'management:tasks:menu:approvals:func:2', 'Từ chối', 'Quyền thao tác', 'approvals:reject', 'Quyền từ chối', 'approvals', 'reject', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- Projects functions
  ('management:tasks:menu:projects:func:0', 'management:tasks:menu:projects', 'Xem dự án', 'Chức năng', '/app/tasks/projects', 'Xem danh mục dự án', 'projects', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:projects:func:0:view', 'management:tasks:menu:projects:func:0', 'Xem danh sách / chi tiết', 'Quyền thao tác', 'projects:view', 'Quyền xem dự án', 'projects', 'view', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:projects:func:1', 'management:tasks:menu:projects', 'Thêm dự án', 'Chức năng', '/app/tasks/projects/create', 'Tạo dự án mới', 'projects', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:tasks:menu:projects:func:1:create', 'management:tasks:menu:projects:func:1', 'Thêm mới', 'Quyền thao tác', 'projects:create', 'Quyền tạo dự án', 'projects', 'create', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- Employees functions
  ('management:org:menu:employees:func:0', 'management:org:menu:employees', 'Xem nhân sự', 'Chức năng', '/admin/employees', 'Xem danh sách nhân sự', 'employees', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:org:menu:employees:func:0:view', 'management:org:menu:employees:func:0', 'Xem danh sách / chi tiết', 'Quyền thao tác', 'employees:view', 'Quyền xem nhân sự', 'employees', 'view', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:org:menu:employees:func:1', 'management:org:menu:employees', 'Thêm nhân sự', 'Chức năng', '/admin/employees/create', 'Thêm hồ sơ nhân viên', 'employees', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('management:org:menu:employees:func:1:create', 'management:org:menu:employees:func:1', 'Thêm mới', 'Quyền thao tác', 'employees:create', 'Quyền thêm nhân sự', 'employees', 'create', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- Users functions
  ('system:admin:menu:users:func:0', 'system:admin:menu:users', 'Xem tài khoản', 'Chức năng', '/admin/users', 'Xem danh sách tài khoản', 'users', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:admin:menu:users:func:0:view', 'system:admin:menu:users:func:0', 'Xem danh sách / chi tiết', 'Quyền thao tác', 'users:view', 'Quyền xem tài khoản', 'users', 'view', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:admin:menu:users:func:1', 'system:admin:menu:users', 'Tạo tài khoản', 'Chức năng', '/admin/users/create', 'Tạo tài khoản người dùng', 'users', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:admin:menu:users:func:1:create', 'system:admin:menu:users:func:1', 'Thêm mới', 'Quyền thao tác', 'users:create', 'Quyền tạo tài khoản', 'users', 'create', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- Modules functions
  ('system:admin:menu:modules:func:0', 'system:admin:menu:modules', 'Xem module & phân quyền', 'Chức năng', '/admin/modules', 'Xem cấu trúc module và phân quyền', 'modules', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:admin:menu:modules:func:0:view', 'system:admin:menu:modules:func:0', 'Xem danh sách / chi tiết', 'Quyền thao tác', 'modules:view', 'Quyền xem module', 'modules', 'view', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),

  -- Catalog functions
  ('system:admin:menu:catalog:func:0', 'system:admin:menu:catalog', 'Xem danh mục', 'Chức năng', '/admin/catalog', 'Xem danh mục hệ thống', 'catalog', NULL, '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now()),
  ('system:admin:menu:catalog:func:0:view', 'system:admin:menu:catalog:func:0', 'Xem danh sách / chi tiết', 'Quyền thao tác', 'catalog:view', 'Quyền xem danh mục', 'catalog', 'view', '01a14802-9765-7cdb-922e-357b570d1809', '01a14802-9765-7cdb-922e-357b570d1809', now(), now());

COMMIT;

