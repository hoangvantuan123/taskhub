-- ============================================================================
-- SCRIPT ĐĂNG KÝ DATA LUỒNG HOẠT ĐỘNG DB VÀ DỮ LIỆU HỆ THỐNG CHO ETPMS
-- DOANH NGHIỆP: TỔNG CÔNG TY CỔ PHẦN BAO BÌ GOLDSUN (GOLDSUN PACKAGING)
-- ============================================================================

BEGIN;

-- Lấy danh sách Account Seq quan trọng
DO $$
DECLARE
    v_admin_seq UUID;
    v_director_seq UUID;
    v_head_tech_seq UUID;
    v_head_prod_seq UUID;
    v_lead_tech_seq UUID;
    v_dev_tech_seq UUID;

    v_prj1_id BIGINT;
    v_prj2_id BIGINT;
    v_prj3_id BIGINT;
    v_prj4_id BIGINT;

    v_tsk1_id BIGINT;
    v_tsk2_id BIGINT;
    v_tsk3_id BIGINT;
    v_tsk4_id BIGINT;
    v_tsk5_id BIGINT;
    v_tsk6_id BIGINT;
    v_tsk7_id BIGINT;
    v_tsk8_id BIGINT;

    v_team1_id UUID;
    v_team2_id UUID;
    v_team3_id UUID;
    v_team4_id UUID;
BEGIN
    SELECT "IdSeq" INTO v_admin_seq FROM "_USRAccountDirectory" WHERE "Username" = 'admin' LIMIT 1;
    IF v_admin_seq IS NULL THEN
        SELECT "IdSeq" INTO v_admin_seq FROM "_USRAccountDirectory" LIMIT 1;
    END IF;

    SELECT "IdSeq" INTO v_director_seq FROM "_USRAccountDirectory" WHERE "Username" = 'director' LIMIT 1;
    IF v_director_seq IS NULL THEN v_director_seq := v_admin_seq; END IF;

    SELECT "IdSeq" INTO v_head_tech_seq FROM "_USRAccountDirectory" WHERE "Username" = 'head_tech' LIMIT 1;
    IF v_head_tech_seq IS NULL THEN v_head_tech_seq := v_admin_seq; END IF;

    SELECT "IdSeq" INTO v_head_prod_seq FROM "_USRAccountDirectory" WHERE "Username" = 'head_prod' LIMIT 1;
    IF v_head_prod_seq IS NULL THEN v_head_prod_seq := v_admin_seq; END IF;

    SELECT "IdSeq" INTO v_lead_tech_seq FROM "_USRAccountDirectory" WHERE "Username" = 'lead_tech' LIMIT 1;
    IF v_lead_tech_seq IS NULL THEN v_lead_tech_seq := v_admin_seq; END IF;

    SELECT "IdSeq" INTO v_dev_tech_seq FROM "_USRAccountDirectory" WHERE "Username" = 'dev_tech' LIMIT 1;
    IF v_dev_tech_seq IS NULL THEN v_dev_tech_seq := v_admin_seq; END IF;

    -- ========================================================================
    -- 1. ĐĂNG KÝ DỮ LIỆU CẤU HÌNH HỆ THỐNG (_SYSSettingDirectory)
    -- ========================================================================
    INSERT INTO "_SYSSettingDirectory" ("IdSeq", "Key", "Label", "Enabled", "Data", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion", "AuditOrigin")
    VALUES 
    (
        "_SYSUUIDv7"(),
        'system.company',
        'Thông tin doanh nghiệp Goldsun Packaging',
        true,
        '{"companyName": "Tổng Công Ty Cổ Phần Bao Bì Goldsun", "taxCode": "0101234567", "brandName": "Goldsun Packaging", "address": "Lô CN03, KCN Quế Võ, Tỉnh Bắc Ninh & Nhà máy NM2 KCN Thăng Long II, Hưng Yên", "phone": "024.3838.9999", "hotline": "1900.8888", "email": "contact@goldsun.vn", "website": "https://goldsun.vn", "industry": "Sản xuất bao bì màng phức hợp & in ống đồng công nghiệp", "capacity": "45.000 tấn bao bì/năm"}'::jsonb,
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1),
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1),
        NOW(), NOW(), 1, 'Native'
    )
    ON CONFLICT ("Key") DO UPDATE 
    SET "Data" = EXCLUDED."Data", "UpdatedAt" = NOW();

    INSERT INTO "_SYSSettingDirectory" ("IdSeq", "Key", "Label", "Enabled", "Data", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion", "AuditOrigin")
    VALUES 
    (
        "_SYSUUIDv7"(),
        'system.project_config',
        'Cấu hình quy chuẩn quản lý dự án',
        true,
        '{"codePrefix": "PRJ", "fiscalYear": 2026, "budgetWarningThreshold": 85, "milestoneGraceDays": 3, "requireApprovalOnFinish": true, "defaultTaskPriority": "medium", "autoCloseTaskOnReview": true}'::jsonb,
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1),
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1),
        NOW(), NOW(), 1, 'Native'
    )
    ON CONFLICT ("Key") DO UPDATE 
    SET "Data" = EXCLUDED."Data", "UpdatedAt" = NOW();

    INSERT INTO "_SYSSettingDirectory" ("IdSeq", "Key", "Label", "Enabled", "Data", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion", "AuditOrigin")
    VALUES 
    (
        "_SYSUUIDv7"(),
        'system.notifications',
        'Cấu hình thông báo & Cảnh báo hạn công việc',
        true,
        '{"channels": ["in_app", "email"], "overdueAlertHours": [48, 24, 2], "dailySummaryTime": "08:00", "supervisorEscalationHours": 72, "emailSender": "etpms-notify@goldsun.vn"}'::jsonb,
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1),
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1),
        NOW(), NOW(), 1, 'Native'
    )
    ON CONFLICT ("Key") DO UPDATE 
    SET "Data" = EXCLUDED."Data", "UpdatedAt" = NOW();

    INSERT INTO "_SYSSettingDirectory" ("IdSeq", "Key", "Label", "Enabled", "Data", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion", "AuditOrigin")
    VALUES 
    (
        "_SYSUUIDv7"(),
        'system.integrations',
        'Cấu hình tích hợp hệ thống ngoại vi & ERP',
        true,
        '{"erpType": "SAP S/4HANA", "weighingStationConnected": true, "printerIotGateways": ["OD-PRINTER-01", "OD-PRINTER-02"], "grpcGatewayPort": 60052, "apiSyncIntervalMinutes": 15}'::jsonb,
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1),
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1),
        NOW(), NOW(), 1, 'Native'
    )
    ON CONFLICT ("Key") DO UPDATE 
    SET "Data" = EXCLUDED."Data", "UpdatedAt" = NOW();

    INSERT INTO "_SYSSettingDirectory" ("IdSeq", "Key", "Label", "Enabled", "Data", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion", "AuditOrigin")
    VALUES 
    (
        "_SYSUUIDv7"(),
        'system.data_policy',
        'Chính sách dữ liệu & Thời hạn lưu trữ',
        true,
        '{"auditLogRetentionDays": 365, "autoBackupCron": "0 1 * * *", "backupStorage": "S3-Compliant Local Vault", "maxAttachmentSizeMB": 50, "allowedFileExtensions": ["pdf", "docx", "xlsx", "dwg", "png", "jpg", "zip"]}'::jsonb,
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1),
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1),
        NOW(), NOW(), 1, 'Native'
    )
    ON CONFLICT ("Key") DO UPDATE 
    SET "Data" = EXCLUDED."Data", "UpdatedAt" = NOW();

    -- ========================================================================
    -- 2. ĐĂNG KÝ HỒ SƠ NHÂN VIÊN (_HRMEmployeeDirectory)
    -- ========================================================================
    INSERT INTO "_HRMEmployeeDirectory" ("IdSeq", "Code", "FullName", "Department", "Position", "Phone", "Email", "DelegationLevel", "Status", "UserId", "CreatedAt", "UpdatedAt", "CreatedBy", "UpdatedBy", "RowVersion", "AuditOrigin")
    VALUES
    (
        "_SYSUUIDv7"(), 'NV-001', 'Nguyễn Văn Giám Đốc', 'Ban Giám Đốc', 'Tổng Giám Đốc Điều Hành', '0912345001', 'giamdoc@goldsun.vn', 'company', 'active', v_director_seq, NOW(), NOW(),
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), 1, 'Native'
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "FullName" = EXCLUDED."FullName", "Department" = EXCLUDED."Department", "Position" = EXCLUDED."Position", "UserId" = EXCLUDED."UserId";

    INSERT INTO "_HRMEmployeeDirectory" ("IdSeq", "Code", "FullName", "Department", "Position", "Phone", "Email", "DelegationLevel", "Status", "UserId", "CreatedAt", "UpdatedAt", "CreatedBy", "UpdatedBy", "RowVersion", "AuditOrigin")
    VALUES
    (
        "_SYSUUIDv7"(), 'NV-002', 'Trần Trưởng Phòng Kỹ Thuật', 'Kỹ thuật', 'Trưởng Phòng Kỹ Thuật & R&D', '0912345002', 'kythuat@goldsun.vn', 'department', 'active', v_head_tech_seq, NOW(), NOW(),
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), 1, 'Native'
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "FullName" = EXCLUDED."FullName", "Department" = EXCLUDED."Department", "Position" = EXCLUDED."Position", "UserId" = EXCLUDED."UserId";

    INSERT INTO "_HRMEmployeeDirectory" ("IdSeq", "Code", "FullName", "Department", "Position", "Phone", "Email", "DelegationLevel", "Status", "UserId", "CreatedAt", "UpdatedAt", "CreatedBy", "UpdatedBy", "RowVersion", "AuditOrigin")
    VALUES
    (
        "_SYSUUIDv7"(), 'NV-003', 'Lê Trưởng Phòng Sản Xuất', 'Sản xuất', 'Trưởng Phòng Quản Lý Sản Xuất', '0912345003', 'sanxuat@goldsun.vn', 'department', 'active', v_head_prod_seq, NOW(), NOW(),
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), 1, 'Native'
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "FullName" = EXCLUDED."FullName", "Department" = EXCLUDED."Department", "Position" = EXCLUDED."Position", "UserId" = EXCLUDED."UserId";

    INSERT INTO "_HRMEmployeeDirectory" ("IdSeq", "Code", "FullName", "Department", "Position", "Phone", "Email", "DelegationLevel", "Status", "UserId", "CreatedAt", "UpdatedAt", "CreatedBy", "UpdatedBy", "RowVersion", "AuditOrigin")
    VALUES
    (
        "_SYSUUIDv7"(), 'NV-004', 'Phạm Tổ Trưởng Cơ Điện', 'Kỹ thuật', 'Tổ Trưởng Cơ Điện & Tự Động Hóa', '0912345004', 'codien@goldsun.vn', 'team', 'active', v_lead_tech_seq, NOW(), NOW(),
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), 1, 'Native'
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "FullName" = EXCLUDED."FullName", "Department" = EXCLUDED."Department", "Position" = EXCLUDED."Position", "UserId" = EXCLUDED."UserId";

    INSERT INTO "_HRMEmployeeDirectory" ("IdSeq", "Code", "FullName", "Department", "Position", "Phone", "Email", "DelegationLevel", "Status", "UserId", "CreatedAt", "UpdatedAt", "CreatedBy", "UpdatedBy", "RowVersion", "AuditOrigin")
    VALUES
    (
        "_SYSUUIDv7"(), 'NV-005', 'Vũ Kỹ Sư Lập Trình', 'CNTT', 'Kỹ Sư Phần Mềm & Số Hóa Quy Trình', '0912345005', 'it.dev@goldsun.vn', 'team', 'active', v_dev_tech_seq, NOW(), NOW(),
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), 1, 'Native'
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "FullName" = EXCLUDED."FullName", "Department" = EXCLUDED."Department", "Position" = EXCLUDED."Position", "UserId" = EXCLUDED."UserId";

    INSERT INTO "_HRMEmployeeDirectory" ("IdSeq", "Code", "FullName", "Department", "Position", "Phone", "Email", "DelegationLevel", "Status", "UserId", "CreatedAt", "UpdatedAt", "CreatedBy", "UpdatedBy", "RowVersion", "AuditOrigin")
    VALUES
    (
        "_SYSUUIDv7"(), 'NV-006', 'Bùi Thị Mai', 'Quản lý chất lượng (QA/QC)', 'Trưởng Phòng Kiểm Soát Chất Lượng QA/QC', '0912345006', 'qaqc@goldsun.vn', 'department', 'active', NULL, NOW(), NOW(),
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), 1, 'Native'
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "FullName" = EXCLUDED."FullName", "Department" = EXCLUDED."Department", "Position" = EXCLUDED."Position";

    INSERT INTO "_HRMEmployeeDirectory" ("IdSeq", "Code", "FullName", "Department", "Position", "Phone", "Email", "DelegationLevel", "Status", "UserId", "CreatedAt", "UpdatedAt", "CreatedBy", "UpdatedBy", "RowVersion", "AuditOrigin")
    VALUES
    (
        "_SYSUUIDv7"(), 'NV-007', 'Hoàng Văn Doanh', 'Kinh doanh', 'Trưởng Phòng Kinh Doanh Bao Bì Công Nghiệp', '0912345007', 'kinhdoanh@goldsun.vn', 'department', 'active', NULL, NOW(), NOW(),
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), 1, 'Native'
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "FullName" = EXCLUDED."FullName", "Department" = EXCLUDED."Department", "Position" = EXCLUDED."Position";

    INSERT INTO "_HRMEmployeeDirectory" ("IdSeq", "Code", "FullName", "Department", "Position", "Phone", "Email", "DelegationLevel", "Status", "UserId", "CreatedAt", "UpdatedAt", "CreatedBy", "UpdatedBy", "RowVersion", "AuditOrigin")
    VALUES
    (
        "_SYSUUIDv7"(), 'NV-008', 'Đỗ Thu Trang', 'Hành chính & Nhân sự', 'Trưởng Phòng Hành Chính & Nhân Sự', '0912345008', 'nhansu@goldsun.vn', 'department', 'active', NULL, NOW(), NOW(),
        (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), 1, 'Native'
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "FullName" = EXCLUDED."FullName", "Department" = EXCLUDED."Department", "Position" = EXCLUDED."Position";

    -- Cập nhật ngược EmployeeId vào _USRAccountDirectory
    UPDATE "_USRAccountDirectory" u
    SET "EmployeeId" = e."IdSeq"
    FROM "_HRMEmployeeDirectory" e
    WHERE u."IdSeq" = e."UserId";

    -- ========================================================================
    -- 3. ĐĂNG KÝ NHÓM LÀM VIỆC (_TRNGroup & _TRNGroupMember)
    -- ========================================================================
    INSERT INTO "_TRNGroup" ("IdSeq", "Code", "Name", "LeaderId", "LeaderName", "Description", "Status", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion", "AuditOrigin")
    VALUES
    (
        "_SYSUUIDv7"(), 'TEAM-RD', 'Đội R&D Vật liệu màng phức hợp', v_head_tech_seq, 'Trần Trưởng Phòng Kỹ Thuật',
        'Nghiên cứu công nghệ tráng ghép màng nhiệt đa lớp và thử nghiệm độ bám dính mực in ống đồng.',
        'active', (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), NOW(), NOW(), 1, 'Native'
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "Name" = EXCLUDED."Name", "LeaderId" = EXCLUDED."LeaderId", "LeaderName" = EXCLUDED."LeaderName", "Description" = EXCLUDED."Description"
    RETURNING "IdSeq" INTO v_team1_id;

    INSERT INTO "_TRNGroup" ("IdSeq", "Code", "Name", "LeaderId", "LeaderName", "Description", "Status", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion", "AuditOrigin")
    VALUES
    (
        "_SYSUUIDv7"(), 'TEAM-QC-NM2', 'Tổ Kiểm định chất lượng NM2 - Hưng Yên', v_head_prod_seq, 'Bùi Thị Mai',
        'Giám sát chỉ tiêu cơ lý, độ bền kéo đứt màng BOPP và kiểm tra ngoại quan thành phẩm cuộn.',
        'active', (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), NOW(), NOW(), 1, 'Native'
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "Name" = EXCLUDED."Name", "LeaderId" = EXCLUDED."LeaderId", "LeaderName" = EXCLUDED."LeaderName", "Description" = EXCLUDED."Description"
    RETURNING "IdSeq" INTO v_team2_id;

    INSERT INTO "_TRNGroup" ("IdSeq", "Code", "Name", "LeaderId", "LeaderName", "Description", "Status", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion", "AuditOrigin")
    VALUES
    (
        "_SYSUUIDv7"(), 'TEAM-IN-OD', 'Tổ Vận hành Máy in Ống đồng 8 màu', v_head_prod_seq, 'Lê Trưởng Phòng Sản Xuất',
        'Chịu trách nhiệm trực tiếp ca sản xuất in ấn bao bì thực phẩm sạch, canh màu và bảo dưỡng trục in.',
        'active', (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), NOW(), NOW(), 1, 'Native'
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "Name" = EXCLUDED."Name", "LeaderId" = EXCLUDED."LeaderId", "LeaderName" = EXCLUDED."LeaderName", "Description" = EXCLUDED."Description"
    RETURNING "IdSeq" INTO v_team3_id;

    INSERT INTO "_TRNGroup" ("IdSeq", "Code", "Name", "LeaderId", "LeaderName", "Description", "Status", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion", "AuditOrigin")
    VALUES
    (
        "_SYSUUIDv7"(), 'TEAM-IT-ERP', 'Đội Triển khai Hệ thống Số hóa & ETPMS', v_dev_tech_seq, 'Vũ Kỹ Sư Lập Trình',
        'Phát triển module quản lý sản xuất, tích hợp cân tự động và hệ thống quản lý công việc ETPMS.',
        'active', (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), (SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1), NOW(), NOW(), 1, 'Native'
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "Name" = EXCLUDED."Name", "LeaderId" = EXCLUDED."LeaderId", "LeaderName" = EXCLUDED."LeaderName", "Description" = EXCLUDED."Description"
    RETURNING "IdSeq" INTO v_team4_id;

    -- Thêm thành viên vào các nhóm
    IF v_team1_id IS NOT NULL THEN
        INSERT INTO "_TRNGroupMember" ("GroupId", "UserId", "AddedAt") VALUES (v_team1_id, v_head_tech_seq, NOW()) ON CONFLICT DO NOTHING;
        INSERT INTO "_TRNGroupMember" ("GroupId", "UserId", "AddedAt") VALUES (v_team1_id, v_lead_tech_seq, NOW()) ON CONFLICT DO NOTHING;
    END IF;
    IF v_team4_id IS NOT NULL THEN
        INSERT INTO "_TRNGroupMember" ("GroupId", "UserId", "AddedAt") VALUES (v_team4_id, v_dev_tech_seq, NOW()) ON CONFLICT DO NOTHING;
        INSERT INTO "_TRNGroupMember" ("GroupId", "UserId", "AddedAt") VALUES (v_team4_id, v_admin_seq, NOW()) ON CONFLICT DO NOTHING;
    END IF;

    -- ========================================================================
    -- 4. ĐĂNG KÝ DỰ ÁN TRỌNG ĐIỂM (_TSKProject)
    -- ========================================================================
    INSERT INTO "_TSKProject" ("Code", "Name", "Description", "Status", "Priority", "StartDate", "DueDate", "Department", "ManagerId", "CreatedBy", "CreatedAt", "UpdatedAt")
    VALUES
    (
        'PRJ-2026-001',
        'Dự án ISO Bao bì thực phẩm xuất khẩu',
        'Đồng bộ quy trình sản xuất màng phức hợp đạt chứng nhận ISO 22000 & BRC Packaging cho thị trường Bắc Mỹ và EU.',
        'in_progress', 'high', NOW() - INTERVAL '30 days', NOW() + INTERVAL '90 days', 'Kỹ thuật', v_director_seq, v_admin_seq, NOW(), NOW()
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "Name" = EXCLUDED."Name", "Description" = EXCLUDED."Description", "ManagerId" = EXCLUDED."ManagerId", "DueDate" = EXCLUDED."DueDate"
    RETURNING "IdSeq" INTO v_prj1_id;

    INSERT INTO "_TSKProject" ("Code", "Name", "Description", "Status", "Priority", "StartDate", "DueDate", "Department", "ManagerId", "CreatedBy", "CreatedAt", "UpdatedAt")
    VALUES
    (
        'PRJ-2026-002',
        'Nghiên cứu màng ghép Metalize độ bền cao',
        'Phát triển dòng màng bao bì tráng nhôm công nghệ ghép đùn nhiệt độ cao chống thẩm thấu oxy và hơi nước tuyệt đối.',
        'in_progress', 'urgent', NOW() - INTERVAL '20 days', NOW() + INTERVAL '45 days', 'Kỹ thuật', v_head_tech_seq, v_admin_seq, NOW(), NOW()
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "Name" = EXCLUDED."Name", "Description" = EXCLUDED."Description", "ManagerId" = EXCLUDED."ManagerId", "DueDate" = EXCLUDED."DueDate"
    RETURNING "IdSeq" INTO v_prj2_id;

    INSERT INTO "_TSKProject" ("Code", "Name", "Description", "Status", "Priority", "StartDate", "DueDate", "Department", "ManagerId", "CreatedBy", "CreatedAt", "UpdatedAt")
    VALUES
    (
        'PRJ-2026-003',
        'Triển khai tự động hóa cân điện tử NM2 & ETPMS',
        'Tích hợp cân kiểm tra trọng lượng cuộn màng tự động với API Gateway của phần mềm quản lý công việc.',
        'in_progress', 'medium', NOW() - INTERVAL '15 days', NOW() + INTERVAL '30 days', 'CNTT', v_dev_tech_seq, v_admin_seq, NOW(), NOW()
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "Name" = EXCLUDED."Name", "Description" = EXCLUDED."Description", "ManagerId" = EXCLUDED."ManagerId", "DueDate" = EXCLUDED."DueDate"
    RETURNING "IdSeq" INTO v_prj3_id;

    INSERT INTO "_TSKProject" ("Code", "Name", "Description", "Status", "Priority", "StartDate", "DueDate", "Department", "ManagerId", "CreatedBy", "CreatedAt", "UpdatedAt")
    VALUES
    (
        'PRJ-2026-004',
        'Bao bì xanh GoldGreen tự phân hủy hoàn toàn PLA',
        'Nghiên cứu vật liệu màng sinh học thân thiện môi trường thay thế bao bì nhựa truyền thống cho các đối tác siêu thị.',
        'in_progress', 'high', NOW() - INTERVAL '10 days', NOW() + INTERVAL '120 days', 'Sản xuất', v_head_prod_seq, v_admin_seq, NOW(), NOW()
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "Name" = EXCLUDED."Name", "Description" = EXCLUDED."Description", "ManagerId" = EXCLUDED."ManagerId", "DueDate" = EXCLUDED."DueDate"
    RETURNING "IdSeq" INTO v_prj4_id;

    -- Thêm Milestone cho dự án
    IF v_prj1_id IS NOT NULL THEN
        DELETE FROM "_TSKMilestone" WHERE "ProjectId" = v_prj1_id;
        INSERT INTO "_TSKMilestone" ("ProjectId", "Title", "DueDate", "Status", "Description", "CreatedAt")
        VALUES 
        (v_prj1_id, 'Hoàn tất đánh giá tiêu chuẩn cơ lý màng BOPP', NOW() - INTERVAL '5 days', 'completed', 'Đạt 5 chỉ tiêu kéo đứt theo tiêu chuẩn ASTM D882', NOW()),
        (v_prj1_id, 'Sản xuất lô thử nghiệm 10.000 mét vuông', NOW() + INTERVAL '15 days', 'open', 'Chạy in ấn và tráng ghép trên chuyền NM2', NOW()),
        (v_prj1_id, 'Thẩm định nghiệm thu cấp chứng chỉ ISO 22000', NOW() + INTERVAL '60 days', 'open', 'Đoàn chuyên gia đánh giá hiện trường', NOW());
        
        -- Gán thành viên dự án
        INSERT INTO "_TSKProjectMember" ("ProjectId", "UserId", "Role", "CreatedAt") VALUES (v_prj1_id, v_director_seq, 'sponsor', NOW()) ON CONFLICT DO NOTHING;
        INSERT INTO "_TSKProjectMember" ("ProjectId", "UserId", "Role", "CreatedAt") VALUES (v_prj1_id, v_head_tech_seq, 'project_manager', NOW()) ON CONFLICT DO NOTHING;
        INSERT INTO "_TSKProjectMember" ("ProjectId", "UserId", "Role", "CreatedAt") VALUES (v_prj1_id, v_head_prod_seq, 'member', NOW()) ON CONFLICT DO NOTHING;
    END IF;

    -- ========================================================================
    -- 5. ĐĂNG KÝ DANH MỤC CÔNG VIỆC THỰC TẾ (_TSKTask)
    -- ========================================================================
    INSERT INTO "_TSKTask" ("ProjectId", "Code", "Title", "Description", "Priority", "Status", "Progress", "AssigneeId", "SupervisorId", "Department", "StartDate", "DueDate", "CompletedAt", "EstimatedHours", "ActualHours", "DelegationLevel", "CreatedAt", "UpdatedAt", "CreatedBy")
    VALUES
    (
        v_prj1_id, 'TSK-001',
        'Thử nghiệm độ bền kéo đứt màng BOPP tráng ghép nhiệt',
        'Tiến hành lấy 10 mẫu ngẫu nhiên từ cuộn màng ghép nhiệt phân xưởng NM2. Đo lực kéo đứt và độ giãn dài tương đối theo chiều dọc (MD) và chiều ngang (TD).',
        'urgent', 'completed', 100, v_lead_tech_seq, v_head_tech_seq, 'Kỹ thuật',
        NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days', 16, 14.5, 'department', NOW(), NOW(), v_head_tech_seq
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "Title" = EXCLUDED."Title", "Status" = EXCLUDED."Status", "Progress" = EXCLUDED."Progress", "AssigneeId" = EXCLUDED."AssigneeId", "SupervisorId" = EXCLUDED."SupervisorId"
    RETURNING "IdSeq" INTO v_tsk1_id;

    INSERT INTO "_TSKTask" ("ProjectId", "Code", "Title", "Description", "Priority", "Status", "Progress", "AssigneeId", "SupervisorId", "Department", "StartDate", "DueDate", "CompletedAt", "EstimatedHours", "ActualHours", "DelegationLevel", "CreatedAt", "UpdatedAt", "CreatedBy")
    VALUES
    (
        v_prj1_id, 'TSK-002',
        'Hiệu chỉnh canh màu máy in ống đồng 8 màu lô 4200 cuộn',
        'Canh chỉnh độ chồng màu và kiểm soát độ đậm đặc quang học mật độ màu (Optical Density) trên hệ máy in ống đồng tự động.',
        'urgent', 'in_progress', 85, v_head_prod_seq, v_director_seq, 'Sản xuất',
        NOW() - INTERVAL '3 days', NOW() + INTERVAL '2 days', NULL, 24, 20, 'company', NOW(), NOW(), v_director_seq
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "Title" = EXCLUDED."Title", "Status" = EXCLUDED."Status", "Progress" = EXCLUDED."Progress", "AssigneeId" = EXCLUDED."AssigneeId", "SupervisorId" = EXCLUDED."SupervisorId"
    RETURNING "IdSeq" INTO v_tsk2_id;

    INSERT INTO "_TSKTask" ("ProjectId", "Code", "Title", "Description", "Priority", "Status", "Progress", "AssigneeId", "SupervisorId", "Department", "StartDate", "DueDate", "CompletedAt", "EstimatedHours", "ActualHours", "DelegationLevel", "CreatedAt", "UpdatedAt", "CreatedBy")
    VALUES
    (
        v_prj2_id, 'TSK-003',
        'Báo cáo thử nghiệm độ bám dính mực in trên màng nhôm Metalize',
        'Thực hiện kiểm tra bám dính bằng băng keo 3M chuyên dụng sau 24h tráng phủ mực, đánh giá hiện tượng tróc màng hoặc loang màu.',
        'high', 'in_review', 90, v_lead_tech_seq, v_head_tech_seq, 'Kỹ thuật',
        NOW() - INTERVAL '5 days', NOW() + INTERVAL '1 days', NULL, 12, 11, 'department', NOW(), NOW(), v_head_tech_seq
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "Title" = EXCLUDED."Title", "Status" = EXCLUDED."Status", "Progress" = EXCLUDED."Progress", "AssigneeId" = EXCLUDED."AssigneeId", "SupervisorId" = EXCLUDED."SupervisorId"
    RETURNING "IdSeq" INTO v_tsk3_id;

    INSERT INTO "_TSKTask" ("ProjectId", "Code", "Title", "Description", "Priority", "Status", "Progress", "AssigneeId", "SupervisorId", "Department", "StartDate", "DueDate", "CompletedAt", "EstimatedHours", "ActualHours", "DelegationLevel", "CreatedAt", "UpdatedAt", "CreatedBy")
    VALUES
    (
        v_prj3_id, 'TSK-004',
        'Kiểm thử tích hợp dữ liệu cân điện tử NM2 với API Gateway',
        'Lập trình script test tự động gửi tín hiệu webhook khi cuộn màng hoàn thành đóng gói lên hệ thống ETPMS để cập nhật kho thành phẩm.',
        'medium', 'in_progress', 65, v_dev_tech_seq, v_head_tech_seq, 'CNTT',
        NOW() - INTERVAL '6 days', NOW() + INTERVAL '4 days', NULL, 20, 13, 'team', NOW(), NOW(), v_head_tech_seq
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "Title" = EXCLUDED."Title", "Status" = EXCLUDED."Status", "Progress" = EXCLUDED."Progress", "AssigneeId" = EXCLUDED."AssigneeId", "SupervisorId" = EXCLUDED."SupervisorId"
    RETURNING "IdSeq" INTO v_tsk4_id;

    INSERT INTO "_TSKTask" ("ProjectId", "Code", "Title", "Description", "Priority", "Status", "Progress", "AssigneeId", "SupervisorId", "Department", "StartDate", "DueDate", "CompletedAt", "EstimatedHours", "ActualHours", "DelegationLevel", "CreatedAt", "UpdatedAt", "CreatedBy")
    VALUES
    (
        v_prj4_id, 'TSK-005',
        'Nghiên cứu nhiệt độ nóng chảy và độ nhớt màng sinh học PLA',
        'Đo chỉ số dòng chảy đùn MFI tại nhiệt độ 190°C và 210°C nhằm xác định thông số gia nhiệt tối ưu cho dây chuyền thổi màng 3 lớp.',
        'high', 'todo', 10, v_lead_tech_seq, v_head_prod_seq, 'Kỹ thuật',
        NOW() - INTERVAL '1 days', NOW() + INTERVAL '7 days', NULL, 30, 3, 'department', NOW(), NOW(), v_head_prod_seq
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "Title" = EXCLUDED."Title", "Status" = EXCLUDED."Status", "Progress" = EXCLUDED."Progress", "AssigneeId" = EXCLUDED."AssigneeId", "SupervisorId" = EXCLUDED."SupervisorId"
    RETURNING "IdSeq" INTO v_tsk5_id;

    INSERT INTO "_TSKTask" ("ProjectId", "Code", "Title", "Description", "Priority", "Status", "Progress", "AssigneeId", "SupervisorId", "Department", "StartDate", "DueDate", "CompletedAt", "EstimatedHours", "ActualHours", "DelegationLevel", "CreatedAt", "UpdatedAt", "CreatedBy")
    VALUES
    (
        v_prj1_id, 'TSK-006',
        'Đo kiểm độ dày màng metalize ghép đùn lô hàng NM2',
        'Kiểm tra độ đồng đều micron mét trên toàn bộ khổ rộng 1200mm cuộn màng, phát hiện sớm biến thiên độ dày để điều chỉnh khe hở đầu đùn T-Die.',
        'urgent', 'in_review', 75, v_lead_tech_seq, v_head_tech_seq, 'Kỹ thuật',
        NOW() - INTERVAL '8 days', NOW() - INTERVAL '2 days', NULL, 18, 16, 'department', NOW(), NOW(), v_head_tech_seq
    )
    ON CONFLICT ("Code") DO UPDATE 
    SET "Title" = EXCLUDED."Title", "Status" = EXCLUDED."Status", "Progress" = EXCLUDED."Progress", "AssigneeId" = EXCLUDED."AssigneeId", "SupervisorId" = EXCLUDED."SupervisorId"
    RETURNING "IdSeq" INTO v_tsk6_id;

    -- ========================================================================
    -- 6. ĐĂNG KÝ CHECKLIST CÔNG VIỆC (_TSKTaskChecklist)
    -- ========================================================================
    IF v_tsk1_id IS NOT NULL THEN
        DELETE FROM "_TSKTaskChecklist" WHERE "TaskId" = v_tsk1_id;
        INSERT INTO "_TSKTaskChecklist" ("TaskId", "Title", "IsCompleted", "CompletedAt", "CompletedBy", "SortOrder", "CreatedAt")
        VALUES
        (v_tsk1_id, 'Chuẩn bị dao cắt mẫu chuyên dụng đạt chuẩn ASTM', true, NOW() - INTERVAL '6 days', v_lead_tech_seq, 1, NOW()),
        (v_tsk1_id, 'Hiệu chuẩn cảm biến lực đầu đo máy kéo Instron', true, NOW() - INTERVAL '5 days', v_lead_tech_seq, 2, NOW()),
        (v_tsk1_id, 'Thực hiện kéo đứt 5 mẫu chiều dọc MD', true, NOW() - INTERVAL '3 days', v_lead_tech_seq, 3, NOW()),
        (v_tsk1_id, 'Thực hiện kéo đứt 5 mẫu chiều ngang TD', true, NOW() - INTERVAL '2 days', v_lead_tech_seq, 4, NOW()),
        (v_tsk1_id, 'Xuất biểu đồ lực - biến dạng và lập biên bản kết luận', true, NOW() - INTERVAL '1 days', v_lead_tech_seq, 5, NOW());
    END IF;

    IF v_tsk2_id IS NOT NULL THEN
        DELETE FROM "_TSKTaskChecklist" WHERE "TaskId" = v_tsk2_id;
        INSERT INTO "_TSKTaskChecklist" ("TaskId", "Title", "IsCompleted", "CompletedAt", "CompletedBy", "SortOrder", "CreatedAt")
        VALUES
        (v_tsk2_id, 'Vệ sinh sạch sẽ hệ thống máng cấp mực và ống bơm tuần hoàn', true, NOW() - INTERVAL '2 days', v_head_prod_seq, 1, NOW()),
        (v_tsk2_id, 'Kiểm tra độ nhớt mực in bằng phễu Zahn Cup số 2 (18 - 22 giây)', true, NOW() - INTERVAL '1 days', v_head_prod_seq, 2, NOW()),
        (v_tsk2_id, 'Canh chỉnh mắt đọc đăng ký màu tự động (Automatic Register Control)', true, NOW() - INTERVAL '8 hours', v_head_prod_seq, 3, NOW()),
        (v_tsk2_id, 'In thử 200m đầu cuộn và đối chiếu bảng so màu Pantone', false, NULL, NULL, 4, NOW()),
        (v_tsk2_id, 'Trình lãnh đạo ký duyệt mẫu Gold Standard trước khi chạy hàng loạt', false, NULL, NULL, 5, NOW());
    END IF;

    -- ========================================================================
    -- 7. ĐĂNG KÝ NHẬT KÝ TIẾN ĐỘ & PHẢN HỒI SUPERVISOR (_TSKProgressLog)
    -- ========================================================================
    IF v_tsk1_id IS NOT NULL THEN
        DELETE FROM "_TSKProgressLog" WHERE "TaskId" = v_tsk1_id;
        INSERT INTO "_TSKProgressLog" ("TaskId", "ReportedBy", "PreviousProgress", "CurrentProgress", "PreviousStatus", "CurrentStatus", "Content", "AttachmentUrl", "SupervisorFeedback", "FeedbackStatus", "FeedbackBy", "FeedbackAt", "CreatedAt")
        VALUES
        (
            v_tsk1_id, v_lead_tech_seq, 0, 50, 'todo', 'in_progress',
            'Đã hoàn thành cắt 10 dải mẫu thử nghiệm và hiệu chuẩn máy kéo đạt sai số cho phép < 0.5%.',
            '/app/documents/DOC-001', 'Tiếp tục triển khai đo lực kéo đứt 5 mẫu chiều ngang.', 'approved', v_head_tech_seq, NOW() - INTERVAL '3 days', NOW() - INTERVAL '4 days'
        ),
        (
            v_tsk1_id, v_lead_tech_seq, 50, 100, 'in_progress', 'completed',
            'Đã hoàn tất đo toàn bộ 10 mẫu. Lực kéo đứt trung bình đạt 165 N/15mm (vượt chỉ tiêu yêu cầu 150 N/15mm). Kính trình phê duyệt hoàn tất.',
            '/app/documents/DOC-004', 'Nghiệm thu đạt yêu cầu. Đồng ý hoàn tất công việc.', 'approved', v_head_tech_seq, NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days'
        );
    END IF;

    -- ========================================================================
    -- 8. ĐĂNG KÝ YÊU CẦU PHÊ DUYỆT & NGHIỆM THU (_TSKApprovalRequest)
    -- ========================================================================
    IF v_tsk1_id IS NOT NULL THEN
        INSERT INTO "_TSKApprovalRequest" ("TaskId", "RequesterId", "ApproverId", "Status", "RequestNote", "ApprovalNote", "SubmittedAt", "ReviewedAt")
        VALUES
        (
            v_tsk1_id, v_lead_tech_seq, v_head_tech_seq, 'approved',
            'Kính trình Trưởng phòng xem xét biên bản thử nghiệm độ bền kéo đứt màng BOPP theo tiêu chuẩn xuất khẩu EU.',
            'Đã kiểm tra số liệu phòng lab NM2. Các chỉ số cơ lý đều đạt chuẩn ISO. Đồng ý phê duyệt.',
            NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 days'
        );
    END IF;

    IF v_tsk3_id IS NOT NULL THEN
        INSERT INTO "_TSKApprovalRequest" ("TaskId", "RequesterId", "ApproverId", "Status", "RequestNote", "ApprovalNote", "SubmittedAt", "ReviewedAt")
        VALUES
        (
            v_tsk3_id, v_lead_tech_seq, v_head_tech_seq, 'pending',
            'Kính gửi Trưởng phòng: Mẫu màng nhôm sau 24h tráng phủ mực đạt độ bám dính 100%, xin ý kiến duyệt nghiệm thu công việc.',
            '',
            NOW() - INTERVAL '12 hours', NULL
        );
    END IF;

    IF v_tsk6_id IS NOT NULL THEN
        INSERT INTO "_TSKApprovalRequest" ("TaskId", "RequesterId", "ApproverId", "Status", "RequestNote", "ApprovalNote", "SubmittedAt", "ReviewedAt")
        VALUES
        (
            v_tsk6_id, v_lead_tech_seq, v_director_seq, 'pending',
            'Trình Ban Giám Đốc phê duyệt bảng dung sai độ dày màng đùn nhiệt phục vụ dự án bao bì cao cấp Nhật Bản.',
            '',
            NOW() - INTERVAL '6 hours', NULL
        );
    END IF;

    -- ========================================================================
    -- 9. ĐĂNG KÝ TÀI LIỆU ĐÍNH KÈM (_TSKAttachment)
    -- ========================================================================
    IF v_tsk1_id IS NOT NULL THEN
        DELETE FROM "_TSKAttachment" WHERE "TaskId" = v_tsk1_id;
        INSERT INTO "_TSKAttachment" ("TaskId", "FileName", "FileSize", "FileType", "FileUrl", "UploadedBy", "CreatedAt")
        VALUES
        (v_tsk1_id, 'Quy trình vận hành sản xuất bao bì tiêu chuẩn 2026.pdf', 4404019, 'application/pdf', '/app/documents/DOC-001', v_director_seq, NOW() - INTERVAL '5 days'),
        (v_tsk1_id, 'Biên bản nghiệm thu độ bền kéo đứt màng BOPP.pdf', 2621440, 'application/pdf', '/app/documents/DOC-004', v_lead_tech_seq, NOW() - INTERVAL '1 days');
    END IF;

    IF v_tsk2_id IS NOT NULL THEN
        DELETE FROM "_TSKAttachment" WHERE "TaskId" = v_tsk2_id;
        INSERT INTO "_TSKAttachment" ("TaskId", "FileName", "FileSize", "FileType", "FileUrl", "UploadedBy", "CreatedAt")
        VALUES
        (v_tsk2_id, 'Bảng thông số kỹ thuật pha chế mực in ống đồng 8 màu.xlsx', 870400, 'application/vnd.ms-excel', '/app/documents/DOC-003', v_head_prod_seq, NOW() - INTERVAL '2 days');
    END IF;

    RAISE NOTICE 'Đăng ký thành công toàn bộ dữ liệu hoạt động và dữ liệu hệ thống cho ETPMS Goldsun Packaging!';
END $$;

COMMIT;

