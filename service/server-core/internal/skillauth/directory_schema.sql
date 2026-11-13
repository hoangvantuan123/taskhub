BEGIN;
SET LOCAL lock_timeout='5s';
SELECT pg_advisory_xact_lock(74921031);
CREATE OR REPLACE FUNCTION "_SYSUUIDv7"() RETURNS uuid LANGUAGE plpgsql VOLATILE AS $$
DECLARE b bytea; ms bigint;
BEGIN
 ms:=floor(extract(epoch FROM clock_timestamp())*1000)::bigint;
 b:=decode(lpad(to_hex(ms),12,'0')||substr(replace(gen_random_uuid()::text,'-',''),13,20),'hex');
 b:=set_byte(b,6,(get_byte(b,6)&15)|112);
 b:=set_byte(b,8,(get_byte(b,8)&63)|128);
 RETURN encode(b,'hex')::uuid;
END $$;
CREATE OR REPLACE FUNCTION "_SYSNormalizeSearch"(text) RETURNS text LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $normalize$ SELECT translate(lower($1),'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ','aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd') $normalize$;
CREATE TABLE IF NOT EXISTS "_SYSSettingDirectory"("IdSeq" uuid PRIMARY KEY DEFAULT "_SYSUUIDv7"(),"Key" text UNIQUE NOT NULL,"Label" text NOT NULL,"Enabled" boolean NOT NULL DEFAULT true,"Data" jsonb NOT NULL DEFAULT '{}',"CreatedAt" timestamptz NOT NULL DEFAULT now(),"UpdatedAt" timestamptz NOT NULL DEFAULT now());
-- Keep legacy natural keys UNIQUE so existing integrations and FKs remain valid.
-- Only the new surrogate IdSeq is backfilled; historical external IDs never change.
DO $$
DECLARE t text; r record; pk record; oldcols text; definitions text[]; ddl text;
BEGIN
 FOREACH t IN ARRAY ARRAY['_USRAccountDirectory','_SECGroupDirectory','_ORGDirectory','_SECPermissionDirectory','_SECGroupMember','_SECGroupPermission','_SECAccountPermission','_USRSession','_USRLoginLog','_SECAuditLog','_SECPermissionNode'] LOOP
  IF to_regclass(format('%I',t)) IS NULL THEN CONTINUE; END IF;
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "IdSeq" uuid',t);
  EXECUTE format('ALTER TABLE %I ALTER COLUMN "IdSeq" SET DEFAULT "_SYSUUIDv7"()',t);
  EXECUTE format('UPDATE %I SET "IdSeq"="_SYSUUIDv7"() WHERE "IdSeq" IS NULL',t);
  EXECUTE format('ALTER TABLE %I ALTER COLUMN "IdSeq" SET NOT NULL',t);
  SELECT conname,conkey INTO pk FROM pg_constraint WHERE conrelid=to_regclass(format('%I',t)) AND contype='p';
  IF FOUND AND (SELECT array_agg(a.attname::text ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=to_regclass(format('%I',t)) AND a.attnum=ANY(pk.conkey))<>ARRAY['IdSeq'] THEN
   SELECT string_agg(quote_ident(a.attname),',' ORDER BY k.ordinality) INTO oldcols FROM unnest(pk.conkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_attribute a ON a.attrelid=to_regclass(format('%I',t)) AND a.attnum=k.attnum;
   definitions:=ARRAY[]::text[];
   FOR r IN SELECT conname,conrelid::regclass::text AS src,pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE confrelid=to_regclass(format('%I',t)) AND contype='f' LOOP
    definitions:=array_append(definitions,format('ALTER TABLE %s ADD CONSTRAINT %I %s',r.src,r.conname,r.def));
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',r.src,r.conname);
   END LOOP;
   EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I',t,pk.conname);
   EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (%s)',t,t||'_LegacyKey',oldcols);
   EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I PRIMARY KEY ("IdSeq")',t,t||'_pkey');
   FOREACH ddl IN ARRAY definitions LOOP EXECUTE ddl; END LOOP;
  ELSIF NOT FOUND THEN
   EXECUTE format('ALTER TABLE %I ADD PRIMARY KEY ("IdSeq")',t);
  END IF;
 END LOOP;
END $$;

-- UUID foreign keys coexist with retained legacy keys during the API transition.
CREATE OR REPLACE FUNCTION "_SYSSyncDirectoryLink"() RETURNS trigger LANGUAGE plpgsql AS $link$
DECLARE doc jsonb:=to_jsonb(NEW); previous jsonb; legacy text; seq text; resolved text;
BEGIN
 IF TG_OP='UPDATE' THEN previous:=to_jsonb(OLD); ELSE previous:='{}'::jsonb; END IF;
 legacy:=doc->>TG_ARGV[0]; seq:=doc->>TG_ARGV[3];
 IF seq IS NOT NULL AND ((TG_OP='UPDATE' AND seq IS DISTINCT FROM previous->>TG_ARGV[3]) OR legacy IS NULL) THEN
  EXECUTE format('SELECT %I::text FROM %I WHERE "IdSeq"=$1::uuid',TG_ARGV[2],TG_ARGV[1]) INTO resolved USING seq;
  IF resolved IS NULL THEN RAISE EXCEPTION 'Unknown UUID reference' USING ERRCODE='23503'; END IF;
  doc:=jsonb_set(doc,ARRAY[TG_ARGV[0]],to_jsonb(resolved));
 ELSIF legacy IS NOT NULL THEN
  EXECUTE format('SELECT "IdSeq"::text FROM %I WHERE %I::text=$1',TG_ARGV[1],TG_ARGV[2]) INTO resolved USING legacy;
  IF resolved IS NULL THEN RAISE EXCEPTION 'Unknown legacy reference' USING ERRCODE='23503'; END IF;
  IF TG_OP='INSERT' AND seq IS NOT NULL AND seq<>resolved THEN RAISE EXCEPTION 'Conflicting directory references' USING ERRCODE='23503'; END IF;
  doc:=jsonb_set(doc,ARRAY[TG_ARGV[3]],to_jsonb(resolved));
 ELSE
  doc:=jsonb_set(doc,ARRAY[TG_ARGV[3]],'null'::jsonb);
 END IF;
 NEW:=jsonb_populate_record(NEW,doc);
 RETURN NEW;
END $link$;
DO $links$
DECLARE r record; mandatory boolean;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  ('_SECGroupMember','GroupSeq','GroupKey','_SECGroupDirectory','Key'),
  ('_SECGroupMember','UserSeq','UserId','_USRAccountDirectory','Id'),
  ('_SECGroupPermission','GroupSeq','GroupKey','_SECGroupDirectory','Key'),
  ('_SECGroupPermission','PermissionSeq','ModuleKey','_SECPermissionDirectory','Key'),
  ('_SECAccountPermission','UserSeq','UserId','_USRAccountDirectory','Id'),
  ('_SECAccountPermission','PermissionSeq','ModuleKey','_SECPermissionDirectory','Key'),
  ('_USRSession','UserSeq','UserId','_USRAccountDirectory','Id'),
  ('_USRLoginLog','UserSeq','UserId','_USRAccountDirectory','Id'),
  ('_SECAuditLog','ActorSeq','ActorId','_USRAccountDirectory','Id'),
  ('_SECPermissionNode','ParentSeq','ParentId','_SECPermissionNode','Id'),
  ('_SECPermissionNode','PermissionSeq','ScopeKey','_SECPermissionDirectory','Key')
 ) AS links(tbl,seq,legacy,ref,"Key") LOOP
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I uuid',r.tbl,r.seq);
  EXECUTE format('UPDATE %I d SET %I=s."IdSeq" FROM %I s WHERE d.%I=s.%I AND d.%I IS DISTINCT FROM s."IdSeq"',r.tbl,r.seq,r.ref,r.legacy,r."Key",r.seq);
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass(format('%I',r.tbl)) AND conname=r.tbl||'_'||r.seq||'_FK') THEN
   EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I("IdSeq")',r.tbl,r.tbl||'_'||r.seq||'_FK',r.seq,r.ref);
  END IF;
  SELECT attnotnull INTO mandatory FROM pg_attribute WHERE attrelid=to_regclass(format('%I',r.tbl)) AND attname=r.legacy;
  IF mandatory THEN EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET NOT NULL',r.tbl,r.seq); END IF;
  EXECUTE format('CREATE OR REPLACE TRIGGER %I BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION "_SYSSyncDirectoryLink"(%L,%L,%L,%L)',r.tbl||'_'||r.seq||'_Sync',r.tbl,r.legacy,r.ref,r."Key",r.seq);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(%I)',r.tbl||'_'||r.seq||'_Idx',r.tbl,r.seq);
 END LOOP;
END $links$;

ALTER TABLE "_ORGDirectory" ADD COLUMN IF NOT EXISTS "Enabled" boolean NOT NULL DEFAULT true;
-- Register the newly implemented exam-directory delete "Operation"; no group receives it automatically.
UPDATE "_SECPermissionDirectory" SET "Actions"="Actions"||'["delete"]'::jsonb WHERE "Key"='tasks' AND NOT "Actions" ? 'delete';
CREATE INDEX IF NOT EXISTS "_SECGroupDirectory_Label" ON "_SECGroupDirectory"(lower("Label"));
CREATE INDEX IF NOT EXISTS "_USRAccountDirectory_Name" ON "_USRAccountDirectory"(lower("Name"));
COMMIT;
