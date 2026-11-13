#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json

ACTOR_ID = '01a14802-9765-7cdb-922e-357b570d1809'

# 1. Root Modules
modules = [
  ('overview', None, '1. TỔNG QUAN', 'Module', '/app', 'Bảng điều khiển và tổng quan hệ thống'),
  ('workspace', None, '2. KHÔNG GIAN LÀM VIỆC', 'Module', '/app/tasks/my', 'Công việc, dự án, lịch trình, phê duyệt và tài liệu'),
  ('organization', None, '3. TỔ CHỨC & NHÂN SỰ', 'Module', '/admin/employees', 'Quản lý nhân viên, phòng ban và nhóm làm việc'),
  ('analytics', None, '4. PHÂN TÍCH & BÁO CÁO', 'Module', '/app/tasks/reports', 'Báo cáo hiệu suất, tiến độ dự án và chỉ số KPI'),
  ('system', None, '5. QUẢN TRỊ HỆ THỐNG', 'Module', '/admin/users', 'Vai trò phân quyền, quy trình, cấu hình tổ chức và nhật ký'),
  ('personal', None, '6. CÁ NHÂN & HỖ TRỢ', 'Module', '/app/settings', 'Thông báo và cài đặt tài khoản cá nhân'),
]

# 2. Nhóm Menu
groups = [
  ('overview:dashboard', 'overview', 'Dashboard', 'Nhóm menu', '/app', 'Bảng điều khiển tổng quan'),
  ('workspace:tasks', 'workspace', 'Công việc', 'Nhóm menu', '/app/tasks/my', 'Quản lý nhiệm vụ và tiến độ thực thi'),
  ('workspace:projects', 'workspace', 'Dự án', 'Nhóm menu', '/app/tasks/projects', 'Quản lý danh mục kế hoạch và dự án'),
  ('workspace:calendar', 'workspace', 'Kế hoạch & lịch', 'Nhóm menu', '/app/tasks/calendar', 'Lịch làm việc, timeline và Gantt chart'),
  ('workspace:approvals', 'workspace', 'Phê duyệt', 'Nhóm menu', '/app/tasks/supervisor', 'Quy trình kiểm tra và nghiệm thu công việc'),
  ('workspace:documents', 'workspace', 'Tài liệu', 'Nhóm menu', '/app/tasks/documents', 'Kho lưu trữ hồ sơ và tài liệu đính kèm'),
  ('organization:employees', 'organization', 'Nhân viên', 'Nhóm menu', '/admin/employees', 'Hồ sơ nhân viên và trạng thái làm việc'),
  ('organization:departments', 'organization', 'Phòng ban', 'Nhóm menu', '/app/organization/departments', 'Cơ cấu phòng ban và sơ đồ tổ chức'),
  ('organization:teams', 'organization', 'Nhóm làm việc', 'Nhóm menu', '/app/organization/teams', 'Đội nhóm chuyên trách và thành viên'),
  ('analytics:reports', 'analytics', 'Báo cáo & KPI', 'Nhóm menu', '/app/tasks/reports', 'Hệ thống báo cáo chỉ số và thống kê hiệu suất'),
  ('system:roles', 'system', 'Vai trò & phân quyền', 'Nhóm menu', '/admin/modules', 'Ma trận quyền, nhóm vai trò và tài khoản'),
  ('system:workflows', 'system', 'Cấu hình quy trình', 'Nhóm menu', '/admin/workflows', 'Trạng thái công việc, quy tắc chuyển tiếp và tự động hóa'),
  ('system:config', 'system', 'Cấu hình tổ chức', 'Nhóm menu', '/admin/settings/org', 'Thông tin doanh nghiệp và chính sách dữ liệu'),
  ('system:audit', 'system', 'Nhật ký & giám sát', 'Nhóm menu', '/admin/audit-logs', 'Nhật ký hoạt động, lịch sử truy cập và giám sát'),
  ('personal:notifications', 'personal', 'Thông báo', 'Nhóm menu', '/notifications', 'Trung tâm thông báo hệ thống'),
  ('personal:account', 'personal', 'Tài khoản cá nhân', 'Nhóm menu', '/app/settings', 'Hồ sơ người dùng và bảo mật'),
]

# 3. Screens (Menu / Màn hình) & their Functions & Actions
# Format: (id, parent_id, label, route, desc, scope_key, functions)
# where function = (func_label, func_route, [(action_key, action_label)])
screens = [
  # 1. TỔNG QUAN
  ('overview:dashboard:personal', 'overview:dashboard', 'Tổng quan cá nhân', '/app?tab=personal', 'Thống kê nhiệm vụ cá nhân', 'tasks', [
    ('Xem tổng quan cá nhân', '/app?tab=personal', [('view', 'Xem chi tiết')])
  ]),
  ('overview:dashboard:team', 'overview:dashboard', 'Tổng quan nhóm', '/app?tab=team', 'Thống kê tiến độ phòng ban/đội nhóm', 'tasks', [
    ('Xem tổng quan nhóm', '/app?tab=team', [('view', 'Xem chi tiết')])
  ]),
  ('overview:dashboard:enterprise', 'overview:dashboard', 'Tổng quan doanh nghiệp', '/app?tab=enterprise', 'Toàn cảnh hoạt động công ty', 'tasks', [
    ('Xem tổng quan doanh nghiệp', '/app?tab=enterprise', [('view', 'Xem chi tiết')])
  ]),

  # 2. KHÔNG GIAN LÀM VIỆC - Công việc
  ('workspace:tasks:my', 'workspace:tasks', 'Công việc của tôi', '/app/tasks/my', 'Xem việc được giao, cập nhật tiến độ, báo cáo hoàn thành', 'tasks', [
    ('Xem công việc cá nhân', '/app/tasks/my', [('view', 'Xem danh sách / chi tiết')]),
    ('Cập nhật tiến độ & Checklist', '/app/tasks/my/update', [('update', 'Chỉnh sửa tiến độ %')]),
    ('Gửi báo cáo nghiệm thu', '/app/tasks/my/submit', [('update', 'Gửi báo cáo duyệt')]),
  ]),
  ('workspace:tasks:all', 'workspace:tasks', 'Tất cả công việc', '/app/tasks', 'Danh sách tổng hợp toàn bộ công việc', 'tasks', [
    ('Xem danh sách công việc', '/app/tasks', [('view', 'Xem danh sách / chi tiết')]),
    ('Giao việc mới', '/app/tasks/create', [('create', 'Thêm mới')]),
    ('Chỉnh sửa công việc', '/app/tasks/edit', [('update', 'Chỉnh sửa')]),
    ('Xóa công việc', '/app/tasks/delete', [('delete', 'Xóa')]),
    ('Xuất dữ liệu công việc', '/app/tasks/export', [('export', 'Xuất dữ liệu')]),
  ]),
  ('workspace:tasks:kanban', 'workspace:tasks', 'Kanban Board', '/app/tasks?view=kanban', 'Bảng Kanban kéo thả trực quan theo trạng thái', 'tasks', [
    ('Xem bảng Kanban', '/app/tasks?view=kanban', [('view', 'Xem bảng Kanban')]),
    ('Kéo thả chuyển trạng thái', '/app/tasks/kanban/move', [('update', 'Chuyển cột trạng thái')]),
  ]),
  ('workspace:tasks:pending', 'workspace:tasks', 'Công việc chờ duyệt', '/app/tasks/supervisor', 'Các nhiệm vụ đang đợi nghiệm thu', 'approvals', [
    ('Xem công việc chờ duyệt', '/app/tasks/supervisor', [('view', 'Xem danh sách')]),
    ('Nghiệm thu hoàn thành', '/app/tasks/supervisor/approve', [('approve', 'Phê duyệt')]),
    ('Từ chối làm lại', '/app/tasks/supervisor/reject', [('reject', 'Từ chối')]),
  ]),
  ('workspace:tasks:overdue', 'workspace:tasks', 'Công việc quá hạn', '/app/tasks?filter=overdue', 'Cảnh báo nhiệm vụ trễ deadline', 'tasks', [
    ('Xem danh sách quá hạn', '/app/tasks?filter=overdue', [('view', 'Xem danh sách')]),
    ('Gia hạn deadline', '/app/tasks/extend', [('update', 'Gia hạn thời gian')]),
  ]),
  ('workspace:tasks:recurring', 'workspace:tasks', 'Công việc định kỳ', '/app/tasks?filter=recurring', 'Các công việc lặp lại định kỳ', 'tasks', [
    ('Xem công việc định kỳ', '/app/tasks?filter=recurring', [('view', 'Xem danh sách')]),
    ('Thiết lập chu kỳ lặp', '/app/tasks/recurring/config', [('create', 'Tạo lịch lặp'), ('update', 'Sửa chu kỳ')]),
  ]),
  ('workspace:tasks:archived', 'workspace:tasks', 'Công việc đã lưu trữ', '/app/tasks?filter=archived', 'Nhiệm vụ đã hoàn tất và đóng lưu trữ', 'tasks', [
    ('Xem kho lưu trữ', '/app/tasks?filter=archived', [('view', 'Xem danh sách')]),
    ('Khôi phục công việc', '/app/tasks/restore', [('update', 'Khôi phục')]),
  ]),

  # 2. KHÔNG GIAN LÀM VIỆC - Dự án
  ('workspace:projects:all', 'workspace:projects', 'Tất cả dự án', '/app/tasks/projects', 'Danh mục dự án của doanh nghiệp', 'projects', [
    ('Xem danh mục dự án', '/app/tasks/projects', [('view', 'Xem danh sách / chi tiết')]),
    ('Khởi tạo dự án mới', '/app/tasks/projects/create', [('create', 'Thêm mới')]),
    ('Cập nhật dự án', '/app/tasks/projects/edit', [('update', 'Chỉnh sửa')]),
    ('Đóng / Xóa dự án', '/app/tasks/projects/delete', [('delete', 'Xóa')]),
    ('Xuất hồ sơ dự án', '/app/tasks/projects/export', [('export', 'Xuất dữ liệu')]),
  ]),
  ('workspace:projects:my', 'workspace:projects', 'Dự án của tôi', '/app/tasks/projects?filter=my', 'Dự án do cá nhân quản lý hoặc tham gia', 'projects', [
    ('Xem dự án của tôi', '/app/tasks/projects?filter=my', [('view', 'Xem chi tiết')]),
    ('Cập nhật tiến độ dự án', '/app/tasks/projects/update', [('update', 'Chỉnh sửa')]),
  ]),
  ('workspace:projects:active', 'workspace:projects', 'Dự án đang triển khai', '/app/tasks/projects?filter=active', 'Dự án đang trong tiến độ thực hiện', 'projects', [
    ('Xem dự án đang triển khai', '/app/tasks/projects?filter=active', [('view', 'Xem chi tiết')]),
  ]),
  ('workspace:projects:completed', 'workspace:projects', 'Dự án đã hoàn thành', '/app/tasks/projects?filter=completed', 'Dự án đã nghiệm thu đóng thành công', 'projects', [
    ('Xem dự án hoàn thành', '/app/tasks/projects?filter=completed', [('view', 'Xem chi tiết')]),
  ]),
  ('workspace:projects:archived', 'workspace:projects', 'Dự án lưu trữ', '/app/tasks/projects?filter=archived', 'Kho lưu trữ hồ sơ dự án cũ', 'projects', [
    ('Xem dự án lưu trữ', '/app/tasks/projects?filter=archived', [('view', 'Xem chi tiết')]),
    ('Khôi phục dự án', '/app/tasks/projects/restore', [('update', 'Khôi phục')]),
  ]),

  # 2. KHÔNG GIAN LÀM VIỆC - Kế hoạch & lịch
  ('workspace:calendar:tasks', 'workspace:calendar', 'Lịch công việc', '/app/tasks/calendar', 'Lịch công việc ngày, tuần, tháng', 'tasks', [
    ('Xem lịch công việc', '/app/tasks/calendar', [('view', 'Xem lịch')]),
  ]),
  ('workspace:calendar:timeline', 'workspace:calendar', 'Timeline', '/app/tasks/calendar?view=timeline', 'Dòng thời gian triển khai công việc', 'tasks', [
    ('Xem timeline công việc', '/app/tasks/calendar?view=timeline', [('view', 'Xem timeline')]),
  ]),
  ('workspace:calendar:gantt', 'workspace:calendar', 'Biểu đồ Gantt', '/app/tasks/calendar?view=gantt', 'Biểu đồ Gantt thể hiện phụ thuộc và tiến độ', 'tasks', [
    ('Xem biểu đồ Gantt', '/app/tasks/calendar?view=gantt', [('view', 'Xem Gantt')]),
    ('Điều chỉnh mốc phụ thuộc', '/app/tasks/calendar/gantt-edit', [('update', 'Cập nhật mốc')]),
  ]),
  ('workspace:calendar:workload', 'workspace:calendar', 'Khối lượng công việc', '/app/tasks/calendar?view=workload', 'Theo dõi tải công việc tránh quá tải nhân sự', 'tasks', [
    ('Xem khối lượng công việc', '/app/tasks/calendar?view=workload', [('view', 'Xem tải công việc')]),
  ]),
  ('workspace:calendar:milestones', 'workspace:calendar', 'Cột mốc quan trọng', '/app/tasks/calendar?view=milestones', 'Mốc mục tiêu quan trọng của dự án', 'tasks', [
    ('Xem cột mốc quan trọng', '/app/tasks/calendar?view=milestones', [('view', 'Xem mốc')]),
    ('Cập nhật mốc milestone', '/app/tasks/calendar/milestones-edit', [('update', 'Cập nhật')]),
  ]),

  # 2. KHÔNG GIAN LÀM VIỆC - Phê duyệt
  ('workspace:approvals:pending', 'workspace:approvals', 'Chờ tôi phê duyệt', '/app/tasks/supervisor', 'Hàng đợi duyệt nghiệm thu kết quả công việc', 'approvals', [
    ('Xem hàng đợi phê duyệt', '/app/tasks/supervisor', [('view', 'Xem danh sách')]),
    ('Nghiệm thu hoàn thành', '/app/tasks/supervisor/approve', [('approve', 'Phê duyệt')]),
    ('Từ chối yêu cầu làm lại', '/app/tasks/supervisor/reject', [('reject', 'Từ chối')]),
  ]),
  ('workspace:approvals:my_requests', 'workspace:approvals', 'Yêu cầu của tôi', '/app/tasks/supervisor?tab=my_requests', 'Các yêu cầu phê duyệt do cá nhân gửi', 'approvals', [
    ('Xem yêu cầu đã gửi', '/app/tasks/supervisor?tab=my_requests', [('view', 'Xem danh sách')]),
    ('Thu hồi yêu cầu', '/app/tasks/supervisor/cancel', [('update', 'Hủy yêu cầu')]),
  ]),
  ('workspace:approvals:history', 'workspace:approvals', 'Đã xử lý', '/app/tasks/supervisor?tab=history', 'Lịch sử phê duyệt và nghiệm thu', 'approvals', [
    ('Xem lịch sử duyệt', '/app/tasks/supervisor?tab=history', [('view', 'Xem lịch sử')]),
  ]),

  # 2. KHÔNG GIAN LÀM VIỆC - Tài liệu
  ('workspace:documents:all', 'workspace:documents', 'Tất cả tài liệu', '/app/tasks/documents', 'Kho tài liệu dự án và quy trình', 'tasks', [
    ('Xem kho tài liệu', '/app/tasks/documents', [('view', 'Xem danh sách / chi tiết')]),
    ('Tải lên tài liệu', '/app/tasks/documents/upload', [('create', 'Thêm mới')]),
    ('Xóa tài liệu', '/app/tasks/documents/delete', [('delete', 'Xóa')]),
    ('Tải về tài liệu', '/app/tasks/documents/download', [('export', 'Xuất dữ liệu')]),
  ]),
  ('workspace:documents:my', 'workspace:documents', 'Tài liệu của tôi', '/app/tasks/documents?tab=my', 'Hồ sơ do tôi tải lên', 'tasks', [
    ('Xem tài liệu cá nhân', '/app/tasks/documents?tab=my', [('view', 'Xem danh sách')]),
  ]),
  ('workspace:documents:shared', 'workspace:documents', 'Tài liệu được chia sẻ', '/app/tasks/documents?tab=shared', 'Hồ sơ được chia sẻ trong phòng/dự án', 'tasks', [
    ('Xem tài liệu chia sẻ', '/app/tasks/documents?tab=shared', [('view', 'Xem danh sách')]),
  ]),
  ('workspace:documents:trash', 'workspace:documents', 'Thùng rác', '/app/tasks/documents?tab=trash', 'Tài liệu đã xóa tạm thời', 'tasks', [
    ('Xem thùng rác', '/app/tasks/documents?tab=trash', [('view', 'Xem danh sách')]),
    ('Khôi phục tài liệu', '/app/tasks/documents/restore', [('update', 'Khôi phục')]),
    ('Xóa vĩnh viễn', '/app/tasks/documents/destroy', [('delete', 'Xóa vĩnh viễn')]),
  ]),

  # 3. TỔ CHỨC & NHÂN SỰ - Nhân viên
  ('organization:employees:list', 'organization:employees', 'Danh sách nhân viên', '/admin/employees', 'Quản lý nhân sự toàn doanh nghiệp', 'employees', [
    ('Xem danh sách nhân viên', '/admin/employees', [('view', 'Xem danh sách / chi tiết')]),
    ('Thêm nhân viên mới', '/admin/employees/create', [('create', 'Thêm mới')]),
    ('Chỉnh sửa hồ sơ nhân sự', '/admin/employees/edit', [('update', 'Chỉnh sửa')]),
    ('Thôi việc / Xóa nhân viên', '/admin/employees/delete', [('delete', 'Xóa')]),
    ('Xuất hồ sơ nhân sự', '/admin/employees/export', [('export', 'Xuất dữ liệu')]),
  ]),
  ('organization:employees:profiles', 'organization:employees', 'Hồ sơ nhân viên', '/admin/employees?tab=profiles', 'Thông tin chi tiết hồ sơ cán bộ nhân viên', 'employees', [
    ('Xem chi tiết hồ sơ', '/admin/employees?tab=profiles', [('view', 'Xem chi tiết')]),
    ('Cập nhật thông tin cán bộ', '/admin/employees/update-profile', [('update', 'Chỉnh sửa')]),
  ]),
  ('organization:employees:invitations', 'organization:employees', 'Lời mời tham gia', '/admin/employees?tab=invitations', 'Mời nhân viên mới vào hệ thống', 'employees', [
    ('Xem danh sách lời mời', '/admin/employees?tab=invitations', [('view', 'Xem danh sách')]),
    ('Gửi lời mời tham gia', '/admin/employees/invite', [('create', 'Gửi lời mời')]),
  ]),
  ('organization:employees:inactive', 'organization:employees', 'Nhân viên ngừng hoạt động', '/admin/employees?tab=inactive', 'Danh sách nhân sự đã thôi việc/nghỉ phép', 'employees', [
    ('Xem nhân viên ngừng hoạt động', '/admin/employees?tab=inactive', [('view', 'Xem danh sách')]),
    ('Kích hoạt lại nhân viên', '/admin/employees/reactivate', [('update', 'Kích hoạt lại')]),
  ]),

  # 3. TỔ CHỨC & NHÂN SỰ - Phòng ban
  ('organization:departments:list', 'organization:departments', 'Danh sách phòng ban', '/app/organization/departments', 'Danh mục phòng ban và phân xưởng', 'employees', [
    ('Xem danh sách phòng ban', '/app/organization/departments', [('view', 'Xem danh sách / chi tiết')]),
    ('Thêm phòng ban mới', '/app/organization/departments/create', [('create', 'Thêm mới')]),
    ('Cập nhật phòng ban', '/app/organization/departments/edit', [('update', 'Chỉnh sửa')]),
    ('Xóa phòng ban', '/app/organization/departments/delete', [('delete', 'Xóa')]),
  ]),
  ('organization:departments:chart', 'organization:departments', 'Sơ đồ tổ chức', '/app/organization/departments?tab=chart', 'Sơ đồ cơ cấu phân cấp doanh nghiệp', 'employees', [
    ('Xem sơ đồ tổ chức', '/app/organization/departments?tab=chart', [('view', 'Xem sơ đồ')]),
  ]),
  ('organization:departments:assignments', 'organization:departments', 'Phân công quản lý', '/app/organization/departments?tab=assignments', 'Chỉ định trưởng phòng và người quản lý', 'employees', [
    ('Xem phân công quản lý', '/app/organization/departments?tab=assignments', [('view', 'Xem phân công')]),
    ('Bổ nhiệm / Miễn nhiệm quản lý', '/app/organization/departments/assign', [('update', 'Bổ nhiệm quản lý')]),
  ]),

  # 3. TỔ CHỨC & NHÂN SỰ - Nhóm làm việc
  ('organization:teams:list', 'organization:teams', 'Danh sách nhóm', '/app/organization/teams', 'Đội nhóm làm việc chuyên trách', 'employees', [
    ('Xem danh sách nhóm', '/app/organization/teams', [('view', 'Xem danh sách / chi tiết')]),
    ('Tạo nhóm mới', '/app/organization/teams/create', [('create', 'Thêm mới')]),
    ('Chỉnh sửa nhóm', '/app/organization/teams/edit', [('update', 'Chỉnh sửa')]),
    ('Xóa nhóm', '/app/organization/teams/delete', [('delete', 'Xóa')]),
  ]),
  ('organization:teams:my', 'organization:teams', 'Nhóm của tôi', '/app/organization/teams?filter=my', 'Các nhóm cá nhân đang tham gia', 'employees', [
    ('Xem nhóm của tôi', '/app/organization/teams?filter=my', [('view', 'Xem nhóm')]),
  ]),
  ('organization:teams:members', 'organization:teams', 'Thành viên nhóm', '/app/organization/teams?filter=members', 'Quản lý thành viên trong nhóm', 'employees', [
    ('Xem thành viên nhóm', '/app/organization/teams?filter=members', [('view', 'Xem thành viên')]),
    ('Thêm / Xóa thành viên nhóm', '/app/organization/teams/manage-members', [('update', 'Cập nhật thành viên')]),
  ]),

  # 4. PHÂN TÍCH & BÁO CÁO - Báo cáo & KPI
  ('analytics:reports:overview', 'analytics:reports', 'Tổng quan báo cáo', '/app/tasks/reports', 'Chỉ số thống kê KPI toàn diện', 'reports', [
    ('Xem tổng quan KPI', '/app/tasks/reports', [('view', 'Xem báo cáo')]),
  ]),
  ('analytics:reports:tasks', 'analytics:reports', 'Báo cáo công việc', '/app/tasks/reports?tab=tasks', 'Thống kê tình hình thực hiện công việc', 'reports', [
    ('Xem báo cáo công việc', '/app/tasks/reports?tab=tasks', [('view', 'Xem báo cáo')]),
  ]),
  ('analytics:reports:projects', 'analytics:reports', 'Báo cáo dự án', '/app/tasks/reports?tab=projects', 'Thống kê tiến độ danh mục dự án', 'reports', [
    ('Xem báo cáo dự án', '/app/tasks/reports?tab=projects', [('view', 'Xem báo cáo')]),
  ]),
  ('analytics:reports:employees', 'analytics:reports', 'Báo cáo nhân viên', '/app/tasks/reports?tab=employees', 'Đánh giá KPI và hiệu suất từng nhân sự', 'reports', [
    ('Xem báo cáo nhân viên', '/app/tasks/reports?tab=employees', [('view', 'Xem báo cáo')]),
  ]),
  ('analytics:reports:departments', 'analytics:reports', 'Báo cáo phòng ban', '/app/tasks/reports?tab=departments', 'Hiệu suất hoàn thành theo phòng ban', 'reports', [
    ('Xem báo cáo phòng ban', '/app/tasks/reports?tab=departments', [('view', 'Xem báo cáo')]),
  ]),
  ('analytics:reports:deadlines', 'analytics:reports', 'Tiến độ & deadline', '/app/tasks/reports?tab=deadlines', 'Phân tích tỷ lệ đúng hạn và quá hạn', 'reports', [
    ('Xem báo cáo deadline', '/app/tasks/reports?tab=deadlines', [('view', 'Xem báo cáo')]),
  ]),
  ('analytics:reports:performance', 'analytics:reports', 'Hiệu suất & thời gian', '/app/tasks/reports?tab=performance', 'Thời gian hoàn thành trung bình', 'reports', [
    ('Xem hiệu suất thời gian', '/app/tasks/reports?tab=performance', [('view', 'Xem báo cáo')]),
  ]),
  ('analytics:reports:export', 'analytics:reports', 'Xuất báo cáo', '/app/tasks/reports?tab=export', 'Xuất dữ liệu Excel / PDF định kỳ', 'reports', [
    ('Xuất báo cáo Excel / PDF', '/app/tasks/reports?tab=export', [('export', 'Xuất dữ liệu')]),
  ]),

  # 5. QUẢN TRỊ HỆ THỐNG - Vai trò & phân quyền
  ('system:roles:groups', 'system:roles', 'Danh sách vai trò', '/admin/modules?tab=groups', 'Quản lý các nhóm vai trò quyền', 'modules', [
    ('Xem danh sách vai trò', '/admin/modules?tab=groups', [('view', 'Xem danh sách / chi tiết')]),
    ('Tạo vai trò mới', '/admin/modules/create-role', [('create', 'Thêm mới')]),
    ('Cập nhật quyền vai trò', '/admin/modules/edit-role', [('update', 'Chỉnh sửa')]),
    ('Xóa vai trò', '/admin/modules/delete-role', [('delete', 'Xóa')]),
  ]),
  ('system:roles:permissions', 'system:roles', 'Danh sách quyền', '/admin/modules?tab=modules', 'Phạm vi quyền chức năng hệ thống', 'modules', [
    ('Xem danh sách quyền', '/admin/modules?tab=modules', [('view', 'Xem danh sách')]),
    ('Đăng ký quyền mới', '/admin/modules/register-scope', [('create', 'Thêm mới')]),
    ('Cập nhật quyền', '/admin/modules/update-scope', [('update', 'Chỉnh sửa')]),
  ]),
  ('system:roles:users', 'system:roles', 'Gán quyền người dùng', '/admin/users', 'Quản trị tài khoản và cấp quyền theo nhân sự', 'users', [
    ('Xem danh sách tài khoản', '/admin/users', [('view', 'Xem danh sách / chi tiết')]),
    ('Tạo tài khoản người dùng', '/admin/users/create', [('create', 'Thêm mới')]),
    ('Cập nhật tài khoản & Đặt lại mật khẩu', '/admin/users/edit', [('update', 'Chỉnh sửa')]),
    ('Khóa / Xóa tài khoản', '/admin/users/delete', [('delete', 'Xóa')]),
  ]),
  ('system:roles:matrix', 'system:roles', 'Ma trận phân quyền', '/admin/modules?tab=tree', 'Ma trận chức năng và quyền thao tác', 'modules', [
    ('Xem ma trận phân quyền', '/admin/modules?tab=tree', [('view', 'Xem ma trận')]),
    ('Cập nhật ma trận phân quyền', '/admin/modules/update-matrix', [('update', 'Chỉnh sửa phân quyền')]),
  ]),

  # 5. QUẢN TRỊ HỆ THỐNG - Cấu hình quy trình
  ('system:workflows:list', 'system:workflows', 'Danh sách quy trình', '/admin/workflows', 'Quản lý quy trình xử lý công việc', 'modules', [
    ('Xem danh sách quy trình', '/admin/workflows', [('view', 'Xem danh sách')]),
    ('Tạo quy trình mới', '/admin/workflows/create', [('create', 'Thêm mới')]),
    ('Chỉnh sửa quy trình', '/admin/workflows/edit', [('update', 'Chỉnh sửa')]),
    ('Xóa quy trình', '/admin/workflows/delete', [('delete', 'Xóa')]),
  ]),
  ('system:workflows:statuses', 'system:workflows', 'Trạng thái công việc', '/admin/workflows?tab=statuses', 'Định nghĩa trạng thái xử lý', 'modules', [
    ('Xem trạng thái công việc', '/admin/workflows?tab=statuses', [('view', 'Xem danh sách')]),
    ('Thêm mới trạng thái', '/admin/workflows/create-status', [('create', 'Thêm mới')]),
    ('Cập nhật trạng thái', '/admin/workflows/edit-status', [('update', 'Chỉnh sửa')]),
  ]),
  ('system:workflows:rules', 'system:workflows', 'Quy tắc chuyển trạng thái', '/admin/workflows?tab=rules', 'Điều kiện chuyển bước workflow', 'modules', [
    ('Xem quy tắc chuyển bước', '/admin/workflows?tab=rules', [('view', 'Xem quy tắc')]),
    ('Thiết lập quy tắc chuyển bước', '/admin/workflows/set-rules', [('update', 'Chỉnh sửa')]),
  ]),
  ('system:workflows:templates', 'system:workflows', 'Mẫu công việc', '/admin/workflows?tab=templates', 'Mẫu nhiệm vụ định dạng sẵn', 'modules', [
    ('Xem mẫu công việc', '/admin/workflows?tab=templates', [('view', 'Xem mẫu')]),
    ('Tạo mẫu công việc', '/admin/workflows/create-template', [('create', 'Thêm mới')]),
    ('Chỉnh sửa mẫu công việc', '/admin/workflows/edit-template', [('update', 'Chỉnh sửa')]),
  ]),
  ('system:workflows:automation', 'system:workflows', 'Tự động hóa', '/admin/workflows?tab=automation', 'Quy tắc tự động giao việc và nhắc hạn', 'modules', [
    ('Xem quy tắc tự động hóa', '/admin/workflows?tab=automation', [('view', 'Xem tự động hóa')]),
    ('Cấu hình bot tự động hóa', '/admin/workflows/set-automation', [('update', 'Chỉnh sửa')]),
  ]),

  # 5. QUẢN TRỊ HỆ THỐNG - Cấu hình tổ chức
  ('system:config:org', 'system:config', 'Thông tin doanh nghiệp', '/admin/settings/org', 'Thông tin pháp nhân và giờ làm việc', 'modules', [
    ('Xem thông tin doanh nghiệp', '/admin/settings/org', [('view', 'Xem thông tin')]),
    ('Cập nhật thông tin doanh nghiệp', '/admin/settings/org/save', [('update', 'Chỉnh sửa')]),
  ]),
  ('system:config:projects', 'system:config', 'Cấu hình dự án', '/admin/settings/org?tab=projects', 'Quy tắc đặt mã dự án và ngân sách', 'modules', [
    ('Xem cấu hình dự án', '/admin/settings/org?tab=projects', [('view', 'Xem cấu hình')]),
    ('Cập nhật cấu hình dự án', '/admin/settings/org/save-projects', [('update', 'Chỉnh sửa')]),
  ]),
  ('system:config:notifications', 'system:config', 'Cấu hình thông báo', '/admin/settings/org?tab=notifications', 'Cấu hình email và thông báo đẩy', 'modules', [
    ('Xem cấu hình thông báo', '/admin/settings/org?tab=notifications', [('view', 'Xem cấu hình')]),
    ('Cập nhật thông báo hệ thống', '/admin/settings/org/save-notifications', [('update', 'Chỉnh sửa')]),
  ]),
  ('system:config:integrations', 'system:config', 'Tích hợp hệ thống', '/admin/settings/org?tab=integrations', 'Kết nối ERP, HRM và chữ ký số', 'modules', [
    ('Xem tích hợp hệ thống', '/admin/settings/org?tab=integrations', [('view', 'Xem tích hợp')]),
    ('Thiết lập kết nối API', '/admin/settings/org/save-integrations', [('update', 'Chỉnh sửa')]),
  ]),
  ('system:config:data_policy', 'system:config', 'Chính sách dữ liệu', '/admin/settings/org?tab=data-policy', 'Chính sách sao lưu và thời gian lưu trữ', 'modules', [
    ('Xem chính sách dữ liệu', '/admin/settings/org?tab=data-policy', [('view', 'Xem chính sách')]),
    ('Cập nhật chính sách dữ liệu', '/admin/settings/org/save-policy', [('update', 'Chỉnh sửa')]),
  ]),

  # 5. QUẢN TRỊ HỆ THỐNG - Nhật ký & giám sát
  ('system:audit:activity', 'system:audit', 'Nhật ký hoạt động', '/admin/audit-logs', 'Nhật ký audit trail toàn hệ thống', 'modules', [
    ('Xem nhật ký hoạt động', '/admin/audit-logs', [('view', 'Xem nhật ký')]),
    ('Xuất nhật ký audit', '/admin/audit-logs/export', [('export', 'Xuất dữ liệu')]),
  ]),
  ('system:audit:logins', 'system:audit', 'Lịch sử đăng nhập', '/admin/audit-logs?tab=logins', 'Lịch sử phiên đăng nhập người dùng', 'modules', [
    ('Xem lịch sử đăng nhập', '/admin/audit-logs?tab=logins', [('view', 'Xem lịch sử')]),
  ]),
  ('system:audit:tasks', 'system:audit', 'Tác vụ nền', '/admin/audit-logs?tab=tasks', 'Giám sát tiến trình nền cronjob', 'modules', [
    ('Xem tiến trình nền', '/admin/audit-logs?tab=tasks', [('view', 'Xem tác vụ')]),
  ]),
  ('system:audit:monitoring', 'system:audit', 'Giám sát hệ thống', '/admin/audit-logs?tab=monitoring', 'Hiệu năng CPU, RAM, cơ sở dữ liệu', 'modules', [
    ('Xem giám sát hệ thống', '/admin/audit-logs?tab=monitoring', [('view', 'Xem giám sát')]),
  ]),

  # 6. CÁ NHÂN & HỖ TRỢ
  ('personal:notifications:all', 'personal:notifications', 'Tất cả thông báo', '/notifications', 'Trung tâm nhận thông báo', None, [
    ('Xem tất cả thông báo', '/notifications', [('view', 'Xem thông báo')]),
  ]),
  ('personal:notifications:unread', 'personal:notifications', 'Chưa đọc', '/notifications?tab=unread', 'Các thông báo mới chưa đọc', None, [
    ('Xem thông báo chưa đọc', '/notifications?tab=unread', [('view', 'Xem thông báo')]),
    ('Đánh dấu đã đọc', '/notifications/mark-read', [('update', 'Đánh dấu đã đọc')]),
  ]),
  ('personal:account:profile', 'personal:account', 'Hồ sơ cá nhân', '/app/settings', 'Xem và cập nhật thông tin cá nhân', 'settings', [
    ('Xem hồ sơ cá nhân', '/app/settings', [('view', 'Xem hồ sơ')]),
    ('Cập nhật hồ sơ cá nhân', '/app/settings/profile', [('update', 'Chỉnh sửa')]),
  ]),
  ('personal:account:security', 'personal:account', 'Bảo mật tài khoản', '/app/settings?tab=security', 'Đổi mật khẩu và xác thực', 'settings', [
    ('Xem bảo mật tài khoản', '/app/settings?tab=security', [('view', 'Xem bảo mật')]),
    ('Đổi mật khẩu tài khoản', '/app/settings/change-password', [('update', 'Đổi mật khẩu')]),
  ]),
  ('personal:account:notifications', 'personal:account', 'Tùy chọn thông báo', '/app/settings?tab=notifications', 'Tùy chỉnh nhận thông báo', 'settings', [
    ('Xem tùy chọn thông báo', '/app/settings?tab=notifications', [('view', 'Xem tùy chọn')]),
    ('Cập nhật nhận thông báo', '/app/settings/save-notify-prefs', [('update', 'Chỉnh sửa')]),
  ]),
  ('personal:account:appearance', 'personal:account', 'Tùy chỉnh giao diện', '/app/settings?tab=appearance', 'Giao diện sáng tối và kích thước chữ', 'settings', [
    ('Xem tùy chỉnh giao diện', '/app/settings?tab=appearance', [('view', 'Xem tùy chỉnh')]),
    ('Thay đổi giao diện sáng tối', '/app/settings/save-theme', [('update', 'Đổi giao diện')]),
  ]),
]

def generate_sql():
  lines = ["BEGIN;", "", "-- 1. Xóa toàn bộ dữ liệu phân cấp cũ trong _SECPermissionNode", 'DELETE FROM "_SECPermissionNode";', ""]
  
  # Insert Modules
  lines.append("-- 2. MODULES GỐC (CẤP 1)")
  lines.append('INSERT INTO "_SECPermissionNode" ("Id", "ParentId", "Label", "Kind", "Route", "Description", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt") VALUES')
  mod_vals = []
  for mid, pid, label, kind, route, desc in modules:
    mod_vals.append(f"  ('{mid}', NULL, '{label}', '{kind}', '{route}', '{desc}', '{ACTOR_ID}', '{ACTOR_ID}', now(), now())")
  lines.append(",\n".join(mod_vals) + ";\n")

  # Insert Groups
  lines.append("-- 3. NHÓM MENU (CẤP 2)")
  lines.append('INSERT INTO "_SECPermissionNode" ("Id", "ParentId", "Label", "Kind", "Route", "Description", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt") VALUES')
  grp_vals = []
  for gid, pid, label, kind, route, desc in groups:
    grp_vals.append(f"  ('{gid}', '{pid}', '{label}', '{kind}', '{route}', '{desc}', '{ACTOR_ID}', '{ACTOR_ID}', now(), now())")
  lines.append(",\n".join(grp_vals) + ";\n")

  # Insert Screens
  lines.append("-- 4. MENU / MÀN HÌNH (CẤP 3)")
  lines.append('INSERT INTO "_SECPermissionNode" ("Id", "ParentId", "Label", "Kind", "Route", "Description", "ScopeKey", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt") VALUES')
  scr_vals = []
  for sid, pid, label, route, desc, scope_key, funcs in screens:
    sk = f"'{scope_key}'" if scope_key else "NULL"
    scr_vals.append(f"  ('{sid}', '{pid}', '{label}', 'Menu / Màn hình', '{route}', '{desc}', {sk}, '{ACTOR_ID}', '{ACTOR_ID}', now(), now())")
  lines.append(",\n".join(scr_vals) + ";\n")

  # Insert Functions (Cấp 4)
  lines.append("-- 5. CHỨC NĂNG (CẤP 4)")
  lines.append('INSERT INTO "_SECPermissionNode" ("Id", "ParentId", "Label", "Kind", "Route", "Description", "ScopeKey", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt") VALUES')
  fn_vals = []
  act_vals = []
  for sid, pid, label, route, desc, scope_key, funcs in screens:
    for f_idx, (f_label, f_route, actions) in enumerate(funcs):
      fid = f"{sid}:func:{f_idx}"
      sk = f"'{scope_key}'" if scope_key else "NULL"
      fn_vals.append(f"  ('{fid}', '{sid}', '{f_label}', 'Chức năng', '{f_route}', '{f_label} thuộc màn hình {label}', {sk}, '{ACTOR_ID}', '{ACTOR_ID}', now(), now())")
      for a_key, a_label in actions:
        aid = f"{fid}:{a_key}"
        act_vals.append(f"  ('{aid}', '{fid}', '{a_label}', 'Quyền thao tác', '{scope_key}:{a_key}' if '{scope_key}' != '' else '{a_key}', '{a_label} trên chức năng {f_label}', {sk}, '{a_key}', '{ACTOR_ID}', '{ACTOR_ID}', now(), now())")
  lines.append(",\n".join(fn_vals) + ";\n")

  # Insert Actions (Cấp 5)
  lines.append("-- 6. QUYỀN THAO TÁC (CẤP 5)")
  lines.append('INSERT INTO "_SECPermissionNode" ("Id", "ParentId", "Label", "Kind", "Route", "Description", "ScopeKey", "Action", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt") VALUES')
  clean_act_vals = []
  for aid, fid, a_label, route, desc, sk, a_key, _, _, _, _ in [
    (
      f"{sid}:func:{f_idx}:{a_key}",
      f"{sid}:func:{f_idx}",
      a_label,
      f"{scope_key}:{a_key}" if scope_key else a_key,
      f"{a_label} trên chức năng {f_label}",
      f"'{scope_key}'" if scope_key else "NULL",
      a_key,
      ACTOR_ID, ACTOR_ID, "now()", "now()"
    )
    for sid, pid, label, route, desc, scope_key, funcs in screens
    for f_idx, (f_label, f_route, actions) in enumerate(funcs)
    for a_key, a_label in actions
  ]:
    clean_act_vals.append(f"  ('{aid}', '{fid}', '{a_label}', 'Quyền thao tác', '{route}', '{desc}', {sk}, '{a_key}', '{ACTOR_ID}', '{ACTOR_ID}', now(), now())")
  lines.append(",\n".join(clean_act_vals) + ";\n")

  lines.append("COMMIT;")
  return "\n".join(lines)

if __name__ == '__main__':
  sql = generate_sql()
  with open('service/server-core/scratch/sync_full_workmanager_with_functions.sql', 'w', encoding='utf-8') as f:
    f.write(sql)
  print("Generated SQL successfully!")

