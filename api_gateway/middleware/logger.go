package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
)

func Logger() gin.HandlerFunc {
	return gin.LoggerWithConfig(gin.LoggerConfig{
		Formatter: func(param gin.LogFormatterParams) string {
			return "[GATEWAY] " +
				param.TimeStamp.Format(time.RFC3339) + " | " +
				param.Method + " " +
				param.Path + " | " +
				param.ClientIP + " | " +
				intToString(param.StatusCode) + " | " +
				param.Latency.String() + "\n"
		},
	})
}

func intToString(n int) string {
	s := ""
	if n == 0 {
		return "0"
	}
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}
