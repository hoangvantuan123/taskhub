package domain

import "time"

type KnowledgeDoc struct {
	IdSeq       string    `json:"id" db:"IdSeq"`
	Title       string    `json:"title" db:"Title"`
	Category    string    `json:"category" db:"Category"`
	Summary     string    `json:"summary" db:"Summary"`
	Content     string    `json:"content" db:"Content"`
	Attachment  string    `json:"attachment" db:"Attachment"`
	Tags        []string  `json:"tags"`
	Status      string    `json:"status" db:"Status"` // draft, published
	CreatedBy   *string   `json:"createdBy" db:"CreatedBy"`
	UpdatedBy   *string   `json:"updatedBy" db:"UpdatedBy"`
	CreatedAt   time.Time `json:"createdAt" db:"CreatedAt"`
	UpdatedAt   time.Time `json:"updatedAt" db:"UpdatedAt"`
	RowVersion  int64     `json:"rowVersion" db:"RowVersion"`
}
