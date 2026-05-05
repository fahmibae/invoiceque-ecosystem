package repository

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/lib/pq"
)

type Notification struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Type      string    `json:"type"`
	Recipient string    `json:"recipient"`
	Subject   string    `json:"subject"`
	Message   string    `json:"message"`
	Status    string    `json:"status"`
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

type NotificationRepo struct {
	db *sql.DB
}

func NewNotificationRepo(databaseURL string) (*NotificationRepo, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		return nil, err
	}

	log.Println("[NOTIFICATION] Connected to PostgreSQL database")

	// Ensure table exists (basic migration)
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS notifications (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID,
			type VARCHAR(50),
			recipient VARCHAR(255),
			subject VARCHAR(255),
			message TEXT,
			status VARCHAR(50),
			is_read BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
	`)
	if err != nil {
		log.Printf("[NOTIFICATION] Warning: Failed to ensure notifications table exists: %v", err)
	}

	// Add is_read column if it doesn't exist (for existing tables)
	_, _ = db.Exec(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;`)

	return &NotificationRepo{db: db}, nil
}

func (r *NotificationRepo) Insert(n Notification) error {
	_, err := r.db.Exec(
		`INSERT INTO notifications (user_id, type, recipient, subject, message, status, is_read)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		n.UserID, n.Type, n.Recipient, n.Subject, n.Message, n.Status, n.IsRead,
	)
	if err != nil {
		log.Printf("[NOTIFICATION] Failed to insert notification: %v", err)
	}
	return err
}

func (r *NotificationRepo) ListByUserID(userID string) ([]Notification, error) {
	rows, err := r.db.Query(
		`SELECT id, user_id, type, recipient, subject, message, status, is_read, created_at
		 FROM notifications
		 WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT 100`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Recipient, &n.Subject, &n.Message, &n.Status, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, n)
	}
	return result, nil
}

func (r *NotificationRepo) ListAll() ([]Notification, error) {
	rows, err := r.db.Query(
		`SELECT id, user_id, type, recipient, subject, message, status, is_read, created_at
		 FROM notifications
		 ORDER BY created_at DESC
		 LIMIT 100`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Recipient, &n.Subject, &n.Message, &n.Status, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, n)
	}
	return result, nil
}

func (r *NotificationRepo) CountByUserID(userID string) (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM notifications WHERE user_id = $1`, userID).Scan(&count)
	return count, err
}

func (r *NotificationRepo) CountAll() (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM notifications`).Scan(&count)
	return count, err
}

func (r *NotificationRepo) ListByUserIDPaginated(userID string, limit, offset int) ([]Notification, error) {
	rows, err := r.db.Query(
		`SELECT id, user_id, type, recipient, subject, message, status, is_read, created_at
		 FROM notifications
		 WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Recipient, &n.Subject, &n.Message, &n.Status, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, n)
	}
	return result, nil
}

func (r *NotificationRepo) ListAllPaginated(limit, offset int) ([]Notification, error) {
	rows, err := r.db.Query(
		`SELECT id, user_id, type, recipient, subject, message, status, is_read, created_at
		 FROM notifications
		 ORDER BY created_at DESC
		 LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Recipient, &n.Subject, &n.Message, &n.Status, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, n)
	}
	return result, nil
}

func (r *NotificationRepo) UnreadCountByUserID(userID string) (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`, userID).Scan(&count)
	return count, err
}

func (r *NotificationRepo) MarkAsRead(id string) error {
	_, err := r.db.Exec(
		`UPDATE notifications SET is_read = TRUE WHERE id = $1`,
		id,
	)
	if err != nil {
		log.Printf("[NOTIFICATION] Failed to mark notification %s as read: %v", id, err)
	}
	return err
}

func (r *NotificationRepo) Close() {
	r.db.Close()
}
