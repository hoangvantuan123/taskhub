export const DEPARTMENT_REPORT_ROWS = [
  { id: '1', code: 'DEPT-ENG', name: 'Phòng Kỹ thuật & R&D', totalTasks: 42, completedTasks: 26, inProgressTasks: 12, overdueTasks: 4, onTimeRate: '86.7%', avgProgress: '71%' },
  { id: '2', code: 'DEPT-PRD', name: 'Nhà máy Sản xuất & In ấn', totalTasks: 38, completedTasks: 22, inProgressTasks: 11, overdueTasks: 5, onTimeRate: '81.5%', avgProgress: '65%' },
  { id: '3', code: 'DEPT-SAL', name: 'Phòng Kinh doanh Bao bì', totalTasks: 32, completedTasks: 18, inProgressTasks: 10, overdueTasks: 4, onTimeRate: '81.8%', avgProgress: '69%' },
  { id: '4', code: 'DEPT-MKT', name: 'Phòng Marketing & Truyền thông', totalTasks: 28, completedTasks: 16, inProgressTasks: 9, overdueTasks: 3, onTimeRate: '84.2%', avgProgress: '72%' },
  { id: '5', code: 'DEPT-HR', name: 'Hành chính & Nhân sự', totalTasks: 26, completedTasks: 12, inProgressTasks: 10, overdueTasks: 4, onTimeRate: '75.0%', avgProgress: '60%' },
  { id: '6', code: 'DEPT-QC', name: 'Phòng Quản lý chất lượng (QA/QC)', totalTasks: 24, completedTasks: 19, inProgressTasks: 4, overdueTasks: 1, onTimeRate: '95.0%', avgProgress: '88%' },
];

export const DEPARTMENT_REPORT_COLUMNS = [
  { id: 'code', label: 'Mã phòng ban', width: 140 },
  { id: 'name', label: 'Tên phòng ban / Đơn vị', width: 280 },
  { id: 'totalTasks', label: 'Tổng nhiệm vụ', width: 130 },
  { id: 'completedTasks', label: 'Đã hoàn thành', width: 140 },
  { id: 'inProgressTasks', label: 'Đang xử lý', width: 130 },
  { id: 'overdueTasks', label: 'Quá hạn', width: 120 },
  { id: 'onTimeRate', label: 'Tỷ lệ đúng hạn', width: 140 },
  { id: 'avgProgress', label: 'Tiến độ bình quân', width: 160 },
];

export const PROJECT_REPORT_ROWS = [
  { id: '1', code: 'PRJ-2026-001', name: 'Dự án ISO Bao bì thực phẩm xuất khẩu', manager: 'Nguyễn Văn Giám Đốc', totalTasks: 34, completed: 25, progress: '78%', status: 'Đang tiến hành', deadline: '2026-12-31' },
  { id: '2', code: 'PRJ-2026-002', name: 'Nghiên cứu màng ghép Metalize độ bền cao', manager: 'Trần Kỹ Sư', totalTasks: 28, completed: 18, progress: '64%', status: 'Đang tiến hành', deadline: '2026-11-30' },
  { id: '3', code: 'PRJ-2026-003', name: 'Triển khai hệ thống tự động hóa cân điện tử NM2', manager: 'Phạm Quản Trị', totalTasks: 22, completed: 20, progress: '91%', status: 'Nghiệm thu', deadline: '2026-11-15' },
  { id: '4', code: 'PRJ-2026-004', name: 'Bao bì xanh GoldGreen tự phân hủy PLA', manager: 'Lê Quản Lý', totalTasks: 18, completed: 8, progress: '45%', status: 'Đang tiến hành', deadline: '2027-03-31' },
];

export const PROJECT_REPORT_COLUMNS = [
  { id: 'code', label: 'Mã dự án', width: 150 },
  { id: 'name', label: 'Tên dự án', width: 340 },
  { id: 'manager', label: 'Quản lý dự án', width: 190 },
  { id: 'totalTasks', label: 'Tổng công việc', width: 140 },
  { id: 'completed', label: 'Đã hoàn tất', width: 130 },
  { id: 'progress', label: 'Tiến độ tổng thể', width: 150 },
  { id: 'status', label: 'Trạng thái dự án', width: 160 },
  { id: 'deadline', label: 'Hạn hoàn thành', width: 150 },
];

