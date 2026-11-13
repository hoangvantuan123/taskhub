package skillauth

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"
)

//go:embed assessments_schema.sql
var AssessmentsSchema string

func (s *Server) assessmentAction(ctx context.Context, u account, action string, payload any) (*structpb.Struct, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, invalid("Dữ liệu bộ đề không hợp lệ")
	}
	var p map[string]any
	if err = json.Unmarshal(raw, &p); err != nil {
		return nil, invalid("Dữ liệu bộ đề không hợp lệ")
	}
	permission := "assessments:view"
	if action == "assessment_save" {
		if strings.TrimSpace(fmt.Sprint(p["id"])) == "" {
			permission = "assessments:create"
		} else {
			permission = "assessments:update"
		}
	}
	if action == "assessment_publish" {
		permission = "assessments:publish"
	}
	if action == "assessment_list" || action == "assessment_get" {
		permission = "assessments:view"
	}
	if action == "blueprint_save" {
		permission = "blueprints:update"
	}
	if !s.allowed(ctx, u, permission) {
		return nil, status.Error(codes.PermissionDenied, "Bạn không có quyền "+permission)
	}
	switch action {
	case "assessment_list", "assessment_get":
		id := strings.TrimSpace(fmt.Sprint(p["id"]))
		if action == "assessment_get" && !validQuestionUUID(id) {
			return nil, invalid("UUID bộ đề không hợp lệ")
		}
		where, args := ` WHERE a."Status"='published'`, []any{}
		canManage := s.allowed(ctx, u, "assessments:update") || s.allowed(ctx, u, "assessments:create")
		if action == "assessment_list" && canManage {
			where = ""
		}
		if action == "assessment_get" {
			if canManage {
				where = ` WHERE a."IdSeq"=$1`
				args = append(args, id)
			} else {
				where = ` WHERE a."IdSeq"=$1 AND a."Status"='published'`
				args = append(args, id)
			}
		}
		rows, e := s.DB.QueryContext(ctx, `SELECT jsonb_build_object(
			'id', a."IdSeq",
			'code', a."Code",
			'title', a."Title",
			'subjectId', COALESCE(a."SubjectId"::text, ''),
			'subjectName', COALESCE(s."Label", a."SubjectName"),
			'targetGroup', COALESCE(g."Value", 'all'),
			'targetGroupId', COALESCE(a."TargetGroupId"::text, ''),
			'targetGroupName', COALESCE(g."Label", 'Tất cả các nhóm'),
			'targetRank', COALESCE(a."TargetRank"::text, ''),
			'targetRankName', COALESCE(r."Label", 'Tất cả cấp bậc'),
			'targetDepartment', COALESCE(a."TargetDepartment"::text, ''),
			'targetDepartmentName', COALESCE(d."Label", 'Tất cả phòng ban'),
			'targetPosition', COALESCE(a."TargetPosition"::text, ''),
			'targetPositionName', COALESCE(p."Label", 'Tất cả vị trí'),
			'targetRole', COALESCE(a."TargetRole"::text, ''),
			'targetRoleName', COALESCE(ro."Label", 'Tất cả vai trò'),
			'registration', a."Registration",
			'hasCriticalRule', a."HasCriticalRule",
			'durationMinutes', a."DurationMinutes",
			'totalPoints', a."TotalPoints",
			'passingScore', a."PassingScore",
			'questions', to_jsonb(a."QuestionIds"),
			'questionCount', cardinality(a."QuestionIds"),
			'status', a."Status",
			'publishedAt', a."PublishedAt"
		) || `+auditJSON("a")+` FROM "_ASMAssessment" a
		LEFT JOIN "_SYSCatalogOption" s ON s."IdSeq"=a."SubjectId"
		LEFT JOIN "_SYSCatalogOption" g ON g."IdSeq"=a."TargetGroupId"
		LEFT JOIN "_SYSCatalogOption" r ON r."IdSeq"=a."TargetRank"
		LEFT JOIN "_SYSCatalogOption" d ON d."IdSeq"=a."TargetDepartment"
		LEFT JOIN "_SYSCatalogOption" p ON p."IdSeq"=a."TargetPosition"
		LEFT JOIN "_SYSCatalogOption" ro ON ro."IdSeq"=a."TargetRole"`+where+` ORDER BY a."UpdatedAt" DESC`, args...)
		if e != nil {
			return nil, e
		}
		defer rows.Close()
		data := []any{}
		for rows.Next() {
			var b []byte
			if e = rows.Scan(&b); e != nil {
				return nil, e
			}
			var x any
			if e = json.Unmarshal(b, &x); e != nil {
				return nil, e
			}
			data = append(data, x)
		}
		if e = rows.Err(); e != nil {
			return nil, e
		}
		if action == "assessment_get" {
			if len(data) == 0 {
				return nil, status.Error(codes.NotFound, "Không tìm thấy bộ đề")
			}
			return jsonReply(map[string]any{"data": data[0]})
		}
		return jsonReply(map[string]any{"data": data, "meta": map[string]any{"total": len(data)}})
	case "assessment_save", "assessment_publish":
		if action == "assessment_publish" {
			if !validQuestionUUID(strings.TrimSpace(fmt.Sprint(p["id"]))) || !validRowVersion(fmt.Sprint(p["RowVersion"])) {
				return nil, invalid("Xuất bản cần UUID và RowVersion bộ đề")
			}
			var current, currentStatus string
			if e := s.DB.QueryRowContext(ctx, `SELECT "RowVersion"::text,"Status" FROM "_ASMAssessment" WHERE "IdSeq"=$1`, fmt.Sprint(p["id"])).Scan(&current, &currentStatus); e != nil {
				return nil, e
			}
			if current != fmt.Sprint(p["RowVersion"]) {
				return nil, versionConflict()
			}
			if currentStatus != "draft" {
				return nil, status.Error(codes.FailedPrecondition, "Chỉ bộ đề nháp mới được xuất bản")
			}
			tx, e := s.DB.BeginTxx(ctx, nil)
			if e != nil {
				return nil, e
			}
			defer tx.Rollback()
			if e = setActor(ctx, tx, u); e != nil {
				return nil, e
			}
			if e = lockRowVersion(ctx, tx, rowCondition{Table: "_ASMAssessment", ID: fmt.Sprint(p["id"]), Version: fmt.Sprint(p["RowVersion"])}); e != nil {
				return nil, e
			}
			if _, e = tx.ExecContext(ctx, `UPDATE "_ASMAssessment" SET "Status"='published',"PublishedAt"=now(),"UpdatedAt"=now() WHERE "IdSeq"=$1`, fmt.Sprint(p["id"])); e != nil {
				return nil, e
			}
			if e = tx.Commit(); e != nil {
				return nil, e
			}
			var nextVersion string
			if e = s.DB.GetContext(ctx, &nextVersion, `SELECT "RowVersion"::text FROM "_ASMAssessment" WHERE "IdSeq"=$1`, fmt.Sprint(p["id"])); e != nil {
				return nil, e
			}
			return jsonReply(map[string]any{"data": map[string]any{"id": fmt.Sprint(p["id"]), "RowVersion": nextVersion, "status": "published"}})
		}
		var in struct {
			ID, Code, Title, SubjectID, SubjectName, TargetGroup, TargetRank string
			TargetDepartment, TargetPosition, TargetRole                     string
			Registration                                                     map[string]any
			RowVersion                                                       string
			HasCriticalRule                                                  bool
			DurationMinutes                                                  int
			TotalPoints, PassingScore                                        float64
			Questions                                                        []string
			Status                                                           string
		}
		if e := json.Unmarshal(raw, &in); e != nil {
			return nil, invalid("Payload bộ đề không hợp lệ")
		}
		in.Code = strings.TrimSpace(in.Code)
		in.Title = strings.TrimSpace(in.Title)
		if in.Registration == nil {
			in.Registration = map[string]any{}
		}
		if in.ID != "" {
			var currentStatus string
			if e := s.DB.GetContext(ctx, &currentStatus, `SELECT "Status" FROM "_ASMAssessment" WHERE "IdSeq"=$1`, in.ID); e != nil {
				return nil, e
			}
			if currentStatus != "draft" {
				return nil, status.Error(codes.FailedPrecondition, "Bộ đề đã xuất bản và không thể sửa trực tiếp")
			}
			if !validRowVersion(in.RowVersion) {
				return nil, invalid("RowVersion bắt buộc khi sửa")
			}
		}
		if !regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$`).MatchString(in.Code) || in.Title == "" || len([]rune(in.Title)) > 240 || in.DurationMinutes < 1 || in.DurationMinutes > 600 || in.TotalPoints <= 0 || in.PassingScore < 0 || in.PassingScore > in.TotalPoints || len(in.Questions) == 0 || len(in.Questions) > 500 {
			return nil, invalid("Mã/tên đề, thời lượng, điểm hoặc danh sách câu hỏi không hợp lệ")
		}
		ids := []string{}
		seen := map[string]bool{}
		for _, id := range in.Questions {
			if !validQuestionUUID(id) || seen[id] {
				return nil, invalid("Danh sách câu hỏi chứa UUID không hợp lệ hoặc trùng")
			}
			seen[id] = true
			ids = append(ids, id)
		}

		toUUIDOrNil := func(val string) any {
			val = strings.TrimSpace(val)
			if val == "" || val == "all" {
				return nil
			}
			if validQuestionUUID(val) {
				return val
			}
			return nil
		}

		targetGroup := toUUIDOrNil(in.TargetGroup)
		subjectID := toUUIDOrNil(in.SubjectID)
		targetRank := toUUIDOrNil(in.TargetRank)
		targetDepartment := toUUIDOrNil(in.TargetDepartment)
		targetPosition := toUUIDOrNil(in.TargetPosition)
		targetRole := toUUIDOrNil(in.TargetRole)

		subjectName := strings.TrimSpace(in.SubjectName)
		if subjectID != nil {
			var label string
			if e := s.DB.GetContext(ctx, &label, `SELECT "Label" FROM "_SYSCatalogOption" WHERE "IdSeq"=$1`, subjectID); e == nil && label != "" {
				subjectName = label
			}
		}

		var available int
		if e := s.DB.GetContext(ctx, &available, `SELECT count(*) FROM "_QSTQuestion" WHERE "IdSeq"=ANY($1::uuid[]) AND "Status"='published'`, pq.Array(ids)); e != nil {
			return nil, e
		}
		if available != len(ids) {
			return nil, invalid("Chỉ được chọn câu hỏi đã xuất bản trong ngân hàng câu hỏi")
		}
		registration, _ := json.Marshal(in.Registration)
		if in.Registration == nil {
			registration = []byte(`{}`)
		}
		if in.ID != "" && in.Status == "published" {
			return nil, status.Error(codes.FailedPrecondition, "Không sửa bộ đề đã xuất bản; hãy tạo phiên bản mới")
		}
		statusValue := in.Status
		if action == "assessment_publish" {
			statusValue = "published"
		}
		if statusValue != "draft" && statusValue != "published" {
			return nil, invalid("Trạng thái bộ đề không hợp lệ")
		}
		if statusValue == "published" && action != "assessment_publish" {
			return nil, status.Error(codes.PermissionDenied, "Dùng thao tác xuất bản để chốt bộ đề")
		}
		tx, e := s.DB.BeginTxx(ctx, nil)
		if e != nil {
			return nil, e
		}
		defer tx.Rollback()
		if e = setActor(ctx, tx, u); e != nil {
			return nil, e
		}
		var id, version string
		if in.ID == "" {
			e = tx.QueryRowContext(ctx, `INSERT INTO "_ASMAssessment"("Code","Title","SubjectId","SubjectName","TargetGroupId","TargetRank","TargetDepartment","TargetPosition","TargetRole","Registration","HasCriticalRule","DurationMinutes","TotalPoints","PassingScore","QuestionIds","Status","PublishedAt") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15::uuid[],$16,CASE WHEN $16='published' THEN now() END) RETURNING "IdSeq","RowVersion"::text`, in.Code, in.Title, subjectID, subjectName, targetGroup, targetRank, targetDepartment, targetPosition, targetRole, string(registration), in.HasCriticalRule, in.DurationMinutes, in.TotalPoints, in.PassingScore, pq.Array(ids), statusValue).Scan(&id, &version)
		} else {
			if !validQuestionUUID(in.ID) || !validRowVersion(in.RowVersion) {
				return nil, invalid("UUID và RowVersion bắt buộc khi sửa")
			}
			if e = lockRowVersion(ctx, tx, rowCondition{Table: "_ASMAssessment", ID: in.ID, Version: in.RowVersion}); e != nil {
				return nil, e
			}
			e = tx.QueryRowContext(ctx, `UPDATE "_ASMAssessment" SET "Code"=$1,"Title"=$2,"SubjectId"=$3,"SubjectName"=$4,"TargetGroupId"=$5,"TargetRank"=$6,"TargetDepartment"=$7,"TargetPosition"=$8,"TargetRole"=$9,"Registration"=$10::jsonb,"HasCriticalRule"=$11,"DurationMinutes"=$12,"TotalPoints"=$13,"PassingScore"=$14,"QuestionIds"=$15::uuid[],"Status"=$16,"PublishedAt"=CASE WHEN $16='published' THEN COALESCE("PublishedAt",now()) ELSE NULL END,"UpdatedAt"=now() WHERE "IdSeq"=$17 RETURNING "IdSeq","RowVersion"::text`, in.Code, in.Title, subjectID, subjectName, targetGroup, targetRank, targetDepartment, targetPosition, targetRole, string(registration), in.HasCriticalRule, in.DurationMinutes, in.TotalPoints, in.PassingScore, pq.Array(ids), statusValue, in.ID).Scan(&id, &version)
		}
		if e != nil {
			return nil, e
		}
		if e = tx.Commit(); e != nil {
			return nil, e
		}
		return jsonReply(map[string]any{"data": map[string]any{"id": id, "RowVersion": version, "status": statusValue}})
	case "blueprint_list", "blueprint_save":
		if action == "blueprint_list" {
			mode := fmt.Sprint(p["mode"])
			if mode != "exam" && mode != "practice" {
				return nil, invalid("Chế độ đề không hợp lệ")
			}
			rows, e := s.DB.QueryContext(ctx, `SELECT jsonb_build_object('id',b."IdSeq",'mode',b."Mode",'scope',b."Scope",'config',b."Config") || `+auditJSON("b")+` FROM "_ASMBlueprint" b WHERE b."Mode"=$1 ORDER BY b."UpdatedAt" DESC`, mode)
			if e != nil {
				return nil, e
			}
			defer rows.Close()
			items := []any{}
			for rows.Next() {
				var b []byte
				if e = rows.Scan(&b); e != nil {
					return nil, e
				}
				var v any
				_ = json.Unmarshal(b, &v)
				items = append(items, v)
			}
			return jsonReply(map[string]any{"data": items})
		}
		mode := fmt.Sprint(p["mode"])
		if mode != "exam" && mode != "practice" {
			return nil, invalid("Chế độ đề không hợp lệ")
		}
		scope := p["scope"]
		config := p["config"]
		if config == nil {
			return nil, invalid("Thiếu cấu hình ma trận")
		}
		if err := validateBlueprintScope(ctx, s.DB, p["scope"]); err != nil {
			return nil, err
		}
		if err := validateBlueprint(config); err != nil {
			return nil, err
		}
		scopeRaw, _ := json.Marshal(scope)
		configRaw, _ := json.Marshal(config)
		tx, e := s.DB.BeginTxx(ctx, nil)
		if e != nil {
			return nil, e
		}
		defer tx.Rollback()
		if e = setActor(ctx, tx, u); e != nil {
			return nil, e
		}
		var id, version string
		e = tx.QueryRowContext(ctx, `INSERT INTO "_ASMBlueprint"("Mode","Scope","Config") VALUES($1,$2::jsonb,$3::jsonb) ON CONFLICT("Mode","Scope") DO UPDATE SET "Config"=excluded."Config","UpdatedAt"=now() RETURNING "IdSeq","RowVersion"::text`, mode, string(scopeRaw), string(configRaw)).Scan(&id, &version)
		if e != nil {
			return nil, e
		}
		if e = tx.Commit(); e != nil {
			return nil, e
		}
		return jsonReply(map[string]any{"data": map[string]any{"id": id, "RowVersion": version}})
	}
	return nil, invalid("Thao tác bộ đề không hợp lệ")
}

func validateBlueprint(value any) error {
	raw, _ := json.Marshal(value)
	var c struct {
		TotalQuestions      int            `json:"totalQuestions"`
		Distribution        map[string]int `json:"distribution"`
		CriticalCount       int            `json:"criticalCount"`
		SimulationQuestions int            `json:"simulationQuestions"`
		PassingPercentage   float64        `json:"passingPercentage"`
		DurationMinutes     int            `json:"durationMinutes"`
		MaxAttempts         int            `json:"maxAttempts"`
		IpSubnet            string         `json:"ipSubnet"`
	}
	if err := json.Unmarshal(raw, &c); err != nil {
		return invalid("Cấu hình ma trận không hợp lệ")
	}
	if c.TotalQuestions < 1 || c.TotalQuestions > 500 || c.DurationMinutes < 1 || c.DurationMinutes > 600 || c.CriticalCount < 0 || c.CriticalCount > c.TotalQuestions || c.SimulationQuestions < 0 || c.SimulationQuestions > c.TotalQuestions || c.PassingPercentage < 0 || c.PassingPercentage > 100 || c.MaxAttempts < 0 || c.MaxAttempts > 100 {
		return invalid("Số lượng câu, thời gian, điểm đạt hoặc số lần thi không hợp lệ")
	}
	total := 0
	for _, level := range []string{"l0", "l1", "l2", "l3"} {
		n := c.Distribution[level]
		if n < 0 || n > c.TotalQuestions {
			return invalid("Phân bổ câu hỏi theo cấp độ không hợp lệ")
		}
		total += n
	}
	if total != c.TotalQuestions {
		return invalid("Tổng phân bổ theo cấp độ phải bằng tổng số câu")
	}
	return nil
}

func validateAssessmentScope(ctx context.Context, db *sqlx.DB, rank, department, position, role string) error {
	for _, item := range []struct{ kind, value string }{{"rank", rank}, {"department", department}, {"position", position}, {"businessRole", role}} {
		if item.value == "" {
			continue
		}
		var exists bool
		if err := db.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM "_ORGDirectory" WHERE "Kind"=$1 AND "Key"=$2 AND "Enabled")`, item.kind, item.value); err != nil {
			return err
		}
		if !exists {
			return invalid("Phạm vi áp dụng không tồn tại hoặc đã ngừng sử dụng: " + item.kind)
		}
	}
	return nil
}

func validateBlueprintScope(ctx context.Context, db *sqlx.DB, value any) error {
	raw, _ := json.Marshal(value)
	var scope map[string]string
	if err := json.Unmarshal(raw, &scope); err != nil {
		return invalid("Phạm vi ma trận không hợp lệ")
	}
	for kind, key := range scope {
		if key == "" {
			continue
		}
		var exists bool
		if err := db.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM "_ORGDirectory" WHERE "Kind"=$1 AND "Key"=$2 AND "Enabled")`, kind, key); err != nil {
			return err
		}
		if !exists {
			return invalid("Phạm vi ma trận không hợp lệ: " + kind)
		}
	}
	return nil
}

// InitSampleAssessments seeds sample assessments into the database if none exist.
func (s *Server) InitSampleAssessments(ctx context.Context) error {
	var count int
	if err := s.DB.GetContext(ctx, &count, `SELECT count(*) FROM "_ASMAssessment"`); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	var questionIDs []string
	if err := s.DB.SelectContext(ctx, &questionIDs, `SELECT "IdSeq"::text FROM "_QSTQuestion" WHERE "Status"='published' ORDER BY "CreatedAt" ASC LIMIT 15`); err != nil {
		return err
	}
	if len(questionIDs) == 0 {
		return nil
	}

	var actorID string
	_ = s.DB.GetContext(ctx, &actorID, `SELECT "IdSeq"::text FROM "_SYSActorDirectory" WHERE "ActorType"='SYSTEM' LIMIT 1`)

	q1 := questionIDs
	if len(q1) > 8 {
		q1 = q1[:8]
	}
	q2 := questionIDs
	if len(q2) > 5 {
		q2 = q2[len(q2)-5:]
	}

	limit3 := len(q1)
	if limit3 > 4 {
		limit3 = 4
	}

	samples := []struct {
		code, title, subjectName, status string
		duration, passing                int
		criticalRule                     bool
		questions                        []string
	}{
		{
			code:         "ASM-MES-2026",
			title:        "Đánh giá Năng lực Vận hành MES & Tự động hóa Smart Factory",
			subjectName:  "Hệ thống Điều hành Sản xuất (MES & Smart Factory)",
			status:       "published",
			duration:     45,
			passing:      7,
			criticalRule: true,
			questions:    q1,
		},
		{
			code:         "ASM-ARCH-SEC",
			title:        "Đánh giá Kiến trúc Modular Monolith & Bảo mật Hệ thống",
			subjectName:  "Kiến trúc Phần mềm & Clean Code",
			status:       "published",
			duration:     60,
			passing:      8,
			criticalRule: true,
			questions:    q2,
		},
		{
			code:         "ASM-PRACTICE-DRAFT",
			title:        "Bộ đề Luyện tập Quy chuẩn Kỹ thuật Tân tuyển (Bản nháp)",
			subjectName:  "Lập trình Frontend & React 19",
			status:       "draft",
			duration:     30,
			passing:      6,
			criticalRule: false,
			questions:    q1[:limit3],
		},
	}

	for _, smp := range samples {
		_, err := s.DB.ExecContext(ctx, `
			INSERT INTO "_ASMAssessment" (
				"Code", "Title", "SubjectName", "DurationMinutes", "TotalPoints", "PassingScore",
				"HasCriticalRule", "QuestionIds", "Status", "PublishedAt", "CreatedBy", "UpdatedBy"
			) VALUES (
				$1, $2, $3, $4, 10, $5,
				$6, $7::uuid[], $8, CASE WHEN $8='published' THEN now() END,
				COALESCE(NULLIF($9,'')::uuid, "_SYSUUIDv7"()), COALESCE(NULLIF($9,'')::uuid, "_SYSUUIDv7"())
			) ON CONFLICT ("Code") DO NOTHING
		`, smp.code, smp.title, smp.subjectName, smp.duration, smp.passing, smp.criticalRule, pq.Array(smp.questions), smp.status, actorID)
		if err != nil {
			return err
		}
	}
	return nil
}

