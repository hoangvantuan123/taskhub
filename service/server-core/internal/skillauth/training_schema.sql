-- Work Groups / Teams Schema
CREATE TABLE IF NOT EXISTS "_TRNGroup" (
  "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),
  "Code" text NOT NULL UNIQUE,
  "Name" text NOT NULL,
  "LeaderId" uuid,
  "LeaderName" text NOT NULL DEFAULT '',
  "Description" text NOT NULL DEFAULT '',
  "Status" text NOT NULL DEFAULT 'active' CHECK ("Status" IN ('active','inactive','archived')),
  "CreatedBy" uuid,
  "UpdatedBy" uuid,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "RowVersion" bigint NOT NULL DEFAULT 1 CHECK ("RowVersion" > 0),
  "AuditOrigin" text NOT NULL DEFAULT 'Native'
);

CREATE TABLE IF NOT EXISTS "_TRNGroupMember" (
  "GroupId" uuid NOT NULL,
  "UserId" uuid NOT NULL,
  "AddedAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("GroupId", "UserId")
);

CREATE INDEX IF NOT EXISTS "idx_TRNGroupMember_User" ON "_TRNGroupMember"("UserId");

DO $training_audit$
DECLARE rel_name text;
BEGIN
  FOREACH rel_name IN ARRAY ARRAY['_TRNGroup'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "CreatedBy" uuid, ADD COLUMN IF NOT EXISTS "UpdatedBy" uuid, ADD COLUMN IF NOT EXISTS "CreatedAt" timestamptz NOT NULL DEFAULT now(), ADD COLUMN IF NOT EXISTS "UpdatedAt" timestamptz NOT NULL DEFAULT now(), ADD COLUMN IF NOT EXISTS "RowVersion" bigint NOT NULL DEFAULT 1, ADD COLUMN IF NOT EXISTS "AuditOrigin" text NOT NULL DEFAULT ''Native''', rel_name);
    EXECUTE format('UPDATE %I SET "CreatedBy"=COALESCE("CreatedBy",(SELECT "IdSeq" FROM "_SYSActorDirectory" WHERE "ActorType"=''SYSTEM'' LIMIT 1)),"UpdatedBy"=COALESCE("UpdatedBy","CreatedBy",(SELECT "IdSeq" FROM "_SYSActorDirectory" WHERE "ActorType"=''SYSTEM'' LIMIT 1)) WHERE "CreatedBy" IS NULL OR "UpdatedBy" IS NULL', rel_name);
    EXECUTE format('CREATE OR REPLACE TRIGGER "zz_RowAudit" BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "_SYSRowAudit"()', rel_name);
  END LOOP;
END $training_audit$;
