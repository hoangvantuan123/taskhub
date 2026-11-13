package domain

import "time"

type PracticeSession struct {
	IdSeq       string    `json:"id" db:"IdSeq"`
	UserId      string    `json:"userId" db:"UserId"`
	TopicId     string    `json:"topicId" db:"TopicId"`
	TopicName   string    `json:"topicName,omitempty" db:"TopicName"`
	TotalQuestions int    `json:"totalQuestions" db:"TotalQuestions"`
	CorrectCount   int    `json:"correctCount" db:"CorrectCount"`
	StartedAt   time.Time `json:"startedAt" db:"StartedAt"`
	CompletedAt *time.Time`json:"completedAt" db:"CompletedAt"`
	Status      string    `json:"status" db:"Status"` // in_progress, completed
}
