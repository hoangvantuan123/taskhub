package skillauth

import (
	"context"
	"encoding/json"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"net"
	"net/url"
	"os"
	"testing"
)

// Creates only disposable learner fixtures; uses the administrator already approved by the user.
func TestPeopleGroupsIntegration(t *testing.T) {
	if os.Getenv("SKILLHUB_PEOPLE_TEST") != "1" {
		t.Skip("opt-in people/group regression")
	}
	godotenv.Load("../../.env")
	connURL := &url.URL{Scheme: "postgres", User: url.UserPassword(os.Getenv("POSTGRES_USER"), os.Getenv("POSTGRES_PASSWORD")), Host: net.JoinHostPort("localhost", os.Getenv("POSTGRES_PORT")), Path: "skillhub", RawQuery: "sslmode=disable"}
	db, e := sqlx.Connect("postgres", connURL.String())
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	ctx := context.Background()
	s := &Server{DB: db}
	var admin account
	if e = db.QueryRow(`SELECT "Id","Email","Name","PasswordHash","Role" FROM "_USRAccountDirectory" WHERE "Username"='admin' AND "Role"='admin' AND "Enabled"`).Scan(&admin.ID, &admin.Email, &admin.Name, &admin.Hash, &admin.Role); e != nil {
		t.Fatal(e)
	}
	prefix := "qa_" + uuid.NewString()[:8]
	module := prefix + "_module"
	group := prefix + "_group"
	ids := []string{}
	defer func() {
		db.Exec(`DELETE FROM "_SECGroupDirectory" WHERE "Key"=$1 OR "Key"=$2`, group, group+"_extra")
		for _, id := range ids {
			db.Exec(`DELETE FROM "_USRSession" WHERE "UserId"=$1`, id)
			db.Exec(`DELETE FROM "_USRLoginLog" WHERE "UserId"=$1`, id)
			db.Exec(`DELETE FROM "_SECAccountPermission" WHERE "UserId"=$1`, id)
			db.Exec(`DELETE FROM "_USRAccountDirectory" WHERE "Id"=$1`, id)
		}
		db.Exec(`DELETE FROM "_ORGDirectory" WHERE "Key"=$1`, prefix)
		db.Exec(`DELETE FROM "_SECPermissionDirectory" WHERE "Key"=$1`, module)
	}()
	if _, e = db.Exec(`INSERT INTO "_SECPermissionDirectory"("Key","Label","Actions") VALUES($1,'Disposable test module','["view","create"]')`, module); e != nil {
		t.Fatal(e)
	}
	call := func(action string, payload any) error { _, e := s.peopleAction(ctx, admin, action, payload); return e }
	for _, kind := range []string{"department", "position", "job_role"} {
		if e = call("directory_save", map[string]any{"kind": kind, "key": prefix, "label": "QA test label"}); e != nil {
			t.Fatal(e)
		}
	}
	for i := 0; i < 2; i++ {
		login := prefix + string(rune('a'+i))
		password, _ := randomToken()
		if e = call("user_create", map[string]any{"username": login, "name": "Disposable learner", "password": password}); e != nil {
			t.Fatal(e)
		}
		var id string
		if e = db.Get(&id, `SELECT "Id" FROM "_USRAccountDirectory" WHERE "Username"=$1`, login); e != nil {
			t.Fatal(e)
		}
		ids = append(ids, id)
	}
	if e = call("user_update", map[string]any{"ids": ids, "department": prefix, "position": prefix, "job_role": prefix}); e != nil {
		t.Fatal(e)
	}
	g := PermissionGroup{Key: group, Label: "Disposable group", Enabled: true, Department: prefix, Position: prefix, JobRole: prefix, Permissions: []GroupPermission{{Module: module, Actions: []string{"view"}}}}
	if e = call("group_save", g); e != nil {
		t.Fatal(e)
	}
	for _, id := range ids {
		if !s.allowed(ctx, account{ID: id, Role: "learner"}, module+":view") {
			t.Fatal("automatic rules not applied")
		}
	}
	if e = call("user_update", map[string]any{"ids": []string{ids[1]}, "position": ""}); e != nil {
		t.Fatal(e)
	}
	if s.allowed(ctx, account{ID: ids[1], Role: "learner"}, module+":view") {
		t.Fatal("AND condition ignored")
	}
	if e = call("group_members", map[string]any{"key": group, "ids": ids}); e != nil {
		t.Fatal(e)
	}
	if !s.allowed(ctx, account{ID: ids[1], Role: "learner"}, module+":view") {
		t.Fatal("manual bulk membership failed")
	}
	g.Permissions[0].Actions = []string{"view", "create"}
	if e = call("group_save", g); e != nil {
		t.Fatal(e)
	}
	if !s.allowed(ctx, account{ID: ids[1], Role: "learner"}, module+":create") {
		t.Fatal("group edit not reflected")
	}
	if e = call("group_members", map[string]any{"key": group, "ids": ids, "remove": true}); e != nil {
		t.Fatal(e)
	}
	if s.allowed(ctx, account{ID: ids[1], Role: "learner"}, module+":view") {
		t.Fatal("membership removal failed")
	}
	if !s.allowed(ctx, account{ID: ids[0], Role: "learner"}, module+":view") {
		t.Fatal("automatic rules lost")
	}
	if e = call("group_members", map[string]any{"key": group, "ids": []string{ids[1], "invalid"}}); status.Code(e) != codes.InvalidArgument {
		t.Fatal("invalid batch accepted", e)
	}
	var n int
	db.Get(&n, `SELECT count(*) FROM "_SECGroupMember" WHERE "GroupKey"=$1`, group)
	if n != 0 {
		t.Fatal("invalid batch did not rollback")
	}

	second := g
	second.Key = group + "_extra"
	second.Department = ""
	second.Position = ""
	second.JobRole = ""
	if e = call("group_save", second); e != nil {
		t.Fatal(e)
	}
	if e = call("group_members", map[string]any{"keys": []string{group, second.Key}, "ids": []string{ids[1]}}); e != nil {
		t.Fatal(e)
	}
	db.Get(&n, `SELECT count(*) FROM "_SECGroupMember" WHERE "UserId"=$1`, ids[1])
	if n != 2 {
		t.Fatal("multiple groups not assigned")
	}
	if e = call("group_members", map[string]any{"keys": []string{group}, "ids": []string{ids[1]}, "remove": true}); e != nil {
		t.Fatal(e)
	}
	if !s.allowed(ctx, account{ID: ids[1], Role: "learner"}, module+":create") {
		t.Fatal("removing one group lost another group's grant")
	}
	if e = call("group_members", map[string]any{"keys": []string{group}, "ids": []string{ids[1], "invalid"}}); status.Code(e) != codes.InvalidArgument {
		t.Fatal("invalid batch accepted")
	}
	db.Get(&n, `SELECT count(*) FROM "_SECGroupMember" WHERE "GroupKey"=$1 AND "UserId"=$2`, group, ids[1])
	if n != 0 {
		t.Fatal("multi-group batch not atomic")
	}
	if e = call("group_members", map[string]any{"keys": []string{second.Key}, "ids": []string{ids[1]}, "remove": true}); e != nil {
		t.Fatal(e)
	}
	if _, e = s.peopleAction(ctx, account{ID: ids[0], Role: "learner"}, "group_save", g); status.Code(e) != codes.PermissionDenied {
		t.Fatal("learner changed groups", e)
	}
	bad := g
	bad.Permissions = []GroupPermission{{Module: module, Actions: []string{"invented"}}}
	if e = call("group_save", bad); status.Code(e) != codes.InvalidArgument {
		t.Fatal("unknown permission accepted", e)
	}
	if e = call("user_update", map[string]any{"ids": []string{admin.ID}, "enabled": false}); status.Code(e) != codes.FailedPrecondition {
		t.Fatal("admin disabled", e)
	}
	data, e := s.directoryAction(ctx, admin, "directory_q", map[string]any{"resource": "accounts", "query": map[string]any{"page": 1, "page_size": 200}})
	if e != nil {
		t.Fatal(e)
	}
	for _, item := range data.AsMap()["rows"].([]any) {
		user := item.(map[string]any)
		if _, ok := user["password_hash"]; ok {
			t.Fatal("password hash exposed")
		}
		if _, ok := user["email"]; !ok {
			t.Fatal("email field missing from people DTO")
		}
	}
	// Test password reset
	newPass := "NewPass123456!"
	if e = call("user_update", map[string]any{"ids": []string{ids[0]}, "password": newPass}); e != nil {
		t.Fatal("password reset failed", e)
	}
	var newHash string
	db.Get(&newHash, `SELECT "PasswordHash" FROM "_USRAccountDirectory" WHERE "Id"=$1`, ids[0])
	if bcrypt.CompareHashAndPassword([]byte(newHash), []byte(newPass)) != nil {
		t.Fatal("stored password hash does not match new password")
	}
	// Test user lock
	if e = call("user_update", map[string]any{"ids": []string{ids[0]}, "enabled": false}); e != nil {
		t.Fatal("user lock failed", e)
	}
	var isEnabled bool
	db.Get(&isEnabled, `SELECT "Enabled" FROM "_USRAccountDirectory" WHERE "Id"=$1`, ids[0])
	if isEnabled {
		t.Fatal("user was not locked")
	}
	// Test user unlock
	if e = call("user_update", map[string]any{"ids": []string{ids[0]}, "enabled": true}); e != nil {
		t.Fatal("user unlock failed", e)
	}
	db.Get(&isEnabled, `SELECT "Enabled" FROM "_USRAccountDirectory" WHERE "Id"=$1`, ids[0])
	if !isEnabled {
		t.Fatal("user was not unlocked")
	}
	if e = call("group_delete", map[string]any{"key": group}); e != nil {
		t.Fatal(e)
	}
	if s.allowed(ctx, account{ID: ids[0], Role: "learner"}, module+":view") {
		t.Fatal("deleted group permissions remain")
	}
}

func TestLevelPolicyService(t *testing.T) {
	if os.Getenv("SKILLHUB_LEVEL_TEST") != "1" {
		t.Skip("opt-in level policy DB regression")
	}
	godotenv.Load("../../.env")
	connURL := &url.URL{Scheme: "postgres", User: url.UserPassword(os.Getenv("POSTGRES_USER"), os.Getenv("POSTGRES_PASSWORD")), Host: net.JoinHostPort("localhost", os.Getenv("POSTGRES_PORT")), Path: "skillhub", RawQuery: "sslmode=disable"}
	db, e := sqlx.Connect("postgres", connURL.String())
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	ctx := context.Background()
	s := &Server{DB: db}
	var admin account
	if e = db.QueryRow(`SELECT "Id","Email","Name","PasswordHash","Role" FROM "_USRAccountDirectory" WHERE "Username"='admin' AND "Role"='admin' AND "Enabled"`).Scan(&admin.ID, &admin.Email, &admin.Name, &admin.Hash, &admin.Role); e != nil {
		t.Fatal(e)
	}
	data, e := s.levelAction(ctx, admin, "level_config", nil)
	if e != nil {
		t.Fatal(e)
	}
	version := int(data.AsMap()["version"].(float64))
	if version < 1 {
		t.Fatal("missing policy version")
	}
	policy := DefaultLevelPolicy()
	_, e = s.levelAction(ctx, admin, "level_save", map[string]any{"policy": policy, "expected_version": version - 1})
	if status.Code(e) != codes.FailedPrecondition {
		t.Fatal("stale config accepted", e)
	}
	scenario := []LevelScenarioAttempt{levelAttempt("L0", 80, 0), levelAttempt("L1", 85, 1), levelAttempt("L0", 50, 2)}
	result, e := s.levelAction(ctx, admin, "level_simulate", map[string]any{"policy": policy, "attempts": scenario})
	if e != nil {
		t.Fatal(e)
	}
	reply := result.AsMap()
	last := reply["outcomes"].([]any)[2].(map[string]any)
	if reply["simulation_only"] != true || last["current_level"] != "L1" {
		t.Fatal("unexpected scenario result", reply)
	}
	_, e = s.levelAction(ctx, account{ID: uuid.NewString(), Role: "learner"}, "level_simulate", map[string]any{"policy": policy, "attempts": scenario})
	if status.Code(e) != codes.PermissionDenied {
		t.Fatal("learner could access policy simulation", e)
	}
	var after int
	db.Get(&after, `SELECT max("Version") FROM "_EXMLevelPolicy"`)
	if after != version {
		t.Fatal("preview or rejected save mutated version")
	}
	// Save an identical policy to verify persistence/versioning without changing the configured rules.
	policyJSON, _ := json.Marshal(data.AsMap()["policy"])
	var unchanged LevelPolicy
	if e = json.Unmarshal(policyJSON, &unchanged); e != nil {
		t.Fatal(e)
	}
	saved, e := s.levelAction(ctx, admin, "level_save", map[string]any{"policy": unchanged, "expected_version": version})
	if e != nil {
		t.Fatal("valid policy save failed", e)
	}
	if saved.AsMap()["version"].(float64) <= float64(version) {
		t.Fatal("policy version did not advance")
	}
	var oldExists bool
	if e = db.Get(&oldExists, `SELECT EXISTS(SELECT 1 FROM "_EXMLevelPolicy" WHERE "Version"=$1)`, version); e != nil || !oldExists {
		t.Fatal("old policy version lost", e)
	}
}
