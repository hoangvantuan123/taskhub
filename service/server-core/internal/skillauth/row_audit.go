package skillauth

import (
	"context"
	"database/sql"
	"encoding/json"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"sort"
	"strconv"
	"strings"
)

type rowCondition struct{ Table, ID, Version string }
type writeContext struct {
	Condition *rowCondition
	Operation string
	Tx        *sqlx.Tx
}
type writeContextKey struct{}

func withRowCondition(ctx context.Context, table, id, version, operation string) context.Context {
	return context.WithValue(ctx, writeContextKey{}, writeContext{Condition: &rowCondition{table, id, version}, Operation: operation})
}
func validRowVersion(value string) bool {
	v, e := strconv.ParseInt(value, 10, 64)
	return e == nil && v > 0
}
func versionConflict() error {
	return status.Error(codes.Aborted, "Dữ liệu đã được người khác thay đổi. Vui lòng tải lại trước khi lưu hoặc xóa.")
}
func setActor(ctx context.Context, tx *sqlx.Tx, u account) error {
	var actor string
	if e := tx.GetContext(ctx, &actor, `SELECT "IdSeq" FROM "_USRAccountDirectory" WHERE "Id"=$1`, u.ID); e != nil {
		return e
	}
	id, e := uuid.Parse(actor)
	if e != nil || id.Version() != 7 {
		return status.Error(codes.Internal, "Actor must be UUIDv7")
	}
	_, e = tx.ExecContext(ctx, `SELECT set_config('app.actor_seq',$1,true)`, actor)
	return e
}
func lockRowVersion(ctx context.Context, tx *sqlx.Tx, c rowCondition) error {
	if !validRowVersion(c.Version) {
		return invalid("RowVersion bắt buộc khi sửa hoặc xóa")
	}
	// Physical table names only originate in the registered resource/legacy maps.
	if !strings.HasPrefix(c.Table, "_") || strings.ContainsAny(c.Table, `";`) {
		return invalid("Invalid resource")
	}
	var current string
	e := tx.GetContext(ctx, &current, `SELECT "RowVersion"::text FROM "`+c.Table+`" WHERE "IdSeq"=$1 FOR UPDATE`, c.ID)
	if e == sql.ErrNoRows {
		return status.Error(codes.NotFound, "Không tìm thấy bản ghi")
	}
	if e != nil {
		return e
	}
	if current != c.Version {
		return versionConflict()
	}
	var raw string
	if e = tx.GetContext(ctx, &raw, `SELECT COALESCE(NULLIF(current_setting('app.expected_versions',true),''),'{}')`); e != nil {
		return e
	}
	expected := map[string]string{}
	if e = json.Unmarshal([]byte(raw), &expected); e != nil {
		return e
	}
	expected[c.ID] = c.Version
	encoded, _ := json.Marshal(expected)
	_, e = tx.ExecContext(ctx, `SELECT set_config('app.expected_versions',$1,true)`, string(encoded))
	return e
}
func configureWrite(ctx context.Context, tx *sqlx.Tx, u account) error {
	if e := setActor(ctx, tx, u); e != nil {
		return e
	}
	if w, ok := ctx.Value(writeContextKey{}).(writeContext); ok && w.Condition != nil {
		return lockRowVersion(ctx, tx, *w.Condition)
	}
	return nil
}
func payloadVersion(m map[string]any) string {
	v := m["RowVersion"]
	if v == nil {
		v = m["row_version"]
	}
	switch value := v.(type) {
	case string:
		return value
	case float64:
		if value == float64(int64(value)) {
			return strconv.FormatInt(int64(value), 10)
		}
	case json.Number:
		return value.String()
	}
	return ""
}
func legacyPreconditions(ctx context.Context, tx *sqlx.Tx, u account, operation string, payload any) error {
	if e := configureWrite(ctx, tx, u); e != nil {
		return e
	}
	if _, ok := ctx.Value(writeContextKey{}).(writeContext); ok {
		return nil
	}
	raw, _ := json.Marshal(payload)
	m := map[string]any{}
	if e := json.Unmarshal(raw, &m); e != nil {
		return invalid("Invalid payload")
	}
	guard := func(table, where string, args []any, version string, optional bool, touch bool) error {
		var id string
		e := tx.GetContext(ctx, &id, `SELECT "IdSeq" FROM "`+table+`" WHERE `+where, args...)
		if e == sql.ErrNoRows && optional {
			return nil
		}
		if e == sql.ErrNoRows {
			return status.Error(codes.NotFound, "Không tìm thấy bản ghi")
		}
		if e != nil {
			return e
		}
		if e = lockRowVersion(ctx, tx, rowCondition{table, id, version}); e != nil {
			return e
		}
		if touch {
			_, e = tx.ExecContext(ctx, `UPDATE "`+table+`" SET "RowVersion"="RowVersion" WHERE "IdSeq"=$1`, id)
		}
		return e
	}
	switch operation {
	case "group_save":
		var id string
		e := tx.GetContext(ctx, &id, `SELECT "IdSeq" FROM "_SECGroupDirectory" WHERE "Key"=$1`, m["key"])
		if e == sql.ErrNoRows {
			return nil
		}
		if e != nil {
			return e
		}
		var current string
		if err := tx.GetContext(ctx, &current, `SELECT "RowVersion"::text FROM "_SECGroupDirectory" WHERE "IdSeq"=$1 FOR UPDATE`, id); err != nil {
			return err
		}
		return nil
	case "group_delete":
		return guard("_SECGroupDirectory", `"Key"=$1`, []any{m["key"]}, payloadVersion(m), false, false)
	case "directory_save":
		return guard("_ORGDirectory", `"Kind"=$1 AND "Key"=$2`, []any{m["kind"], m["key"]}, payloadVersion(m), true, false)
	case "module_update", "module_delete":
		return guard("_SECPermissionDirectory", `"Key"=$1`, []any{m["key"]}, payloadVersion(m), false, false)
	case "user_update":
		ids := []string{}
		if list, ok := m["ids"].([]any); ok {
			for _, item := range list {
				id, ok := item.(string)
				if !ok {
					return invalid("Invalid ids")
				}
				ids = append(ids, id)
			}
		}
		sort.Strings(ids)
		versions, _ := m["RowVersions"].(map[string]any)
		if versions == nil {
			versions, _ = m["row_versions"].(map[string]any)
		}
		for _, id := range ids {
			version := payloadVersion(map[string]any{"RowVersion": versions[id]})
			if len(ids) == 1 && version == "" {
				version = payloadVersion(m)
			}
			if e := guard("_USRAccountDirectory", `"Id"=$1`, []any{id}, version, false, false); e != nil {
				return e
			}
		}
		return nil
	case "group_members":
		keys := []string{}
		if list, ok := m["keys"].([]any); ok {
			for _, item := range list {
				if key, ok := item.(string); ok {
					keys = append(keys, key)
				}
			}
		}
		if key, ok := m["key"].(string); ok && key != "" {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		for _, key := range keys {
			var id string
			e := tx.GetContext(ctx, &id, `SELECT "IdSeq" FROM "_SECGroupDirectory" WHERE "Key"=$1`, key)
			if e == sql.ErrNoRows {
				return status.Error(codes.NotFound, "Không tìm thấy nhóm quyền")
			}
			if e != nil {
				return e
			}
			var current string
			if e = tx.GetContext(ctx, &current, `SELECT "RowVersion"::text FROM "_SECGroupDirectory" WHERE "IdSeq"=$1 FOR UPDATE`, id); e != nil {
				return e
			}
			if _, e = tx.ExecContext(ctx, `UPDATE "_SECGroupDirectory" SET "RowVersion"="RowVersion" WHERE "IdSeq"=$1`, id); e != nil {
				return e
			}
		}
		return nil
	case "profile_update", "password_change":
		return guard("_USRAccountDirectory", `"Id"=$1`, []any{u.ID}, payloadVersion(m), false, false)
	case "grant_save":
		return guard("_USRAccountDirectory", `"Id"=$1`, []any{m["user_id"]}, payloadVersion(m), false, true)
	}
	return nil
}

func beginWrite(ctx context.Context, db *sqlx.DB) (*sqlx.Tx, bool, error) {
	if w, ok := ctx.Value(writeContextKey{}).(writeContext); ok && w.Tx != nil {
		return w.Tx, false, nil
	}
	tx, e := db.BeginTxx(ctx, nil)
	return tx, true, e
}
func commitWrite(tx *sqlx.Tx, owned bool) error {
	if owned {
		return tx.Commit()
	}
	return nil
}
