package domain

import "time"

type GradingQueueItem struct {
	IdSeq           string    `json:"id" db:"IdSeq"`
	ExamSessionId   string    `json:"examSessionId" db:"ExamSessionId"`
	ExamTitle       string    `json:"examTitle" db:"ExamTitle"`
	UserId          string    `json:"userId" db:"UserId"`
	CandidateName   string    `json:"candidateName" db:"CandidateName"`
	CandidateEmail  string    `json:"candidateEmail" db:"CandidateEmail"`
	SubmittedAt     time.Time `json:"submittedAt" db:"SubmittedAt"`
	GradingStatus   string    `json:"gradingStatus" db:"GradingStatus"`
	TotalScore      float64   `json:"totalScore" db:"TotalScore"`
	MaxScore        float64   `json:"maxScore" db:"MaxScore"`
	EssayCount      int       `json:"essayCount" db:"EssayCount"`
}

type GradingScoreSubmission struct {
	AttemptId string             `json:"attemptId"`
	Scores    map[string]float64 `json:"scores"` // questionId -> score
	Feedback  string             `json:"feedback"`
	GradedBy  string             `json:"gradedBy"`
}
