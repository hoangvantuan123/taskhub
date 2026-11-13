package assessment

import (
	"api-gateway/config"
	"api-gateway/internal/grpcclient"
	"api-gateway/internal/proof"
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"
)

const executeMethod = "/skillhub.Auth/Execute"

// endpoint adapts REST path/query parameters to the generic Auth.Execute
// action envelope used by the server-core assessment service.
func endpoint(pool *grpcclient.Pool, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		payload := map[string]interface{}{}
		if c.Request.Method != "GET" && c.Request.Body != nil {
			var incoming interface{}
			if err := json.NewDecoder(c.Request.Body).Decode(&incoming); err == nil {
				if object, ok := incoming.(map[string]interface{}); ok {
					payload = object
				}
			}
		}
		token := strings.TrimSpace(strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer "))
		input, err := structpb.NewStruct(map[string]interface{}{
			"action": action, "token": token, "payload": payload,
			"ip": c.ClientIP(), "user_agent": c.Request.UserAgent(),
		})
		if err != nil {
			c.AbortWithStatusJSON(400, gin.H{"success": false, "message": "Invalid assessment request"})
			return
		}

		ctx := c.Request.Context()
		if raw := c.GetHeader("DPoP"); raw != "" {
			scheme := "http"
			if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
				scheme = "https"
			}
			uri := scheme + "://" + c.Request.Host + c.Request.URL.EscapedPath()
			if _, err := proof.Verify(raw, c.Request.Method, uri, token, ""); err != nil {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Invalid session proof. Please log in again."})
				return
			}
			ctx = metadata.NewOutgoingContext(ctx, metadata.Pairs("dpop", raw, "dpop-htm", c.Request.Method, "dpop-htu", uri))
		}
		conn, err := pool.Get(config.Cfg.HostGRPCDatahub)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"success": false, "message": "Assessment service unavailable"})
			return
		}
		ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
		defer cancel()
		out := new(structpb.Struct)
		if err = conn.Invoke(ctx, executeMethod, input, out); err != nil {
			code := http.StatusInternalServerError
			switch status.Code(err) {
			case codes.Unauthenticated:
				code = http.StatusUnauthorized
			case codes.PermissionDenied:
				code = http.StatusForbidden
			case codes.NotFound:
				code = http.StatusNotFound
			case codes.InvalidArgument:
				code = http.StatusBadRequest
			case codes.AlreadyExists, codes.Aborted, codes.FailedPrecondition:
				code = http.StatusConflict
			case codes.ResourceExhausted:
				code = http.StatusTooManyRequests
			}
			c.JSON(code, gin.H{"success": false, "message": status.Convert(err).Message()})
			return
		}
		c.JSON(http.StatusOK, out.AsMap())
	}
}

func Register(v2 *gin.RouterGroup, pool *grpcclient.Pool) {
	g := v2.Group("/assessment")
	g.POST("/list", endpoint(pool, "assessment_list"))
	g.POST("/get", endpoint(pool, "assessment_get"))
	g.POST("/save", endpoint(pool, "assessment_save"))
	g.POST("/publish", endpoint(pool, "assessment_publish"))
	g.POST("/blueprints/list", endpoint(pool, "blueprint_list"))
	g.POST("/blueprints/save", endpoint(pool, "blueprint_save"))

	// Sessions
	g.POST("/sessions/list", endpoint(pool, "exam_session_list"))
	g.POST("/sessions/save", endpoint(pool, "exam_session_save"))
	g.POST("/sessions/delete", endpoint(pool, "exam_session_delete"))

	// Attempts
	g.POST("/attempt/start", endpoint(pool, "exam_attempt_start"))
	g.POST("/attempt/heartbeat", endpoint(pool, "exam_attempt_heartbeat_save"))
	g.POST("/attempt/submit", endpoint(pool, "exam_attempt_submit"))

	// Groups
	g.POST("/groups/list", endpoint(pool, "training_group_list"))
	g.POST("/groups/save", endpoint(pool, "training_group_save"))
	g.POST("/groups/delete", endpoint(pool, "training_group_delete"))
	g.POST("/groups/member/add", endpoint(pool, "training_group_member_add"))
	g.POST("/groups/member/remove", endpoint(pool, "training_group_member_remove"))

	// Grading
	g.POST("/grading/queue", endpoint(pool, "grading_queue_list"))
	g.POST("/grading/detail", endpoint(pool, "grading_detail_get"))
	g.POST("/grading/save", endpoint(pool, "grading_score_save"))

	// Reports
	g.POST("/reports/summary", endpoint(pool, "report_summary_get"))
}

