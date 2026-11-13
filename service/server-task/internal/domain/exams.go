package domain

import (
	"time"
)

type ExamSession struct {
	IdSeq           string    `json:"id" db:"IdSeq"`
	Code            string    `json:"code" db:"Code"`
	Title           string    `json:"title" db:"Title"`
	AssessmentId    string    `json:"assessmentId" db:"AssessmentId"`
	AssessmentCode  string    `json:"assessmentCode,omitempty" db:"AssessmentCode"`
	AssessmentTitle string    `json:"assessmentTitle,omitempty" db:"AssessmentTitle"`
	DurationMinutes int       `json:"durationMinutes" db:"DurationMinutes"`
	QuestionCount   int       `json:"questionCount" db:"QuestionCount"`
	TotalPoints     float64   `json:"totalPoints" db:"TotalPoints"`
	PassingScore    float64   `json:"passingScore" db:"PassingScore"`
	StartTime       time.Time `json:"startTime" db:"StartTime"`
	EndTime         time.Time `json:"endTime" db:"EndTime"`
	Location        string    `json:"location" db:"Location"`
	TargetScope     string    `json:"targetScope" db:"TargetScope"`
	MaxAttempts     int       `json:"maxAttempts" db:"MaxAttempts"`
	SecurityConfig  string    `json:"securityConfig" db:"SecurityConfig"`
	Status          string    `json:"status" db:"Status"`
	CreatedBy       *string   `json:"createdBy" db:"CreatedBy"`
	UpdatedBy       *string   `json:"updatedBy" db:"UpdatedBy"`
	CreatedAt       time.Time `json:"createdAt" db:"CreatedAt"`
	UpdatedAt       time.Time `json:"updatedAt" db:"UpdatedAt"`
	RowVersion      int64     `json:"rowVersion" db:"RowVersion"`
}

type ExamAttempt struct {
	IdSeq              string     `json:"id" db:"IdSeq"`
	ExamSessionId      string     `json:"examSessionId" db:"ExamSessionId"`
	AssessmentId       string     `json:"assessmentId" db:"AssessmentId"`
	UserId             string     `json:"userId" db:"UserId"`
	AttemptNumber      int        `json:"attemptNumber" db:"AttemptNumber"`
	SessionToken       string     `json:"sessionToken" db:"SessionToken"`
	DeviceFingerprint  string     `json:"deviceFingerprint" db:"DeviceFingerprint"`
	IpAddress          string     `json:"ipAddress" db:"IpAddress"`
	UserAgent          string     `json:"userAgent" db:"UserAgent"`
	StartedAt          time.Time  `json:"startedAt" db:"StartedAt"`
	Deadline           time.Time  `json:"deadline" db:"Deadline"`
	SubmittedAt        *time.Time `json:"submittedAt" db:"SubmittedAt"`
	Answers            string     `json:"answers" db:"Answers"`
	Violations         string     `json:"violations" db:"Violations"`
	ViolationCount     int        `json:"violationCount" db:"ViolationCount"`
	TotalScore         float64    `json:"totalScore" db:"TotalScore"`
	MaxScore           float64    `json:"maxScore" db:"MaxScore"`
	PassingScore       float64    `json:"passingScore" db:"PassingScore"`
	IsPassed           bool       `json:"isPassed" db:"IsPassed"`
	FailedCriticalRule bool       `json:"failedCriticalRule" db:"FailedCriticalRule"`
	GradingStatus      string     `json:"gradingStatus" db:"GradingStatus"`
	GradedBy           *string    `json:"gradedBy" db:"GradedBy"`
	GradedAt           *time.Time `json:"gradedAt" db:"GradedAt"`
	Feedback           string     `json:"feedback" db:"Feedback"`
	CreatedAt          time.Time  `json:"createdAt" db:"CreatedAt"`
	UpdatedAt          time.Time  `json:"updatedAt" db:"UpdatedAt"`
	RowVersion         int64      `json:"rowVersion" db:"RowVersion"`
}

type ExamRegistration struct {
	IdSeq     string    `json:"id"`
	SessionId string    `json:"sessionId"`
	UserId    string    `json:"userId"`
	Status    string    `json:"status"` // registered, confirmed, attended, cancelled
	CreatedAt time.Time `json:"createdAt"`
}
