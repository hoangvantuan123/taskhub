package groups

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// DeleteGroup (D - Xóa nhóm đào tạo)
func (s *GroupService) DeleteGroup(ctx context.Context, u *security.UserContext, groupId string) error {
	if groupId == "" {
		return errors.New("groupId không được để trống")
	}

	// Xóa các thành viên trong nhóm trước
	_, _ = s.db.ExecContext(ctx, `DELETE FROM "_TRNGroupMember" WHERE "GroupId" = $1`, groupId)

	res, err := s.db.ExecContext(ctx, `DELETE FROM "_TRNGroup" WHERE "IdSeq" = $1`, groupId)
	if err != nil {
		s.log.Error("Failed to delete training group", zap.Error(err))
		return fmt.Errorf("xóa nhóm đào tạo thất bại: %w", err)
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		return errors.New("không tìm thấy nhóm để xóa")
	}

	return nil
}

// RemoveMember (D - Xóa học viên khỏi nhóm)
func (s *GroupService) RemoveMember(ctx context.Context, u *security.UserContext, groupId, userId string) error {
	if groupId == "" || userId == "" {
		return errors.New("groupId và userId không được để trống")
	}

	_, err := s.db.ExecContext(ctx, `DELETE FROM "_TRNGroupMember" WHERE "GroupId" = $1 AND "UserId" = $2`, groupId, userId)
	if err != nil {
		s.log.Error("Failed to remove member from group", zap.Error(err))
		return fmt.Errorf("không thể xóa học viên khỏi nhóm: %w", err)
	}

	return nil
}
