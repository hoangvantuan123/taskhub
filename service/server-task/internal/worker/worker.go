package worker

import (
	"context"
	"sync"

	"go.uber.org/zap"
)

type Job func(ctx context.Context) error

type Pool struct {
	maxWorkers int
	jobQueue   chan Job
	wg         sync.WaitGroup
	log        *zap.Logger
}

func NewPool(maxWorkers, queueSize int, log *zap.Logger) *Pool {
	return &Pool{
		maxWorkers: maxWorkers,
		jobQueue:   make(chan Job, queueSize),
		log:        log,
	}
}

func (p *Pool) Start(ctx context.Context) {
	for i := 0; i < p.maxWorkers; i++ {
		p.wg.Add(1)
		go func(workerID int) {
			defer p.wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case job, ok := <-p.jobQueue:
					if !ok {
						return
					}
					if err := job(ctx); err != nil {
						p.log.Error("Worker job execution failed", zap.Int("worker_id", workerID), zap.Error(err))
					}
				}
			}
		}(i)
	}
	p.log.Info("Worker pool started", zap.Int("workers", p.maxWorkers))
}

func (p *Pool) Submit(job Job) bool {
	select {
	case p.jobQueue <- job:
		return true
	default:
		p.log.Warn("Worker pool queue is full, dropping job")
		return false
	}
}

func (p *Pool) Stop() {
	close(p.jobQueue)
	p.wg.Wait()
	p.log.Info("Worker pool stopped")
}
