package skillauth

import (
	"context"
	"github.com/jmoiron/sqlx"
)

const PermissionHierarchySchema = `CREATE TABLE IF NOT EXISTS "_SECPermissionNode"("Id" text PRIMARY KEY,"ParentId" text REFERENCES "_SECPermissionNode"("Id"),"Label" text NOT NULL,"Kind" text NOT NULL CHECK("Kind" IN ('Module','Nhóm menu','Menu / Màn hình','Chức năng','Quyền thao tác')),"Route" text NOT NULL DEFAULT '',"Description" text NOT NULL DEFAULT '',"ScopeKey" text REFERENCES "_SECPermissionDirectory"("Key"),"Action" text);`

type PermissionNode struct {
	ID          string  `json:"id"`
	ParentID    *string `json:"parent_id"`
	Label       string  `json:"label"`
	Kind        string  `json:"kind"`
	Route       string  `json:"route"`
	Description string  `json:"description"`
	ScopeKey    *string `json:"scope_key"`
	Action      *string `json:"action"`
}

func loadPermissionHierarchy(ctx context.Context, db *sqlx.DB) ([]PermissionNode, error) {
	rows, e := db.QueryContext(ctx, `SELECT "Id","ParentId","Label","Kind","Route","Description","ScopeKey","Action" FROM "_SECPermissionNode" ORDER BY "Id"`)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []PermissionNode{}
	for rows.Next() {
		var node PermissionNode
		if e = rows.Scan(&node.ID, &node.ParentID, &node.Label, &node.Kind, &node.Route, &node.Description, &node.ScopeKey, &node.Action); e != nil {
			return nil, e
		}
		out = append(out, node)
	}
	return out, rows.Err()
}
