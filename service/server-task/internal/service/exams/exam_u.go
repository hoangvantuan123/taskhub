package exams

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"server-task/internal/domain"
	"server-task/internal/security"
	"time"

	"go.uber.org/zap"
)

// UpdateSession (U - Update thông tin ca thi)
func (s *ExamService) UpdateSession(ctx context.Context, u *security.UserContext, sess *domain.ExamSession) (*domain.ExamSession, error) {
	if sess.IdSeq == "" {
		return nil, errors.New("IdSeq ca thi là bắt buộc")
	}

	query := `
		UPDATE "_ASMExamSession" SET
			"Title" = $1,
			"StartTime" = $2,
			"EndTime" = $3,
			"Location" = $4,
			"TargetScope" = $5,
			"MaxAttempts" = $6,
			"SecurityConfig" = $7,
			"Status" = $8,
			"UpdatedBy" = $9,
			"UpdatedAt" = now(),
			"RowVersion" = "RowVersion" + 1
		WHERE "IdSeq" = $10 AND "RowVersion" = $11
		RETURNING "UpdatedAt", "RowVersion"`

	err := s.db.QueryRowxContext(ctx, query,
		sess.Title, sess.StartTime, sess.EndTime, sess.Location,
		sess.TargetScope, sess.MaxAttempts, sess.SecurityConfig, sess.Status,
		u.UserId, sess.IdSeq, sess.RowVersion,
	).Scan(&sess.UpdatedAt, &sess.RowVersion)

	if err != nil {
		s.log.Error("Failed to update exam session", zap.Error(err))
		return nil, fmt.Errorf("cập nhật ca thi thất bại (có thể do phiên bản dữ liệu bị xung đột): %w", err)
	}

	return sess, nil
}

// SaveAttemptHeartbeat (U - Lưu tiến độ làm bài thi định kỳ từ Client qua Worker Pool Asynchronous để chịu tải cực lớn)
func (s *ExamService) SaveAttemptHeartbeat(
	ctx context.Context,
	u *security.UserContext,
	attemptId string,
	sessionToken string,
	answersJSON string,
	violationsJSON string,
) error {
	// 1. Kiểm tra session token nhanh
	var attempt struct {
		GradingStatus  string    `db:"GradingStatus"`
		Deadline       time.Time `db:"Deadline"`
		ViolationCount int       `db:"ViolationCount"`
	}
	err := s.db.GetContext(ctx, &attempt, `
		SELECT "GradingStatus", "Deadline", "ViolationCount" 
		FROM "_ASMExamAttempt" 
		WHERE "IdSeq" = $1 AND "SessionToken" = $2`, attemptId, sessionToken)
	if err != nil {
		return errors.New("phiên làm bài thi không hợp lệ")
	}

	if attempt.GradingStatus == "submitted" || attempt.GradingStatus == "graded" {
		return errors.New("bài thi đã được nộp, không thể cập nhật tiến độ")
	}

	now := time.Now()
	// Giới hạn 2 phút ân hạn trễ mạng
	if now.After(attempt.Deadline.Add(2 * time.Minute)) {
		return errors.New("thời gian làm bài thi đã kết thúc")
	}

	// 2. Phân tích vi phạm nếu có
	var violations []map[string]any
	_ = json.Unmarshal([]byte(violationsJSON), &violations)
	newViolationCount := len(violations)

	// 3. Tối ưu tải cao: Đẩy tác vụ ghi Heartbeat vào Worker Pool để không block I/O
	submitted := s.wp.Submit(func(wctx context.Context) error {
		query := `
			UPDATE "_ASMExamAttempt" SET
				"Answers" = COALESCE($1::jsonb, "Answers"),
				"Violations" = COALESCE($2::jsonb, "Violations"),
				"ViolationCount" = GREATEST("ViolationCount", $3),
				"UpdatedAt" = now()
			WHERE "IdSeq" = $4`

		_, err := s.db.ExecContext(wctx, query, answersJSON, violationsJSON, newViolationCount, attemptId)
		if err != nil {
			s.log.Error("Async heartbeat update error", zap.Error(err), zap.String("attemptId", attemptId))
		}
		return err
	})

	// Fallback nếu Worker Queue bị quá tải thì ghi đồng bộ
	if !submitted {
		query := `
			UPDATE "_ASMExamAttempt" SET
				"Answers" = COALESCE($1::jsonb, "Answers"),
				"Violations" = COALESCE($2::jsonb, "Violations"),
				"ViolationCount" = GREATEST("ViolationCount", $3),
				"UpdatedAt" = now()
			WHERE "IdSeq" = $4`
		_, _ = s.db.ExecContext(ctx, query, answersJSON, violationsJSON, newViolationCount, attemptId)
	}

	return nil
}

// SubmitAttempt (U - Nộp bài thi có bảo vệ chống double submit & tự động chấm điểm chính xác)
func (s *ExamService) SubmitAttempt(
	ctx context.Context,
	u *security.UserContext,
	attemptId string,
	sessionToken string,
	answersJSON string,
) (*domain.ExamAttempt, error) {
	// 1. Kiểm tra session token và trạng thái (Chống Double Submit khi click nhiều lần)
	var attempt domain.ExamAttempt
	err := s.db.GetContext(ctx, &attempt, `
		SELECT * FROM "_ASMExamAttempt" 
		WHERE "IdSeq" = $1 AND "SessionToken" = $2`, attemptId, sessionToken)
	if err != nil {
		return nil, errors.New("phiên làm bài thi không hợp lệ hoặc không tìm thấy")
	}

	// Nếu đã nộp trước đó -> trả về kết quả ngay (Idempotent)
	if attempt.GradingStatus == "submitted" || attempt.GradingStatus == "graded" {
		return &attempt, nil
	}

	now := time.Now()

	// Parse answers to compute automated grading for single_choice
	var answers map[string]any
	_ = json.Unmarshal([]byte(answersJSON), &answers)

	var hasEssay bool
	var totalScore float64
	var maxScore float64 = 10.0
	var passingScore float64 = 5.0
	var failedCriticalRule bool

	// 2. Truy vấn cấu hình bộ đề để tính điểm
	var assessment domain.Assessment
	err = s.db.GetContext(ctx, &assessment, `SELECT * FROM "_ASMAssessment" WHERE "IdSeq" = $1`, attempt.AssessmentId)
	if err == nil {
		maxScore = assessment.TotalPoints
		passingScore = assessment.PassingScore
	}

	// 3. Tự động chấm các câu hỏi trắc nghiệm trên Server (Đảm bảo an toàn 100%)
	if len(assessment.QuestionIds) > 0 {
		rows, err := s.db.QueryContext(ctx, `
			SELECT q."IdSeq", q."Type", q."Options", q."IsCritical"
			FROM "_QSTQuestion" q
			WHERE q."IdSeq" = ANY($1)`, assessment.QuestionIds)
		if err == nil {
			defer rows.Close()
			pointPerQ := maxScore
			qCount := len(assessment.QuestionIds)
			if qCount > 0 {
				pointPerQ = maxScore / float64(qCount)
			}

			for rows.Next() {
				var qId, qType string
				var optBytes []byte
				var isCritical bool
				if errScan := rows.Scan(&qId, &qType, &optBytes, &isCritical); errScan == nil {
					if qType == "essay" {
						hasEssay = true
					} else if qType == "single_choice" {
						var opts []map[string]any
						_ = json.Unmarshal(optBytes, &opts)
						userAns, hasAns := answers[qId]
						isCorrect := false
						for _, opt := range opts {
							if opt["isCorrect"] == true && hasAns && fmt.Sprint(opt["id"]) == fmt.Sprint(userAns) {
								isCorrect = true
								break
							}
						}
						if isCorrect {
							totalScore += pointPerQ
						} else if isCritical {
							failedCriticalRule = true
						}
					}
				}
			}
		}
	}

	gradingStatus := "graded"
	if hasEssay {
		gradingStatus = "needs_grading"
	}
	isPassed := totalScore >= passingScore && !failedCriticalRule

	query := `
		UPDATE "_ASMExamAttempt" SET
			"Answers" = COALESCE($1::jsonb, "Answers"),
			"SubmittedAt" = $2,
			"TotalScore" = $3,
			"MaxScore" = $4,
			"PassingScore" = $5,
			"IsPassed" = $6,
			"FailedCriticalRule" = $7,
			"GradingStatus" = $8,
			"UpdatedAt" = now(),
			"RowVersion" = "RowVersion" + 1
		WHERE "IdSeq" = $9 AND "GradingStatus" = 'in_progress'
		RETURNING *`

	err = s.db.GetContext(ctx, &attempt, query,
		answersJSON, now, totalScore, maxScore, passingScore, isPassed, failedCriticalRule, gradingStatus, attemptId,
	)
	if err != nil {
		s.log.Error("Failed to submit exam attempt", zap.Error(err))
		return nil, fmt.Errorf("nộp bài thi thất bại: %w", err)
	}

	s.log.Info("Exam attempt submitted and evaluated successfully",
		zap.String("attemptId", attemptId),
		zap.Float64("score", totalScore),
		zap.Bool("isPassed", isPassed),
		zap.String("status", gradingStatus),
	)

	return &attempt, nil
}
