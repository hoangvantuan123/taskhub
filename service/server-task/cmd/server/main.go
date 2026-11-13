package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"server-task/internal/app"
	"server-task/internal/config"
	"server-task/internal/database"
	"server-task/internal/handler"
	"server-task/internal/logger"
	"server-task/internal/worker"
	"syscall"
	"time"

	"go.uber.org/zap"
)

func main() {
	// 1. Load Configurations
	config.Load()

	// 2. Init Zap Logger
	log, err := logger.Init()
	if err != nil {
		fmt.Printf("Failed to init logger: %v\n", err)
		os.Exit(1)
	}
	defer log.Sync()

	log.Info("Starting Task Microservice",
		zap.String("service", config.Cfg.ServiceName),
		zap.Int("port_http", config.Cfg.PortHttp),
		zap.Int("port_grpc", config.Cfg.PortGrpc),
	)

	// 3. Connect to Database
	if err := database.Connect(log); err != nil {
		log.Warn("Failed to connect SQLX database (will retry on query)", zap.Error(err))
	}
	if err := database.ConnectPgx(log); err != nil {
		log.Warn("Failed to connect PGX pool (will retry on query)", zap.Error(err))
	}

	// 4. Background Worker Pool
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	wp := worker.NewPool(50, 10000, log)
	wp.Start(ctx)
	defer wp.Stop()

	// 5. Initialize Application Container
	container, err := app.NewAppContainer(log, wp)
	if err != nil {
		log.Fatal("Failed to initialize app container", zap.Error(err))
	}

	// 6. Start HTTP Server
	router := handler.NewRouterHandler(container)
	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%d", config.Cfg.PortHttp),
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Info("HTTP Learning Service listening", zap.String("addr", httpServer.Addr))
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("HTTP server error", zap.Error(err))
		}
	}()

	// 7. Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server-task gracefully...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Error("Server forced to shutdown", zap.Error(err))
	}

	log.Info("server-task exited cleanly.")
}
