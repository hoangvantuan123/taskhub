BEGIN;
SET LOCAL lock_timeout='5s';
SELECT pg_advisory_xact_lock(74921031);
CREATE TABLE IF NOT EXISTS "_SYSActorDirectory" (
 "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),"ActorType" text NOT NULL CHECK("ActorType" IN ('SYSTEM','USER')),"AccountSeq" uuid UNIQUE REFERENCES "_USRAccountDirectory"("IdSeq") DEFERRABLE INITIALLY DEFERRED,
 "CreatedBy" uuid NOT NULL,"UpdatedBy" uuid NOT NULL,"CreatedAt" timestamptz NOT NULL,"UpdatedAt" timestamptz NOT NULL,"RowVersion" bigint NOT NULL DEFAULT 1,"AuditOrigin" text NOT NULL DEFAULT 'Native'
);
CREATE UNIQUE INDEX IF NOT EXISTS "_SYSActorDirectory_System" ON "_SYSActorDirectory"("ActorType") WHERE "ActorType"='SYSTEM';
WITH identity AS (SELECT "_SYSUUIDv7"() AS "Id") INSERT INTO "_SYSActorDirectory"("IdSeq","ActorType","CreatedBy","UpdatedBy","CreatedAt","UpdatedAt") SELECT "Id",'SYSTEM',"Id","Id",clock_timestamp(),clock_timestamp() FROM identity WHERE NOT EXISTS(SELECT 1 FROM "_SYSActorDirectory" WHERE "ActorType"='SYSTEM');
INSERT INTO "_SYSActorDirectory"("IdSeq","ActorType","AccountSeq","CreatedBy","UpdatedBy","CreatedAt","UpdatedAt") SELECT u."IdSeq",'USER',u."IdSeq",s."IdSeq",s."IdSeq",clock_timestamp(),clock_timestamp() FROM "_USRAccountDirectory" u CROSS JOIN "_SYSActorDirectory" s WHERE s."ActorType"='SYSTEM' ON CONFLICT DO NOTHING;
SET CONSTRAINTS ALL IMMEDIATE;
CREATE TABLE IF NOT EXISTS "_SYSRowChangeLog" (
 "IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),"TableName" text NOT NULL,"RowSeq" uuid NOT NULL,"Operation" text NOT NULL,"DeletedVersion" bigint NOT NULL,"Snapshot" jsonb NOT NULL,
 "CreatedBy" uuid NOT NULL,"UpdatedBy" uuid NOT NULL,"CreatedAt" timestamptz NOT NULL,"UpdatedAt" timestamptz NOT NULL,"RowVersion" bigint NOT NULL DEFAULT 1,"AuditOrigin" text NOT NULL DEFAULT 'Native'
);
CREATE INDEX IF NOT EXISTS "_SYSRowChangeLog_Row" ON "_SYSRowChangeLog"("TableName","RowSeq","CreatedAt");
DO $audit_columns$
DECLARE t record;sys uuid;known timestamptz;
BEGIN
 SELECT "IdSeq" INTO sys FROM "_SYSActorDirectory" WHERE "ActorType"='SYSTEM';
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND c.relkind='r' AND EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='IdSeq' AND a.atttypid='uuid'::regtype) LOOP
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "CreatedBy" uuid, ADD COLUMN IF NOT EXISTS "UpdatedBy" uuid, ADD COLUMN IF NOT EXISTS "CreatedAt" timestamptz, ADD COLUMN IF NOT EXISTS "UpdatedAt" timestamptz, ADD COLUMN IF NOT EXISTS "RowVersion" bigint NOT NULL DEFAULT 1, ADD COLUMN IF NOT EXISTS "AuditOrigin" text NOT NULL DEFAULT ''Native''',t.relname);
  -- Preserve known legacy timestamps; otherwise this is explicitly a migration timestamp.
  EXECUTE format('UPDATE %I d SET "CreatedBy"=COALESCE("CreatedBy",$1),"UpdatedBy"=COALESCE("UpdatedBy","CreatedBy",$1),"CreatedAt"=COALESCE("CreatedAt",transaction_timestamp()),"UpdatedAt"=COALESCE("UpdatedAt","CreatedAt",transaction_timestamp()),"AuditOrigin"=''LegacyImport'' WHERE "CreatedBy" IS NULL OR "UpdatedBy" IS NULL OR "CreatedAt" IS NULL OR "UpdatedAt" IS NULL',t.relname) USING sys;
  EXECUTE format('ALTER TABLE %I ALTER COLUMN "CreatedBy" SET NOT NULL,ALTER COLUMN "UpdatedBy" SET NOT NULL,ALTER COLUMN "CreatedAt" SET NOT NULL,ALTER COLUMN "UpdatedAt" SET NOT NULL',t.relname);
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass(format('%I',t.relname)) AND conname=t.relname||'_CreatedBy_FK') THEN
   EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY("CreatedBy") REFERENCES "_SYSActorDirectory"("IdSeq") DEFERRABLE INITIALLY DEFERRED, ADD CONSTRAINT %I FOREIGN KEY("UpdatedBy") REFERENCES "_SYSActorDirectory"("IdSeq") DEFERRABLE INITIALLY DEFERRED, ADD CONSTRAINT %I CHECK("RowVersion">0)',t.relname,t.relname||'_CreatedBy_FK',t.relname||'_UpdatedBy_FK',t.relname||'_PositiveVersion');
  END IF;
 END LOOP;
END $audit_columns$;
CREATE OR REPLACE FUNCTION "_SYSRowAudit"() RETURNS trigger LANGUAGE plpgsql AS $row_audit$
DECLARE actor uuid;sys uuid;doc jsonb;expected jsonb;requested text;oldversion bigint;stamp timestamptz:=clock_timestamp();
BEGIN
 SELECT "IdSeq" INTO sys FROM "_SYSActorDirectory" WHERE "ActorType"='SYSTEM';
 actor:=NULLIF(current_setting('app.actor_seq',true),'')::uuid;
 IF TG_OP='INSERT' THEN
  doc:=to_jsonb(NEW);
  IF TG_TABLE_NAME='_USRAccountDirectory' THEN
   INSERT INTO "_SYSActorDirectory"("IdSeq","ActorType","AccountSeq","CreatedBy","UpdatedBy","CreatedAt","UpdatedAt") VALUES(NEW."IdSeq",'USER',NEW."IdSeq",sys,sys,stamp,stamp) ON CONFLICT DO NOTHING;
   actor:=COALESCE(actor,sys);
  ELSE
   IF TG_TABLE_NAME='_USRLoginLog' AND NOT COALESCE((doc->>'Success')::boolean,false) THEN actor:=COALESCE(actor,sys); END IF;
   actor:=COALESCE(actor,NULLIF(doc->>'ActorSeq','')::uuid,NULLIF(doc->>'UserSeq','')::uuid,NULLIF(doc->>'CreatedBySeq','')::uuid,sys);
  END IF;
  NEW."CreatedBy":=actor;NEW."UpdatedBy":=actor;NEW."CreatedAt":=stamp;NEW."UpdatedAt":=stamp;NEW."RowVersion":=1;NEW."AuditOrigin":='Native';RETURN NEW;
 END IF;
 expected:=COALESCE(NULLIF(current_setting('app.expected_versions',true),''),'{}')::jsonb;
 requested:=expected->>OLD."IdSeq"::text;
 IF requested IS NOT NULL AND requested::bigint<>OLD."RowVersion" THEN RAISE EXCEPTION 'ROW_VERSION_CONFLICT' USING ERRCODE='40001'; END IF;
 actor:=COALESCE(actor,sys);
 IF TG_OP='DELETE' THEN
  INSERT INTO "_SYSRowChangeLog"("TableName","RowSeq","Operation","DeletedVersion","Snapshot","CreatedBy","UpdatedBy","CreatedAt","UpdatedAt") VALUES(TG_TABLE_NAME,OLD."IdSeq",'D',OLD."RowVersion",to_jsonb(OLD)-ARRAY['PasswordHash','TokenHash','Ip','UserAgent'],actor,actor,stamp,stamp);
  RETURN OLD;
 END IF;
 NEW."CreatedBy":=OLD."CreatedBy";NEW."CreatedAt":=OLD."CreatedAt";NEW."UpdatedBy":=actor;NEW."UpdatedAt":=stamp;NEW."RowVersion":=OLD."RowVersion"+1;NEW."AuditOrigin":=OLD."AuditOrigin";RETURN NEW;
END $row_audit$;
DO $audit_triggers$
DECLARE t record;
BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND c.relkind='r' AND EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='RowVersion') LOOP
  EXECUTE format('CREATE OR REPLACE TRIGGER "zz_RowAudit" BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION "_SYSRowAudit"()',t.relname);
 END LOOP;
END $audit_triggers$;
COMMIT;
