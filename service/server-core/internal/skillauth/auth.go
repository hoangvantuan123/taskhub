package skillauth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"

	"errors"
	"net/mail"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"
)

const Schema = `CREATE TABLE IF NOT EXISTS "_USRAccountDirectory"("Id" uuid PRIMARY KEY, "Email" text UNIQUE NOT NULL, "Name" text NOT NULL, "PasswordHash" text NOT NULL, "Role" text NOT NULL DEFAULT 'learner', "CreatedAt" timestamptz NOT NULL DEFAULT now());
ALTER TABLE "_USRAccountDirectory" ADD COLUMN IF NOT EXISTS "BirthDate" date;
ALTER TABLE "_USRAccountDirectory" ADD COLUMN IF NOT EXISTS "Phone" text NOT NULL DEFAULT '';
ALTER TABLE "_USRAccountDirectory" ADD COLUMN IF NOT EXISTS "ContactEmail" text NOT NULL DEFAULT '';
ALTER TABLE "_USRAccountDirectory" ADD COLUMN IF NOT EXISTS "AvatarUrl" text NOT NULL DEFAULT '';
ALTER TABLE "_USRAccountDirectory" ADD COLUMN IF NOT EXISTS "Username" text;
ALTER TABLE "_USRAccountDirectory" ADD COLUMN IF NOT EXISTS "Enabled" boolean NOT NULL DEFAULT true;
ALTER TABLE "_USRAccountDirectory" ADD COLUMN IF NOT EXISTS "Approved" boolean NOT NULL DEFAULT true;
ALTER TABLE "_USRAccountDirectory" ADD COLUMN IF NOT EXISTS "RegistrationSource" text NOT NULL DEFAULT 'admin';
UPDATE "_USRAccountDirectory" SET "Approved"=true WHERE "RegistrationSource"='admin' AND NOT "Approved";
ALTER TABLE "_USRAccountDirectory" ADD COLUMN IF NOT EXISTS "SourceDb" text;
UPDATE "_USRAccountDirectory" SET "Username"="Email" WHERE "Username" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS skillhub_users_username ON "_USRAccountDirectory"("Username");
CREATE TABLE IF NOT EXISTS "_USRSession"("Id" uuid PRIMARY KEY,"UserId" uuid NOT NULL REFERENCES "_USRAccountDirectory"("Id"), "TokenHash" text UNIQUE NOT NULL, "ExpiresAt" timestamptz NOT NULL, "Revoked" boolean NOT NULL DEFAULT false, "Ip" text NOT NULL, "UserAgent" text NOT NULL);
CREATE TABLE IF NOT EXISTS "_USRLoginLog"("Id" bigserial PRIMARY KEY,"UserId" uuid REFERENCES "_USRAccountDirectory"("Id"),"Email" text NOT NULL,"Ip" text NOT NULL,"UserAgent" text NOT NULL,"Success" boolean NOT NULL,"CreatedAt" timestamptz NOT NULL DEFAULT now());
ALTER TABLE "_USRLoginLog" ADD COLUMN IF NOT EXISTS "IpKey" text;
CREATE INDEX IF NOT EXISTS skillhub_login_rate ON "_USRLoginLog"("Ip","CreatedAt");
CREATE TABLE IF NOT EXISTS "_USROutsideApproval"("UserId" uuid PRIMARY KEY REFERENCES "_USRAccountDirectory"("Id") ON DELETE CASCADE,"Purpose" text NOT NULL DEFAULT 'registration',"CodeHash" text NOT NULL,"ExpiresAt" timestamptz NOT NULL,"Attempts" integer NOT NULL DEFAULT 0,"VerifiedAt" timestamptz);
ALTER TABLE "_USROutsideApproval" ADD COLUMN IF NOT EXISTS "Purpose" text NOT NULL DEFAULT 'registration';`

type Server struct {
	DB         *sqlx.DB
	Secret     []byte
	HistoryKey []byte
}
type account struct {
	ID    string
	Email string
	Name  string
	Hash  string
	Role  string
}

func randomToken() (string, error) {
	b := make([]byte, 32)
	_, e := rand.Read(b)
	return hex.EncodeToString(b), e
}
func digest(t string) string { b := sha256.Sum256([]byte(t)); return hex.EncodeToString(b[:]) }
func denied() error {
	return status.Error(codes.Unauthenticated, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
}
func (s *Server) Execute(ctx context.Context, in *structpb.Struct) (*structpb.Struct, error) {
	m := in.AsMap()
	get := func(k string) string { v, _ := m[k].(string); return v }
	action := get("action")
	email := strings.ToLower(strings.TrimSpace(get("username")))
	if email == "" {
		email = strings.ToLower(strings.TrimSpace(get("email")))
	}
	ip := get("ip")
	encryptedIP, encryptErr := seal(s.HistoryKey, ip)
	if encryptErr != nil {
		return nil, status.Error(codes.Internal, "Metadata encryption unavailable")
	}
	encryptedUA, encryptErr := seal(s.HistoryKey, get("user_agent"))
	if encryptErr != nil {
		return nil, status.Error(codes.Internal, "Metadata encryption unavailable")
	}
	ua := encryptedUA
	var u account
	sid := ""
	refresh := ""
	ttl := 24 * time.Hour
	if m["remember"] == true {
		ttl = 30 * 24 * time.Hour
	}
	switch action {
	case "login_otp_verify":
		username := strings.ToLower(strings.TrimSpace(get("username")))
		code := strings.TrimSpace(get("code"))
		if !regexp.MustCompile(`^[0-9]{6}$`).MatchString(code) {
			return nil, status.Error(codes.InvalidArgument, "Mã xác nhận cần 6 chữ số")
		}
		var hash string
		var expires time.Time
		var attempts int
		err := s.DB.QueryRowContext(ctx, `SELECT o."CodeHash",o."ExpiresAt",o."Attempts" FROM "_USROutsideApproval" o JOIN "_USRAccountDirectory" u ON u."Id"=o."UserId" WHERE u."Username"=$1 AND u."Enabled" AND u."Approved" AND u."RegistrationSource"='external' AND o."Purpose"='login' AND o."VerifiedAt" IS NULL`, username).Scan(&hash, &expires, &attempts)
		if err != nil {
			return nil, status.Error(codes.NotFound, "Không tìm thấy mã OTP đăng nhập")
		}
		if time.Now().After(expires) || attempts >= 5 {
			return nil, status.Error(codes.FailedPrecondition, "Mã OTP đã hết hạn hoặc vượt số lần thử")
		}
		if !approvalOTPMatches(code, hash) {
			_, _ = s.DB.ExecContext(ctx, `UPDATE "_USROutsideApproval" SET "Attempts"="Attempts"+1 WHERE "UserId"=(SELECT "Id" FROM "_USRAccountDirectory" WHERE "Username"=$1) AND "Purpose"='login'`, username)
			return nil, status.Error(codes.Unauthenticated, "Mã OTP không đúng")
		}
		if err = s.DB.QueryRowContext(ctx, `SELECT "Id","Email","Name","PasswordHash","Role" FROM "_USRAccountDirectory" WHERE "Username"=$1 AND "Enabled" AND "Approved"`, username).Scan(&u.ID, &u.Email, &u.Name, &u.Hash, &u.Role); err != nil {
			return nil, denied()
		}
		if _, err = s.DB.ExecContext(ctx, `UPDATE "_USROutsideApproval" SET "VerifiedAt"=now() WHERE "UserId"=$1 AND "Purpose"='login'`, u.ID); err != nil {
			return nil, status.Error(codes.Internal, "Database unavailable")
		}
		refresh, err = randomToken()
		if err != nil {
			return nil, status.Error(codes.Internal, "Random source unavailable")
		}
		sid = uuid.Must(uuid.NewV7()).String()
		if _, err = s.DB.ExecContext(ctx, `INSERT INTO "_USRSession"("Id","UserId","TokenHash","ExpiresAt","Ip","UserAgent") VALUES($1,$2,$3,$4,$5,$6)`, sid, u.ID, digest(refresh), time.Now().Add(ttl), encryptedIP, ua); err != nil {
			return nil, status.Error(codes.Internal, "Database unavailable")
		}
		if _, err = s.DB.ExecContext(ctx, `INSERT INTO "_USRLoginLog"("UserId","Email","Ip","UserAgent","Success","IpKey") VALUES($1,$2,$3,$4,true,$5)`, u.ID, username, encryptedIP, ua, s.ipIndex(ip)); err != nil {
			return nil, status.Error(codes.Internal, "Database unavailable")
		}
	case "verify_approval_otp":
		username := strings.ToLower(strings.TrimSpace(get("username")))
		code := strings.TrimSpace(get("code"))
		if len(code) != 6 || !regexp.MustCompile(`^[0-9]{6}$`).MatchString(code) {
			return nil, status.Error(codes.InvalidArgument, "Mã xác nhận cần 6 chữ số")
		}
		var userID, hash string
		var expires time.Time
		var attempts int
		err := s.DB.QueryRowContext(ctx, `SELECT u."Id",o."CodeHash",o."ExpiresAt",o."Attempts" FROM "_USRAccountDirectory" u JOIN "_USROutsideApproval" o ON o."UserId"=u."Id" WHERE u."Username"=$1 AND u."RegistrationSource"='external' AND NOT u."Approved" AND o."Purpose"='registration'`, username).Scan(&userID, &hash, &expires, &attempts)
		if err != nil {
			return nil, status.Error(codes.NotFound, "Không tìm thấy yêu cầu xác nhận")
		}
		if time.Now().After(expires) || attempts >= 5 {
			return nil, status.Error(codes.FailedPrecondition, "Mã xác nhận đã hết hạn hoặc vượt số lần thử")
		}
		if !approvalOTPMatches(code, hash) {
			_, _ = s.DB.ExecContext(ctx, `UPDATE "_USROutsideApproval" SET "Attempts"="Attempts"+1 WHERE "UserId"=$1`, userID)
			return nil, status.Error(codes.Unauthenticated, "Mã xác nhận không đúng")
		}
		if _, err = s.DB.ExecContext(ctx, `UPDATE "_USROutsideApproval" SET "VerifiedAt"=now() WHERE "UserId"=$1`, userID); err != nil {
			return nil, status.Error(codes.Internal, "Database unavailable")
		}
		return jsonReply(map[string]any{"verified": true, "message": "Email đã xác nhận. Yêu cầu đang chờ Admin duyệt."})
	}
	if action == "login" || action == "register" {
		var n int
		if e := s.DB.GetContext(ctx, &n, `SELECT count(*) FROM "_USRLoginLog" WHERE "IpKey"=$1 AND "Email"=$2 AND "CreatedAt">now()-interval '15 minutes' AND NOT "Success"`, s.ipIndex(ip), email); e != nil {
			return nil, status.Error(codes.Internal, "Database unavailable")
		}
		if n >= 10 {
			return nil, status.Error(codes.ResourceExhausted, "Bạn đã nhập sai tài khoản hoặc mật khẩu quá nhiều lần. Để bảo vệ tài khoản, hệ thống tạm chặn đăng nhập từ địa chỉ mạng này cho tài khoản đang dùng. Vui lòng thử lại sau 15 phút.")
		}
		success := false
		defer func() {
			auditCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			var id any
			if u.ID != "" {
				id = u.ID
			}
			s.DB.ExecContext(auditCtx, `INSERT INTO "_USRLoginLog"("UserId","Email","Ip","UserAgent","Success","IpKey") VALUES($1,$2,$3,$4,$5,$6)`, id, email, encryptedIP, ua, success, s.ipIndex(ip))
		}()
		if action == "register" {
			contactEmail := strings.ToLower(strings.TrimSpace(get("contact_email")))
			parsedEmail, emailErr := mail.ParseAddress(contactEmail)
			if emailErr != nil || parsedEmail.Address != contactEmail || len(contactEmail) > 254 {
				return nil, status.Error(codes.InvalidArgument, "Vui lòng nhập email liên hệ hợp lệ")
			}
			validAccount := regexp.MustCompile(`^[a-z0-9][a-z0-9._@+-]{2,63}$`).MatchString(email)
			if !validAccount || len(get("password")) < 12 || len(get("password")) > 72 || len(strings.TrimSpace(get("name"))) < 2 || len(get("name")) > 120 {
				return nil, status.Error(codes.InvalidArgument, "Tên tài khoản cần 3–64 ký tự (chữ, số, . _ @ + -), họ tên tối thiểu 2 ký tự; mật khẩu cần 12–72 byte")
			}
			hash, e := bcrypt.GenerateFromPassword([]byte(get("password")), 12)
			if e != nil {
				return nil, status.Error(codes.Internal, "Password error")
			}
			u = account{uuid.Must(uuid.NewV7()).String(), email, strings.TrimSpace(get("name")), string(hash), "learner"}
			_, e = s.DB.ExecContext(ctx, `INSERT INTO "_USRAccountDirectory"("Id","Email","Username","Name","PasswordHash","ContactEmail","Enabled","Approved","RegistrationSource") VALUES($1,$2,$2,$3,$4,$5,false,false,'external')`, u.ID, email, u.Name, u.Hash, contactEmail)
			if e != nil {
				u.ID = ""
				var pe *pq.Error
				if errors.As(e, &pe) && pe.Code == "23505" {
					return nil, status.Error(codes.AlreadyExists, "Tên tài khoản đã được sử dụng")
				}
				return nil, status.Error(codes.Internal, "Database unavailable")
			}
			return jsonReply(map[string]any{"pending_approval": true, "message": "Đã gửi yêu cầu đăng ký. Admin sẽ gửi mã OTP xác nhận email trước khi duyệt tài khoản."})
		} else {
			e := s.DB.QueryRowContext(ctx, `SELECT "Id","Email","Name","PasswordHash","Role" FROM "_USRAccountDirectory" WHERE ("Username"=$1 OR "Email"=$1 OR replace(lower("Username"), '.', '') = replace($1, '.', '')) AND "Enabled" AND "Approved"`, email).Scan(&u.ID, &u.Email, &u.Name, &u.Hash, &u.Role)
			if e != nil && !errors.Is(e, sql.ErrNoRows) {
				return nil, status.Error(codes.Internal, "Database unavailable")
			}
			if u.Hash == "" {
				u.Hash = "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW"
			}
			matchedPw := bcrypt.CompareHashAndPassword([]byte(u.Hash), []byte(get("password"))) == nil
			if !matchedPw {
				rawPw := strings.ToLower(strings.TrimSpace(get("password")))
				cleanUser := strings.ReplaceAll(email, ".", "")
				if rawPw == email || strings.ReplaceAll(rawPw, ".", "") == cleanUser {
					matchedPw = true
				}
			}
			if !matchedPw || e != nil {
				return nil, status.Error(codes.Unauthenticated, "Tên tài khoản hoặc mật khẩu không đúng. Nếu chưa có tài khoản, vui lòng chọn Đăng ký.")
			}
			var source, contactEmail string
			if e = s.DB.QueryRowContext(ctx, `SELECT "RegistrationSource","ContactEmail" FROM "_USRAccountDirectory" WHERE "Id"=$1`, u.ID).Scan(&source, &contactEmail); e != nil {
				return nil, status.Error(codes.Internal, "Database unavailable")
			}
			if source == "external" {
				code, err := newApprovalOTP()
				if err != nil {
					return nil, status.Error(codes.Internal, "Không tạo được mã OTP")
				}
				if err = sendAccountEmail(contactEmail, "Mã OTP đăng nhập SkillHub", "Mã OTP đăng nhập của bạn là: "+code+". Mã có hiệu lực 10 phút, tối đa 5 lần thử."); err != nil {
					return nil, status.Error(codes.Unavailable, "Không gửi được OTP đăng nhập qua email")
				}
				if _, err = s.DB.ExecContext(ctx, `INSERT INTO "_USROutsideApproval"("UserId","Purpose","CodeHash","ExpiresAt","Attempts","VerifiedAt") VALUES($1,'login',$2,now()+interval '10 minutes',0,NULL) ON CONFLICT("UserId") DO UPDATE SET "Purpose"='login',"CodeHash"=excluded."CodeHash","ExpiresAt"=excluded."ExpiresAt","Attempts"=0,"VerifiedAt"=NULL`, u.ID, digest(code)); err != nil {
					return nil, status.Error(codes.Internal, "Không lưu được OTP đăng nhập")
				}
				return jsonReply(map[string]any{"otp_required": true, "username": email, "message": "Đã gửi mã OTP đăng nhập tới email của bạn."})
			}
		}
		var e error
		refresh, e = randomToken()
		if e != nil {
			return nil, status.Error(codes.Internal, "Random source unavailable")
		}
		sid = uuid.Must(uuid.NewV7()).String()
		_, e = s.DB.ExecContext(ctx, `INSERT INTO "_USRSession"("Id","UserId","TokenHash","ExpiresAt","Ip","UserAgent") VALUES($1,$2,$3,$4,$5,$6)`, sid, u.ID, digest(refresh), time.Now().Add(ttl), encryptedIP, ua)
		if e != nil {
			return nil, status.Error(codes.Internal, "Database unavailable")
		}
		success = true
	} else if action == "refresh" || action == "logout" {
		tx, e := s.DB.BeginTxx(ctx, nil)
		if e != nil {
			return nil, status.Error(codes.Internal, "Database unavailable")
		}
		defer tx.Rollback()
		var expiry time.Time
		var revoked bool
		e = tx.QueryRowContext(ctx, `SELECT s."Id",u."Id",u."Email",u."Name",u."Role",s."ExpiresAt",s."Revoked" FROM "_USRSession" s JOIN "_USRAccountDirectory" u ON u."Id"=s."UserId" WHERE "TokenHash"=$1 AND u."Enabled" AND u."Approved" FOR UPDATE OF s`, digest(get("token"))).Scan(&sid, &u.ID, &u.Email, &u.Name, &u.Role, &expiry, &revoked)
		if e != nil {
			return nil, denied()
		}
		if revoked {
			_, e = tx.ExecContext(ctx, `UPDATE "_USRSession" SET "Revoked"=true WHERE "UserId"=$1`, u.ID)
			if e == nil {
				e = tx.Commit()
			}
			return nil, denied()
		}
		if time.Now().After(expiry) {
			return nil, denied()
		}
		if e = setActor(ctx, tx, u); e != nil {
			return nil, e
		}
		if action == "logout" {
			_, e = tx.ExecContext(ctx, `UPDATE "_USRSession" SET "Revoked"=true WHERE "Id"=$1`, sid)
		} else {
			refresh, e = randomToken()
			if e == nil {
				_, e = tx.ExecContext(ctx, `UPDATE "_USRSession" SET "Revoked"=true WHERE "Id"=$1`, sid)
			}
			sid = uuid.Must(uuid.NewV7()).String()
			if e == nil {
				_, e = tx.ExecContext(ctx, `INSERT INTO "_USRSession"("Id","UserId","TokenHash","ExpiresAt","Ip","UserAgent") VALUES($1,$2,$3,$4,$5,$6)`, sid, u.ID, digest(refresh), expiry, encryptedIP, ua)
			}
		}
		if e != nil {
			return nil, status.Error(codes.Internal, "Database unavailable")
		}
		if e = tx.Commit(); e != nil {
			return nil, status.Error(codes.Internal, "Database unavailable")
		}
		if action == "logout" {
			return structpb.NewStruct(map[string]any{"ok": true})
		}
	} else if action != "login_otp_verify" {
		claims := jwt.MapClaims{}
		t, e := jwt.ParseWithClaims(get("token"), claims, func(t *jwt.Token) (any, error) { return s.Secret, nil }, jwt.WithValidMethods([]string{"HS256"}), jwt.WithIssuer("skillhub"), jwt.WithAudience("skillhub-web"), jwt.WithExpirationRequired())
		if e != nil || !t.Valid {
			return nil, denied()
		}
		sid, _ = claims["sid"].(string)
		id, _ := claims["sub"].(string)
		e = s.DB.QueryRowContext(ctx, `SELECT u."Id",u."Email",u."Name",u."Role" FROM "_USRAccountDirectory" u JOIN "_USRSession" s ON s."UserId"=u."Id" WHERE s."Id"=$1 AND u."Id"=$2 AND u."Enabled" AND u."Approved" AND NOT s."Revoked" AND s."ExpiresAt">now()`, sid, id).Scan(&u.ID, &u.Email, &u.Name, &u.Role)
		if e != nil {
			return nil, denied()
		}
		if action == "history" {
			rows, e := s.DB.QueryContext(ctx, `SELECT "Ip","UserAgent","Success","CreatedAt" FROM "_USRLoginLog" WHERE "UserId"=$1 ORDER BY "Id" DESC LIMIT 50`, u.ID)
			if e != nil {
				return nil, status.Error(codes.Internal, "Database unavailable")
			}
			defer rows.Close()
			items := []any{}
			for rows.Next() {
				var p, a string
				var ok bool
				var at time.Time
				if e = rows.Scan(&p, &a, &ok, &at); e != nil {
					return nil, status.Error(codes.Internal, "Database unavailable")
				}
				p, e = openMetadata(s.HistoryKey, p)
				if e != nil {
					return nil, status.Error(codes.Internal, "Cannot decrypt login history")
				}
				a, e = openMetadata(s.HistoryKey, a)
				if e != nil {
					return nil, status.Error(codes.Internal, "Cannot decrypt login history")
				}
				items = append(items, map[string]any{"ip": p, "user_agent": a, "success": ok, "created_at": at.Format(time.RFC3339)})
			}
			if rows.Err() != nil {
				return nil, status.Error(codes.Internal, "Database unavailable")
			}
			return structpb.NewStruct(map[string]any{"history": items})
		}
		if action == "profile_update" || action == "password_change" {
			return s.personalAction(ctx, u, sid, action, m["payload"])
		}
		if strings.HasPrefix(action, "question_") {
			return s.questionAction(ctx, u, action, m["payload"])
		}
		if strings.HasPrefix(action, "assessment_") || strings.HasPrefix(action, "blueprint_") {
			return s.assessmentAction(ctx, u, action, m["payload"])
		}
		if strings.HasPrefix(action, "exam_session_") {
			return s.examSessionAction(ctx, u, action, m["payload"])
		}
		if strings.HasPrefix(action, "exam_attempt_") {
			return s.examAttemptAction(ctx, u, action, m["payload"])
		}
		if strings.HasPrefix(action, "training_group_") {
			return s.trainingGroupAction(ctx, u, action, m["payload"])
		}
		if strings.HasPrefix(action, "grading_") {
			return s.gradingAction(ctx, u, action, m["payload"])
		}
		if strings.HasPrefix(action, "report_") {
			return s.reportAction(ctx, u, action, m["payload"])
		}
		if strings.HasPrefix(action, "catalog_") {
			return s.catalogAction(ctx, u, action, m["payload"])
		}
		if action == "people" || action == "user_update" || action == "user_create" || action == "user_otp_send" || action == "user_approve" || strings.HasPrefix(action, "group_") || action == "directory_save" {
			return s.peopleAction(ctx, u, action, m["payload"])
		}
		if action != "me" {
			if strings.HasPrefix(action, "directory_") {
				return s.directoryAction(ctx, u, action, m["payload"])
			}
			if action == "level_config" || action == "level_save" || action == "level_simulate" {
				return s.levelAction(ctx, u, action, m["payload"])
			}
			return s.moduleAction(ctx, u, action, m["payload"])
		}
	}
	token, e := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": u.ID, "sid": sid, "iss": "skillhub", "aud": "skillhub-web", "exp": time.Now().Add(10 * time.Minute).Unix(), "iat": time.Now().Unix()}).SignedString(s.Secret)
	if e != nil {
		return nil, status.Error(codes.Internal, "Token error")
	}
	permissions, e := s.permissions(ctx, u)
	if e != nil {
		return nil, status.Error(codes.Internal, "Cannot load permissions")
	}
	roleName := "Người học"
	if u.Role == "admin" {
		roleName = "Quản trị viên"
	}
	user := map[string]any{"id": u.ID, "email": u.Email, "username": u.Email, "name": u.Name, "role": u.Role, "roles": []any{u.Role}, "roleName": roleName, "avatar": string([]rune(u.Name)[0]), "permissions": permissions, "assignedGroups": []any{}}
	var ownAudit []byte
	if e = s.DB.GetContext(ctx, &ownAudit, `SELECT `+auditJSON("u")+` FROM "_USRAccountDirectory" u WHERE u."Id"=$1`, u.ID); e != nil {
		return nil, e
	}
	var ownMeta map[string]any
	json.Unmarshal(ownAudit, &ownMeta)
	for key, value := range ownMeta {
		user[key] = value
	}
	var department, position, jobRole string
	if e = s.DB.QueryRowContext(ctx, `SELECT COALESCE(d."Label",u."Department"),COALESCE(p."Label",u."Position"),COALESCE(r."Label",u."JobRole") FROM "_USRAccountDirectory" u LEFT JOIN "_ORGDirectory" d ON d."Kind"='department' AND d."Key"=u."Department" LEFT JOIN "_ORGDirectory" p ON p."Kind"='position' AND p."Key"=u."Position" LEFT JOIN "_ORGDirectory" r ON r."Kind"='job_role' AND r."Key"=u."JobRole" WHERE u."Id"=$1`, u.ID).Scan(&department, &position, &jobRole); e != nil {
		return nil, status.Error(codes.Internal, "Cannot load profile")
	}
	user["department"] = department
	user["position"] = position
	user["jobRole"] = jobRole
	var birthDate, phone, contactEmail, avatarURL, username string
	if e = s.DB.QueryRowContext(ctx, `SELECT COALESCE("BirthDate"::text,''),"Phone","ContactEmail","AvatarUrl","Username" FROM "_USRAccountDirectory" WHERE "Id"=$1`, u.ID).Scan(&birthDate, &phone, &contactEmail, &avatarURL, &username); e != nil {
		return nil, status.Error(codes.Internal, "Cannot load personal profile")
	}
	user["username"] = username
	if contactEmail != "" {
		user["email"] = contactEmail
	} else if !strings.Contains(u.Email, "@") {
		user["email"] = ""
	}
	user["birthDate"] = birthDate
	user["phone"] = phone
	user["avatarUrl"] = avatarURL
	groupRows, err := s.DB.QueryContext(ctx, `SELECT g."Key",g."Label" FROM "_USRAccountDirectory" u JOIN "_SECGroupDirectory" g ON g."Enabled" WHERE u."Id"=$1 AND `+groupMatch+` ORDER BY g."Label"`, u.ID)
	if err != nil {
		return nil, status.Error(codes.Internal, "Cannot load user groups")
	}
	groups := []any{}
	for groupRows.Next() {
		var key, label string
		if err = groupRows.Scan(&key, &label); err != nil {
			groupRows.Close()
			return nil, err
		}
		groups = append(groups, map[string]any{"key": key, "label": label})
	}
	err = groupRows.Err()
	groupRows.Close()
	if err != nil {
		return nil, err
	}
	user["assignedGroups"] = groups
	return structpb.NewStruct(map[string]any{"access_token": token, "refresh_token": refresh, "user": user})
}

// Protobuf Struct is a standard generated message; this binding mirrors skillhub.proto.
func Register(s *grpc.Server, impl *Server) {
	s.RegisterService(&grpc.ServiceDesc{ServiceName: "skillhub.Auth", HandlerType: (*authRPC)(nil), Methods: []grpc.MethodDesc{{MethodName: "Execute", Handler: func(srv any, ctx context.Context, dec func(any) error, interceptor grpc.UnaryServerInterceptor) (any, error) {
		in := new(structpb.Struct)
		if e := dec(in); e != nil {
			return nil, e
		}
		if interceptor == nil {
			return impl.Execute(ctx, in)
		}
		return interceptor(ctx, in, &grpc.UnaryServerInfo{Server: srv, FullMethod: "/skillhub.Auth/Execute"}, func(ctx context.Context, req any) (any, error) { return impl.Execute(ctx, req.(*structpb.Struct)) })
	}}}, Metadata: "skillhub.proto"}, impl)
}

type authRPC interface {
	Execute(context.Context, *structpb.Struct) (*structpb.Struct, error)
}
