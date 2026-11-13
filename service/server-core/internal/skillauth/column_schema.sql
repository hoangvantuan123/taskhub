-- Rename existing columns in place; PostgreSQL preserves FK/index identities.
DO $columns$
DECLARE t record;r record;tr record;definition text;
BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND c.relkind='r' AND c.relname IN ('_USRAccountDirectory','_SECGroupDirectory','_ORGDirectory','_SECPermissionDirectory','_SECGroupMember','_SECGroupPermission','_SECAccountPermission','_USRSession','_USRLoginLog','_SECAuditLog','_SECPermissionNode','_SYSSettingDirectory') LOOP
  FOR r IN SELECT * FROM (VALUES ('id','Id'),
('email','Email'),
('name','Name'),
('password_hash','PasswordHash'),
('role','Role'),
('created_at','CreatedAt'),
('username','Username'),
('enabled','Enabled'),
('source_db','SourceDb'),
('department','Department'),
('position','Position'),
('job_role','JobRole'),
('birth_date','BirthDate'),
('phone','Phone'),
('contact_email','ContactEmail'),
('avatar_url','AvatarUrl'),
('user_id','UserId'),
('token_hash','TokenHash'),
('expires_at','ExpiresAt'),
('revoked','Revoked'),
('ip','Ip'),
('user_agent','UserAgent'),
('success','Success'),
('ip_key','IpKey'),
('key','Key'),
('label','Label'),
('actions','Actions'),
('system','System'),
('actor_id','ActorId'),
('operation','Operation'),
('resource','Resource'),
('kind','Kind'),
('group_key','GroupKey'),
('module_key','ModuleKey'),
('action','Action'),
('parent_id','ParentId'),
('route','Route'),
('description','Description'),
('scope_key','ScopeKey'),
('version','Version'),
('rules','Rules'),
('created_by','PolicyAuthorId'),
('data','Data'),
('updated_at','UpdatedAt')) AS names(old_name,new_name) LOOP
   IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=t.relname AND column_name=r.old_name) THEN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=t.relname AND column_name=r.new_name) THEN
     IF r.old_name NOT IN ('created_at','updated_at') THEN RAISE EXCEPTION 'Ambiguous columns %.% / %',t.relname,r.old_name,r.new_name; END IF;
     EXECUTE format('UPDATE %I SET %I=%I WHERE %I IS NULL',t.relname,r.new_name,r.old_name,r.new_name);
     EXECUTE format('ALTER TABLE %I DROP COLUMN %I',t.relname,r.old_name);
    ELSE
     EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I',t.relname,r.old_name,r.new_name);
    END IF;
   END IF;
  END LOOP;
 END LOOP;
 -- Trigger arguments contain column names as values and are not renamed by PostgreSQL.
 FOR tr IN SELECT pg_get_triggerdef(g.oid) AS def FROM pg_trigger g JOIN pg_proc p ON p.oid=g.tgfoid JOIN pg_class c ON c.oid=g.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND p.proname='_SYSSyncDirectoryLink' AND NOT g.tgisinternal LOOP
  definition:=replace(tr.def,'CREATE TRIGGER','CREATE OR REPLACE TRIGGER');
  FOR r IN SELECT * FROM (VALUES ('id','Id'),
('email','Email'),
('name','Name'),
('password_hash','PasswordHash'),
('role','Role'),
('created_at','CreatedAt'),
('username','Username'),
('enabled','Enabled'),
('source_db','SourceDb'),
('department','Department'),
('position','Position'),
('job_role','JobRole'),
('birth_date','BirthDate'),
('phone','Phone'),
('contact_email','ContactEmail'),
('avatar_url','AvatarUrl'),
('user_id','UserId'),
('token_hash','TokenHash'),
('expires_at','ExpiresAt'),
('revoked','Revoked'),
('ip','Ip'),
('user_agent','UserAgent'),
('success','Success'),
('ip_key','IpKey'),
('key','Key'),
('label','Label'),
('actions','Actions'),
('system','System'),
('actor_id','ActorId'),
('operation','Operation'),
('resource','Resource'),
('kind','Kind'),
('group_key','GroupKey'),
('module_key','ModuleKey'),
('action','Action'),
('parent_id','ParentId'),
('route','Route'),
('description','Description'),
('scope_key','ScopeKey'),
('version','Version'),
('rules','Rules'),
('created_by','PolicyAuthorId'),
('data','Data'),
('updated_at','UpdatedAt')) AS names(old_name,new_name) LOOP
   definition:=replace(definition,quote_literal(r.old_name),quote_literal(r.new_name));
  END LOOP;
  EXECUTE definition;
 END LOOP;
END $columns$;
