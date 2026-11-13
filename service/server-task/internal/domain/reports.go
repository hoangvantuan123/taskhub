package domain

type ReportSummary struct {
	TotalCandidates int     `json:"totalCandidates"`
	TotalSessions   int     `json:"totalSessions"`
	TotalPassed     int     `json:"totalPassed"`
	TotalFailed     int     `json:"totalFailed"`
	PassRate        float64 `json:"passRate"`
	AverageScore    float64 `json:"averageScore"`
}

type DepartmentExamStat struct {
	DepartmentName string  `json:"departmentName"`
	CandidateCount int     `json:"candidateCount"`
	PassCount      int     `json:"passCount"`
	PassRate       float64 `json:"passRate"`
	AverageScore   float64 `json:"averageScore"`
}

type ReportConfig struct {
	Id           string `json:"id" db:"Id"`
	Key          string `json:"key" db:"Key"`
	Title        string `json:"title" db:"Title"`
	SourceUrl    string `json:"sourceUrl" db:"SourceUrl"`
	Description  string `json:"description" db:"Description"`
	AllowedRoles string `json:"allowedRoles" db:"AllowedRoles"`
	CanEditRoles string `json:"canEditRoles" db:"CanEditRoles"`
	IsActive     bool   `json:"isActive" db:"IsActive"`
	Categories   string `json:"categories" db:"Categories"`
	Data         string `json:"data" db:"Data"`
	UpdatedBy    string `json:"updatedBy" db:"UpdatedBy"`
	UpdatedAt    string `json:"updatedAt" db:"UpdatedAt"`
	CanEdit      bool   `json:"canEdit"`
}
