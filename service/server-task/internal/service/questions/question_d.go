package questions

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/security"

	"go.uber.org/zap"
)

// DeleteQuestion (D - Xóa câu hỏi)
func (s *QuestionService) DeleteQuestion(ctx context.Context, u *security.UserContext, questionId string) error {
	if questionId == "" {
		return errors.New("questionId không được để trống")
	}

	// Kiểm tra xem câu hỏi có đang được dùng trong bộ đề nào không
	var inAssessment bool
	_ = s.db.GetContext(ctx, &inAssessment, `SELECT EXISTS(SELECT 1 FROM "_ASMAssessment" WHERE $1 = ANY("QuestionIds"))`, questionId)
	if inAssessment {
		return errors.New("không thể xóa câu hỏi đang được sử dụng trong bộ đề thi")
	}

	res, err := s.db.ExecContext(ctx, `DELETE FROM "_QSTQuestion" WHERE "IdSeq" = $1`, questionId)
	if err != nil {
		s.log.Error("Failed to delete question", zap.Error(err))
		return fmt.Errorf("xóa câu hỏi thất bại: %w", err)
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		return errors.New("không tìm thấy câu hỏi để xóa")
	}

	return nil
}

// DeleteFolder (D - Xóa thư mục câu hỏi)
func (s *QuestionService) DeleteFolder(ctx context.Context, u *security.UserContext, folderId string) error {
	if folderId == "" {
		return errors.New("folderId không được để trống")
	}

	// Đưa câu hỏi trong folder này về NULL
	_, _ = s.db.ExecContext(ctx, `UPDATE "_QSTQuestion" SET "FolderId" = NULL WHERE "FolderId" = $1`, folderId)

	res, err := s.db.ExecContext(ctx, `DELETE FROM "_QSTFolder" WHERE "IdSeq" = $1`, folderId)
	if err != nil {
		return err
	}

	affected, _ := res.RowsAffected()
	if affected == 0 {
		return errors.New("không tìm thấy thư mục để xóa")
	}

	return nil
}
