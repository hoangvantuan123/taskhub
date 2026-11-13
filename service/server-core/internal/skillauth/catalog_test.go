package skillauth

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
)

func TestCatalogKeyAndValueValidation(t *testing.T) {
	validKeys := []string{"rank", "department", "position", "businessRole", "language", "level", "custom_catalog", "cat-123"}
	for _, k := range validKeys {
		if !validCatalogKey(k) {
			t.Errorf("expected valid key %q", k)
		}
	}

	invalidKeys := []string{"", "123num", "-invalid", "_invalid", "has space", "has.dot", strings.Repeat("a", 49)}
	for _, k := range invalidKeys {
		if validCatalogKey(k) {
			t.Errorf("expected invalid key %q", k)
		}
	}

	validValues := []string{"R1", "worker", "isa_95", "level-0", "L1", "All", "123"}
	for _, v := range validValues {
		if !validCatalogValue(v) {
			t.Errorf("expected valid value %q", v)
		}
	}

	invalidValues := []string{"", "has space", "có_dấu", "v@lue", "v.1", strings.Repeat("a", 65)}
	for _, v := range invalidValues {
		if validCatalogValue(v) {
			t.Errorf("expected invalid value %q", v)
		}
	}
}

func TestCatalogActionPermissionCheck(t *testing.T) {
	s := &Server{}
	ctx := context.Background()
	learner := account{ID: "00000000-0000-0000-0000-000000000001", Role: "learner"}

	// Learner has no catalog:view permission, so catalog_get must be denied
	_, err := s.catalogAction(ctx, learner, "catalog_get", map[string]any{"key": "rank"})
	if err == nil || !strings.Contains(err.Error(), "catalog:view") {
		t.Fatalf("expected permission denied for learner on catalog_get, got: %v", err)
	}

	// Unknown action must be rejected
	_, err = s.catalogAction(ctx, learner, "catalog_unknown", map[string]any{})
	if err == nil || !strings.Contains(err.Error(), "Unknown catalog operation") {
		t.Fatalf("expected unknown catalog operation error, got: %v", err)
	}
}

func TestCatalogIntegration(t *testing.T) {
	_ = godotenv.Load("../../.env")
	user := os.Getenv("POSTGRES_USER")
	if user == "" {
		t.Skip("PostgreSQL not configured in .env")
	}
	connURL := &url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(user, os.Getenv("POSTGRES_PASSWORD")),
		Host:     net.JoinHostPort("localhost", os.Getenv("POSTGRES_PORT")),
		Path:     "skillhub",
		RawQuery: "sslmode=disable",
	}
	db, err := sqlx.Connect("postgres", connURL.String())
	if err != nil {
		t.Skipf("cannot connect to db: %v", err)
	}
	defer db.Close()

	ctx := context.Background()
	s := &Server{DB: db}

	var admin account
	if err = db.QueryRow(`SELECT "Id","Email","Name","PasswordHash","Role" FROM "_USRAccountDirectory" WHERE "Username"='admin' AND "Role"='admin' AND "Enabled"`).Scan(&admin.ID, &admin.Email, &admin.Name, &admin.Hash, &admin.Role); err != nil {
		t.Skipf("admin user not found: %v", err)
	}
	var catalogRow struct {
		Key     string `db:"Key"`
		Label   string `db:"Label"`
		Actions string `db:"Actions"`
		Enabled bool   `db:"Enabled"`
		System  bool   `db:"System"`
	}
	_ = db.Get(&catalogRow, `SELECT "Key","Label","Actions"::text,"Enabled","System" FROM "_SECPermissionDirectory" WHERE "Key"='catalog'`)
	t.Logf("Catalog row in DB: %+v", catalogRow)

	perms, perr := s.permissions(ctx, admin)
	t.Logf("Admin permissions (err=%v): %v", perr, perms)

	if _, err = db.Exec(CatalogSchema); err != nil {
		t.Fatalf("failed to exec CatalogSchema: %v", err)
	}

	// Test catalog_get for all default business catalogs
	for _, key := range []string{"rank", "department", "position", "businessRole", "language", "level"} {
		res, err := s.catalogAction(ctx, admin, "catalog_get", map[string]any{"key": key})
		if err != nil {
			t.Fatalf("catalog_get failed for key %s: %v", key, err)
		}
		data := res.AsMap()["data"].(map[string]any)
		if data["key"] != key {
			t.Errorf("expected key %s, got %v", key, data["key"])
		}
		options, ok := data["options"].([]any)
		if !ok || len(options) == 0 {
			t.Errorf("expected non-empty options for key %s", key)
		}
	}

	// Test catalog_save: update label and options
	savePayload := map[string]any{
		"key":   "rank",
		"label": "Cấp bậc nâng cao",
		"options": []map[string]any{
			{"value": "R1", "label": "Bậc 1 (Sơ cấp)", "active": true},
			{"value": "R2", "label": "Bậc 2", "active": true},
			{"value": "R3", "label": "Bậc 3", "active": true},
			{"value": "R4", "label": "Bậc 4", "active": true},
			{"value": "R5", "label": "Bậc 5 (Mới)", "active": true},
		},
	}
	saveRes, err := s.catalogAction(ctx, admin, "catalog_save", savePayload)
	if err != nil {
		t.Fatalf("catalog_save failed: %v", err)
	}
	savedData := saveRes.AsMap()["data"].(map[string]any)
	if savedData["label"] != "Cấp bậc nâng cao" {
		t.Errorf("expected label 'Cấp bậc nâng cao', got %v", savedData["label"])
	}

	// Restore original
	restorePayload := map[string]any{
		"key":   "rank",
		"label": "Cấp bậc",
		"options": []map[string]any{
			{"value": "R1", "label": "Bậc 1", "active": true},
			{"value": "R2", "label": "Bậc 2", "active": true},
			{"value": "R3", "label": "Bậc 3", "active": true},
			{"value": "R4", "label": "Bậc 4", "active": true},
		},
	}
	if _, err = s.catalogAction(ctx, admin, "catalog_save", restorePayload); err != nil {
		t.Fatalf("failed to restore rank catalog: %v", err)
	}
}

func TestCatalogHTTPAPI(t *testing.T) {
	_ = godotenv.Load("../../.env")
	user := os.Getenv("POSTGRES_USER")
	if user == "" {
		t.Skip("PostgreSQL not configured in .env")
	}
	connURL := &url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(user, os.Getenv("POSTGRES_PASSWORD")),
		Host:     net.JoinHostPort("localhost", os.Getenv("POSTGRES_PORT")),
		Path:     "skillhub",
		RawQuery: "sslmode=disable",
	}
	db, err := sqlx.Connect("postgres", connURL.String())
	if err != nil {
		t.Skipf("cannot connect to db: %v", err)
	}
	defer db.Close()

	var admin account
	if err = db.QueryRow(`SELECT "Id","Email","Name","PasswordHash","Role" FROM "_USRAccountDirectory" WHERE "Username"='admin' AND "Role"='admin' AND "Enabled"`).Scan(&admin.ID, &admin.Email, &admin.Name, &admin.Hash, &admin.Role); err != nil {
		t.Skipf("admin user not found: %v", err)
	}

	secret := os.Getenv("SKILLHUB_JWT_SECRET")
	if secret == "" {
		secret = "CEB9B4C73B9A534B00AD87B4AE87EE4A34CFAD17C56B5AA24873C1C44147445EC3AF544886DD170B00593716EC0D5A29"
	}

	sid := "00000000-0000-0000-0000-000000000099"
	// Ensure active session
	db.Exec(`DELETE FROM "_USRSession" WHERE "Id"=$1`, sid)
	if _, err = db.Exec(`INSERT INTO "_USRSession"("Id","UserId","TokenHash","ExpiresAt","Ip","UserAgent") VALUES($1,$2,'test_hash',now()+interval '1 hour','127.0.0.1','TestAgent')`, sid, admin.ID); err != nil {
		t.Fatalf("failed to create test session: %v", err)
	}
	defer db.Exec(`DELETE FROM "_USRSession" WHERE "Id"=$1`, sid)

	claims := jwt.MapClaims{
		"sub": admin.ID,
		"sid": sid,
		"iss": "skillhub",
		"aud": "skillhub-web",
		"exp": time.Now().Add(10 * time.Minute).Unix(),
		"iat": time.Now().Unix(),
	}
	tokenStr, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("failed to sign JWT: %v", err)
	}

	// Test HTTP POST /api/auth/catalog_get
	client := &http.Client{Timeout: 5 * time.Second}
	reqBody, _ := json.Marshal(map[string]any{"payload": map[string]any{"key": "position"}})
	httpReq, err := http.NewRequest(http.MethodPost, "http://127.0.0.1:8081/api/auth/catalog_get", strings.NewReader(string(reqBody)))
	if err != nil {
		t.Fatal(err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Origin", "http://localhost:5173")
	httpReq.Header.Set("Authorization", "Bearer "+tokenStr)

	resp, err := client.Do(httpReq)
	if err != nil {
		t.Skipf("HTTP server not reachable on 8081: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errResp map[string]any
		json.NewDecoder(resp.Body).Decode(&errResp)
		t.Fatalf("catalog_get HTTP status = %d, response = %+v", resp.StatusCode, errResp)
	}

	var result map[string]any
	if err = json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	t.Logf("catalog_get HTTP response: %+v", result)
	data, ok := result["data"].(map[string]any)
	if !ok || data["key"] != "position" {
		t.Fatalf("unexpected HTTP response data: %+v", result)
	}

	// Test HTTP POST /api/auth/catalog_save
	savePayload := map[string]any{
		"payload": map[string]any{
			"key":   "position",
			"label": "Vị trí / Nhóm đối tượng",
			"options": []map[string]any{
				{"value": "worker", "label": "Công nhân", "active": true},
				{"value": "admin", "label": "Admin", "active": true},
				{"value": "production_manager", "label": "Quản lý sản xuất (QLSX)", "active": true},
			},
		},
	}
	saveBody, _ := json.Marshal(savePayload)
	saveReq, err := http.NewRequest(http.MethodPost, "http://127.0.0.1:8081/api/auth/catalog_save", strings.NewReader(string(saveBody)))
	if err != nil {
		t.Fatal(err)
	}
	saveReq.Header.Set("Content-Type", "application/json")
	saveReq.Header.Set("Origin", "http://localhost:5173")
	saveReq.Header.Set("Authorization", "Bearer "+tokenStr)

	saveResp, err := client.Do(saveReq)
	if err != nil {
		t.Fatal(err)
	}
	defer saveResp.Body.Close()

	if saveResp.StatusCode != http.StatusOK {
		var errResp map[string]any
		json.NewDecoder(saveResp.Body).Decode(&errResp)
		t.Fatalf("catalog_save HTTP status = %d, response = %+v", saveResp.StatusCode, errResp)
	}
	var saveResult map[string]any
	if err = json.NewDecoder(saveResp.Body).Decode(&saveResult); err != nil {
		t.Fatal(err)
	}
	t.Logf("catalog_save HTTP response: %+v", saveResult)

	// Test HTTP POST /api/auth/directory_q (Used by /admin/users)
	dirQPayload := map[string]any{
		"payload": map[string]any{
			"resource": "accounts",
			"query": map[string]any{
				"page":      1,
				"page_size": 20,
			},
		},
	}
	s := &Server{DB: db}
	ctx := context.Background()
	directRes, directErr := s.directoryAction(ctx, admin, "directory_q", dirQPayload["payload"])
	t.Logf("direct directoryAction result (err=%v): %+v", directErr, directRes)

	dirQBody, _ := json.Marshal(dirQPayload)
	dirQReq, err := http.NewRequest(http.MethodPost, "http://127.0.0.1:8081/api/auth/directory_q", strings.NewReader(string(dirQBody)))
	if err != nil {
		t.Fatal(err)
	}
	dirQReq.Header.Set("Content-Type", "application/json")
	dirQReq.Header.Set("Origin", "http://localhost:5173")
	dirQReq.Header.Set("Authorization", "Bearer "+tokenStr)

	dirQResp, err := client.Do(dirQReq)
	if err != nil {
		t.Fatal(err)
	}
	defer dirQResp.Body.Close()

	var dirQResult map[string]any
	json.NewDecoder(dirQResp.Body).Decode(&dirQResult)
	t.Logf("directory_q HTTP status = %d, response = %+v", dirQResp.StatusCode, dirQResult)
	if dirQResp.StatusCode != http.StatusOK {
		t.Fatalf("directory_q failed: status %d, resp: %+v", dirQResp.StatusCode, dirQResult)
	}

	// Test HTTP POST /api/auth/people (Used by /admin/users for lookups)
	peoplePayload := map[string]any{
		"payload": map[string]any{
			"lookups_only": true,
		},
	}
	pDirect, pDirectErr := s.peopleAction(ctx, admin, "people", peoplePayload["payload"])
	t.Logf("direct peopleAction result (err=%v): %+v", pDirectErr, pDirect)

	peopleBody, _ := json.Marshal(peoplePayload)
	peopleReq, _ := http.NewRequest(http.MethodPost, "http://127.0.0.1:8081/api/auth/people", strings.NewReader(string(peopleBody)))
	peopleReq.Header.Set("Content-Type", "application/json")
	peopleReq.Header.Set("Origin", "http://localhost:5173")
	peopleReq.Header.Set("Authorization", "Bearer "+tokenStr)
	peopleResp, err := client.Do(peopleReq)
	if err != nil {
		t.Fatal(err)
	}
	defer peopleResp.Body.Close()
	if peopleResp.StatusCode != http.StatusOK {
		var pErr map[string]any
		json.NewDecoder(peopleResp.Body).Decode(&pErr)
		t.Fatalf("people lookups failed: status %d, resp: %+v", peopleResp.StatusCode, pErr)
	}

	// Test HTTP POST /api/auth/directory_q with groups (Used by /admin/users for groups list)
	groupsPayload := map[string]any{
		"payload": map[string]any{
			"resource": "groups",
			"query": map[string]any{
				"page":      1,
				"page_size": 200,
			},
		},
	}
	groupsBody, _ := json.Marshal(groupsPayload)
	groupsReq, _ := http.NewRequest(http.MethodPost, "http://127.0.0.1:8081/api/auth/directory_q", strings.NewReader(string(groupsBody)))
	groupsReq.Header.Set("Content-Type", "application/json")
	groupsReq.Header.Set("Origin", "http://localhost:5173")
	groupsReq.Header.Set("Authorization", "Bearer "+tokenStr)
	groupsResp, err := client.Do(groupsReq)
	if err != nil {
		t.Fatal(err)
	}
	defer groupsResp.Body.Close()
	if groupsResp.StatusCode != http.StatusOK {
		var gErr map[string]any
		json.NewDecoder(groupsResp.Body).Decode(&gErr)
		t.Fatalf("groups query failed: status %d, resp: %+v", groupsResp.StatusCode, gErr)
	}
}

