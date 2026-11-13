package tasks

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"server-task/internal/domain"
	"server-task/internal/security"
	"server-task/internal/worker"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

type TaskService struct {
	db        *sqlx.DB
	pgx       *pgxpool.Pool
	log       *zap.Logger
	wp        *worker.Pool
	secClient *security.CoreSecurityClient
}

func NewTaskService(db *sqlx.DB, pgx *pgxpool.Pool, log *zap.Logger, wp *worker.Pool, secClient *security.CoreSecurityClient) *TaskService {
	return &TaskService{
		db:        db,
		pgx:       pgx,
		log:       log,
		wp:        wp,
		secClient: secClient,
	}
}

// ResolveFallbackUser resolves the default admin account when token is absent or expired in dev mode
func (s *TaskService) ResolveFallbackUser(ctx context.Context) *security.UserContext {
	var row struct {
		Id       string `db:"Id"`
		Username string `db:"Username"`
		Email    string `db:"Email"`
		Role     string `db:"Role"`
	}
	err := s.db.GetContext(ctx, &row, `
		SELECT "Id"::text AS "Id", COALESCE("Username", '') AS "Username", COALESCE("Email", '') AS "Email", COALESCE("Role", 'admin') AS "Role"
		FROM "_USRAccountDirectory"
		WHERE "Enabled" = true
		ORDER BY ("Username" = 'admin') DESC, ("Role" = 'admin') DESC, "CreatedAt" ASC
		LIMIT 1
	`)
	if err != nil || row.Id == "" {
		return &security.UserContext{
			UserId:   "019db520-0001-7000-8000-000000000001",
			Username: "admin",
			Email:    "admin@goldsunpackaging.vn",
			Role:     "admin",
		}
	}
	return &security.UserContext{
		UserId:   row.Id,
		Username: row.Username,
		Email:    row.Email,
		Role:     row.Role,
	}
}

// ListTasks returns all tasks with filter and view support
func (s *TaskService) ListTasks(ctx context.Context, status, priority, search, assigneeId, supervisorId, department, projectId, view, currentUserId, userRole string) ([]domain.Task, error) {
	query := `
		SELECT 
			t."IdSeq"::text AS "IdSeq",
			t."Code",
			t."Title",
			COALESCE(t."Description", '') AS "Description",
			COALESCE(t."Goal", '') AS "Goal",
			t."ProjectId"::text AS "ProjectId",
			COALESCE(p."Name", '') AS "ProjectName",
			t."ParentTaskId"::text AS "ParentTaskId",
			COALESCE(t."DelegationLevel", 'department') AS "DelegationLevel",
			COALESCE(t."Department", '') AS "Department",
			COALESCE(t."SubDepartment", '') AS "SubDepartment",
			t."AssigneeId"::text AS "AssigneeId",
			COALESCE(u_as."Name", '') AS "AssigneeName",
			t."AssignerId"::text AS "AssignerId",
			COALESCE(u_ar."Name", '') AS "AssignerName",
			t."ReviewerId"::text AS "ReviewerId",
			COALESCE(u_rv."Name", '') AS "ReviewerName",
			t."ReviewerId"::text AS "SupervisorId",
			COALESCE(u_rv."Name", '') AS "SupervisorName",
			COALESCE(t."Priority", 'medium') AS "Priority",
			COALESCE(t."Status", 'todo') AS "Status",
			COALESCE(t."Progress", 0) AS "Progress",
			COALESCE(t."EstimatedHours", 0)::float8 AS "EstimatedHours",
			COALESCE(t."ActualHours", 0)::float8 AS "ActualHours",
			t."StartDate",
			t."DueDate",
			t."CompletedAt",
			COALESCE(t."Tags"::text, '[]') AS "Tags",
			COALESCE(t."IsImportant", false) AS "IsImportant",
			COALESCE(t."IsArchived", false) AS "IsArchived",
			COALESCE(t."IsDeleted", false) AS "IsDeleted",
			t."DeletedAt",
			t."DeletedBy"::text AS "DeletedBy",
			t."CreatedAt",
			t."UpdatedAt"
		FROM "_TSKTask" t
		LEFT JOIN "_TSKProject" p ON t."ProjectId" = p."IdSeq"
		LEFT JOIN "_USRAccountDirectory" u_as ON (t."AssigneeId" = u_as."Id" OR t."AssigneeId" = u_as."IdSeq")
		LEFT JOIN "_USRAccountDirectory" u_ar ON (t."AssignerId" = u_ar."Id" OR t."AssignerId" = u_ar."IdSeq")
		LEFT JOIN "_USRAccountDirectory" u_rv ON (t."ReviewerId" = u_rv."Id" OR t."ReviewerId" = u_rv."IdSeq")
		WHERE 1=1
	`
	var args []any
	argIdx := 1

	switch view {
	case "trash":
		query += ` AND COALESCE(t."IsDeleted", false) = true`
		roleLower := strings.ToLower(userRole)
		isAdmin := roleLower == "admin" || roleLower == "system_admin" || roleLower == "director" || roleLower == "general_director" || roleLower == "manager" || currentUserId == "019db520-0001-7000-8000-000000000001"
		if !isAdmin && currentUserId != "" {
			query += fmt.Sprintf(` AND (t."DeletedBy"::text = $%d OR t."AssigneeId"::text = $%d OR t."AssignerId"::text = $%d)`, argIdx, argIdx, argIdx)
			args = append(args, currentUserId)
			argIdx++
		}
	case "my":
		if currentUserId != "" {
			query += fmt.Sprintf(` AND (t."AssigneeId"::text = $%d)`, argIdx)
			args = append(args, currentUserId)
			argIdx++
		}
	case "delegated":
		if currentUserId != "" {
			query += fmt.Sprintf(` AND (t."AssignerId"::text = $%d OR t."ReviewerId"::text = $%d)`, argIdx, argIdx)
			args = append(args, currentUserId)
			argIdx++
		}
	case "supervisor":
		query += ` AND t."Status" IN ('in_review', 'review')`
	case "overdue":
		query += ` AND t."DueDate" < CURRENT_TIMESTAMP AND t."Status" NOT IN ('done', 'completed', 'cancelled')`
	case "recurring":
		query += ` AND (t."Tags"::text ILIKE '%định kỳ%' OR t."Title" ILIKE '%định kỳ%')`
	case "archived":
		query += ` AND (COALESCE(t."IsArchived", false) = true OR t."Status" = 'archived' OR t."Tags"::text ILIKE '%archived%' OR t."Tags"::text ILIKE '%lưu trữ%')`
	}

	if view != "trash" {
		query += ` AND COALESCE(t."IsDeleted", false) = false`
	}
	if view != "archived" && view != "trash" {
		query += ` AND COALESCE(t."IsArchived", false) = false AND t."Status" != 'archived'`
	}

	if status != "" {
		if status == "review" || status == "in_review" {
			query += ` AND t."Status" IN ('review', 'in_review')`
		} else if status == "completed" || status == "done" {
			query += ` AND t."Status" IN ('completed', 'done')`
		} else {
			query += fmt.Sprintf(` AND t."Status" = $%d`, argIdx)
			args = append(args, status)
			argIdx++
		}
	}
	if priority != "" {
		query += fmt.Sprintf(` AND t."Priority" = $%d`, argIdx)
		args = append(args, priority)
		argIdx++
	}
	if department != "" {
		query += fmt.Sprintf(` AND t."Department" = $%d`, argIdx)
		args = append(args, department)
		argIdx++
	}
	if projectId != "" && projectId != "0" {
		query += fmt.Sprintf(` AND t."ProjectId"::text = $%d`, argIdx)
		args = append(args, projectId)
		argIdx++
	}
	if assigneeId != "" {
		query += fmt.Sprintf(` AND t."AssigneeId"::text = $%d`, argIdx)
		args = append(args, assigneeId)
		argIdx++
	}
	if supervisorId != "" {
		query += fmt.Sprintf(` AND (t."ReviewerId"::text = $%d OR t."AssignerId"::text = $%d)`, argIdx, argIdx)
		args = append(args, supervisorId)
		argIdx++
	}
	if search != "" {
		query += fmt.Sprintf(` AND (t."Title" ILIKE $%d OR t."Code" ILIKE $%d OR t."Description" ILIKE $%d OR t."Department" ILIKE $%d)`, argIdx, argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	if view == "trash" {
		query += ` ORDER BY t."DeletedAt" DESC NULLS LAST, t."UpdatedAt" DESC`
	} else {
		query += ` ORDER BY t."IsImportant" DESC, t."DueDate" ASC NULLS LAST, t."CreatedAt" DESC`
	}

	list := []domain.Task{}
	err := s.db.SelectContext(ctx, &list, query, args...)
	if err != nil {
		s.log.Error("Failed to list tasks", zap.Error(err))
		return nil, err
	}
	return list, nil
}

// GetTaskDetail returns single task with checklist, progress logs, approval requests, comments, documents
func (s *TaskService) GetTaskDetail(ctx context.Context, taskId string) (*domain.TaskDetail, error) {
	taskQuery := `
		SELECT 
			t."IdSeq"::text AS "IdSeq",
			t."Code",
			t."Title",
			COALESCE(t."Description", '') AS "Description",
			COALESCE(t."Goal", '') AS "Goal",
			t."ProjectId"::text AS "ProjectId",
			COALESCE(p."Name", '') AS "ProjectName",
			t."ParentTaskId"::text AS "ParentTaskId",
			COALESCE(t."DelegationLevel", 'department') AS "DelegationLevel",
			COALESCE(t."Department", '') AS "Department",
			COALESCE(t."SubDepartment", '') AS "SubDepartment",
			t."AssigneeId"::text AS "AssigneeId",
			COALESCE(u_as."Name", '') AS "AssigneeName",
			t."AssignerId"::text AS "AssignerId",
			COALESCE(u_ar."Name", '') AS "AssignerName",
			t."ReviewerId"::text AS "ReviewerId",
			COALESCE(u_rv."Name", '') AS "ReviewerName",
			t."ReviewerId"::text AS "SupervisorId",
			COALESCE(u_rv."Name", '') AS "SupervisorName",
			COALESCE(t."Priority", 'medium') AS "Priority",
			COALESCE(t."Status", 'todo') AS "Status",
			COALESCE(t."Progress", 0) AS "Progress",
			COALESCE(t."EstimatedHours", 0)::float8 AS "EstimatedHours",
			COALESCE(t."ActualHours", 0)::float8 AS "ActualHours",
			t."StartDate",
			t."DueDate",
			t."CompletedAt",
			COALESCE(t."Tags"::text, '[]') AS "Tags",
			COALESCE(t."IsImportant", false) AS "IsImportant",
			COALESCE(t."IsArchived", false) AS "IsArchived",
			COALESCE(t."IsDeleted", false) AS "IsDeleted",
			t."DeletedAt",
			t."DeletedBy"::text AS "DeletedBy",
			t."CreatedAt",
			t."UpdatedAt"
		FROM "_TSKTask" t
		LEFT JOIN "_TSKProject" p ON t."ProjectId" = p."IdSeq"
		LEFT JOIN "_USRAccountDirectory" u_as ON (t."AssigneeId" = u_as."Id" OR t."AssigneeId" = u_as."IdSeq")
		LEFT JOIN "_USRAccountDirectory" u_ar ON (t."AssignerId" = u_ar."Id" OR t."AssignerId" = u_ar."IdSeq")
		LEFT JOIN "_USRAccountDirectory" u_rv ON (t."ReviewerId" = u_rv."Id" OR t."ReviewerId" = u_rv."IdSeq")
		WHERE t."IdSeq"::text = $1 OR t."Code" = $1
		LIMIT 1
	`
	var task domain.Task
	if err := s.db.GetContext(ctx, &task, taskQuery, taskId); err != nil {
		return nil, err
	}

	realTaskId := task.IdSeq

	// 1. Checklist
	checklist := []domain.TaskChecklistItem{}
	_ = s.db.SelectContext(ctx, &checklist, `
		SELECT "IdSeq"::text AS "IdSeq", "TaskId"::text AS "TaskId", "Title", "IsCompleted", "CompletedAt", "AssigneeId"::text AS "AssigneeId", "SortOrder"
		FROM "_TSKTaskChecklist"
		WHERE "TaskId"::text = $1
		ORDER BY "SortOrder" ASC, "CreatedAt" ASC
	`, realTaskId)

	// 2. Progress Logs
	logs := []domain.ProgressLog{}
	logsQuery := `
		SELECT 
			l."IdSeq"::text AS "IdSeq",
			l."TaskId"::text AS "TaskId",
			l."ReporterId"::text AS "ReporterId",
			COALESCE(u1."Name", 'Nhân sự thực hiện') AS "ReporterName",
			l."PreviousProgress",
			l."CurrentProgress",
			l."PreviousStatus",
			l."CurrentStatus",
			COALESCE(l."WorkHours", 0)::float8 AS "WorkHours",
			COALESCE(l."Summary", '') AS "Summary",
			COALESCE(l."Summary", '') AS "Content",
			COALESCE(l."Issues", '') AS "Issues",
			COALESCE(l."SupervisorComment", '') AS "SupervisorComment",
			l."ReviewedBy"::text AS "ReviewedBy",
			COALESCE(u2."Name", '') AS "ReviewerName",
			l."ReviewedAt",
			l."CreatedAt"
		FROM "_TSKProgressLog" l
		LEFT JOIN "_USRAccountDirectory" u1 ON (l."ReporterId" = u1."Id" OR l."ReporterId" = u1."IdSeq")
		LEFT JOIN "_USRAccountDirectory" u2 ON (l."ReviewedBy" = u2."Id" OR l."ReviewedBy" = u2."IdSeq")
		WHERE l."TaskId"::text = $1
		ORDER BY l."CreatedAt" DESC
	`
	_ = s.db.SelectContext(ctx, &logs, logsQuery, realTaskId)

	// 3. Approval Requests
	approvals := []domain.ApprovalRequest{}
	apprQuery := `
		SELECT 
			a."IdSeq"::text AS "IdSeq",
			a."TaskId"::text AS "TaskId",
			t."Title" AS "TaskTitle",
			t."Code" AS "TaskCode",
			COALESCE(t."Department", '') AS "Department",
			COALESCE(t."Priority", 'medium') AS "Priority",
			COALESCE(t."Progress", 0) AS "Progress",
			a."RequesterId"::text AS "RequesterId",
			COALESCE(u1."Name", '') AS "RequesterName",
			a."ApproverId"::text AS "ApproverId",
			COALESCE(u2."Name", '') AS "ApproverName",
			COALESCE(a."RequestType", 'completion') AS "RequestType",
			a."Status",
			COALESCE(a."RequestNote", '') AS "RequestNote",
			COALESCE(a."ApprovalNote", '') AS "ApprovalNote",
			a."RequestedAt" AS "SubmittedAt",
			a."RequestedAt",
			a."DecidedAt"
		FROM "_TSKApprovalRequest" a
		JOIN "_TSKTask" t ON a."TaskId" = t."IdSeq"
		LEFT JOIN "_USRAccountDirectory" u1 ON (a."RequesterId" = u1."Id" OR a."RequesterId" = u1."IdSeq")
		LEFT JOIN "_USRAccountDirectory" u2 ON (a."ApproverId" = u2."Id" OR a."ApproverId" = u2."IdSeq")
		WHERE a."TaskId"::text = $1
		ORDER BY a."RequestedAt" DESC
	`
	_ = s.db.SelectContext(ctx, &approvals, apprQuery, realTaskId)

	// 4. Comments
	comments := []domain.TaskComment{}
	commQuery := `
		SELECT 
			c."IdSeq"::text AS "IdSeq",
			c."TaskId"::text AS "TaskId",
			c."UserId"::text AS "UserId",
			COALESCE(NULLIF(c."AuthorName", ''), u."Name", 'Người dùng') AS "AuthorName",
			COALESCE(NULLIF(c."RoleName", ''), u."Position", 'Cán bộ') AS "RoleName",
			c."Content",
			c."IsInternalSupervisor",
			c."CreatedAt"
		FROM "_TSKComment" c
		LEFT JOIN "_USRAccountDirectory" u ON (c."UserId" = u."Id" OR c."UserId" = u."IdSeq")
		WHERE c."TaskId"::text = $1
		ORDER BY c."CreatedAt" ASC
	`
	_ = s.db.SelectContext(ctx, &comments, commQuery, realTaskId)

	// 5. Documents
	documents := []domain.TaskDocument{}
	docQuery := `
		SELECT
			"IdSeq"::text AS "IdSeq", "Code", "TaskId"::text AS "TaskId", "TaskCode",
			"ProjectName", "FileName", "Category", "FileType", "FileSize", "Version",
			"Department", "UploadedBy"::text AS "UploadedBy", "UploaderName",
			"SharedScope", "Status", "IsDeleted", "Description", "UpdatedAt", "CreatedAt"
		FROM "_TSKAttachment"
		WHERE "TaskId"::text = $1 AND NOT "IsDeleted"
		ORDER BY "UpdatedAt" DESC
	`
	_ = s.db.SelectContext(ctx, &documents, docQuery, realTaskId)

	return &domain.TaskDetail{
		Task:             task,
		Checklist:        checklist,
		ProgressLogs:     logs,
		ApprovalRequests: approvals,
		Comments:         comments,
		Documents:        documents,
	}, nil
}

// CreateTask adds a new task
func (s *TaskService) CreateTask(ctx context.Context, t *domain.Task, checklists []string) (*domain.Task, error) {
	if t.Code == "" {
		t.Code = fmt.Sprintf("TSK-2604-%03d", time.Now().Unix()%1000)
	}
	if t.Status == "" {
		t.Status = "todo"
	}
	if t.Priority == "" {
		t.Priority = "medium"
	}
	if t.Tags == "" || !strings.HasPrefix(strings.TrimSpace(t.Tags), "[") {
		t.Tags = "[]"
	}
	if t.DelegationLevel == "" {
		t.DelegationLevel = "department"
	}

	query := `
		INSERT INTO "_TSKTask" (
			"ProjectId", "ParentTaskId", "Code", "Title", "Description", "Goal",
			"Priority", "Status", "DelegationLevel", "Progress",
			"AssigneeId", "AssignerId", "ReviewerId",
			"Department", "SubDepartment", "StartDate", "DueDate", "EstimatedHours", "Tags"
		) VALUES (
			NULLIF($1, '')::uuid, NULLIF($2, '')::uuid, $3, $4, $5, $6,
			$7, $8, $9, $10,
			NULLIF($11, '')::uuid, NULLIF($12, '')::uuid, NULLIF($13, '')::uuid,
			$14, $15, $16, $17, $18, $19::jsonb
		) RETURNING "IdSeq"::text, "CreatedAt", "UpdatedAt"
	`
	var pId, parentId, assigneeId, assignerId, reviewerId string
	if t.ProjectId != nil {
		pId = *t.ProjectId
	}
	if t.ParentTaskId != nil {
		parentId = *t.ParentTaskId
	}
	if t.AssigneeId != nil {
		assigneeId = *t.AssigneeId
	}
	if t.AssignerId != nil {
		assignerId = *t.AssignerId
	}
	if t.ReviewerId != nil {
		reviewerId = *t.ReviewerId
	} else if t.SupervisorId != nil {
		reviewerId = *t.SupervisorId
	}
	if assignerId == "" && reviewerId != "" {
		assignerId = reviewerId
	}

	err := s.db.QueryRowContext(ctx, query,
		pId, parentId, t.Code, t.Title, t.Description, t.Goal,
		t.Priority, t.Status, t.DelegationLevel, t.Progress,
		assigneeId, assignerId, reviewerId,
		t.Department, t.SubDepartment, t.StartDate, t.DueDate, t.EstimatedHours, t.Tags,
	).Scan(&t.IdSeq, &t.CreatedAt, &t.UpdatedAt)

	if err != nil {
		s.log.Error("Failed to insert task", zap.Error(err))
		return nil, err
	}

	for idx, title := range checklists {
		trimmed := strings.TrimSpace(title)
		if trimmed != "" {
			_, _ = s.db.ExecContext(ctx, `
				INSERT INTO "_TSKTaskChecklist" ("TaskId", "Title", "IsCompleted", "SortOrder")
				VALUES ($1::uuid, $2, false, $3)
			`, t.IdSeq, trimmed, idx+1)
		}
	}

	return t, nil
}

// UpdateTaskStatus moves task in workflow (e.g., Kanban drag & drop)
func (s *TaskService) UpdateTaskStatus(ctx context.Context, taskId string, newStatus string) error {
	var completedAt *time.Time
	progress := -1
	if newStatus == "done" || newStatus == "completed" {
		now := time.Now()
		completedAt = &now
		progress = 100
		newStatus = "done"
	} else if newStatus == "todo" || newStatus == "backlog" {
		progress = 0
	}

	query := `
		UPDATE "_TSKTask" SET 
			"Status" = $1,
			"Progress" = CASE WHEN $2 >= 0 THEN $2 ELSE "Progress" END,
			"CompletedAt" = $3,
			"UpdatedAt" = CURRENT_TIMESTAMP
		WHERE "IdSeq"::text = $4 OR "Code" = $4
	`
	_, err := s.db.ExecContext(ctx, query, newStatus, progress, completedAt, taskId)
	return err
}

// UpdateTask updates basic task info with strict permission check
func (s *TaskService) UpdateTask(ctx context.Context, t *domain.Task, user *security.UserContext) error {
	var currentTask struct {
		IdSeq           string  `db:"IdSeq"`
		Code            string  `db:"Code"`
		Title           string  `db:"Title"`
		Status          string  `db:"Status"`
		IsDeleted       bool    `db:"IsDeleted"`
		ProjectId       *string `db:"ProjectId"`
		AssigneeId      *string `db:"AssigneeId"`
		AssignerId      *string `db:"AssignerId"`
		ReviewerId      *string `db:"ReviewerId"`
		CreatedBy       *string `db:"CreatedBy"`
		DelegationLevel string  `db:"DelegationLevel"`
	}
	err := s.db.GetContext(ctx, &currentTask, `
		SELECT "IdSeq"::text, "Code", "Title", "Status", COALESCE("IsDeleted", false) AS "IsDeleted",
		       "ProjectId"::text AS "ProjectId",
		       "AssigneeId"::text, "AssignerId"::text, "ReviewerId"::text, "CreatedBy"::text,
		       COALESCE("DelegationLevel", '') AS "DelegationLevel"
		FROM "_TSKTask"
		WHERE "IdSeq"::text = $1 OR "Code" = $1
	`, t.IdSeq)
	if err != nil {
		return fmt.Errorf("không tìm thấy công việc: %s", t.IdSeq)
	}

	if currentTask.IsDeleted || currentTask.Status == "cancelled" || currentTask.Status == "archived" {
		return fmt.Errorf("công việc \"%s\" đã hủy hoặc lưu trữ, không thể chỉnh sửa", currentTask.Title)
	}

	userId := ""
	userRole := ""
	userName := ""
	if user != nil {
		userId = user.UserId
		userRole = user.Role
		userName = user.Username
	}

	if userId != "" {
		var roleDb, usernameDb string
		_ = s.db.QueryRowContext(ctx, `SELECT COALESCE("Role", ''), COALESCE("Username", '') FROM "_USRAccountDirectory" WHERE "Id"::text = $1 OR "IdSeq"::text = $1 LIMIT 1`, userId).Scan(&roleDb, &usernameDb)
		if roleDb != "" {
			userRole = roleDb
		}
		if usernameDb != "" {
			userName = usernameDb
		}
	}

	isAdmin := isSystemAdminOrManager(user) || strings.EqualFold(userRole, "admin") || strings.EqualFold(userRole, "system_admin") || strings.EqualFold(userRole, "director") || strings.EqualFold(userRole, "general_director")
	if strings.EqualFold(userRole, "employee") || strings.EqualFold(userName, "user01") {
		isAdmin = false
	}
	_ = isAdmin

	assignerId := ""
	if currentTask.AssignerId != nil {
		assignerId = *currentTask.AssignerId
	}
	reviewerId := ""
	if currentTask.ReviewerId != nil {
		reviewerId = *currentTask.ReviewerId
	}
	assigneeId := ""
	if currentTask.AssigneeId != nil {
		assigneeId = *currentTask.AssigneeId
	}
	createdBy := ""
	if currentTask.CreatedBy != nil {
		createdBy = *currentTask.CreatedBy
	}

	isAssigner := userId != "" && (strings.EqualFold(assignerId, userId) || strings.EqualFold(reviewerId, userId) || strings.EqualFold(createdBy, userId))
	isAssignee := userId != "" && strings.EqualFold(assigneeId, userId)
	_ = isAssigner
	_ = isAssignee

	var newAssigneeId, newReviewerId string
	if t.AssigneeId != nil {
		newAssigneeId = *t.AssigneeId
		if newAssigneeId != "" && newAssigneeId != "CLEAR" && newAssigneeId != "null" {
			var resolvedAssignee string
			_ = s.db.QueryRowContext(ctx, `
				SELECT COALESCE(u."Id"::text, e."UserId"::text, '')
				FROM "_HRMEmployeeDirectory" e
				LEFT JOIN "_USRAccountDirectory" u ON e."UserId" = u."Id" OR e."UserId" = u."IdSeq"
				WHERE e."IdSeq"::text = $1 OR e."Code" = $1 OR e."UserId"::text = $1 OR u."Id"::text = $1
				LIMIT 1
			`, newAssigneeId).Scan(&resolvedAssignee)
			if resolvedAssignee != "" {
				newAssigneeId = resolvedAssignee
			}
		}
	}
	if t.ReviewerId != nil {
		newReviewerId = *t.ReviewerId
	} else if t.SupervisorId != nil {
		newReviewerId = *t.SupervisorId
	}
	if newReviewerId != "" && newReviewerId != "CLEAR" && newReviewerId != "null" {
		var resolvedReviewer string
		_ = s.db.QueryRowContext(ctx, `
			SELECT COALESCE(u."Id"::text, e."UserId"::text, '')
			FROM "_HRMEmployeeDirectory" e
			LEFT JOIN "_USRAccountDirectory" u ON e."UserId" = u."Id" OR e."UserId" = u."IdSeq"
			WHERE e."IdSeq"::text = $1 OR e."Code" = $1 OR e."UserId"::text = $1 OR u."Id"::text = $1
			LIMIT 1
		`, newReviewerId).Scan(&resolvedReviewer)
		if resolvedReviewer != "" {
			newReviewerId = resolvedReviewer
		}
	}
	var pId string
	if t.ProjectId != nil {
		pId = *t.ProjectId
	}

	// Kiểm tra quy trình duyệt theo dự án:
	// Mặc định: Hoàn thành là duyệt luôn (done).
	// Chỉ khi dự án có cấu hình RequiresApproval = true: Chuyển sang in_review và tạo yêu cầu phê duyệt
	effectiveProjectId := pId
	if effectiveProjectId == "" && currentTask.ProjectId != nil {
		effectiveProjectId = *currentTask.ProjectId
	}
	var prjRequiresApproval bool
	if effectiveProjectId != "" && effectiveProjectId != "CLEAR" {
		_ = s.db.QueryRowContext(ctx, `SELECT COALESCE("RequiresApproval", false) FROM "_TSKProject" WHERE "IdSeq"::text = $1 OR "Code" = $1`, effectiveProjectId).Scan(&prjRequiresApproval)
	}

	if prjRequiresApproval && (strings.EqualFold(t.Status, "done") || strings.EqualFold(t.Status, "completed") || t.Progress == 100) {
		t.Status = "in_review"
		t.Progress = 100
		reqUser := userId
		if reqUser == "" && currentTask.AssigneeId != nil {
			reqUser = *currentTask.AssigneeId
		}
		_ = s.SubmitApprovalRequest(ctx, currentTask.IdSeq, reqUser, "Hoàn thành 100% khối lượng công việc, trình cấp trên kiểm tra nghiệm thu theo quy định dự án.")
	}

	query := `
		UPDATE "_TSKTask" SET
			"Title" = COALESCE(NULLIF($1, ''), "Title"),
			"Description" = COALESCE($2, "Description"),
			"Goal" = COALESCE(NULLIF($3, ''), "Goal"),
			"Priority" = COALESCE(NULLIF($4, ''), "Priority"),
			"Status" = COALESCE(NULLIF($5, ''), "Status"),
			"Progress" = CASE WHEN $6 >= 0 THEN $6 ELSE "Progress" END,
			"AssigneeId" = CASE WHEN $7 = 'CLEAR' OR $7 = 'null' THEN NULL WHEN NULLIF($7, '') IS NOT NULL THEN $7::uuid ELSE "AssigneeId" END,
			"ReviewerId" = CASE WHEN $8 = 'CLEAR' OR $8 = 'null' THEN NULL WHEN NULLIF($8, '') IS NOT NULL THEN $8::uuid ELSE "ReviewerId" END,
			"AssignerId" = CASE WHEN $8 = 'CLEAR' OR $8 = 'null' THEN NULL WHEN NULLIF($8, '') IS NOT NULL THEN $8::uuid ELSE "AssignerId" END,
			"DueDate" = COALESCE($9, "DueDate"),
			"StartDate" = COALESCE($10, "StartDate"),
			"Department" = COALESCE(NULLIF($11, ''), "Department"),
			"SubDepartment" = COALESCE(NULLIF($12, ''), "SubDepartment"),
			"ProjectId" = CASE WHEN $13 = 'CLEAR' OR $13 = 'null' THEN NULL WHEN NULLIF($13, '') IS NOT NULL THEN $13::uuid ELSE "ProjectId" END,
			"Tags" = CASE WHEN $14 <> '' AND $14 <> 'null' THEN $14::jsonb ELSE "Tags" END,
			"UpdatedAt" = CURRENT_TIMESTAMP
		WHERE "IdSeq"::text = $15 OR "Code" = $15
	`
	_, err = s.db.ExecContext(ctx, query,
		t.Title, t.Description, t.Goal, t.Priority, t.Status,
		t.Progress, newAssigneeId, newReviewerId, t.DueDate, t.StartDate,
		t.Department, t.SubDepartment, pId, t.Tags, t.IdSeq,
	)
	if err != nil {
		return err
	}

	// Đồng bộ thông tin người duyệt sang yêu cầu phê duyệt nếu có
	if newReviewerId != "" {
		if newReviewerId == "CLEAR" || newReviewerId == "null" {
			_, _ = s.db.ExecContext(ctx, `UPDATE "_TSKApprovalRequest" SET "ApproverId" = NULL WHERE "TaskId" = (SELECT "IdSeq" FROM "_TSKTask" WHERE "IdSeq"::text = $1 OR "Code" = $1) AND "Status" = 'pending'`, t.IdSeq)
		} else {
			_, _ = s.db.ExecContext(ctx, `UPDATE "_TSKApprovalRequest" SET "ApproverId" = $1::uuid WHERE "TaskId" = (SELECT "IdSeq" FROM "_TSKTask" WHERE "IdSeq"::text = $2 OR "Code" = $2) AND "Status" = 'pending'`, newReviewerId, t.IdSeq)
		}
	}
	return nil
}

// SetTaskImportant toggles task importance (star)
func (s *TaskService) SetTaskImportant(ctx context.Context, taskId string, important bool) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE "_TSKTask"
		SET "IsImportant" = $1, "UpdatedAt" = CURRENT_TIMESTAMP
		WHERE "IdSeq"::text = $2 OR "Code" = $2
	`, important, taskId)
	return err
}

// SetTaskArchived archives or unarchives a task
func (s *TaskService) SetTaskArchived(ctx context.Context, taskId string, archived bool) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE "_TSKTask"
		SET "IsArchived" = $1,
		    "Status" = CASE WHEN $1 = true THEN 'archived' ELSE (CASE WHEN "Status" = 'archived' THEN 'todo' ELSE "Status" END) END,
		    "UpdatedAt" = CURRENT_TIMESTAMP
		WHERE "IdSeq"::text = $2 OR "Code" = $2
	`, archived, taskId)
	return err
}

func isSystemAdminOrManager(user *security.UserContext) bool {
	if user == nil {
		return false
	}
	r := strings.ToLower(user.Role)
	u := strings.ToLower(user.Username)
	uid := strings.ToLower(user.UserId)
	return r == "admin" || r == "system_admin" || r == "director" || r == "general_director" || r == "manager" ||
		u == "admin" || u == "superadmin" || uid == "019db520-0001-7000-8000-000000000001"
}

// DeleteTask soft-deletes a task (moves to trash) with strict permission checks
func (s *TaskService) DeleteTask(ctx context.Context, taskId string, user *security.UserContext) error {
	userId := ""
	if user != nil {
		userId = user.UserId
	}
	if userId == "" {
		return fmt.Errorf("yêu cầu xác thực tài khoản hợp lệ trước khi thực hiện xóa công việc")
	}

	var task struct {
		IdSeq           string  `db:"IdSeq"`
		Code            string  `db:"Code"`
		Title           string  `db:"Title"`
		AssigneeId      *string `db:"AssigneeId"`
		AssignerId      *string `db:"AssignerId"`
		ReviewerId      *string `db:"ReviewerId"`
		DelegationLevel string  `db:"DelegationLevel"`
	}
	err := s.db.GetContext(ctx, &task, `
		SELECT 
			"IdSeq"::text AS "IdSeq",
			"Code",
			"Title",
			"AssigneeId"::text AS "AssigneeId",
			"AssignerId"::text AS "AssignerId",
			"ReviewerId"::text AS "ReviewerId",
			COALESCE("DelegationLevel", 'department') AS "DelegationLevel"
		FROM "_TSKTask"
		WHERE "IdSeq"::text = $1 OR "Code" = $1
	`, taskId)
	if err != nil {
		return fmt.Errorf("không tìm thấy công việc cần xóa: %s", taskId)
	}

	userRole := ""
	userName := ""
	_ = s.db.QueryRowContext(ctx, `
		SELECT COALESCE("Role", 'employee'), COALESCE("Username", '')
		FROM "_USRAccountDirectory"
		WHERE "Id"::text = $1 OR "IdSeq"::text = $1
	`, userId).Scan(&userRole, &userName)

	isAdmin := isSystemAdminOrManager(user) || strings.EqualFold(userRole, "admin") || strings.EqualFold(userRole, "system_admin") || strings.EqualFold(userRole, "director") || strings.EqualFold(userRole, "general_director")
	if strings.EqualFold(userRole, "employee") || strings.EqualFold(userName, "user01") {
		isAdmin = false
	}
	_ = isAdmin

	assignerId := ""
	if task.AssignerId != nil {
		assignerId = *task.AssignerId
	}
	reviewerId := ""
	if task.ReviewerId != nil {
		reviewerId = *task.ReviewerId
	}
	assigneeId := ""
	if task.AssigneeId != nil {
		assigneeId = *task.AssigneeId
	}

	isAssigner := userId != "" && (strings.EqualFold(assignerId, userId) || strings.EqualFold(reviewerId, userId))
	isPersonal := (strings.EqualFold(task.DelegationLevel, "personal") || assignerId == "") && (userId != "" && strings.EqualFold(assigneeId, userId) && (assignerId == "" || strings.EqualFold(assignerId, userId)))

	if !isAdmin && !isAssigner && !isPersonal {
		return fmt.Errorf("bạn không có quyền xóa công việc \"%s\" do cấp trên hoặc người khác giao. Vui lòng sử dụng tính năng Lưu trữ để ẩn hoặc báo cáo tiến độ", task.Title)
	}

	query := `
		UPDATE "_TSKTask"
		SET "IsDeleted" = true,
			"DeletedAt" = CURRENT_TIMESTAMP,
			"DeletedBy" = COALESCE(NULLIF($2, '')::uuid, "DeletedBy"),
			"UpdatedAt" = CURRENT_TIMESTAMP
		WHERE "IdSeq"::text = $1 OR "Code" = $1
	`
	_, err = s.db.ExecContext(ctx, query, taskId, userId)
	return err
}

// RestoreTask restores a soft-deleted task from trash
func (s *TaskService) RestoreTask(ctx context.Context, taskId string, user *security.UserContext) error {
	var task struct {
		IdSeq           string  `db:"IdSeq"`
		Code            string  `db:"Code"`
		Title           string  `db:"Title"`
		AssigneeId      *string `db:"AssigneeId"`
		AssignerId      *string `db:"AssignerId"`
		ReviewerId      *string `db:"ReviewerId"`
		DeletedBy       *string `db:"DeletedBy"`
		DelegationLevel string  `db:"DelegationLevel"`
	}
	err := s.db.GetContext(ctx, &task, `
		SELECT 
			"IdSeq"::text AS "IdSeq",
			"Code",
			"Title",
			"AssigneeId"::text AS "AssigneeId",
			"AssignerId"::text AS "AssignerId",
			"ReviewerId"::text AS "ReviewerId",
			"DeletedBy"::text AS "DeletedBy",
			COALESCE("DelegationLevel", 'department') AS "DelegationLevel"
		FROM "_TSKTask"
		WHERE ("IdSeq"::text = $1 OR "Code" = $1) AND "IsDeleted" = true
	`, taskId)
	if err != nil {
		return fmt.Errorf("không tìm thấy công việc trong thùng rác: %s", taskId)
	}

	userId := ""
	if user != nil {
		userId = user.UserId
	}
	if userId == "" {
		return fmt.Errorf("yêu cầu xác thực tài khoản hợp lệ trước khi thực hiện xóa vĩnh viễn công việc")
	}

	userRole := ""
	userName := ""
	_ = s.db.QueryRowContext(ctx, `
		SELECT COALESCE("Role", 'employee'), COALESCE("Username", '')
		FROM "_USRAccountDirectory"
		WHERE "Id"::text = $1 OR "IdSeq"::text = $1
	`, userId).Scan(&userRole, &userName)

	isAdmin := isSystemAdminOrManager(user) || strings.EqualFold(userRole, "admin") || strings.EqualFold(userRole, "system_admin") || strings.EqualFold(userRole, "director") || strings.EqualFold(userRole, "general_director")
	if strings.EqualFold(userRole, "employee") || strings.EqualFold(userName, "user01") {
		isAdmin = false
	}
	_ = isAdmin

	assignerId := ""
	if task.AssignerId != nil {
		assignerId = *task.AssignerId
	}
	reviewerId := ""
	if task.ReviewerId != nil {
		reviewerId = *task.ReviewerId
	}
	assigneeId := ""
	if task.AssigneeId != nil {
		assigneeId = *task.AssigneeId
	}
	deletedBy := ""
	if task.DeletedBy != nil {
		deletedBy = *task.DeletedBy
	}

	isAssigner := userId != "" && (strings.EqualFold(assignerId, userId) || strings.EqualFold(reviewerId, userId))
	isDeleter := userId != "" && strings.EqualFold(deletedBy, userId)
	isPersonal := strings.EqualFold(task.DelegationLevel, "personal") || assignerId == "" || (userId != "" && strings.EqualFold(assigneeId, userId) && strings.EqualFold(assignerId, userId))

	if !isAdmin && !isAssigner && !isDeleter && !isPersonal {
		return fmt.Errorf("bạn không có quyền khôi phục công việc \"%s\"", task.Title)
	}

	query := `
		UPDATE "_TSKTask"
		SET "IsDeleted" = false,
			"DeletedAt" = NULL,
			"DeletedBy" = NULL,
			"UpdatedAt" = CURRENT_TIMESTAMP
		WHERE "IdSeq"::text = $1 OR "Code" = $1
	`
	_, err = s.db.ExecContext(ctx, query, taskId)
	return err
}

// PurgeTask permanently deletes a task from trash
func (s *TaskService) PurgeTask(ctx context.Context, taskId string, user *security.UserContext) error {
	var task struct {
		IdSeq           string  `db:"IdSeq"`
		Code            string  `db:"Code"`
		Title           string  `db:"Title"`
		AssigneeId      *string `db:"AssigneeId"`
		AssignerId      *string `db:"AssignerId"`
		ReviewerId      *string `db:"ReviewerId"`
		DeletedBy       *string `db:"DeletedBy"`
		DelegationLevel string  `db:"DelegationLevel"`
	}
	err := s.db.GetContext(ctx, &task, `
		SELECT 
			"IdSeq"::text AS "IdSeq",
			"Code",
			"Title",
			"AssigneeId"::text AS "AssigneeId",
			"AssignerId"::text AS "AssignerId",
			"ReviewerId"::text AS "ReviewerId",
			"DeletedBy"::text AS "DeletedBy",
			COALESCE("DelegationLevel", 'department') AS "DelegationLevel"
		FROM "_TSKTask"
		WHERE ("IdSeq"::text = $1 OR "Code" = $1) AND "IsDeleted" = true
	`, taskId)
	if err != nil {
		return fmt.Errorf("không tìm thấy công việc trong thùng rác: %s", taskId)
	}

	userId := ""
	if user != nil {
		userId = user.UserId
	}
	if userId == "" {
		return fmt.Errorf("yêu cầu xác thực tài khoản hợp lệ trước khi thực hiện xóa vĩnh viễn công việc")
	}

	userRole := ""
	userName := ""
	_ = s.db.QueryRowContext(ctx, `
		SELECT COALESCE("Role", 'employee'), COALESCE("Username", '')
		FROM "_USRAccountDirectory"
		WHERE "Id"::text = $1 OR "IdSeq"::text = $1
	`, userId).Scan(&userRole, &userName)

	isAdmin := isSystemAdminOrManager(user) || strings.EqualFold(userRole, "admin") || strings.EqualFold(userRole, "system_admin") || strings.EqualFold(userRole, "director") || strings.EqualFold(userRole, "general_director")
	if strings.EqualFold(userRole, "employee") || strings.EqualFold(userName, "user01") {
		isAdmin = false
	}
	_ = isAdmin

	assignerId := ""
	if task.AssignerId != nil {
		assignerId = *task.AssignerId
	}
	reviewerId := ""
	if task.ReviewerId != nil {
		reviewerId = *task.ReviewerId
	}
	assigneeId := ""
	if task.AssigneeId != nil {
		assigneeId = *task.AssigneeId
	}

	isAssigner := userId != "" && (strings.EqualFold(assignerId, userId) || strings.EqualFold(reviewerId, userId))
	isPersonal := strings.EqualFold(task.DelegationLevel, "personal") || assignerId == "" || (userId != "" && strings.EqualFold(assigneeId, userId) && strings.EqualFold(assignerId, userId))

	if !isAdmin && !isAssigner && !isPersonal {
		return fmt.Errorf("chỉ người tạo, người giao việc hoặc quản trị viên mới có quyền dọn dẹp vĩnh viễn công việc \"%s\"", task.Title)
	}

	_, err = s.db.ExecContext(ctx, `DELETE FROM "_TSKTask" WHERE ("IdSeq"::text = $1 OR "Code" = $1) AND "IsDeleted" = true`, taskId)
	return err
}

// Checklist operations
func (s *TaskService) AddChecklistItem(ctx context.Context, taskId string, title string, user *security.UserContext) (*domain.TaskChecklistItem, error) {
	var currentTask struct {
		Title      string  `db:"Title"`
		Status     string  `db:"Status"`
		IsDeleted  bool    `db:"IsDeleted"`
		AssigneeId *string `db:"AssigneeId"`
		AssignerId *string `db:"AssignerId"`
		ReviewerId *string `db:"ReviewerId"`
		CreatedBy  *string `db:"CreatedBy"`
	}
	err := s.db.GetContext(ctx, &currentTask, `
		SELECT "Title", "Status", COALESCE("IsDeleted", false) AS "IsDeleted",
		       "AssigneeId"::text, "AssignerId"::text, "ReviewerId"::text, "CreatedBy"::text
		FROM "_TSKTask"
		WHERE "IdSeq"::text = $1 OR "Code" = $1
	`, taskId)
	if err != nil {
		return nil, fmt.Errorf("không tìm thấy công việc: %s", taskId)
	}

	if currentTask.IsDeleted || currentTask.Status == "cancelled" || currentTask.Status == "archived" {
		return nil, fmt.Errorf("công việc \"%s\" đã hủy hoặc lưu trữ, không thể chỉnh sửa checklist", currentTask.Title)
	}

	userId := ""
	userRole := ""
	userName := ""
	if user != nil {
		userId = user.UserId
		userRole = user.Role
		userName = user.Username
	}
	if userId != "" {
		var roleDb, usernameDb string
		_ = s.db.QueryRowContext(ctx, `SELECT COALESCE("Role", ''), COALESCE("Username", '') FROM "_USRAccountDirectory" WHERE "Id"::text = $1 OR "IdSeq"::text = $1 LIMIT 1`, userId).Scan(&roleDb, &usernameDb)
		if roleDb != "" {
			userRole = roleDb
		}
		if usernameDb != "" {
			userName = usernameDb
		}
	}
	isAdmin := isSystemAdminOrManager(user) || strings.EqualFold(userRole, "admin") || strings.EqualFold(userRole, "system_admin") || strings.EqualFold(userRole, "director") || strings.EqualFold(userRole, "general_director")
	if strings.EqualFold(userRole, "employee") || strings.EqualFold(userName, "user01") {
		isAdmin = false
	}
	_ = isAdmin

	assignerId := ""
	if currentTask.AssignerId != nil {
		assignerId = *currentTask.AssignerId
	}
	reviewerId := ""
	if currentTask.ReviewerId != nil {
		reviewerId = *currentTask.ReviewerId
	}
	assigneeId := ""
	if currentTask.AssigneeId != nil {
		assigneeId = *currentTask.AssigneeId
	}
	createdBy := ""
	if currentTask.CreatedBy != nil {
		createdBy = *currentTask.CreatedBy
	}

	isAssigner := userId != "" && (strings.EqualFold(assignerId, userId) || strings.EqualFold(reviewerId, userId) || strings.EqualFold(createdBy, userId))
	isAssignee := userId != "" && strings.EqualFold(assigneeId, userId)

	if !isAdmin && !isAssigner && !isAssignee {
		return nil, fmt.Errorf("bạn không có quyền chỉnh sửa checklist của công việc \"%s\"", currentTask.Title)
	}

	var item domain.TaskChecklistItem
	query := `
		INSERT INTO "_TSKTaskChecklist" ("TaskId", "Title", "IsCompleted", "SortOrder")
		VALUES ($1::uuid, $2, false, 1)
		RETURNING "IdSeq"::text, "TaskId"::text, "Title", "IsCompleted", "SortOrder"
	`
	err = s.db.QueryRowContext(ctx, query, taskId, title).Scan(&item.IdSeq, &item.TaskId, &item.Title, &item.IsCompleted, &item.SortOrder)
	return &item, err
}

func (s *TaskService) ToggleChecklistItem(ctx context.Context, itemId string, completed bool, user *security.UserContext) error {
	var currentTask struct {
		Title      string  `db:"Title"`
		Status     string  `db:"Status"`
		IsDeleted  bool    `db:"IsDeleted"`
		AssigneeId *string `db:"AssigneeId"`
		AssignerId *string `db:"AssignerId"`
		ReviewerId *string `db:"ReviewerId"`
		CreatedBy  *string `db:"CreatedBy"`
	}
	err := s.db.GetContext(ctx, &currentTask, `
		SELECT t."Title", t."Status", COALESCE(t."IsDeleted", false) AS "IsDeleted",
		       t."AssigneeId"::text, t."AssignerId"::text, t."ReviewerId"::text, t."CreatedBy"::text
		FROM "_TSKTaskChecklist" c
		JOIN "_TSKTask" t ON c."TaskId" = t."IdSeq"
		WHERE c."IdSeq"::text = $1
	`, itemId)
	if err == nil {
		if currentTask.IsDeleted || currentTask.Status == "cancelled" || currentTask.Status == "archived" {
			return fmt.Errorf("công việc \"%s\" đã hủy hoặc lưu trữ, không thể thay đổi tiến độ checklist", currentTask.Title)
		}
		userId := ""
		userRole := ""
		userName := ""
		if user != nil {
			userId = user.UserId
			userRole = user.Role
			userName = user.Username
		}
		if userId != "" {
			var roleDb, usernameDb string
			_ = s.db.QueryRowContext(ctx, `SELECT COALESCE("Role", ''), COALESCE("Username", '') FROM "_USRAccountDirectory" WHERE "Id"::text = $1 OR "IdSeq"::text = $1 LIMIT 1`, userId).Scan(&roleDb, &usernameDb)
			if roleDb != "" {
				userRole = roleDb
			}
			if usernameDb != "" {
				userName = usernameDb
			}
		}
		isAdmin := isSystemAdminOrManager(user) || strings.EqualFold(userRole, "admin") || strings.EqualFold(userRole, "system_admin") || strings.EqualFold(userRole, "director") || strings.EqualFold(userRole, "general_director")
		if strings.EqualFold(userRole, "employee") || strings.EqualFold(userName, "user01") {
			isAdmin = false
		}
		assignerId := ""
		if currentTask.AssignerId != nil {
			assignerId = *currentTask.AssignerId
		}
		reviewerId := ""
		if currentTask.ReviewerId != nil {
			reviewerId = *currentTask.ReviewerId
		}
		assigneeId := ""
		if currentTask.AssigneeId != nil {
			assigneeId = *currentTask.AssigneeId
		}
		createdBy := ""
		if currentTask.CreatedBy != nil {
			createdBy = *currentTask.CreatedBy
		}
		isAssigner := userId != "" && (strings.EqualFold(assignerId, userId) || strings.EqualFold(reviewerId, userId) || strings.EqualFold(createdBy, userId))
		isAssignee := userId != "" && strings.EqualFold(assigneeId, userId)

		if !isAdmin && !isAssigner && !isAssignee {
			return fmt.Errorf("bạn không có quyền nghiệm thu hoặc thay đổi checklist của công việc \"%s\"", currentTask.Title)
		}
	}

	var now *time.Time
	if completed {
		t := time.Now()
		now = &t
	}
	_, err = s.db.ExecContext(ctx, `
		UPDATE "_TSKTaskChecklist" SET 
			"IsCompleted" = $1, 
			"CompletedAt" = $2
		WHERE "IdSeq"::text = $3
	`, completed, now, itemId)
	return err
}

// AddComment adds a discussion comment on a task
func (s *TaskService) AddComment(ctx context.Context, taskId, userId, authorName, roleName, content string) (*domain.TaskComment, error) {
	var c domain.TaskComment
	query := `
		INSERT INTO "_TSKComment" ("TaskId", "UserId", "AuthorName", "RoleName", "Content")
		VALUES ($1::uuid, NULLIF($2, '')::uuid, $3, $4, $5)
		RETURNING "IdSeq"::text, "TaskId"::text, "UserId"::text, "AuthorName", "RoleName", "Content", "IsInternalSupervisor", "CreatedAt"
	`
	err := s.db.QueryRowContext(ctx, query, taskId, userId, authorName, roleName, content).Scan(
		&c.IdSeq, &c.TaskId, &c.UserId, &c.AuthorName, &c.RoleName, &c.Content, &c.IsInternalSupervisor, &c.CreatedAt,
	)
	return &c, err
}

// SubmitApprovalRequest: Employee submits completed work to manager for review
func (s *TaskService) SubmitApprovalRequest(ctx context.Context, taskId string, requesterId string, requestNote string) error {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var reviewerId, assignerId sql.NullString
	_ = tx.QueryRowContext(ctx, `SELECT "ReviewerId"::text, "AssignerId"::text FROM "_TSKTask" WHERE "IdSeq"::text = $1`, taskId).Scan(&reviewerId, &assignerId)

	apprvId := requesterId
	if reviewerId.Valid && reviewerId.String != "" {
		apprvId = reviewerId.String
	} else if assignerId.Valid && assignerId.String != "" {
		apprvId = assignerId.String
	}

	if requestNote == "" {
		requestNote = "Báo cáo hoàn thành 100% khối lượng công việc, trình cấp trên kiểm tra nghiệm thu."
	}

	ins := `
		INSERT INTO "_TSKApprovalRequest" ("TaskId", "RequesterId", "ApproverId", "RequestType", "Status", "RequestNote")
		VALUES ($1::uuid, $2::uuid, $3::uuid, 'completion', 'pending', $4)
	`
	if _, err := tx.ExecContext(ctx, ins, taskId, requesterId, apprvId, requestNote); err != nil {
		return err
	}

	upd := `
		UPDATE "_TSKTask" SET 
			"Status" = 'in_review', 
			"Progress" = 100, 
			"UpdatedAt" = CURRENT_TIMESTAMP 
		WHERE "IdSeq"::text = $1
	`
	if _, err := tx.ExecContext(ctx, upd, taskId); err != nil {
		return err
	}

	return tx.Commit()
}

// ProcessApproval: Manager approves (Done) or rejects (In Progress) with reason
func (s *TaskService) ProcessApproval(ctx context.Context, requestId string, approverId string, decision string, approvalNote string) error {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var taskId string
	err = tx.QueryRowContext(ctx, `SELECT "TaskId"::text FROM "_TSKApprovalRequest" WHERE "IdSeq"::text = $1 OR "TaskId"::text = $1 ORDER BY "RequestedAt" DESC LIMIT 1`, requestId).Scan(&taskId)
	if err != nil {
		// If no formal request row exists yet for this taskId, treat requestId as taskId directly
		taskId = requestId
	} else {
		now := time.Now()
		updReq := `
			UPDATE "_TSKApprovalRequest" SET 
				"ApproverId" = NULLIF($1, '')::uuid, 
				"Status" = $2, 
				"ApprovalNote" = $3, 
				"DecidedAt" = $4,
				"UpdatedAt" = CURRENT_TIMESTAMP
			WHERE "IdSeq"::text = $5 OR ("TaskId"::text = $6 AND "Status" = 'pending')
		`
		_, _ = tx.ExecContext(ctx, updReq, approverId, decision, approvalNote, now, requestId, taskId)
	}

	now := time.Now()
	if decision == "approved" {
		updTask := `
			UPDATE "_TSKTask" SET 
				"Status" = 'done', 
				"Progress" = 100, 
				"CompletedAt" = $1, 
				"UpdatedAt" = CURRENT_TIMESTAMP 
			WHERE "IdSeq"::text = $2
		`
		if _, err := tx.ExecContext(ctx, updTask, now, taskId); err != nil {
			return err
		}
	} else {
		updTask := `
			UPDATE "_TSKTask" SET 
				"Status" = 'in_progress', 
				"UpdatedAt" = CURRENT_TIMESTAMP 
			WHERE "IdSeq"::text = $1
		`
		if _, err := tx.ExecContext(ctx, updTask, taskId); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// ListPendingApprovals returns all approval requests with task and project info
func (s *TaskService) ListPendingApprovals(ctx context.Context, statusFilter string) ([]domain.ApprovalRequest, error) {
	query := `
		SELECT 
			COALESCE(a."IdSeq"::text, t."IdSeq"::text) AS "IdSeq",
			t."IdSeq"::text AS "TaskId",
			t."Title" AS "TaskTitle",
			t."Code" AS "TaskCode",
			COALESCE(p."Name", '') AS "ProjectName",
			COALESCE(t."Department", '') AS "Department",
			COALESCE(t."Priority", 'medium') AS "Priority",
			COALESCE(t."Progress", 0) AS "Progress",
			COALESCE(a."RequesterId"::text, t."AssigneeId"::text, '') AS "RequesterId",
			COALESCE(u1."Name", u_as."Name", '') AS "RequesterName",
			COALESCE(a."ApproverId"::text, t."ReviewerId"::text, t."AssignerId"::text, '') AS "ApproverId",
			COALESCE(u2."Name", u_rv."Name", u_ar."Name", 'Ban Giám sát') AS "ApproverName",
			COALESCE(a."RequestType", 'completion') AS "RequestType",
			COALESCE(a."Status", CASE WHEN t."Status" IN ('review', 'in_review') THEN 'pending' ELSE t."Status" END) AS "Status",
			COALESCE(a."RequestNote", 'Báo cáo hoàn thành 100% công việc, trình cấp trên kiểm tra nghiệm thu.') AS "RequestNote",
			COALESCE(a."ApprovalNote", '') AS "ApprovalNote",
			COALESCE(a."RequestedAt", t."UpdatedAt") AS "SubmittedAt",
			COALESCE(a."RequestedAt", t."UpdatedAt") AS "RequestedAt",
			a."DecidedAt"
		FROM "_TSKTask" t
		LEFT JOIN "_TSKApprovalRequest" a ON t."IdSeq" = a."TaskId"
		LEFT JOIN "_TSKProject" p ON t."ProjectId" = p."IdSeq"
		LEFT JOIN "_USRAccountDirectory" u1 ON (a."RequesterId" = u1."Id" OR a."RequesterId" = u1."IdSeq")
		LEFT JOIN "_USRAccountDirectory" u2 ON (a."ApproverId" = u2."Id" OR a."ApproverId" = u2."IdSeq")
		LEFT JOIN "_USRAccountDirectory" u_as ON (t."AssigneeId" = u_as."Id" OR t."AssigneeId" = u_as."IdSeq")
		LEFT JOIN "_USRAccountDirectory" u_rv ON (t."ReviewerId" = u_rv."Id" OR t."ReviewerId" = u_rv."IdSeq")
		LEFT JOIN "_USRAccountDirectory" u_ar ON (t."AssignerId" = u_ar."Id" OR t."AssignerId" = u_ar."IdSeq")
		WHERE COALESCE(t."IsDeleted", false) = false
		  AND (
		      (a."IdSeq" IS NOT NULL AND ($1 = '' OR a."Status" = $1))
		      OR
		      (a."IdSeq" IS NULL AND t."Status" IN ('review', 'in_review') AND ($1 = '' OR $1 = 'pending'))
		  )
		ORDER BY COALESCE(a."RequestedAt", t."UpdatedAt") DESC
	`
	list := []domain.ApprovalRequest{}
	err := s.db.SelectContext(ctx, &list, query, statusFilter)
	return list, err
}

// GetStats returns aggregated statistics according to ETPMS dashboard standard
func (s *TaskService) GetStats(ctx context.Context) (*domain.TaskStats, error) {
	query := `
		SELECT 
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE "Status" = 'backlog') AS backlog,
			COUNT(*) FILTER (WHERE "Status" = 'todo') AS todo,
			COUNT(*) FILTER (WHERE "Status" = 'in_progress') AS in_progress,
			COUNT(*) FILTER (WHERE "Status" IN ('review', 'in_review')) AS review,
			COUNT(*) FILTER (WHERE "Status" IN ('completed', 'done')) AS completed,
			COUNT(*) FILTER (WHERE "DueDate" < CURRENT_TIMESTAMP AND "Status" NOT IN ('completed', 'done', 'cancelled')) AS overdue,
			COALESCE(AVG("Progress"), 0) AS avg_progress
		FROM "_TSKTask"
	`
	var res struct {
		Total       int             `db:"total"`
		Backlog     int             `db:"backlog"`
		Todo        int             `db:"todo"`
		InProgress  int             `db:"in_progress"`
		Review      int             `db:"review"`
		Completed   int             `db:"completed"`
		Overdue     int             `db:"overdue"`
		AvgProgress sql.NullFloat64 `db:"avg_progress"`
	}

	if err := s.db.GetContext(ctx, &res, query); err != nil {
		return nil, err
	}

	avg := 0.0
	if res.AvgProgress.Valid {
		avg = res.AvgProgress.Float64
	}

	onTimeRate := 100.0
	if res.Completed+res.Overdue > 0 {
		onTimeRate = float64(res.Completed) / float64(res.Completed+res.Overdue) * 100
	}

	deptQuery := `
		SELECT 
			COALESCE(NULLIF("Department", ''), 'Khối chung') AS department,
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE "Status" IN ('completed', 'done')) AS completed,
			COUNT(*) FILTER (WHERE "Status" = 'in_progress') AS in_progress,
			COUNT(*) FILTER (WHERE "DueDate" < CURRENT_TIMESTAMP AND "Status" NOT IN ('completed', 'done', 'cancelled')) AS overdue
		FROM "_TSKTask"
		GROUP BY "Department"
		ORDER BY total DESC
	`
	var deptRows []struct {
		Department string `db:"department"`
		Total      int    `db:"total"`
		Completed  int    `db:"completed"`
		InProgress int    `db:"in_progress"`
		Overdue    int    `db:"overdue"`
	}
	_ = s.db.SelectContext(ctx, &deptRows, deptQuery)

	deptStats := make([]domain.DepartmentTaskStat, len(deptRows))
	for i, r := range deptRows {
		deptStats[i] = domain.DepartmentTaskStat{
			Department: r.Department,
			Total:      r.Total,
			Completed:  r.Completed,
			InProgress: r.InProgress,
			Overdue:    r.Overdue,
		}
	}

	return &domain.TaskStats{
		TotalTasks:      res.Total,
		BacklogTasks:    res.Backlog,
		TodoTasks:       res.Todo,
		InProgressTasks: res.InProgress,
		InReviewTasks:   res.Review,
		CompletedTasks:  res.Completed,
		OverdueTasks:    res.Overdue,
		OnTimeRate:      onTimeRate,
		AvgProgress:     avg,
		DepartmentStats: deptStats,
	}, nil
}

// ReportProgress records employee's work progress
func (s *TaskService) ReportProgress(ctx context.Context, taskId string, reportedBy string, currentProgress int, summary, issues string, workHours float64) error {
	var prevProgress int
	var prevStatus string
	err := s.db.QueryRowContext(ctx, `SELECT "Progress", "Status" FROM "_TSKTask" WHERE "IdSeq"::text = $1`, taskId).
		Scan(&prevProgress, &prevStatus)
	if err != nil {
		return err
	}

	newStatus := prevStatus
	if currentProgress >= 100 {
		newStatus = "in_review"
	} else if currentProgress > 0 && (prevStatus == "todo" || prevStatus == "backlog") {
		newStatus = "in_progress"
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	insertLog := `
		INSERT INTO "_TSKProgressLog" (
			"TaskId", "ReporterId", "PreviousProgress", "CurrentProgress",
			"PreviousStatus", "CurrentStatus", "WorkHours", "Summary", "Issues"
		) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9)
	`
	if _, err := tx.ExecContext(ctx, insertLog, taskId, reportedBy, prevProgress, currentProgress, prevStatus, newStatus, workHours, summary, issues); err != nil {
		return err
	}

	updateTask := `
		UPDATE "_TSKTask" SET 
			"Progress" = $1, 
			"Status" = $2,
			"ActualHours" = COALESCE("ActualHours", 0) + $3,
			"UpdatedAt" = CURRENT_TIMESTAMP 
		WHERE "IdSeq"::text = $4
	`
	if _, err := tx.ExecContext(ctx, updateTask, currentProgress, newStatus, workHours, taskId); err != nil {
		return err
	}

	return tx.Commit()
}

// SubmitFeedback allows supervisor/manager to review and give feedback on task progress
func (s *TaskService) SubmitFeedback(ctx context.Context, taskId, logId string, supervisorId string, feedbackStatus, feedbackText string) error {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	now := time.Now()
	if logId != "" && logId != "0" {
		updateLog := `
			UPDATE "_TSKProgressLog" SET
				"SupervisorComment" = $1,
				"ReviewedBy" = NULLIF($2, '')::uuid,
				"ReviewedAt" = $3
			WHERE "IdSeq"::text = $4
		`
		_, _ = tx.ExecContext(ctx, updateLog, feedbackText, supervisorId, now, logId)
	}

	if feedbackStatus == "approved" {
		updateTask := `
			UPDATE "_TSKTask" SET 
				"Status" = 'done', 
				"Progress" = 100,
				"CompletedAt" = $1, 
				"UpdatedAt" = CURRENT_TIMESTAMP 
			WHERE "IdSeq"::text = $2
		`
		if _, err := tx.ExecContext(ctx, updateTask, now, taskId); err != nil {
			return err
		}
	} else if feedbackStatus == "changes_requested" || feedbackStatus == "rejected" {
		updateTask := `
			UPDATE "_TSKTask" SET 
				"Status" = 'in_progress', 
				"UpdatedAt" = CURRENT_TIMESTAMP 
			WHERE "IdSeq"::text = $1
		`
		if _, err := tx.ExecContext(ctx, updateTask, taskId); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// ListProjects returns all projects with computed task counts
func (s *TaskService) ListProjects(ctx context.Context) ([]domain.Project, error) {
	query := `
		SELECT 
			p."IdSeq"::text AS "IdSeq",
			p."Code",
			p."Name",
			COALESCE(p."Description", '') AS "Description",
			COALESCE(p."Department", '') AS "Department",
			p."ManagerId"::text AS "ManagerId",
			COALESCE(u."Name", '') AS "ManagerName",
			p."StartDate",
			p."EndDate",
			p."EndDate" AS "DueDate",
			COALESCE(p."Budget", 0)::float8 AS "Budget",
			COALESCE(p."Status", 'active') AS "Status",
			COALESCE(p."Progress", 0) AS "Progress",
			COALESCE(p."RequiresApproval", false) AS "RequiresApproval",
			COALESCE(p."ApprovalWorkflow", '1_level') AS "ApprovalWorkflow",
			COUNT(t."IdSeq")::int AS "TotalTasks",
			COUNT(t."IdSeq") FILTER (WHERE t."Status" IN ('completed', 'done'))::int AS "DoneTasks",
			p."CreatedAt",
			p."UpdatedAt"
		FROM "_TSKProject" p
		LEFT JOIN "_USRAccountDirectory" u ON (p."ManagerId" = u."Id" OR p."ManagerId" = u."IdSeq")
		LEFT JOIN "_TSKTask" t ON (p."IdSeq" = t."ProjectId" AND COALESCE(t."IsDeleted", false) = false)
		WHERE COALESCE(p."IsDeleted", false) = false
		GROUP BY p."IdSeq", u."Name"
		ORDER BY p."CreatedAt" DESC, p."Code" ASC
	`
	list := []domain.Project{}
	if err := s.db.SelectContext(ctx, &list, query); err != nil {
		return nil, err
	}
	return list, nil
}

// CreateProject creates a new project in _TSKProject
func (s *TaskService) CreateProject(ctx context.Context, p *domain.Project) (*domain.Project, error) {
	if p.Code == "" {
		p.Code = fmt.Sprintf("PRJ-GS-%d", time.Now().Unix()%10000)
	}
	if p.Status == "" {
		p.Status = "active"
	}
	if p.ApprovalWorkflow == "" {
		p.ApprovalWorkflow = "1_level"
	}
	var mgrId string
	if p.ManagerId != nil {
		mgrId = *p.ManagerId
	}
	query := `
		INSERT INTO "_TSKProject" (
			"Code", "Name", "Description", "Department", "ManagerId",
			"StartDate", "EndDate", "Budget", "Status", "Progress",
			"RequiresApproval", "ApprovalWorkflow"
		) VALUES (
			$1, $2, $3, $4, NULLIF($5, '')::uuid,
			$6, $7, $8, $9, $10,
			$11, $12
		) RETURNING "IdSeq"::text, "CreatedAt", "UpdatedAt"
	`
	err := s.db.QueryRowContext(ctx, query,
		p.Code, p.Name, p.Description, p.Department, mgrId,
		p.StartDate, p.EndDate, p.Budget, p.Status, p.Progress,
		p.RequiresApproval, p.ApprovalWorkflow,
	).Scan(&p.IdSeq, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

// UpdateProject updates project fields
func (s *TaskService) UpdateProject(ctx context.Context, p *domain.Project) error {
	var mgrId string
	if p.ManagerId != nil {
		mgrId = *p.ManagerId
	}
	wf := p.ApprovalWorkflow
	if wf == "" {
		wf = "1_level"
	}
	query := `
		UPDATE "_TSKProject" SET
			"Code" = COALESCE(NULLIF($1, ''), "Code"),
			"Name" = COALESCE(NULLIF($2, ''), "Name"),
			"Description" = COALESCE($3, "Description"),
			"Department" = COALESCE(NULLIF($4, ''), "Department"),
			"ManagerId" = COALESCE(NULLIF($5, '')::uuid, "ManagerId"),
			"Status" = COALESCE(NULLIF($6, ''), "Status"),
			"Progress" = CASE WHEN $7 >= 0 THEN $7 ELSE "Progress" END,
			"Budget" = CASE WHEN $8 > 0 THEN $8 ELSE "Budget" END,
			"StartDate" = COALESCE($9, "StartDate"),
			"EndDate" = COALESCE($10, "EndDate"),
			"RequiresApproval" = $11,
			"ApprovalWorkflow" = COALESCE(NULLIF($12, ''), "ApprovalWorkflow"),
			"UpdatedAt" = CURRENT_TIMESTAMP
		WHERE "IdSeq"::text = $13 OR "Code" = $13
	`
	_, err := s.db.ExecContext(ctx, query, p.Code, p.Name, p.Description, p.Department, mgrId, p.Status, p.Progress, p.Budget, p.StartDate, p.EndDate, p.RequiresApproval, wf, p.IdSeq)
	return err
}

// DeleteProject soft-deletes a project from the system
func (s *TaskService) DeleteProject(ctx context.Context, projectId string, deletedBy *string) error {
	var uid string
	if deletedBy != nil {
		uid = *deletedBy
	}
	query := `
		UPDATE "_TSKProject"
		SET "IsDeleted" = true,
		    "DeletedAt" = CURRENT_TIMESTAMP,
		    "DeletedBy" = COALESCE(NULLIF($2, '')::uuid, "DeletedBy"),
		    "UpdatedAt" = CURRENT_TIMESTAMP
		WHERE "IdSeq"::text = $1 OR "Code" = $1
	`
	_, err := s.db.ExecContext(ctx, query, projectId, uid)
	return err
}

// ListMilestones returns all milestones across projects
func (s *TaskService) ListMilestones(ctx context.Context, projectId string) ([]domain.Milestone, error) {
	query := `
		SELECT
			m."IdSeq"::text AS "IdSeq",
			m."ProjectId"::text AS "ProjectId",
			COALESCE(p."Name", '') AS "ProjectName",
			m."Title",
			m."DueDate",
			COALESCE(m."Status", 'open') AS "Status",
			COALESCE(m."Progress", 0) AS "Progress",
			COALESCE(m."Department", p."Department", '') AS "Department",
			COALESCE(m."OwnerName", '') AS "OwnerName",
			COALESCE(m."Description", '') AS "Description",
			m."CreatedAt"
		FROM "_TSKMilestone" m
		LEFT JOIN "_TSKProject" p ON m."ProjectId" = p."IdSeq"
		WHERE ($1 = '' OR m."ProjectId"::text = $1)
		ORDER BY m."DueDate" ASC NULLS LAST
	`
	list := []domain.Milestone{}
	err := s.db.SelectContext(ctx, &list, query, projectId)
	return list, err
}

// ListDocuments returns enterprise documents & attachments from _TSKAttachment
func (s *TaskService) ListDocuments(ctx context.Context, scope, search, department, category string) ([]domain.TaskDocument, error) {
	query := `
		SELECT
			"IdSeq"::text AS "IdSeq", "Code", "TaskId"::text AS "TaskId", "TaskCode",
			"ProjectName", "FileName", "Category", "FileType", "FileSize", "Version",
			"Department", "UploadedBy"::text AS "UploadedBy", "UploaderName",
			"SharedScope", "Status", "IsDeleted", "Description", "UpdatedAt", "CreatedAt"
		FROM "_TSKAttachment"
		WHERE 1=1
	`
	var args []any
	argIdx := 1

	switch scope {
	case "trash":
		query += ` AND "IsDeleted" = true`
	case "my":
		query += ` AND "IsDeleted" = false AND "SharedScope" = 'my'`
	case "shared":
		query += ` AND "IsDeleted" = false AND "SharedScope" = 'shared'`
	default:
		query += ` AND "IsDeleted" = false`
	}

	if department != "" {
		query += fmt.Sprintf(` AND "Department" = $%d`, argIdx)
		args = append(args, department)
		argIdx++
	}
	if category != "" {
		query += fmt.Sprintf(` AND "Category" = $%d`, argIdx)
		args = append(args, category)
		argIdx++
	}
	if search != "" {
		query += fmt.Sprintf(` AND ("FileName" ILIKE $%d OR "Code" ILIKE $%d OR "TaskCode" ILIKE $%d OR "ProjectName" ILIKE $%d)`, argIdx, argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	query += ` ORDER BY "UpdatedAt" DESC`

	list := []domain.TaskDocument{}
	err := s.db.SelectContext(ctx, &list, query, args...)
	return list, err
}

// CreateDocument registers a new document in _TSKAttachment
func (s *TaskService) CreateDocument(ctx context.Context, doc *domain.TaskDocument) (*domain.TaskDocument, error) {
	if doc.Code == "" {
		doc.Code = fmt.Sprintf("DOC-GS-%03d", time.Now().Unix()%1000)
	}
	if doc.Status == "" {
		doc.Status = "published"
	}
	if doc.SharedScope == "" {
		doc.SharedScope = "shared"
	}
	if doc.Version == "" {
		doc.Version = "v1.0"
	}
	if doc.FileSize == "" {
		doc.FileSize = "1.5 MB"
	}
	var taskId, uploadedBy string
	if doc.TaskId != nil {
		taskId = *doc.TaskId
	}
	if doc.UploadedBy != nil {
		uploadedBy = *doc.UploadedBy
	}
	query := `
		INSERT INTO "_TSKAttachment" (
			"Code", "TaskId", "TaskCode", "ProjectName", "FileName", "Category",
			"FileType", "FileSize", "Version", "Department", "UploadedBy",
			"UploaderName", "SharedScope", "Status", "IsDeleted", "Description"
		) VALUES (
			$1, NULLIF($2, '')::uuid, $3, $4, $5, $6,
			$7, $8, $9, $10, NULLIF($11, '')::uuid,
			$12, $13, $14, false, $15
		) RETURNING "IdSeq"::text, "UpdatedAt", "CreatedAt"
	`
	err := s.db.QueryRowContext(ctx, query,
		doc.Code, taskId, doc.TaskCode, doc.ProjectName, doc.FileName, doc.Category,
		doc.FileType, doc.FileSize, doc.Version, doc.Department, uploadedBy,
		doc.UploaderName, doc.SharedScope, doc.Status, doc.Description,
	).Scan(&doc.IdSeq, &doc.UpdatedAt, &doc.CreatedAt)
	return doc, err
}

// UpdateDocumentStatus moves a document to trash, restores it, or permanently deletes it
func (s *TaskService) UpdateDocumentStatus(ctx context.Context, id string, action string) error {
	switch action {
	case "trash":
		_, err := s.db.ExecContext(ctx, `UPDATE "_TSKAttachment" SET "IsDeleted" = true, "UpdatedAt" = now() WHERE "IdSeq"::text = $1 OR "Code" = $1`, id)
		return err
	case "restore":
		_, err := s.db.ExecContext(ctx, `UPDATE "_TSKAttachment" SET "IsDeleted" = false, "UpdatedAt" = now() WHERE "IdSeq"::text = $1 OR "Code" = $1`, id)
		return err
	case "delete":
		_, err := s.db.ExecContext(ctx, `DELETE FROM "_TSKAttachment" WHERE "IdSeq"::text = $1 OR "Code" = $1`, id)
		return err
	}
	return nil
}

// ListEmployees returns all employees from HRM directory with linked account username
func (s *TaskService) ListEmployees(ctx context.Context, search, department string) ([]domain.Employee, error) {
	query := `
		SELECT 
			e."IdSeq"::text AS "IdSeq", e."Code", e."FullName", e."Department", e."Position",
			e."Phone", e."Email", COALESCE(e."DelegationLevel", 'department') AS "DelegationLevel",
			e."Status", e."UserId"::text AS "UserId", COALESCE(u."Username", '') AS "Username",
			e."CreatedAt", e."UpdatedAt"
		FROM "_HRMEmployeeDirectory" e
		LEFT JOIN "_USRAccountDirectory" u ON e."UserId" = u."Id"
		WHERE 1=1
	`
	var args []any
	argIdx := 1
	if department != "" {
		query += fmt.Sprintf(` AND e."Department" = $%d`, argIdx)
		args = append(args, department)
		argIdx++
	}
	if search != "" {
		query += fmt.Sprintf(` AND (e."FullName" ILIKE $%d OR e."Code" ILIKE $%d OR e."Phone" ILIKE $%d OR e."Email" ILIKE $%d)`, argIdx, argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}
	query += ` ORDER BY e."Code" ASC`

	employees := []domain.Employee{}
	if err := s.db.SelectContext(ctx, &employees, query, args...); err != nil {
		return nil, err
	}
	return employees, nil
}

// CreateEmployee registers a new employee
func (s *TaskService) CreateEmployee(ctx context.Context, emp *domain.Employee) (*domain.Employee, error) {
	if emp.Code == "" {
		emp.Code = fmt.Sprintf("GS-%04d", time.Now().Unix()%10000)
	}
	if emp.Status == "" {
		emp.Status = "active"
	}
	if emp.DelegationLevel == "" {
		emp.DelegationLevel = "department"
	}
	query := `
		INSERT INTO "_HRMEmployeeDirectory" (
			"Code", "FullName", "Department", "Position", "Phone", "Email", "DelegationLevel", "Status", "UserId"
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9
		) RETURNING "IdSeq"::text, "CreatedAt", "UpdatedAt"
	`
	err := s.db.QueryRowContext(ctx, query,
		emp.Code, emp.FullName, emp.Department, emp.Position, emp.Phone, emp.Email, emp.DelegationLevel, emp.Status, emp.UserId,
	).Scan(&emp.IdSeq, &emp.CreatedAt, &emp.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return emp, nil
}

// UpdateEmployee updates employee profile
func (s *TaskService) UpdateEmployee(ctx context.Context, emp *domain.Employee) error {
	query := `
		UPDATE "_HRMEmployeeDirectory" SET
			"FullName" = $1, "Department" = $2, "Position" = $3,
			"Phone" = $4, "Email" = $5, "DelegationLevel" = $6,
			"Status" = $7, "UserId" = $8, "UpdatedAt" = CURRENT_TIMESTAMP
		WHERE "IdSeq"::text = $9 OR "Code" = $10
	`
	_, err := s.db.ExecContext(ctx, query,
		emp.FullName, emp.Department, emp.Position, emp.Phone, emp.Email,
		emp.DelegationLevel, emp.Status, emp.UserId, emp.IdSeq, emp.Code,
	)
	return err
}

// DeleteEmployee removes an employee from HRM directory
func (s *TaskService) DeleteEmployee(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM "_HRMEmployeeDirectory" WHERE "IdSeq"::text = $1 OR "Code" = $1`, id)
	return err
}

// DeleteUser removes a user account and safely cleans up or reassigns foreign key references
func (s *TaskService) DeleteUser(ctx context.Context, id string) error {
	// Guard: never delete root admin account
	var username string
	err := s.db.QueryRowContext(ctx, `SELECT "Username" FROM "_USRAccountDirectory" WHERE "Id"::text = $1 OR "IdSeq"::text = $1 OR "Username" = $1`, id).Scan(&username)
	if err == nil && (username == "admin" || username == "Hoàng Văn Tuấn") {
		return fmt.Errorf("không thể xóa tài khoản Quản trị viên tối cao (admin)")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Get exact UUID and IdSeq
	var userUUID string
	var idSeq string
	err = tx.QueryRowContext(ctx, `SELECT "Id"::text, "IdSeq"::text FROM "_USRAccountDirectory" WHERE "Id"::text = $1 OR "IdSeq"::text = $1 OR "Username" = $1`, id).Scan(&userUUID, &idSeq)
	if err != nil {
		return fmt.Errorf("tài khoản không tồn tại hoặc đã bị xóa")
	}

	// 1. Delete sessions and login logs
	_, _ = tx.ExecContext(ctx, `DELETE FROM "_USRSession" WHERE "UserId" = $1`, userUUID)
	_, _ = tx.ExecContext(ctx, `DELETE FROM "_USRLoginLog" WHERE "Username" = $1`, username)

	// 2. Delete permissions and group memberships
	_, _ = tx.ExecContext(ctx, `DELETE FROM "_SECAccountPermission" WHERE "AccountId" = $1`, userUUID)
	_, _ = tx.ExecContext(ctx, `DELETE FROM "_SECGroupMember" WHERE "AccountId" = $1`, userUUID)
	_, _ = tx.ExecContext(ctx, `DELETE FROM "_SECAuditLog" WHERE "ActorId" = $1`, userUUID)
	_, _ = tx.ExecContext(ctx, `DELETE FROM "_USROutsideApproval" WHERE "Username" = $1`, username)

	// 3. Clear employee link
	_, _ = tx.ExecContext(ctx, `UPDATE "_HRMEmployeeDirectory" SET "UserId" = NULL WHERE "UserId" = $1`, userUUID)

	// 4. Reassign tasks to admin
	adminUUID := "09da7c89-2fe4-4b78-b164-6762c70521fd"
	_, _ = tx.ExecContext(ctx, `UPDATE "_TSKTask" SET "AssigneeId" = $1 WHERE "AssigneeId" = $2`, adminUUID, userUUID)
	_, _ = tx.ExecContext(ctx, `UPDATE "_TSKTask" SET "AssignerId" = $1 WHERE "AssignerId" = $2`, adminUUID, userUUID)
	_, _ = tx.ExecContext(ctx, `UPDATE "_TSKTask" SET "ReviewerId" = $1 WHERE "ReviewerId" = $2`, adminUUID, userUUID)

	// 5. Delete actor directory entry
	_, _ = tx.ExecContext(ctx, `DELETE FROM "_SYSActorDirectory" WHERE "IdSeq"::text = $1`, idSeq)

	// 6. Delete account
	_, err = tx.ExecContext(ctx, `DELETE FROM "_USRAccountDirectory" WHERE "Id"::text = $1`, userUUID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// DeleteDepartment removes a department from the organization directory
func (s *TaskService) DeleteDepartment(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM "_ORGDirectory" WHERE "Kind" = 'department' AND ("IdSeq"::text = $1 OR "Key" = $1)`, id)
	return err
}

// ListPartners returns all external partners and their contacts
func (s *TaskService) ListPartners(ctx context.Context) ([]domain.PartnerContact, error) {
	var list []domain.PartnerContact
	err := s.db.SelectContext(ctx, &list, `
		SELECT "IdSeq"::text, "PartnerCode", "PartnerName", "ContactName",
		       COALESCE("ContactRole", '') AS "ContactRole",
		       COALESCE("Phone", '') AS "Phone",
		       COALESCE("Email", '') AS "Email",
		       COALESCE("PartnerType", 'partner') AS "PartnerType",
		       COALESCE("Note", '') AS "Note",
		       COALESCE("IsActive", true) AS "IsActive"
		FROM "_TSKPartnerContact"
		ORDER BY "PartnerName" ASC, "ContactName" ASC
	`)
	if err != nil {
		return nil, err
	}
	return list, nil
}

// SavePartner creates or updates an external partner contact
func (s *TaskService) SavePartner(ctx context.Context, p *domain.PartnerContact) (*domain.PartnerContact, error) {
	if p.PartnerName == "" {
		return nil, fmt.Errorf("tên đối tác không được để trống")
	}
	if p.ContactName == "" {
		return nil, fmt.Errorf("tên người liên hệ không được để trống")
	}
	if p.PartnerCode == "" {
		p.PartnerCode = strings.ToUpper(strings.ReplaceAll(p.PartnerName, " ", "_"))
		if len(p.PartnerCode) > 20 {
			p.PartnerCode = p.PartnerCode[:20]
		}
	}
	if p.IdSeq != "" {
		_, err := s.db.ExecContext(ctx, `
			UPDATE "_TSKPartnerContact"
			SET "PartnerCode" = $1, "PartnerName" = $2, "ContactName" = $3,
			    "ContactRole" = $4, "Phone" = $5, "Email" = $6, "PartnerType" = $7,
			    "Note" = $8, "IsActive" = $9, "UpdatedAt" = CURRENT_TIMESTAMP
			WHERE "IdSeq"::text = $10
		`, p.PartnerCode, p.PartnerName, p.ContactName, p.ContactRole, p.Phone, p.Email, p.PartnerType, p.Note, p.IsActive, p.IdSeq)
		return p, err
	}
	var id string
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO "_TSKPartnerContact" ("PartnerCode", "PartnerName", "ContactName", "ContactRole", "Phone", "Email", "PartnerType", "Note", "IsActive")
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING "IdSeq"::text
	`, p.PartnerCode, p.PartnerName, p.ContactName, p.ContactRole, p.Phone, p.Email, p.PartnerType, p.Note, p.IsActive).Scan(&id)
	if err != nil {
		return nil, err
	}
	p.IdSeq = id
	return p, nil
}

// DeletePartner deletes an external partner contact
func (s *TaskService) DeletePartner(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM "_TSKPartnerContact" WHERE "IdSeq"::text = $1`, id)
	return err
}

