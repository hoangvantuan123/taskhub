CREATE TABLE IF NOT EXISTS "_QSTFolder" (
 "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
 "Name" text NOT NULL, "Description" text NOT NULL DEFAULT '',
 "LevelId" uuid REFERENCES "_SYSCatalogOption"("IdSeq") ON DELETE RESTRICT,
 "SampleKey" text UNIQUE,
 "CreatedBy" uuid NOT NULL,
 "UpdatedBy" uuid NOT NULL,
 "CreatedAt" timestamptz NOT NULL DEFAULT now(), "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
 "RowVersion" bigint NOT NULL DEFAULT 1 CHECK ("RowVersion">0), "AuditOrigin" text NOT NULL DEFAULT 'Native'
);
CREATE TABLE IF NOT EXISTS "_QSTQuestion" (
 "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
 "LevelId" uuid NOT NULL REFERENCES "_SYSCatalogOption"("IdSeq") ON DELETE RESTRICT,
 "FormatId" uuid NOT NULL REFERENCES "_SYSCatalogOption"("IdSeq") ON DELETE RESTRICT,
 "SpecialtyId" uuid NOT NULL REFERENCES "_SYSCatalogOption"("IdSeq") ON DELETE RESTRICT,
 "TopicId" uuid NOT NULL REFERENCES "_SYSCatalogOption"("IdSeq") ON DELETE RESTRICT,
 "TargetGroupId" uuid NOT NULL REFERENCES "_SYSCatalogOption"("IdSeq") ON DELETE RESTRICT,
 "CognitiveLevelId" uuid NOT NULL REFERENCES "_SYSCatalogOption"("IdSeq") ON DELETE RESTRICT,
 "FolderId" uuid REFERENCES "_QSTFolder"("IdSeq") ON DELETE RESTRICT,
 "Content" text NOT NULL, "Explanation" text NOT NULL DEFAULT '',
 "Type" text NOT NULL CHECK ("Type" IN ('single_choice','essay')),
 "Options" jsonb NOT NULL DEFAULT '[]', "Rubrics" jsonb NOT NULL DEFAULT '[]',
 "SimulationType" text NOT NULL DEFAULT '', "IsCritical" boolean NOT NULL DEFAULT false,
 "CriticalReason" text NOT NULL DEFAULT '',
 "ImageUrl" text NOT NULL DEFAULT '',
 "Status" text NOT NULL DEFAULT 'draft' CHECK ("Status" IN ('draft','pending_review','published')),
 "AuthorId" uuid REFERENCES "_USRAccountDirectory"("IdSeq"),
 "SampleKey" text UNIQUE,
 "CreatedBy" uuid NOT NULL,
 "UpdatedBy" uuid NOT NULL,
 "CreatedAt" timestamptz NOT NULL DEFAULT now(), "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
 "RowVersion" bigint NOT NULL DEFAULT 1 CHECK ("RowVersion">0), "AuditOrigin" text NOT NULL DEFAULT 'Native',
 "Version" integer NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS "_QSTSimulation" (
 "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
 "Name" text NOT NULL,
 "Description" text NOT NULL DEFAULT '',
 "TemplateKey" text NOT NULL CHECK ("TemplateKey" IN ('dispatch','estop')),
 "Config" jsonb NOT NULL DEFAULT '{}'::jsonb,
 "CreatedBy" uuid NOT NULL,
 "UpdatedBy" uuid NOT NULL,
 "CreatedAt" timestamptz NOT NULL DEFAULT now(),
 "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
 "RowVersion" bigint NOT NULL DEFAULT 1 CHECK ("RowVersion">0),
 "AuditOrigin" text NOT NULL DEFAULT 'Native'
);
ALTER TABLE "_QSTSimulation" DROP CONSTRAINT IF EXISTS "_QSTSimulation_TemplateKey_check";
ALTER TABLE "_QSTSimulation" ADD CONSTRAINT "_QSTSimulation_TemplateKey_check" CHECK ("TemplateKey" IN ('dispatch','estop','production_ui'));
ALTER TABLE "_QSTQuestion" ADD COLUMN IF NOT EXISTS "SimulationId" uuid REFERENCES "_QSTSimulation"("IdSeq") ON DELETE SET NULL;
-- Apply the same five audit fields on an existing installation, including first-run tables.
ALTER TABLE "_QSTQuestion" ALTER COLUMN "AuthorId" DROP NOT NULL;
ALTER TABLE "_QSTQuestion" DROP CONSTRAINT IF EXISTS "_QSTQuestion_UpdatedBy_fkey";
ALTER TABLE "_QSTQuestion" ADD COLUMN IF NOT EXISTS "ImageUrl" text NOT NULL DEFAULT '';
DO $question_audit$
DECLARE relation_name text; system_actor uuid;
BEGIN
 SELECT "IdSeq" INTO system_actor FROM "_SYSActorDirectory" WHERE "ActorType"='SYSTEM';
 FOREACH relation_name IN ARRAY ARRAY['_QSTQuestion','_QSTFolder','_QSTSimulation'] LOOP
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "SampleKey" text, ADD COLUMN IF NOT EXISTS "CreatedBy" uuid, ADD COLUMN IF NOT EXISTS "UpdatedBy" uuid, ADD COLUMN IF NOT EXISTS "CreatedAt" timestamptz NOT NULL DEFAULT now(), ADD COLUMN IF NOT EXISTS "UpdatedAt" timestamptz NOT NULL DEFAULT now(), ADD COLUMN IF NOT EXISTS "RowVersion" bigint NOT NULL DEFAULT 1, ADD COLUMN IF NOT EXISTS "AuditOrigin" text NOT NULL DEFAULT ''Native''',relation_name);
  EXECUTE format('UPDATE %I SET "CreatedBy"=COALESCE("CreatedBy",$1),"UpdatedBy"=COALESCE("UpdatedBy","CreatedBy",$1) WHERE "CreatedBy" IS NULL OR "UpdatedBy" IS NULL',relation_name) USING system_actor;
  EXECUTE format('ALTER TABLE %I ALTER COLUMN "CreatedBy" SET NOT NULL,ALTER COLUMN "UpdatedBy" SET NOT NULL,ALTER COLUMN "CreatedAt" SET NOT NULL,ALTER COLUMN "UpdatedAt" SET NOT NULL',relation_name);
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass(format('%I',relation_name)) AND conname=relation_name||'_CreatedBy_FK') THEN
   EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY("CreatedBy") REFERENCES "_SYSActorDirectory"("IdSeq") DEFERRABLE INITIALLY DEFERRED,ADD CONSTRAINT %I FOREIGN KEY("UpdatedBy") REFERENCES "_SYSActorDirectory"("IdSeq") DEFERRABLE INITIALLY DEFERRED',relation_name,relation_name||'_CreatedBy_FK',relation_name||'_UpdatedBy_FK');
  END IF;
  EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I("SampleKey")',relation_name||'_SampleKey',relation_name);
  EXECUTE format('CREATE OR REPLACE TRIGGER "zz_RowAudit" BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "_SYSRowAudit"()',relation_name);
 END LOOP;
END $question_audit$;
CREATE INDEX IF NOT EXISTS "idx_QSTQuestion_Folder" ON "_QSTQuestion"("FolderId");
CREATE INDEX IF NOT EXISTS "idx_QSTQuestion_Level" ON "_QSTQuestion"("LevelId");
DROP VIEW IF EXISTS "_QSTQuestionView" CASCADE;
CREATE OR REPLACE VIEW "_QSTQuestionView" AS
 SELECT q."IdSeq",q."LevelId",q."FormatId",q."SpecialtyId",q."TopicId",q."TargetGroupId",q."CognitiveLevelId",q."FolderId",
 q."Content",q."Explanation",q."Type",q."Options",q."Rubrics",q."SimulationType",q."SimulationId",sim."Name" AS "SimulationName",sim."Description" AS "SimulationDescription",sim."TemplateKey" AS "SimulationTemplateKey",sim."Config" AS "SimulationConfig",q."IsCritical",q."CriticalReason",q."ImageUrl",q."Status",q."AuthorId",q."UpdatedBy",q."CreatedAt",q."UpdatedAt",q."Version",
 l."Label" AS "LevelName", l."Value" AS "LevelCode",
 f."Label" AS "FormatName", f."Value" AS "FormatCode",
 s."Label" AS "SpecialtyName", t."Label" AS "TopicName",
 g."Label" AS "TargetGroupName", c."Label" AS "CognitiveLevelName",
 c."Value" AS "CognitiveLevelCode", COALESCE(a."Name",a."Username",'Hệ thống') AS "AuthorName",
 q."CreatedBy",q."RowVersion",q."AuditOrigin",folder."Name" AS "FolderName",q."SampleKey"
 FROM "_QSTQuestion" q
 LEFT JOIN "_SYSCatalogOption" l ON l."IdSeq"=q."LevelId"
 LEFT JOIN "_SYSCatalogOption" f ON f."IdSeq"=q."FormatId"
 LEFT JOIN "_SYSCatalogOption" s ON s."IdSeq"=q."SpecialtyId"
 LEFT JOIN "_SYSCatalogOption" t ON t."IdSeq"=q."TopicId"
 LEFT JOIN "_SYSCatalogOption" g ON g."IdSeq"=q."TargetGroupId"
 LEFT JOIN "_SYSCatalogOption" c ON c."IdSeq"=q."CognitiveLevelId"
 LEFT JOIN "_USRAccountDirectory" a ON a."IdSeq"=q."AuthorId"
 LEFT JOIN "_QSTFolder" folder ON folder."IdSeq"=q."FolderId"
 LEFT JOIN "_QSTSimulation" sim ON sim."IdSeq"=q."SimulationId";
