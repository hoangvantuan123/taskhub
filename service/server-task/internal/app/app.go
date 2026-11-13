package app

import (
	"server-task/internal/database"
	"server-task/internal/security"
	"server-task/internal/service/assessments"
	"server-task/internal/service/exams"
	"server-task/internal/service/grading"
	"server-task/internal/service/groups"
	"server-task/internal/service/knowledge"
	"server-task/internal/service/learning"
	"server-task/internal/service/practice"
	"server-task/internal/service/questions"
	"server-task/internal/service/reports"
	"server-task/internal/service/tasks"
	"server-task/internal/worker"

	"go.uber.org/zap"
)

type AppContainer struct {
	Log           *zap.Logger
	WorkerPool    *worker.Pool
	SecClient     *security.CoreSecurityClient
	ExamSvc       *exams.ExamService
	LearningSvc   *learning.LearningService
	AssessmentSvc *assessments.AssessmentService
	QuestionSvc   *questions.QuestionService
	GradingSvc    *grading.GradingService
	GroupSvc      *groups.GroupService
	PracticeSvc   *practice.PracticeService
	KnowledgeSvc  *knowledge.KnowledgeService
	ReportSvc     *reports.ReportService
	TaskSvc       *tasks.TaskService
}

func NewAppContainer(log *zap.Logger, wp *worker.Pool) (*AppContainer, error) {
	secClient := security.NewCoreSecurityClient(log)

	taskSvc := tasks.NewTaskService(database.SqlxDB, database.PgxPool, log, wp, secClient)
	examSvc := exams.NewExamService(database.SqlxDB, database.PgxPool, log, wp, secClient)
	learningSvc := learning.NewLearningService(database.SqlxDB, database.PgxPool, log, wp, secClient)
	assessmentSvc := assessments.NewAssessmentService(database.SqlxDB, database.PgxPool, log, wp, secClient)
	questionSvc := questions.NewQuestionService(database.SqlxDB, database.PgxPool, log, wp, secClient)
	gradingSvc := grading.NewGradingService(database.SqlxDB, database.PgxPool, log, wp, secClient)
	groupSvc := groups.NewGroupService(database.SqlxDB, database.PgxPool, log, wp, secClient)
	practiceSvc := practice.NewPracticeService(database.SqlxDB, database.PgxPool, log, wp, secClient)
	knowledgeSvc := knowledge.NewKnowledgeService(database.SqlxDB, database.PgxPool, log, wp, secClient)
	reportSvc := reports.NewReportService(database.SqlxDB, database.PgxPool, log, wp, secClient)

	return &AppContainer{
		Log:           log,
		WorkerPool:    wp,
		SecClient:     secClient,
		ExamSvc:       examSvc,
		LearningSvc:   learningSvc,
		AssessmentSvc: assessmentSvc,
		QuestionSvc:   questionSvc,
		GradingSvc:    gradingSvc,
		GroupSvc:      groupSvc,
		PracticeSvc:   practiceSvc,
		KnowledgeSvc:  knowledgeSvc,
		ReportSvc:     reportSvc,
		TaskSvc:       taskSvc,
	}, nil
}
