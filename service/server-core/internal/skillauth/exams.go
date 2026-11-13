package skillauth

import (
	"context"
	"crypto/rand"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"
)

//go:embed exams_schema.sql
var ExamsSchema string

func randomSessionToken() string {
	b := make([]byte, 24)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (s *Server) examSessionAction(ctx context.Context, u account, action string, payload any) (*structpb.Struct, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, invalid("Dữ liệu ca thi không hợp lệ")
	}
	var p map[string]any
	if err = json.Unmarshal(raw, &p); err != nil {
		return nil, invalid("Dữ liệu ca thi không hợp lệ")
	}

	switch action {
	case "exam_session_list":
		if !s.allowed(ctx, u, "exam_management:view") && !s.allowed(ctx, u, "exams:view") {
			return nil, status.Error(codes.PermissionDenied, "Bạn không có quyền xem ca thi")
		}
		rows, e := s.DB.QueryContext(ctx, `SELECT jsonb_build_object(
			'id', e."IdSeq",
			'code', e."Code",
			'title', e."Title",
			'assessmentId', e."AssessmentId",
			'assessmentCode', COALESCE(a."Code", ''),
			'assessmentTitle', COALESCE(a."Title", ''),
			'durationMinutes', COALESCE(a."DurationMinutes", 45),
			'questionCount', COALESCE(cardinality(a."QuestionIds"), 0),
			'totalPoints', COALESCE(a."TotalPoints", 10),
			'passingScore', COALESCE(a."PassingScore", 5),
			'startTime', e."StartTime",
			'endTime', e."EndTime",
			'location', e."Location",
			'targetScope', e."TargetScope",
			'maxAttempts', e."MaxAttempts",
			'securityConfig', e."SecurityConfig",
			'status', e."Status",
			'attemptCount', COALESCE((SELECT count(*) FROM "_ASMExamAttempt" att WHERE att."ExamSessionId"=e."IdSeq"), 0)
		) || `+auditJSON("e")+` FROM "_ASMExamSession" e
		LEFT JOIN "_ASMAssessment" a ON a."IdSeq"=e."AssessmentId"
		ORDER BY e."StartTime" DESC`)
		if e != nil {
			return nil, e
		}
		defer rows.Close()
		var data []any
		for rows.Next() {
			var b []byte
			if e = rows.Scan(&b); e != nil {
				return nil, e
			}
			var item any
			if e = json.Unmarshal(b, &item); e != nil {
				return nil, e
			}
			data = append(data, item)
		}
		val, err := structpb.NewValue(data)
		if err != nil {
			return nil, err
		}
		return structpb.NewStruct(map[string]any{"data": val.AsInterface()})

	case "exam_session_save":
		if !s.allowed(ctx, u, "exam_management:create") && !s.allowed(ctx, u, "exam_management:update") {
			return nil, status.Error(codes.PermissionDenied, "Bạn không có quyền tạo hoặc chỉnh sửa ca thi")
		}
		id := strings.TrimSpace(fmt.Sprint(p["id"]))
		code := strings.TrimSpace(fmt.Sprint(p["code"]))
		title := strings.TrimSpace(fmt.Sprint(p["title"]))
		assessmentID := strings.TrimSpace(fmt.Sprint(p["assessmentId"]))
		location := strings.TrimSpace(fmt.Sprint(p["location"]))
		if location == "" {
			location = "Trực tuyến"
		}
		startTimeStr := strings.TrimSpace(fmt.Sprint(p["startTime"]))
		endTimeStr := strings.TrimSpace(fmt.Sprint(p["endTime"]))

		if code == "" || title == "" || assessmentID == "" || startTimeStr == "" || endTimeStr == "" {
			return nil, invalid("Vui lòng điền đầy đủ Mã ca, Tên ca, Bộ đề thi và Thời gian bắt đầu/kết thúc")
		}

		startTime, err1 := time.Parse(time.RFC3339, startTimeStr)
		endTime, err2 := time.Parse(time.RFC3339, endTimeStr)
		if err1 != nil || err2 != nil {
			return nil, invalid("Định dạng ngày giờ không hợp lệ")
		}
		if endTime.Before(startTime) {
			return nil, invalid("Thời gian kết thúc ca thi phải sau thời gian bắt đầu")
		}

		targetScopeRaw, _ := json.Marshal(p["targetScope"])
		if len(targetScopeRaw) == 0 || string(targetScopeRaw) == "null" {
			targetScopeRaw = []byte(`{"departments":[],"positions":[],"ranks":[],"groups":[],"users":[]}`)
		}

		securityConfigRaw, _ := json.Marshal(p["securityConfig"])
		if len(securityConfigRaw) == 0 || string(securityConfigRaw) == "null" {
			securityConfigRaw = []byte(`{"singleDevice":true,"shuffleQuestions":true,"shuffleOptions":true,"preventTabSwitch":true,"maxViolations":3}`)
		}

		maxAttempts := 1
		if ma, ok := p["maxAttempts"].(float64); ok && ma >= 1 {
			maxAttempts = int(ma)
		}

		statusVal := "scheduled"
		now := time.Now()
		if now.After(startTime) && now.Before(endTime) {
			statusVal = "in_progress"
		} else if now.After(endTime) {
			statusVal = "completed"
		}

		tx, e := s.DB.BeginTxx(ctx, nil)
		if e != nil {
			return nil, e
		}
		defer tx.Rollback()

		if e = setActor(ctx, tx, u); e != nil {
			return nil, e
		}

		var resID string
		var resVer string
		if id == "" || id == "<nil>" {
			newID := uuid.Must(uuid.NewV7()).String()
			e = tx.QueryRowContext(ctx, `INSERT INTO "_ASMExamSession"(
				"IdSeq","Code","Title","AssessmentId","StartTime","EndTime","Location","TargetScope","MaxAttempts","SecurityConfig","Status"
			) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb,$11) RETURNING "IdSeq","RowVersion"::text`,
				newID, code, title, assessmentID, startTime, endTime, location, string(targetScopeRaw), maxAttempts, string(securityConfigRaw), statusVal,
			).Scan(&resID, &resVer)
		} else {
			if e = lockRowVersion(ctx, tx, rowCondition{Table: "_ASMExamSession", ID: id, Version: fmt.Sprint(p["RowVersion"])}); e != nil {
				return nil, e
			}
			e = tx.QueryRowContext(ctx, `UPDATE "_ASMExamSession" SET
				"Code"=$1,"Title"=$2,"AssessmentId"=$3,"StartTime"=$4,"EndTime"=$5,"Location"=$6,"TargetScope"=$7::jsonb,"MaxAttempts"=$8,"SecurityConfig"=$9::jsonb,"Status"=$10,"UpdatedAt"=now()
				WHERE "IdSeq"=$11 RETURNING "IdSeq","RowVersion"::text`,
				code, title, assessmentID, startTime, endTime, location, string(targetScopeRaw), maxAttempts, string(securityConfigRaw), statusVal, id,
			).Scan(&resID, &resVer)
		}
		if e != nil {
			var pe *pq.Error
			if strings.Contains(e.Error(), "unique") || strings.Contains(e.Error(), "duplicate key") {
				return nil, status.Error(codes.AlreadyExists, "Mã ca thi '"+code+"' đã tồn tại trong hệ thống")
			}
			_ = pe
			return nil, e
		}
		if e = tx.Commit(); e != nil {
			return nil, e
		}
		return structpb.NewStruct(map[string]any{"data": map[string]any{"id": resID, "RowVersion": resVer}})

	case "exam_session_delete":
		if !s.allowed(ctx, u, "exam_management:update") {
			return nil, status.Error(codes.PermissionDenied, "Bạn không có quyền hủy ca thi")
		}
		id := fmt.Sprint(p["id"])
		_, e := s.DB.ExecContext(ctx, `UPDATE "_ASMExamSession" SET "Status"='cancelled',"UpdatedAt"=now() WHERE "IdSeq"=$1`, id)
		if e != nil {
			return nil, e
		}
		return structpb.NewStruct(map[string]any{"ok": true})
	}

	return nil, status.Error(codes.InvalidArgument, "Hành động ca thi không hỗ trợ: "+action)
}

// Engine thực thi làm bài thi bảo mật
func (s *Server) examAttemptAction(ctx context.Context, u account, action string, payload any) (*structpb.Struct, error) {
	raw, _ := json.Marshal(payload)
	var p map[string]any
	_ = json.Unmarshal(raw, &p)

	switch action {
	case "exam_attempt_start":
		// Khởi tạo phiên thi cho thí sinh
		sessionID := strings.TrimSpace(fmt.Sprint(p["examSessionId"]))
		fingerprint := strings.TrimSpace(fmt.Sprint(p["fingerprint"]))
		ip := strings.TrimSpace(fmt.Sprint(p["ip"]))
		userAgent := strings.TrimSpace(fmt.Sprint(p["userAgent"]))

		if sessionID == "" {
			return nil, invalid("Thiếu mã ca thi")
		}

		// 1. Kiểm tra ca thi hợp lệ
		var session struct {
			ID             string    `db:"IdSeq"`
			Title          string    `db:"Title"`
			AssessmentID   string    `db:"AssessmentId"`
			StartTime      time.Time `db:"StartTime"`
			EndTime        time.Time `db:"EndTime"`
			MaxAttempts    int       `db:"MaxAttempts"`
			Status         string    `db:"Status"`
			Duration       int       `db:"DurationMinutes"`
			TotalPoints    float64   `db:"TotalPoints"`
			PassingScore   float64   `db:"PassingScore"`
			HasCritical    bool      `db:"HasCriticalRule"`
			QuestionIds    []string  `db:"QuestionIds"`
			SecurityConfig string    `db:"SecurityConfig"`
		}

		q := `SELECT s."IdSeq", s."Title", s."AssessmentId", s."StartTime", s."EndTime", s."MaxAttempts", s."Status",
			COALESCE(a."DurationMinutes", 45) as "DurationMinutes",
			COALESCE(a."TotalPoints", 10) as "TotalPoints",
			COALESCE(a."PassingScore", 5) as "PassingScore",
			COALESCE(a."HasCriticalRule", false) as "HasCriticalRule",
			COALESCE(a."QuestionIds", '{}') as "QuestionIds",
			s."SecurityConfig"::text as "SecurityConfig"
		FROM "_ASMExamSession" s
		LEFT JOIN "_ASMAssessment" a ON a."IdSeq"=s."AssessmentId"
		WHERE s."IdSeq"=$1`

		row := s.DB.QueryRowContext(ctx, q, sessionID)
		var qIds pq.StringArray
		if err := row.Scan(&session.ID, &session.Title, &session.AssessmentID, &session.StartTime, &session.EndTime, &session.MaxAttempts, &session.Status,
			&session.Duration, &session.TotalPoints, &session.PassingScore, &session.HasCritical, &qIds, &session.SecurityConfig); err != nil {
			return nil, status.Error(codes.NotFound, "Không tìm thấy ca thi")
		}
		session.QuestionIds = qIds

		now := time.Now()
		if now.Before(session.StartTime) {
			return nil, status.Error(codes.FailedPrecondition, "Ca thi chưa bắt đầu. Thời gian mở ca: "+session.StartTime.Format("15:04 02/01/2006"))
		}
		if now.After(session.EndTime) {
			return nil, status.Error(codes.FailedPrecondition, "Ca thi đã kết thúc vào lúc: "+session.EndTime.Format("15:04 02/01/2006"))
		}

		// 2. Kiểm tra xem thí sinh đã có lượt thi đang diễn ra hay không (Chống thi hộ ở máy khác)
		var existingAttempt struct {
			ID           string    `db:"IdSeq"`
			Token        string    `db:"SessionToken"`
			Fingerprint  string    `db:"DeviceFingerprint"`
			Deadline     time.Time `db:"Deadline"`
			Status       string    `db:"GradingStatus"`
			Answers      string    `db:"Answers"`
			AttemptNum   int       `db:"AttemptNumber"`
		}
		errFind := s.DB.QueryRowContext(ctx, `SELECT "IdSeq", "SessionToken", "DeviceFingerprint", "Deadline", "GradingStatus", "Answers"::text, "AttemptNumber"
			FROM "_ASMExamAttempt" WHERE "ExamSessionId"=$1 AND "UserId"=$2 AND "GradingStatus"='in_progress'`, sessionID, u.ID).
			Scan(&existingAttempt.ID, &existingAttempt.Token, &existingAttempt.Fingerprint, &existingAttempt.Deadline, &existingAttempt.Status, &existingAttempt.Answers, &existingAttempt.AttemptNum)

		var attemptID string
		var sessionToken string
		var deadline time.Time
		var currentAnswers map[string]any = make(map[string]any)

		if errFind == nil {
			// Thí sinh đang có bài thi dở dang -> Cho phép tiếp tục nếu cùng thiết bị hoặc còn thời gian
			if existingAttempt.Fingerprint != "" && fingerprint != "" && existingAttempt.Fingerprint != fingerprint {
				// Cảnh báo chống thi hộ máy khác
				return nil, status.Error(codes.PermissionDenied, "Bài thi này đang được thực hiện trên một máy khác! Bạn chỉ có thể tiếp tục trên đúng thiết bị ban đầu.")
			}
			attemptID = existingAttempt.ID
			sessionToken = existingAttempt.Token
			deadline = existingAttempt.Deadline
			_ = json.Unmarshal([]byte(existingAttempt.Answers), &currentAnswers)
		} else {
			// Kiểm tra số lần thi đã thực hiện
			var countTaken int
			_ = s.DB.GetContext(ctx, &countTaken, `SELECT count(*) FROM "_ASMExamAttempt" WHERE "ExamSessionId"=$1 AND "UserId"=$2`, sessionID, u.ID)
			if countTaken >= session.MaxAttempts {
				return nil, status.Error(codes.ResourceExhausted, fmt.Sprintf("Bạn đã dùng hết số lần làm bài cho phép (%d/%d lần)", countTaken, session.MaxAttempts))
			}

			// Tạo phiên thi mới
			attemptID = uuid.Must(uuid.NewV7()).String()
			sessionToken = randomSessionToken()
			calculatedDeadline := now.Add(time.Duration(session.Duration) * time.Minute)
			if calculatedDeadline.After(session.EndTime) {
				calculatedDeadline = session.EndTime // Hạn chót đóng ca thi là giới hạn cứng
			}
			deadline = calculatedDeadline

			tx, e := s.DB.BeginTxx(ctx, nil)
			if e != nil {
				return nil, e
			}
			defer tx.Rollback()
			if e = setActor(ctx, tx, u); e != nil {
				return nil, e
			}

			_, e = tx.ExecContext(ctx, `INSERT INTO "_ASMExamAttempt"(
				"IdSeq","ExamSessionId","AssessmentId","UserId","AttemptNumber","SessionToken","DeviceFingerprint","IpAddress","UserAgent","StartedAt","Deadline","GradingStatus","MaxScore","PassingScore"
			) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'in_progress',$12,$13)`,
				attemptID, sessionID, session.AssessmentID, u.ID, countTaken+1, sessionToken, fingerprint, ip, userAgent, now, deadline, session.TotalPoints, session.PassingScore)
			if e != nil {
				return nil, e
			}
			if e = tx.Commit(); e != nil {
				return nil, e
			}
		}

		// 3. Tải câu hỏi và BÓC TÁCH HOÀN TOÀN ĐÁP ÁN ĐÚNG trước khi trả về máy thí sinh
		questionsPayload := []map[string]any{}
		if len(session.QuestionIds) > 0 {
			qRows, e := s.DB.QueryContext(ctx, `SELECT "IdSeq", "Content", "Options", "Type", "IsCritical"
				FROM "_QSTQuestionView" WHERE "IdSeq"=ANY($1::uuid[])`, pq.Array(session.QuestionIds))
			if e == nil {
				defer qRows.Close()
				for qRows.Next() {
					var qid, prompt, optRaw, qtype string
					var hasCrit bool
					if errScan := qRows.Scan(&qid, &prompt, &optRaw, &qtype, &hasCrit); errScan == nil {
						var opts []map[string]any
						_ = json.Unmarshal([]byte(optRaw), &opts)
						// Bảo mật: XÓA hoàn toàn key `isCorrect`, `explanation`
						sanitizedOpts := make([]map[string]any, len(opts))
						for idx, o := range opts {
							sanitizedOpts[idx] = map[string]any{
								"id":      o["id"],
								"content": o["text"],
								"text":    o["text"],
							}
						}
						questionsPayload = append(questionsPayload, map[string]any{
							"id":              qid,
							"prompt":          prompt,
							"content":         prompt,
							"type":            qtype,
							"points":          1.0,
							"hasCriticalRule": hasCrit,
							"isCritical":      hasCrit,
							"options":         sanitizedOpts,
						})
					}
				}
			}
		}

		res := map[string]any{
			"attemptId":       attemptID,
			"sessionToken":    sessionToken,
			"examTitle":       session.Title,
			"durationMinutes": session.Duration,
			"deadline":        deadline.Format(time.RFC3339),
			"serverTime":      time.Now().Format(time.RFC3339),
			"questions":       questionsPayload,
			"answers":         currentAnswers,
			"totalPoints":     session.TotalPoints,
			"passingScore":    session.PassingScore,
		}
		return jsonReply(map[string]any{"data": res})

	case "exam_attempt_heartbeat_save":
		// Lưu câu trả lời từng câu & ghi nhận vi phạm rời màn hình
		attemptID := fmt.Sprint(p["attemptId"])
		token := fmt.Sprint(p["sessionToken"])
		answersRaw, _ := json.Marshal(p["answers"])
		violationType := fmt.Sprint(p["violation"]) // e.g. "tab_switch", "blur"

		tx, e := s.DB.BeginTxx(ctx, nil)
		if e != nil {
			return nil, e
		}
		defer tx.Rollback()
		if e = setActor(ctx, tx, u); e != nil {
			return nil, e
		}

		var deadline time.Time
		var status string
		var vCount int
		e = tx.QueryRowContext(ctx, `SELECT "Deadline", "GradingStatus", "ViolationCount" FROM "_ASMExamAttempt" WHERE "IdSeq"=$1 AND "SessionToken"=$2 FOR UPDATE`, attemptID, token).
			Scan(&deadline, &status, &vCount)
		if e != nil {
			return nil, statusError(codes.Unauthenticated, "Phiên thi không hợp lệ")
		}
		if status != "in_progress" {
			return nil, statusError(codes.FailedPrecondition, "Bài thi đã được nộp hoặc đã kết thúc")
		}
		if time.Now().After(deadline.Add(30 * time.Second)) {
			// Quá hạn làm bài
			_, _ = tx.ExecContext(ctx, `UPDATE "_ASMExamAttempt" SET "GradingStatus"='submitted',"SubmittedAt"=now() WHERE "IdSeq"=$1`, attemptID)
			_ = tx.Commit()
			return nil, statusError(codes.DeadlineExceeded, "Đã hết thời gian làm bài thi!")
		}

		addViolation := 0
		if violationType != "" && violationType != "<nil>" {
			addViolation = 1
		}

		_, e = tx.ExecContext(ctx, `UPDATE "_ASMExamAttempt" SET
			"Answers"=$1::jsonb,
			"ViolationCount"="ViolationCount"+$2,
			"UpdatedAt"=now()
			WHERE "IdSeq"=$3`, string(answersRaw), addViolation, attemptID)
		if e != nil {
			return nil, e
		}
		if e = tx.Commit(); e != nil {
			return nil, e
		}
		return structpb.NewStruct(map[string]any{"ok": true, "violations": vCount + addViolation})

	case "exam_attempt_submit":
		// Nộp bài và Tự động chấm điểm phía Server
		attemptID := fmt.Sprint(p["attemptId"])
		token := fmt.Sprint(p["sessionToken"])
		answersRaw, _ := json.Marshal(p["answers"])

		tx, e := s.DB.BeginTxx(ctx, nil)
		if e != nil {
			return nil, e
		}
		defer tx.Rollback()

		// Kích hoạt context actor để trigger audit row hoạt động trơn tru
		if e = setActor(ctx, tx, u); e != nil {
			return nil, e
		}

		var assessmentID string
		var maxScore, passScore float64
		var currentStatus string
		e = tx.QueryRowContext(ctx, `SELECT "AssessmentId", "MaxScore", "PassingScore", "GradingStatus" FROM "_ASMExamAttempt" WHERE "IdSeq"=$1 AND "SessionToken"=$2 FOR UPDATE`, attemptID, token).
			Scan(&assessmentID, &maxScore, &passScore, &currentStatus)
		if e != nil {
			return nil, statusError(codes.Unauthenticated, "Phiên thi không hợp lệ")
		}
		if currentStatus != "in_progress" {
			return nil, statusError(codes.FailedPrecondition, "Bài thi đã nộp trước đó")
		}

		// Lấy danh sách câu hỏi kèm ĐÁP ÁN CHUẨN từ DB
		var questionIds pq.StringArray
		var hasCritical bool
		_ = tx.QueryRowContext(ctx, `SELECT "QuestionIds", "HasCriticalRule" FROM "_ASMAssessment" WHERE "IdSeq"=$1`, assessmentID).
			Scan(&questionIds, &hasCritical)

		submittedAnswers := make(map[string]any)
		_ = json.Unmarshal(answersRaw, &submittedAnswers)

		totalEarned := 0.0
		failedCritical := false
		eachPoint := 10.0 / float64(len(questionIds))
		if len(questionIds) == 0 {
			eachPoint = 1.0
		}

		if len(questionIds) > 0 {
			rows, errQ := tx.QueryContext(ctx, `SELECT "IdSeq", "Options", "IsCritical", "Type" FROM "_QSTQuestionView" WHERE "IdSeq"=ANY($1::uuid[])`, pq.Array(questionIds))
			if errQ == nil {
				defer rows.Close()
				for rows.Next() {
					var qid, optRaw, qtype string
					var crit bool
					if errScan := rows.Scan(&qid, &optRaw, &crit, &qtype); errScan == nil {
						var options []struct {
							ID        string `json:"id"`
							IsCorrect bool   `json:"isCorrect"`
						}
						_ = json.Unmarshal([]byte(optRaw), &options)

						userAns := fmt.Sprint(submittedAnswers[qid])
						// Tìm đáp án đúng
						var correctOptID string
						for _, opt := range options {
							if opt.IsCorrect {
								correctOptID = opt.ID
								break
							}
						}

						if userAns != "" && userAns == correctOptID {
							totalEarned += eachPoint
						} else {
							if hasCritical && crit {
								failedCritical = true // Sai câu điểm liệt
							}
						}
					}
				}
			}
		}

		// Làm tròn điểm 2 chữ số thập phân
		finalScore := math.Round(totalEarned*100) / 100
		isPassed := (finalScore >= passScore) && !failedCritical

		_, e = tx.ExecContext(ctx, `UPDATE "_ASMExamAttempt" SET
			"Answers"=$1::jsonb,
			"SubmittedAt"=now(),
			"TotalScore"=$2,
			"IsPassed"=$3,
			"FailedCriticalRule"=$4,
			"GradingStatus"='graded',
			"UpdatedAt"=now()
			WHERE "IdSeq"=$5`, string(answersRaw), finalScore, isPassed, failedCritical, attemptID)
		if e != nil {
			return nil, e
		}
		if e = tx.Commit(); e != nil {
			return nil, e
		}

		receipt := map[string]any{
			"attemptId":          attemptID,
			"totalScore":         finalScore,
			"maxScore":           maxScore,
			"passingScore":       passScore,
			"isPassed":           isPassed,
			"failedCriticalRule": failedCritical,
			"submittedAt":        time.Now().Format(time.RFC3339),
		}
		return jsonReply(map[string]any{"data": receipt})
	}

	return nil, status.Error(codes.InvalidArgument, "Thao tác không được hỗ trợ: "+action)
}

func statusError(code codes.Code, msg string) error {
	return status.Error(code, msg)
}
