package skillauth

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"
	"net/mail"
	"regexp"
	"strings"
)

const PeopleSchema = `ALTER TABLE "_USRAccountDirectory" ADD COLUMN IF NOT EXISTS "Department" text NOT NULL DEFAULT '';
ALTER TABLE "_USRAccountDirectory" ADD COLUMN IF NOT EXISTS "Position" text NOT NULL DEFAULT '';
ALTER TABLE "_USRAccountDirectory" ADD COLUMN IF NOT EXISTS "JobRole" text NOT NULL DEFAULT '';
ALTER TABLE "_USRAccountDirectory" ADD COLUMN IF NOT EXISTS "Phone" text NOT NULL DEFAULT '';
ALTER TABLE "_USRAccountDirectory" ADD COLUMN IF NOT EXISTS "ContactEmail" text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS "_ORGDirectory"("Kind" text NOT NULL CHECK("Kind" IN ('department','position','job_role')),"Key" text NOT NULL,"Label" text NOT NULL,PRIMARY KEY("Kind","Key"));
CREATE TABLE IF NOT EXISTS "_SECGroupDirectory"("Key" text PRIMARY KEY,"Label" text NOT NULL,"Enabled" boolean NOT NULL DEFAULT true,"Department" text NOT NULL DEFAULT '',"Position" text NOT NULL DEFAULT '',"JobRole" text NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS "_SECGroupPermission"("GroupKey" text NOT NULL REFERENCES "_SECGroupDirectory"("Key") ON DELETE CASCADE,"ModuleKey" text NOT NULL REFERENCES "_SECPermissionDirectory"("Key") ON DELETE CASCADE,"Action" text NOT NULL,PRIMARY KEY("GroupKey","ModuleKey","Action"));
CREATE TABLE IF NOT EXISTS "_SECGroupMember"("GroupKey" text NOT NULL REFERENCES "_SECGroupDirectory"("Key") ON DELETE CASCADE,"UserId" uuid NOT NULL REFERENCES "_USRAccountDirectory"("Id") ON DELETE CASCADE,PRIMARY KEY("GroupKey","UserId"));
INSERT INTO "_SECPermissionDirectory"("Key","Label","Actions","System") VALUES('users','Quản lý tài khoản','["view","create","update"]',true) ON CONFLICT DO NOTHING;`
const groupMatch = `(EXISTS(SELECT 1 FROM "_SECGroupMember" gm WHERE gm."GroupKey"=g."Key" AND gm."UserId"=u."Id") OR ((g."Department"<>'' OR g."Position"<>'' OR g."JobRole"<>'') AND (g."Department"='' OR g."Department"=u."Department") AND (g."Position"='' OR g."Position"=u."Position") AND (g."JobRole"='' OR g."JobRole"=u."JobRole")))`

type GroupPermission struct {
	Module  string   `json:"module"`
	Actions []string `json:"actions"`
}
type PermissionGroup struct {
	RowAuditFields
	Key         string            `json:"key"`
	Label       string            `json:"label"`
	Enabled     bool              `json:"enabled"`
	Department  string            `json:"department"`
	Position    string            `json:"position"`
	JobRole     string            `json:"job_role"`
	Permissions []GroupPermission `json:"permissions"`
	MemberCount int               `json:"member_count"`
}

func invalid(message string) error { return status.Error(codes.InvalidArgument, message) }
func validateDirectory(ctx context.Context, tx *sqlx.Tx, department, position, jobRole string) error {
	for kind, value := range map[string]string{"department": department, "position": position, "job_role": jobRole} {
		if value == "" {
			continue
		}
		var exists bool
		if e := tx.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM "_ORGDirectory" WHERE "Kind"=$1 AND "Key"=$2 AND "Enabled")`, kind, value); e != nil {
			return e
		}
		if !exists {
			return invalid("Giá trị phòng ban/vị trí/vai trò chưa có trong danh mục")
		}
	}
	return nil
}
func (s *Server) peopleAction(ctx context.Context, u account, action string, payload any) (*structpb.Struct, error) {
	required := map[string]string{"people": "users:view", "user_update": "users:update", "user_create": "users:create", "user_otp_send": "users:update", "user_approve": "users:update", "group_list": "permissions:view", "group_save": "permissions:update", "group_delete": "permissions:update", "group_members": "permissions:update", "directory_save": "users:update"}
	permission, ok := required[action]
	if !ok {
		return nil, invalid("Unknown operation")
	}
	if !s.allowed(ctx, u, permission) {
		return nil, status.Error(codes.PermissionDenied, "Bạn không có quyền "+permission)
	}
	if action == "people" {
		var request struct {
			Search      string `json:"search"`
			LookupsOnly bool   `json:"lookups_only"`
		}
		payloadJSON, _ := json.Marshal(payload)
		_ = json.Unmarshal(payloadJSON, &request)
		users := []any{}
		if !request.LookupsOnly {
			search := strings.TrimSpace(request.Search)
			pattern := "%" + search + "%"
			rows, e := s.DB.QueryContext(ctx, `SELECT u."Id",u."Username",u."Name",u."Role",u."Enabled",u."Department",u."Position",u."JobRole",COALESCE(u."Email",''),COALESCE(u."Phone",''),COALESCE(u."ContactEmail",''),COALESCE(to_char(u."CreatedAt", 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),''),COALESCE((SELECT jsonb_agg(g."Key" ORDER BY g."Key") FROM "_SECGroupDirectory" g WHERE g."Enabled" AND `+groupMatch+`),'[]'::jsonb),COALESCE((SELECT jsonb_agg(gm."GroupKey" ORDER BY gm."GroupKey") FROM "_SECGroupMember" gm WHERE gm."UserId"=u."Id"),'[]'::jsonb),u."Approved",u."RegistrationSource",EXISTS(SELECT 1 FROM "_USROutsideApproval" oa WHERE oa."UserId"=u."Id" AND oa."VerifiedAt" IS NOT NULL),`+auditJSON("u")+` FROM "_USRAccountDirectory" u WHERE ($1='' OR u."Username" ILIKE $2 OR u."Name" ILIKE $2 OR COALESCE(u."Email",'') ILIKE $2 OR COALESCE(u."ContactEmail",'') ILIKE $2 OR COALESCE(u."Phone",'') ILIKE $2 OR EXISTS(SELECT 1 FROM "_ORGDirectory" od WHERE od."Key" IN (u."Department",u."Position",u."JobRole") AND od."Label" ILIKE $2) OR EXISTS(SELECT 1 FROM "_SECGroupDirectory" g WHERE g."Enabled" AND `+groupMatch+` AND g."Label" ILIKE $2)) ORDER BY u."Username"`, search, pattern)
			if e != nil {
				return nil, e
			}
			defer rows.Close()
			for rows.Next() {
				var id, login, name, role, dept, pos, job, email, phone, contactEmail, createdAt string
				var enabled, approved, emailVerified bool
				var registrationSource string
				var groupsRaw, membersRaw, auditRaw []byte
				if e = rows.Scan(&id, &login, &name, &role, &enabled, &dept, &pos, &job, &email, &phone, &contactEmail, &createdAt, &groupsRaw, &membersRaw, &approved, &registrationSource, &emailVerified, &auditRaw); e != nil {
					return nil, e
				}
				var groups, members any
				json.Unmarshal(groupsRaw, &groups)
				json.Unmarshal(membersRaw, &members)
				row := map[string]any{"id": id, "username": login, "name": name, "role": role, "enabled": enabled, "approved": approved, "email_verified": emailVerified, "registration_source": registrationSource, "department": dept, "position": pos, "job_role": job, "email": email, "phone": phone, "contact_email": contactEmail, "created_at": createdAt, "groups": groups, "manual_groups": members}
				var metadata map[string]any
				json.Unmarshal(auditRaw, &metadata)
				for key, value := range metadata {
					row[key] = value
				}
				users = append(users, row)
			}
			if rows.Err() != nil {
				return nil, rows.Err()
			}
		}
		dirRows, e := s.DB.QueryContext(ctx, `SELECT od."Kind",od."Key",od."Label",`+auditJSON("od")+` FROM "_ORGDirectory" od WHERE od."Enabled" ORDER BY od."Kind",od."Label"`)
		if e != nil {
			return nil, e
		}
		defer dirRows.Close()
		directory := []any{}
		for dirRows.Next() {
			var kind, key, label string
			var auditRaw []byte
			if e = dirRows.Scan(&kind, &key, &label, &auditRaw); e != nil {
				return nil, e
			}
			row := map[string]any{"kind": kind, "key": key, "label": label}
			var metadata map[string]any
			json.Unmarshal(auditRaw, &metadata)
			for k, v := range metadata {
				row[k] = v
			}
			directory = append(directory, row)
		}
		if dirRows.Err() != nil {
			return nil, dirRows.Err()
		}
		return jsonReply(map[string]any{"users": users, "directory": directory})
	}
	if action == "user_otp_send" || action == "user_approve" {
		var p struct {
			ID string `json:"id"`
		}
		b, err := json.Marshal(payload)
		if err != nil {
			return nil, invalid("Tài khoản không hợp lệ")
		}
		if json.Unmarshal(b, &p) != nil {
			return nil, invalid("Tài khoản không hợp lệ")
		}
		if _, err := uuid.Parse(p.ID); err != nil {
			return nil, invalid("Tài khoản không hợp lệ")
		}
		var email, name, username string
		var verified bool
		if err := s.DB.QueryRowContext(ctx, `SELECT u."ContactEmail",u."Name",u."Username",EXISTS(SELECT 1 FROM "_USROutsideApproval" oa WHERE oa."UserId"=u."Id" AND oa."VerifiedAt" IS NOT NULL) FROM "_USRAccountDirectory" u WHERE u."Id"=$1 AND u."RegistrationSource"='external' AND NOT u."Approved"`, p.ID).Scan(&email, &name, &username, &verified); err != nil {
			return nil, invalid("Không tìm thấy yêu cầu đăng ký đang chờ duyệt")
		}
		if action == "user_otp_send" {
			code, err := newApprovalOTP()
			if err != nil {
				return nil, status.Error(codes.Internal, "Không tạo được mã xác nhận")
			}
			if err = sendAccountEmail(email, "Mã xác nhận email SkillHub", "Xin chào "+name+",\n\nMã xác nhận yêu cầu tạo tài khoản "+username+" là: "+code+"\nMã có hiệu lực 10 phút, tối đa 5 lần thử."); err != nil {
				return nil, status.Error(codes.Unavailable, "Chưa gửi được mã OTP qua email")
			}
			if _, err = s.DB.ExecContext(ctx, `INSERT INTO "_USROutsideApproval"("UserId","Purpose","CodeHash","ExpiresAt","Attempts","VerifiedAt") VALUES($1,'registration',$2,now()+interval '10 minutes',0,NULL) ON CONFLICT("UserId") DO UPDATE SET "Purpose"='registration',"CodeHash"=excluded."CodeHash","ExpiresAt"=excluded."ExpiresAt","Attempts"=0,"VerifiedAt"=NULL`, p.ID, digest(code)); err != nil {
				return nil, status.Error(codes.Internal, "Không lưu được mã xác nhận")
			}
			return jsonReply(map[string]any{"sent": true})
		}
		if !verified {
			return nil, status.Error(codes.FailedPrecondition, "Người đăng ký cần xác nhận email bằng OTP trước khi duyệt")
		}
		if _, err := s.DB.ExecContext(ctx, `UPDATE "_USRAccountDirectory" SET "Approved"=true,"Enabled"=true WHERE "Id"=$1 AND "RegistrationSource"='external' AND NOT "Approved"`, p.ID); err != nil {
			return nil, err
		}
		if _, err = s.DB.ExecContext(ctx, `INSERT INTO "_SECAuditLog"("ActorId","Operation","Resource") VALUES($1,'user_approve',$2)`, u.ID, p.ID); err != nil {
			return nil, err
		}
		emailSent := sendAccountEmail(email, "Tài khoản SkillHub đã được phê duyệt", "Xin chào "+name+",\n\nTài khoản "+username+" đã được Admin phê duyệt. Bạn có thể đăng nhập vào SkillHub.") == nil
		return jsonReply(map[string]any{"approved": true, "email_sent": emailSent})
	}
	if action == "group_list" {
		rows, e := s.DB.QueryContext(ctx, `SELECT g."Key",g."Label",g."Enabled",g."Department",g."Position",g."JobRole",(SELECT count(*) FROM "_USRAccountDirectory" u WHERE `+groupMatch+`),`+auditJSON("g")+` FROM "_SECGroupDirectory" g ORDER BY g."Label"`)
		if e != nil {
			return nil, e
		}
		groups := []PermissionGroup{}
		for rows.Next() {
			var g PermissionGroup
			var auditRaw []byte
			if e = rows.Scan(&g.Key, &g.Label, &g.Enabled, &g.Department, &g.Position, &g.JobRole, &g.MemberCount, &auditRaw); e != nil {
				rows.Close()
				return nil, e
			}
			json.Unmarshal(auditRaw, &g.RowAuditFields)
			g.Permissions = []GroupPermission{}
			groups = append(groups, g)
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return nil, e
		}
		for i := range groups {
			permRows, e := s.DB.QueryContext(ctx, `SELECT "ModuleKey",jsonb_agg("Action" ORDER BY "Action") FROM "_SECGroupPermission" WHERE "GroupKey"=$1 GROUP BY "ModuleKey" ORDER BY "ModuleKey"`, groups[i].Key)
			if e != nil {
				return nil, e
			}
			for permRows.Next() {
				var p GroupPermission
				var raw []byte
				if e = permRows.Scan(&p.Module, &raw); e != nil {
					permRows.Close()
					return nil, e
				}
				json.Unmarshal(raw, &p.Actions)
				groups[i].Permissions = append(groups[i].Permissions, p)
			}
			e = permRows.Err()
			permRows.Close()
			if e != nil {
				return nil, e
			}
		}
		return jsonReply(map[string]any{"groups": groups})
	}
	raw, e := json.Marshal(payload)
	if e != nil {
		return nil, invalid("Invalid payload")
	}
	tx, owned, e := beginWrite(ctx, s.DB)
	if e != nil {
		return nil, e
	}
	if owned {
		defer tx.Rollback()
	}
	if e = legacyPreconditions(ctx, tx, u, action, payload); e != nil {
		return nil, e
	}
	resource := ""
	switch action {
	case "directory_save":
		var p struct {
			Kind  string `json:"kind"`
			Key   string `json:"key"`
			Label string `json:"label"`
		}
		if json.Unmarshal(raw, &p) != nil || !regexp.MustCompile(`^[a-z][a-z0-9_]{1,47}$`).MatchString(p.Key) || len(strings.TrimSpace(p.Label)) < 2 || len(p.Label) > 120 || (p.Kind != "department" && p.Kind != "position" && p.Kind != "job_role") {
			return nil, invalid("Danh mục không hợp lệ")
		}
		_, e = tx.ExecContext(ctx, `INSERT INTO "_ORGDirectory"("Kind","Key","Label") VALUES($1,$2,$3) ON CONFLICT("Kind","Key") DO UPDATE SET "Label"=excluded."Label"`, p.Kind, p.Key, strings.TrimSpace(p.Label))
		if e == nil {
			catKey := p.Kind
			if catKey == "job_role" {
				catKey = "businessRole"
			}
			_, _ = tx.ExecContext(ctx, `INSERT INTO "_SYSCatalogOption"("CatalogKey","Value","Label","Enabled","SortOrder","CreatedBy","UpdatedBy") VALUES($1,$2,$3,true,99,(SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1),(SELECT "IdSeq" FROM "_SYSActorDirectory" LIMIT 1)) ON CONFLICT("CatalogKey","Value") DO UPDATE SET "Label"=excluded."Label","Enabled"=true`, catKey, p.Key, strings.TrimSpace(p.Label))
		}
		resource = p.Kind + ":" + p.Key
	case "user_create":
		var p struct {
			Username string `json:"username"`
			Name     string `json:"name"`
			Password string `json:"password"`
			Email    string `json:"email"`
		}
		if json.Unmarshal(raw, &p) != nil {
			return nil, invalid("Invalid user")
		}
		p.Username = strings.ToLower(strings.TrimSpace(p.Username))
		if !regexp.MustCompile(`^[a-z0-9][a-z0-9._@+-]{2,63}$`).MatchString(p.Username) || len(strings.TrimSpace(p.Name)) < 2 || len(p.Name) > 120 || len(p.Password) < 12 || len(p.Password) > 72 {
			return nil, invalid("Tài khoản 3–64 ký tự, họ tên 2–120 ký tự, mật khẩu 12–72 byte")
		}
		if p.Email != "" {
			parsed, err := mail.ParseAddress(strings.TrimSpace(p.Email))
			if err != nil || parsed.Address != strings.TrimSpace(p.Email) || len(p.Email) > 254 {
				return nil, invalid("Email liên hệ không hợp lệ")
			}
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(p.Password), 12)
		if err != nil {
			return nil, err
		}
		resource = uuid.Must(uuid.NewV7()).String()
		_, e = tx.ExecContext(ctx, `INSERT INTO "_USRAccountDirectory"("Id","Email","Username","Name","PasswordHash","ContactEmail","Enabled","Approved","RegistrationSource") VALUES($1,$2,$2,$3,$4,$5,true,true,'admin')`, resource, p.Username, strings.TrimSpace(p.Name), string(hash), strings.TrimSpace(p.Email))
	case "user_update":
		var p struct {
			IDs          []string `json:"ids"`
			Name         *string  `json:"name"`
			Department   *string  `json:"department"`
			Position     *string  `json:"position"`
			JobRole      *string  `json:"job_role"`
			Enabled      *bool    `json:"enabled"`
			Phone        *string  `json:"phone"`
			ContactEmail *string  `json:"contact_email"`
			Password     *string  `json:"password"`
		}
		if json.Unmarshal(raw, &p) != nil || len(p.IDs) < 1 || len(p.IDs) > 200 {
			return nil, invalid("Chọn 1–200 tài khoản")
		}
		seen := map[string]bool{}
		for _, id := range p.IDs {
			if _, err := uuid.Parse(id); err != nil || seen[id] {
				return nil, invalid("Tài khoản không hợp lệ hoặc trùng lặp")
			}
			seen[id] = true
		}
		if p.Name != nil && (len(p.IDs) != 1 || len(strings.TrimSpace(*p.Name)) < 2 || len(*p.Name) > 120) {
			return nil, invalid("Họ tên không hợp lệ")
		}
		for kind, value := range map[string]*string{"department": p.Department, "position": p.Position, "job_role": p.JobRole} {
			if value != nil && *value != "" {
				var exists bool
				if err := tx.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM "_ORGDirectory" WHERE "Kind"=$1 AND "Key"=$2 AND "Enabled")`, kind, *value); err != nil {
					return nil, err
				}
				if !exists {
					return nil, invalid("Giá trị danh mục không hợp lệ")
				}
			}
		}
		if p.Password != nil && *p.Password != "" {
			if len(p.IDs) != 1 {
				return nil, invalid("Chỉ có thể đặt lại mật khẩu cho từng tài khoản")
			}
			if len(*p.Password) < 12 || len(*p.Password) > 72 {
				return nil, invalid("Mật khẩu mới cần từ 12–72 byte")
			}
			var targetRole string
			if err := tx.GetContext(ctx, &targetRole, `SELECT "Role" FROM "_USRAccountDirectory" WHERE "Id"=$1`, p.IDs[0]); err != nil {
				return nil, err
			}
			if targetRole == "admin" && u.Role != "admin" {
				return nil, status.Error(codes.PermissionDenied, "Chỉ quản trị viên mới có thể đặt lại mật khẩu của quản trị viên")
			}
			hash, err := bcrypt.GenerateFromPassword([]byte(*p.Password), 12)
			if err != nil {
				return nil, err
			}
			if _, err := tx.ExecContext(ctx, `UPDATE "_USRAccountDirectory" SET "PasswordHash"=$2 WHERE "Id"=$1`, p.IDs[0], string(hash)); err != nil {
				return nil, err
			}
			if _, e = tx.ExecContext(ctx, `UPDATE "_USRSession" SET "Revoked"=true WHERE "UserId"=$1`, p.IDs[0]); e != nil {
				return nil, e
			}
			if _, e = tx.ExecContext(ctx, `INSERT INTO "_SECAuditLog"("ActorId","Operation","Resource") VALUES($1,'admin_password_reset',$2)`, u.ID, p.IDs[0]); e != nil {
				return nil, e
			}
		}
		if p.Enabled != nil && !*p.Enabled {
			var protected int
			if err := tx.GetContext(ctx, &protected, `SELECT count(*) FROM "_USRAccountDirectory" WHERE "Id"=ANY($1) AND ("Role"='admin' OR "Id"=$2)`, pq.Array(p.IDs), u.ID); err != nil {
				return nil, err
			}
			if protected > 0 {
				return nil, status.Error(codes.FailedPrecondition, "Không thể khóa chính mình hoặc quản trị viên tại đây")
			}
		}
		result, err := tx.ExecContext(ctx, `UPDATE "_USRAccountDirectory" SET "Name"=COALESCE($2,"Name"),"Department"=COALESCE($3,"Department"),"Position"=COALESCE($4,"Position"),"JobRole"=COALESCE($5,"JobRole"),"Enabled"=COALESCE($6,"Enabled"),"Phone"=COALESCE($7,"Phone"),"ContactEmail"=COALESCE($8,"ContactEmail") WHERE "Id"=ANY($1)`, pq.Array(p.IDs), p.Name, p.Department, p.Position, p.JobRole, p.Enabled, p.Phone, p.ContactEmail)
		if err != nil {
			return nil, err
		}
		n, _ := result.RowsAffected()
		if n != int64(len(p.IDs)) {
			return nil, invalid("Một số tài khoản không tồn tại")
		}
		if p.Enabled != nil && !*p.Enabled {
			if _, e = tx.ExecContext(ctx, `UPDATE "_USRSession" SET "Revoked"=true WHERE "UserId"=ANY($1)`, pq.Array(p.IDs)); e != nil {
				return nil, e
			}
			if _, e = tx.ExecContext(ctx, `INSERT INTO "_SECAuditLog"("ActorId","Operation","Resource") VALUES($1,'user_lock',$2)`, u.ID, strings.Join(p.IDs, ",")); e != nil {
				return nil, e
			}
		} else if p.Enabled != nil && *p.Enabled {
			if _, e = tx.ExecContext(ctx, `INSERT INTO "_SECAuditLog"("ActorId","Operation","Resource") VALUES($1,'user_unlock',$2)`, u.ID, strings.Join(p.IDs, ",")); e != nil {
				return nil, e
			}
		}
		resource = strings.Join(p.IDs, ",")
	case "group_save":
		var p PermissionGroup
		if json.Unmarshal(raw, &p) != nil || !regexp.MustCompile(`^[a-z][a-z0-9_]{1,47}$`).MatchString(p.Key) || len(strings.TrimSpace(p.Label)) < 2 || len(p.Label) > 120 || len(p.Permissions) > 100 {
			return nil, invalid("Mã/tên nhóm hoặc số quyền không hợp lệ")
		}
		if e = validateDirectory(ctx, tx, p.Department, p.Position, p.JobRole); e != nil {
			return nil, e
		}
		seen := map[string]bool{}
		for _, perm := range p.Permissions {
			if seen[perm.Module] {
				return nil, invalid("Module bị trùng trong nhóm")
			}
			seen[perm.Module] = true
			var actsRaw []byte
			if e = tx.QueryRowContext(ctx, `SELECT "Actions" FROM "_SECPermissionDirectory" WHERE "Key"=$1 AND "Enabled" FOR UPDATE`, perm.Module).Scan(&actsRaw); e != nil {
				return nil, invalid("Module không hợp lệ")
			}
			var acts []string
			json.Unmarshal(actsRaw, &acts)
			allowed := map[string]bool{}
			for _, a := range acts {
				allowed[a] = true
			}
			used := map[string]bool{}
			for _, a := range perm.Actions {
				if !allowed[a] || used[a] {
					return nil, invalid("Quyền không thuộc module hoặc bị trùng")
				}
				used[a] = true
			}
		}
		_, e = tx.ExecContext(ctx, `INSERT INTO "_SECGroupDirectory"("Key","Label","Enabled","Department","Position","JobRole") VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT("Key") DO UPDATE SET "Label"=excluded."Label","Enabled"=excluded."Enabled","Department"=excluded."Department","Position"=excluded."Position","JobRole"=excluded."JobRole"`, p.Key, strings.TrimSpace(p.Label), p.Enabled, p.Department, p.Position, p.JobRole)
		if e != nil {
			return nil, e
		}
		if _, e = tx.ExecContext(ctx, `DELETE FROM "_SECGroupPermission" WHERE "GroupKey"=$1`, p.Key); e != nil {
			return nil, e
		}
		for _, perm := range p.Permissions {
			for _, a := range perm.Actions {
				if _, e = tx.ExecContext(ctx, `INSERT INTO "_SECGroupPermission"("GroupKey","ModuleKey","Action") VALUES($1,$2,$3)`, p.Key, perm.Module, a); e != nil {
					return nil, e
				}
			}
		}
		resource = p.Key
	case "group_delete":
		var p struct {
			Key string `json:"key"`
		}
		if json.Unmarshal(raw, &p) != nil {
			return nil, invalid("Invalid group")
		}
		result, err := tx.ExecContext(ctx, `DELETE FROM "_SECGroupDirectory" WHERE "Key"=$1`, p.Key)
		if err != nil {
			return nil, err
		}
		n, _ := result.RowsAffected()
		if n != 1 {
			return nil, status.Error(codes.NotFound, "Nhóm không tồn tại")
		}
		resource = p.Key
	case "group_members":
		var p struct {
			Key    string   `json:"key"`
			Keys   []string `json:"keys"`
			IDs    []string `json:"ids"`
			Remove bool     `json:"remove"`
		}
		fmt.Printf("[group_members] raw=%s\n", string(raw))
		if json.Unmarshal(raw, &p) != nil || len(p.IDs) < 1 || len(p.IDs) > 200 {
			fmt.Printf("[group_members] validation failed: len(IDs)=%d, err=%v\n", len(p.IDs), json.Unmarshal(raw, &p))
			return nil, invalid("Chọn 1–200 tài khoản")
		}
		if len(p.Keys) == 0 && p.Key != "" {
			p.Keys = []string{p.Key}
		}
		if len(p.Keys) < 1 || len(p.Keys) > 50 {
			return nil, invalid("Chọn 1–50 nhóm quyền")
		}
		var exists bool
		seenGroups := map[string]bool{}
		for _, key := range p.Keys {
			if seenGroups[key] {
				return nil, invalid("Nhóm quyền bị trùng")
			}
			seenGroups[key] = true
			if e = tx.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM "_SECGroupDirectory" WHERE "Key"=$1)`, key); e != nil || !exists {
				return nil, invalid("Nhóm không tồn tại")
			}
		}
		seen := map[string]bool{}
		for _, id := range p.IDs {
			if _, err := uuid.Parse(id); err != nil || seen[id] {
				return nil, invalid("Tài khoản không hợp lệ hoặc trùng")
			}
			seen[id] = true
			if e = tx.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM "_USRAccountDirectory" WHERE "Id"=$1)`, id); e != nil || !exists {
				return nil, invalid("Tài khoản không tồn tại")
			}
			for _, key := range p.Keys {
				if p.Remove {
					_, e = tx.ExecContext(ctx, `DELETE FROM "_SECGroupMember" WHERE "GroupKey"=$1 AND "UserId"=$2`, key, id)
				} else {
					_, e = tx.ExecContext(ctx, `INSERT INTO "_SECGroupMember"("GroupKey","UserId") VALUES($1,$2) ON CONFLICT DO NOTHING`, key, id)
				}
				if e != nil {
					return nil, e
				}
			}
		}
		resource = strings.Join(p.Keys, ",") + ":" + strings.Join(p.IDs, ",")
	}
	if e != nil {
		return nil, status.Error(codes.AlreadyExists, "Dữ liệu đã tồn tại hoặc không hợp lệ")
	}
	if _, e = tx.ExecContext(ctx, `INSERT INTO "_SECAuditLog"("ActorId","Operation","Resource") VALUES($1,$2,$3)`, u.ID, action, resource); e != nil {
		return nil, e
	}
	if e = commitWrite(tx, owned); e != nil {
		return nil, e
	}
	return structpb.NewStruct(map[string]any{"ok": true})
}
