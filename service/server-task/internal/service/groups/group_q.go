package groups

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// ListGroups (Q - Query danh sách nhóm đào tạo)
func (s *GroupService) ListGroups(ctx context.Context, u *security.UserContext) ([]map[string]any, error) {
	query := `
		SELECT jsonb_build_object(
			'id', g."IdSeq",
			'code', g."Code",
			'name', g."Name",
			'leaderId', COALESCE(g."LeaderId"::text, ''),
			'leader', COALESCE(u."Name", g."LeaderName"),
			'description', g."Description",
			'status', g."Status",
			'memberCount', COALESCE((SELECT count(*) FROM "_TRNGroupMember" m WHERE m."GroupId"=g."IdSeq"), 0),
			'members', COALESCE((
				SELECT jsonb_agg(jsonb_build_object('id', mem."Id", 'name', mem."Name", 'email', mem."Email"))
				FROM "_TRNGroupMember" m
				JOIN "_USRAccountDirectory" mem ON mem."Id"=m."UserId"
				WHERE m."GroupId"=g."IdSeq"
			), '[]'::jsonb),
			'rowVersion', g."RowVersion",
			'createdAt', g."CreatedAt"
		)
		FROM "_TRNGroup" g
		LEFT JOIN "_USRAccountDirectory" u ON u."Id"=g."LeaderId"
		ORDER BY g."CreatedAt" DESC`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		s.log.Error("Failed to list training groups", zap.Error(err))
		return nil, fmt.Errorf("không thể lấy danh sách nhóm đào tạo: %w", err)
	}
	defer rows.Close()

	var result []map[string]any
	for rows.Next() {
		var b []byte
		if err := rows.Scan(&b); err != nil {
			return nil, err
		}
		var item map[string]any
		_ = json.Unmarshal(b, &item)
		result = append(result, item)
	}

	return result, nil
}

// GetGroupDetail (Q - Query chi tiết nhóm đào tạo)
func (s *GroupService) GetGroupDetail(ctx context.Context, u *security.UserContext, groupId string) (map[string]any, error) {
	query := `
		SELECT jsonb_build_object(
			'id', g."IdSeq",
			'code', g."Code",
			'name', g."Name",
			'leaderId', COALESCE(g."LeaderId"::text, ''),
			'leader', COALESCE(u."Name", g."LeaderName"),
			'description', g."Description",
			'status', g."Status",
			'members', COALESCE((
				SELECT jsonb_agg(jsonb_build_object(
					'id', mem."Id",
					'name', mem."Name",
					'email', mem."Email",
					'department', mem."Department",
					'position', mem."Position"
				))
				FROM "_TRNGroupMember" m
				JOIN "_USRAccountDirectory" mem ON mem."Id"=m."UserId"
				WHERE m."GroupId"=g."IdSeq"
			), '[]'::jsonb),
			'rowVersion', g."RowVersion"
		)
		FROM "_TRNGroup" g
		LEFT JOIN "_USRAccountDirectory" u ON u."Id"=g."LeaderId"
		WHERE g."IdSeq" = $1`

	var b []byte
	err := s.db.QueryRowContext(ctx, query, groupId).Scan(&b)
	if err != nil {
		return nil, errors.New("không tìm thấy nhóm đào tạo")
	}

	var res map[string]any
	_ = json.Unmarshal(b, &res)
	return res, nil
}
