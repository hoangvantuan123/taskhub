package groups

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/domain"
	"server-task/internal/security"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// CreateGroup (A - Tạo nhóm/lớp đào tạo mới)
func (s *GroupService) CreateGroup(ctx context.Context, u *security.UserContext, g *domain.TrainingGroup) (*domain.TrainingGroup, error) {
	if g.Code == "" || g.Name == "" {
		return nil, errors.New("mã và tên nhóm đào tạo là bắt buộc")
	}

	g.IdSeq = uuid.New().String()
	now := time.Now()
	if g.Status == "" {
		g.Status = "active"
	}

	query := `
		INSERT INTO "_TRNGroup" (
			"IdSeq", "Code", "Name", "LeaderId", "LeaderName", "Description",
			"Status", "CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion"
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1)
		RETURNING "CreatedAt", "UpdatedAt", "RowVersion"`

	err := s.db.QueryRowxContext(ctx, query,
		g.IdSeq, g.Code, g.Name, g.LeaderId, g.LeaderName, g.Description,
		g.Status, u.UserId, u.UserId, now, now,
	).Scan(&g.CreatedAt, &g.UpdatedAt, &g.RowVersion)

	if err != nil {
		s.log.Error("Failed to create training group", zap.Error(err))
		return nil, fmt.Errorf("không thể tạo nhóm đào tạo: %w", err)
	}

	return g, nil
}

// AddMember (A - Thêm học viên vào nhóm)
func (s *GroupService) AddMember(ctx context.Context, u *security.UserContext, groupId, userId string) error {
	if groupId == "" || userId == "" {
		return errors.New("groupId và userId không được để trống")
	}

	query := `
		INSERT INTO "_TRNGroupMember" ("GroupId", "UserId", "AddedAt")
		VALUES ($1, $2, now())
		ON CONFLICT ("GroupId", "UserId") DO NOTHING`

	_, err := s.db.ExecContext(ctx, query, groupId, userId)
	if err != nil {
		s.log.Error("Failed to add member to group", zap.Error(err))
		return fmt.Errorf("không thể thêm thành viên vào nhóm: %w", err)
	}

	return nil
}
