CREATE TABLE IF NOT EXISTS "_SYSCatalogDirectory"(
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "Key" text UNIQUE NOT NULL,
  "Label" text NOT NULL,
  "SeedVersion" integer NOT NULL DEFAULT 0,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "CreatedBy" uuid NOT NULL REFERENCES "_SYSActorDirectory"("IdSeq") DEFERRABLE INITIALLY DEFERRED,
  "UpdatedBy" uuid NOT NULL REFERENCES "_SYSActorDirectory"("IdSeq") DEFERRABLE INITIALLY DEFERRED,
  "RowVersion" bigint NOT NULL DEFAULT 1,
  "AuditOrigin" text NOT NULL DEFAULT 'Native'
);
CREATE TABLE IF NOT EXISTS "_SYSCatalogOption"(
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "CatalogKey" text NOT NULL REFERENCES "_SYSCatalogDirectory"("Key") ON DELETE CASCADE,
  "ParentId" uuid REFERENCES "_SYSCatalogOption"("IdSeq") ON DELETE RESTRICT,
  "Value" text NOT NULL,
  "Label" text NOT NULL,
  "Enabled" boolean NOT NULL DEFAULT true,
  "SortOrder" integer NOT NULL DEFAULT 0,
  UNIQUE("CatalogKey","Value"),
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "CreatedBy" uuid NOT NULL REFERENCES "_SYSActorDirectory"("IdSeq") DEFERRABLE INITIALLY DEFERRED,
  "UpdatedBy" uuid NOT NULL REFERENCES "_SYSActorDirectory"("IdSeq") DEFERRABLE INITIALLY DEFERRED,
  "RowVersion" bigint NOT NULL DEFAULT 1,
  "AuditOrigin" text NOT NULL DEFAULT 'Native'
);
ALTER TABLE "_SYSCatalogOption" ADD COLUMN IF NOT EXISTS "CreatedAt" timestamptz NOT NULL DEFAULT now();
ALTER TABLE "_SYSCatalogDirectory" ADD COLUMN IF NOT EXISTS "SeedVersion" integer NOT NULL DEFAULT 0;
ALTER TABLE "_SYSCatalogOption" ADD COLUMN IF NOT EXISTS "UpdatedAt" timestamptz NOT NULL DEFAULT now();
ALTER TABLE "_SYSCatalogOption" ADD COLUMN IF NOT EXISTS "ParentId" uuid REFERENCES "_SYSCatalogOption"("IdSeq") ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS "idx_SYSCatalogOption_ParentId" ON "_SYSCatalogOption"("ParentId") WHERE "ParentId" IS NOT NULL;
DO $catalog_audit$
DECLARE sys uuid; t text;
BEGIN
  SELECT "IdSeq" INTO sys FROM "_SYSActorDirectory" WHERE "ActorType"='SYSTEM';
  FOREACH t IN ARRAY ARRAY['_SYSCatalogDirectory','_SYSCatalogOption'] LOOP
    EXECUTE format('CREATE OR REPLACE TRIGGER "zz_RowAudit" BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "_SYSRowAudit"()',t);
  END LOOP;
END $catalog_audit$;

CREATE OR REPLACE FUNCTION "_SYSFindCatalogReferences"(catalog_key text, code_value text)
RETURNS TABLE(table_name text, column_name text, reference_count bigint)
LANGUAGE plpgsql STABLE AS $$
DECLARE r record; n bigint; accepted text[]; option_id uuid;
BEGIN
  SELECT "IdSeq" INTO option_id FROM "_SYSCatalogOption" WHERE "CatalogKey"=catalog_key AND "Value"=code_value;
  accepted := CASE catalog_key
    WHEN 'rank' THEN ARRAY['rank','rankkey','rank_key']
    WHEN 'department' THEN ARRAY['department','departmentkey','department_key']
    WHEN 'position' THEN ARRAY['position','positionkey','position_key']
    WHEN 'businessRole' THEN ARRAY['jobrole','job_role','businessrole','business_role']
    WHEN 'language' THEN ARRAY['language','languagekey','language_key']
    WHEN 'task_priority' THEN ARRAY['priority']
    WHEN 'task_status' THEN ARRAY['status']
    WHEN 'project_type' THEN ARRAY['type','project_type']
    ELSE ARRAY[]::text[] END;
  FOR r IN
    SELECT ns.nspname AS schema_name, cl.relname AS relation_name, at.attname AS attribute_name, ty.typname AS type_name
    FROM pg_class cl JOIN pg_namespace ns ON ns.oid=cl.relnamespace
    JOIN pg_attribute at ON at.attrelid=cl.oid AND at.attnum>0 AND NOT at.attisdropped
    JOIN pg_type ty ON ty.oid=at.atttypid
    WHERE cl.relkind='r' AND NOT EXISTS(SELECT 1 FROM pg_inherits i WHERE i.inhparent=cl.oid) AND ns.nspname=current_schema()
      AND cl.relname NOT IN ('_SYSCatalogDirectory','_SYSCatalogOption','_SECAuditLog','_USRLoginLog','_SYSRowChangeLog')
      AND (ty.typname='jsonb' OR (ty.typname IN ('text','varchar','bpchar','name','uuid') AND lower(at.attname)=ANY(accepted)))
  LOOP
    IF r.type_name='jsonb' THEN
      EXECUTE format('SELECT count(*) FROM %I.%I WHERE position(to_jsonb($1::text)::text in %I::text)>0 OR position(to_jsonb($2::text)::text in %I::text)>0',r.schema_name,r.relation_name,r.attribute_name,r.attribute_name) INTO n USING code_value,option_id;
    ELSIF r.type_name='uuid' THEN
      EXECUTE format('SELECT count(*) FROM %I.%I WHERE %I=$1',r.schema_name,r.relation_name,r.attribute_name) INTO n USING option_id;
    ELSE
      EXECUTE format('SELECT count(*) FROM %I.%I WHERE %I::text=$1 OR %I::text=$2',r.schema_name,r.relation_name,r.attribute_name,r.attribute_name) INTO n USING code_value,option_id::text;
    END IF;
    IF n>0 THEN table_name:=r.relation_name;column_name:=r.attribute_name;reference_count:=n;RETURN NEXT; END IF;
  END LOOP;
END $$;

INSERT INTO "_SYSCatalogDirectory"("Key","Label") VALUES
 ('rank','Cấp bậc'),('department','Phòng ban'),('position','Vị trí / Chức danh'),('businessRole','Vai trò nghiệp vụ'),('language','Ngôn ngữ'),
 ('task_priority','Mức độ ưu tiên công việc'),('task_status','Trạng thái công việc'),('project_type','Phân loại dự án')
ON CONFLICT("Key") DO NOTHING;
INSERT INTO "_SYSCatalogOption"("CatalogKey","Value","Label","Enabled","SortOrder")
SELECT seed.catalog_key,seed.value,seed.label,seed.enabled,seed.sort_order FROM (VALUES
 ('rank','R1','Bậc 1 - Thực thi',true,1),('rank','R2','Bậc 2 - Chuyên viên',true,2),('rank','R3','Bậc 3 - Quản lý cấp trung',true,3),('rank','R4','Bậc 4 - Lãnh đạo cấp cao',true,4),
 ('department','board_of_directors','Ban Tổng Giám đốc (BOD)',true,1),('department','production_offset','Khối Sản xuất In Offset & Flexo',true,2),('department','production_corrugated','Khối Sản xuất Sóng & Thành phẩm',true,3),('department','qa_qc','Phòng Quản lý Chất lượng (QA/QC)',true,4),('department','rnd_design','Phòng R&D & Thiết kế Cấu trúc Bao bì',true,5),('department','supply_chain','Khối Cung ứng & Logistics',true,6),('department','sales_b2b','Khối Kinh doanh B2B & FDI',true,7),('department','it_digital','Phòng CNTT & Chuyển đổi số (IT & MES)',true,8),('department','hr_admin','Phòng Hành chính - Nhân sự',true,9),('department','finance_accounting','Phòng Tài chính - Kế toán',true,10),
 ('position','ceo','Tổng Giám đốc (CEO)',true,1),('position','plant_director','Giám đốc Nhà máy',true,2),('position','dept_head','Trưởng phòng / Trưởng bộ phận',true,3),('position','team_lead','Tổ trưởng / Trưởng nhóm / Quản đốc',true,4),('position','senior_specialist','Chuyên viên chính / Kỹ sư trưởng',true,5),('position','specialist','Chuyên viên / Kỹ sư / Nhân viên',true,6),
 ('businessRole','executive','Ban điều hành',true,1),('businessRole','manager','Quản lý phòng ban',true,2),('businessRole','supervisor','Giám sát / Tổ trưởng',true,3),('businessRole','specialist','Chuyên viên nghiệp vụ',true,4),('businessRole','operator','Kỹ thuật viên / Vận hành',true,5),
 ('language','vi','Tiếng Việt',true,1),('language','en','Tiếng Anh',true,2),
 ('task_priority','urgent','Khẩn cấp (Urgent)',true,1),('task_priority','high','Cao (High)',true,2),('task_priority','medium','Trung bình (Medium)',true,3),('task_priority','low','Thấp (Low)',true,4),
 ('task_status','backlog','Chờ phân bổ (Backlog)',true,1),('task_status','todo','Cần thực hiện (To Do)',true,2),('task_status','in_progress','Đang thực hiện (In Progress)',true,3),('task_status','in_review','Chờ nghiệm thu (In Review)',true,4),('task_status','done','Hoàn thành (Done)',true,5),('task_status','cancelled','Đã hủy (Cancelled)',true,6),
 ('project_type','strategic','Dự án Chiến lược / Đầu tư',true,1),('project_type','production','Dự án Sản xuất & Đơn hàng FDI',true,2),('project_type','rnd','Nghiên cứu & Phát triển Bao bì mới',true,3),('project_type','digital','Chuyển đổi số ERP / MES / ETPMS',true,4),('project_type','quality','Chuẩn hóa ISO / FSC / BRCGS',true,5)
) AS seed(catalog_key,value,label,enabled,sort_order)
JOIN "_SYSCatalogDirectory" c ON c."Key"=seed.catalog_key AND c."SeedVersion"=0
WHERE true
ON CONFLICT("CatalogKey","Value") DO NOTHING;
UPDATE "_SYSCatalogDirectory" SET "SeedVersion"=1 WHERE "SeedVersion"=0;
