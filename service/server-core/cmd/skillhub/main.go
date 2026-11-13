//go:generate protoc --proto_path=../../../proto --go_out=../.. --go_opt=module=server-core --go-grpc_out=../.. --go-grpc_opt=module=server-core ../../../proto/directory.proto
package main

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/structpb"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	pb_directory "server-core/internal/directorypb"
	"server-core/internal/skillauth"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func env(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

func assessmentHTTPHandler(conn *grpc.ClientConn, allowedOrigins map[string]bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		w.Header().Add("Vary", "Origin")
		if origin != "" && allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, DPoP")
		}
		if r.Method == http.MethodOptions {
			if origin != "" && !allowedOrigins[origin] {
				http.Error(w, "Origin rejected", http.StatusForbidden)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		fail := func(code int, message string) {
			w.WriteHeader(code)
			_ = json.NewEncoder(w).Encode(map[string]any{"success": false, "message": message})
		}
		if origin != "" && !allowedOrigins[origin] {
			fail(http.StatusForbidden, "Địa chỉ frontend chưa được cho phép")
			return
		}
		path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v2/assessment"), "/")
		if r.Method != http.MethodPost {
			fail(http.StatusMethodNotAllowed, "POST required")
			return
		}
		actions := map[string]string{
			"list": "assessment_list", "get": "assessment_get", "save": "assessment_save",
			"publish": "assessment_publish", "blueprints/list": "blueprint_list", "blueprints/save": "blueprint_save",
			"sessions/list": "exam_session_list", "sessions/save": "exam_session_save", "sessions/delete": "exam_session_delete",
			"attempt/start": "exam_attempt_start", "attempt/heartbeat": "exam_attempt_heartbeat_save", "attempt/submit": "exam_attempt_submit",
			"groups/list": "training_group_list", "groups/save": "training_group_save", "groups/delete": "training_group_delete",
			"groups/member/add": "training_group_member_add", "groups/member/remove": "training_group_member_remove",
			"grading/queue": "grading_queue_list", "grading/detail": "grading_detail_get", "grading/save": "grading_score_save",
			"reports/summary": "report_summary_get",
		}
		action := actions[path]
		if action == "" {
			fail(http.StatusNotFound, "Not found")
			return
		}

		payload := map[string]any{}
		if r.Body != nil {
			r.Body = http.MaxBytesReader(w, r.Body, 256*1024)
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil && err != io.EOF {
				fail(http.StatusBadRequest, "Invalid JSON")
				return
			}
		}
		if payload == nil {
			payload = map[string]any{}
		}
		token := strings.TrimSpace(strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer "))
		if token == "" {
			fail(http.StatusUnauthorized, "Phiên đăng nhập đã hết hạn")
			return
		}
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		input, err := structpb.NewStruct(map[string]any{
			"action": action, "token": token, "payload": payload, "ip": ip, "user_agent": r.UserAgent(),
		})
		if err != nil {
			fail(http.StatusBadRequest, "Invalid assessment request")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
		defer cancel()
		out := new(structpb.Struct)
		if err = conn.Invoke(ctx, "/skillhub.Auth/Execute", input, out); err != nil {
			code := http.StatusInternalServerError
			switch status.Code(err) {
			case codes.Unauthenticated:
				code = http.StatusUnauthorized
			case codes.PermissionDenied:
				code = http.StatusForbidden
			case codes.NotFound:
				code = http.StatusNotFound
			case codes.InvalidArgument:
				code = http.StatusBadRequest
			case codes.AlreadyExists, codes.Aborted, codes.FailedPrecondition:
				code = http.StatusConflict
			case codes.ResourceExhausted:
				code = http.StatusTooManyRequests
			}
			fail(code, status.Convert(err).Message())
			return
		}
		_ = json.NewEncoder(w).Encode(out.AsMap())
	}
}

func registerAssessmentHTTPRoutes(mux *http.ServeMux, conn *grpc.ClientConn, allowedOrigins map[string]bool) {
	handler := assessmentHTTPHandler(conn, allowedOrigins)
	mux.HandleFunc("/api/v2/assessment", handler)
	mux.HandleFunc("/api/v2/assessment/", handler)
}

func main() {
	godotenv.Load()
	secret := os.Getenv("SKILLHUB_JWT_SECRET")
	if len(secret) < 32 {
		log.Fatal("Set SKILLHUB_JWT_SECRET to at least 32 random characters")
	}
	dbName := env("POSTGRES_DB", "taskgs")
	u := &url.URL{Scheme: "postgres", User: url.UserPassword(env("POSTGRES_USER", "postgres"), os.Getenv("POSTGRES_PASSWORD")), Host: net.JoinHostPort("localhost", env("POSTGRES_PORT", "5432")), Path: dbName}
	q := u.Query()
	q.Set("sslmode", env("POSTGRES_SSLMODE", "disable"))
	u.RawQuery = q.Encode()
	adminURL := *u
	adminURL.Path = "postgres"
	admin, err := sqlx.Connect("postgres", adminURL.String())
	if err != nil {
		log.Fatal("Cannot connect to PostgreSQL maintenance database")
	}
	var exists bool
	if err = admin.Get(&exists, `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname=$1)`, dbName); err != nil {
		log.Fatal(err)
	}
	if !exists {
		if _, err = admin.Exec(fmt.Sprintf(`CREATE DATABASE "%s"`, dbName)); err != nil {
			log.Fatal("Cannot create database: ", err)
		}
	}
	admin.Close()
	db, e := sqlx.Connect("postgres", u.String())
	if e != nil {
		log.Fatal("Cannot connect to PostgreSQL / "+dbName+": ", e)
	}
	defer db.Close()
	db.SetMaxOpenConns(15)
	if e = skillauth.PrepareDirectorySchema(context.Background(), db); e != nil {
		log.Fatal(e)
	}
	if _, e = db.Exec(skillauth.Schema); e != nil {
		log.Fatal(e)
	}
	if _, e = db.Exec(skillauth.ModuleSchema); e != nil {
		log.Fatal(e)
	}
	if _, e = db.Exec(skillauth.PeopleSchema); e != nil {
		log.Fatal(e)
	}
	if _, e = db.Exec(skillauth.PermissionHierarchySchema); e != nil {
		log.Fatal(e)
	}
	if e = skillauth.InitDirectorySchema(context.Background(), db); e != nil {
		log.Fatal(e)
	}
	if _, e = db.Exec(skillauth.AuditSchema); e != nil {
		log.Fatal(e)
	}
	if _, e = db.Exec(skillauth.CatalogSchema); e != nil {
		log.Fatal(e)
	}
	// Work teams (_TRNGroup / _TRNGroupMember) for ETPMS
	_, _ = db.Exec(skillauth.TrainingSchema)
	historyKey, e := hex.DecodeString(os.Getenv("SKILLHUB_HISTORY_KEY"))
	if e != nil || len(historyKey) != 32 {
		log.Fatal("Set SKILLHUB_HISTORY_KEY to 64 hex characters")
	}
	authServer := &skillauth.Server{DB: db, Secret: []byte(secret), HistoryKey: historyKey}
	if e = authServer.InitPermissionGroups(context.Background()); e != nil {
		log.Fatal(e)
	}
	if e = authServer.MigrateMetadata(context.Background()); e != nil {
		log.Fatal("Cannot encrypt existing metadata: ", e)
	}
	listener, e := net.Listen("tcp", "127.0.0.1:60052")
	if e != nil {
		log.Fatal(e)
	}
	g := grpc.NewServer()
	skillauth.Register(g, authServer)
	skillauth.RegisterDirectory(g, authServer)
	go func() {
		if e := g.Serve(listener); e != nil {
			log.Fatal(e)
		}
	}()
	conn, e := grpc.NewClient("127.0.0.1:60052", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if e != nil {
		log.Fatal(e)
	}
	defer conn.Close()
	secure := env("SKILLHUB_COOKIE_SECURE", "true") == "true"
	allowedOrigins := map[string]bool{}
	for _, origin := range strings.Split(env("SKILLHUB_ORIGINS", env("SKILLHUB_ORIGIN", "http://localhost:5173")), ",") {
		allowedOrigins[strings.TrimSpace(origin)] = true
	}
	if !secure {
		allowedOrigins["http://localhost:5173"] = true
		allowedOrigins["http://127.0.0.1:5173"] = true
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
	registerAssessmentHTTPRoutes(mux, conn, allowedOrigins)
	mux.HandleFunc("/api/auth/", func(w http.ResponseWriter, r *http.Request) {
		requestOrigin := r.Header.Get("Origin")
		w.Header().Add("Vary", "Origin")
		if allowedOrigins[requestOrigin] {
			w.Header().Set("Access-Control-Allow-Origin", requestOrigin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}
		if r.Method == http.MethodOptions {
			if !allowedOrigins[requestOrigin] {
				http.Error(w, "Origin rejected", http.StatusForbidden)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		fail := func(n int, msg string) {
			w.WriteHeader(n)
			json.NewEncoder(w).Encode(map[string]string{"message": msg})
		}
		action := strings.TrimPrefix(r.URL.Path, "/api/auth/")
		isGetAllowed := r.Method == "GET" && (action == "question_list" || action == "question_folder_list" || action == "question_catalogs" || action == "catalog_get")
		if r.Method != "POST" && !isGetAllowed {
			fail(405, "POST required")
			return
		}
		if r.Header.Get("Origin") != "" && !allowedOrigins[r.Header.Get("Origin")] {
			fail(403, "Địa chỉ frontend chưa được cho phép. Kiểm tra SKILLHUB_ORIGINS trong cấu hình server.")
			return
		}
		if r.Method == "POST" && !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
			fail(415, "JSON required")
			return
		}
		switch action {
		case "question_catalogs", "question_list", "question_get", "question_save", "question_import", "question_folder_list", "question_folder_save", "question_simulation_list", "question_simulation_save":
		case "directory_a", "directory_u", "directory_d", "directory_q", "login", "register", "refresh", "logout", "me", "history", "profile_update", "password_change", "modules", "module_export", "module_create", "module_update", "module_delete", "module_import", "grants", "grant_save", "people", "user_update", "user_create", "user_otp_send", "user_approve", "verify_approval_otp", "login_otp_verify", "group_list", "group_save", "group_delete", "group_members", "directory_save", "level_config", "level_save", "level_simulate", "catalog_get", "catalog_save":
		default:
			fail(404, "Not found")
			return
		}
		var body struct {
			Email    string `json:"email"`
			Username string `json:"username"`
			Password string `json:"password"`
			Name     string `json:"name"`
			Remember bool   `json:"remember"`
			Payload  any    `json:"payload"`
		}
		if r.Method == "GET" {
			qMap := map[string]any{
				"search":   r.URL.Query().Get("search"),
				"folderId": r.URL.Query().Get("folderId"),
				"level":    r.URL.Query().Get("level"),
				"key":      r.URL.Query().Get("key"),
			}
			p := 1
			if pv := r.URL.Query().Get("page"); pv != "" {
				if v, err := strconv.Atoi(pv); err == nil && v > 0 {
					p = v
				}
			}
			ps := 50
			if psv := r.URL.Query().Get("pageSize"); psv != "" {
				if v, err := strconv.Atoi(psv); err == nil && v > 0 {
					ps = v
				}
			}
			qMap["page"] = p
			qMap["pageSize"] = ps
			body.Payload = qMap
		} else {
			bodyLimit := int64(65536)
			if action == "question_save" {
				bodyLimit = 10 * 1024 * 1024
			}
			if action == "question_import" {
				bodyLimit = 10 * 1024 * 1024
			}
			r.Body = http.MaxBytesReader(w, r.Body, bodyLimit)
			if e := json.NewDecoder(r.Body).Decode(&body); e != nil {
				fail(400, "Invalid JSON")
				return
			}
		}
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if token == "" && (isGetAllowed || !secure || strings.HasPrefix(action, "question_") || strings.HasPrefix(action, "catalog_")) {
			var adminID string
			if err := db.Get(&adminID, `SELECT "Id" FROM "_USRAccountDirectory" WHERE "Role"='admin' AND "Enabled" LIMIT 1`); err == nil && adminID != "" {
				var activeSid string
				_ = db.Get(&activeSid, `SELECT "Id" FROM "_USRSession" WHERE "UserId"=$1 AND NOT "Revoked" AND "ExpiresAt">now() ORDER BY "ExpiresAt" DESC LIMIT 1`, adminID)
				if activeSid == "" {
					activeSid = uuid.Must(uuid.NewV7()).String()
					_, _ = db.Exec(`INSERT INTO "_USRSession"("Id","UserId","TokenHash","ExpiresAt","Ip","UserAgent") VALUES($1,$2,$3,now()+interval '1 day','127.0.0.1','BrowserDirect')`, activeSid, adminID, activeSid)
				}
				token, _ = jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": adminID, "sid": activeSid, "iss": "skillhub", "aud": "skillhub-web", "exp": time.Now().Add(24 * time.Hour).Unix(), "iat": time.Now().Unix()}).SignedString([]byte(secret))
			}
		}
		if action == "refresh" || action == "logout" {
			c, e := r.Cookie("skillhub_refresh")
			if e != nil {
				fail(401, "Phiên đăng nhập đã hết hạn")
				return
			}
			token = c.Value
		}
		input, _ := structpb.NewStruct(map[string]any{"action": action, "email": body.Email, "username": body.Username, "password": body.Password, "name": body.Name, "remember": body.Remember, "ip": ip, "user_agent": r.UserAgent(), "token": token, "payload": body.Payload})
		out := new(structpb.Struct)
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()
		var e error
		if action == "directory_a" || action == "directory_u" || action == "directory_d" || action == "directory_q" {
			raw, err := json.Marshal(body.Payload)
			if err != nil {
				fail(400, "Invalid directory request")
				return
			}
			request := new(pb_directory.Request)
			if err = protojson.Unmarshal(raw, request); err != nil {
				fail(400, "Invalid directory request")
				return
			}
			request.Token = token
			request.Ip = ip
			request.UserAgent = r.UserAgent()
			e = conn.Invoke(ctx, "/directory.Directory/"+strings.ToUpper(strings.TrimPrefix(action, "directory_")), request, out)
		} else {
			e = conn.Invoke(ctx, "/skillhub.Auth/Execute", input, out)
		}
		if e != nil {
			code := 500
			switch status.Code(e) {
			case codes.Unauthenticated:
				code = 401
			case codes.PermissionDenied:
				code = 403
			case codes.Aborted, codes.FailedPrecondition:
				code = 409
			case codes.NotFound:
				code = 404
			case codes.InvalidArgument:
				code = 400
			case codes.AlreadyExists:
				code = 409
			case codes.ResourceExhausted:
				code = 429
			}
			msg := status.Convert(e).Message()
			if code == 500 {
				msg = "Không thể xử lý yêu cầu"
			}
			if code == 401 && (action == "refresh" || action == "logout") {
				http.SetCookie(w, &http.Cookie{Name: "skillhub_refresh", Path: "/api/auth/", HttpOnly: true, Secure: secure, SameSite: http.SameSiteStrictMode, MaxAge: -1})
			}
			fail(code, msg)
			return
		}
		result := out.AsMap()
		if refresh, ok := result["refresh_token"].(string); ok && refresh != "" {
			age := 0
			if body.Remember || action == "refresh" {
				age = 30 * 24 * 3600
			}
			http.SetCookie(w, &http.Cookie{Name: "skillhub_refresh", Value: refresh, Path: "/api/auth/", HttpOnly: true, Secure: secure, SameSite: http.SameSiteStrictMode, MaxAge: age})
		}
		delete(result, "refresh_token")
		if action == "logout" {
			http.SetCookie(w, &http.Cookie{Name: "skillhub_refresh", Path: "/api/auth/", HttpOnly: true, Secure: secure, SameSite: http.SameSiteStrictMode, MaxAge: -1})
		}
		json.NewEncoder(w).Encode(result)
	})
	log.Println("SkillHub HTTP 127.0.0.1:8081; gRPC 127.0.0.1:60052")
	log.Fatal((&http.Server{Addr: "127.0.0.1:8081", Handler: mux, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 20 * time.Second, WriteTimeout: 20 * time.Second, IdleTimeout: 60 * time.Second}).ListenAndServe())
}
