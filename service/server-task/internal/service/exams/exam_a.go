package exams

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	mrand "math/rand/v2"
	"server-task/internal/cache"
	"server-task/internal/domain"
	"server-task/internal/security"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"go.uber.org/zap"
)

func randomToken() string {
	b := make([]byte, 24)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// CreateSession (A - Add ca thi mới)
func (s *ExamService) CreateSession(ctx context.Context, u *security.UserContext, sess *domain.ExamSession) (*domain.ExamSession, error) {
	if sess.Code == "" || sess.Title == "" || sess.AssessmentId == "" {
		return nil, errors.New("mã ca thi, tên ca thi và bộ đề là bắt buộc")
	}

	if sess.TargetScope == "" {
		sess.TargetScope = `{"departments":[],"positions":[],"ranks":[],"groups":[],"users":[]}`
	}
	if sess.SecurityConfig == "" {
		sess.SecurityConfig = `{"singleDevice":true,"shuffleQuestions":true,"shuffleOptions":true,"preventTabSwitch":true,"maxViolations":3,"allowReview":false}`
	}
	if sess.Status == "" {
		sess.Status = "scheduled"
	}

	id := uuid.New().String()
	now := time.Now()

	query := `
		INSERT INTO "_ASMExamSession" (
			"IdSeq", "Code", "Title", "AssessmentId", "StartTime", "EndTime",
			"Location", "TargetScope", "MaxAttempts", "SecurityConfig", "Status",
			"CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt", "RowVersion"
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 1
		) RETURNING "IdSeq", "CreatedAt", "UpdatedAt", "RowVersion"`

	err := s.db.QueryRowxContext(ctx, query,
		id, sess.Code, sess.Title, sess.AssessmentId, sess.StartTime, sess.EndTime,
		sess.Location, sess.TargetScope, sess.MaxAttempts, sess.SecurityConfig, sess.Status,
		u.UserId, u.UserId, now, now,
	).Scan(&sess.IdSeq, &sess.CreatedAt, &sess.UpdatedAt, &sess.RowVersion)

	if err != nil {
		s.log.Error("Failed to create exam session", zap.Error(err))
		return nil, fmt.Errorf("không thể tạo ca thi: %w", err)
	}

	return sess, nil
}

type StartAttemptResponse struct {
	Attempt   *domain.ExamAttempt `json:"attempt"`
	Questions []map[string]any    `json:"questions"`
	Duration  int                 `json:"durationMinutes"`
	Resumed   bool                `json:"resumed"`
}

// StartAttempt (A - Bắt đầu hoặc khôi phục lượt làm bài với cơ chế bảo mật tối cao & chống gian lận)
func (s *ExamService) StartAttempt(
	ctx context.Context,
	u *security.UserContext,
	sessionId string,
	deviceFingerprint, ip, userAgent string,
) (*StartAttemptResponse, error) {
	// 1. Kiểm tra thông tin ca thi (có cache để chịu tải nghìn user/s)
	cacheKey := "sess_meta:" + sessionId
	var sess domain.ExamSession
	if cached, ok := cache.DefaultCache.Get(cacheKey); ok {
		sess = cached.(domain.ExamSession)
	} else {
		err := s.db.GetContext(ctx, &sess, `SELECT * FROM "_ASMExamSession" WHERE "IdSeq" = $1`, sessionId)
		if err != nil {
			return nil, errors.New("ca thi không tồn tại hoặc đã bị đóng")
		}
		cache.DefaultCache.Set(cacheKey, sess, 1*time.Minute)
	}

	now := time.Now()
	if now.Before(sess.StartTime) {
		return nil, errors.New("chưa đến giờ mở ca thi. Thời gian bắt đầu: " + sess.StartTime.Format("15:04 02/01/2006"))
	}
	if now.After(sess.EndTime) {
		return nil, errors.New("ca thi đã kết thúc vào lúc: " + sess.EndTime.Format("15:04 02/01/2006"))
	}

	// 2. Phân tích cấu hình bảo mật ca thi
	var secConfig struct {
		SingleDevice     bool `json:"singleDevice"`
		ShuffleQuestions bool `json:"shuffleQuestions"`
		ShuffleOptions   bool `json:"shuffleOptions"`
		PreventTabSwitch bool `json:"preventTabSwitch"`
		MaxViolations    int  `json:"maxViolations"`
	}
	secConfig.SingleDevice = true
	secConfig.ShuffleQuestions = true
	secConfig.ShuffleOptions = true
	secConfig.MaxViolations = 3
	_ = json.Unmarshal([]byte(sess.SecurityConfig), &secConfig)

	// 3. KIỂM TRA BẢO MẬT: Chống thi hộ trên nhiều thiết bị (Single Device Lock) & Khôi phục phiên dở dang
	var existing domain.ExamAttempt
	errFind := s.db.GetContext(ctx, &existing, `
		SELECT * FROM "_ASMExamAttempt" 
		WHERE "ExamSessionId" = $1 AND "UserId" = $2 AND "GradingStatus" = 'in_progress'`, sessionId, u.UserId)

	var attempt *domain.ExamAttempt
	var isResumed bool

	if errFind == nil {
		// Thí sinh đã có bài thi đang diễn ra
		if secConfig.SingleDevice && existing.DeviceFingerprint != "" && deviceFingerprint != "" && existing.DeviceFingerprint != deviceFingerprint {
			s.log.Warn("Multi-device access blocked",
				zap.String("attemptId", existing.IdSeq),
				zap.String("originalDevice", existing.DeviceFingerprint),
				zap.String("newDevice", deviceFingerprint),
			)
			return nil, errors.New("bảo mật: Bài thi này đang được thực hiện trên một máy khác! Bạn chỉ có thể tiếp tục trên đúng thiết bị ban đầu.")
		}
		// Khôi phục phiên làm bài
		attempt = &existing
		isResumed = true
	} else {
		// Kiểm tra số lần thi cho phép
		var currentAttempts int
		_ = s.db.GetContext(ctx, &currentAttempts, `
			SELECT count(*) FROM "_ASMExamAttempt" 
			WHERE "ExamSessionId" = $1 AND "UserId" = $2`, sessionId, u.UserId)

		if currentAttempts >= sess.MaxAttempts {
			return nil, fmt.Errorf("bạn đã sử dụng hết số lượt làm bài cho phép (%d/%d lượt)", currentAttempts, sess.MaxAttempts)
		}

		// Tính toán Deadline chuẩn Server (Server-authoritative)
		var durationMinutes int = 45
		var totalPoints float64 = 10
		var passingScore float64 = 5
		_ = s.db.QueryRowContext(ctx, `SELECT "DurationMinutes", "TotalPoints", "PassingScore" FROM "_ASMAssessment" WHERE "IdSeq" = $1`, sess.AssessmentId).
			Scan(&durationMinutes, &totalPoints, &passingScore)

		deadline := now.Add(time.Duration(durationMinutes) * time.Minute)
		if deadline.After(sess.EndTime) {
			deadline = sess.EndTime // Hạn chót đóng ca thi là giới hạn cứng
		}

		sessionToken := randomToken()
		attemptId := uuid.New().String()

		attempt = &domain.ExamAttempt{
			IdSeq:             attemptId,
			ExamSessionId:     sessionId,
			AssessmentId:      sess.AssessmentId,
			UserId:            u.UserId,
			AttemptNumber:     currentAttempts + 1,
			SessionToken:      sessionToken,
			DeviceFingerprint: deviceFingerprint,
			IpAddress:         ip,
			UserAgent:         userAgent,
			StartedAt:         now,
			Deadline:          deadline,
			Answers:           "{}",
			Violations:        "[]",
			GradingStatus:     "in_progress",
			TotalScore:        0,
			MaxScore:          totalPoints,
			PassingScore:      passingScore,
			RowVersion:        1,
		}

		query := `
			INSERT INTO "_ASMExamAttempt" (
				"IdSeq", "ExamSessionId", "AssessmentId", "UserId", "AttemptNumber",
				"SessionToken", "DeviceFingerprint", "IpAddress", "UserAgent",
				"StartedAt", "Deadline", "Answers", "Violations", "ViolationCount",
				"TotalScore", "MaxScore", "PassingScore", "IsPassed", "FailedCriticalRule",
				"GradingStatus", "CreatedAt", "UpdatedAt", "RowVersion"
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0,
				0, $14, $15, false, false, 'in_progress', $16, $16, 1
			)`

		_, err := s.db.ExecContext(ctx, query,
			attempt.IdSeq, attempt.ExamSessionId, attempt.AssessmentId, attempt.UserId, attempt.AttemptNumber,
			attempt.SessionToken, attempt.DeviceFingerprint, attempt.IpAddress, attempt.UserAgent,
			attempt.StartedAt, attempt.Deadline, attempt.Answers, attempt.Violations,
			attempt.MaxScore, attempt.PassingScore, now,
		)
		if err != nil {
			s.log.Error("Failed to start exam attempt", zap.Error(err))
			return nil, fmt.Errorf("không thể khởi tạo phiên thi: %w", err)
		}
	}

	// 4. BẢO MẬT ĐỀ THI: Lọc sạch 100% đáp án đúng và xáo trộn ngẫu nhiên (Shuffling)
	sanitizedQuestions, err := s.getSanitizedAndShuffledQuestions(ctx, sess.AssessmentId, attempt.IdSeq, secConfig.ShuffleQuestions, secConfig.ShuffleOptions)
	if err != nil {
		s.log.Error("Failed to load questions for attempt", zap.Error(err))
		return nil, errors.New("không thể tải bộ câu hỏi của ca thi")
	}

	return &StartAttemptResponse{
		Attempt:   attempt,
		Questions: sanitizedQuestions,
		Duration:  int(attempt.Deadline.Sub(now).Minutes()),
		Resumed:   isResumed,
	}, nil
}

// getSanitizedAndShuffledQuestions tải câu hỏi, bóc tách hoàn toàn đáp án đúng (isCorrect) và xáo trộn
func (s *ExamService) getSanitizedAndShuffledQuestions(
	ctx context.Context,
	assessmentId, attemptId string,
	shuffleQ, shuffleOpt bool,
) ([]map[string]any, error) {
	// 1. Lấy danh sách QuestionIds của bộ đề
	var qIds pq.StringArray
	err := s.db.GetContext(ctx, &qIds, `SELECT "QuestionIds" FROM "_ASMAssessment" WHERE "IdSeq" = $1`, assessmentId)
	if err != nil || len(qIds) == 0 {
		return nil, errors.New("bộ đề chưa có câu hỏi nào")
	}

	// 2. Tải câu hỏi từ DB (chỉ lấy các trường hiển thị)
	query := `
		SELECT q."IdSeq", q."Content", q."Type", q."Options", q."SimulationType", q."ImageUrl", q."IsCritical"
		FROM "_QSTQuestion" q
		WHERE q."IdSeq" = ANY($1)`

	rows, err := s.db.QueryContext(ctx, query, qIds)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]any
	for rows.Next() {
		var id, content, qType, optRaw, simType, imgUrl string
		var isCrit bool
		if errScan := rows.Scan(&id, &content, &qType, &optRaw, &simType, &imgUrl, &isCrit); errScan == nil {
			var rawOpts []map[string]any
			_ = json.Unmarshal([]byte(optRaw), &rawOpts)

			// BẢO MẬT: BÓC TÁCH HOÀN TOÀN isCorrect, explanation, rubrics
			sanitizedOpts := make([]map[string]any, 0, len(rawOpts))
			for _, opt := range rawOpts {
				text := fmt.Sprint(opt["content"])
				if text == "" || text == "<nil>" {
					text = fmt.Sprint(opt["text"])
				}
				sanitizedOpts = append(sanitizedOpts, map[string]any{
					"id":      opt["id"],
					"content": text,
					"text":    text,
				})
			}

			// Đảo đáp án nếu bật cấu hình
			if shuffleOpt && len(sanitizedOpts) > 1 {
				for i := len(sanitizedOpts) - 1; i > 0; i-- {
					j := mrand.IntN(i + 1)
					sanitizedOpts[i], sanitizedOpts[j] = sanitizedOpts[j], sanitizedOpts[i]
				}
			}

			result = append(result, map[string]any{
				"id":             id,
				"content":        content,
				"type":           qType,
				"options":        sanitizedOpts,
				"simulationType": simType,
				"imageUrl":       imgUrl,
				"isCritical":     isCrit,
			})
		}
	}

	// Đảo thứ tự câu hỏi nếu bật cấu hình
	if shuffleQ && len(result) > 1 {
		for i := len(result) - 1; i > 0; i-- {
			j := mrand.IntN(i + 1)
			result[i], result[j] = result[j], result[i]
		}
	}

	return result, nil
}

// RegisterSession (A - Đăng ký tham gia ca thi)
func (s *ExamService) RegisterSession(ctx context.Context, u *security.UserContext, sessionId string) error {
	var exists bool
	_ = s.db.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM "_ASMExamSession" WHERE "IdSeq" = $1 AND "Status" = 'scheduled')`, sessionId)
	if !exists {
		return errors.New("ca thi không khả dụng để đăng ký")
	}

	s.log.Info("User registered for exam session", zap.String("userId", u.UserId), zap.String("sessionId", sessionId))
	return nil
}
