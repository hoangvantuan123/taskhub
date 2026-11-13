package skillauth

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"
)

//go:embed training_schema.sql
var TrainingSchema string

// Quản lý Lớp & Nhóm đào tạo (_TRNGroup & _TRNGroupMember)
func (s *Server) trainingGroupAction(ctx context.Context, u account, action string, payload any) (*structpb.Struct, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, invalid("Dữ liệu không hợp lệ")
	}
	var p map[string]any
	_ = json.Unmarshal(raw, &p)

	switch action {
	// Q: Query danh sách nhóm
	case "training_group_list":
		rows, e := s.DB.QueryContext(ctx, `SELECT jsonb_build_object(
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
			), '[]'::jsonb)
		) || `+auditJSON("g")+` FROM "_TRNGroup" g
		LEFT JOIN "_USRAccountDirectory" u ON u."Id"=g."LeaderId"
		ORDER BY g."CreatedAt" DESC`)
		if e != nil {
			return nil, e
		}
		defer rows.Close()
		var list []any
		for rows.Next() {
			var b []byte
			if e = rows.Scan(&b); e != nil {
				return nil, e
			}
			var item any
			_ = json.Unmarshal(b, &item)
			list = append(list, item)
		}
		val, _ := structpb.NewValue(list)
		return structpb.NewStruct(map[string]any{"data": val.AsInterface()})

	// A & U: Add & Update nhóm đào tạo
	case "training_group_save":
		id := strings.TrimSpace(fmt.Sprint(p["id"]))
		code := strings.TrimSpace(fmt.Sprint(p["code"]))
		name := strings.TrimSpace(fmt.Sprint(p["name"]))
		leaderId := strings.TrimSpace(fmt.Sprint(p["leaderId"]))
		leaderName := strings.TrimSpace(fmt.Sprint(p["leader"]))
		description := strings.TrimSpace(fmt.Sprint(p["description"]))

		if code == "" || name == "" {
			return nil, invalid("Vui lòng nhập Mã nhóm và Tên nhóm đào tạo")
		}

		tx, e := s.DB.BeginTxx(ctx, nil)
		if e != nil {
			return nil, e
		}
		defer tx.Rollback()
		if e = setActor(ctx, tx, u); e != nil {
			return nil, e
		}

		var resID, resVer string
		var leaderUUID *string
		if leaderId != "" && leaderId != "<nil>" {
			leaderUUID = &leaderId
		}

		if id == "" || id == "<nil>" {
			newID := uuid.Must(uuid.NewV7()).String()
			e = tx.QueryRowContext(ctx, `INSERT INTO "_TRNGroup"(
				"IdSeq","Code","Name","LeaderId","LeaderName","Description"
			) VALUES($1,$2,$3,$4,$5,$6) RETURNING "IdSeq","RowVersion"::text`,
				newID, code, name, leaderUUID, leaderName, description,
			).Scan(&resID, &resVer)
		} else {
			if e = lockRowVersion(ctx, tx, rowCondition{Table: "_TRNGroup", ID: id, Version: fmt.Sprint(p["RowVersion"])}); e != nil {
				return nil, e
			}
			e = tx.QueryRowContext(ctx, `UPDATE "_TRNGroup" SET
				"Code"=$1,"Name"=$2,"LeaderId"=$3,"LeaderName"=$4,"Description"=$5,"UpdatedAt"=now()
				WHERE "IdSeq"=$6 RETURNING "IdSeq","RowVersion"::text`,
				code, name, leaderUUID, leaderName, description, id,
			).Scan(&resID, &resVer)
		}
		if e != nil {
			var pe *pq.Error
			if strings.Contains(e.Error(), "unique") || strings.Contains(e.Error(), "duplicate key") {
				return nil, status.Error(codes.AlreadyExists, "Mã nhóm '"+code+"' đã tồn tại")
			}
			_ = pe
			return nil, e
		}
		if e = tx.Commit(); e != nil {
			return nil, e
		}
		return structpb.NewStruct(map[string]any{"data": map[string]any{"id": resID, "RowVersion": resVer}})

	// D: Delete nhóm đào tạo
	case "training_group_delete":
		id := fmt.Sprint(p["id"])
		tx, e := s.DB.BeginTxx(ctx, nil)
		if e != nil {
			return nil, e
		}
		defer tx.Rollback()
		_, _ = tx.ExecContext(ctx, `DELETE FROM "_TRNGroupMember" WHERE "GroupId"=$1`, id)
		_, e = tx.ExecContext(ctx, `DELETE FROM "_TRNGroup" WHERE "IdSeq"=$1`, id)
		if e != nil {
			return nil, e
		}
		if e = tx.Commit(); e != nil {
			return nil, e
		}
		return structpb.NewStruct(map[string]any{"ok": true})

	// Member Assign: Thêm học viên vào nhóm
	case "training_group_member_add":
		groupID := fmt.Sprint(p["groupId"])
		userID := fmt.Sprint(p["userId"])
		if groupID == "" || userID == "" {
			return nil, invalid("Thiếu groupId hoặc userId")
		}
		_, e := s.DB.ExecContext(ctx, `INSERT INTO "_TRNGroupMember"("GroupId","UserId") VALUES($1,$2) ON CONFLICT DO NOTHING`, groupID, userID)
		if e != nil {
			return nil, e
		}
		return structpb.NewStruct(map[string]any{"ok": true})

	// Member Remove: Xóa học viên khỏi nhóm
	case "training_group_member_remove":
		groupID := fmt.Sprint(p["groupId"])
		userID := fmt.Sprint(p["userId"])
		_, e := s.DB.ExecContext(ctx, `DELETE FROM "_TRNGroupMember" WHERE "GroupId"=$1 AND "UserId"=$2`, groupID, userID)
		if e != nil {
			return nil, e
		}
		return structpb.NewStruct(map[string]any{"ok": true})
	}

	return nil, status.Error(codes.InvalidArgument, "Thao tác nhóm không hỗ trợ: "+action)
}

// Chấm thi (/manage/grading) dựa trên _ASMExamAttempt thật
func (s *Server) gradingAction(ctx context.Context, u account, action string, payload any) (*structpb.Struct, error) {
	raw, _ := json.Marshal(payload)
	var p map[string]any
	_ = json.Unmarshal(raw, &p)

	switch action {
	// Q: Lấy danh sách hàng đợi bài thi cần chấm
	case "grading_queue_list":
		rows, e := s.DB.QueryContext(ctx, `SELECT jsonb_build_object(
			'id', att."IdSeq",
			'candidateName', u."Name",
			'candidateEmail', u."Email",
			'examTitle', COALESCE(s."Title", a."Title"),
			'examCode', COALESCE(s."Code", a."Code"),
			'submittedAt', att."SubmittedAt",
			'status', att."GradingStatus",
			'finalScore', att."TotalScore",
			'maxScore', att."MaxScore",
			'passingScore', att."PassingScore",
			'isPassed', att."IsPassed",
			'feedback', att."Feedback"
		) || `+auditJSON("att")+` FROM "_ASMExamAttempt" att
		JOIN "_USRAccountDirectory" u ON u."Id"=att."UserId"
		LEFT JOIN "_ASMExamSession" s ON s."IdSeq"=att."ExamSessionId"
		LEFT JOIN "_ASMAssessment" a ON a."IdSeq"=att."AssessmentId"
		ORDER BY att."SubmittedAt" DESC NULLS LAST`)
		if e != nil {
			return nil, e
		}
		defer rows.Close()
		var list []any
		for rows.Next() {
			var b []byte
			if e = rows.Scan(&b); e != nil {
				return nil, e
			}
			var item any
			_ = json.Unmarshal(b, &item)
			list = append(list, item)
		}
		val, _ := structpb.NewValue(list)
		return structpb.NewStruct(map[string]any{"data": val.AsInterface()})

	// Q: Xem chi tiết bài nộp & câu trả lời để chấm
	case "grading_detail_get":
		id := fmt.Sprint(p["id"])
		var attData []byte
		e := s.DB.QueryRowContext(ctx, `SELECT jsonb_build_object(
			'id', att."IdSeq",
			'candidateName', u."Name",
			'candidateEmail', u."Email",
			'examTitle', COALESCE(s."Title", a."Title"),
			'examCode', COALESCE(s."Code", a."Code"),
			'submittedAt', att."SubmittedAt",
			'status', att."GradingStatus",
			'finalScore', att."TotalScore",
			'maxScore', att."MaxScore",
			'passingScore', att."PassingScore",
			'isPassed', att."IsPassed",
			'answers', att."Answers",
			'feedback', att."Feedback"
		) || `+auditJSON("att")+` FROM "_ASMExamAttempt" att
		JOIN "_USRAccountDirectory" u ON u."Id"=att."UserId"
		LEFT JOIN "_ASMExamSession" s ON s."IdSeq"=att."ExamSessionId"
		LEFT JOIN "_ASMAssessment" a ON a."IdSeq"=att."AssessmentId"
		WHERE att."IdSeq"=$1`, id).Scan(&attData)
		if e != nil {
			return nil, status.Error(codes.NotFound, "Không tìm thấy bài thi")
		}
		var item any
		_ = json.Unmarshal(attData, &item)
		val, _ := structpb.NewValue(item)
		return structpb.NewStruct(map[string]any{"data": val.AsInterface()})

	// U: Cập nhật điểm & nhận xét của giám thị
	case "grading_score_save":
		id := fmt.Sprint(p["id"])
		score := 0.0
		if sc, ok := p["score"].(float64); ok {
			score = sc
		}
		feedback := fmt.Sprint(p["feedback"])
		finalize := false
		if fz, ok := p["finalize"].(bool); ok {
			finalize = fz
		}

		gradingStatus := "needs_grading"
		if finalize {
			gradingStatus = "graded"
		}

		tx, e := s.DB.BeginTxx(ctx, nil)
		if e != nil {
			return nil, e
		}
		defer tx.Rollback()
		if e = setActor(ctx, tx, u); e != nil {
			return nil, e
		}

		var passingScore float64
		_ = tx.QueryRowContext(ctx, `SELECT "PassingScore" FROM "_ASMExamAttempt" WHERE "IdSeq"=$1`, id).Scan(&passingScore)
		isPassed := score >= passingScore

		_, e = tx.ExecContext(ctx, `UPDATE "_ASMExamAttempt" SET
			"TotalScore"=$1,
			"IsPassed"=$2,
			"Feedback"=$3,
			"GradingStatus"=$4,
			"GradedBy"=$5,
			"GradedAt"=now(),
			"UpdatedAt"=now()
			WHERE "IdSeq"=$6`, score, isPassed, feedback, gradingStatus, u.ID, id)
		if e != nil {
			return nil, e
		}
		if e = tx.Commit(); e != nil {
			return nil, e
		}
		return structpb.NewStruct(map[string]any{"ok": true})
	}

	return nil, status.Error(codes.InvalidArgument, "Thao tác chấm không hỗ trợ: "+action)
}

// Báo cáo & Phổ điểm (/manage/reports)
// Báo cáo & Phổ điểm (/manage/reports)
func (s *Server) reportAction(ctx context.Context, _ account, action string, payload any) (*structpb.Struct, error) {
	switch action {
	// Q: Tổng hợp báo cáo thống kê kỳ thi thực tế
	case "report_summary_get":
		var p map[string]any
		if payload != nil {
			raw, _ := json.Marshal(payload)
			_ = json.Unmarshal(raw, &p)
		}
		sessionFilter := strings.TrimSpace(fmt.Sprint(p["sessionId"]))
		assessmentFilter := strings.TrimSpace(fmt.Sprint(p["assessmentId"]))
		departmentFilter := strings.TrimSpace(fmt.Sprint(p["department"]))

		var whereClauses []string
		var args []any
		argIdx := 1

		if sessionFilter != "" && sessionFilter != "<nil>" && sessionFilter != "all" {
			whereClauses = append(whereClauses, fmt.Sprintf(`att."ExamSessionId" = $%d`, argIdx))
			args = append(args, sessionFilter)
			argIdx++
		}
		if assessmentFilter != "" && assessmentFilter != "<nil>" && assessmentFilter != "all" {
			whereClauses = append(whereClauses, fmt.Sprintf(`att."AssessmentId" = $%d`, argIdx))
			args = append(args, assessmentFilter)
			argIdx++
		}
		if departmentFilter != "" && departmentFilter != "<nil>" && departmentFilter != "all" {
			whereClauses = append(whereClauses, fmt.Sprintf(`(u."Department" = $%d OR d."Key" = $%d)`, argIdx, argIdx))
			args = append(args, departmentFilter)
			argIdx++
		}

		attWhere := ""
		if len(whereClauses) > 0 {
			attWhere = " WHERE " + strings.Join(whereClauses, " AND ")
		}

		// 1. Phổ điểm chi tiết & Thống kê KPI tổng quan
		kpiQuery := `SELECT 
			count(att."IdSeq") as total,
			count(att."IdSeq") FILTER (WHERE att."IsPassed") as passed,
			COALESCE(avg(att."TotalScore"), 0) as avg_score,
			COALESCE(max(att."TotalScore"), 0) as max_score,
			COALESCE(min(att."TotalScore"), 0) as min_score,
			COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY att."TotalScore"), 0) as median_score,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" >= 0 AND att."TotalScore" < 1) as bin_0_1,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" >= 1 AND att."TotalScore" < 2) as bin_1_2,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" >= 2 AND att."TotalScore" < 3) as bin_2_3,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" >= 3 AND att."TotalScore" < 4) as bin_3_4,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" >= 4 AND att."TotalScore" < 5) as bin_4_5,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" >= 5 AND att."TotalScore" < 6) as bin_5_6,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" >= 6 AND att."TotalScore" < 7) as bin_6_7,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" >= 7 AND att."TotalScore" < 8) as bin_7_8,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" >= 8 AND att."TotalScore" < 9) as bin_8_9,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" >= 9 AND att."TotalScore" <= 10) as bin_9_10,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" >= 9) as tier_excellent,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" >= 8 AND att."TotalScore" < 9) as tier_good,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" >= 6.5 AND att."TotalScore" < 8) as tier_fair,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" >= 5 AND att."TotalScore" < 6.5) as tier_avg,
			count(att."IdSeq") FILTER (WHERE att."TotalScore" < 5) as tier_poor
		FROM "_ASMExamAttempt" att
		JOIN "_USRAccountDirectory" u ON u."Id" = att."UserId"
		LEFT JOIN "_ORGDirectory" d ON d."Kind"='department' AND d."Key"=u."Department"` + attWhere

		var total, passed int
		var avgScore, maxScore, minScore, medianScore float64
		var b0, b1, b2, b3, b4, b5, b6, b7, b8, b9 int
		var tExc, tGood, tFair, tAvg, tPoor int

		_ = s.DB.QueryRowContext(ctx, kpiQuery, args...).Scan(
			&total, &passed, &avgScore, &maxScore, &minScore, &medianScore,
			&b0, &b1, &b2, &b3, &b4, &b5, &b6, &b7, &b8, &b9,
			&tExc, &tGood, &tFair, &tAvg, &tPoor,
		)

		passRate := 0.0
		if total > 0 {
			passRate = float64(passed) / float64(total) * 100
		}

		calcPct := func(count int) float64 {
			if total == 0 {
				return 0
			}
			return float64(count) / float64(total) * 100
		}

		scoreBins := []map[string]any{
			{"range": "0 - 1", "min": 0.0, "max": 1.0, "count": b0, "percentage": calcPct(b0), "passed": false},
			{"range": "1 - 2", "min": 1.0, "max": 2.0, "count": b1, "percentage": calcPct(b1), "passed": false},
			{"range": "2 - 3", "min": 2.0, "max": 3.0, "count": b2, "percentage": calcPct(b2), "passed": false},
			{"range": "3 - 4", "min": 3.0, "max": 4.0, "count": b3, "percentage": calcPct(b3), "passed": false},
			{"range": "4 - 5", "min": 4.0, "max": 5.0, "count": b4, "percentage": calcPct(b4), "passed": false},
			{"range": "5 - 6", "min": 5.0, "max": 6.0, "count": b5, "percentage": calcPct(b5), "passed": true},
			{"range": "6 - 7", "min": 6.0, "max": 7.0, "count": b6, "percentage": calcPct(b6), "passed": true},
			{"range": "7 - 8", "min": 7.0, "max": 8.0, "count": b7, "percentage": calcPct(b7), "passed": true},
			{"range": "8 - 9", "min": 8.0, "max": 9.0, "count": b8, "percentage": calcPct(b8), "passed": true},
			{"range": "9 - 10", "min": 9.0, "max": 10.0, "count": b9, "percentage": calcPct(b9), "passed": true},
		}

		gradeTiers := []map[string]any{
			{"key": "excellent", "label": "Xuất sắc", "range": "9.0 - 10.0", "count": tExc, "percentage": calcPct(tExc), "color": "#10b981"},
			{"key": "good", "label": "Giỏi", "range": "8.0 - 8.9", "count": tGood, "percentage": calcPct(tGood), "color": "#0ea5e9"},
			{"key": "fair", "label": "Khá", "range": "6.5 - 7.9", "count": tFair, "percentage": calcPct(tFair), "color": "#6366f1"},
			{"key": "average", "label": "Trung bình", "range": "5.0 - 6.4", "count": tAvg, "percentage": calcPct(tAvg), "color": "#f59e0b"},
			{"key": "poor", "label": "Chưa đạt", "range": "< 5.0", "count": tPoor, "percentage": calcPct(tPoor), "color": "#ef4444"},
		}

		// 2. Thống kê theo Đợt thi / Ca thi (Sessions)
		sessionRows, e := s.DB.QueryContext(ctx, `SELECT 
			s."IdSeq"::text,
			s."Code",
			s."Title",
			COALESCE(a."Title", 'Chưa gán'),
			COALESCE(to_char(s."StartTime", 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
			COALESCE(to_char(s."EndTime", 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
			s."Status",
			count(att."IdSeq") as attempts,
			count(att."IdSeq") FILTER (WHERE att."IsPassed") as passed,
			COALESCE(avg(att."TotalScore"), 0) as avg_score,
			COALESCE(max(att."TotalScore"), 0) as max_score
		FROM "_ASMExamSession" s
		LEFT JOIN "_ASMAssessment" a ON a."IdSeq" = s."AssessmentId"
		LEFT JOIN "_ASMExamAttempt" att ON att."ExamSessionId" = s."IdSeq"
		GROUP BY s."IdSeq", s."Code", s."Title", a."Title", s."StartTime", s."EndTime", s."Status"
		ORDER BY attempts DESC, s."StartTime" DESC`)
		sessionStats := []map[string]any{}
		if e == nil {
			defer sessionRows.Close()
			for sessionRows.Next() {
				var id, code, title, asmTitle, start, end, st string
				var cnt, pass int
				var avgSc, maxSc float64
				if sessionRows.Scan(&id, &code, &title, &asmTitle, &start, &end, &st, &cnt, &pass, &avgSc, &maxSc) == nil {
					pRate := 0.0
					if cnt > 0 {
						pRate = float64(pass) / float64(cnt) * 100
					}
					sessionStats = append(sessionStats, map[string]any{
						"id":              id,
						"code":            code,
						"title":           title,
						"assessmentTitle": asmTitle,
						"startTime":       start,
						"endTime":         end,
						"status":          st,
						"attempts":        cnt,
						"passed":          pass,
						"avgScore":        avgSc,
						"maxScore":        maxSc,
						"passRate":        pRate,
					})
				}
			}
		}

		// 3. Thống kê theo Bộ đề thi (Assessments)
		asmRows, e := s.DB.QueryContext(ctx, `SELECT 
			a."IdSeq"::text,
			a."Code",
			a."Title",
			a."TotalPoints",
			a."PassingScore",
			a."Status",
			count(att."IdSeq") as attempts,
			count(att."IdSeq") FILTER (WHERE att."IsPassed") as passed,
			COALESCE(avg(att."TotalScore"), 0) as avg_score,
			COALESCE(max(att."TotalScore"), 0) as max_score
		FROM "_ASMAssessment" a
		LEFT JOIN "_ASMExamAttempt" att ON att."AssessmentId" = a."IdSeq"
		GROUP BY a."IdSeq", a."Code", a."Title", a."TotalPoints", a."PassingScore", a."Status"
		ORDER BY attempts DESC, a."Title" ASC`)
		assessmentStats := []map[string]any{}
		if e == nil {
			defer asmRows.Close()
			for asmRows.Next() {
				var id, code, title, st string
				var maxPts, passScore float64
				var cnt, pass int
				var avgSc, maxSc float64
				if asmRows.Scan(&id, &code, &title, &maxPts, &passScore, &st, &cnt, &pass, &avgSc, &maxSc) == nil {
					pRate := 0.0
					if cnt > 0 {
						pRate = float64(pass) / float64(cnt) * 100
					}
					assessmentStats = append(assessmentStats, map[string]any{
						"id":           id,
						"code":         code,
						"title":        title,
						"totalPoints":  maxPts,
						"passingScore": passScore,
						"status":       st,
						"attempts":     cnt,
						"passed":       pass,
						"avgScore":     avgSc,
						"maxScore":     maxSc,
						"passRate":     pRate,
					})
				}
			}
		}

		// 4. Thống kê theo phòng ban từ user và attempt
		deptQuery := `SELECT 
			COALESCE(NULLIF(d."Label", ''), NULLIF(u."Department", ''), 'Chưa gán đơn vị') AS dept, 
			count(att."IdSeq") as attempts, 
			count(att."IdSeq") FILTER (WHERE att."IsPassed"), 
			COALESCE(avg(att."TotalScore"), 0) as avg_score,
			COALESCE(max(att."TotalScore"), 0) as max_score
		FROM "_ASMExamAttempt" att
		JOIN "_USRAccountDirectory" u ON u."Id"=att."UserId"
		LEFT JOIN "_ORGDirectory" d ON d."Kind"='department' AND d."Key"=u."Department"` + attWhere + `
		GROUP BY 1
		ORDER BY attempts DESC`

		deptRows, e := s.DB.QueryContext(ctx, deptQuery, args...)
		deptStats := []map[string]any{}
		if e == nil {
			defer deptRows.Close()
			for deptRows.Next() {
				var dname string
				var cnt, pass int
				var score, maxSc float64
				if deptRows.Scan(&dname, &cnt, &pass, &score, &maxSc) == nil {
					rate := 0.0
					if cnt > 0 {
						rate = float64(pass) / float64(cnt) * 100
					}
					deptStats = append(deptStats, map[string]any{
						"department": dname,
						"attempts":   cnt,
						"passed":     pass,
						"avgScore":   score,
						"maxScore":   maxSc,
						"passRate":   rate,
					})
				}
			}
		}

		// 5. Danh sách options cho bộ lọc (filterOptions)
		filterSessions := []map[string]string{}
		sRows, _ := s.DB.QueryContext(ctx, `SELECT "IdSeq"::text, "Code", "Title" FROM "_ASMExamSession" ORDER BY "Title" ASC`)
		if sRows != nil {
			defer sRows.Close()
			for sRows.Next() {
				var id, code, title string
				if sRows.Scan(&id, &code, &title) == nil {
					filterSessions = append(filterSessions, map[string]string{"id": id, "code": code, "title": title})
				}
			}
		}

		filterAssessments := []map[string]string{}
		aRows, _ := s.DB.QueryContext(ctx, `SELECT "IdSeq"::text, "Code", "Title" FROM "_ASMAssessment" ORDER BY "Title" ASC`)
		if aRows != nil {
			defer aRows.Close()
			for aRows.Next() {
				var id, code, title string
				if aRows.Scan(&id, &code, &title) == nil {
					filterAssessments = append(filterAssessments, map[string]string{"id": id, "code": code, "title": title})
				}
			}
		}

		filterDepartments := []map[string]string{}
		dRows, _ := s.DB.QueryContext(ctx, `SELECT "Key", "Label" FROM "_ORGDirectory" WHERE "Kind"='department' AND "Enabled" ORDER BY "Label" ASC`)
		if dRows != nil {
			defer dRows.Close()
			for dRows.Next() {
				var k, l string
				if dRows.Scan(&k, &l) == nil {
					filterDepartments = append(filterDepartments, map[string]string{"key": k, "label": l})
				}
			}
		}

		res := map[string]any{
			"totalAttempts":   total,
			"passedAttempts":  passed,
			"failedAttempts":  total - passed,
			"passRate":        passRate,
			"avgScore":        avgScore,
			"maxScore":        maxScore,
			"minScore":        minScore,
			"medianScore":     medianScore,
			"scoreBins":       scoreBins,
			"gradeTiers":      gradeTiers,
			"sessionStats":    sessionStats,
			"assessmentStats": assessmentStats,
			"departmentStats": deptStats,
			"filterOptions": map[string]any{
				"sessions":    filterSessions,
				"assessments": filterAssessments,
				"departments": filterDepartments,
			},
		}
		return jsonReply(map[string]any{"data": res})
	}
	return nil, status.Error(codes.InvalidArgument, "Thao tác báo cáo không hỗ trợ: "+action)
}
