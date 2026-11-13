package coreproxy

import (
	"api-gateway/config"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/gin-gonic/gin"
)

func Register(r *gin.Engine) {
	target, err := url.Parse(config.Cfg.HostHTTPCore)
	if err != nil {
		return
	}

	proxy := httputil.NewSingleHostReverseProxy(target)

	// Proxy all /api/auth/* to server-core HTTP endpoint
	authGroup := r.Group("/api/auth")
	{
		authGroup.Any("/*path", func(c *gin.Context) {
			c.Request.URL.Path = "/api/auth" + c.Param("path")
			c.Request.Host = target.Host
			proxy.ServeHTTP(c.Writer, c.Request)
		})
	}

	// Health check endpoint for server-core status
	r.GET("/api/core-health", func(c *gin.Context) {
		resp, err := http.Get(config.Cfg.HostHTTPCore + "/health")
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "down", "error": err.Error()})
			return
		}
		defer resp.Body.Close()
		c.JSON(resp.StatusCode, gin.H{"status": "connected", "target": config.Cfg.HostHTTPCore})
	})
}
