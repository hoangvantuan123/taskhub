package skillauth

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"
)

//go:embed questions_schema.sql
var QuestionsSchema string

type questionInput struct {
	ID               string `json:"id"`
	LevelID          string `json:"levelId"`
	FormatID         string `json:"formatId"`
	SpecialtyID      string `json:"specialtyId"`
	TopicID          string `json:"topicId"`
	TargetGroupID    string `json:"targetGroupId"`
	CognitiveLevelID string `json:"cognitiveLevelId"`
	FolderID         string `json:"folderId"`
	Content          string `json:"content"`
	Explanation      string `json:"explanation"`
	Type             string `json:"type"`
	Options          []struct {
		ID        string `json:"id"`
		Text      string `json:"text"`
		IsCorrect bool   `json:"isCorrect"`
	} `json:"options"`
	Rubrics []struct {
		ID          string  `json:"id"`
		Title       string  `json:"title"`
		MaxScore    float64 `json:"maxScore"`
		Description string  `json:"description"`
	} `json:"rubrics"`
	SimulationType string `json:"simulationType"`
	SimulationID   string `json:"simulationId"`
	IsCritical     bool   `json:"isCritical"`
	CriticalReason string `json:"criticalReason"`
	ImageURL       string `json:"imageUrl"`
	Status         string `json:"status"`
	Version        int    `json:"version"`
	RowVersion     string `json:"RowVersion"`
}

type questionSimulationInput struct {
	ID          string          `json:"id"`
	RowVersion  string          `json:"RowVersion"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	TemplateKey string          `json:"templateKey"`
	Config      json.RawMessage `json:"config"`
}

func validQuestionUUID(value string) bool {
	id, err := uuid.Parse(value)
	return err == nil && id.Version() == 7
}

var questionJSON = `jsonb_build_object('id',q."IdSeq",'imageUrl',q."ImageUrl",'levelId',q."LevelId",'formatId',q."FormatId",'specialtyId',q."SpecialtyId",'topicId',q."TopicId",'targetGroupId',q."TargetGroupId",'cognitiveLevelId',q."CognitiveLevelId",'folderId',q."FolderId",'level',q."LevelCode",'levelName',q."LevelName",'format',q."FormatCode",'formatLabel',q."FormatName",'subjectName',q."SpecialtyName",'topicName',q."TopicName",'targetGroupName',q."TargetGroupName",'difficulty',q."CognitiveLevelCode",'difficultyLabel',q."CognitiveLevelName",'content',q."Content",'explanation',q."Explanation",'type',q."Type",'options',q."Options",'rubrics',q."Rubrics",'simulationType',q."SimulationType",'simulationId',q."SimulationId",'simulation',CASE WHEN q."SimulationId" IS NULL THEN NULL ELSE jsonb_build_object('id',q."SimulationId",'name',q."SimulationName",'description',q."SimulationDescription",'templateKey',q."SimulationTemplateKey",'config',q."SimulationConfig") END,'isCritical',q."IsCritical",'criticalReason',q."CriticalReason",'status',q."Status",'author',q."AuthorName",'version',q."Version",'updatedAt',q."UpdatedAt",'folderName',q."FolderName",'isSample',q."SampleKey" IS NOT NULL,'RowVersion',q."RowVersion"::text) || ` + auditJSON("q")

func (s *Server) questionAction(ctx context.Context, u account, action string, payload any) (*structpb.Struct, error) {
	var req struct {
		ID          string            `json:"id"`
		RowVersion  string            `json:"RowVersion"`
		Search      string            `json:"search"`
		FolderID    string            `json:"folderId"`
		Level       string            `json:"level"`
		Page        int               `json:"page"`
		PageSize    int               `json:"pageSize"`
		Name        string            `json:"name"`
		Description string            `json:"description"`
		LevelID     string            `json:"levelId"`
		Questions   []questionInput   `json:"questions"`
		Filters     map[string]string `json:"filters"`
		SortField   string            `json:"sortField"`
		SortAsc     bool              `json:"sortAsc"`
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, invalid("Dữ liệu không hợp lệ")
	}
	if err = json.Unmarshal(raw, &req); err != nil {
		return nil, invalid("Dữ liệu không hợp lệ")
	}
	permission := "questions:view"
	switch action {
	case "question_save":
		var q questionInput
		_ = json.Unmarshal(raw, &q)
		if q.ID == "" {
			permission = "questions:create"
		} else {
			permission = "questions:update"
		}
	case "question_import":
		permission = "questions:import"
	case "question_folder_save":
		permission = "questions:create"
		if req.ID != "" {
			permission = "questions:update"
		}
	case "question_simulation_save":
		var simulation questionSimulationInput
		_ = json.Unmarshal(raw, &simulation)
		if simulation.ID == "" {
			permission = "questions:create"
		} else {
			permission = "questions:update"
		}
	}
	if !s.allowed(ctx, u, permission) {
		return nil, status.Error(codes.PermissionDenied, "Bạn không có quyền "+permission)
	}
	switch action {
	case "question_catalogs":
		rows, e := s.DB.QueryContext(ctx, `SELECT c."Key",c."Label",COALESCE(jsonb_agg(jsonb_build_object('id',o."IdSeq",'value',o."Value",'label',o."Label",'active',o."Enabled",'parentId',o."ParentId") ORDER BY o."SortOrder",o."Value") FILTER(WHERE o."IdSeq" IS NOT NULL),'[]') FROM "_SYSCatalogDirectory" c LEFT JOIN "_SYSCatalogOption" o ON o."CatalogKey"=c."Key" WHERE c."Key" IN ('level','question_format','specialty','question_topic','target_group','cognitive_level','assessment_type') GROUP BY c."Key",c."Label"`)
		if e != nil {
			return nil, e
		}
		defer rows.Close()
		data := map[string]any{}
		for rows.Next() {
			var key, label string
			var b []byte
			if e = rows.Scan(&key, &label, &b); e != nil {
				return nil, e
			}
			var opts any
			if e = json.Unmarshal(b, &opts); e != nil {
				return nil, e
			}
			data[key] = map[string]any{"key": key, "label": label, "options": opts}
		}
		if e = rows.Err(); e != nil {
			return nil, e
		}
		return jsonReply(map[string]any{"data": data})
	case "question_list", "question_get":
		if action == "question_get" && !validQuestionUUID(req.ID) {
			return nil, invalid("UUID câu hỏi không hợp lệ")
		}
		if req.FolderID != "" && !validQuestionUUID(req.FolderID) {
			return nil, invalid("UUID thư mục không hợp lệ")
		}
		if req.Page < 1 {
			req.Page = 1
		}
		if req.PageSize < 1 {
			req.PageSize = 50
		}
		if req.PageSize > 500 {
			req.PageSize = 500
		}
		where := ` WHERE ($1='' OR q."IdSeq"::text=$1) AND ($2='' OR q."Content" ILIKE '%'||$2||'%' OR q."IdSeq"::text ILIKE '%'||$2||'%' OR q."TopicName" ILIKE '%'||$2||'%') AND ($3='' OR q."FolderId"::text=$3) AND ($4='' OR q."LevelCode"=$4)`
		args := []any{req.ID, req.Search, req.FolderID, req.Level}
		columns := map[string]string{"id": `q."IdSeq"`, "content": `q."Content"`, "level": `q."LevelName"`, "format": `q."FormatName"`, "topic": `q."TopicName"`, "targetGroup": `q."TargetGroupName"`, "difficulty": `q."CognitiveLevelName"`, "version": `q."Version"`, "author": `q."AuthorName"`, "updatedAt": `q."UpdatedAt"`, "isCritical": `CASE WHEN q."IsCritical" THEN 'Điểm liệt' ELSE '—' END`, "status": `CASE q."Status" WHEN 'draft' THEN 'Bản nháp' WHEN 'pending_review' THEN 'Chờ duyệt' WHEN 'published' THEN 'Đã xuất bản' ELSE q."Status" END`}
		for field, value := range req.Filters {
			if value == "" {
				continue
			}
			expression, ok := columns[field]
			if !ok {
				return nil, invalid("Trường lọc không hợp lệ")
			}
			args = append(args, "%"+value+"%")
			where += fmt.Sprintf(" AND COALESCE((%s)::text,'') ILIKE $%d", expression, len(args))
		}
		if rawFilters, ok := req.Filters["status"]; ok && rawFilters == "Đã xuất bản" {
			where += ` AND q."Status"='published'`
		}
		order := `q."UpdatedAt" DESC,q."IdSeq"`
		if expression, ok := columns[req.SortField]; ok {
			direction := " DESC"
			if req.SortAsc {
				direction = " ASC"
			}
			order = expression + direction + `,q."IdSeq"`
		}
		var total int
		if err = s.DB.GetContext(ctx, &total, `SELECT count(*) FROM "_QSTQuestionView" q`+where, args...); err != nil {
			return nil, err
		}
		args = append(args, req.PageSize, (req.Page-1)*req.PageSize)
		rows, e := s.DB.QueryContext(ctx, `SELECT `+questionJSON+` FROM "_QSTQuestionView" q`+where+` ORDER BY `+order+fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)-1, len(args)), args...)
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
			var item any
			if e = json.Unmarshal(b, &item); e != nil {
				return nil, e
			}
			data = append(data, item)
		}
		if e = rows.Err(); e != nil {
			return nil, e
		}
		if action == "question_get" {
			if len(data) == 0 {
				return nil, status.Error(codes.NotFound, "Không tìm thấy câu hỏi")
			}
			return jsonReply(map[string]any{"data": data[0]})
		}
		return jsonReply(map[string]any{"data": data, "meta": map[string]any{"total": total, "page": req.Page, "pageSize": req.PageSize}})
	case "question_simulation_list":
		rows, e := s.DB.QueryContext(ctx, `SELECT jsonb_build_object('id',s."IdSeq",'name',s."Name",'description',s."Description",'templateKey',s."TemplateKey",'config',s."Config",'updatedAt',s."UpdatedAt",'RowVersion',s."RowVersion"::text) || `+auditJSON("s")+` FROM "_QSTSimulation" s ORDER BY s."Name",s."IdSeq"`)
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
			var item any
			if e = json.Unmarshal(b, &item); e != nil {
				return nil, e
			}
			data = append(data, item)
		}
		if e = rows.Err(); e != nil {
			return nil, e
		}
		return jsonReply(map[string]any{"data": data})
	case "question_simulation_save":
		var simulation questionSimulationInput
		if e := json.Unmarshal(raw, &simulation); e != nil {
			return nil, invalid("Dữ liệu màn hình mô phỏng không hợp lệ")
		}
		simulation.Name = strings.TrimSpace(simulation.Name)
		simulation.Description = strings.TrimSpace(simulation.Description)
		if simulation.Name == "" || len([]rune(simulation.Name)) > 160 || len([]rune(simulation.Description)) > 2000 || len(simulation.Config) == 0 || len(simulation.Config) > 64*1024 {
			return nil, invalid("Cần tên màn hình và cấu hình mô phỏng hợp lệ (tối đa 64 KB)")
		}
		if simulation.TemplateKey != "dispatch" && simulation.TemplateKey != "estop" && simulation.TemplateKey != "production_ui" {
			return nil, invalid("Mẫu mô phỏng không hợp lệ")
		}
		var cfg map[string]any
		if e := json.Unmarshal(simulation.Config, &cfg); e != nil || cfg == nil {
			return nil, invalid("Cấu hình màn hình mô phỏng phải là đối tượng JSON")
		}
		if simulation.TemplateKey == "production_ui" {
			mission, _ := cfg["mission"].(string)
			workflow, _ := cfg["workflow"].(string)
			if strings.TrimSpace(mission) == "" || len([]rune(mission)) > 3000 {
				return nil, invalid("Cần nhập tình huống và yêu cầu thao tác (tối đa 3.000 ký tự)")
			}
			if workflow != "complete_operation" && workflow != "receive_material" && workflow != "return_material" {
				return nil, invalid("Nghiệp vụ mô phỏng MES không hợp lệ")
			}
		}
		if simulation.ID != "" && (!validQuestionUUID(simulation.ID) || !validRowVersion(simulation.RowVersion)) {
			return nil, invalid("UUID hoặc phiên bản màn hình mô phỏng không hợp lệ")
		}
		configJSON := simulation.Config
		tx, e := s.DB.BeginTxx(ctx, nil)
		if e != nil {
			return nil, e
		}
		defer tx.Rollback()
		var author string
		if e = tx.GetContext(ctx, &author, `SELECT "IdSeq" FROM "_USRAccountDirectory" WHERE "Id"=$1`, u.ID); e != nil {
			return nil, e
		}
		if e = setActor(ctx, tx, u); e != nil {
			return nil, e
		}
		var id, revision string
		if simulation.ID == "" {
			e = tx.QueryRowContext(ctx, `INSERT INTO "_QSTSimulation"("Name","Description","TemplateKey","Config","CreatedBy","UpdatedBy") VALUES($1,$2,$3,$4::jsonb,$5,$5) RETURNING "IdSeq","RowVersion"::text`, simulation.Name, simulation.Description, simulation.TemplateKey, string(configJSON), author).Scan(&id, &revision)
		} else {
			if e = lockRowVersion(ctx, tx, rowCondition{Table: "_QSTSimulation", ID: simulation.ID, Version: simulation.RowVersion}); e != nil {
				return nil, e
			}
			e = tx.QueryRowContext(ctx, `UPDATE "_QSTSimulation" SET "Name"=$1,"Description"=$2,"TemplateKey"=$3,"Config"=$4::jsonb,"UpdatedBy"=$5,"UpdatedAt"=now() WHERE "IdSeq"=$6 RETURNING "IdSeq","RowVersion"::text`, simulation.Name, simulation.Description, simulation.TemplateKey, string(configJSON), author, simulation.ID).Scan(&id, &revision)
		}
		if e != nil {
			return nil, e
		}
		if e = tx.Commit(); e != nil {
			return nil, e
		}
		return jsonReply(map[string]any{"data": map[string]any{"id": id, "RowVersion": revision}})
	case "question_save", "question_import":
		if action == "question_save" {
			var q questionInput
			if err = json.Unmarshal(raw, &q); err != nil {
				return nil, invalid("Dữ liệu câu hỏi không hợp lệ")
			}
			req.Questions = []questionInput{q}
		}
		if len(req.Questions) == 0 || len(req.Questions) > 100 {
			return nil, invalid("Mỗi lần lưu từ 1 đến 100 câu hỏi")
		}
		tx, e := s.DB.BeginTxx(ctx, nil)
		if e != nil {
			return nil, e
		}
		defer tx.Rollback()
		ids := []string{}
		for _, q := range req.Questions {
			if action == "question_import" && q.ID != "" {
				return nil, invalid("Nhập câu hỏi không được cập nhật câu hỏi cũ")
			}
			id, e := s.saveQuestion(ctx, tx, u, q)
			if e != nil {
				return nil, e
			}
			ids = append(ids, id)
		}
		if e = tx.Commit(); e != nil {
			return nil, e
		}
		return jsonReply(map[string]any{"data": map[string]any{"id": ids[0], "ids": ids}})
	case "question_folder_list":
		rows, e := s.DB.QueryContext(ctx, `SELECT jsonb_build_object('id',f."IdSeq",'name',f."Name",'description',f."Description",'levelId',f."LevelId",'level',l."Value",'levelName',l."Label",'updatedAt',f."UpdatedAt",'isSample',f."SampleKey" IS NOT NULL,'questionCount',(SELECT count(*) FROM "_QSTQuestion" q WHERE q."FolderId"=f."IdSeq"),'criticalCount',(SELECT count(*) FROM "_QSTQuestion" q WHERE q."FolderId"=f."IdSeq" AND q."IsCritical")) || `+auditJSON("f")+` FROM "_QSTFolder" f LEFT JOIN "_SYSCatalogOption" l ON l."IdSeq"=f."LevelId" WHERE f."Name" ILIKE '%'||$1||'%' ORDER BY f."Name"`, req.Search)
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
			var item any
			if e = json.Unmarshal(b, &item); e != nil {
				return nil, e
			}
			data = append(data, item)
		}
		if e = rows.Err(); e != nil {
			return nil, e
		}
		return jsonReply(map[string]any{"data": data})
	case "question_folder_save":
		if strings.TrimSpace(req.Name) == "" || len([]rune(req.Name)) > 240 || len([]rune(req.Description)) > 2000 || !validQuestionUUID(req.LevelID) {
			return nil, invalid("Cần tên thư mục và UUID cấp độ")
		}
		var valid bool
		if err = s.DB.GetContext(ctx, &valid, `SELECT EXISTS(SELECT 1 FROM "_SYSCatalogOption" WHERE "IdSeq"=$1 AND "CatalogKey"='level' AND "Enabled")`, req.LevelID); err != nil {
			return nil, err
		}
		if !valid {
			return nil, invalid("Cấp độ không còn sử dụng")
		}
		tx, e := s.DB.BeginTxx(ctx, nil)
		if e != nil {
			return nil, e
		}
		defer tx.Rollback()
		if e = setActor(ctx, tx, u); e != nil {
			return nil, e
		}
		var id, revision string
		if req.ID == "" {
			e = tx.QueryRowContext(ctx, `INSERT INTO "_QSTFolder"("Name","Description","LevelId") VALUES($1,$2,$3) RETURNING "IdSeq","RowVersion"::text`, strings.TrimSpace(req.Name), strings.TrimSpace(req.Description), req.LevelID).Scan(&id, &revision)
		} else {
			if !validQuestionUUID(req.ID) {
				return nil, invalid("UUID thư mục không hợp lệ")
			}
			if e = lockRowVersion(ctx, tx, rowCondition{Table: "_QSTFolder", ID: req.ID, Version: req.RowVersion}); e != nil {
				return nil, e
			}
			var compatible bool
			if e = tx.GetContext(ctx, &compatible, `SELECT l."Value"='All' OR NOT EXISTS(SELECT 1 FROM "_QSTQuestion" q WHERE q."FolderId"=$1 AND q."LevelId"<>l."IdSeq") FROM "_SYSCatalogOption" l WHERE l."IdSeq"=$2`, req.ID, req.LevelID); e != nil {
				return nil, e
			}
			if !compatible {
				return nil, invalid("Thư mục đang có câu hỏi thuộc cấp độ khác. Chọn tất cả cấp độ hoặc chuyển các câu hỏi trước.")
			}
			e = tx.QueryRowContext(ctx, `UPDATE "_QSTFolder" SET "Name"=$1,"Description"=$2,"LevelId"=$3 WHERE "IdSeq"=$4 RETURNING "IdSeq","RowVersion"::text`, strings.TrimSpace(req.Name), strings.TrimSpace(req.Description), req.LevelID, req.ID).Scan(&id, &revision)
		}
		if e != nil {
			return nil, e
		}
		if e = tx.Commit(); e != nil {
			return nil, e
		}
		return jsonReply(map[string]any{"data": map[string]any{"id": id, "RowVersion": revision}})
	}
	return nil, invalid("Thao tác câu hỏi không hợp lệ")
}

func (s *Server) saveQuestion(ctx context.Context, tx *sqlx.Tx, u account, q questionInput) (string, error) {
	q.Content = strings.TrimSpace(q.Content)
	if q.Content == "" || len(q.Content) > 50000 {
		return "", invalid("Nội dung câu hỏi cần từ 1 đến 50.000 ký tự")
	}
	if q.Status != "draft" && q.Status != "pending_review" && q.Status != "published" {
		return "", invalid("Trạng thái không hợp lệ")
	}
	if q.Status == "published" && !s.allowed(ctx, u, "questions:approve") {
		return "", status.Error(codes.PermissionDenied, "Bạn không có quyền xuất bản câu hỏi")
	}
	attrs := []struct{ key, id string }{{"level", q.LevelID}, {"question_format", q.FormatID}, {"specialty", q.SpecialtyID}, {"question_topic", q.TopicID}, {"target_group", q.TargetGroupID}, {"cognitive_level", q.CognitiveLevelID}}
	for _, a := range attrs {
		if !validQuestionUUID(a.id) {
			return "", invalid("UUID thuộc tính không hợp lệ: " + a.key)
		}
		var valid bool
		if err := tx.GetContext(ctx, &valid, `SELECT EXISTS(SELECT 1 FROM "_SYSCatalogOption" WHERE "IdSeq"=$1 AND "CatalogKey"=$2 AND "Enabled" AND NOT ("CatalogKey"='level' AND "Value"='All'))`, a.id, a.key); err != nil {
			return "", err
		}
		if !valid {
			return "", invalid("Thuộc tính không tồn tại hoặc đã ngừng sử dụng: " + a.key)
		}
	}
	var linked bool
	if err := tx.GetContext(ctx, &linked, `SELECT "ParentId"=$2::uuid FROM "_SYSCatalogOption" WHERE "IdSeq"=$1`, q.TopicID, q.SpecialtyID); err != nil {
		return "", err
	}
	if !linked {
		return "", invalid("Chủ đề không thuộc chuyên môn đã chọn")
	}
	if q.FolderID != "" {
		if !validQuestionUUID(q.FolderID) {
			return "", invalid("UUID thư mục không hợp lệ")
		}
		var exists bool
		if err := tx.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM "_QSTFolder" WHERE "IdSeq"=$1 AND ("LevelId"=$2 OR "LevelId" IN (SELECT "IdSeq" FROM "_SYSCatalogOption" WHERE "CatalogKey"='level' AND "Value"='All')))`, q.FolderID, q.LevelID); err != nil {
			return "", err
		}
		if !exists {
			return "", invalid("Cấp độ câu hỏi không phù hợp thư mục")
		}
	}
	if q.SimulationType != "" && !regexp.MustCompile(`^[a-z][a-z0-9_-]{0,31}$`).MatchString(q.SimulationType) {
		return "", invalid("Kiểu mô phỏng không hợp lệ")
	}
	if q.SimulationID != "" {
		if !validQuestionUUID(q.SimulationID) {
			return "", invalid("UUID màn hình mô phỏng không hợp lệ")
		}
		var templateKey string
		if err := tx.GetContext(ctx, &templateKey, `SELECT "TemplateKey" FROM "_QSTSimulation" WHERE "IdSeq"=$1`, q.SimulationID); err != nil {
			return "", invalid("Không tìm thấy màn hình mô phỏng đã đăng ký")
		}
		q.SimulationType = templateKey
	}
	switch q.Type {
	case "single_choice":
		if len(q.Options) < 2 {
			return "", invalid("Cần ít nhất hai phương án")
		}
		correct := 0
		for _, o := range q.Options {
			if strings.TrimSpace(o.Text) == "" {
				return "", invalid("Nội dung phương án không được trống")
			}
			if o.IsCorrect {
				correct++
			}
		}
		if correct != 1 {
			return "", invalid("Cần đúng một đáp án đúng")
		}
	case "essay":
		if len(q.Rubrics) == 0 {
			return "", invalid("Cần tiêu chí chấm điểm")
		}
		for _, r := range q.Rubrics {
			if strings.TrimSpace(r.Title) == "" || r.MaxScore <= 0 {
				return "", invalid("Tiêu chí chấm điểm cần tên và điểm lớn hơn 0")
			}
		}
	default:
		return "", invalid("Loại câu hỏi không hợp lệ")
	}
	options, _ := json.Marshal(q.Options)
	rubrics, _ := json.Marshal(q.Rubrics)
	if q.Options == nil {
		options = []byte("[]")
	}
	if q.Rubrics == nil {
		rubrics = []byte("[]")
	}
	var author string
	if err := tx.GetContext(ctx, &author, `SELECT "IdSeq" FROM "_USRAccountDirectory" WHERE "Id"=$1`, u.ID); err != nil {
		return "", err
	}
	if _, err := tx.ExecContext(ctx, `SELECT set_config('app.actor_seq',$1,true)`, author); err != nil {
		return "", err
	}
	args := []any{q.LevelID, q.FormatID, q.SpecialtyID, q.TopicID, q.TargetGroupID, q.CognitiveLevelID, q.FolderID, q.Content, q.Explanation, q.Type, string(options), string(rubrics), q.SimulationType, q.IsCritical, q.CriticalReason, q.ImageURL, q.Status, author, q.SimulationID}
	if q.ID == "" {
		var id string
		err := tx.GetContext(ctx, &id, `INSERT INTO "_QSTQuestion"("LevelId","FormatId","SpecialtyId","TopicId","TargetGroupId","CognitiveLevelId","FolderId","Content","Explanation","Type","Options","Rubrics","SimulationType","IsCritical","CriticalReason","ImageUrl","Status","AuthorId","UpdatedBy","SimulationId") VALUES($1,$2,$3,$4,$5,$6,NULLIF($7,'')::uuid,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16,$17,$18,$18,NULLIF($19,'')::uuid) RETURNING "IdSeq"`, args...)
		return id, err
	}
	if !validQuestionUUID(q.ID) || !validRowVersion(q.RowVersion) {
		return "", invalid("UUID hoặc RowVersion câu hỏi không hợp lệ")
	}
	args = append(args, q.ID, q.RowVersion)
	result, err := tx.ExecContext(ctx, `UPDATE "_QSTQuestion" SET "LevelId"=$1,"FormatId"=$2,"SpecialtyId"=$3,"TopicId"=$4,"TargetGroupId"=$5,"CognitiveLevelId"=$6,"FolderId"=NULLIF($7,'')::uuid,"Content"=$8,"Explanation"=$9,"Type"=$10,"Options"=$11::jsonb,"Rubrics"=$12::jsonb,"SimulationType"=$13,"IsCritical"=$14,"CriticalReason"=$15,"ImageUrl"=$16,"Status"=$17,"UpdatedBy"=$18,"UpdatedAt"=now(),"Version"="Version"+1,"SimulationId"=NULLIF($19,'')::uuid WHERE "IdSeq"=$20 AND "RowVersion"=$21`, args...)
	if err != nil {
		return "", err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return "", err
	}
	if n == 0 {
		return "", status.Error(codes.Aborted, "Câu hỏi đã thay đổi. Hãy tải lại trước khi lưu")
	}
	return q.ID, nil
}
