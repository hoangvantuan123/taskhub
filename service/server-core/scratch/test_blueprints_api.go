package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	_ = godotenv.Load(".env")
	user := os.Getenv("POSTGRES_USER")
	pass := os.Getenv("POSTGRES_PASSWORD")
	port := os.Getenv("POSTGRES_PORT")
	if port == "" {
		port = "5432"
	}
	dbName := os.Getenv("POSTGRES_DB")
	if dbName == "" {
		dbName = "skillhub"
	}
	secret := os.Getenv("SKILLHUB_JWT_SECRET")
	if secret == "" {
		secret = os.Getenv("JWT_SECRET")
	}

	conn := &url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(user, pass),
		Host:     net.JoinHostPort("localhost", port),
		Path:     dbName,
		RawQuery: "sslmode=disable",
	}

	db, err := sqlx.Connect("postgres", conn.String())
	if err != nil {
		log.Fatalf("Lỗi kết nối DB: %v\n", err)
	}
	defer db.Close()

	var adminID string
	err = db.Get(&adminID, `SELECT "Id" FROM "_USRAccountDirectory" WHERE "Role"='admin' AND "Enabled" LIMIT 1`)
	if err != nil {
		log.Fatalf("Không tìm thấy admin: %v\n", err)
	}

	sid := uuid.Must(uuid.NewV7()).String()
	_, _ = db.Exec(`INSERT INTO "_USRSession"("Id","UserId","TokenHash","ExpiresAt","Ip","UserAgent") VALUES($1,$2,$3,now()+interval '1 day','127.0.0.1','TestRunner')`, sid, adminID, sid)

	token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": adminID,
		"sid": sid,
		"iss": "skillhub",
		"aud": "skillhub-web",
		"exp": time.Now().Add(24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	}).SignedString([]byte(secret))

	fmt.Println("====================================================")
	fmt.Println("🧪 KIỂM TRA API ROUTE /api/v2/assessment/blueprints/list & save")
	fmt.Println("====================================================")

	client := &http.Client{Timeout: 5 * time.Second}

	// 1. Kiểm tra list
	reqBody, _ := json.Marshal(map[string]any{"mode": "exam"})
	req, _ := http.NewRequest("POST", "http://127.0.0.1:8081/api/v2/assessment/blueprints/list", bytes.NewBuffer(reqBody))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Lỗi kết nối HTTP: %v\n", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("✅ [1] API blueprints/list: HTTP %d | Data: %s\n", resp.StatusCode, string(body))

	// 2. Kiểm tra save với scope toàn cục (global) và distribution hợp lệ
	savePayload := map[string]any{
		"mode":  "exam",
		"scope": map[string]any{},
		"config": map[string]any{
			"totalQuestions":    40,
			"durationMinutes":   45,
			"passingPercentage": 75,
			"distribution": map[string]int{
				"l0": 6,
				"l1": 14,
				"l2": 12,
				"l3": 8,
			},
			"criticalCount":       3,
			"simulationQuestions": 5,
			"maxAttempts":         1,
		},
	}
	saveBody, _ := json.Marshal(savePayload)
	reqSave, _ := http.NewRequest("POST", "http://127.0.0.1:8081/api/v2/assessment/blueprints/save", bytes.NewBuffer(saveBody))
	reqSave.Header.Set("Authorization", "Bearer "+token)
	reqSave.Header.Set("Content-Type", "application/json")

	respSave, err := client.Do(reqSave)
	if err != nil {
		log.Fatalf("Lỗi gọi save: %v\n", err)
	}
	defer respSave.Body.Close()
	bodySave, _ := io.ReadAll(respSave.Body)
	fmt.Printf("✅ [2] API blueprints/save: HTTP %d | Data: %s\n", respSave.StatusCode, string(bodySave))

	// 3. Kiểm tra list lại để thấy dữ liệu vừa lưu
	req2, _ := http.NewRequest("POST", "http://127.0.0.1:8081/api/v2/assessment/blueprints/list", bytes.NewBuffer(reqBody))
	req2.Header.Set("Authorization", "Bearer "+token)
	req2.Header.Set("Content-Type", "application/json")
	resp2, _ := client.Do(req2)
	defer resp2.Body.Close()
	body2, _ := io.ReadAll(resp2.Body)
	fmt.Printf("✅ [3] API blueprints/list sau khi lưu: HTTP %d | Data: %s\n", resp2.StatusCode, string(body2))
}
