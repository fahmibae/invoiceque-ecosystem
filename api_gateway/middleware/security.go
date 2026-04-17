package middleware

import "github.com/gin-gonic/gin"

// SecurityHeaders adds security-related HTTP headers to all responses
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")

		// XSS protection
		c.Header("X-XSS-Protection", "1; mode=block")

		// Referrer policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions policy
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

		// Content Security Policy (basic)
		c.Header("Content-Security-Policy", "default-src 'self'")

		c.Next()
	}
}

// StripInternalHeaders removes headers that should only be set by the gateway
// This prevents external clients from spoofing internal headers like X-User-ID
func StripInternalHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Remove any externally-set internal headers — only the gateway should set these
		c.Request.Header.Del("X-User-ID")
		c.Request.Header.Del("X-User-Email")
		c.Request.Header.Del("X-User-Role")

		c.Next()
	}
}
