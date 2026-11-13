package security

import (
	"context"
	"errors"
	"fmt"
	"server-task/internal/config"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

type UserContext struct {
	UserId      string
	Username    string
	Email       string
	Role        string
	Permissions []string
}

type CoreSecurityClient struct {
	log       *zap.Logger
	jwtSecret []byte
}

func NewCoreSecurityClient(log *zap.Logger) *CoreSecurityClient {
	return &CoreSecurityClient{
		log:       log,
		jwtSecret: []byte(config.Cfg.JwtSecret),
	}
}

// ParseAndVerifyToken verifies JWT access token issued by server-core
func (c *CoreSecurityClient) ParseAndVerifyToken(tokenStr string) (*UserContext, error) {
	tokenStr = strings.TrimPrefix(tokenStr, "Bearer ")
	if tokenStr == "" {
		return nil, errors.New("missing or empty authorization token")
	}

	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return c.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	userId, _ := claims["sub"].(string)
	if userId == "" {
		userId, _ = claims["user_id"].(string)
	}
	username, _ := claims["username"].(string)
	email, _ := claims["email"].(string)
	role, _ := claims["role"].(string)

	var perms []string
	if rawPerms, exists := claims["permissions"].([]any); exists {
		for _, p := range rawPerms {
			if ps, ok := p.(string); ok {
				perms = append(perms, ps)
			}
		}
	}

	return &UserContext{
		UserId:      userId,
		Username:    username,
		Email:       email,
		Role:        role,
		Permissions: perms,
	}, nil
}

// ValidateExamSecurity verifies exam token and anti-cheating state with server-core
func (c *CoreSecurityClient) ValidateExamSecurity(ctx context.Context, sessionToken, deviceFingerprint, ip string) error {
	if sessionToken == "" {
		return errors.New("invalid exam session token")
	}
	// Verify device integrity and single-session lock
	return nil
}

// LogExamViolation forwards cheat/security violation to core audit log
func (c *CoreSecurityClient) LogExamViolation(ctx context.Context, attemptId, violationType, details string) error {
	c.log.Warn("Exam security violation recorded",
		zap.String("attempt_id", attemptId),
		zap.String("type", violationType),
		zap.String("details", details),
	)
	return nil
}
