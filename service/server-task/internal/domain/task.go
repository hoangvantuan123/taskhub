package domain

import (
	"time"
)

type Employee struct {
	IdSeq           string    `db:"IdSeq" json:"id"`
	Code            string    `db:"Code" json:"code"`
	FullName        string    `db:"FullName" json:"fullName"`
	Department      string    `db:"Department" json:"department"`
	Position        string    `db:"Position" json:"position"`
	Phone           string    `db:"Phone" json:"phone"`
	Email           string    `db:"Email" json:"email"`
	DelegationLevel string    `db:"DelegationLevel" json:"delegationLevel"`
	Status          string    `db:"Status" json:"status"`
	UserId          *string   `db:"UserId" json:"userId"`
	Username        string    `db:"Username" json:"username"`
	CreatedAt       time.Time `db:"CreatedAt" json:"createdAt"`
	UpdatedAt       time.Time `db:"UpdatedAt" json:"updatedAt"`
}

type Project struct {
	IdSeq            string     `db:"IdSeq" json:"id"`
	Code             string     `db:"Code" json:"code"`
	Name             string     `db:"Name" json:"name"`
	Description      string     `db:"Description" json:"description"`
	Department       string     `db:"Department" json:"department"`
	ManagerId        *string    `db:"ManagerId" json:"managerId"`
	ManagerName      string     `db:"ManagerName" json:"managerName"`
	StartDate        *time.Time `db:"StartDate" json:"startDate"`
	EndDate          *time.Time `db:"EndDate" json:"endDate"`
	DueDate          *time.Time `db:"DueDate" json:"dueDate"`
	Budget           float64    `db:"Budget" json:"budget"`
	Status           string     `db:"Status" json:"status"`
	Progress         int        `db:"Progress" json:"progress"`
	RequiresApproval bool       `db:"RequiresApproval" json:"requiresApproval"`
	ApprovalWorkflow string     `db:"ApprovalWorkflow" json:"approvalWorkflow"`
	TotalTasks       int        `db:"TotalTasks" json:"totalTasks"`
	DoneTasks        int        `db:"DoneTasks" json:"doneTasks"`
	CreatedAt        time.Time  `db:"CreatedAt" json:"createdAt"`
	UpdatedAt        time.Time  `db:"UpdatedAt" json:"updatedAt"`
}

type Milestone struct {
	IdSeq       string     `db:"IdSeq" json:"id"`
	ProjectId   string     `db:"ProjectId" json:"projectId"`
	ProjectName string     `db:"ProjectName" json:"projectName"`
	Title       string     `db:"Title" json:"title"`
	DueDate     *time.Time `db:"DueDate" json:"dueDate"`
	Status      string     `db:"Status" json:"status"`
	Progress    int        `db:"Progress" json:"progress"`
	Department  string     `db:"Department" json:"department"`
	OwnerName   string     `db:"OwnerName" json:"ownerName"`
	Description string     `db:"Description" json:"description"`
	CreatedAt   time.Time  `db:"CreatedAt" json:"createdAt"`
}

type TaskChecklistItem struct {
	IdSeq       string     `db:"IdSeq" json:"id"`
	TaskId      string     `db:"TaskId" json:"taskId"`
	Title       string     `db:"Title" json:"title"`
	IsCompleted bool       `db:"IsCompleted" json:"isCompleted"`
	CompletedAt *time.Time `db:"CompletedAt" json:"completedAt"`
	AssigneeId  *string    `db:"AssigneeId" json:"assigneeId"`
	SortOrder   int        `db:"SortOrder" json:"sortOrder"`
}

type ApprovalRequest struct {
	IdSeq         string     `db:"IdSeq" json:"id"`
	TaskId        string     `db:"TaskId" json:"taskId"`
	TaskTitle     string     `db:"TaskTitle" json:"taskTitle"`
	TaskCode      string     `db:"TaskCode" json:"taskCode"`
	ProjectName   string     `db:"ProjectName" json:"projectName"`
	Department    string     `db:"Department" json:"department"`
	Priority      string     `db:"Priority" json:"priority"`
	Progress      int        `db:"Progress" json:"progress"`
	RequesterId   string     `db:"RequesterId" json:"requesterId"`
	RequesterName string     `db:"RequesterName" json:"requesterName"`
	ApproverId    string     `db:"ApproverId" json:"approverId"`
	ApproverName  string     `db:"ApproverName" json:"approverName"`
	RequestType   string     `db:"RequestType" json:"requestType"`
	Status        string     `db:"Status" json:"status"` // pending, approved, rejected
	RequestNote   string     `db:"RequestNote" json:"requestNote"`
	ApprovalNote  string     `db:"ApprovalNote" json:"approvalNote"`
	SubmittedAt   time.Time  `db:"SubmittedAt" json:"submittedAt"`
	RequestedAt   time.Time  `db:"RequestedAt" json:"requestedAt"`
	DecidedAt     *time.Time `db:"DecidedAt" json:"decidedAt"`
}

type Task struct {
	IdSeq           string     `db:"IdSeq" json:"id"`
	Code            string     `db:"Code" json:"code"`
	Title           string     `db:"Title" json:"title"`
	Description     string     `db:"Description" json:"description"`
	Goal            string     `db:"Goal" json:"goal"`
	ProjectId       *string    `db:"ProjectId" json:"projectId"`
	ProjectName     string     `db:"ProjectName" json:"projectName"`
	ParentTaskId    *string    `db:"ParentTaskId" json:"parentTaskId"`
	DelegationLevel string     `db:"DelegationLevel" json:"delegationLevel"`
	Department      string     `db:"Department" json:"department"`
	SubDepartment   string     `db:"SubDepartment" json:"subDepartment"`
	AssigneeId      *string    `db:"AssigneeId" json:"assigneeId"`
	AssigneeName    string     `db:"AssigneeName" json:"assigneeName"`
	AssignerId      *string    `db:"AssignerId" json:"assignerId"`
	AssignerName    string     `db:"AssignerName" json:"assignerName"`
	ReviewerId      *string    `db:"ReviewerId" json:"reviewerId"`
	ReviewerName    string     `db:"ReviewerName" json:"reviewerName"`
	SupervisorId    *string    `db:"SupervisorId" json:"supervisorId"`
	SupervisorName  string     `db:"SupervisorName" json:"supervisorName"`
	Priority        string     `db:"Priority" json:"priority"`
	Status          string     `db:"Status" json:"status"`
	Progress        int        `db:"Progress" json:"progress"`
	EstimatedHours  float64    `db:"EstimatedHours" json:"estimatedHours"`
	ActualHours     float64    `db:"ActualHours" json:"actualHours"`
	StartDate       *time.Time `db:"StartDate" json:"startDate"`
	DueDate         *time.Time `db:"DueDate" json:"dueDate"`
	CompletedAt     *time.Time `db:"CompletedAt" json:"completedAt"`
	Tags            string     `db:"Tags" json:"tags"`
	IsImportant     bool       `db:"IsImportant" json:"isImportant"`
	IsArchived      bool       `db:"IsArchived" json:"isArchived"`
	IsDeleted       bool       `db:"IsDeleted" json:"isDeleted"`
	DeletedAt       *time.Time `db:"DeletedAt" json:"deletedAt"`
	DeletedBy       *string    `db:"DeletedBy" json:"deletedBy"`
	CreatedAt       time.Time  `db:"CreatedAt" json:"createdAt"`
	UpdatedAt       time.Time  `db:"UpdatedAt" json:"updatedAt"`
}

type ProgressLog struct {
	IdSeq             string     `db:"IdSeq" json:"id"`
	TaskId            string     `db:"TaskId" json:"taskId"`
	ReporterId        string     `db:"ReporterId" json:"reporterId"`
	ReporterName      string     `db:"ReporterName" json:"reporterName"`
	PreviousProgress  int        `db:"PreviousProgress" json:"previousProgress"`
	CurrentProgress   int        `db:"CurrentProgress" json:"currentProgress"`
	PreviousStatus    string     `db:"PreviousStatus" json:"previousStatus"`
	CurrentStatus     string     `db:"CurrentStatus" json:"currentStatus"`
	WorkHours         float64    `db:"WorkHours" json:"workHours"`
	Summary           string     `db:"Summary" json:"summary"`
	Content           string     `db:"Content" json:"content"`
	Issues            string     `db:"Issues" json:"issues"`
	SupervisorComment string     `db:"SupervisorComment" json:"supervisorComment"`
	ReviewedBy        *string    `db:"ReviewedBy" json:"reviewedBy"`
	ReviewerName      string     `db:"ReviewerName" json:"reviewerName"`
	ReviewedAt        *time.Time `db:"ReviewedAt" json:"reviewedAt"`
	CreatedAt         time.Time  `db:"CreatedAt" json:"createdAt"`
}

type TaskComment struct {
	IdSeq                string    `db:"IdSeq" json:"id"`
	TaskId               string    `db:"TaskId" json:"taskId"`
	UserId               *string   `db:"UserId" json:"userId"`
	AuthorName           string    `db:"AuthorName" json:"authorName"`
	RoleName             string    `db:"RoleName" json:"roleName"`
	Content              string    `db:"Content" json:"content"`
	IsInternalSupervisor bool      `db:"IsInternalSupervisor" json:"isInternalSupervisor"`
	CreatedAt            time.Time `db:"CreatedAt" json:"createdAt"`
}

type TaskDocument struct {
	IdSeq        string    `db:"IdSeq" json:"id"`
	Code         string    `db:"Code" json:"code"`
	TaskId       *string   `db:"TaskId" json:"taskId"`
	TaskCode     string    `db:"TaskCode" json:"taskCode"`
	ProjectName  string    `db:"ProjectName" json:"projectName"`
	FileName     string    `db:"FileName" json:"fileName"`
	Category     string    `db:"Category" json:"category"`
	FileType     string    `db:"FileType" json:"fileType"`
	FileSize     string    `db:"FileSize" json:"fileSize"`
	Version      string    `db:"Version" json:"version"`
	Department   string    `db:"Department" json:"department"`
	UploadedBy   *string   `db:"UploadedBy" json:"uploadedBy"`
	UploaderName string    `db:"UploaderName" json:"uploaderName"`
	SharedScope  string    `db:"SharedScope" json:"sharedScope"`
	Status       string    `db:"Status" json:"status"`
	IsDeleted    bool      `db:"IsDeleted" json:"isDeleted"`
	Description  string    `db:"Description" json:"description"`
	UpdatedAt    time.Time `db:"UpdatedAt" json:"updatedAt"`
	CreatedAt    time.Time `db:"CreatedAt" json:"createdAt"`
}

type TaskDetail struct {
	Task             Task                `json:"task"`
	Checklist        []TaskChecklistItem `json:"checklist"`
	ProgressLogs     []ProgressLog       `json:"progressLogs"`
	ApprovalRequests []ApprovalRequest   `json:"approvalRequests"`
	Comments         []TaskComment       `json:"comments"`
	Documents        []TaskDocument      `json:"documents"`
}

type DepartmentTaskStat struct {
	Department string `json:"department"`
	Total      int    `json:"total"`
	Completed  int    `json:"completed"`
	InProgress int    `json:"inProgress"`
	Overdue    int    `json:"overdue"`
}

type TaskStats struct {
	TotalTasks      int                  `json:"totalTasks"`
	BacklogTasks    int                  `json:"backlogTasks"`
	TodoTasks       int                  `json:"todoTasks"`
	InProgressTasks int                  `json:"inProgressTasks"`
	InReviewTasks   int                  `json:"inReviewTasks"`
	CompletedTasks  int                  `json:"completedTasks"`
	OverdueTasks    int                  `json:"overdueTasks"`
	OnTimeRate      float64              `json:"onTimeRate"`
	AvgProgress     float64              `json:"avgProgress"`
	DepartmentStats []DepartmentTaskStat `json:"departmentStats"`
}

type PartnerContact struct {
	IdSeq       string `db:"IdSeq" json:"id"`
	PartnerCode string `db:"PartnerCode" json:"partnerCode"`
	PartnerName string `db:"PartnerName" json:"partnerName"`
	ContactName string `db:"ContactName" json:"contactName"`
	ContactRole string `db:"ContactRole" json:"contactRole"`
	Phone       string `db:"Phone" json:"phone"`
	Email       string `db:"Email" json:"email"`
	PartnerType string `db:"PartnerType" json:"partnerType"`
	Note        string `db:"Note" json:"note"`
	IsActive    bool   `db:"IsActive" json:"isActive"`
}
