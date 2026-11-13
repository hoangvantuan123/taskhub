package domain

import "time"

type Question struct {
	IdSeq            string    `json:"id" db:"IdSeq"`
	LevelId          string    `json:"levelId" db:"LevelId"`
	FormatId         string    `json:"formatId" db:"FormatId"`
	SpecialtyId      string    `json:"specialtyId" db:"SpecialtyId"`
	TopicId          string    `json:"topicId" db:"TopicId"`
	TargetGroupId    string    `json:"targetGroupId" db:"TargetGroupId"`
	CognitiveLevelId string    `json:"cognitiveLevelId" db:"CognitiveLevelId"`
	FolderId         *string   `json:"folderId" db:"FolderId"`
	Content          string    `json:"content" db:"Content"`
	Explanation      string    `json:"explanation" db:"Explanation"`
	Type             string    `json:"type" db:"Type"`
	Options          string    `json:"options" db:"Options"`
	Rubrics          string    `json:"rubrics" db:"Rubrics"`
	SimulationType   string    `json:"simulationType" db:"SimulationType"`
	SimulationId     *string   `json:"simulationId" db:"SimulationId"`
	IsCritical       bool      `json:"isCritical" db:"IsCritical"`
	CriticalReason   string    `json:"criticalReason" db:"CriticalReason"`
	ImageUrl         string    `json:"imageUrl" db:"ImageUrl"`
	Status           string    `json:"status" db:"Status"`
	AuthorId         *string   `json:"authorId" db:"AuthorId"`
	CreatedBy        string    `json:"createdBy" db:"CreatedBy"`
	UpdatedBy        string    `json:"updatedBy" db:"UpdatedBy"`
	CreatedAt        time.Time `json:"createdAt" db:"CreatedAt"`
	UpdatedAt        time.Time `json:"updatedAt" db:"UpdatedAt"`
	RowVersion       int64     `json:"rowVersion" db:"RowVersion"`
	Version          int       `json:"version" db:"Version"`
}

type QuestionFolder struct {
	IdSeq       string    `json:"id" db:"IdSeq"`
	Name        string    `json:"name" db:"Name"`
	Description string    `json:"description" db:"Description"`
	LevelId     *string   `json:"levelId" db:"LevelId"`
	CreatedBy   string    `json:"createdBy" db:"CreatedBy"`
	UpdatedBy   string    `json:"updatedBy" db:"UpdatedBy"`
	CreatedAt   time.Time `json:"createdAt" db:"CreatedAt"`
	UpdatedAt   time.Time `json:"updatedAt" db:"UpdatedAt"`
	RowVersion  int64     `json:"rowVersion" db:"RowVersion"`
}

type QuestionSimulation struct {
	IdSeq       string    `json:"id" db:"IdSeq"`
	Name        string    `json:"name" db:"Name"`
	Description string    `json:"description" db:"Description"`
	TemplateKey string    `json:"templateKey" db:"TemplateKey"`
	Config      string    `json:"config" db:"Config"`
	CreatedBy   string    `json:"createdBy" db:"CreatedBy"`
	UpdatedBy   string    `json:"updatedBy" db:"UpdatedBy"`
	CreatedAt   time.Time `json:"createdAt" db:"CreatedAt"`
	UpdatedAt   time.Time `json:"updatedAt" db:"UpdatedAt"`
	RowVersion  int64     `json:"rowVersion" db:"RowVersion"`
}
