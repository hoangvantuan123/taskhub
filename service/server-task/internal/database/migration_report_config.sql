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

