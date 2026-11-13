package skillauth

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"net"
	"net/url"
	"os"
	"strings"
	"testing"
)

func TestTrainingCatalogAccessIsolation(t *testing.T) {
	_ = godotenv.Load("../../.env")
	if os.Getenv("POSTGRES_USER") == "" {
		t.Skip("PostgreSQL not configured")
	}
	port := os.Getenv("POSTGRES_PORT")
	if port == "" {
		port = "5432"
	}
	conn := &url.URL{Scheme: "postgres", User: url.UserPassword(os.Getenv("POSTGRES_USER"), os.Getenv("POSTGRES_PASSWORD")), Host: net.JoinHostPort("localhost", port), Path: "skillhub", RawQuery: "sslmode=disable"}
	admin, err := sqlx.Connect("postgres", conn.String())
	if err != nil {
		t.Fatal("Cannot connect to configured PostgreSQL")
	}
	defer admin.Close()
	schema := "catalog_scope_" + strings.ReplaceAll(uuid.Must(uuid.NewV7()).String(), "-", "")
	if _, err = admin.Exec(fmt.Sprintf(`CREATE SCHEMA %q`, schema)); err != nil {
		t.Fatal(err)
	}
	defer admin.Exec(fmt.Sprintf(`DROP SCHEMA %q CASCADE`, schema))
	for _, table := range []string{"_SECPermissionDirectory", "_SECAccountPermission", "_SECGroupDirectory", "_SECGroupPermission", "_SECGroupMember", "_SECAuditLog"} {
		if _, err = admin.Exec(fmt.Sprintf(`CREATE TABLE %q.%q AS SELECT * FROM public.%q WHERE false`, schema, table, table)); err != nil {
			t.Fatal(err)
		}
	}
	if _, err = admin.Exec(fmt.Sprintf(`INSERT INTO %q."_SECPermissionDirectory" SELECT * FROM public."_SECPermissionDirectory"`, schema)); err != nil {
		t.Fatal(err)
	}
	query := conn.Query()
	query.Set("search_path", schema+",public")
	conn.RawQuery = query.Encode()
	db, err := sqlx.Connect("postgres", conn.String())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	var activeSchema string
	if err = db.Get(&activeSchema, `SELECT current_schema()`); err != nil || activeSchema != schema {
		t.Fatal("test connection is not isolated in its generated schema")
	}
	if _, err = db.Exec(CatalogSchema); err != nil {
		t.Fatal(err)
	}
	var actorID string
	if err = db.Get(&actorID, `SELECT "Id" FROM public."_USRAccountDirectory" WHERE "Enabled" LIMIT 1`); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(fmt.Sprintf(`INSERT INTO %q."_SECAccountPermission"("UserId","ModuleKey","Action") VALUES($1,'questions','view'),($1,'questions','create')`, schema), actorID); err != nil {
		t.Fatal(err)
	}
	s := &Server{DB: db}
	author := account{ID: actorID, Role: "author"}
	ctx := context.Background()
	if s.allowed(ctx, author, "catalog:view") || s.allowed(ctx, author, "catalog:update") {
		t.Fatal("test author unexpectedly has system catalog privileges")
	}
	result, err := s.catalogAction(ctx, author, "catalog_get", map[string]any{"key": "specialty"})
	if err != nil {
		t.Fatal("author cannot read training catalog", err)
	}
	data := result.AsMap()["data"].(map[string]any)
	options := data["options"].([]any)
	options = append(options, map[string]any{"value": "CUSTOM_TEST", "label": "Chuyên môn tự đăng ký", "active": true})
	saved, err := s.catalogAction(ctx, author, "catalog_save", map[string]any{"key": "specialty", "label": data["label"], "options": options})
	if err != nil {
		t.Fatal("author cannot register own specialty", err)
	}
	var parentID string
	for _, item := range saved.AsMap()["data"].(map[string]any)["options"].([]any) {
		option := item.(map[string]any)
		if option["value"] == "CUSTOM_TEST" {
			parentID = option["id"].(string)
		}
	}
	if !validQuestionUUID(parentID) {
		t.Fatal("registered specialty missing UUIDv7")
	}
	topics, err := s.catalogAction(ctx, author, "catalog_get", map[string]any{"key": "question_topic"})
	if err != nil {
		t.Fatal(err)
	}
	topicData := topics.AsMap()["data"].(map[string]any)
	topicOptions := append(topicData["options"].([]any), map[string]any{"value": "CUSTOM_TOPIC", "label": "Chủ đề tự đăng ký", "active": true, "parentId": parentID})
	if _, err = s.catalogAction(ctx, author, "catalog_save", map[string]any{"key": "question_topic", "label": topicData["label"], "options": topicOptions}); err != nil {
		t.Fatal("author cannot register topic", err)
	}
	if _, err = s.questionAction(ctx, author, "question_catalogs", map[string]any{}); err != nil {
		t.Fatal("new catalogs unavailable to question form", err)
	}
	for _, action := range []string{"catalog_get", "catalog_save"} {
		if _, err = s.catalogAction(ctx, author, action, map[string]any{"key": "rank"}); status.Code(err) != codes.PermissionDenied {
			t.Fatal("training author could access system catalog", action, err)
		}
	}
	viewer := account{ID: uuid.Must(uuid.NewV7()).String(), Role: "author"}
	if _, err = db.Exec(fmt.Sprintf(`INSERT INTO %q."_SECAccountPermission"("UserId","ModuleKey","Action") VALUES($1,'questions','view')`, schema), viewer.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = s.catalogAction(ctx, viewer, "catalog_save", map[string]any{"key": "specialty"}); status.Code(err) != codes.PermissionDenied {
		t.Fatal("view-only user could edit settings", err)
	}
	if _, err = s.catalogAction(ctx, viewer, "catalog_get", map[string]any{"key": "specialty"}); err != nil {
		t.Fatal("viewer cannot read settings", err)
	}
}
