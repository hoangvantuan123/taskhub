package skillauth

import (
	"context"
	_ "embed"
	"fmt"
	"github.com/jmoiron/sqlx"
)

var directoryRenames = map[string]string{
	"skillhub_users": "_USRAccountDirectory", "skillhub_permission_groups": "_SECGroupDirectory", "skillhub_directory": "_ORGDirectory",
	"skillhub_modules": "_SECPermissionDirectory", "skillhub_group_members": "_SECGroupMember", "skillhub_group_permissions": "_SECGroupPermission", "skillhub_grants": "_SECAccountPermission",
	"skillhub_sessions": "_USRSession", "skillhub_login_events": "_USRLoginLog", "skillhub_security_audit": "_SECAuditLog", "skillhub_permission_nodes": "_SECPermissionNode",
}

// PrepareDirectorySchema renames in place, preserving rows, indexes and FK object identities.
func PrepareDirectorySchema(ctx context.Context, db *sqlx.DB) error {
	tx, e := db.BeginTxx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	if _, e = tx.ExecContext(ctx, `SET LOCAL lock_timeout='5s'; SELECT pg_advisory_xact_lock(74921031)`); e != nil {
		return e
	}
	for old, name := range directoryRenames {
		var legacy, current bool
		if e = tx.QueryRowContext(ctx, `SELECT to_regclass($1) IS NOT NULL,to_regclass($2) IS NOT NULL`, old, `"`+name+`"`).Scan(&legacy, &current); e != nil {
			return e
		}
		if legacy && current {
			return fmt.Errorf("both legacy and canonical table exist: %s / %s", old, name)
		}
		if legacy {
			if _, e = tx.ExecContext(ctx, `ALTER TABLE "`+old+`" RENAME TO "`+name+`"`); e != nil {
				return e
			}
		}
	}
	if _, e = tx.ExecContext(ctx, ColumnSchema); e != nil {
		return e
	}
	return tx.Commit()
}

//go:embed column_schema.sql
var ColumnSchema string

//go:embed directory_schema.sql
var DirectorySchema string

//go:embed audit_schema.sql
var AuditSchema string

func InitDirectorySchema(ctx context.Context, db *sqlx.DB) error {
	if _, e := db.ExecContext(ctx, DirectorySchema); e != nil {
		return e
	}
	_, e := db.ExecContext(ctx, AuditSchema)
	return e
}
