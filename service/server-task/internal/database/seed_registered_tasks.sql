-- ============================================================================
-- REGISTER 6 USER WORK PROGRESS TASKS INTO DATABASE (POSTGRESQL)
-- Table: _TSKReportConfig (Data JSONB) & _TSKTask
-- ============================================================================

-- 1. Ensure Data column exists on _TSKReportConfig
ALTER TABLE "_TSKReportConfig" ADD COLUMN IF NOT EXISTS "Data" JSONB DEFAULT '[]'::jsonb;

-- 2. Update _TSKReportConfig with the 6 SharePoint Work Progress Tasks
UPDATE "_TSKReportConfig"
SET "Data" = '[
  {
    "id": "sp-task-1",
    "stt": 1,
    "requestDate": "04/11/2026",
    "requestDepartment": "Sản xuất",
    "requester": "Khối Sản xuất",
    "module": "Sản xuất",
    "feature": "Lệnh triển khai",
    "description": "Báo cáo thể hiện được các cđ chưa được kéo lệnh triển khai từ đơn hàng bán SO -> thêm cột trạng thái đã kéo ltk và cột đóng đơn hàng",
    "impact": "Chưa kiểm soát được các công đoạn chưa có lệnh triển khai, dẫn đến sót đơn hàng SO",
    "receivingDept": "Bravo",
    "receiver": "Mr Việt",
    "completionTime": "06/11/2026",
    "status": "in_progress",
    "statusLabel": "Chưa hoàn thành",
    "priority": "Bình thường",
    "actionPlan": "Bravo (Mr Việt) hoàn thiện thêm 2 cột trạng thái trên form báo cáo tiến độ SO",
    "assigneeOrWatcher": "Mr Việt / Mrs Phương",
    "deadline": "06/11/2026",
    "targetProgress": 100,
    "actualProgress": 75,
    "growthRate": 5.0
  },
  {
    "id": "sp-task-2",
    "stt": 2,
    "requestDate": "06/11/2026",
    "requestDepartment": "Sản xuất",
    "requester": "Khối Sản xuất",
    "module": "Sản xuất",
    "feature": "Lệnh thao tác",
    "description": "Thêm cột thời gian tạo, thời gian sửa trên chi tiết từng dòng lệnh thao tác",
    "impact": "Cần truy vết lịch sử tạo/sửa lệnh thao tác của tổ trưởng và thợ máy",
    "receivingDept": "Bravo",
    "receiver": "Mr Việt",
    "completionTime": "06/11/2026",
    "status": "completed",
    "statusLabel": "Hoàn thành",
    "priority": "Bình thường",
    "actionPlan": "Đã bổ sung 2 trường CreatedAt, UpdatedAt trên lưới dữ liệu chi tiết lệnh thao tác",
    "assigneeOrWatcher": "Mr Việt",
    "deadline": "06/11/2026",
    "targetProgress": 100,
    "actualProgress": 100,
    "growthRate": 0.0
  },
  {
    "id": "sp-task-3",
    "stt": 3,
    "requestDate": "09/11/2026",
    "requestDepartment": "ERP",
    "requester": "Mrs Phương",
    "module": "Kho",
    "feature": "Phân tích toàn trình module kho",
    "description": "Phân tích toàn trình module kho BRV - Kho MES:\n1. Hoàn thiện báo cáo vướng mắc cần xử lý nếu có để giảm thao tác cho người dùng và mapping với thiết kế mới của MES chỗ Mr Hoàn EPS\n2. Hoàn thiện yêu cầu của Mr Cường\n3. Tổng hợp toàn bộ hướng dẫn sử dụng phần MES của Mr Hoàn/ phần Brv đang có/ hình ảnh test",
    "impact": "Không nắm rõ logic không hỗ trợ và phân tích qui trình chuẩn được",
    "receivingDept": "Bravo",
    "receiver": "Mr Việt",
    "completionTime": "15/11/2026",
    "status": "in_progress",
    "statusLabel": "Chưa hoàn thành",
    "priority": "Ưu tiên",
    "actionPlan": "Mr Khiêm làm việc với Brv, Thương đi sâu vào tìm hiểu phân tích -> hoàn thiện báo cáo vướng mắc cần xử lý nếu có để giảm thao tác cho người dùng và mapping với thiết kế mới của MES chỗ Mr Hoàn EPS",
    "assigneeOrWatcher": "Mrs Thương",
    "deadline": "15/11/2026",
    "targetProgress": 70,
    "actualProgress": 45,
    "growthRate": 15.0
  },
  {
    "id": "sp-task-4",
    "stt": 4,
    "requestDate": "07/11/2026",
    "requestDepartment": "ERP",
    "requester": "Mrs Phương",
    "module": "Dashboard",
    "feature": "Theo dõi tiến độ công việc",
    "description": "Tuấn xây dashboard quản lý, theo dõi tiến độ báo cáo công việc của mn trong phòng kèm biểu đồ tăng trưởng",
    "impact": "Theo dõi phân tích khối lượng công việc trong phòng",
    "receivingDept": "ERP",
    "receiver": "Mr Tuấn",
    "completionTime": "15/11/2026",
    "status": "in_progress",
    "statusLabel": "Chưa hoàn thành",
    "priority": "Ưu tiên",
    "actionPlan": "Tuấn thiết kế dashboard quản trị, tích hợp CSDL PostgreSQL, chia submenu độc lập và dựng các biểu đồ tăng trưởng tuần",
    "assigneeOrWatcher": "Mrs Phương",
    "deadline": "15/11/2026",
    "targetProgress": 90,
    "actualProgress": 85,
    "growthRate": 12.0
  },
  {
    "id": "sp-task-5",
    "stt": 5,
    "requestDate": "07/11/2026",
    "requestDepartment": "ERP",
    "requester": "Mrs Phương",
    "module": "Biên bản họp",
    "feature": "Giao ban hàng ngày",
    "description": "1. Nhận file ghi âm\n2. Chạy AI ra biên bản họp\n3. Đẩy các đầu việc sau họp vào sheet \"đầu việc sau họp GB MES\" trên link chung",
    "impact": "Theo dõi nội dung thống nhất, đầu việc liên quan dự án MES",
    "receivingDept": "ERP",
    "receiver": "Mr Minh",
    "completionTime": "Hàng ngày",
    "status": "recurring",
    "statusLabel": "Theo dõi hàng ngày",
    "priority": "Hàng ngày",
    "actionPlan": "Mr Minh theo dõi và hoàn thiện hàng ngày",
    "assigneeOrWatcher": "Mrs Phương",
    "deadline": "Hàng ngày",
    "targetProgress": 95,
    "actualProgress": 90,
    "growthRate": 5.0
  },
  {
    "id": "sp-task-6",
    "stt": 6,
    "requestDate": "07/11/2026",
    "requestDepartment": "ERP",
    "requester": "Mrs Phương",
    "module": "Đào tạo/ theo dõi",
    "feature": "Toolkit",
    "description": "Đào tạo, theo dõi Mr Tuấn Anh đpsx 1A thực hiện hàng ngày. Tiếp nhận, hoàn thiện yêu cầu chỉnh sửa nếu có",
    "impact": "Đảm bảo điều độ sản xuất 1A vận hành thông suốt trên hệ thống Toolkit",
    "receivingDept": "ERP",
    "receiver": "Mr Tuấn",
    "completionTime": "09/11/2026",
    "status": "completed",
    "statusLabel": "Hoàn Thành",
    "priority": "Bình thường",
    "actionPlan": "Mr Tuấn đào tạo, hướng dẫn thực hành và bàn giao quy trình",
    "assigneeOrWatcher": "Mr Tuấn",
    "deadline": "09/11/2026",
    "targetProgress": 100,
    "actualProgress": 100,
    "growthRate": 0.0
  }
]'::jsonb,
"Categories" = '["Sản xuất", "Kho", "Dashboard", "Biên bản họp", "Đào tạo/ theo dõi"]'::jsonb,
"UpdatedAt" = CURRENT_TIMESTAMP
WHERE "Key" = 'sharepoint_progress';

-- 3. Insert or Update these 6 tasks into _TSKTask
DO $$
DECLARE
  sys_actor_id uuid := '01a14802-9765-7cdb-922e-357b570d1809'::uuid;
  prj_mes_id uuid := '019db530-0002-7000-8000-000000000002'::uuid;
  prj_wms_id uuid := '019db530-0006-7000-8000-000000000006'::uuid;
BEGIN
  -- Task 1
  INSERT INTO "_TSKTask" (
    "Code", "Title", "Description", "Goal", "ProjectId",
    "DelegationLevel", "Department", "SubDepartment",
    "Priority", "Status", "Progress", "EstimatedHours", "ActualHours",
    "DueDate", "Tags", "CreatedBy", "UpdatedBy"
  ) VALUES (
    'TSK-2611-001',
    'Báo cáo các công đoạn chưa kéo Lệnh triển khai từ đơn hàng bán SO',
    'Báo cáo thể hiện được các cđ chưa được kéo lệnh triển khai từ đơn hàng bán SO -> thêm cột trạng thái đã kéo ltk và cột đóng đơn hàng',
    'Chưa kiểm soát được các công đoạn chưa có lệnh triển khai, dẫn đến sót đơn hàng SO. BP Tiếp nhận: Bravo (Mr Việt). Kế hoạch: Hoàn thiện thêm 2 cột trạng thái trên form báo cáo SO.',
    prj_mes_id, 'department', 'Khối Sản xuất', 'Sản xuất',
    'medium', 'in_progress', 75, 16, 12,
    '2026-11-06 17:30:00+07', '["Sản xuất", "Lệnh triển khai", "Bravo", "SO"]'::jsonb,
    sys_actor_id, sys_actor_id
  ) ON CONFLICT ("Code") DO UPDATE SET
    "Title" = EXCLUDED."Title",
    "Description" = EXCLUDED."Description",
    "Goal" = EXCLUDED."Goal",
    "Status" = EXCLUDED."Status",
    "Progress" = EXCLUDED."Progress",
    "DueDate" = EXCLUDED."DueDate";

  -- Task 2
  INSERT INTO "_TSKTask" (
    "Code", "Title", "Description", "Goal", "ProjectId",
    "DelegationLevel", "Department", "SubDepartment",
    "Priority", "Status", "Progress", "EstimatedHours", "ActualHours",
    "DueDate", "CompletedAt", "Tags", "CreatedBy", "UpdatedBy"
  ) VALUES (
    'TSK-2611-002',
    'Thêm cột thời gian tạo và thời gian sửa trên chi tiết lệnh thao tác',
    'Thêm cột thời gian tạo, thời gian sửa trên chi tiết từng dòng lệnh thao tác',
    'Cần truy vết lịch sử tạo/sửa lệnh thao tác của tổ trưởng và thợ máy. BP Tiếp nhận: Bravo (Mr Việt). Đã bổ sung 2 trường CreatedAt, UpdatedAt trên lưới chi tiết.',
    prj_mes_id, 'department', 'Khối Sản xuất', 'Sản xuất',
    'medium', 'completed', 100, 8, 8,
    '2026-11-06 17:30:00+07', '2026-11-06 16:45:00+07', '["Sản xuất", "Lệnh thao tác", "Bravo"]'::jsonb,
    sys_actor_id, sys_actor_id
  ) ON CONFLICT ("Code") DO UPDATE SET
    "Title" = EXCLUDED."Title",
    "Description" = EXCLUDED."Description",
    "Goal" = EXCLUDED."Goal",
    "Status" = EXCLUDED."Status",
    "Progress" = EXCLUDED."Progress",
    "DueDate" = EXCLUDED."DueDate";

  -- Task 3
  INSERT INTO "_TSKTask" (
    "Code", "Title", "Description", "Goal", "ProjectId",
    "DelegationLevel", "Department", "SubDepartment",
    "Priority", "Status", "Progress", "EstimatedHours", "ActualHours",
    "DueDate", "Tags", "CreatedBy", "UpdatedBy"
  ) VALUES (
    'TSK-2611-003',
    'Phân tích toàn trình module kho BRV - Kho MES',
    'Phân tích toàn trình module kho BRV - Kho MES:\n1. Hoàn thiện báo cáo vướng mắc cần xử lý nếu có để giảm thao tác cho người dùng và mapping với thiết kế mới của MES chỗ Mr Hoàn EPS\n2. Hoàn thiện yêu cầu của Mr Cường\n3. Tổng hợp toàn bộ hướng dẫn sử dụng phần MES của Mr Hoàn/ phần Brv đang có/ hình ảnh test',
    'Không nắm rõ logic không hỗ trợ và phân tích qui trình chuẩn được. Kế hoạch: Mr Khiêm làm việc với Brv, Thương đi sâu vào tìm hiểu phân tích -> hoàn thiện báo cáo vướng mắc giảm thao tác cho người dùng và mapping thiết kế mới MES.',
    prj_wms_id, 'department', 'Phòng ban Quản trị ERP & CNTT', 'Kho',
    'urgent', 'in_progress', 45, 40, 18,
    '2026-11-15 17:30:00+07', '["Kho", "MES", "Bravo", "Ưu tiên", "Phân tích toàn trình"]'::jsonb,
    sys_actor_id, sys_actor_id
  ) ON CONFLICT ("Code") DO UPDATE SET
    "Title" = EXCLUDED."Title",
    "Description" = EXCLUDED."Description",
    "Goal" = EXCLUDED."Goal",
    "Status" = EXCLUDED."Status",
    "Progress" = EXCLUDED."Progress",
    "DueDate" = EXCLUDED."DueDate";

  -- Task 4
  INSERT INTO "_TSKTask" (
    "Code", "Title", "Description", "Goal", "ProjectId",
    "DelegationLevel", "Department", "SubDepartment",
    "Priority", "Status", "Progress", "EstimatedHours", "ActualHours",
    "DueDate", "Tags", "CreatedBy", "UpdatedBy"
  ) VALUES (
    'TSK-2611-004',
    'Xây dựng Dashboard quản lý, theo dõi tiến độ báo cáo công việc kèm biểu đồ tăng trưởng',
    'Tuấn xây dashboard quản lý, theo dõi tiến độ báo cáo công việc của mn trong phòng kèm biểu đồ tăng trưởng',
    'Theo dõi phân tích khối lượng công việc trong phòng. BP Tiếp nhận: ERP (Mr Tuấn). Người yêu cầu / Theo dõi: Mrs Phương. Kế hoạch: Xây dựng hệ thống báo cáo tích hợp CSDL, vẽ biểu đồ tăng trưởng và phân loại submenu.',
    prj_mes_id, 'department', 'Phòng ban Quản trị ERP & CNTT', 'Dashboard',
    'urgent', 'in_progress', 85, 24, 20,
    '2026-11-15 17:30:00+07', '["Dashboard", "Theo dõi tiến độ", "Ưu tiên", "Biểu đồ tăng trưởng"]'::jsonb,
    sys_actor_id, sys_actor_id
  ) ON CONFLICT ("Code") DO UPDATE SET
    "Title" = EXCLUDED."Title",
    "Description" = EXCLUDED."Description",
    "Goal" = EXCLUDED."Goal",
    "Status" = EXCLUDED."Status",
    "Progress" = EXCLUDED."Progress",
    "DueDate" = EXCLUDED."DueDate";

  -- Task 5
  INSERT INTO "_TSKTask" (
    "Code", "Title", "Description", "Goal", "ProjectId",
    "DelegationLevel", "Department", "SubDepartment",
    "Priority", "Status", "Progress", "EstimatedHours", "ActualHours",
    "DueDate", "Tags", "CreatedBy", "UpdatedBy"
  ) VALUES (
    'TSK-2611-005',
    'Xử lý biên bản họp giao ban hàng ngày (AI Transcript & đẩy đầu việc sau họp GB MES)',
    '1. Nhận file ghi âm\n2. Chạy AI ra biên bản họp\n3. Đẩy các đầu việc sau họp vào sheet "đầu việc sau họp GB MES" trên link chung',
    'Theo dõi nội dung thống nhất, đầu việc liên quan dự án MES. BP Tiếp nhận: ERP (Mr Minh). Người theo dõi: Mrs Phương. Kế hoạch: Mr Minh theo dõi và hoàn thiện hàng ngày.',
    prj_mes_id, 'department', 'Phòng ban Quản trị ERP & CNTT', 'Biên bản họp',
    'medium', 'in_progress', 90, 30, 27,
    '2026-11-10 17:30:00+07', '["Biên bản họp", "Giao ban hàng ngày", "AI Transcript", "GB MES"]'::jsonb,
    sys_actor_id, sys_actor_id
  ) ON CONFLICT ("Code") DO UPDATE SET
    "Title" = EXCLUDED."Title",
    "Description" = EXCLUDED."Description",
    "Goal" = EXCLUDED."Goal",
    "Status" = EXCLUDED."Status",
    "Progress" = EXCLUDED."Progress",
    "DueDate" = EXCLUDED."DueDate";

  -- Task 6
  INSERT INTO "_TSKTask" (
    "Code", "Title", "Description", "Goal", "ProjectId",
    "DelegationLevel", "Department", "SubDepartment",
    "Priority", "Status", "Progress", "EstimatedHours", "ActualHours",
    "DueDate", "CompletedAt", "Tags", "CreatedBy", "UpdatedBy"
  ) VALUES (
    'TSK-2611-006',
    'Đào tạo và theo dõi Toolkit điều độ sản xuất 1A hàng ngày',
    'Đào tạo, theo dõi Mr Tuấn Anh đpsx 1A thực hiện hàng ngày. Tiếp nhận, hoàn thiện yêu cầu chỉnh sửa nếu có',
    'Đảm bảo điều độ sản xuất 1A vận hành thông suốt trên hệ thống Toolkit. Người thực hiện: Mr Tuấn. Đã hoàn thành bàn giao.',
    prj_mes_id, 'department', 'Phòng ban Quản trị ERP & CNTT', 'Đào tạo/ theo dõi',
    'medium', 'completed', 100, 16, 16,
    '2026-11-09 17:30:00+07', '2026-11-09 15:30:00+07', '["Đào tạo/ theo dõi", "Toolkit", "ĐPSX 1A"]'::jsonb,
    sys_actor_id, sys_actor_id
  ) ON CONFLICT ("Code") DO UPDATE SET
    "Title" = EXCLUDED."Title",
    "Description" = EXCLUDED."Description",
    "Goal" = EXCLUDED."Goal",
    "Status" = EXCLUDED."Status",
    "Progress" = EXCLUDED."Progress",
    "DueDate" = EXCLUDED."DueDate";

END $$;

