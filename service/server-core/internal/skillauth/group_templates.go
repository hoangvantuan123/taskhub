package skillauth

import (
	"context"
	"encoding/json"
)

type groupTemplate struct {
	Key, Label  string
	Permissions []GroupPermission
}

var defaultPermissionGroups = []groupTemplate{
	{"dept_manager", "Trưởng phòng (Department Manager)", []GroupPermission{{"tasks", []string{"view", "create", "update", "delete", "export"}}, {"approvals", []string{"view", "approve", "reject", "update"}}, {"projects", []string{"view", "create", "update", "export"}}, {"reports", []string{"view", "export"}}, {"employees", []string{"view", "create", "update", "export"}}}},
	{"project_manager", "Quản lý dự án (Project Manager)", []GroupPermission{{"tasks", []string{"view", "create", "update", "delete", "export"}}, {"approvals", []string{"view", "approve", "reject", "update"}}, {"projects", []string{"view", "create", "update", "delete", "export"}}, {"reports", []string{"view", "export"}}}},
	{"team_leader", "Trưởng nhóm (Team Leader)", []GroupPermission{{"tasks", []string{"view", "create", "update", "export"}}, {"approvals", []string{"view", "approve", "reject", "update"}}, {"projects", []string{"view"}}, {"reports", []string{"view", "export"}}, {"employees", []string{"view"}}}},
	{"employee", "Nhân viên thực hiện (Employee)", []GroupPermission{{"tasks", []string{"view", "create", "update"}}, {"approvals", []string{"view"}}, {"projects", []string{"view"}}, {"employees", []string{"view"}}}},
	{"viewer", "Người theo dõi / Kiểm toán (Viewer)", []GroupPermission{{"tasks", []string{"view"}}, {"projects", []string{"view"}}, {"reports", []string{"view"}}, {"employees", []string{"view"}}}},
}

// Seed only absent templates. Never overwrite edited groups or enroll users.
func (s *Server) InitPermissionGroups(ctx context.Context) error {
	tx, e := s.DB.BeginTxx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	for _, template := range defaultPermissionGroups {
		result, e := tx.ExecContext(ctx, `INSERT INTO "_SECGroupDirectory"("Key","Label") VALUES($1,$2) ON CONFLICT DO NOTHING`, template.Key, template.Label)
		if e != nil {
			return e
		}
		n, e := result.RowsAffected()
		if e != nil {
			return e
		}
		if n == 0 {
			continue
		}
		for _, permission := range template.Permissions {
			actions, e := json.Marshal(permission.Actions)
			if e != nil {
				return e
			}
			if _, e = tx.ExecContext(ctx, `INSERT INTO "_SECGroupPermission"("GroupKey","ModuleKey","Action") SELECT $1,m."Key",a.value FROM "_SECPermissionDirectory" m CROSS JOIN jsonb_array_elements_text($3::jsonb) a WHERE m."Key"=$2 AND m."Enabled" AND m."Actions" ? a.value ON CONFLICT DO NOTHING`, template.Key, permission.Module, string(actions)); e != nil {
				return e
			}
		}
	}
	return tx.Commit()
}
