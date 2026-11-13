package skillauth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"
)

func TestQuestionUUIDValidation(t *testing.T) {
	for _, value := range []string{"", "L2", "sub-mes", "01900000-0000-4000-8000-000000000001"} {
		if validQuestionUUID(value) {
			t.Fatalf("accepted invalid UUIDv7 %q", value)
		}
	}
	if !validQuestionUUID("01900000-0000-7000-8000-000000000001") {
		t.Fatal("valid UUIDv7 rejected")
	}
}

func TestAssessmentSchemaCreatesBlueprintBeforeAuditMigration(t *testing.T) {
	blueprint := strings.Index(AssessmentsSchema, `CREATE TABLE IF NOT EXISTS "_ASMBlueprint"`)
	auditMigration := strings.Index(AssessmentsSchema, `DO $assessment_audit$`)
	if blueprint < 0 || auditMigration < 0 || blueprint > auditMigration {
		t.Fatal("assessment schema must create _ASMBlueprint before applying audit migration")
	}
}

func TestQuestionHTTP(t *testing.T) {
	_ = godotenv.Load("../../.env")
	if os.Getenv("SKILLHUB_JWT_SECRET") == "" {
		t.Skip("Local API not configured")
	}
	port := os.Getenv("POSTGRES_PORT")
	if port == "" {
		port = "5432"
	}
	conn := &url.URL{Scheme: "postgres", User: url.UserPassword(os.Getenv("POSTGRES_USER"), os.Getenv("POSTGRES_PASSWORD")), Host: net.JoinHostPort("localhost", port), Path: "skillhub", RawQuery: "sslmode=disable"}
	db, err := sqlx.Connect("postgres", conn.String())
	if err != nil {
		t.Fatal("Cannot connect to PostgreSQL")
	}
	defer db.Close()
	var userID string
	if err = db.Get(&userID, `SELECT "Id" FROM "_USRAccountDirectory" WHERE "Role"='admin' AND "Enabled" LIMIT 1`); err != nil {
		t.Fatal(err)
	}
	sid := uuid.Must(uuid.NewV7()).String()
	if _, err = db.Exec(`INSERT INTO "_USRSession"("Id","UserId","TokenHash","ExpiresAt","Ip","UserAgent") VALUES($1,$2,$3,now()+interval '5 minutes','127.0.0.1','QuestionHTTPIntegration')`, sid, userID, sid); err != nil {
		t.Fatal(err)
	}
	defer db.Exec(`DELETE FROM "_USRSession" WHERE "Id"=$1`, sid)
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": userID, "sid": sid, "iss": "skillhub", "aud": "skillhub-web", "exp": time.Now().Add(5 * time.Minute).Unix(), "iat": time.Now().Unix()}).SignedString([]byte(os.Getenv("SKILLHUB_JWT_SECRET")))
	if err != nil {
		t.Fatal(err)
	}
	client := &http.Client{Timeout: 10 * time.Second}
	call := func(action string, payload any, want int, authenticated bool) map[string]any {
		t.Helper()
		raw, _ := json.Marshal(map[string]any{"payload": payload})
		req, _ := http.NewRequest("POST", "http://127.0.0.1:8081/api/auth/"+action, bytes.NewReader(raw))
		req.Header.Set("Origin", "http://localhost:5173")
		req.Header.Set("Content-Type", "application/json")
		if authenticated {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		resp, e := client.Do(req)
		if e != nil {
			t.Fatal(e)
		}
		defer resp.Body.Close()
		var result map[string]any
		if e = json.NewDecoder(resp.Body).Decode(&result); e != nil {
			t.Fatal(e)
		}
		if resp.StatusCode != want {
			t.Fatalf("%s status %d, wanted %d: %v", action, resp.StatusCode, want, result["message"])
		}
		return result
	}
	call("question_catalogs", map[string]any{}, 401, false)
	catalogs := call("question_catalogs", map[string]any{}, 200, true)["data"].(map[string]any)
	if len(catalogs) != 6 {
		t.Fatalf("expected six catalogs, got %d", len(catalogs))
	}
	lookup := func(key, code string) string {
		t.Helper()
		for _, entry := range catalogs[key].(map[string]any)["options"].([]any) {
			option := entry.(map[string]any)
			if option["value"] == code {
				return option["id"].(string)
			}
		}
		t.Fatalf("missing %s:%s", key, code)
		return ""
	}
	for key := range catalogs {
		result := call("catalog_get", map[string]any{"key": key}, 200, true)
		if len(result["data"].(map[string]any)["options"].([]any)) == 0 {
			t.Fatal("empty catalog", key)
		}
	}
	marker := "HTTP question check " + sid
	input := map[string]any{"levelId": lookup("level", "L2"), "formatId": lookup("question_format", "theory"), "specialtyId": lookup("specialty", "MES"), "topicId": lookup("question_topic", "mes-isa95"), "targetGroupId": lookup("target_group", "all"), "cognitiveLevelId": lookup("cognitive_level", "application"), "content": marker, "type": "single_choice", "status": "draft", "options": []any{map[string]any{"id": "a", "text": "A", "isCorrect": true}, map[string]any{"id": "b", "text": "B", "isCorrect": false}}}
	// Cleanup only this test's uniquely named records, including failures partway through.
	defer db.Exec(`DELETE FROM "_QSTQuestion" WHERE "Content"=$1`, marker)
	result := call("question_save", input, 200, true)
	id := result["data"].(map[string]any)["id"].(string)
	row := call("question_get", map[string]any{"id": id}, 200, true)["data"].(map[string]any)
	if row["content"] != marker || row["levelName"] == nil || row["topicName"] == nil {
		t.Fatal("detail missing joined data")
	}
	listed := call("question_list", map[string]any{"search": marker, "filters": map[string]string{"topic": fmt.Sprint(row["topicName"])}, "sortField": "content", "sortAsc": true}, 200, true)
	if listed["meta"].(map[string]any)["total"] != float64(1) {
		t.Fatal("list filter failed")
	}
	input["id"] = id
	input["RowVersion"] = row["RowVersion"]
	call("question_save", input, 200, true)
	call("question_save", input, 409, true)
	delete(input, "id")
	delete(input, "RowVersion")
	bad := map[string]any{}
	for key, value := range input {
		bad[key] = value
	}
	bad["topicId"] = lookup("question_topic", "react-css")
	call("question_import", map[string]any{"questions": []any{input, bad}}, 400, true)
	var count int
	if err = db.Get(&count, `SELECT count(*) FROM "_QSTQuestion" WHERE "Content"=$1`, marker); err != nil || count != 1 {
		t.Fatal("failed import did not roll back atomically")
	}
}

func TestQuestionDatabaseReferences(t *testing.T) {
	_ = godotenv.Load("../../.env")
	if os.Getenv("POSTGRES_USER") == "" {
		t.Skip("PostgreSQL not configured")
	}
	port := os.Getenv("POSTGRES_PORT")
	if port == "" {
		port = "5432"
	}
	conn := &url.URL{Scheme: "postgres", User: url.UserPassword(os.Getenv("POSTGRES_USER"), os.Getenv("POSTGRES_PASSWORD")), Host: net.JoinHostPort("localhost", port), Path: "skillhub", RawQuery: "sslmode=disable"}
	db, err := sqlx.Connect("postgres", conn.String())
	if err != nil {
		t.Fatal("Cannot connect to configured PostgreSQL")
	}
	defer db.Close()
	ctx := context.Background()
	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	if _, err = tx.ExecContext(ctx, CatalogSchema); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.ExecContext(ctx, QuestionsSchema); err != nil {
		t.Fatal(err)
	}
	var u account
	if err = tx.QueryRowContext(ctx, `SELECT "Id","Email","Name","PasswordHash","Role" FROM "_USRAccountDirectory" WHERE "Role"='admin' AND "Enabled" LIMIT 1`).Scan(&u.ID, &u.Email, &u.Name, &u.Hash, &u.Role); err != nil {
		t.Fatal(err)
	}
	payload := map[string]any{"content": "Question reference integration check", "type": "single_choice", "status": "draft", "options": []any{map[string]any{"id": "a", "text": "A", "isCorrect": true}, map[string]any{"id": "b", "text": "B", "isCorrect": false}}}
	pairs := map[string][2]string{"levelId": {"level", "L2"}, "formatId": {"question_format", "theory"}, "specialtyId": {"specialty", "MES"}, "topicId": {"question_topic", "mes-isa95"}, "targetGroupId": {"target_group", "all"}, "cognitiveLevelId": {"cognitive_level", "application"}}
	for field, pair := range pairs {
		var id string
		if err = tx.GetContext(ctx, &id, `SELECT "IdSeq" FROM "_SYSCatalogOption" WHERE "CatalogKey"=$1 AND "Value"=$2`, pair[0], pair[1]); err != nil {
			t.Fatal(err)
		}
		if !validQuestionUUID(id) {
			t.Fatalf("%s not UUIDv7", field)
		}
		payload[field] = id
	}
	raw, _ := json.Marshal(payload)
	var input questionInput
	if err = json.Unmarshal(raw, &input); err != nil {
		t.Fatal(err)
	}
	s := &Server{DB: db}
	id, err := s.saveQuestion(ctx, tx, u, input)
	if err != nil {
		t.Fatal(err)
	}
	if !validQuestionUUID(id) {
		t.Fatal("question ID not UUIDv7")
	}
	var result []byte
	if err = tx.GetContext(ctx, &result, `SELECT `+questionJSON+` FROM "_QSTQuestionView" q WHERE q."IdSeq"=$1`, id); err != nil {
		t.Fatal(err)
	}
	var row map[string]any
	if err = json.Unmarshal(result, &row); err != nil {
		t.Fatal(err)
	}
	if row["topicName"] == nil || row["topicName"] == "" || row["levelId"] != input.LevelID {
		t.Fatal("joined names or UUID references missing")
	}
	if _, err = tx.ExecContext(ctx, `UPDATE "_SYSCatalogOption" SET "Label"='Updated topic label' WHERE "IdSeq"=$1`, input.TopicID); err != nil {
		t.Fatal(err)
	}
	var name string
	if err = tx.GetContext(ctx, &name, `SELECT "TopicName" FROM "_QSTQuestionView" WHERE "IdSeq"=$1`, id); err != nil || name != "Updated topic label" {
		t.Fatal("view did not resolve current catalog name")
	}
	wrong := input
	wrong.SpecialtyID = input.LevelID
	if _, err = s.saveQuestion(ctx, tx, u, wrong); err == nil {
		t.Fatal("accepted wrong catalog type")
	}
	var otherTopic string
	if err = tx.GetContext(ctx, &otherTopic, `SELECT "IdSeq" FROM "_SYSCatalogOption" WHERE "CatalogKey"='question_topic' AND "Value"='react-css'`); err != nil {
		t.Fatal(err)
	}
	wrong = input
	wrong.TopicID = otherTopic
	if _, err = s.saveQuestion(ctx, tx, u, wrong); err == nil {
		t.Fatal("accepted topic from another specialty")
	}
	var rv string
	if err = tx.GetContext(ctx, &rv, `SELECT "RowVersion"::text FROM "_QSTQuestion" WHERE "IdSeq"=$1`, id); err != nil {
		t.Fatal(err)
	}
	input.ID = id
	input.RowVersion = rv
	if _, err = s.saveQuestion(ctx, tx, u, input); err != nil {
		t.Fatal(err)
	}
	if _, err = s.saveQuestion(ctx, tx, u, input); status.Code(err) != codes.Aborted {
		t.Fatalf("stale update not rejected: %v", err)
	}
	// Everything, including schema changes and catalog label updates, is rolled back.
}
func TestCheckCurrentQuestionsDB(t *testing.T) {
	_ = godotenv.Load("../../.env")
	port := os.Getenv("POSTGRES_PORT")
	if port == "" {
		port = "5432"
	}
	conn := &url.URL{Scheme: "postgres", User: url.UserPassword(os.Getenv("POSTGRES_USER"), os.Getenv("POSTGRES_PASSWORD")), Host: net.JoinHostPort("localhost", port), Path: "skillhub", RawQuery: "sslmode=disable"}
	db, err := sqlx.Connect("postgres", conn.String())
	if err != nil {
		t.Fatal("Cannot connect to PostgreSQL", err)
	}
	defer db.Close()
	var qCount, fCount int
	_ = db.Get(&qCount, `SELECT count(*) FROM "_QSTQuestion"`)
	_ = db.Get(&fCount, `SELECT count(*) FROM "_QSTFolder"`)
	t.Logf("BEFORE SEEDING: _QSTQuestion count = %d, _QSTFolder count = %d", qCount, fCount)

	srv := &Server{DB: db}
	if _, err = db.Exec(QuestionsSchema); err != nil {
		t.Fatal("Exec QuestionsSchema failed:", err)
	}
	if err = srv.InitSampleQuestions(context.Background()); err != nil {
		t.Fatal("InitSampleQuestions failed:", err)
	}
	_ = db.Get(&qCount, `SELECT count(*) FROM "_QSTQuestion"`)
	_ = db.Get(&fCount, `SELECT count(*) FROM "_QSTFolder"`)
	t.Logf("AFTER SEEDING: _QSTQuestion count = %d, _QSTFolder count = %d", qCount, fCount)

	// Now let's test calling question_save with exact payload from frontend QuestionEditorPage:
	var userID string
	if err = db.Get(&userID, `SELECT "Id" FROM "_USRAccountDirectory" WHERE "Role"='admin' AND "Enabled" LIMIT 1`); err != nil {
		t.Fatal(err)
	}
	sid := uuid.Must(uuid.NewV7()).String()
	if _, err = db.Exec(`INSERT INTO "_USRSession"("Id","UserId","TokenHash","ExpiresAt","Ip","UserAgent") VALUES($1,$2,$3,now()+interval '5 minutes','127.0.0.1','QuestionHTTPIntegration')`, sid, userID, sid); err != nil {
		t.Fatal(err)
	}
	defer db.Exec(`DELETE FROM "_USRSession" WHERE "Id"=$1`, sid)
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": userID, "sid": sid, "iss": "skillhub", "aud": "skillhub-web", "exp": time.Now().Add(5 * time.Minute).Unix(), "iat": time.Now().Unix()}).SignedString([]byte(os.Getenv("SKILLHUB_JWT_SECRET")))
	if err != nil {
		t.Fatal(err)
	}

	// 1. Test question_catalogs
	catReq, _ := http.NewRequest(http.MethodPost, "http://127.0.0.1:8081/api/auth/question_catalogs", bytes.NewReader([]byte(`{"payload":{}}`)))
	catReq.Header.Set("Content-Type", "application/json")
	catReq.Header.Set("Origin", "http://localhost:5173")
	catReq.Header.Set("Authorization", "Bearer "+token)
	client := &http.Client{Timeout: 5 * time.Second}
	catResp, err := client.Do(catReq)
	if err != nil {
		t.Fatal(err)
	}
	defer catResp.Body.Close()
	var catData map[string]any
	json.NewDecoder(catResp.Body).Decode(&catData)
	t.Logf("question_catalogs status = %d, response = %+v", catResp.StatusCode, catData)
	if catResp.StatusCode != 200 {
		t.Fatalf("question_catalogs failed: %+v", catData)
	}

	// Extract IDs from catData
	dataMap := catData["data"].(map[string]any)
	findID := func(catKey, code string) string {
		cat := dataMap[catKey].(map[string]any)
		opts := cat["options"].([]any)
		for _, o := range opts {
			om := o.(map[string]any)
			if om["value"] == code {
				return om["id"].(string)
			}
		}
		return ""
	}

	// 2. Test saving a question like frontend QuestionEditorPage
	frontendPayload := map[string]any{
		"payload": map[string]any{
			"levelId":          findID("level", "L2"),
			"formatId":         findID("question_format", "theory"),
			"specialtyId":      findID("specialty", "MES"),
			"topicId":          findID("question_topic", "mes-isa95"),
			"targetGroupId":    findID("target_group", "all"),
			"cognitiveLevelId": findID("cognitive_level", "application"),
			"folderId":         "",
			"content":          "Thực hành kiểm tra quy trình ISA-95 cấp độ 3",
			"explanation":      "Giải thích chi tiết",
			"type":             "single_choice",
			"isCritical":       false,
			"criticalReason":   "",
			"simulationType":   "dispatch",
			"options": []any{
				map[string]any{"id": "1", "text": "Phương án A", "isCorrect": true},
				map[string]any{"id": "2", "text": "Phương án B", "isCorrect": false},
				map[string]any{"id": "3", "text": "Phương án C", "isCorrect": false},
				map[string]any{"id": "4", "text": "Phương án D", "isCorrect": false},
			},
			"rubrics": []any{},
			"status":  "draft",
		},
	}
	body, _ := json.Marshal(frontendPayload)
	saveReq, _ := http.NewRequest(http.MethodPost, "http://127.0.0.1:8081/api/auth/question_save", bytes.NewReader(body))
	saveReq.Header.Set("Content-Type", "application/json")
	saveReq.Header.Set("Origin", "http://localhost:5173")
	saveReq.Header.Set("Authorization", "Bearer "+token)
	saveResp, err := client.Do(saveReq)
	if err != nil {
		t.Fatal(err)
	}
	defer saveResp.Body.Close()
	var saveResult map[string]any
	json.NewDecoder(saveResp.Body).Decode(&saveResult)
	t.Logf("frontend question_save status = %d, result = %+v", saveResp.StatusCode, saveResult)

	// Clean up created question
	if saveResp.StatusCode == 200 {
		data := saveResult["data"].(map[string]any)
		id := data["id"].(string)
		t.Logf("Successfully created question ID = %s", id)
		db.Exec(`DELETE FROM "_QSTQuestion" WHERE "IdSeq"=$1`, id)
	}

	// 3. Test creating a folder like QuestionListPage handleCreateFolder
	folderPayload := map[string]any{
		"payload": map[string]any{
			"name":        "Thư mục Test ISA-95",
			"levelId":     findID("level", "All"),
			"description": "Mô tả thư mục",
		},
	}
	fBody, _ := json.Marshal(folderPayload)
	fReq, _ := http.NewRequest(http.MethodPost, "http://127.0.0.1:8081/api/auth/question_folder_save", bytes.NewReader(fBody))
	fReq.Header.Set("Content-Type", "application/json")
	fReq.Header.Set("Origin", "http://localhost:5173")
	fReq.Header.Set("Authorization", "Bearer "+token)
	fResp, err := client.Do(fReq)
	if err != nil {
		t.Fatal(err)
	}
	defer fResp.Body.Close()
	var fResult map[string]any
	json.NewDecoder(fResp.Body).Decode(&fResult)
	t.Logf("frontend question_folder_save status = %d, result = %+v", fResp.StatusCode, fResult)
	if fResp.StatusCode == 200 {
		data := fResult["data"].(map[string]any)
		fId := data["id"].(string)
		t.Logf("Successfully created folder ID = %s", fId)
		db.Exec(`DELETE FROM "_QSTFolder" WHERE "IdSeq"=$1`, fId)
	}

	// 4. Test question_folder_list
	fListReq, _ := http.NewRequest(http.MethodPost, "http://127.0.0.1:8081/api/auth/question_folder_list", bytes.NewReader([]byte(`{"payload":{"search":""}}`)))
	fListReq.Header.Set("Content-Type", "application/json")
	fListReq.Header.Set("Origin", "http://localhost:5173")
	fListReq.Header.Set("Authorization", "Bearer "+token)
	fListResp, err := client.Do(fListReq)
	if err != nil {
		t.Fatal(err)
	}
	defer fListResp.Body.Close()
	var fListData map[string]any
	json.NewDecoder(fListResp.Body).Decode(&fListData)
	fListItems := fListData["data"].([]any)
	t.Logf("question_folder_list status = %d, returned %d folders", fListResp.StatusCode, len(fListItems))
	if len(fListItems) < 6 {
		t.Fatalf("expected at least 6 folders, got %d", len(fListItems))
	}

	// 5. Test question_list
	qListReq, _ := http.NewRequest(http.MethodPost, "http://127.0.0.1:8081/api/auth/question_list", bytes.NewReader([]byte(`{"payload":{"search":"","page":1,"pageSize":50}}`)))
	qListReq.Header.Set("Content-Type", "application/json")
	qListReq.Header.Set("Origin", "http://localhost:5173")
	qListReq.Header.Set("Authorization", "Bearer "+token)
	qListResp, err := client.Do(qListReq)
	if err != nil {
		t.Fatal(err)
	}
	defer qListResp.Body.Close()
	var qListData map[string]any
	json.NewDecoder(qListResp.Body).Decode(&qListData)
	qListItems := qListData["data"].([]any)
	t.Logf("question_list status = %d, returned %d questions", qListResp.StatusCode, len(qListItems))
	if len(qListItems) < 15 {
		t.Fatalf("expected at least 15 questions, got %d", len(qListItems))
	}

	for _, fi := range fListItems {
		fMap := fi.(map[string]any)
		fId := fMap["id"].(string)
		fName := fMap["name"].(string)
		fCount := fMap["questionCount"]

		qFolderReq, _ := http.NewRequest(http.MethodPost, "http://127.0.0.1:8081/api/auth/question_list", bytes.NewReader([]byte(fmt.Sprintf(`{"payload":{"folderId":"%s","page":1,"pageSize":50}}`, fId))))
		qFolderReq.Header.Set("Content-Type", "application/json")
		qFolderReq.Header.Set("Origin", "http://localhost:5173")
		qFolderReq.Header.Set("Authorization", "Bearer "+token)
		qFolderResp, _ := client.Do(qFolderReq)
		var qFData map[string]any
		json.NewDecoder(qFolderResp.Body).Decode(&qFData)
		qFolderResp.Body.Close()
		items := qFData["data"].([]any)
		t.Logf("Folder %s (ID %s): folder_list questionCount=%v, question_list returned %d items", fName, fId, fCount, len(items))
	}
}
