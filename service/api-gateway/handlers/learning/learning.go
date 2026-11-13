package learning

import (
	"api-gateway/config"
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/gin-gonic/gin"
)

func Register(r *gin.Engine) {
	target, err := url.Parse(config.Cfg.HostHTTPLearning)
	if err != nil {
		return
	}

	proxy := httputil.NewSingleHostReverseProxy(target)

	learningGroup := r.Group("/api/learning")
	{
		learningGroup.Any("/*path", func(c *gin.Context) {
			c.Request.URL.Path = "/api/learning" + c.Param("path")
			c.Request.Host = target.Host
			proxy.ServeHTTP(c.Writer, c.Request)
		})
	}

	tasksGroup := r.Group("/api/tasks")
	{
		tasksGroup.Any("/*path", func(c *gin.Context) {
			c.Request.URL.Path = "/api/tasks" + c.Param("path")
			c.Request.Host = target.Host
			proxy.ServeHTTP(c.Writer, c.Request)
		})
		tasksGroup.Any("", func(c *gin.Context) {
			c.Request.URL.Path = "/api/tasks"
			c.Request.Host = target.Host
			proxy.ServeHTTP(c.Writer, c.Request)
		})
	}

	projectsGroup := r.Group("/api/projects")
	{
		projectsGroup.Any("/*path", func(c *gin.Context) {
			c.Request.URL.Path = "/api/projects" + c.Param("path")
			c.Request.Host = target.Host
			proxy.ServeHTTP(c.Writer, c.Request)
		})
		projectsGroup.Any("", func(c *gin.Context) {
			c.Request.URL.Path = "/api/projects"
			c.Request.Host = target.Host
			proxy.ServeHTTP(c.Writer, c.Request)
		})
	}

	partnersGroup := r.Group("/api/partners")
	{
		partnersGroup.Any("/*path", func(c *gin.Context) {
			c.Request.URL.Path = "/api/partners" + c.Param("path")
			c.Request.Host = target.Host
			proxy.ServeHTTP(c.Writer, c.Request)
		})
		partnersGroup.Any("", func(c *gin.Context) {
			c.Request.URL.Path = "/api/partners"
			c.Request.Host = target.Host
			proxy.ServeHTTP(c.Writer, c.Request)
		})
	}

	// Health check endpoint for learning service status
	r.GET("/api/learning-health", func(c *gin.Context) {
		resp, err := http.Get(config.Cfg.HostHTTPLearning + "/health")
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "down", "error": err.Error()})
			return
		}
		defer resp.Body.Close()
		c.JSON(resp.StatusCode, gin.H{"status": "connected", "target": config.Cfg.HostHTTPLearning})
	})
}
