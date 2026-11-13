package groups

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/domain"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// UpdateGroup (U - Cập nhật thông tin nhóm đào tạo)
func (s *GroupService) UpdateGroup(ctx context.Context, u *security.UserContext, g *domain.TrainingGroup) (*domain.TrainingGroup, error) {
	if g.IdSeq == "" {
		return nil, errors.New("IdSeq nhóm không được để trống")
	}

	query := `
		UPDATE "_TRNGroup" SET
			"Name" = $1,
			"LeaderId" = $2,
			"LeaderName" = $3,
			"Description" = $4,
			"Status" = $5,
			"UpdatedBy" = $6,
			"UpdatedAt" = now(),
			"RowVersion" = "RowVersion" + 1
		WHERE "IdSeq" = $7 AND "RowVersion" = $8
		RETURNING "UpdatedAt", "RowVersion"`

	err := s.db.QueryRowxContext(ctx, query,
		g.Name, g.LeaderId, g.LeaderName, g.Description, g.Status,
		u.UserId, g.IdSeq, g.RowVersion,
	).Scan(&g.UpdatedAt, &g.RowVersion)

	if err != nil {
		s.log.Error("Failed to update training group", zap.Error(err))
		return nil, fmt.Errorf("cập nhật nhóm đào tạo thất bại: %w", err)
	}

	return g, nil
}
