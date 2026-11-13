package skillauth

import (
	"bytes"
	"context"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"
	"google.golang.org/protobuf/types/known/structpb"
	"net"
	"net/url"
	"os"
	"regexp"
	pb "server-core/internal/directorypb"
	"testing"
	"time"
)

func TestDirectoryPostgresIntegration(t *testing.T) {
	if os.Getenv("SKILLHUB_DIRECTORY_TEST") != "1" {
		t.Skip("isolated PostgreSQL schema opt-in")
	}
	godotenv.Load("../../.env")
	port := os.Getenv("POSTGRES_PORT")
	if port == "" {
		port = "5432"
	}
	u := &url.URL{Scheme: "postgres", User: url.UserPassword(os.Getenv("POSTGRES_USER"), os.Getenv("POSTGRES_PASSWORD")), Host: net.JoinHostPort("127.0.0.1", port), Path: "skillhub"}
	q := u.Query()
	q.Set("sslmode", "disable")
	u.RawQuery = q.Encode()
	admin, e := sqlx.Connect("postgres", u.String())
	if e != nil {
		t.Fatal("cannot connect to PostgreSQL")
	}
	defer admin.Close()
	schema := "qa_directory_" + uuid.NewString()[:8]
	if _, e = admin.Exec(`CREATE SCHEMA "` + schema + `"`); e != nil {
		t.Fatal(e)
	}
	defer admin.Exec(`DROP SCHEMA "` + schema + `" CASCADE`)
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()
	db, e := sqlx.Connect("postgres", u.String())
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	for _, ddl := range []string{Schema, ModuleSchema, PeopleSchema, LevelSchema, PermissionHierarchySchema} {
		if _, e = db.ExecContext(ctx, ddl); e != nil {
			t.Fatal(e)
		}
	}
	legacyUser := uuid.NewString()
	if _, e = db.ExecContext(ctx, `INSERT INTO "_USRAccountDirectory"("Id","Email","Username","Name","PasswordHash") VALUES($1,'legacy@test.invalid','legacy','Legacy','unused')`, legacyUser); e != nil {
		t.Fatal(e)
	}
	if _, e = db.ExecContext(ctx, `INSERT INTO "_SECGroupDirectory"("Key","Label") VALUES('legacy_group','Legacy group'); INSERT INTO "_SECGroupPermission"("GroupKey","ModuleKey","Action") VALUES('legacy_group','questions','view')`); e != nil {
		t.Fatal(e)
	}
	if _, e = db.ExecContext(ctx, `INSERT INTO "_SECGroupMember"("GroupKey","UserId") VALUES('legacy_group',$1)`, legacyUser); e != nil {
		t.Fatal(e)
	}

	if e = InitDirectorySchema(ctx, db); e != nil {
		t.Fatal(e)
	}
	if _, e = db.ExecContext(ctx, AuditSchema); e != nil {
		t.Fatal(e)
	}
	if _, e = db.ExecContext(ctx, CatalogSchema); e != nil {
		t.Fatal(e)
	}
	if _, e = db.ExecContext(ctx, `CREATE TABLE "CatalogReferenceFixture"("Data" jsonb NOT NULL); INSERT INTO "CatalogReferenceFixture" VALUES('{"assessment":{"level":"L0"}}')`); e != nil {
		t.Fatal(e)
	}
	var reference string
	if e = db.GetContext(ctx, &reference, `SELECT table_name||'.'||column_name||':'||reference_count FROM "_SYSFindCatalogReferences"('level','L0') WHERE table_name='CatalogReferenceFixture'`); e != nil || reference != "CatalogReferenceFixture.Data:1" {
		t.Fatalf("catalog reference scan = %q, %v", reference, e)
	}
	// Reproduce a deployed database: old business names alongside new audit
	// columns, including duplicate timestamps. Migration must retain identities.
	pairs := regexp.MustCompile(`\('([a-z_]+)','([A-Za-z]+)'\)`).FindAllStringSubmatch(ColumnSchema, -1)
	tables := []string{"_LRNCourseDirectory", "_EXMExamDirectory", "_SYSSettingDirectory"}
	for _, table := range directoryRenames {
		tables = append(tables, table)
	}
	for _, table := range tables {
		seen := map[string]bool{}
		for _, pair := range pairs {
			old, canonical := pair[1], pair[2]
			if seen[old] {
				continue
			}
			seen[old] = true
			var exists bool
			if e = db.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1 AND column_name=$2)`, table, canonical); e != nil {
				t.Fatal(e)
			}
			if !exists {
				continue
			}
			statement := `ALTER TABLE "` + table + `" RENAME COLUMN "` + canonical + `" TO "` + old + `"`
			if old == "created_at" || old == "updated_at" {
				statement = `ALTER TABLE "` + table + `" ADD COLUMN "` + old + `" timestamptz NOT NULL DEFAULT now()`
			}
			if _, e = db.ExecContext(ctx, statement); e != nil {
				t.Fatal(e)
			}
		}
	}
	if e = PrepareDirectorySchema(ctx, db); e != nil {
		t.Fatal("PascalCase migration", e)
	}
	var oldColumns int
	if e = db.GetContext(ctx, &oldColumns, `SELECT count(*) FROM information_schema.columns WHERE table_schema=current_schema() AND column_name !~ '^[A-Z][A-Za-z0-9]*$'`); e != nil || oldColumns != 0 {
		t.Fatal("noncanonical physical columns", oldColumns, e)
	}
	if e = InitDirectorySchema(ctx, db); e != nil {
		t.Fatal("not idempotent", e)
	}
	var preserved int
	if e = db.GetContext(ctx, &preserved, `SELECT count(*) FROM "_SECGroupMember" m JOIN "_USRAccountDirectory" u ON u."Id"=m."UserId" JOIN "_SECGroupPermission" p ON p."GroupKey"=m."GroupKey" WHERE u."Id"=$1 AND p."ModuleKey"='questions' AND p."Action"='view'`, legacyUser); e != nil || preserved != 1 {
		t.Fatal("legacy relationships lost", preserved, e)
	}
	if _, e = db.ExecContext(ctx, `INSERT INTO "_SECGroupDirectory"("Key","Label") VALUES('seed_group','Seed group'); ALTER TABLE "_SECGroupDirectory" RENAME TO skillhub_permission_groups`); e != nil {
		t.Fatal(e)
	}
	if e = PrepareDirectorySchema(ctx, db); e != nil {
		t.Fatal(e)
	}
	if e = InitDirectorySchema(ctx, db); e != nil {
		t.Fatal(e)
	}
	var pk string
	if e = db.GetContext(ctx, &pk, `SELECT a.attname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey) WHERE c.conrelid='"_SECGroupDirectory"'::regclass AND c.contype='p'`); e != nil || pk != "IdSeq" {
		t.Fatal(pk, e)
	}
	s := &Server{DB: db}
	actor := account{ID: uuid.Must(uuid.NewV7()).String(), Role: "admin"}
	if _, e = db.ExecContext(ctx, `INSERT INTO "_USRAccountDirectory"("Id","Email","Username","Name","PasswordHash","Role") VALUES($1,'fixture@test.invalid','fixture','Fixture','unused','admin')`, actor.ID); e != nil {
		t.Fatal(e)
	}
	call := func(op string, p map[string]any) map[string]any {
		t.Helper()
		if (op == "u" || op == "d") && p["row_version"] == nil {
			spec, _ := directoryResource(p["resource"].(string))
			var version string
			if e := db.GetContext(ctx, &version, `SELECT "RowVersion"::text FROM "`+spec.Table+`" WHERE "IdSeq"=$1`, p["id_seq"]); e != nil {
				t.Fatal(e)
			}
			p["row_version"] = version
		}
		out, e := s.directoryAction(ctx, actor, "directory_"+op, p)
		if e != nil {
			t.Fatal(op, e)
		}
		return out.AsMap()
	}
	group := call("a", map[string]any{"resource": "groups", "record": map[string]any{"label": "Biên soạn", "permissions": []any{map[string]any{"module": "questions", "actions": []string{"view"}}}}})
	id := group["id_seq"].(string)
	parsed, e := uuid.Parse(id)
	if e != nil || parsed.Version() != 7 {
		t.Fatal(id, e)
	}
	result := call("q", map[string]any{"resource": "groups", "query": map[string]any{"search": []string{"Biên", "missing"}, "search_columns": []string{"label"}, "page_size": 1}})
	if result["total"] != float64(1) || len(result["rows"].([]any)) != 1 {
		t.Fatal(result)
	}
	row := result["rows"].([]any)[0].(map[string]any)
	plainSearch := call("q", map[string]any{"resource": "groups", "query": map[string]any{"search": []string{"bien soan"}, "search_columns": []string{"label"}}})
	if plainSearch["total"] != float64(1) {
		t.Fatal("accent-insensitive search failed", plainSearch)
	}
	if len(row["permissions"].([]any)) != 1 {
		t.Fatal(row)
	}
	var actorSeq string
	if e = db.GetContext(ctx, &actorSeq, `SELECT "IdSeq" FROM "_USRAccountDirectory" WHERE "Id"=$1`, actor.ID); e != nil {
		t.Fatal(e)
	}
	if row["RowVersion"] != "1" || row["CreatedBy"] != actorSeq || row["UpdatedBy"] != actorSeq || row["CreatedAt"] == nil || row["UpdatedAt"] == nil {
		t.Fatal("missing native audit metadata", row)
	}
	call("u", map[string]any{"resource": "groups", "id_seq": id, "record": map[string]any{"label": "Đổi tên", "enabled": false, "permissions": []any{}}})
	for _, op := range []string{"directory_u", "directory_d"} {
		_, err := s.directoryAction(ctx, actor, op, map[string]any{"resource": "groups", "id_seq": id, "row_version": "1", "record": map[string]any{"label": "Stale write", "permissions": []any{}}})
		if status.Code(err) != codes.Aborted {
			t.Fatal("stale version accepted", op, err)
		}
	}
	if _, err := s.directoryAction(ctx, actor, "directory_u", map[string]any{"resource": "groups", "id_seq": id, "record": map[string]any{"label": "No version", "permissions": []any{}}}); status.Code(err) != codes.InvalidArgument {
		t.Fatal("missing version accepted", err)
	}
	if _, err := s.peopleAction(ctx, actor, "group_save", map[string]any{"key": row["key"], "label": "Legacy bypass", "enabled": true, "permissions": []any{}}); status.Code(err) != codes.InvalidArgument {
		t.Fatal("legacy route bypassed OCC", err)
	}
	call("d", map[string]any{"resource": "groups", "id_seq": id})
	var deletedVersion int64
	if e = db.GetContext(ctx, &deletedVersion, `SELECT "DeletedVersion" FROM "_SYSRowChangeLog" WHERE "TableName"='_SECGroupDirectory' AND "RowSeq"=$1`, id); e != nil || deletedVersion != 2 {
		t.Fatal("deletion audit missing", deletedVersion, e)
	}
	for _, resource := range []string{"courses", "exams", "settings", "organization"} {
		record := map[string]any{"label": "Sample " + resource}
		if resource == "organization" {
			record["kind"] = "department"
		}
		added := call("a", map[string]any{"resource": resource, "record": record})
		key := added["id_seq"].(string)
		call("u", map[string]any{"resource": resource, "id_seq": key, "record": map[string]any{"label": "Updated " + resource, "enabled": false}})
		call("q", map[string]any{"resource": resource, "query": map[string]any{"filters": []any{map[string]any{"column": "IdSeq", "op": "in", "values": []string{key}}}}})
		call("d", map[string]any{"resource": resource, "id_seq": key})
	}
	added := call("a", map[string]any{"resource": "accounts", "record": map[string]any{"username": "directory_qa", "name": "Test user", "password": "TestOnly_123456!"}})
	accountID := added["id_seq"].(string)
	var legacyGroupID string
	if e = db.GetContext(ctx, &legacyGroupID, `SELECT "IdSeq" FROM "_SECGroupDirectory" WHERE "Key"='legacy_group'`); e != nil {
		t.Fatal(e)
	}
	if _, e = db.ExecContext(ctx, `INSERT INTO "_SECGroupMember"("GroupSeq","UserSeq") VALUES($1,$2)`, legacyGroupID, accountID); e != nil {
		t.Fatal("UUID-only reference insert failed", e)
	}
	var linked int
	if e = db.GetContext(ctx, &linked, `SELECT count(*) FROM "_SECGroupMember" m JOIN "_USRAccountDirectory" u ON u."Id"=m."UserId" WHERE m."UserSeq"=$1 AND m."GroupKey"='legacy_group'`, accountID); e != nil || linked != 1 {
		t.Fatal("reference synchronization failed", linked, e)
	}
	call("d", map[string]any{"resource": "groups", "id_seq": legacyGroupID})
	if e = db.GetContext(ctx, &linked, `SELECT count(*) FROM "_SECGroupMember" WHERE "GroupSeq"=$1`, legacyGroupID); e != nil || linked != 0 {
		t.Fatal("group cascade failed", linked, e)
	}
	accounts := call("q", map[string]any{"resource": "accounts"})
	for _, item := range accounts["rows"].([]any) {
		if _, ok := item.(map[string]any)["password_hash"]; ok {
			t.Fatal("hash leaked")
		}
	}
	call("u", map[string]any{"resource": "accounts", "id_seq": accountID, "record": map[string]any{"name": "Updated user"}})
	call("d", map[string]any{"resource": "accounts", "id_seq": accountID})
	if _, e = s.directoryAction(ctx, account{ID: actor.ID, Role: "learner"}, "directory_q", map[string]any{"resource": "groups"}); status.Code(e) != codes.PermissionDenied {
		t.Fatal("permission not enforced", e)
	}
	if _, e = s.directoryAction(ctx, actor, "directory_q", map[string]any{"resource": "groups", "query": map[string]any{"filters": []any{map[string]any{"column": "label; DROP TABLE x", "op": "eq", "values": []string{"x"}}}}}); status.Code(e) != codes.InvalidArgument {
		t.Fatal("SQL identifier accepted", e)
	}
	// Verify the actual generated gRPC contract, including active-session authentication.
	s.Secret = bytes.Repeat([]byte{1}, 32)
	s.HistoryKey = bytes.Repeat([]byte{2}, 32)
	sid := uuid.Must(uuid.NewV7()).String()
	if _, e = db.ExecContext(ctx, `INSERT INTO "_USRSession"("Id","UserId","TokenHash","ExpiresAt","Ip","UserAgent") VALUES($1,$2,$3,now()+interval '1 hour','','')`, sid, actor.ID, sid); e != nil {
		t.Fatal(e)
	}
	token, e := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": actor.ID, "sid": sid, "iss": "skillhub", "aud": "skillhub-web", "exp": time.Now().Add(time.Hour).Unix()}).SignedString(s.Secret)
	if e != nil {
		t.Fatal(e)
	}
	listener := bufconn.Listen(1024 * 1024)
	server := grpc.NewServer()
	RegisterDirectory(server, s)
	go server.Serve(listener)
	defer server.Stop()
	conn, e := grpc.NewClient("passthrough:///directory-test", grpc.WithTransportCredentials(insecure.NewCredentials()), grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) { return listener.Dial() }))
	if e != nil {
		t.Fatal(e)
	}
	defer conn.Close()
	client := pb.NewDirectoryClient(conn)
	if _, e = client.Q(ctx, &pb.Request{Resource: "groups"}); status.Code(e) != codes.Unauthenticated {
		t.Fatal("gRPC accepted missing session", e)
	}
	record, _ := structpb.NewStruct(map[string]any{"label": "gRPC group", "enabled": true, "permissions": []any{}})
	created, e := client.A(ctx, &pb.Request{Token: token, Resource: "groups", Record: record})
	if e != nil {
		t.Fatal(e)
	}
	rpcID := created.AsMap()["id_seq"].(string)
	if _, e = client.Q(ctx, &pb.Request{Token: token, Resource: "groups", Query: &pb.Query{PageSize: 1}}); e != nil {
		t.Fatal(e)
	}
	record, _ = structpb.NewStruct(map[string]any{"label": "gRPC updated", "enabled": true, "permissions": []any{}})
	if _, e = client.U(ctx, &pb.Request{Token: token, Resource: "groups", IdSeq: rpcID, Record: record, RowVersion: "1"}); e != nil {
		t.Fatal(e)
	}
	if _, e = client.D(ctx, &pb.Request{Token: token, Resource: "groups", IdSeq: rpcID, RowVersion: "2"}); e != nil {
		t.Fatal(e)
	}
	// Two independent writers holding the same version cannot both commit.
	concurrent := call("a", map[string]any{"resource": "settings", "record": map[string]any{"label": "Concurrent row"}})
	errors := make(chan error, 2)
	for i := 0; i < 2; i++ {
		go func() {
			_, err := s.directoryAction(ctx, actor, "directory_u", map[string]any{"resource": "settings", "id_seq": concurrent["id_seq"], "row_version": "1", "record": map[string]any{"label": "Concurrent update"}})
			errors <- err
		}()
	}
	successes, conflicts := 0, 0
	for i := 0; i < 2; i++ {
		err := <-errors
		if err == nil {
			successes++
		} else if status.Code(err) == codes.Aborted {
			conflicts++
		} else {
			t.Fatal(err)
		}
	}
	if successes != 1 || conflicts != 1 {
		t.Fatal("lost update protection failed", successes, conflicts)
	}
	if _, err := s.peopleAction(ctx, actor, "people", map[string]any{"lookups_only": true}); err != nil {
		t.Fatal("legacy people DTO", err)
	}
	if _, err := s.peopleAction(ctx, actor, "group_list", nil); err != nil {
		t.Fatal("legacy groups DTO", err)
	}
	if _, err := s.moduleAction(ctx, actor, "grants", nil); err != nil {
		t.Fatal("legacy grants DTO", err)
	}
	other := account{ID: uuid.NewString(), Role: "admin"}
	if _, e = db.ExecContext(ctx, `INSERT INTO "_USRAccountDirectory"("Id","Email","Username","Name","PasswordHash","Role") VALUES($1,'other@test.invalid','other','Other','unused','admin')`, other.ID); e != nil {
		t.Fatal(e)
	}
	var otherSeq string
	if e = db.GetContext(ctx, &otherSeq, `SELECT "IdSeq" FROM "_USRAccountDirectory" WHERE "Id"=$1`, other.ID); e != nil {
		t.Fatal(e)
	}
	owned := call("a", map[string]any{"resource": "settings", "record": map[string]any{"label": "Ownership row"}})
	if _, err := s.directoryAction(ctx, other, "directory_u", map[string]any{"resource": "settings", "id_seq": owned["id_seq"], "row_version": "1", "record": map[string]any{"label": "Other writer"}}); err != nil {
		t.Fatal(err)
	}
	var createdBy, updatedBy string
	if e = db.QueryRowContext(ctx, `SELECT "CreatedBy","UpdatedBy" FROM "_SYSSettingDirectory" WHERE "IdSeq"=$1`, owned["id_seq"]).Scan(&createdBy, &updatedBy); e != nil || createdBy != actorSeq || updatedBy != otherSeq {
		t.Fatal("incorrect actor attribution", createdBy, updatedBy, e)
	}
	if _, err := s.directoryAction(ctx, other, "directory_u", map[string]any{"resource": "settings", "id_seq": owned["id_seq"], "row_version": "2", "record": map[string]any{"label": "Forged creator", "CreatedBy": otherSeq}}); status.Code(err) != codes.InvalidArgument {
		t.Fatal("accepted forged audit fields", err)
	}
	// Exercise the other SQL paths against the renamed physical columns.
	if e = s.InitLevelPolicy(ctx); e != nil {
		t.Fatal("policy initialization", e)
	}
	if _, e = s.levelAction(ctx, actor, "level_config", nil); e != nil {
		t.Fatal("policy read", e)
	}
	if e = s.MigrateMetadata(ctx); e != nil {
		t.Fatal("metadata migration", e)
	}
	for _, operation := range []string{"module_create", "module_update", "module_delete"} {
		payload := map[string]any{"key": "pascal_fixture", "label": "Pascal fixture", "actions": []any{"view"}, "enabled": true}
		if operation != "module_create" {
			payload["RowVersion"] = "1"
		}
		if operation == "module_delete" {
			payload["RowVersion"] = "2"
		}
		if _, e = s.moduleAction(ctx, actor, operation, payload); e != nil {
			t.Fatal(operation, e)
		}
	}
	request, _ := structpb.NewStruct(map[string]any{"action": "register", "username": "pascal_fixture", "name": "Pascal fixture", "password": "Fixture-password-123", "ip": "127.0.0.1", "user_agent": "schema-test"})
	registered, err := s.Execute(ctx, request)
	if err != nil {
		t.Fatal("registration after column migration", err)
	}
	registeredUser := registered.AsMap()["user"].(map[string]any)
	profileRequest, _ := structpb.NewStruct(map[string]any{"action": "profile_update", "token": registered.AsMap()["access_token"], "payload": map[string]any{"name": "Updated fixture", "RowVersion": registeredUser["RowVersion"]}})
	if _, e = s.Execute(ctx, profileRequest); e != nil {
		t.Fatal("profile after column migration", e)
	}
	loginRequest, _ := structpb.NewStruct(map[string]any{"action": "login", "username": "pascal_fixture", "password": "Fixture-password-123", "ip": "127.0.0.1", "user_agent": "schema-test"})
	if _, e = s.Execute(ctx, loginRequest); e != nil {
		t.Fatal("login after column migration", e)
	}
	var logged int
	if e = db.GetContext(ctx, &logged, `SELECT count(*) FROM "_USRLoginLog" WHERE "Email"='pascal_fixture' AND "Success"`); e != nil || logged != 2 {
		t.Fatal("login history after column migration", logged, e)
	}
}
