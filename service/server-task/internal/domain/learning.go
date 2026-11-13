package domain

import "time"

type Course struct {
	IdSeq         string    `json:"id" db:"IdSeq"`
	Code          string    `json:"code" db:"Code"`
	Title         string    `json:"title" db:"Title"`
	Category      string    `json:"category" db:"Category"`
	DurationHours int       `json:"durationHours" db:"DurationHours"`
	Description   string    `json:"description" db:"Description"`
	Status        string    `json:"status" db:"Status"`
	LessonCount   int       `json:"lessonCount,omitempty" db:"LessonCount"`
	EnrolledCount int       `json:"enrolledCount,omitempty" db:"EnrolledCount"`
	CreatedBy     *string   `json:"createdBy" db:"CreatedBy"`
	UpdatedBy     *string   `json:"updatedBy" db:"UpdatedBy"`
	CreatedAt     time.Time `json:"createdAt" db:"CreatedAt"`
	UpdatedAt     time.Time `json:"updatedAt" db:"UpdatedAt"`
	RowVersion    int64     `json:"rowVersion" db:"RowVersion"`
}

type Lesson struct {
	IdSeq       string    `json:"id" db:"IdSeq"`
	CourseId    string    `json:"courseId" db:"CourseId"`
	Title       string    `json:"title" db:"Title"`
	OrderIndex  int       `json:"orderIndex" db:"OrderIndex"`
	Content     string    `json:"content" db:"Content"`
	VideoUrl    string    `json:"videoUrl" db:"VideoUrl"`
	CreatedBy   *string   `json:"createdBy" db:"CreatedBy"`
	UpdatedBy   *string   `json:"updatedBy" db:"UpdatedBy"`
	CreatedAt   time.Time `json:"createdAt" db:"CreatedAt"`
	UpdatedAt   time.Time `json:"updatedAt" db:"UpdatedAt"`
	RowVersion  int64     `json:"rowVersion" db:"RowVersion"`
}

type UserCourseProgress struct {
	CourseId        string     `json:"courseId"`
	UserId          string     `json:"userId"`
	CompletedLesson int        `json:"completedLesson"`
	TotalLesson     int        `json:"totalLesson"`
	Percent         float64    `json:"percent"`
	LastAccessAt    time.Time  `json:"lastAccessAt"`
	CompletedAt     *time.Time `json:"completedAt,omitempty"`
}
