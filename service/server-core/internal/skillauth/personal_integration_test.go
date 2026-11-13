package skillauth

import (
	"context"
	"encoding/json"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"net"
	"net/url"
	"os"
	"testing"
)

func TestPersonalSettingsIntegration(t *testing.T) {
	if os.Getenv("SKILLHUB_PERSONAL_TEST") != "1" {
		t.Skip("opt-in personal settings DB regression")
	}
	godotenv.Load("../../.env")
	conn := &url.URL{Scheme: "postgres", User: url.UserPassword(os.Getenv("POSTGRES_USER"), os.Getenv("POSTGRES_PASSWORD")), Host: net.JoinHostPort("localhost", os.Getenv("POSTGRES_PORT")), Path: "skillhub", RawQuery: "sslmode=disable"}
	db, e := sqlx.Connect("postgres", conn.String())
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	id, sid, other := uuid.NewString(), uuid.NewString(), uuid.NewString()
	username := "qa_personal_" + uuid.NewString()[:8]
	defer func() {
		db.Exec(`DELETE FROM "_SECAuditLog" WHERE "ActorId"=$1`, id)
		db.Exec(`DELETE FROM "_USRSession" WHERE "UserId"=$1`, id)
		db.Exec(`DELETE FROM "_USRAccountDirectory" WHERE "Id"=$1`, id)
	}()
	old := "test-old-password-123"
	next := "test-new-password-456"
	hash, _ := bcrypt.GenerateFromPassword([]byte(old), bcrypt.MinCost)
	if _, e = db.Exec(`INSERT INTO "_USRAccountDirectory"("Id","Email","Username","Name","PasswordHash") VALUES($1,$2,$2,'Disposable personal test',$3)`, id, username, string(hash)); e != nil {
		t.Fatal(e)
	}
	for _, session := range []string{sid, other} {
		if _, e = db.Exec(`INSERT INTO "_USRSession"("Id","UserId","TokenHash","ExpiresAt","Ip","UserAgent") VALUES($1,$2,$3,now()+interval '1 hour','test','test')`, session, id, session); e != nil {
			t.Fatal(e)
		}
	}
	server := &Server{DB: db}
	ctx := context.Background()
	user := account{ID: id, Role: "learner"}
	payload := map[string]any{"name": "Updated personal test", "email": "qa@example.com", "birthDate": "1990-02-20", "phone": "+84 901 234 567", "avatarUrl": "", "role": "admin", "department": "injected"}
	if _, e = server.personalAction(ctx, user, sid, "profile_update", payload); e != nil {
		t.Fatal(e)
	}
	var name, email, birth, phone, role, department string
	if e = db.QueryRow(`SELECT "Name","ContactEmail","BirthDate"::text,"Phone","Role","Department" FROM "_USRAccountDirectory" WHERE "Id"=$1`, id).Scan(&name, &email, &birth, &phone, &role, &department); e != nil {
		t.Fatal(e)
	}
	if name != "Updated personal test" || email != "qa@example.com" || birth != "1990-02-20" || phone != "+84 901 234 567" || role != "learner" || department != "" {
		t.Fatal("profile not saved or protected fields changed")
	}
	if _, e = server.personalAction(ctx, user, sid, "password_change", map[string]any{"current_password": "wrong", "new_password": next}); e == nil {
		t.Fatal("wrong current password accepted")
	}
	if _, e = server.personalAction(ctx, user, sid, "password_change", map[string]any{"current_password": old, "new_password": next}); e != nil {
		t.Fatal(e)
	}
	var saved string
	db.Get(&saved, `SELECT "PasswordHash" FROM "_USRAccountDirectory" WHERE "Id"=$1`, id)
	if bcrypt.CompareHashAndPassword([]byte(saved), []byte(next)) != nil {
		t.Fatal("new password not saved")
	}
	var revoked bool
	db.Get(&revoked, `SELECT "Revoked" FROM "_USRSession" WHERE "Id"=$1`, other)
	if !revoked {
		t.Fatal("other session not revoked")
	}
	db.Get(&revoked, `SELECT "Revoked" FROM "_USRSession" WHERE "Id"=$1`, sid)
	if revoked {
		t.Fatal("current session revoked")
	}
	// No password values belong in audit resource metadata.
	var resources []string
	db.Select(&resources, `SELECT "Resource" FROM "_SECAuditLog" WHERE "ActorId"=$1`, id)
	b, _ := json.Marshal(resources)
	if string(b) != "[\"self\",\"self\",\"self\"]" {
		t.Fatal("unexpected audit resources")
	}
}
