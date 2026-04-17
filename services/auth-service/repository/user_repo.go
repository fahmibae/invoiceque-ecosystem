package repository

import (
	"database/sql"
	"time"

	"github.com/invoiceque/auth-service/models"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *models.User) error {
	query := `INSERT INTO users (id, name, email, password, company, phone, role, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
	_, err := r.db.Exec(query,
		user.ID, user.Name, user.Email, user.Password,
		user.Company, user.Phone, user.Role,
		user.CreatedAt, user.UpdatedAt,
	)
	return err
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	user := &models.User{}
	query := `SELECT id, name, email, password, company, phone, role, created_at, updated_at 
		FROM users WHERE email = $1`
	err := r.db.QueryRow(query, email).Scan(
		&user.ID, &user.Name, &user.Email, &user.Password,
		&user.Company, &user.Phone, &user.Role,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) FindByID(id string) (*models.User, error) {
	user := &models.User{}
	query := `SELECT id, name, email, password, company, phone, role, created_at, updated_at 
		FROM users WHERE id = $1`
	err := r.db.QueryRow(query, id).Scan(
		&user.ID, &user.Name, &user.Email, &user.Password,
		&user.Company, &user.Phone, &user.Role,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *UserRepository) Update(user *models.User) error {
	query := `UPDATE users SET name=$1, company=$2, phone=$3, updated_at=$4 WHERE id=$5`
	_, err := r.db.Exec(query, user.Name, user.Company, user.Phone, time.Now(), user.ID)
	return err
}
