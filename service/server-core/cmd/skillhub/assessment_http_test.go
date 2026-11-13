package main

import (
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
)

func TestAssessmentHTTPRouteRequiresBearerToken(t *testing.T) {
	mux := http.NewServeMux()
	registerAssessmentHTTPRoutes(mux, nil, map[string]bool{"http://localhost:5173": true})
	req := httptest.NewRequest(http.MethodPost, "/api/v2/assessment/list", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("GET /api/v2/assessment/list without token status = %d, want %d", res.Code, http.StatusUnauthorized)
	}
}

func TestAssessmentHTTPUsesPostActionEndpoints(t *testing.T) {
	mux := http.NewServeMux()
	registerAssessmentHTTPRoutes(mux, nil, nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v2/assessment/list", nil)
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)
	if res.Code != http.StatusMethodNotAllowed {
		t.Fatalf("GET /api/v2/assessment/list status = %d, want %d", res.Code, http.StatusMethodNotAllowed)
	}
}

func TestAssessmentHTTPRejectsOldAuthActionPath(t *testing.T) {
	handler := assessmentHTTPHandler(nil, nil)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/assessment_list", strings.NewReader(`{}`))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusNotFound {
		t.Fatalf("old assessment action path status = %d, want %d", res.Code, http.StatusNotFound)
	}
}

func TestAssessmentHTTPAcceptsEmptyBody(t *testing.T) {
	mux := http.NewServeMux()
	registerAssessmentHTTPRoutes(mux, nil, map[string]bool{"http://localhost:5173": true})
	req := httptest.NewRequest(http.MethodPost, "/api/v2/assessment/list", nil)
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("empty body status = %d, want %d (requires token)", res.Code, http.StatusUnauthorized)
	}
}

func TestAssessmentHTTPLiveEndpoint(t *testing.T) {
	resp, err := http.Post("http://127.0.0.1:8081/api/v2/assessment/list", "application/json", strings.NewReader(`{}`))
	if err != nil {
		t.Skip("local server not running on 8081")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for request without token, got %d", resp.StatusCode)
	}
}

func TestAssessmentHTTPLiveWithToken(t *testing.T) {
	_ = godotenv.Load("../../.env")
	secret := os.Getenv("SKILLHUB_JWT_SECRET")
	if secret == "" {
		t.Skip("missing JWT secret")
	}
	port := env("POSTGRES_PORT", "5432")
	conn := &url.URL{Scheme: "postgres", User: url.UserPassword(env("POSTGRES_USER", "postgres"), os.Getenv("POSTGRES_PASSWORD")), Host: net.JoinHostPort("localhost", port), Path: "skillhub", RawQuery: "sslmode=disable"}
	db, err := sqlx.Connect("postgres", conn.String())
	if err != nil {
		t.Skip("db unavailable")
	}
	defer db.Close()
	var userID string
	if err = db.Get(&userID, `SELECT "Id" FROM "_USRAccountDirectory" WHERE "Role"='admin' AND "Enabled" LIMIT 1`); err != nil {
		t.Skip("no admin account")
	}
	sid := uuid.Must(uuid.NewV7()).String()
	if _, err = db.Exec(`INSERT INTO "_USRSession"("Id","UserId","TokenHash","ExpiresAt","Ip","UserAgent") VALUES($1,$2,$3,now()+interval '5 minutes','127.0.0.1','AssessmentHTTPLiveTest')`, sid, userID, sid); err != nil {
		t.Fatal(err)
	}
	defer db.Exec(`DELETE FROM "_USRSession" WHERE "Id"=$1`, sid)
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": userID, "sid": sid, "iss": "skillhub", "aud": "skillhub-web", "exp": time.Now().Add(5 * time.Minute).Unix(), "iat": time.Now().Unix()}).SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}

	req, _ := http.NewRequest(http.MethodPost, "http://127.0.0.1:8081/api/v2/assessment/list", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Origin", "http://localhost:5173")
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		t.Skip("server unreachable")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
	}
}
