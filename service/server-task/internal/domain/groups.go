package domain

import "time"

type TrainingGroup struct {
	IdSeq       string    `json:"id" db:"IdSeq"`
	Code        string    `json:"code" db:"Code"`
	Name        string    `json:"name" db:"Name"`
	LeaderId    *string   `json:"leaderId" db:"LeaderId"`
	LeaderName  string    `json:"leaderName" db:"LeaderName"`
	Description string    `json:"description" db:"Description"`
	Status      string    `json:"status" db:"Status"`
	MemberCount int       `json:"memberCount,omitempty" db:"MemberCount"`
	CreatedBy   *string   `json:"createdBy" db:"CreatedBy"`
	UpdatedBy   *string   `json:"updatedBy" db:"UpdatedBy"`
	CreatedAt   time.Time `json:"createdAt" db:"CreatedAt"`
	UpdatedAt   time.Time `json:"updatedAt" db:"UpdatedAt"`
	RowVersion  int64     `json:"rowVersion" db:"RowVersion"`
}

type GroupMember struct {
	GroupId string    `json:"groupId" db:"GroupId"`
	UserId  string    `json:"userId" db:"UserId"`
	AddedAt time.Time `json:"addedAt" db:"AddedAt"`
}
