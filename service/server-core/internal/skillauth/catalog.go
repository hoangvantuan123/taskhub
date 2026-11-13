package skillauth

import (
	"context"
	_ "embed"
	"encoding/json"
	"regexp"
	"strings"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"
)

//go:embed catalog_schema.sql
var CatalogSchema string

type catalogOption struct {
	RowAuditFields
	ID         string `json:"id"`
	ParentID   string `json:"parentId,omitempty"`
	ParentName string `json:"parentName,omitempty"`
	Value      string `json:"value"`
	Label      string `json:"label"`
	Active     bool   `json:"active"`
}

func catalogPermissions(key, action string) []string {
	training := key == "level" || key == "question_format" || key == "specialty" || key == "question_topic" || key == "target_group" || key == "cognitive_level" || key == "assessment_type"
	if action == "catalog_get" {
		if training {
			return []string{"questions:view", "questions:create", "questions:update"}
		}
		return []string{"catalog:view"}
	}
	if action == "catalog_save" {
		if training {
			return []string{"questions:create", "questions:update"}
		}
		return []string{"catalog:update"}
	}
	return nil
}

func (s *Server) catalogAction(ctx context.Context, u account, action string, payload any) (*structpb.Struct, error) {
	var scope struct {
		Key string `json:"key"`
	}
	scopeRaw, scopeError := json.Marshal(payload)
	if scopeError != nil || json.Unmarshal(scopeRaw, &scope) != nil {
		return nil, invalid("Danh mục không hợp lệ")
	}
	permissions := catalogPermissions(scope.Key, action)
	if len(permissions) == 0 {
		return nil, invalid("Unknown catalog operation")
	}
	authorized := false
	for _, permission := range permissions {
		if s.allowed(ctx, u, permission) {
			authorized = true
			break
		}
	}
	if !authorized {
		return nil, status.Error(codes.PermissionDenied, "Bạn không có quyền "+strings.Join(permissions, " hoặc "))
	}
	if action == "catalog_get" {
		var key string
		raw, err := json.Marshal(payload)
		if err != nil {
			return nil, invalid("Danh mục không hợp lệ")
		}
		var request struct {
			Key string `json:"key"`
		}
		if err = json.Unmarshal(raw, &request); err != nil {
			return nil, invalid("Danh mục không hợp lệ")
		}
		key = request.Key
		if !validCatalogKey(key) || len(key) > 48 {
			return nil, invalid("Mã danh mục không hợp lệ")
		}
		var label string
		var directoryAudit []byte
		if err := s.DB.QueryRowxContext(ctx, `SELECT c."Label",`+auditJSON("c")+` FROM "_SYSCatalogDirectory" c WHERE c."Key"=$1`, key).Scan(&label, &directoryAudit); err != nil {
			return nil, status.Error(codes.NotFound, "Không tìm thấy danh mục")
		}
		rows, err := s.DB.QueryContext(ctx, `SELECT o."IdSeq",COALESCE(o."ParentId"::text,''),COALESCE((SELECT p."Label" FROM "_SYSCatalogOption" p WHERE p."IdSeq"=o."ParentId"),''),o."Value",o."Label",o."Enabled",`+auditJSON("o")+` FROM "_SYSCatalogOption" o WHERE o."CatalogKey"=$1 ORDER BY o."SortOrder",o."Value"`, key)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		options := []catalogOption{}
		for rows.Next() {
			var option catalogOption
			var auditRaw []byte
			if err = rows.Scan(&option.ID, &option.ParentID, &option.ParentName, &option.Value, &option.Label, &option.Active, &auditRaw); err != nil {
				return nil, err
			}
			if err = json.Unmarshal(auditRaw, &option.RowAuditFields); err != nil {
				return nil, err
			}
			options = append(options, option)
		}
		if err = rows.Err(); err != nil {
			return nil, err
		}
		var directoryFields RowAuditFields
		if err = json.Unmarshal(directoryAudit, &directoryFields); err != nil {
			return nil, err
		}
		return jsonReply(map[string]any{"data": map[string]any{"key": key, "label": label, "options": options, "CreatedBy": directoryFields.CreatedBy, "UpdatedBy": directoryFields.UpdatedBy, "CreatedByName": directoryFields.CreatedByName, "UpdatedByName": directoryFields.UpdatedByName, "CreatedAt": directoryFields.CreatedAt, "UpdatedAt": directoryFields.UpdatedAt}})
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, invalid("Danh mục không hợp lệ")
	}
	var input struct {
		Key     string          `json:"key"`
		Label   string          `json:"label"`
		Options []catalogOption `json:"options"`
	}
	if err = json.Unmarshal(raw, &input); err != nil {
		return nil, invalid("Danh mục không hợp lệ")
	}
	if len(input.Key) > 48 || !validCatalogKey(input.Key) {
		return nil, invalid("Mã danh mục không hợp lệ")
	}
	var categoryExists bool
	if err := s.DB.GetContext(ctx, &categoryExists, `SELECT EXISTS(SELECT 1 FROM "_SYSCatalogDirectory" WHERE "Key"=$1)`, input.Key); err != nil {
		return nil, err
	}
	if !categoryExists {
		return nil, status.Error(codes.NotFound, "Không tìm thấy danh mục")
	}
	input.Label = strings.TrimSpace(input.Label)
	if len([]rune(input.Label)) < 2 || len([]rune(input.Label)) > 120 || len(input.Options) == 0 || len(input.Options) > 200 {
		return nil, invalid("Tên danh mục hoặc số lượng giá trị không hợp lệ")
	}
	seen := map[string]bool{}
	enabled := false
	for i := range input.Options {
		o := &input.Options[i]
		o.Value = strings.TrimSpace(o.Value)
		o.Label = strings.TrimSpace(o.Label)
		if !validCatalogValue(o.Value) || o.Label == "" || len([]rune(o.Label)) > 240 || seen[strings.ToLower(o.Value)] {
			return nil, invalid("Mỗi giá trị cần mã hợp lệ, tên hiển thị và mã không trùng")
		}
		seen[strings.ToLower(o.Value)] = true
		if input.Key == "question_topic" {
			if o.ParentID == "" {
				return nil, invalid("Mỗi chủ đề cần liên kết với một chuyên môn")
			}
			var parentExists bool
			if err = s.DB.GetContext(ctx, &parentExists, `SELECT EXISTS(SELECT 1 FROM "_SYSCatalogOption" WHERE "IdSeq"=$1 AND "CatalogKey"='specialty' AND ("Enabled" OR NOT $2))`, o.ParentID, o.Active); err != nil {
				return nil, err
			}
			if !parentExists {
				return nil, invalid("Chuyên môn liên kết không tồn tại hoặc đã ngừng sử dụng")
			}
		} else if o.ParentID != "" {
			return nil, invalid("Chỉ danh mục chủ đề được phép liên kết chuyên môn")
		}
		enabled = enabled || o.Active
	}
	if !enabled {
		return nil, invalid("Cần giữ ít nhất một giá trị đang sử dụng")
	}
	if input.Key == "specialty" {
		for _, option := range input.Options {
			if option.Active {
				continue
			}
			var hasActiveTopics bool
			if err = s.DB.GetContext(ctx, &hasActiveTopics, `SELECT EXISTS(SELECT 1 FROM "_SYSCatalogOption" parent JOIN "_SYSCatalogOption" child ON child."ParentId"=parent."IdSeq" WHERE parent."CatalogKey"='specialty' AND parent."Value"=$1 AND child."CatalogKey"='question_topic' AND child."Enabled")`, option.Value); err != nil {
				return nil, err
			}
			if hasActiveTopics {
				return nil, status.Errorf(codes.FailedPrecondition, "Hãy ngừng sử dụng các chủ đề thuộc chuyên môn %s trước", option.Value)
			}
		}
	}
	tx, err := s.DB.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var actor string
	if err = tx.GetContext(ctx, &actor, `SELECT "IdSeq" FROM "_USRAccountDirectory" WHERE "Id"=$1`, u.ID); err != nil {
		return nil, err
	}
	if _, err = tx.ExecContext(ctx, `SELECT set_config('app.actor_seq',$1,true)`, actor); err != nil {
		return nil, err
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO "_SYSCatalogDirectory"("Key","Label") VALUES($1,$2) ON CONFLICT("Key") DO UPDATE SET "Label"=excluded."Label","UpdatedAt"=now()`, input.Key, input.Label); err != nil {
		return nil, err
	}
	rows, err := tx.QueryContext(ctx, `SELECT "Value" FROM "_SYSCatalogOption" WHERE "CatalogKey"=$1`, input.Key)
	if err != nil {
		return nil, err
	}
	existing := []string{}
	for rows.Next() {
		var value string
		if err = rows.Scan(&value); err != nil {
			rows.Close()
			return nil, err
		}
		existing = append(existing, value)
	}
	if err = rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()
	for _, value := range existing {
		if seen[strings.ToLower(value)] {
			continue
		}
		if input.Key == "specialty" {
			var hasTopics bool
			if err = tx.GetContext(ctx, &hasTopics, `SELECT EXISTS(SELECT 1 FROM "_SYSCatalogOption" parent JOIN "_SYSCatalogOption" child ON child."ParentId"=parent."IdSeq" WHERE parent."CatalogKey"='specialty' AND parent."Value"=$1 AND child."CatalogKey"='question_topic')`, value); err != nil {
				return nil, err
			}
			if hasTopics {
				return nil, status.Errorf(codes.FailedPrecondition, "Không thể xoá chuyên môn %s vì đang có chủ đề liên kết", value)
			}
		}
		var references []string
		refRows, e := tx.QueryContext(ctx, `SELECT table_name||'.'||column_name||' ('||reference_count||')' FROM "_SYSFindCatalogReferences"($1,$2)`, input.Key, value)
		if e != nil {
			return nil, e
		}
		for refRows.Next() {
			var ref string
			if e = refRows.Scan(&ref); e != nil {
				refRows.Close()
				return nil, e
			}
			references = append(references, ref)
		}
		e = refRows.Err()
		refRows.Close()
		if e != nil {
			return nil, e
		}
		if len(references) > 0 {
			return nil, status.Errorf(codes.FailedPrecondition, "Không thể xoá mã %s vì đang được tham chiếu tại: %s", value, strings.Join(references, ", "))
		}
		if _, err = tx.ExecContext(ctx, `DELETE FROM "_SYSCatalogOption" WHERE "CatalogKey"=$1 AND "Value"=$2`, input.Key, value); err != nil {
			return nil, err
		}
	}
	for i, o := range input.Options {
		if _, err = tx.ExecContext(ctx, `INSERT INTO "_SYSCatalogOption"("CatalogKey","ParentId","Value","Label","Enabled","SortOrder","CreatedBy","UpdatedBy") VALUES($1,NULLIF($2,'')::uuid,$3,$4,$5,$6,$7,$7) ON CONFLICT("CatalogKey","Value") DO UPDATE SET "ParentId"=excluded."ParentId","Label"=excluded."Label","Enabled"=excluded."Enabled","SortOrder"=excluded."SortOrder","UpdatedBy"=excluded."UpdatedBy"`, input.Key, o.ParentID, o.Value, o.Label, o.Active, i+1, actor); err != nil {
			return nil, err
		}
	}
	// Synchronize organization directory for department, position, and job_role
	var orgKind string
	switch input.Key {
	case "department":
		orgKind = "department"
	case "position":
		orgKind = "position"
	case "businessRole", "job_role":
		orgKind = "job_role"
	}
	if orgKind != "" {
		for _, o := range input.Options {
			if _, err = tx.ExecContext(ctx, `INSERT INTO "_ORGDirectory"("Kind","Key","Label","Enabled","CreatedBy","UpdatedBy") VALUES($1,$2,$3,$4,$5,$5) ON CONFLICT("Kind","Key") DO UPDATE SET "Label"=excluded."Label","Enabled"=excluded."Enabled","UpdatedBy"=excluded."UpdatedBy"`, orgKind, o.Value, o.Label, o.Active, actor); err != nil {
				return nil, err
			}
		}
	}
	for i := range input.Options {
		if err = tx.GetContext(ctx, &input.Options[i].ID, `SELECT "IdSeq"::text FROM "_SYSCatalogOption" WHERE "CatalogKey"=$1 AND "Value"=$2`, input.Key, input.Options[i].Value); err != nil {
			return nil, err
		}
	}
	if _, err = tx.ExecContext(ctx, `UPDATE "_SYSCatalogDirectory" SET "UpdatedBy"=$2 WHERE "Key"=$1`, input.Key, actor); err != nil {
		return nil, err
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO "_SECAuditLog"("ActorId","Operation","Resource") VALUES($1,'catalog_save',$2)`, u.ID, input.Key); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return jsonReply(map[string]any{"ok": true, "data": map[string]any{"key": input.Key, "label": input.Label, "options": input.Options}})
}

func validCatalogKey(value string) bool {
	return regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_-]{0,47}$`).MatchString(value)
}
func validCatalogValue(value string) bool {
	return value != "" && len(value) <= 64 && strings.IndexFunc(value, func(r rune) bool {
		return !(r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '_' || r == '-')
	}) < 0
}
