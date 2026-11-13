-- ============================================================================
-- ETPMS ENTERPRISE SCHEMA & AUTO-REGISTRATION SEED DATA (GOLDSUN PACKAGING)
-- Automatically executed on server-task startup
-- ============================================================================

BEGIN;

-- 0. Ensure helper UUIDv7 function exists
CREATE OR REPLACE FUNCTION "_SYSUUIDv7"() RETURNS uuid LANGUAGE plpgsql VOLATILE AS $$
DECLARE b bytea; ms bigint;
BEGIN
 ms:=floor(extract(epoch FROM clock_timestamp())*1000)::bigint;
 b:=decode(lpad(to_hex(ms),12,'0')||substr(replace(gen_random_uuid()::text,'-',''),13,20),'hex');
 b:=set_byte(b,6,(get_byte(b,6)&15)|112);
 b:=set_byte(b,8,(get_byte(b,8)&63)|128);
 RETURN encode(b,'hex')::uuid;
END $$;

-- Drop incompatible legacy _TSK tables if _TSKTask is missing "AssignerId"
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_TSKTask')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '_TSKTask' AND column_name = 'AssignerId') THEN
    DROP TABLE IF EXISTS "_TSKNotification", "_TSKAttachment", "_TSKComment", "_TSKApprovalRequest", "_TSKProgressLog", "_TSKTaskChecklist", "_TSKTaskAssignee", "_TSKTask", "_TSKMilestone", "_TSKProjectMember", "_TSKProject", "_TSKCategory" CASCADE;
  END IF;
END $$;

-- 1. Organization Directory (_ORGDirectory)
INSERT INTO "_ORGDirectory"("Kind","Key","Label","Enabled") VALUES
  ('department','board_of_directors','Ban Tổng Giám đốc (BOD)',true),
  ('department','it_erp','Phòng ban Quản trị ERP & CNTT',true),
  ('department','production_offset','Khối Sản xuất In Offset & Flexo',true),
  ('department','production_corrugated','Khối Sản xuất Sóng & Thành phẩm',true),
  ('department','qa_qc','Phòng Quản lý Chất lượng (QA/QC)',true),
  ('department','rnd_design','Phòng R&D & Thiết kế Cấu trúc Bao bì',true),
  ('department','supply_chain','Khối Cung ứng & Logistics',true),
  ('department','sales_b2b','Khối Kinh doanh B2B & FDI',true),
  ('department','it_digital','Phòng CNTT & Chuyển đổi số (IT & MES)',true),
  ('department','hr_admin','Phòng Hành chính - Nhân sự',true),
  ('department','finance_accounting','Phòng Tài chính - Kế toán',true),
  ('position','ceo','Tổng Giám đốc (CEO)',true),
  ('position','plant_director','Giám đốc Nhà máy (Plant Director)',true),
  ('position','dept_head','Trưởng phòng / Trưởng bộ phận',true),
  ('position','team_lead','Tổ trưởng / Trưởng nhóm / Quản đốc',true),
  ('position','senior_specialist','Chuyên viên chính / Kỹ sư trưởng',true),
  ('position','specialist','Chuyên viên / Kỹ sư / Nhân viên',true),
  ('job_role','executive','Ban điều hành',true),
  ('job_role','manager','Quản lý cấp trung',true),
  ('job_role','supervisor','Giám sát sản xuất & Kỹ thuật',true),
  ('job_role','engineer','Kỹ sư R&D / CNTT / QA',true),
  ('job_role','operator','Vận hành & Điều độ sản xuất',true)
ON CONFLICT("Kind","Key") DO UPDATE SET "Label"=EXCLUDED."Label", "Enabled"=true;

-- 2. Enterprise User Accounts (_USRAccountDirectory)
-- Update admin profile so it has full Goldsun Executive metadata
UPDATE "_USRAccountDirectory"
SET "Name" = 'Hoàng Văn Tuấn',
    "Department" = 'Phòng ban Quản trị ERP & CNTT',
    "Position" = 'Quản trị viên Hệ thống ERP & CNTT',
    "JobRole" = 'manager',
    "Phone" = '0903111222',
    "ContactEmail" = 'admin@goldsunpackaging.vn'
WHERE "Username" = 'admin';

-- Note: Only keep the primary admin account per user requirement.
-- Secondary accounts have been cleaned up.

-- 3. Employee Directory (_HRMEmployeeDirectory)
CREATE TABLE IF NOT EXISTS "_HRMEmployeeDirectory" (
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "Code" varchar(50) UNIQUE NOT NULL,
  "FullName" text NOT NULL,
  "Department" text NOT NULL DEFAULT '',
  "Position" text NOT NULL DEFAULT '',
  "Phone" text NOT NULL DEFAULT '',
  "Email" text NOT NULL DEFAULT '',
  "DelegationLevel" varchar(50) NOT NULL DEFAULT 'department',
  "Status" varchar(30) NOT NULL DEFAULT 'active',
  "UserId" uuid,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "CreatedBy" uuid NOT NULL DEFAULT '019db520-0001-7000-8000-000000000001',
  "UpdatedBy" uuid NOT NULL DEFAULT '019db520-0001-7000-8000-000000000001',
  "RowVersion" bigint NOT NULL DEFAULT 1,
  "AuditOrigin" text NOT NULL DEFAULT 'Native'
);

DO $hrm_seed$
DECLARE sys uuid;
BEGIN
  SELECT "IdSeq" INTO sys FROM "_SYSActorDirectory" WHERE "ActorType"='SYSTEM' LIMIT 1;
  IF sys IS NULL THEN
    sys := '019db520-0001-7000-8000-000000000001'::uuid;
  END IF;
  INSERT INTO "_HRMEmployeeDirectory"("Code","FullName","Department","Position","Phone","Email","DelegationLevel","Status","UserId","CreatedBy","UpdatedBy") VALUES
    ('GS-0001','Phạm Hồng Quân','Ban Tổng Giám đốc (BOD)','Tổng Giám đốc (CEO)','0903111222','quan.pham@goldsunpackaging.vn','executive','active','019db520-0001-7000-8000-000000000001',sys,sys),
    ('GS-0002','Nguyễn Đức Minh','Khối Sản xuất In Offset & Flexo','Giám đốc Nhà máy','0903222333','minh.nguyen@goldsunpackaging.vn','director','active','019db520-0002-7000-8000-000000000002',sys,sys),
    ('GS-0015','Trần Quốc Hưng','Khối Sản xuất In Offset & Flexo','Trưởng bộ phận Sản xuất','0903333444','hung.tran@goldsunpackaging.vn','department','active','019db520-0003-7000-8000-000000000003',sys,sys),
    ('GS-0022','Lê Thị Hương Lan','Phòng Quản lý Chất lượng (QA/QC)','Trưởng phòng QA/QC','0903444555','lan.le@goldsunpackaging.vn','department','active','019db520-0004-7000-8000-000000000004',sys,sys),
    ('GS-0028','Hoàng Văn Tuấn','Phòng R&D & Thiết kế Cấu trúc Bao bì','Trưởng phòng R&D & Kỹ thuật','0903555666','tuan.hoang@goldsunpackaging.vn','department','active','019db520-0005-7000-8000-000000000005',sys,sys),
    ('GS-0034','Vũ Phương Thảo','Khối Cung ứng & Logistics','Trưởng phòng Mua hàng & Kho vận','0903666777','thao.vu@goldsunpackaging.vn','department','active','019db520-0006-7000-8000-000000000006',sys,sys),
    ('GS-0102','Bùi Hải Nam','Khối Sản xuất In Offset & Flexo','Quản đốc Xưởng In Offset','0903777888','nam.bui@goldsunpackaging.vn','team','active','019db520-0007-7000-8000-000000000007',sys,sys),
    ('GS-0145','Đỗ Văn Hùng','Phòng R&D & Thiết kế Cấu trúc Bao bì','Kỹ sư trưởng Thiết kế Cấu trúc','0903888999','hung.do@goldsunpackaging.vn','individual','active','019db520-0008-7000-8000-000000000008',sys,sys),
    ('GS-0188','Ngô Tuyết Mai','Phòng Quản lý Chất lượng (QA/QC)','Chuyên viên Kiểm soát Chất lượng','0903999000','mai.ngo@goldsunpackaging.vn','individual','active','019db520-0009-7000-8000-000000000009',sys,sys),
    ('GS-0210','Đinh Tiến Đạt','Phòng ban Quản trị ERP & CNTT','Chuyên viên chính Hệ thống MES/ERP','0904111222','dat.dinh@goldsunpackaging.vn','individual','active','019db520-0010-7000-8000-000000000010',sys,sys)
  ON CONFLICT("Code") DO UPDATE SET
    "FullName"=EXCLUDED."FullName",
    "Department"=EXCLUDED."Department",
    "Position"=EXCLUDED."Position",
    "Phone"=EXCLUDED."Phone",
    "Email"=EXCLUDED."Email",
    "DelegationLevel"=EXCLUDED."DelegationLevel";
END $hrm_seed$;

-- 4. Work Teams (_TRNGroup & _TRNGroupMember)
CREATE TABLE IF NOT EXISTS "_TRNGroup" (
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "Code" text NOT NULL UNIQUE,
  "Name" text NOT NULL,
  "LeaderId" uuid,
  "LeaderName" text NOT NULL DEFAULT '',
  "Description" text NOT NULL DEFAULT '',
  "Status" text NOT NULL DEFAULT 'active',
  "CreatedBy" uuid,
  "UpdatedBy" uuid,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "RowVersion" bigint NOT NULL DEFAULT 1,
  "AuditOrigin" text NOT NULL DEFAULT 'Native'
);

CREATE TABLE IF NOT EXISTS "_TRNGroupMember" (
  "GroupId" uuid NOT NULL,
  "UserId" uuid NOT NULL,
  "AddedAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("GroupId", "UserId")
);

INSERT INTO "_TRNGroup"("IdSeq","Code","Name","LeaderId","LeaderName","Description","Status") VALUES
  ('019db525-0001-7000-8000-000000000001','TEAM-OFFSET-1','Tổ Sản xuất In Offset Ca 1 (Heidelberg Speedmaster)','019db520-0007-7000-8000-000000000007','Bùi Hải Nam','Chuyên trách vận hành cụm máy in Offset 6 màu & 8 màu phục vụ đơn hàng Samsung, LG, Canon','active'),
  ('019db525-0002-7000-8000-000000000002','TEAM-RND-PACK','Tổ Thiết kế Cấu trúc & Chế bản R&D','019db520-0005-7000-8000-000000000005','Hoàng Văn Tuấn','Thiết kế cấu trúc hộp cứng cao cấp, bình duyệt mẫu Mockup 3D và xuất kẽm CTP','active'),
  ('019db525-0003-7000-8000-000000000003','TEAM-QA-FSC','Ban Kiểm soát Chất lượng ISO 9001 & FSC/BRC','019db520-0004-7000-8000-000000000004','Lê Thị Hương Lan','Kiểm soát chất lượng IQC, PQC, OQC và duy trì tiêu chuẩn FSC-CoC, BRCGS Packaging','active'),
  ('019db525-0004-7000-8000-000000000004','TEAM-MES-DX','Tổ Dự án Chuyển đổi số Nhà máy Thông minh (MES & ETPMS)','019db520-0010-7000-8000-000000000010','Đinh Tiến Đạt','Triển khai phần mềm Quản lý điều hành tác nghiệp ETPMS, tích hợp SAP ERP và IoT Shopfloor','active')
ON CONFLICT("Code") DO UPDATE SET
  "Name"=EXCLUDED."Name",
  "LeaderName"=EXCLUDED."LeaderName",
  "Description"=EXCLUDED."Description";

-- 5. ETPMS Core Tables (_TSKProject, _TSKMilestone, _TSKTask, _TSKTaskChecklist, _TSKProgressLog, _TSKApprovalRequest, _TSKComment, _TSKAttachment)
CREATE TABLE IF NOT EXISTS "_TSKProject" (
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "Code" text UNIQUE NOT NULL,
  "Name" text NOT NULL,
  "Description" text NOT NULL DEFAULT '',
  "Department" text NOT NULL DEFAULT '',
  "ManagerId" uuid,
  "StartDate" timestamptz,
  "EndDate" timestamptz,
  "Budget" numeric(18,2) NOT NULL DEFAULT 0,
  "Status" text NOT NULL DEFAULT 'active',
  "Progress" integer NOT NULL DEFAULT 0,
  "CreatedBy" uuid,
  "UpdatedBy" uuid,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "RowVersion" bigint NOT NULL DEFAULT 1,
  "AuditOrigin" text NOT NULL DEFAULT 'Native'
);

CREATE TABLE IF NOT EXISTS "_TSKMilestone" (
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "ProjectId" uuid NOT NULL REFERENCES "_TSKProject"("IdSeq") ON DELETE CASCADE,
  "Title" text NOT NULL,
  "DueDate" timestamptz,
  "Status" text NOT NULL DEFAULT 'open',
  "Progress" integer NOT NULL DEFAULT 0,
  "Department" text NOT NULL DEFAULT '',
  "OwnerName" text NOT NULL DEFAULT '',
  "Description" text NOT NULL DEFAULT '',
  "CreatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "_TSKTask" (
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "Code" text UNIQUE NOT NULL,
  "Title" text NOT NULL,
  "Description" text NOT NULL DEFAULT '',
  "Goal" text NOT NULL DEFAULT '',
  "ProjectId" uuid REFERENCES "_TSKProject"("IdSeq") ON DELETE SET NULL,
  "ParentTaskId" uuid REFERENCES "_TSKTask"("IdSeq") ON DELETE SET NULL,
  "DelegationLevel" text NOT NULL DEFAULT 'department',
  "Department" text NOT NULL DEFAULT '',
  "SubDepartment" text NOT NULL DEFAULT '',
  "AssigneeId" uuid,
  "AssignerId" uuid,
  "ReviewerId" uuid,
  "Followers" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "Priority" text NOT NULL DEFAULT 'medium',
  "Status" text NOT NULL DEFAULT 'todo',
  "Progress" integer NOT NULL DEFAULT 0,
  "EstimatedHours" numeric(10,2) NOT NULL DEFAULT 0,
  "ActualHours" numeric(10,2) NOT NULL DEFAULT 0,
  "StartDate" timestamptz,
  "DueDate" timestamptz,
  "CompletedAt" timestamptz,
  "Tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "Attachments" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "IsDeleted" boolean NOT NULL DEFAULT false,
  "DeletedAt" timestamptz,
  "DeletedBy" uuid,
  "CreatedBy" uuid,
  "UpdatedBy" uuid,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "RowVersion" bigint NOT NULL DEFAULT 1,
  "AuditOrigin" text NOT NULL DEFAULT 'Native'
);

CREATE TABLE IF NOT EXISTS "_TSKTaskChecklist" (
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "TaskId" uuid NOT NULL REFERENCES "_TSKTask"("IdSeq") ON DELETE CASCADE,
  "Title" text NOT NULL,
  "IsCompleted" boolean NOT NULL DEFAULT false,
  "AssigneeId" uuid,
  "CompletedAt" timestamptz,
  "SortOrder" integer NOT NULL DEFAULT 1,
  "CreatedBy" uuid,
  "UpdatedBy" uuid,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "RowVersion" bigint NOT NULL DEFAULT 1,
  "AuditOrigin" text NOT NULL DEFAULT 'Native'
);

CREATE TABLE IF NOT EXISTS "_TSKProgressLog" (
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "TaskId" uuid NOT NULL REFERENCES "_TSKTask"("IdSeq") ON DELETE CASCADE,
  "ReporterId" uuid NOT NULL,
  "PreviousProgress" integer NOT NULL DEFAULT 0,
  "CurrentProgress" integer NOT NULL DEFAULT 0,
  "PreviousStatus" text NOT NULL DEFAULT 'todo',
  "CurrentStatus" text NOT NULL DEFAULT 'in_progress',
  "WorkHours" numeric(10,2) NOT NULL DEFAULT 0,
  "Summary" text NOT NULL DEFAULT '',
  "Issues" text NOT NULL DEFAULT '',
  "Evidences" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "SupervisorComment" text NOT NULL DEFAULT '',
  "ReviewedBy" uuid,
  "ReviewedAt" timestamptz,
  "CreatedBy" uuid,
  "UpdatedBy" uuid,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "RowVersion" bigint NOT NULL DEFAULT 1,
  "AuditOrigin" text NOT NULL DEFAULT 'Native'
);

CREATE TABLE IF NOT EXISTS "_TSKApprovalRequest" (
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "TaskId" uuid NOT NULL REFERENCES "_TSKTask"("IdSeq") ON DELETE CASCADE,
  "RequesterId" uuid NOT NULL,
  "ApproverId" uuid NOT NULL,
  "RequestType" text NOT NULL DEFAULT 'completion',
  "Status" text NOT NULL DEFAULT 'pending',
  "RequestNote" text NOT NULL DEFAULT '',
  "ApprovalNote" text NOT NULL DEFAULT '',
  "Attachments" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "RequestedAt" timestamptz NOT NULL DEFAULT now(),
  "DecidedAt" timestamptz,
  "CreatedBy" uuid,
  "UpdatedBy" uuid,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "RowVersion" bigint NOT NULL DEFAULT 1,
  "AuditOrigin" text NOT NULL DEFAULT 'Native'
);

CREATE TABLE IF NOT EXISTS "_TSKComment" (
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "TaskId" uuid NOT NULL REFERENCES "_TSKTask"("IdSeq") ON DELETE CASCADE,
  "UserId" uuid,
  "AuthorName" text NOT NULL DEFAULT '',
  "RoleName" text NOT NULL DEFAULT '',
  "Content" text NOT NULL,
  "IsInternalSupervisor" boolean NOT NULL DEFAULT false,
  "CreatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "_TSKAttachment" (
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "Code" text UNIQUE NOT NULL,
  "TaskId" uuid REFERENCES "_TSKTask"("IdSeq") ON DELETE SET NULL,
  "TaskCode" text NOT NULL DEFAULT '',
  "ProjectName" text NOT NULL DEFAULT '',
  "FileName" text NOT NULL,
  "Category" text NOT NULL DEFAULT 'Tài liệu kỹ thuật',
  "FileType" text NOT NULL DEFAULT 'PDF',
  "FileSize" text NOT NULL DEFAULT '1.2 MB',
  "Version" text NOT NULL DEFAULT 'v1.0',
  "Department" text NOT NULL DEFAULT '',
  "UploadedBy" uuid,
  "UploaderName" text NOT NULL DEFAULT '',
  "SharedScope" text NOT NULL DEFAULT 'shared',
  "Status" text NOT NULL DEFAULT 'published',
  "IsDeleted" boolean NOT NULL DEFAULT false,
  "Description" text NOT NULL DEFAULT '',
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "CreatedAt" timestamptz NOT NULL DEFAULT now()
);

-- 6. Seed Enterprise Projects (_TSKProject)
INSERT INTO "_TSKProject"("IdSeq","Code","Name","Description","Department","ManagerId","StartDate","EndDate","Budget","Status","Progress") VALUES
  ('019db530-0001-7000-8000-000000000001','PRJ-GS-2026-01','Dự án Bao bì Hộp cứng Cao cấp Samsung Galaxy S26 Series','Thiết kế cấu trúc, chế bản CTP và sản xuất loạt 2.5 triệu bộ hộp cứng cao cấp tiêu chuẩn xuất khẩu toàn cầu cho Samsung Electronics Việt Nam.','Khối Sản xuất In Offset & Flexo','019db520-0002-7000-8000-000000000002','2026-01-15T08:00:00Z','2026-06-30T17:00:00Z',14500000000,'active',68),
  ('019db530-0002-7000-8000-000000000002','PRJ-GS-2026-02','Triển khai Hệ thống Quản trị Tác nghiệp & Giao việc Đa cấp ETPMS - MES','Số hóa toàn diện quy trình giao việc 4 cấp (Ban TGĐ -> Giám đốc NM -> Trưởng bộ phận -> Tổ trưởng/Cá nhân), tích hợp cảnh báo SLA và nghiệm thu điện tử.','Phòng CNTT & Chuyển đổi số (IT & MES)','019db520-0010-7000-8000-000000000010','2026-02-01T08:00:00Z','2026-05-30T17:00:00Z',3200000000,'active',82),
  ('019db530-0003-7000-8000-000000000003','PRJ-GS-2026-03','Tái chứng nhận Tiêu chuẩn Quốc tế FSC-CoC & BRCGS Packaging Issue 6','Rà soát hồ sơ truy xuất nguồn gốc giấy FSC, kiểm soát vệ sinh an toàn bao bì thực phẩm BRCGS tại Nhà máy Bắc Ninh và Hưng Yên.','Phòng Quản lý Chất lượng (QA/QC)','019db520-0004-7000-8000-000000000004','2026-03-01T08:00:00Z','2026-05-15T17:00:00Z',1850000000,'active',55),
  ('019db530-0004-7000-8000-000000000004','PRJ-GS-2026-04','Tối ưu Hao hụt Giấy & Chuẩn hóa Định mức BOM Dây chuyền Sóng Bhs 2.5m','Giảm tỷ lệ phế phẩm giấy cuộn Kraft/Testliner từ 4.2% xuống dưới 2.8% thông qua cải tiến quy trình ghép khổ đơn hàng.','Khối Sản xuất Sóng & Thành phẩm','019db520-0003-7000-8000-000000000003','2026-02-10T08:00:00Z','2026-07-31T17:00:00Z',4600000000,'active',45),
  ('019db530-0005-7000-8000-000000000005','PRJ-GS-2026-05','Phát triển Dòng Bao bì Xanh Sinh học Phân hủy Hoàn toàn cho Khối Xuất khẩu EU','Nghiên cứu vật liệu giấy phủ màng sinh học chống thấm thay thế PE truyền thống đáp ứng quy định EUDR Châu Âu.','Phòng R&D & Thiết kế Cấu trúc Bao bì','019db520-0005-7000-8000-000000000005','2026-03-15T08:00:00Z','2026-09-30T17:00:00Z',6100000000,'planning',30),
  ('019db530-0006-7000-8000-000000000006','PRJ-GS-2025-12','Chuẩn hóa Hệ thống Kho Thông minh WMS & Mã vạch Pallet QR Nhà máy Bắc Ninh','Hoàn thành nghiệm thu hệ thống quản lý kho giấy cuộn và thành phẩm bằng thiết bị PDA quét QR tích hợp SAP.','Khối Cung ứng & Logistics','019db520-0006-7000-8000-000000000006','2025-09-01T08:00:00Z','2026-02-28T17:00:00Z',2900000000,'completed',100)
ON CONFLICT("Code") DO UPDATE SET
  "Name"=EXCLUDED."Name",
  "Description"=EXCLUDED."Description",
  "Department"=EXCLUDED."Department",
  "Status"=EXCLUDED."Status",
  "Progress"=EXCLUDED."Progress";

-- 7. Seed Project Milestones (_TSKMilestone)
INSERT INTO "_TSKMilestone"("IdSeq","ProjectId","Title","DueDate","Status","Progress","Department","OwnerName","Description") VALUES
  ('019db535-0001-7000-8000-000000000001','019db530-0001-7000-8000-000000000001','M1: Phê duyệt thiết kế cấu trúc CAD & bình bản CTP mẫu Golden Sample','2026-03-20T17:00:00Z','completed',100,'Phòng R&D & Thiết kế Cấu trúc Bao bì','Hoàng Văn Tuấn','Hoàn thành ký duyệt mẫu Golden Sample với Samsung R&D'),
  ('019db535-0002-7000-8000-000000000002','019db530-0001-7000-8000-000000000001','M2: Sản xuất loạt Pilot 50,000 hộp cứng & kiểm định色差 Delta-E < 1.2','2026-04-18T17:00:00Z','in_progress',75,'Khối Sản xuất In Offset & Flexo','Trần Quốc Hưng','Chạy thử nghiệm tốc độ cao trên máy Heidelberg 8 màu'),
  ('019db535-0003-7000-8000-000000000003','019db530-0002-7000-8000-000000000002','M3: Go-live Phân hệ Không gian làm việc & Phê duyệt Đa cấp ETPMS','2026-04-25T17:00:00Z','in_progress',85,'Phòng CNTT & Chuyển đổi số (IT & MES)','Đinh Tiến Đạt','Triển khai chính thức cho 10 phòng ban nhà máy'),
  ('019db535-0004-7000-8000-000000000004','019db530-0003-7000-8000-000000000003','M4: Đánh giá nội bộ (Internal Audit) FSC-CoC & BRCGS toàn nhà máy','2026-04-30T17:00:00Z','in_progress',60,'Phòng Quản lý Chất lượng (QA/QC)','Lê Thị Hương Lan','Đánh giá chéo 14 khu vực sản xuất và kho nguyên liệu'),
  ('019db535-0005-7000-8000-000000000005','019db530-0004-7000-8000-000000000004','M5: Nghiệm thu định mức BOM mới trên dây chuyền Sóng Bhs 2.5m','2026-05-15T17:00:00Z','open',40,'Khối Sản xuất Sóng & Thành phẩm','Trần Quốc Hưng','Áp dụng thuật toán tối ưu ghép khổ giấy cuộn')
ON CONFLICT("IdSeq") DO NOTHING;

-- 8. Seed Enterprise Tasks (_TSKTask)
DO $task_seed$
DECLARE
  admin_id uuid;
BEGIN
  SELECT "Id" INTO admin_id FROM "_USRAccountDirectory" WHERE "Username"='admin' LIMIT 1;
  IF admin_id IS NULL THEN
    admin_id := '019db520-0001-7000-8000-000000000001'::uuid;
  END IF;

  INSERT INTO "_TSKTask"(
    "IdSeq","Code","Title","Description","Goal","ProjectId","ParentTaskId","DelegationLevel",
    "Department","SubDepartment","AssigneeId","AssignerId","ReviewerId","Priority","Status","Progress",
    "EstimatedHours","ActualHours","StartDate","DueDate","CompletedAt","Tags"
  ) VALUES
    -- Tasks assigned to / delegated by admin & executive leadership
    ('019db540-0001-7000-8000-000000000001','TSK-2604-001','Phê duyệt Kế hoạch Sản xuất & Định mức Công suất Cụm Máy In Offset Quý II/2026',
     'Rà soát tổng thể năng lực 6 dây chuyền in Heidelberg Speedmaster và phân bổ ca kíp phục vụ mùa cao điểm đơn hàng FDI.',
     'Đảm bảo OEE toàn nhà máy đạt >= 86%, giao hàng đúng hạn (OTD) đạt 99.5%.',
     '019db530-0001-7000-8000-000000000001',NULL,'executive','Khối Sản xuất In Offset & Flexo','Ban Giám đốc Nhà máy',
     '019db520-0002-7000-8000-000000000002',admin_id,admin_id,
     'urgent','done',100,24,22,now()-interval '15 days',now()-interval '5 days',now()-interval '6 days','["OEE","Heidelberg","Kế hoạch Quý II"]'::jsonb),

    ('019db540-0002-7000-8000-000000000002','TSK-2604-002','Thiết lập Quy trình Kiểm soát Màu sắc G7 Master & Bình bản CTP cho Đơn hàng Samsung S26',
     'Chuẩn hóa thông số đường cong bù trừ tầng thứ (TVI), kiểm soát độ sai lệch màu Delta-E < 1.5 trên giấy Ivory 350gsm.',
     '100% tờ in ký mẫu Golden Sample đạt chuẩn màu sắc của Samsung R&D ngay từ lần chạy máy đầu tiên.',
     '019db530-0001-7000-8000-000000000001','019db540-0001-7000-8000-000000000001','director','Phòng R&D & Thiết kế Cấu trúc Bao bì','Tổ Chế bản & Quản lý Màu',
     '019db520-0005-7000-8000-000000000005','019db520-0002-7000-8000-000000000002',admin_id,
     'urgent','in_review',90,40,36,now()-interval '10 days',now()+interval '2 days',NULL,'["G7 Master","Samsung","CTP","Chờ nghiệm thu"]'::jsonb),

    ('019db540-0003-7000-8000-000000000003','TSK-2604-003','Thiết kế Bản vẽ Cấu trúc Khuôn Bế & Làm Mẫu Mockup 3D Hộp Phụ kiện Từ tính',
     'Triển khai bản vẽ CAD 2D/3D trên phần mềm ArtiosCAD, cắt mẫu trên máy Kongsberg và kiểm tra lực hút nam châm nắp hộp.',
     'Hoàn thành 15 bộ mẫu trắng và 10 bộ mẫu in kỹ thuật số gửi khách hàng phê duyệt.',
     '019db530-0001-7000-8000-000000000001','019db540-0002-7000-8000-000000000002','department','Phòng R&D & Thiết kế Cấu trúc Bao bì','Tổ Thiết kế Cấu trúc',
     '019db520-0008-7000-8000-000000000008','019db520-0005-7000-8000-000000000005','019db520-0005-7000-8000-000000000005',
     'high','in_progress',75,32,24,now()-interval '7 days',now()+interval '3 days',NULL,'["ArtiosCAD","Mockup 3D","Khuôn bế"]'::jsonb),

    ('019db540-0004-7000-8000-000000000004','TSK-2604-004','Kiểm chuẩn Độ bền Bục (Bursting Strength) & Độ nén Cạnh (ECT) Lô Giấy Cuộn Kraft Mỹ',
     'Lấy mẫu ngẫu nhiên 20 cuộn giấy Kraft nhập khẩu theo tiêu chuẩn TAPPI T810 và T811 trước khi đưa lên dàn sóng.',
     'Đảm bảo độ ẩm giấy 7.5% ± 1.0%, chỉ số ECT >= 7.2 kN/m không bị biến dạng cong vênh.',
     '019db530-0004-7000-8000-000000000004',NULL,'department','Phòng Quản lý Chất lượng (QA/QC)','Bộ phận IQC Nguyên vật liệu',
     '019db520-0009-7000-8000-000000000009','019db520-0004-7000-8000-000000000004','019db520-0004-7000-8000-000000000004',
     'high','in_review',95,16,15,now()-interval '5 days',now()+interval '1 day',NULL,'["IQC","ECT","Bursting","Giấy cuộn"]'::jsonb),

    ('019db540-0005-7000-8000-000000000005','TSK-2604-005','Cấu hình Phân quyền RBAC & Ma trận Giao việc 4 Cấp trên Hệ thống ETPMS',
     'Thiết lập cây phân quyền chức năng và phạm vi dữ liệu theo từng Khối/Phòng ban/Xưởng sản xuất trên toàn hệ thống.',
     '100% tài khoản Quản lý và Nhân viên đăng nhập đúng phân quyền, bảo mật tuyệt đối dữ liệu đơn hàng.',
     '019db530-0002-7000-8000-000000000002',NULL,'department','Phòng CNTT & Chuyển đổi số (IT & MES)','Tổ Dự án ETPMS',
     admin_id,'019db520-0001-7000-8000-000000000001','019db520-0002-7000-8000-000000000002',
     'urgent','in_progress',85,48,40,now()-interval '8 days',now()+interval '4 days',NULL,'["ETPMS","RBAC","Go-live"]'::jsonb),

    ('019db540-0006-7000-8000-000000000006','TSK-2604-006','Bảo dưỡng Định kỳ Cụm Lô Sóng & Hệ thống Gia nhiệt Hơi nước Dàn Sóng Bhs 2.5m',
     'Kiểm tra độ mòn răng lô sóng B/C/E, vệ sinh bẫy hơi và cân chỉnh khe hở lô bôi keo tự động.',
     'Loại bỏ hoàn toàn lỗi bong tách lớp sóng và giảm tiêu hao keo tinh bột 8%.',
     '019db530-0004-7000-8000-000000000004',NULL,'team','Khối Sản xuất In Offset & Flexo','Xưởng In & Sóng Bao bì',
     '019db520-0007-7000-8000-000000000007','019db520-0003-7000-8000-000000000003',admin_id,
     'medium','in_progress',60,20,12,now()-interval '3 days',now()+interval '5 days',NULL,'["Bảo trì","Dàn sóng Bhs","TPM","định kỳ"]'::jsonb),

    ('019db540-0007-7000-8000-000000000007','TSK-2604-007','Rà soát Hồ sơ Chuỗi Hành trình Sản phẩm FSC-CoC & Cân bằng Khối lượng Giấy Quý I',
     'Tổng hợp hóa đơn đầu vào, lệnh sản xuất và phiếu xuất kho cho các đơn hàng có chứng nhận FSC Mix 70%.',
     'Hoàn tất báo cáo Volume Summary sẵn sàng cho đoàn đánh giá SGS Quốc tế.',
     '019db530-0003-7000-8000-000000000003',NULL,'director','Phòng Quản lý Chất lượng (QA/QC)','Ban ISO & FSC',
     '019db520-0004-7000-8000-000000000004',admin_id,admin_id,
     'high','todo',20,30,6,now()-interval '2 days',now()+interval '7 days',NULL,'["FSC-CoC","SGS Audit","Truy xuất"]'::jsonb),

    ('019db540-0008-7000-8000-000000000008','TSK-2604-008','Đàm phán Hợp đồng Khung Cung ứng Mực in UV Thân thiện Môi trường (Soy Ink) Năm 2026',
     'Đánh giá năng lực 3 nhà cung cấp Nhật Bản & Hàn Quốc, thương thảo điều khoản công nợ 60 ngày và tồn kho ký gửi (VMI).',
     'Tiết giảm 6.5% chi phí vật tư ngành in đồng thời đạt chứng nhận RoHS/REACH.',
     '019db530-0005-7000-8000-000000000005',NULL,'director','Khối Cung ứng & Logistics','Phòng Mua hàng Chiến lược',
     '019db520-0006-7000-8000-000000000006',admin_id,admin_id,
     'medium','in_progress',50,36,18,now()-interval '6 days',now()+interval '10 days',NULL,'["Cung ứng","Soy Ink","VMI"]'::jsonb),

    ('019db540-0009-7000-8000-000000000009','TSK-2604-009','Thử nghiệm Màng Phủ Sinh học Chống thấm Nước cho Thùng Carton Đông lạnh Xuất khẩu',
     'Tiến hành test khả năng kháng nước Cobb60 và độ bám dính mực in Flexo trên bề mặt giấy tráng phủ sinh học.',
     'Đạt chỉ số Cobb60 < 25 g/m2 sau 24 giờ bảo quản kho lạnh -18 độ C.',
     '019db530-0005-7000-8000-000000000005',NULL,'department','Phòng R&D & Thiết kế Cấu trúc Bao bì','Phòng Thí nghiệm Vật liệu',
     '019db520-0008-7000-8000-000000000008','019db520-0005-7000-8000-000000000005','019db520-0005-7000-8000-000000000005',
     'low','backlog',0,40,0,now()+interval '2 days',now()+interval '20 days',NULL,'["R&D","Bao bì xanh","EUDR"]'::jsonb),

    ('019db540-0010-7000-8000-000000000010','TSK-2604-010','Huấn luyện Quy trình An toàn Vệ sinh Thực phẩm BRCGS & Kiểm soát Dị vật Kim loại/Thủy tinh',
     'Tổ chức đào tạo bắt buộc cho 180 công nhân vận hành xưởng hộp thực phẩm và kiểm tra thực hành tại hiện trường 5S.',
     '100% nhân sự xưởng đạt yêu cầu sát hạch nội bộ, không phát sinh lỗi Non-Conformity (NC).',
     '019db530-0003-7000-8000-000000000003',NULL,'team','Khối Sản xuất In Offset & Flexo','Xưởng Thành phẩm Bao bì Thực phẩm',
     '019db520-0003-7000-8000-000000000003','019db520-0004-7000-8000-000000000004','019db520-0002-7000-8000-000000000002',
     'high','todo',10,16,2,now()-interval '1 day',now()+interval '6 days',NULL,'["BRCGS","ATTP","5S","Đào tạo"]'::jsonb),

    -- Additional tasks to ensure Overdue, Recurring, Archived, My Tasks (for admin), and Kanban columns are richly populated
    ('019db540-0011-7000-8000-000000000011','TSK-2604-011','Xử lý Khẩn cấp Lỗi Lệch Cửa Sổ Bế Hộp Quà Tết Đối tác Nhật Bản (Lot #JP-042)',
     'Kiểm tra lại dưỡng đo bế tự động Bobst Novacut 106 ER, hiệu chỉnh áp lực dao bế và tách phế 100% lô hàng bán thành phẩm.',
     'Khắc phục sai số bế xuống <= 0.3mm trước 18h00 để kịp lịch đóng cont xuất cảng Hải Phòng.',
     '019db530-0001-7000-8000-000000000001',NULL,'team','Khối Sản xuất In Offset & Flexo','Tổ Bế - Dán Hộp Tự động',
     admin_id,'019db520-0002-7000-8000-000000000002','019db520-0002-7000-8000-000000000002',
     'urgent','in_progress',65,16,12,now()-interval '6 days',now()-interval '1 day',NULL,'["Khẩn cấp","Bobst","QC Hold"]'::jsonb),

    ('019db540-0012-7000-8000-000000000012','TSK-2604-012','Cập nhật Bảng Giá Định mức Chi phí Gia công Ép Kim & Phủ UV Định hình Quý II',
     'Rà soát biến động giá màng nhũ kim loại và hóa chất UV bóng/mờ, cập nhật bảng tính giá thành tiêu chuẩn trình Ban TGĐ.',
     'Chuẩn hóa bảng báo giá nhanh cho khối Kinh doanh B2B trong vòng 4 giờ kể từ khi nhận yêu cầu.',
     '019db530-0001-7000-8000-000000000001',NULL,'department','Khối Cung ứng & Logistics','Phòng Định mức & Giá thành',
     '019db520-0006-7000-8000-000000000006',admin_id,admin_id,
     'high','todo',35,20,8,now()-interval '8 days',now()-interval '2 days',NULL,'["Định mức","Báo giá","Gia công"]'::jsonb),

    ('019db540-0013-7000-8000-000000000013','TSK-2604-013','Kiểm tra Định kỳ Hàng tuần Hệ thống PCCC & Cảm biến Nhiệt Kho Giấy Cuộn',
     'Vận hành thử máy bơm bù áp, kiểm tra đầu báo khói tia chiếu (Beam Detector) và tủ điều khiển trung tâm tại Kho Giấy Cuộn A1-A4.',
     '100% đầu báo và họng nước vách tường hoạt động tốt, ghi nhật ký an toàn PCCC tuần.',
     '019db530-0004-7000-8000-000000000004',NULL,'team','Khối Cung ứng & Logistics','Tổ Kho Giấy Cuộn & An toàn',
     admin_id,'019db520-0006-7000-8000-000000000006','019db520-0002-7000-8000-000000000002',
     'medium','in_progress',80,8,6,now()-interval '2 days',now()+interval '3 days',NULL,'["định kỳ","PCCC","An toàn kho","hàng tuần"]'::jsonb),

    ('019db540-0014-7000-8000-000000000014','TSK-2604-014','Đối soát Định kỳ Hàng tháng Tồn kho Vật tư Phụ (Bản kẽm CTP, Cao su Offset, Dao bế)',
     'Kiểm kê thực tế tại kho vật tư tầng 1 đối chiếu với số liệu xuất dùng theo Lệnh sản xuất trên hệ thống ERP.',
     'Chênh lệch kiểm kê thực tế và sổ sách bằng 0%, lập đề xuất mua bổ sung vật tư dưới mức Min-Stock.',
     '019db530-0002-7000-8000-000000000002',NULL,'department','Khối Cung ứng & Logistics','Bộ phận Kho Vật tư',
     '019db520-0006-7000-8000-000000000006',admin_id,admin_id,
     'medium','todo',40,16,6,now()-interval '1 day',now()+interval '5 days',NULL,'["định kỳ","Kiểm kê","Vật tư ngành in","hàng tháng"]'::jsonb),

    ('019db540-0015-7000-8000-000000000015','TSK-2604-015','Hiệu chuẩn Định kỳ Máy Đo Quang phổ X-Rite eXact & Thiết bị Đo Độ ẩm Giấy',
     'Thực hiện hiệu chuẩn trắng chuẩn (White Tile Calibration) và đối chiếu mẫu chuẩn Munsell cho 8 máy đo X-Rite tại xưởng in.',
     'Sai số thiết bị đo <= 0.05 Delta-E, dán tem hiệu chuẩn nội bộ đạt chuẩn ISO 9001.',
     '019db530-0003-7000-8000-000000000003',NULL,'individual','Phòng Quản lý Chất lượng (QA/QC)','Tổ Thiết bị Đo lường',
     '019db520-0009-7000-8000-000000000009','019db520-0004-7000-8000-000000000004',admin_id,
     'medium','done',100,12,11,now()-interval '10 days',now()-interval '3 days',now()-interval '3 days','["định kỳ","Hiệu chuẩn","X-Rite","QA/QC"]'::jsonb),

    ('019db540-0016-7000-8000-000000000016','TSK-2604-016','Chủ trì Họp Giao ban Điều độ Sản xuất Liên xưởng & Rà soát Tiến độ Đơn hàng Trọng điểm',
     'Rà soát tiến độ 18 lệnh sản xuất ưu tiên trong tuần, giải quyết vướng mắc thiếu khuôn bế và lịch giao giấy mặt Duplex.',
     'Ban hành biên bản điều độ sản xuất trước 09h30 sáng thứ Hai hàng tuần.',
     '019db530-0002-7000-8000-000000000002',NULL,'executive','Ban Tổng Giám đốc (BOD)','Văn phòng Điều hành',
     admin_id,'019db520-0001-7000-8000-000000000001','019db520-0001-7000-8000-000000000001',
     'high','in_review',95,8,8,now()-interval '4 days',now()+interval '1 day',NULL,'["định kỳ","Giao ban","Điều độ","Executive"]'::jsonb),

    ('019db540-0017-7000-8000-000000000017','TSK-2604-017','Tích hợp API Đồng bộ Tự động Lệnh Sản xuất (Work Order) từ SAP S/4HANA sang ETPMS',
     'Xây dựng dịch vụ đồng bộ 2 chiều trạng thái lệnh sản xuất, sản lượng đạt và phế phẩm giữa SAP và phân hệ ETPMS.',
     'Độ trễ đồng bộ dữ liệu dưới 3 giây, đảm bảo tính toàn vẹn giao dịch (Idempotency).',
     '019db530-0002-7000-8000-000000000002',NULL,'individual','Phòng CNTT & Chuyển đổi số (IT & MES)','Tổ Tích hợp ERP/MES',
     '019db520-0010-7000-8000-000000000010',admin_id,admin_id,
     'high','in_progress',70,36,25,now()-interval '5 days',now()+interval '4 days',NULL,'["SAP S/4HANA","API","MES","ETPMS"]'::jsonb),

    ('019db540-0018-7000-8000-000000000018','TSK-2604-018','Nghiệm thu Đóng Dự án Hệ thống Kho Thông minh WMS & Bàn giao Hồ sơ Lưu trữ',
     'Hoàn tất biên bản nghiệm thu tổng thể hệ thống WMS Kho Bắc Ninh, đóng gói tài liệu vận hành đưa vào kho lưu trữ.',
     'Bàn giao 100% tài sản phần mềm và phần cứng PDA cho Khối Cung ứng vận hành chính thức.',
     '019db530-0006-7000-8000-000000000006',NULL,'director','Khối Cung ứng & Logistics','Ban Dự án WMS',
     '019db520-0006-7000-8000-000000000006',admin_id,admin_id,
     'low','done',100,24,24,now()-interval '40 days',now()-interval '20 days',now()-interval '21 days','["archived","WMS","Nghiệm thu","lưu trữ"]'::jsonb),

    ('019db540-0019-7000-8000-000000000019','TSK-2604-019','Lưu trữ Hồ sơ Thiết kế Bao bì Phiên bản Cũ (Gen-1) sau khi Chuyển đổi Mẫu Mới',
     'Thu hồi toàn bộ bản vẽ khuôn bế và bình bản CTP phiên bản Gen-1 tránh nhầm lẫn khi tái sản xuất.',
     'Đóng dấu Obsolete/Archived trên hệ thống quản lý tài liệu kỹ thuật.',
     '019db530-0001-7000-8000-000000000001',NULL,'department','Phòng R&D & Thiết kế Cấu trúc Bao bì','Tổ Quản lý Bản vẽ',
     '019db520-0008-7000-8000-000000000008','019db520-0005-7000-8000-000000000005',admin_id,
     'low','cancelled',100,8,8,now()-interval '30 days',now()-interval '15 days',now()-interval '15 days','["archived","lưu trữ","Bản vẽ cũ"]'::jsonb),

    ('019db540-0020-7000-8000-000000000020','TSK-2604-020','Khảo sát Mặt bằng Lắp đặt Máy Dán Thùng Carton Tốc độ Cao Bobst Expertfold 110',
     'Đo đạc tải trọng nền xưởng, bố trí đường khí nén 8 bar và nguồn điện 3 pha 380V chuẩn bị đón máy mới vào tháng 6/2026.',
     'Hoàn thành bản vẽ Layout mặt bằng xưởng thành phẩm trình Giám đốc Nhà máy phê duyệt.',
     '019db530-0004-7000-8000-000000000004',NULL,'department','Khối Sản xuất Sóng & Thành phẩm','Phòng Cơ điện & Bảo trì',
     admin_id,'019db520-0002-7000-8000-000000000002',admin_id,
     'medium','backlog',0,24,0,now()+interval '3 days',now()+interval '14 days',NULL,'["Bobst","Layout xưởng","Đầu tư thiết bị"]'::jsonb)
  ON CONFLICT("Code") DO NOTHING;
END $task_seed$;

-- 9. Seed Task Checklists (_TSKTaskChecklist)
INSERT INTO "_TSKTaskChecklist"("IdSeq","TaskId","Title","IsCompleted","AssigneeId","CompletedAt","SortOrder") VALUES
  ('019db550-0001-7000-8000-000000000001','019db540-0002-7000-8000-000000000002','Hiệu chuẩn máy ghi kẽm CTP Kodak Trendsetter 800 theo đường cong G7',true,'019db520-0005-7000-8000-000000000005',now()-interval '6 days',1),
  ('019db550-0002-7000-8000-000000000002','019db540-0002-7000-8000-000000000002','In thử nghiệm (Press Proof) 500 tờ trên giấy Ivory 350gsm và đo phổ X-Rite eXact',true,'019db520-0007-7000-8000-000000000007',now()-interval '3 days',2),
  ('019db550-0003-7000-8000-000000000003','019db540-0002-7000-8000-000000000002','Trình ký bộ mẫu giới hạn màu (Color Limit Sample) với chuyên gia QA Samsung',false,'019db520-0004-7000-8000-000000000004',NULL,3),
  ('019db550-0004-7000-8000-000000000004','019db540-0003-7000-8000-000000000003','Dựng bản vẽ cấu trúc die-line 2D và mô phỏng gấp hộp 3D trên ArtiosCAD',true,'019db520-0008-7000-8000-000000000008',now()-interval '5 days',1),
  ('019db550-0005-7000-8000-000000000005','019db540-0003-7000-8000-000000000003','Cắt 15 bộ mẫu trắng trên bàn cắt kỹ thuật số Kongsberg và test lắp ráp thực tế',true,'019db520-0008-7000-8000-000000000008',now()-interval '2 days',2),
  ('019db550-0006-7000-8000-000000000006','019db540-0003-7000-8000-000000000003','Đo kiểm bài test rung lắc (Vibration Test) và rơi tự do (Drop Test ISTA 2A)',false,'019db520-0009-7000-8000-000000000009',NULL,3),
  ('019db550-0007-7000-8000-000000000007','019db540-0005-7000-8000-000000000005','Khởi tạo danh mục 10 phòng ban, 6 cấp chức danh và 5 nhóm quyền chuẩn ETPMS',true,'019db520-0010-7000-8000-000000000010',now()-interval '5 days',1),
  ('019db550-0008-7000-8000-000000000008','019db540-0005-7000-8000-000000000005','Tích hợp luồng phê duyệt nghiệm thu 2 bước giữa Trưởng bộ phận và Giám đốc Nhà máy',true,'019db520-0010-7000-8000-000000000010',now()-interval '2 days',2),
  ('019db550-0009-7000-8000-000000000009','019db540-0005-7000-8000-000000000005','Đào tạo hướng dẫn sử dụng cho các Trưởng phòng và Quản đốc phân xưởng',false,'019db520-0010-7000-8000-000000000010',NULL,3)
ON CONFLICT("IdSeq") DO NOTHING;

-- 10. Seed Task Progress Logs (_TSKProgressLog)
INSERT INTO "_TSKProgressLog"("IdSeq","TaskId","ReporterId","PreviousProgress","CurrentProgress","PreviousStatus","CurrentStatus","WorkHours","Summary","Issues","SupervisorComment","ReviewedBy","ReviewedAt") VALUES
  ('019db560-0001-7000-8000-000000000001','019db540-0002-7000-8000-000000000002','019db520-0005-7000-8000-000000000005',50,90,'in_progress','in_review',18,'Đã hoàn thành in proof trên máy Heidelberg CX104, kết quả đo Delta-E trung bình đạt 0.85 (thấp hơn ngưỡng yêu cầu 1.5). Đã gửi mẫu sang bộ phận QA chờ ký duyệt Golden Sample.','Cần lưu ý thời gian khô mực UV khi độ ẩm phòng in vượt 62%.','Kết quả đo màu rất tốt, đề nghị phối hợp chị Lan QA ký biên bản nghiệm thu mẫu chuẩn trong sáng mai.','019db520-0002-7000-8000-000000000002',now()-interval '1 day'),
  ('019db560-0002-7000-8000-000000000002','019db540-0003-7000-8000-000000000003','019db520-0008-7000-8000-000000000008',40,75,'in_progress','in_progress',14,'Đã hoàn thiện 15 bộ mẫu hộp cứng khay nam châm trên máy cắt Kongsberg, độ khít nắp hộp đạt chuẩn dung sai ±0.3mm.','Đang chờ lịch máy test rung lắc tại phòng Lab QA.', '', NULL, NULL),
  ('019db560-0003-7000-8000-000000000003','019db540-0004-7000-8000-000000000004','019db520-0009-7000-8000-000000000009',30,95,'in_progress','in_review',12,'Đã hoàn thành đo kiểm 20/20 cuộn giấy Kraft Mỹ lô nhập khẩu tháng 4: ECT trung bình đạt 7.65 kN/m, độ bền bục đạt 4.8 kgf/cm2, đạt 100% tiêu chuẩn kỹ thuật.','Không có phát sinh lỗi chất lượng.','Đồng ý thông qua lô giấy nguyên liệu để xuất sang xưởng sóng.', '019db520-0004-7000-8000-000000000004', now()-interval '4 hours')
ON CONFLICT("IdSeq") DO NOTHING;

-- 11. Seed Approval Requests (_TSKApprovalRequest)
DO $apr_seed$
DECLARE
  admin_id uuid;
BEGIN
  SELECT "Id" INTO admin_id FROM "_USRAccountDirectory" WHERE "Username"='admin' LIMIT 1;
  IF admin_id IS NULL THEN
    admin_id := '019db520-0001-7000-8000-000000000001'::uuid;
  END IF;

  INSERT INTO "_TSKApprovalRequest"("IdSeq","TaskId","RequesterId","ApproverId","RequestType","Status","RequestNote","ApprovalNote","RequestedAt","DecidedAt") VALUES
    ('019db570-0001-7000-8000-000000000001','019db540-0002-7000-8000-000000000002','019db520-0005-7000-8000-000000000005',admin_id,'completion','pending','Đề nghị Ban Giám đốc phê duyệt nghiệm thu bộ thông số G7 Master & tờ in chuẩn Golden Sample cho dự án Samsung S26 Series (Đính kèm phiếu đo quang phổ X-Rite).','',now()-interval '6 hours',NULL),
    ('019db570-0002-7000-8000-000000000002','019db540-0004-7000-8000-000000000004','019db520-0009-7000-8000-000000000009',admin_id,'completion','pending','Trình phê duyệt biên bản giải phóng lô nguyên liệu 20 cuộn giấy Kraft Mỹ (Lot #US-KR-2604) đưa vào sản xuất chính thức.','',now()-interval '3 hours',NULL),
    ('019db570-0003-7000-8000-000000000003','019db540-0016-7000-8000-000000000016',admin_id,'019db520-0001-7000-8000-000000000001','completion','pending','Đề nghị phê duyệt Biên bản điều độ sản xuất liên xưởng tuần 16 và phương án tăng ca cụm máy bế tự động Bobst.','',now()-interval '2 hours',NULL),
    ('019db570-0004-7000-8000-000000000004','019db540-0001-7000-8000-000000000001','019db520-0002-7000-8000-000000000002',admin_id,'completion','approved','Trình Tổng Giám đốc phê duyệt Kế hoạch Công suất & Định mức OEE Cụm Máy In Offset Quý II/2026.','Đồng ý phê duyệt. Yêu cầu khối Sản xuất và QA/QC bám sát mục tiêu OEE >= 86% và kiểm soát chặt tỷ lệ hao hụt giấy.',now()-interval '6 days',now()-interval '5 days'),
    ('019db570-0005-7000-8000-000000000005','019db540-0015-7000-8000-000000000015','019db520-0009-7000-8000-000000000009',admin_id,'completion','approved','Trình phê duyệt Hồ sơ hiệu chuẩn định kỳ 8 máy đo quang phổ X-Rite eXact tại xưởng in Offset.','Đã kiểm tra chứng chỉ hiệu chuẩn và biên bản đo kiểm, đạt yêu cầu ISO 9001.',now()-interval '4 days',now()-interval '3 days')
  ON CONFLICT("IdSeq") DO NOTHING;
END $apr_seed$;

-- 12. Seed Task Comments (_TSKComment)
INSERT INTO "_TSKComment"("IdSeq","TaskId","UserId","AuthorName","RoleName","Content","IsInternalSupervisor","CreatedAt") VALUES
  ('019db580-0001-7000-8000-000000000001','019db540-0002-7000-8000-000000000002','019db520-0005-7000-8000-000000000005','Hoàng Văn Tuấn','Trưởng phòng R&D','Đã đính kèm báo cáo đo phổ màu X-Rite eXact và bộ thông số ghi kẽm CTP. Chỉ số Delta-E toàn trang in đạt 0.85, sẵn sàng trình duyệt Golden Sample.',false,now()-interval '5 hours'),
  ('019db580-0002-7000-8000-000000000002','019db540-0002-7000-8000-000000000002','019db520-0002-7000-8000-000000000002','Nguyễn Đức Minh','Giám đốc Nhà máy','Đề nghị tổ Chế bản lưu cố định profile ICC trên hệ thống Prinect để áp dụng đồng nhất cho cả 3 máy in Heidelberg.',false,now()-interval '3 hours'),
  ('019db580-0003-7000-8000-000000000003','019db540-0005-7000-8000-000000000005','019db520-0010-7000-8000-000000000010','Đinh Tiến Đạt','Chuyên viên chính MES/ERP','Đã hoàn tất cấu hình ma trận phân quyền RBAC và tự động hóa đồng bộ danh mục phòng ban trên ETPMS.',false,now()-interval '2 hours')
ON CONFLICT("IdSeq") DO NOTHING;

-- 13. Seed Enterprise Documents & Attachments (_TSKAttachment)
INSERT INTO "_TSKAttachment"(
  "IdSeq","Code","TaskId","TaskCode","ProjectName","FileName","Category","FileType","FileSize","Version",
  "Department","UploadedBy","UploaderName","SharedScope","Status","IsDeleted","Description","UpdatedAt"
) VALUES
  ('019db590-0001-7000-8000-000000000001','DOC-GS-001','019db540-0002-7000-8000-000000000002','TSK-2604-002','Dự án Bao bì Hộp cứng Cao cấp Samsung Galaxy S26 Series','SOP-OFFSET-G7-Color-Control-v3.2.pdf','Quy trình SOP','PDF','2.8 MB','v3.2','Phòng R&D & Thiết kế Cấu trúc Bao bì','019db520-0005-7000-8000-000000000005','Hoàng Văn Tuấn','shared','published',false,'Quy trình chuẩn kiểm soát màu sắc G7 Master và bù trừ tầng thứ TVI trên máy in Offset Heidelberg Speedmaster.',now()-interval '1 day'),
  ('019db590-0002-7000-8000-000000000002','DOC-GS-002','019db540-0003-7000-8000-000000000003','TSK-2604-003','Dự án Bao bì Hộp cứng Cao cấp Samsung Galaxy S26 Series','CAD-S26-Magnetic-Box-DieLine-Rev4.pdf','Bản vẽ Kỹ thuật','PDF','5.4 MB','v4.0','Phòng R&D & Thiết kế Cấu trúc Bao bì','019db520-0008-7000-8000-000000000008','Đỗ Văn Hùng','shared','published',false,'Bản vẽ cấu trúc khuôn bế 2D/3D ArtiosCAD cho hộp phụ kiện từ tính Samsung S26 Series.',now()-interval '2 days'),
  ('019db590-0003-7000-8000-000000000003','DOC-GS-003','019db540-0004-7000-8000-000000000004','TSK-2604-004','Tối ưu Hao hụt Giấy & Chuẩn hóa Định mức BOM Dây chuyền Sóng Bhs 2.5m','Bao-Cao-Do-Kiem-IQC-Giay-Kraft-My-Lot2604.xlsx','Biên bản Nghiệm thu','XLSX','1.4 MB','v1.0','Phòng Quản lý Chất lượng (QA/QC)','019db520-0009-7000-8000-000000000009','Ngô Tuyết Mai','shared','published',false,'Bảng tổng hợp kết quả đo độ bền bục (Bursting) và độ nén cạnh (ECT) 20 cuộn giấy Kraft Mỹ nhập khẩu.',now()-interval '1 day'),
  ('019db590-0004-7000-8000-000000000004','DOC-GS-004','019db540-0005-7000-8000-000000000005','TSK-2604-005','Triển khai Hệ thống Quản trị Tác nghiệp & Giao việc Đa cấp ETPMS - MES','Tai-Lieu-Kien-Truc-Phan-Quyen-RBAC-ETPMS.docx','Tài liệu Hệ thống','DOCX','1.9 MB','v2.1','Phòng CNTT & Chuyển đổi số (IT & MES)','019db520-0010-7000-8000-000000000010','Đinh Tiến Đạt','my','published',false,'Đặc tả ma trận phân quyền RBAC 4 cấp và quy trình phê duyệt nghiệm thu điện tử trên ETPMS.',now()-interval '12 hours'),
  ('019db590-0005-7000-8000-000000000005','DOC-GS-005','019db540-0007-7000-8000-000000000007','TSK-2604-007','Tái chứng nhận Tiêu chuẩn Quốc tế FSC-CoC & BRCGS Packaging Issue 6','Ho-So-Truy-Xuat-Nguon-Goc-FSC-CoC-Q1-2026.xlsx','Báo cáo Quản trị','XLSX','3.1 MB','v1.2','Phòng Quản lý Chất lượng (QA/QC)','019db520-0004-7000-8000-000000000004','Lê Thị Hương Lan','shared','pending_review',false,'Bảng cân bằng khối lượng giấy chứng nhận FSC Mix 70% Quý I/2026 phục vụ đánh giá SGS.',now()-interval '3 days'),
  ('019db590-0006-7000-8000-000000000006','DOC-GS-006','019db540-0001-7000-8000-000000000001','TSK-2604-001','Dự án Bao bì Hộp cứng Cao cấp Samsung Galaxy S26 Series','Ke-Hoach-Cong-Suat-Va-Dinh-Muc-OEE-Q2-2026.pdf','Báo cáo Quản trị','PDF','2.2 MB','v2.0','Khối Sản xuất In Offset & Flexo','019db520-0002-7000-8000-000000000002','Nguyễn Đức Minh','my','published',false,'Kế hoạch phân bổ công suất 6 máy in Offset Heidelberg và chỉ tiêu OEE Quý II/2026 đã được TGĐ phê duyệt.',now()-interval '5 days'),
  ('019db590-0007-7000-8000-000000000007','DOC-GS-007','019db540-0019-7000-8000-000000000019','TSK-2604-019','Dự án Bao bì Hộp cứng Cao cấp Samsung Galaxy S26 Series','Ban-Ve-Khuon-Be-Gen1-Obsolete.pdf','Bản vẽ Kỹ thuật','PDF','4.0 MB','v1.0','Phòng R&D & Thiết kế Cấu trúc Bao bì','019db520-0008-7000-8000-000000000008','Đỗ Văn Hùng','shared','archived',true,'Bản vẽ khuôn bế thế hệ cũ đã thu hồi ngừng sử dụng sau khi cập nhật thiết kế mới.',now()-interval '15 days')
ON CONFLICT("Code") DO UPDATE SET
  "FileName"=EXCLUDED."FileName",
  "ProjectName"=EXCLUDED."ProjectName",
  "Department"=EXCLUDED."Department",
  "Status"=EXCLUDED."Status",
  "IsDeleted"=EXCLUDED."IsDeleted";

-- 14. Report Configurations (_TSKReportConfig)
CREATE TABLE IF NOT EXISTS "_TSKReportConfig" (
    "Id" TEXT PRIMARY KEY,
    "Key" TEXT UNIQUE NOT NULL,
    "Title" TEXT NOT NULL,
    "SourceUrl" TEXT NOT NULL,
    "Description" TEXT DEFAULT '',
    "AllowedRoles" TEXT DEFAULT 'admin,director,manager,supervisor,employee',
    "CanEditRoles" TEXT DEFAULT 'admin,director,manager',
    "IsActive" BOOLEAN DEFAULT true,
    "Categories" JSONB DEFAULT '[]'::jsonb,
    "UpdatedBy" TEXT DEFAULT '',
    "UpdatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "_TSKReportConfig" ("Id", "Key", "Title", "SourceUrl", "Description", "AllowedRoles", "CanEditRoles", "IsActive", "Categories", "UpdatedBy", "UpdatedAt")
VALUES (
    'rep-sharepoint-01',
    'sharepoint_progress',
    'Báo cáo tiến độ SharePoint',
    'https://goldsunpackagingvn-my.sharepoint.com/:x:/g/personal/tuanhv_goldsun_com_vn/ETPMS_Tien_Do_Bao_Cao_Cong_Viec_2026',
    'Theo dõi tiến độ báo cáo công việc các bộ phận, chuyên viên theo danh mục phân cấp và tăng trưởng từ SharePoint Goldsun',
    'admin,director,manager,supervisor,employee',
    'admin,director,manager',
    true,
    '["In Offset & Flexo", "Sản xuất Sóng & Bao bì", "Kỹ thuật R&D & Thiết kế", "Kiểm soát Chất lượng (QA/QC)", "Cung ứng & Logistics", "Kinh doanh & Dự án FDI"]'::jsonb,
    'admin',
    NOW()
)
ON CONFLICT ("Key") DO UPDATE SET
    "Title" = EXCLUDED."Title",
    "SourceUrl" = EXCLUDED."SourceUrl",
    "Description" = EXCLUDED."Description";

COMMIT;
