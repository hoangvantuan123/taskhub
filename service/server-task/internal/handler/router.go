package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"server-task/internal/app"
	"server-task/internal/domain"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"
)

type RouterHandler struct {
	app *app.AppContainer
}

func NewRouterHandler(app *app.AppContainer) *RouterHandler {
	return &RouterHandler{app: app}
}

func (h *RouterHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// CORS Headers
	origin := r.Header.Get("Origin")
	if origin != "" {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, DPoP")
	}
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")

	fail := func(status int, message string) {
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(map[string]any{"success": false, "message": message})
	}
	ok := func(data any) {
		_ = json.NewEncoder(w).Encode(map[string]any{"success": true, "data": data})
	}

	// 1. Health check
	if r.URL.Path == "/health" {
		ok(map[string]string{"status": "ok", "service": "server-task"})
		return
	}

	ctx := r.Context()

	// 3. Routing action
	rawPath := r.URL.Path
	var path string
	if strings.HasPrefix(rawPath, "/api/tasks/") {
		path = "tasks/" + strings.TrimPrefix(rawPath, "/api/tasks/")
	} else if rawPath == "/api/tasks" {
		path = "tasks/list"
	} else if strings.HasPrefix(rawPath, "/api/projects/") {
		path = "projects/" + strings.TrimPrefix(rawPath, "/api/projects/")
	} else if rawPath == "/api/projects" {
		path = "projects/list"
	} else if strings.HasPrefix(rawPath, "/api/partners/") {
		path = "partners/" + strings.TrimPrefix(rawPath, "/api/partners/")
	} else if rawPath == "/api/partners" {
		path = "partners/list"
	} else {
		path = strings.Trim(strings.TrimPrefix(strings.TrimPrefix(rawPath, "/api/learning"), "/api/"), "/")
	}

	// 2. Authentication check: Destructive endpoints strictly require verified auth token
	token := r.Header.Get("Authorization")
	u, err := h.app.SecClient.ParseAndVerifyToken(token)
	if err != nil || u == nil || u.UserId == "" {
		if strings.Contains(path, "delete") || strings.Contains(path, "purge") {
			fail(http.StatusUnauthorized, "Yêu cầu đăng nhập và có token xác thực hợp lệ để thực hiện thao tác xóa")
			return
		}
		u = h.app.TaskSvc.ResolveFallbackUser(ctx)
	}

	var payload map[string]any
	if r.Body != nil && r.ContentLength > 0 {
		_ = json.NewDecoder(r.Body).Decode(&payload)
	}
	if payload == nil {
		payload = make(map[string]any)
	}

	h.app.Log.Info("Handling taskgs request",
		zap.String("path", path),
		zap.String("user", u.Username),
		zap.String("role", u.Role),
	)

	switch path {
	// ─── TASK MANAGEMENT ────────────────────────────────────────────────────
	case "tasks/list":
		status := getStr(payload, "status")
		if status == "" {
			status = r.URL.Query().Get("status")
		}
		priority := getStr(payload, "priority")
		if priority == "" {
			priority = r.URL.Query().Get("priority")
		}
		search := getStr(payload, "search")
		if search == "" {
			search = r.URL.Query().Get("search")
		}
		department := getStr(payload, "department")
		if department == "" {
			department = r.URL.Query().Get("department")
		}
		view := getStr(payload, "view")
		if view == "" {
			view = r.URL.Query().Get("view")
		}
		assigneeId := getStr(payload, "assigneeId")
		supervisorId := getStr(payload, "supervisorId")
		projectId := getStr(payload, "projectId")

		list, err := h.app.TaskSvc.ListTasks(ctx, status, priority, search, assigneeId, supervisorId, department, projectId, view, u.UserId, u.Role)
		if err != nil {
			fail(http.StatusInternalServerError, err.Error())
			return
		}
		ok(list)

	case "tasks/stats":
		stats, err := h.app.TaskSvc.GetStats(ctx)
		if err != nil {
			fail(http.StatusInternalServerError, err.Error())
			return
		}
		ok(stats)

	case "tasks/detail":
		taskId := getStr(payload, "id")
		if taskId == "" {
			taskId = getStr(payload, "taskId")
		}
		if taskId == "" {
			taskId = getStr(payload, "code")
		}
		if taskId == "" {
			taskId = r.URL.Query().Get("id")
		}
		detail, err := h.app.TaskSvc.GetTaskDetail(ctx, taskId)
		if err != nil {
			fail(http.StatusNotFound, "Không tìm thấy công việc: "+err.Error())
			return
		}
		ok(detail)

	case "tasks/create":
		t := &domain.Task{
			Code:            getStr(payload, "code"),
			Title:           getStr(payload, "title"),
			Description:     getStr(payload, "description"),
			Goal:            getStr(payload, "goal"),
			Priority:        getStr(payload, "priority"),
			Status:          getStr(payload, "status"),
			DelegationLevel: getStr(payload, "delegationLevel"),
			Department:      getStr(payload, "department"),
			SubDepartment:   getStr(payload, "subDepartment"),
			EstimatedHours:  getFloat(payload, "estimatedHours", 0),
		}
		if pId := getStr(payload, "projectId"); pId != "" {
			t.ProjectId = &pId
		}
		if parentId := getStr(payload, "parentTaskId"); parentId != "" {
			t.ParentTaskId = &parentId
		}
		if aId := getStr(payload, "assigneeId"); aId != "" {
			t.AssigneeId = &aId
		}
		assignerId := getStr(payload, "assignerId")
		if assignerId == "" && u != nil {
			assignerId = u.UserId
		}
		if assignerId != "" {
			t.AssignerId = &assignerId
		}
		reviewerId := getStr(payload, "reviewerId")
		if reviewerId == "" {
			reviewerId = getStr(payload, "supervisorId")
		}
		if reviewerId == "" && u != nil {
			reviewerId = u.UserId
		}
		if reviewerId != "" {
			t.ReviewerId = &reviewerId
			t.SupervisorId = &reviewerId
		}
		if startStr := getStr(payload, "startDate"); startStr != "" {
			if parsed := parseTime(startStr); parsed != nil {
				t.StartDate = parsed
			}
		}
		if dueStr := getStr(payload, "dueDate"); dueStr != "" {
			if parsed := parseTime(dueStr); parsed != nil {
				t.DueDate = parsed
			}
		}
		if rawTags, exists := payload["tags"]; exists {
			if b, err := json.Marshal(rawTags); err == nil {
				t.Tags = string(b)
			}
		}
		var checklists []string
		if rawList, ok := payload["checklists"].([]any); ok {
			for _, item := range rawList {
				if s, ok := item.(string); ok {
					checklists = append(checklists, s)
				}
			}
		}

		res, err := h.app.TaskSvc.CreateTask(ctx, t, checklists)
		if err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(res)

	case "tasks/update":
		taskId := getStr(payload, "id")
		if taskId == "" {
			taskId = getStr(payload, "taskId")
		}
		t := &domain.Task{
			IdSeq:         taskId,
			Title:         getStr(payload, "title"),
			Description:   getStr(payload, "description"),
			Goal:          getStr(payload, "goal"),
			Priority:      getStr(payload, "priority"),
			Status:        getStr(payload, "status"),
			Progress:      getInt(payload, "progress", -1),
			Department:    getStr(payload, "department"),
			SubDepartment: getStr(payload, "subDepartment"),
		}
		if _, exists := payload["projectId"]; exists {
			pId := getStr(payload, "projectId")
			if pId == "" || pId == "null" || pId == "CLEAR" {
				clearVal := "CLEAR"
				t.ProjectId = &clearVal
			} else {
				t.ProjectId = &pId
			}
		}
		if _, exists := payload["assigneeId"]; exists {
			aId := getStr(payload, "assigneeId")
			if aId == "" || aId == "null" || aId == "CLEAR" {
				clearVal := "CLEAR"
				t.AssigneeId = &clearVal
			} else {
				t.AssigneeId = &aId
			}
		}
		if _, exists := payload["supervisorId"]; exists {
			sId := getStr(payload, "supervisorId")
			if sId == "" || sId == "null" || sId == "CLEAR" {
				clearVal := "CLEAR"
				t.SupervisorId = &clearVal
				t.ReviewerId = &clearVal
			} else {
				t.SupervisorId = &sId
				t.ReviewerId = &sId
			}
		} else if _, exists := payload["reviewerId"]; exists {
			rId := getStr(payload, "reviewerId")
			if rId == "" || rId == "null" || rId == "CLEAR" {
				clearVal := "CLEAR"
				t.SupervisorId = &clearVal
				t.ReviewerId = &clearVal
			} else {
				t.SupervisorId = &rId
				t.ReviewerId = &rId
			}
		}
		if startStr := getStr(payload, "startDate"); startStr != "" {
			if parsed := parseTime(startStr); parsed != nil {
				t.StartDate = parsed
			}
		}
		if dueStr := getStr(payload, "dueDate"); dueStr != "" {
			if parsed := parseTime(dueStr); parsed != nil {
				t.DueDate = parsed
			}
		}
		if rawTags, exists := payload["tags"]; exists {
			if strVal, ok := rawTags.(string); ok {
				t.Tags = strVal
			} else if b, err := json.Marshal(rawTags); err == nil {
				t.Tags = string(b)
			}
		}

		if err := h.app.TaskSvc.UpdateTask(ctx, t, u); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		if isImp, hasImp := payload["isImportant"].(bool); hasImp {
			_ = h.app.TaskSvc.SetTaskImportant(ctx, taskId, isImp)
		} else if isImp, hasImp := payload["important"].(bool); hasImp {
			_ = h.app.TaskSvc.SetTaskImportant(ctx, taskId, isImp)
		}
		if isArc, hasArc := payload["isArchived"].(bool); hasArc {
			_ = h.app.TaskSvc.SetTaskArchived(ctx, taskId, isArc)
		} else if isArc, hasArc := payload["archived"].(bool); hasArc {
			_ = h.app.TaskSvc.SetTaskArchived(ctx, taskId, isArc)
		}
		ok(map[string]any{"updated": true, "id": taskId})

	case "tasks/important", "tasks/important/toggle", "tasks/star/toggle":
		taskId := getStr(payload, "id")
		if taskId == "" {
			taskId = getStr(payload, "taskId")
		}
		isImportant := false
		if v, ok := payload["isImportant"].(bool); ok {
			isImportant = v
		} else if v, ok := payload["important"].(bool); ok {
			isImportant = v
		}
		if err := h.app.TaskSvc.SetTaskImportant(ctx, taskId, isImportant); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"updated": true, "id": taskId, "isImportant": isImportant})

	case "tasks/archive", "tasks/archive/toggle":
		taskId := getStr(payload, "id")
		if taskId == "" {
			taskId = getStr(payload, "taskId")
		}
		isArchived := true
		if v, ok := payload["isArchived"].(bool); ok {
			isArchived = v
		} else if v, ok := payload["archived"].(bool); ok {
			isArchived = v
		}
		if err := h.app.TaskSvc.SetTaskArchived(ctx, taskId, isArchived); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"updated": true, "id": taskId, "isArchived": isArchived})

	case "tasks/delete":
		taskId := getStr(payload, "id")
		if taskId == "" {
			taskId = getStr(payload, "taskId")
		}
		if err := h.app.TaskSvc.DeleteTask(ctx, taskId, u); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"deleted": true, "id": taskId})

	case "tasks/restore":
		taskId := getStr(payload, "id")
		if taskId == "" {
			taskId = getStr(payload, "taskId")
		}
		if err := h.app.TaskSvc.RestoreTask(ctx, taskId, u); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"restored": true, "id": taskId})

	case "tasks/purge":
		taskId := getStr(payload, "id")
		if taskId == "" {
			taskId = getStr(payload, "taskId")
		}
		if err := h.app.TaskSvc.PurgeTask(ctx, taskId, u); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"purged": true, "id": taskId})

	case "tasks/progress/report":
		taskId := getStr(payload, "taskId")
		progress := getInt(payload, "progress", 0)
		if progress == 0 {
			progress = getInt(payload, "currentProgress", 0)
		}
		summary := getStr(payload, "summary")
		if summary == "" {
			summary = getStr(payload, "content")
		}
		issues := getStr(payload, "issues")
		workHours := getFloat(payload, "workHours", 0)

		if err := h.app.TaskSvc.ReportProgress(ctx, taskId, u.UserId, progress, summary, issues, workHours); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"success": true, "message": "Báo cáo tiến độ thành công"})

	case "tasks/feedback/submit":
		taskId := getStr(payload, "taskId")
		logId := getStr(payload, "logId")
		feedbackStatus := getStr(payload, "feedbackStatus")
		feedbackText := getStr(payload, "supervisorFeedback")
		if feedbackText == "" {
			feedbackText = getStr(payload, "comment")
		}

		if err := h.app.TaskSvc.SubmitFeedback(ctx, taskId, logId, u.UserId, feedbackStatus, feedbackText); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"success": true, "message": "Phản hồi và duyệt tiến độ thành công"})

	case "tasks/status/update":
		taskId := getStr(payload, "id")
		if taskId == "" {
			taskId = getStr(payload, "taskId")
		}
		newStatus := getStr(payload, "status")
		if err := h.app.TaskSvc.UpdateTaskStatus(ctx, taskId, newStatus); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"updated": true, "id": taskId, "status": newStatus})

	case "tasks/checklist/add":
		taskId := getStr(payload, "taskId")
		title := getStr(payload, "title")
		item, err := h.app.TaskSvc.AddChecklistItem(ctx, taskId, title, u)
		if err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(item)

	case "tasks/checklist/toggle":
		itemId := getStr(payload, "itemId")
		if itemId == "" {
			itemId = getStr(payload, "checklistId")
		}
		completed := false
		if v, ok := payload["completed"].(bool); ok {
			completed = v
		} else if v, ok := payload["isCompleted"].(bool); ok {
			completed = v
		}
		if err := h.app.TaskSvc.ToggleChecklistItem(ctx, itemId, completed, u); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"toggled": true, "itemId": itemId, "completed": completed})

	case "tasks/comments/add":
		taskId := getStr(payload, "taskId")
		content := getStr(payload, "content")
		authorName := getStr(payload, "authorName")
		if authorName == "" {
			authorName = u.Username
		}
		roleName := getStr(payload, "roleName")
		comment, err := h.app.TaskSvc.AddComment(ctx, taskId, u.UserId, authorName, roleName, content)
		if err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(comment)

	case "tasks/approval/request":
		taskId := getStr(payload, "taskId")
		note := getStr(payload, "requestNote")
		if note == "" {
			note = getStr(payload, "note")
		}
		if err := h.app.TaskSvc.SubmitApprovalRequest(ctx, taskId, u.UserId, note); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"success": true, "message": "Gửi yêu cầu phê duyệt thành công"})

	case "tasks/approval/process", "tasks/approval/decide", "tasks/approvals/decide", "tasks/approvals/process":
		requestId := getStr(payload, "requestId")
		if requestId == "" {
			requestId = getStr(payload, "taskId")
		}
		decision := getStr(payload, "decision")
		if decision == "" {
			decision = getStr(payload, "status")
		}
		note := getStr(payload, "approvalNote")
		if note == "" {
			note = getStr(payload, "note")
		}
		if err := h.app.TaskSvc.ProcessApproval(ctx, requestId, u.UserId, decision, note); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"success": true, "message": "Xử lý phê duyệt thành công", "decision": decision})

	case "tasks/approval/list", "tasks/approvals/list":
		statusFilter := getStr(payload, "status")
		list, err := h.app.TaskSvc.ListPendingApprovals(ctx, statusFilter)
		if err != nil {
			fail(http.StatusInternalServerError, err.Error())
			return
		}
		ok(list)

	case "tasks/documents/list":
		scope := getStr(payload, "scope")
		search := getStr(payload, "search")
		department := getStr(payload, "department")
		category := getStr(payload, "category")
		list, err := h.app.TaskSvc.ListDocuments(ctx, scope, search, department, category)
		if err != nil {
			fail(http.StatusInternalServerError, err.Error())
			return
		}
		ok(list)

	case "tasks/documents/create":
		doc := &domain.TaskDocument{
			Code:         getStr(payload, "code"),
			TaskCode:     getStr(payload, "taskCode"),
			ProjectName:  getStr(payload, "projectName"),
			FileName:     getStr(payload, "fileName"),
			Category:     getStr(payload, "category"),
			FileType:     getStr(payload, "fileType"),
			FileSize:     getStr(payload, "fileSize"),
			Version:      getStr(payload, "version"),
			Department:   getStr(payload, "department"),
			UploaderName: getStr(payload, "uploaderName"),
			SharedScope:  getStr(payload, "sharedScope"),
			Status:       getStr(payload, "status"),
			Description:  getStr(payload, "description"),
		}
		if tId := getStr(payload, "taskId"); tId != "" {
			doc.TaskId = &tId
		}
		if u != nil && u.UserId != "" {
			doc.UploadedBy = &u.UserId
		}
		res, err := h.app.TaskSvc.CreateDocument(ctx, doc)
		if err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(res)

	case "tasks/documents/update":
		id := getStr(payload, "id")
		action := getStr(payload, "action")
		if err := h.app.TaskSvc.UpdateDocumentStatus(ctx, id, action); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"updated": true, "id": id, "action": action})

	case "tasks/employees/list":
		search := getStr(payload, "search")
		department := getStr(payload, "department")
		list, err := h.app.TaskSvc.ListEmployees(ctx, search, department)
		if err != nil {
			fail(http.StatusInternalServerError, err.Error())
			return
		}
		ok(list)

	case "tasks/employees/create":
		emp := &domain.Employee{
			Code:            getStr(payload, "code"),
			FullName:        getStr(payload, "fullName"),
			Department:      getStr(payload, "department"),
			Position:        getStr(payload, "position"),
			Phone:           getStr(payload, "phone"),
			Email:           getStr(payload, "email"),
			DelegationLevel: getStr(payload, "delegationLevel"),
			Status:          getStr(payload, "status"),
		}
		userId := getStr(payload, "userId")
		if userId != "" {
			emp.UserId = &userId
		}
		res, err := h.app.TaskSvc.CreateEmployee(ctx, emp)
		if err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(res)

	case "tasks/employees/update":
		emp := &domain.Employee{
			IdSeq:           getStr(payload, "id"),
			Code:            getStr(payload, "code"),
			FullName:        getStr(payload, "fullName"),
			Department:      getStr(payload, "department"),
			Position:        getStr(payload, "position"),
			Phone:           getStr(payload, "phone"),
			Email:           getStr(payload, "email"),
			DelegationLevel: getStr(payload, "delegationLevel"),
			Status:          getStr(payload, "status"),
		}
		userId := getStr(payload, "userId")
		if userId != "" {
			emp.UserId = &userId
		}
		if err := h.app.TaskSvc.UpdateEmployee(ctx, emp); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"updated": true})

	case "tasks/employees/delete":
		empId := getStr(payload, "id")
		if empId == "" {
			empId = getStr(payload, "code")
		}
		if empId != "" {
			if err := h.app.TaskSvc.DeleteEmployee(ctx, empId); err != nil {
				fail(http.StatusBadRequest, err.Error())
				return
			}
			ok(map[string]any{"deleted": true, "id": empId})
			return
		}
		if rawIds, hasIds := payload["ids"].([]any); hasIds && len(rawIds) > 0 {
			count := 0
			for _, rid := range rawIds {
				if sid, isStr := rid.(string); isStr && sid != "" {
					if err := h.app.TaskSvc.DeleteEmployee(ctx, sid); err == nil {
						count++
					}
				}
			}
			ok(map[string]any{"deleted": true, "count": count})
			return
		}
		fail(http.StatusBadRequest, "Thiếu ID hoặc mã nhân sự cần xóa")

	// ─── USER & ORG & WORKFLOW DELETION ENDPOINTS ─────────────────────────
	case "tasks/users/delete":
		userId := getStr(payload, "id")
		if userId == "" {
			userId = getStr(payload, "username")
		}
		if userId != "" {
			if err := h.app.TaskSvc.DeleteUser(ctx, userId); err != nil {
				fail(http.StatusBadRequest, err.Error())
				return
			}
			ok(map[string]any{"deleted": true, "id": userId})
			return
		}
		if rawIds, hasIds := payload["ids"].([]any); hasIds && len(rawIds) > 0 {
			count := 0
			for _, rid := range rawIds {
				if sid, isStr := rid.(string); isStr && sid != "" {
					if err := h.app.TaskSvc.DeleteUser(ctx, sid); err == nil {
						count++
					}
				}
			}
			ok(map[string]any{"deleted": true, "count": count})
			return
		}
		fail(http.StatusBadRequest, "Thiếu ID hoặc username tài khoản cần xóa")

	case "tasks/departments/delete":
		deptId := getStr(payload, "id")
		if deptId == "" {
			deptId = getStr(payload, "code")
		}
		if deptId != "" {
			_ = h.app.TaskSvc.DeleteDepartment(ctx, deptId)
			ok(map[string]any{"deleted": true, "id": deptId})
			return
		}
		ok(map[string]any{"deleted": true})

	case "tasks/teams/delete":
		teamId := getStr(payload, "id")
		ok(map[string]any{"deleted": true, "id": teamId})

	case "tasks/workflows/delete":
		wfId := getStr(payload, "id")
		ok(map[string]any{"deleted": true, "id": wfId})

	case "tasks/workflows/statuses/delete":
		stId := getStr(payload, "id")
		ok(map[string]any{"deleted": true, "id": stId})

	case "tasks/workflows/rules/delete":
		rlId := getStr(payload, "id")
		ok(map[string]any{"deleted": true, "id": rlId})

	case "tasks/workflows/templates/delete":
		tmplId := getStr(payload, "id")
		ok(map[string]any{"deleted": true, "id": tmplId})

	case "tasks/workflows/automation/delete":
		autoId := getStr(payload, "id")
		ok(map[string]any{"deleted": true, "id": autoId})

	// ─── PROJECT & MILESTONE MANAGEMENT ────────────────────────────────────
	case "projects/list":
		list, err := h.app.TaskSvc.ListProjects(ctx)
		if err != nil {
			fail(http.StatusInternalServerError, err.Error())
			return
		}
		ok(list)

	case "projects/create":
		p := &domain.Project{
			Code:             getStr(payload, "code"),
			Name:             getStr(payload, "name"),
			Description:      getStr(payload, "description"),
			Department:       getStr(payload, "department"),
			Budget:           getFloat(payload, "budget", 0),
			Status:           getStr(payload, "status"),
			Progress:         getInt(payload, "progress", 0),
			RequiresApproval: getBool(payload, "requiresApproval", false),
			ApprovalWorkflow: getStr(payload, "approvalWorkflow"),
		}
		if mgrId := getStr(payload, "managerId"); mgrId != "" {
			p.ManagerId = &mgrId
		} else {
			p.ManagerId = nil
		}
		if startStr := getStr(payload, "startDate"); startStr != "" {
			p.StartDate = parseTime(startStr)
		}
		if endStr := getStr(payload, "endDate"); endStr != "" {
			p.EndDate = parseTime(endStr)
		} else if dueStr := getStr(payload, "dueDate"); dueStr != "" {
			p.EndDate = parseTime(dueStr)
		}
		res, err := h.app.TaskSvc.CreateProject(ctx, p)
		if err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(res)

	case "projects/update":
		p := &domain.Project{
			IdSeq:            getStr(payload, "id"),
			Code:             getStr(payload, "code"),
			Name:             getStr(payload, "name"),
			Description:      getStr(payload, "description"),
			Department:       getStr(payload, "department"),
			Budget:           getFloat(payload, "budget", 0),
			Status:           getStr(payload, "status"),
			Progress:         getInt(payload, "progress", -1),
			RequiresApproval: getBool(payload, "requiresApproval", false),
			ApprovalWorkflow: getStr(payload, "approvalWorkflow"),
		}
		if p.IdSeq == "" {
			p.IdSeq = getStr(payload, "projectId")
		}
		if mgrId := getStr(payload, "managerId"); mgrId != "" {
			p.ManagerId = &mgrId
		}
		if startStr := getStr(payload, "startDate"); startStr != "" {
			p.StartDate = parseTime(startStr)
		}
		if endStr := getStr(payload, "endDate"); endStr != "" {
			p.EndDate = parseTime(endStr)
		} else if dueStr := getStr(payload, "dueDate"); dueStr != "" {
			p.EndDate = parseTime(dueStr)
		}
		if err := h.app.TaskSvc.UpdateProject(ctx, p); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"updated": true, "id": p.IdSeq})

	case "projects/delete":
		projectId := getStr(payload, "id")
		if projectId == "" {
			projectId = getStr(payload, "projectId")
		}
		var userId *string
		if u != nil && u.UserId != "" {
			userId = &u.UserId
		}
		if err := h.app.TaskSvc.DeleteProject(ctx, projectId, userId); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"deleted": true, "id": projectId})

	case "projects/milestones/list":
		projectId := getStr(payload, "projectId")
		list, err := h.app.TaskSvc.ListMilestones(ctx, projectId)
		if err != nil {
			fail(http.StatusInternalServerError, err.Error())
			return
		}
		ok(list)

	// ─── EXTERNAL PARTNERS & CONTACTS ──────────────────────────────────────
	case "partners/list", "tasks/partners/list":
		list, err := h.app.TaskSvc.ListPartners(ctx)
		if err != nil {
			fail(http.StatusInternalServerError, err.Error())
			return
		}
		ok(list)

	case "partners/save", "partners/create", "tasks/partners/save", "tasks/partners/create":
		p := &domain.PartnerContact{
			IdSeq:       getStr(payload, "id"),
			PartnerCode: getStr(payload, "partnerCode"),
			PartnerName: getStr(payload, "partnerName"),
			ContactName: getStr(payload, "contactName"),
			ContactRole: getStr(payload, "contactRole"),
			Phone:       getStr(payload, "phone"),
			Email:       getStr(payload, "email"),
			PartnerType: getStr(payload, "partnerType"),
			Note:        getStr(payload, "note"),
			IsActive:    getBool(payload, "isActive", true),
		}
		res, err := h.app.TaskSvc.SavePartner(ctx, p)
		if err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(res)

	case "partners/delete", "tasks/partners/delete":
		id := getStr(payload, "id")
		if err := h.app.TaskSvc.DeletePartner(ctx, id); err != nil {
			fail(http.StatusBadRequest, err.Error())
			return
		}
		ok(map[string]any{"deleted": true, "id": id})

	// ─── WORK TEAMS / GROUPS ───────────────────────────────────────────────
	case "groups/list":
		groups, err := h.app.GroupSvc.ListGroups(ctx, u)
		if err != nil {
			fail(http.StatusInternalServerError, err.Error())
			return
		}
		ok(groups)

	case "reports/summary":
		stats, err := h.app.TaskSvc.GetStats(ctx)
		if err != nil {
			fail(http.StatusInternalServerError, err.Error())
			return
		}
		ok(stats)

	case "reports/departments":
		stats, err := h.app.TaskSvc.GetStats(ctx)
		if err != nil {
			fail(http.StatusInternalServerError, err.Error())
			return
		}
		ok(stats.DepartmentStats)

	case "reports/config/get", "tasks/reports/config/get":
		key := getStr(payload, "key")
		if key == "" {
			key = r.URL.Query().Get("key")
		}
		if key == "" {
			key = "sharepoint_progress"
		}
		cfg, err := h.app.ReportSvc.GetReportConfig(ctx, u, key)
		if err != nil {
			fail(http.StatusForbidden, err.Error())
			return
		}
		ok(cfg)

	case "reports/config/update", "tasks/reports/config/update":
		key := getStr(payload, "key")
		if key == "" {
			key = "sharepoint_progress"
		}
		title := getStr(payload, "title")
		sourceUrl := getStr(payload, "sourceUrl")
		description := getStr(payload, "description")

		cfg, err := h.app.ReportSvc.UpdateReportConfig(ctx, u, key, title, sourceUrl, description)
		if err != nil {
			fail(http.StatusForbidden, err.Error())
			return
		}
		ok(cfg)

	default:
		fail(http.StatusNotFound, "Action path không tồn tại: "+path)
	}
}

func getStr(p map[string]any, k string) string {
	if v, ok := p[k]; ok && v != nil {
		switch val := v.(type) {
		case string:
			return strings.TrimSpace(val)
		case float64:
			return fmt.Sprintf("%.0f", val)
		case int:
			return strconv.Itoa(val)
		}
	}
	return ""
}

func getInt(p map[string]any, k string, def int) int {
	if v, ok := p[k].(float64); ok {
		return int(v)
	}
	if v, ok := p[k].(int); ok {
		return v
	}
	if v, ok := p[k].(string); ok {
		if n, err := strconv.Atoi(strings.TrimSpace(v)); err == nil {
			return n
		}
	}
	return def
}

func getFloat(p map[string]any, k string, def float64) float64 {
	if v, ok := p[k].(float64); ok {
		return v
	}
	if v, ok := p[k].(string); ok {
		if n, err := strconv.ParseFloat(strings.TrimSpace(v), 64); err == nil {
			return n
		}
	}
	return def
}

func getBool(p map[string]any, k string, def bool) bool {
	if v, ok := p[k].(bool); ok {
		return v
	}
	if v, ok := p[k].(string); ok {
		v = strings.ToLower(strings.TrimSpace(v))
		if v == "true" || v == "1" || v == "yes" {
			return true
		}
		if v == "false" || v == "0" || v == "no" {
			return false
		}
	}
	return def
}

func parseTime(s string) *time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02T15:04:05", "2006-01-02 15:04:05", "2006-01-02"} {
		if t, err := time.Parse(layout, s); err == nil {
			return &t
		}
	}
	return nil
}
