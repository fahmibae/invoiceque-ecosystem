package services

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

type UserInfo struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type cachedUser struct {
	info      *UserInfo
	expiresAt time.Time
}

type UserLookupService struct {
	authServiceURL string
	client         *http.Client
	cache          map[string]cachedUser
	mu             sync.RWMutex
	cacheTTL       time.Duration
}

func NewUserLookupService(authServiceURL string) *UserLookupService {
	return &UserLookupService{
		authServiceURL: authServiceURL,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
		cache:    make(map[string]cachedUser),
		cacheTTL: 5 * time.Minute,
	}
}

func (s *UserLookupService) GetUserByID(userID string) (*UserInfo, error) {
	if userID == "" || s.authServiceURL == "" {
		return nil, fmt.Errorf("user_id or auth_service_url is empty")
	}

	// Check cache first (read lock)
	s.mu.RLock()
	if cached, ok := s.cache[userID]; ok && time.Now().Before(cached.expiresAt) {
		s.mu.RUnlock()
		return cached.info, nil
	}
	s.mu.RUnlock()

	// Cache miss — fetch from auth-service
	url := fmt.Sprintf("%s/internal/users/%s", s.authServiceURL, userID)
	resp, err := s.client.Get(url)
	if err != nil {
		log.Printf("[USER_LOOKUP] Failed to call auth-service: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("auth-service returned status %d", resp.StatusCode)
	}

	var user UserInfo
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("failed to decode user response: %w", err)
	}

	// Store in cache (write lock)
	s.mu.Lock()
	s.cache[userID] = cachedUser{
		info:      &user,
		expiresAt: time.Now().Add(s.cacheTTL),
	}
	s.mu.Unlock()

	log.Printf("[USER_LOOKUP] Found user: %s (%s)", user.Name, user.Email)
	return &user, nil
}
