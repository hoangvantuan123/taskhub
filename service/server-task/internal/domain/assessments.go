package domain

import "time"

type Assessment struct {
	IdSeq            string    `json:"id" db:"IdSeq"`
	Code             string    `json:"code" db:"Code"`
	Title            string    `json:"title" db:"Title"`
	SubjectId        *string   `json:"subjectId" db:"SubjectId"`
	SubjectName      string    `json:"subjectName" db:"SubjectName"`
	TargetGroupId    *string   `json:"targetGroupId" db:"TargetGroupId"`
	TargetRank       *string   `json:"targetRank" db:"TargetRank"`
	TargetDepartment *string   `json:"targetDepartment" db:"TargetDepartment"`
	TargetPosition   *string   `json:"targetPosition" db:"TargetPosition"`
	TargetRole       *string   `json:"targetRole" db:"TargetRole"`
	Registration     string    `json:"registration" db:"Registration"`
	HasCriticalRule  bool      `json:"hasCriticalRule" db:"HasCriticalRule"`
	DurationMinutes  int       `json:"durationMinutes" db:"DurationMinutes"`
	TotalPoints      float64   `json:"totalPoints" db:"TotalPoints"`
	PassingScore     float64   `json:"passingScore" db:"PassingScore"`
	QuestionIds      []string  `json:"questionIds"`
	Status           string    `json:"status" db:"Status"`
	PublishedAt      *time.Time`json:"publishedAt" db:"PublishedAt"`
	CreatedBy        *string   `json:"createdBy" db:"CreatedBy"`
	UpdatedBy        *string   `json:"updatedBy" db:"UpdatedBy"`
	CreatedAt        time.Time `json:"createdAt" db:"CreatedAt"`
	UpdatedAt        time.Time `json:"updatedAt" db:"UpdatedAt"`
	RowVersion       int64     `json:"rowVersion" db:"RowVersion"`
}

type Blueprint struct {
	IdSeq      string    `json:"id" db:"IdSeq"`
	Mode       string    `json:"mode" db:"Mode"`
	Scope      string    `json:"scope" db:"Scope"`
	Config     string    `json:"config" db:"Config"`
	CreatedBy  *string   `json:"createdBy" db:"CreatedBy"`
	UpdatedBy  *string   `json:"updatedBy" db:"UpdatedBy"`
	CreatedAt  time.Time `json:"createdAt" db:"CreatedAt"`
	UpdatedAt  time.Time `json:"updatedAt" db:"UpdatedAt"`
	RowVersion int64     `json:"rowVersion" db:"RowVersion"`
}
