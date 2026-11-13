package skillauth

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"
	"server-core/internal/queryspec"
	"strconv"
	"strings"
	"time"
)

type directorySpec struct {
	Table, Scope, Label string
	Columns             map[string]queryspec.Column
}

func directoryResource(resource string) (directorySpec, bool) {
	tables := map[string][3]string{"accounts": {"_USRAccountDirectory", "users", "name"}, "groups": {"_SECGroupDirectory", "permissions", "label"}, "organization": {"_ORGDirectory", "catalog", "label"}, "settings": {"_SYSSettingDirectory", "modules", "label"}}
	a, ok := tables[resource]
	if !ok {
		return directorySpec{}, false
	}
	columns := map[string]queryspec.Column{"IdSeq": {SQL: `d."IdSeq"`, Type: "uuid"}, "label": {SQL: `d."` + strings.ToUpper(a[2][:1]) + a[2][1:] + `"`, Searchable: true, Type: "text"}, "enabled": {SQL: `d."Enabled"`, Type: "bool"}}
	if resource == "accounts" {
		columns["username"] = queryspec.Column{SQL: `d."Username"`, Searchable: true, Type: "text"}
		for key, column := range map[string]queryspec.Column{
			"email":               {SQL: `COALESCE(d."Email",'')`, Searchable: true, Type: "text"},
			"contact_email":       {SQL: `COALESCE(d."ContactEmail",'')`, Searchable: true, Type: "text"},
			"phone":               {SQL: `COALESCE(d."Phone",'')`, Searchable: true, Type: "text"},
			"department":          {SQL: `d."Department"`, Searchable: true, Type: "text"},
			"position":            {SQL: `d."Position"`, Searchable: true, Type: "text"},
			"job_role":            {SQL: `d."JobRole"`, Searchable: true, Type: "text"},
			"role":                {SQL: `d."Role"`, Type: "text"},
			"approved":            {SQL: `d."Approved"`, Type: "bool"},
			"registration_source": {SQL: `d."RegistrationSource"`, Type: "text"},
			"groups":              {SQL: `COALESCE((SELECT string_agg(g."Key"||' '||g."Label",' ') FROM "_SECGroupDirectory" g WHERE g."Enabled" AND (EXISTS(SELECT 1 FROM "_SECGroupMember" gm WHERE gm."GroupKey"=g."Key" AND gm."UserId"=d."Id") OR ((g."Department"<>'' OR g."Position"<>'' OR g."JobRole"<>'') AND (g."Department"='' OR g."Department"=d."Department") AND (g."Position"='' OR g."Position"=d."Position") AND (g."JobRole"='' OR g."JobRole"=d."JobRole")))), '')`, Searchable: true, Type: "text"},
		} {
			columns[key] = column
		}
	} else {
		columns["key"] = queryspec.Column{SQL: `d."Key"`, Searchable: true, Type: "text"}
	}
	if resource == "organization" {
		columns["kind"] = queryspec.Column{SQL: `d."Kind"`, Type: "text"}
	}
	for key, column := range map[string]queryspec.Column{
		"CreatedBy": {SQL: `d."CreatedBy"`, Type: "uuid"}, "UpdatedBy": {SQL: `d."UpdatedBy"`, Type: "uuid"}, "CreatedAt": {SQL: `d."CreatedAt"`, Type: "timestamp"}, "UpdatedAt": {SQL: `d."UpdatedAt"`, Type: "timestamp"}, "RowVersion": {SQL: `d."RowVersion"`, Type: "integer"},
	} {
		columns[key] = column
	}
	for key, column := range columns {
		if column.Searchable {
			column.SearchSQL = `"_SYSNormalizeSearch"(` + column.SQL + `)`
			columns[key] = column
		}
	}
	return directorySpec{a[0], a[1], a[2], columns}, true
}

type directoryInput struct {
	Resource   string            `json:"resource"`
	RowVersion string            `json:"row_version"`
	ID         string            `json:"id_seq"`
	Record     map[string]any    `json:"record"`
	Query      queryspec.Request `json:"query"`
}

func (s *Server) directoryAction(ctx context.Context, u account, operation string, payload any) (*structpb.Struct, error) {
	b, e := json.Marshal(payload)
	if e != nil {
		return nil, invalid("Invalid directory request")
	}
	var in directoryInput
	if e = json.Unmarshal(b, &in); e != nil {
		return nil, invalid("Invalid directory request")
	}
	spec, ok := directoryResource(in.Resource)
	if !ok {
		return nil, invalid("Unknown directory resource")
	}
	action := map[string]string{"directory_a": "create", "directory_u": "update", "directory_d": "delete", "directory_q": "view"}[operation]
	if action == "" {
		return nil, invalid("Unknown operation")
	}
	required := spec.Scope + ":" + action
	if in.Resource == "groups" && action != "view" {
		required = "permissions:update"
	}
	if in.Resource == "organization" && action != "view" {
		required = "catalog:update"
	}
	if in.Resource == "settings" && action != "view" {
		required = "modules:update"
	}
	if in.Resource == "accounts" && action == "delete" {
		required = "users:update"
	}
	if !s.allowed(ctx, u, required) {
		return nil, status.Error(codes.PermissionDenied, "Không có quyền thao tác danh mục")
	}
	if operation == "directory_q" {
		return s.queryDirectory(ctx, in, spec)
	}
	if operation != "directory_a" {
		if _, e = uuid.Parse(in.ID); e != nil {
			return nil, invalid("IdSeq không hợp lệ")
		}
	}
	if operation != "directory_a" && !validRowVersion(in.RowVersion) {
		return nil, invalid("RowVersion bắt buộc khi sửa hoặc xóa")
	}
	if in.Record == nil {
		in.Record = map[string]any{}
	}
	// Mutations of security entities reuse their domain validation, password hashing and audit.
	if in.Resource == "groups" || in.Resource == "accounts" {
		return s.mutateSecurityDirectory(ctx, u, operation, in, spec)
	}
	tx, e := s.DB.BeginTxx(ctx, nil)
	if e != nil {
		return nil, e
	}
	defer tx.Rollback()
	if e = setActor(ctx, tx, u); e != nil {
		return nil, e
	}
	if operation != "directory_a" {
		if e = lockRowVersion(ctx, tx, rowCondition{spec.Table, in.ID, in.RowVersion}); e != nil {
			return nil, e
		}
	}
	id := in.ID
	if operation == "directory_d" {
		statement := `DELETE FROM "` + spec.Table + `" WHERE "IdSeq"=$1`
		if in.Resource == "organization" {
			statement = `UPDATE "` + spec.Table + `" SET "Enabled"=false WHERE "IdSeq"=$1`
		}
		result, e := tx.ExecContext(ctx, statement, id)
		if e != nil {
			return nil, e
		}
		n, _ := result.RowsAffected()
		if n == 0 {
			return nil, status.Error(codes.NotFound, "Không tìm thấy bản ghi")
		}
	} else {
		allowed := map[string]bool{"label": true, "enabled": true, "data": in.Resource != "organization", "key": operation == "directory_a", "kind": in.Resource == "organization" && operation == "directory_a"}
		for key := range in.Record {
			if !allowed[key] {
				return nil, invalid("Không hỗ trợ trường: " + key)
			}
		}
		label, _ := in.Record["label"].(string)
		label = strings.TrimSpace(label)
		if len(label) < 2 || len(label) > 240 {
			return nil, invalid("Tên cần 2–240 ký tự")
		}
		enabled := true
		if v, ok := in.Record["enabled"]; ok {
			var valid bool
			enabled, valid = v.(bool)
			if !valid {
				return nil, invalid("enabled phải là boolean")
			}
		}
		if operation == "directory_a" {
			id = uuid.Must(uuid.NewV7()).String()
			key, _ := in.Record["key"].(string)
			if key == "" {
				key = strings.ReplaceAll(id, "-", "")
			}
			if len(key) > 48 {
				return nil, invalid("Mã quá dài")
			}
			if in.Resource == "organization" {
				kind, _ := in.Record["kind"].(string)
				if kind != "department" && kind != "position" && kind != "job_role" {
					return nil, invalid("Loại tổ chức không hợp lệ")
				}
				_, e = tx.ExecContext(ctx, `INSERT INTO "`+spec.Table+`" ("IdSeq","Kind","Key","Label","Enabled") VALUES($1,$2,$3,$4,$5)`, id, kind, key, label, enabled)
			} else {
				data, _ := json.Marshal(in.Record["data"])
				if string(data) == "null" {
					data = []byte("{}")
				}
				_, e = tx.ExecContext(ctx, `INSERT INTO "`+spec.Table+`" ("IdSeq","Key","Label","Enabled","Data") VALUES($1,$2,$3,$4,$5)`, id, key, label, enabled, string(data))
			}
		} else {
			query := `UPDATE "` + spec.Table + `" SET "Label"=$2,"Enabled"=$3 WHERE "IdSeq"=$1`
			args := []any{id, label, enabled}
			if in.Resource != "organization" {
				query = `UPDATE "` + spec.Table + `" SET "Label"=$2,"Enabled"=$3,"UpdatedAt"=now()`
				if data, ok := in.Record["data"]; ok {
					raw, err := json.Marshal(data)
					if err != nil {
						return nil, invalid("Invalid data")
					}
					query += `,"Data"=$4`
					args = append(args, string(raw))
				}
				query += ` WHERE "IdSeq"=$1`
			}
			var result interface{ RowsAffected() (int64, error) }
			result, e = tx.ExecContext(ctx, query, args...)
			if e == nil {
				n, _ := result.RowsAffected()
				if n == 0 {
					return nil, status.Error(codes.NotFound, "Không tìm thấy bản ghi")
				}
			}
		}
		if e != nil {
			if pe, ok := e.(*pq.Error); ok && pe.Code == "23505" {
				return nil, status.Error(codes.AlreadyExists, "Mã danh mục đã tồn tại")
			}
			return nil, e
		}
	}
	if _, e = tx.ExecContext(ctx, `INSERT INTO "_SECAuditLog"("ActorId","Operation","Resource") VALUES($1,$2,$3)`, u.ID, operation, in.Resource+":"+id); e != nil {
		return nil, e
	}
	if e = tx.Commit(); e != nil {
		return nil, e
	}
	return s.directoryWriteReply(ctx, in.Resource, id, operation == "directory_d", in.RowVersion)
}
func directorySelect(resource string) string {
	switch resource {
	case "accounts":
		return `jsonb_build_object('IdSeq',d."IdSeq",'id',d."Id",'username',d."Username",'name',d."Name",'label',d."Name",'role',d."Role",'enabled',d."Enabled",'approved',d."Approved",'registration_source',d."RegistrationSource",'email_verified',EXISTS(SELECT 1 FROM "_USROutsideApproval" oa WHERE oa."UserId"=d."Id" AND oa."VerifiedAt" IS NOT NULL),'email',COALESCE(d."Email",''),'contact_email',COALESCE(d."ContactEmail",''),'phone',COALESCE(d."Phone",''),'department',d."Department",'position',d."Position",'job_role',d."JobRole",'groups',COALESCE((SELECT jsonb_agg(g."Key" ORDER BY g."Key") FROM "_SECGroupDirectory" g WHERE g."Enabled" AND (EXISTS(SELECT 1 FROM "_SECGroupMember" gm WHERE gm."GroupKey"=g."Key" AND gm."UserId"=d."Id") OR ((g."Department"<>'' OR g."Position"<>'' OR g."JobRole"<>'') AND (g."Department"='' OR g."Department"=d."Department") AND (g."Position"='' OR g."Position"=d."Position") AND (g."JobRole"='' OR g."JobRole"=d."JobRole")))),'[]'::jsonb),'manual_groups',COALESCE((SELECT jsonb_agg(gm."GroupKey" ORDER BY gm."GroupKey") FROM "_SECGroupMember" gm WHERE gm."UserId"=d."Id"),'[]'::jsonb),'created_at',d."CreatedAt")`
	case "groups":
		return `jsonb_build_object('IdSeq',d."IdSeq",'key',d."Key",'label',d."Label",'enabled',d."Enabled",'department',d."Department",'position',d."Position",'job_role',d."JobRole",'member_count',(SELECT count(*) FROM "_USRAccountDirectory" u WHERE ` + groupMatch + `),'permissions',COALESCE((SELECT jsonb_agg(jsonb_build_object('module',p."ModuleKey",'actions',p."Actions")) FROM (SELECT "ModuleKey",jsonb_agg("Action" ORDER BY "Action") AS "Actions" FROM "_SECGroupPermission" WHERE "GroupKey"=d."Key" GROUP BY "ModuleKey")p),'[]'::jsonb))`
	case "organization":
		return `jsonb_build_object('IdSeq',d."IdSeq",'key',d."Key",'label',d."Label",'enabled',d."Enabled",'kind',d."Kind")`
	default:
		return `jsonb_build_object('IdSeq',d."IdSeq",'key',d."Key",'label',d."Label",'enabled',d."Enabled",'data',d."Data",'created_at',d."CreatedAt",'updated_at',d."UpdatedAt")`
	}
}
func (s *Server) queryDirectory(ctx context.Context, in directoryInput, spec directorySpec) (*structpb.Struct, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	p, e := queryspec.Build(in.Query, spec.Columns, "IdSeq")
	if e != nil {
		return nil, invalid(e.Error())
	}
	base := ` FROM "` + spec.Table + `" d WHERE ` + p.Where
	// Both statements see the same snapshot, including empty pages.
	tx, e := s.DB.BeginTxx(ctx, &sql.TxOptions{ReadOnly: true, Isolation: sql.LevelRepeatableRead})
	if e != nil {
		return nil, e
	}
	defer tx.Rollback()
	var total int64
	if e = tx.GetContext(ctx, &total, "SELECT count(*)"+base, p.Args...); e != nil {
		return nil, e
	}
	args := append(append([]any{}, p.Args...), p.Limit, p.Offset)
	selectSQL := directorySelect(in.Resource) + ` || ` + auditJSON("d")
	if in.Resource == "groups" {
		selectSQL = strings.ReplaceAll(selectSQL, "g.", "d.")
	}
	queryStr := "SELECT " + selectSQL + base + " ORDER BY " + p.Order + fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)-1, len(args))
	rows, e := tx.QueryContext(ctx, queryStr, args...)
	if e != nil {
		return nil, e
	}
	items := []map[string]any{}
	for rows.Next() {
		var raw []byte
		if e = rows.Scan(&raw); e != nil {
			rows.Close()
			return nil, e
		}
		var row map[string]any
		if e = json.Unmarshal(raw, &row); e != nil {
			rows.Close()
			return nil, e
		}
		items = append(items, row)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return nil, e
	}
	if e = tx.Commit(); e != nil {
		return nil, e
	}
	return jsonReply(map[string]any{"rows": items, "total": total, "page": p.Page, "page_size": p.Limit})
}
func (s *Server) mutateSecurityDirectory(ctx context.Context, u account, op string, in directoryInput, spec directorySpec) (*structpb.Struct, error) {
	tx, e := s.DB.BeginTxx(ctx, nil)
	if e != nil {
		return nil, e
	}
	defer tx.Rollback()
	if e = setActor(ctx, tx, u); e != nil {
		return nil, e
	}
	var condition *rowCondition
	if op != "directory_a" {
		condition = &rowCondition{spec.Table, in.ID, in.RowVersion}
		if e = lockRowVersion(ctx, tx, *condition); e != nil {
			return nil, e
		}
	}
	ctx = context.WithValue(ctx, writeContextKey{}, writeContext{Condition: condition, Operation: op, Tx: tx})
	record := in.Record
	if op == "directory_a" {
		if _, ok := record["enabled"]; !ok {
			record["enabled"] = true
		}
	}
	var legacy string
	var raw []byte
	if op != "directory_a" {
		selection := strings.ReplaceAll(directorySelect(in.Resource), "g.", "d.")
		if e := tx.QueryRowContext(ctx, `SELECT `+selection+`,`+map[bool]string{true: `d."Id"::text`, false: `d."Key"`}[in.Resource == "accounts"]+` FROM "`+spec.Table+`" d WHERE d."IdSeq"=$1`, in.ID).Scan(&raw, &legacy); e != nil {
			if e == sql.ErrNoRows {
				return nil, status.Error(codes.NotFound, "Không tìm thấy bản ghi")
			}
			return nil, e
		}
	}
	allowed := map[string]bool{"label": true, "enabled": true}
	if in.Resource == "groups" {
		allowed["permissions"] = true
	} else {
		fields := []string{"name", "department", "position", "job_role"}
		if op == "directory_a" {
			fields = append(fields, "username", "password")
		}
		for _, key := range fields {
			allowed[key] = true
		}
	}
	for key := range record {
		if !allowed[key] {
			return nil, invalid("Không hỗ trợ trường: " + key)
		}
	}
	var action, key, column string
	if in.Resource == "groups" {
		column = `"Key"`
		if op == "directory_d" {
			action = "group_delete"
			record = map[string]any{"key": legacy}
		} else {
			action = "group_save"
			key = legacy
			if op == "directory_a" {
				key = "group_" + strings.ReplaceAll(uuid.Must(uuid.NewV7()).String(), "-", "")
			}
			record["key"] = key
			if op == "directory_u" {
				var old map[string]any
				json.Unmarshal(raw, &old)
				for _, field := range []string{"department", "position", "job_role", "enabled", "label"} {
					if _, ok := record[field]; !ok {
						record[field] = old[field]
					}
				}
				if _, ok := record["permissions"]; !ok {
					return nil, invalid("permissions bắt buộc khi cập nhật nhóm")
				}
			}
		}
	} else {
		column = `"Username"`
		if op == "directory_a" {
			action = "user_create"
			key, _ = record["username"].(string)
		} else {
			action = "user_update"
			record["ids"] = []string{legacy}
			if op == "directory_d" {
				record = map[string]any{"ids": []string{legacy}, "enabled": false}
			}
			var old map[string]any
			json.Unmarshal(raw, &old)
			key, _ = old["username"].(string)
		}
		if label, ok := record["label"]; ok {
			record["name"] = label
			delete(record, "label")
		}
	}

	if _, e := s.peopleAction(ctx, u, action, record); e != nil {
		return nil, e
	}
	if op == "directory_d" {
		if e = tx.Commit(); e != nil {
			return nil, e
		}
		return s.directoryWriteReply(ctx, in.Resource, in.ID, true, in.RowVersion)
	}
	var id string
	if e := tx.GetContext(ctx, &id, `SELECT "IdSeq" FROM "`+spec.Table+`" WHERE `+column+`=$1`, key); e != nil {
		return nil, e
	}
	if e = tx.Commit(); e != nil {
		return nil, e
	}
	return s.directoryWriteReply(ctx, in.Resource, id, false, in.RowVersion)
}

func (s *Server) directoryWriteReply(_ context.Context, resource, id string, deleted bool, expected string) (*structpb.Struct, error) {
	reply := map[string]any{"ok": true, "id_seq": id}
	if deleted && resource != "accounts" && resource != "organization" {
		reply["DeletedVersion"] = expected
		return jsonReply(reply)
	}
	version := int64(1)
	if expected != "" {
		prior, e := strconv.ParseInt(expected, 10, 64)
		if e != nil {
			return nil, invalid("Invalid RowVersion")
		}
		version = prior + 1
	}
	reply["RowVersion"] = strconv.FormatInt(version, 10)
	return jsonReply(reply)
}
