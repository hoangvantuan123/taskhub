CREATE TABLE IF NOT EXISTS "_ASMAssessment" (
 "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
 "Code" text NOT NULL UNIQUE,
 "Title" text NOT NULL,
 "SubjectId" uuid,
 "SubjectName" text NOT NULL DEFAULT '',
 "TargetGroupId" uuid,
 "TargetRank" uuid,
 "TargetDepartment" uuid,
 "TargetPosition" uuid,
 "TargetRole" uuid,
 "Registration" jsonb NOT NULL DEFAULT '{}'::jsonb,
 "HasCriticalRule" boolean NOT NULL DEFAULT false,
 "DurationMinutes" integer NOT NULL CHECK ("DurationMinutes" BETWEEN 1 AND 600),
 "TotalPoints" numeric NOT NULL DEFAULT 10 CHECK ("TotalPoints">0),
 "PassingScore" numeric NOT NULL CHECK ("PassingScore">=0 AND "PassingScore"<="TotalPoints"),
 "QuestionIds" uuid[] NOT NULL DEFAULT '{}',
 "Status" text NOT NULL DEFAULT 'draft' CHECK ("Status" IN ('draft','published')),
 "PublishedAt" timestamptz,
 "CreatedBy" uuid, "UpdatedBy" uuid,
 "CreatedAt" timestamptz NOT NULL DEFAULT now(), "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
 "RowVersion" bigint NOT NULL DEFAULT 1 CHECK ("RowVersion">0), "AuditOrigin" text NOT NULL DEFAULT 'Native'
);
CREATE INDEX IF NOT EXISTS "idx_ASMAssessment_Status" ON "_ASMAssessment"("Status","UpdatedAt" DESC);
ALTER TABLE "_ASMAssessment" DROP CONSTRAINT IF EXISTS "_ASMAssessment_TargetGroupId_fkey";
ALTER TABLE "_ASMAssessment" ALTER COLUMN "SubjectId" DROP DEFAULT;
ALTER TABLE "_ASMAssessment" ALTER COLUMN "SubjectId" DROP NOT NULL;
ALTER TABLE "_ASMAssessment" ALTER COLUMN "SubjectId" TYPE uuid USING NULLIF("SubjectId"::text, '')::uuid;
ALTER TABLE "_ASMAssessment" ALTER COLUMN "TargetRank" DROP DEFAULT;
ALTER TABLE "_ASMAssessment" ALTER COLUMN "TargetRank" DROP NOT NULL;
ALTER TABLE "_ASMAssessment" ALTER COLUMN "TargetRank" TYPE uuid USING NULLIF("TargetRank"::text, '')::uuid;
ALTER TABLE "_ASMAssessment" ALTER COLUMN "TargetDepartment" DROP DEFAULT;
ALTER TABLE "_ASMAssessment" ALTER COLUMN "TargetDepartment" DROP NOT NULL;
ALTER TABLE "_ASMAssessment" ALTER COLUMN "TargetDepartment" TYPE uuid USING NULLIF("TargetDepartment"::text, '')::uuid;
ALTER TABLE "_ASMAssessment" ALTER COLUMN "TargetPosition" DROP DEFAULT;
ALTER TABLE "_ASMAssessment" ALTER COLUMN "TargetPosition" DROP NOT NULL;
ALTER TABLE "_ASMAssessment" ALTER COLUMN "TargetPosition" TYPE uuid USING NULLIF("TargetPosition"::text, '')::uuid;
ALTER TABLE "_ASMAssessment" ALTER COLUMN "TargetRole" DROP DEFAULT;
ALTER TABLE "_ASMAssessment" ALTER COLUMN "TargetRole" DROP NOT NULL;
ALTER TABLE "_ASMAssessment" ALTER COLUMN "TargetRole" TYPE uuid USING NULLIF("TargetRole"::text, '')::uuid;
CREATE TABLE IF NOT EXISTS "_ASMBlueprint" (
 "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
 "Mode" text NOT NULL CHECK ("Mode" IN ('exam','practice')),
 "Scope" jsonb NOT NULL DEFAULT '{}'::jsonb,
 "Config" jsonb NOT NULL,
 "CreatedBy" uuid, "UpdatedBy" uuid,
 "CreatedAt" timestamptz NOT NULL DEFAULT now(), "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
 "RowVersion" bigint NOT NULL DEFAULT 1 CHECK ("RowVersion">0), "AuditOrigin" text NOT NULL DEFAULT 'Native',
 UNIQUE("Mode","Scope")
);
DO $assessment_audit$
DECLARE relation_name text;
BEGIN
 FOREACH relation_name IN ARRAY ARRAY['_ASMAssessment','_ASMBlueprint'] LOOP
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "CreatedBy" uuid, ADD COLUMN IF NOT EXISTS "UpdatedBy" uuid, ADD COLUMN IF NOT EXISTS "CreatedAt" timestamptz NOT NULL DEFAULT now(), ADD COLUMN IF NOT EXISTS "UpdatedAt" timestamptz NOT NULL DEFAULT now(), ADD COLUMN IF NOT EXISTS "RowVersion" bigint NOT NULL DEFAULT 1, ADD COLUMN IF NOT EXISTS "AuditOrigin" text NOT NULL DEFAULT ''Native''',relation_name);
  EXECUTE format('UPDATE %I SET "CreatedBy"=COALESCE("CreatedBy",(SELECT "IdSeq" FROM "_SYSActorDirectory" WHERE "ActorType"=''SYSTEM'' LIMIT 1)),"UpdatedBy"=COALESCE("UpdatedBy","CreatedBy",(SELECT "IdSeq" FROM "_SYSActorDirectory" WHERE "ActorType"=''SYSTEM'' LIMIT 1)) WHERE "CreatedBy" IS NULL OR "UpdatedBy" IS NULL',relation_name);
  EXECUTE format('ALTER TABLE %I ALTER COLUMN "CreatedBy" SET NOT NULL, ALTER COLUMN "UpdatedBy" SET NOT NULL',relation_name);
  EXECUTE format('CREATE OR REPLACE TRIGGER "zz_RowAudit" BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "_SYSRowAudit"()',relation_name);
 END LOOP;
END $assessment_audit$;
