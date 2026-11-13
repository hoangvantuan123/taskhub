-- Exam session & attempt execution engine schema
CREATE TABLE IF NOT EXISTS "_ASMExamSession" (
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "Code" text NOT NULL UNIQUE,
  "Title" text NOT NULL,
  "AssessmentId" uuid NOT NULL,
  "StartTime" timestamptz NOT NULL,
  "EndTime" timestamptz NOT NULL,
  "Location" text NOT NULL DEFAULT 'Trực tuyến',
  "TargetScope" jsonb NOT NULL DEFAULT '{"departments":[],"positions":[],"ranks":[],"groups":[],"users":[]}'::jsonb,
  "MaxAttempts" integer NOT NULL DEFAULT 1 CHECK ("MaxAttempts" >= 1),
  "SecurityConfig" jsonb NOT NULL DEFAULT '{"singleDevice":true,"shuffleQuestions":true,"shuffleOptions":true,"preventTabSwitch":true,"maxViolations":3,"allowReview":false}'::jsonb,
  "Status" text NOT NULL DEFAULT 'scheduled' CHECK ("Status" IN ('scheduled','in_progress','completed','cancelled')),
  "CreatedBy" uuid,
  "UpdatedBy" uuid,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "RowVersion" bigint NOT NULL DEFAULT 1 CHECK ("RowVersion" > 0),
  "AuditOrigin" text NOT NULL DEFAULT 'Native'
);

CREATE INDEX IF NOT EXISTS "idx_ASMExamSession_Assessment" ON "_ASMExamSession"("AssessmentId");
CREATE INDEX IF NOT EXISTS "idx_ASMExamSession_Time" ON "_ASMExamSession"("StartTime", "EndTime");

CREATE TABLE IF NOT EXISTS "_ASMExamAttempt" (
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "ExamSessionId" uuid NOT NULL,
  "AssessmentId" uuid NOT NULL,
  "UserId" uuid NOT NULL,
  "AttemptNumber" integer NOT NULL DEFAULT 1,
  "SessionToken" text NOT NULL UNIQUE,
  "DeviceFingerprint" text NOT NULL DEFAULT '',
  "IpAddress" text NOT NULL DEFAULT '',
  "UserAgent" text NOT NULL DEFAULT '',
  "StartedAt" timestamptz NOT NULL DEFAULT now(),
  "Deadline" timestamptz NOT NULL,
  "SubmittedAt" timestamptz,
  "Answers" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "Violations" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "ViolationCount" integer NOT NULL DEFAULT 0,
  "TotalScore" numeric NOT NULL DEFAULT 0,
  "MaxScore" numeric NOT NULL DEFAULT 10,
  "PassingScore" numeric NOT NULL DEFAULT 5,
  "IsPassed" boolean NOT NULL DEFAULT false,
  "FailedCriticalRule" boolean NOT NULL DEFAULT false,
  "GradingStatus" text NOT NULL DEFAULT 'in_progress' CHECK ("GradingStatus" IN ('in_progress','submitted','needs_grading','graded')),
  "GradedBy" uuid,
  "GradedAt" timestamptz,
  "Feedback" text NOT NULL DEFAULT '',
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "RowVersion" bigint NOT NULL DEFAULT 1 CHECK ("RowVersion" > 0),
  "AuditOrigin" text NOT NULL DEFAULT 'Native'
);

CREATE INDEX IF NOT EXISTS "idx_ASMExamAttempt_SessionUser" ON "_ASMExamAttempt"("ExamSessionId", "UserId");
CREATE INDEX IF NOT EXISTS "idx_ASMExamAttempt_User" ON "_ASMExamAttempt"("UserId", "StartedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_ASMExamAttempt_GradingStatus" ON "_ASMExamAttempt"("GradingStatus");

DO $exam_audit$
DECLARE rel_name text;
BEGIN
  FOREACH rel_name IN ARRAY ARRAY['_ASMExamSession','_ASMExamAttempt'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "CreatedBy" uuid, ADD COLUMN IF NOT EXISTS "UpdatedBy" uuid, ADD COLUMN IF NOT EXISTS "CreatedAt" timestamptz NOT NULL DEFAULT now(), ADD COLUMN IF NOT EXISTS "UpdatedAt" timestamptz NOT NULL DEFAULT now(), ADD COLUMN IF NOT EXISTS "RowVersion" bigint NOT NULL DEFAULT 1, ADD COLUMN IF NOT EXISTS "AuditOrigin" text NOT NULL DEFAULT ''Native''', rel_name);
    EXECUTE format('UPDATE %I SET "CreatedBy"=COALESCE("CreatedBy",(SELECT "IdSeq" FROM "_SYSActorDirectory" WHERE "ActorType"=''SYSTEM'' LIMIT 1)),"UpdatedBy"=COALESCE("UpdatedBy","CreatedBy",(SELECT "IdSeq" FROM "_SYSActorDirectory" WHERE "ActorType"=''SYSTEM'' LIMIT 1)) WHERE "CreatedBy" IS NULL OR "UpdatedBy" IS NULL', rel_name);
    EXECUTE format('CREATE OR REPLACE TRIGGER "zz_RowAudit" BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "_SYSRowAudit"()', rel_name);
  END LOOP;
END $exam_audit$;
