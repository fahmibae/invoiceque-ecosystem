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

func (r *UserRepository) UpdatePassword(id string, newPassword string) error {
	query := `UPDATE users SET password=$1, updated_at=$2 WHERE id=$3`
	_, err := r.db.Exec(query, newPassword, time.Now(), id)
	return err
}

func (r *UserRepository) List(search string, offset, limit int) ([]models.User, error) {
	query := `SELECT id, name, email, company, phone, role, created_at, updated_at 
		FROM users 
		WHERE ($1::text = '' OR email ILIKE $2 OR name ILIKE $2)
		ORDER BY created_at DESC 
		LIMIT $3 OFFSET $4`

	rows, err := r.db.Query(query, search, "%"+search+"%", limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]models.User, 0)
	for rows.Next() {
		var u models.User
		var company, phone sql.NullString
		err := rows.Scan(&u.ID, &u.Name, &u.Email, &company, &phone, &u.Role, &u.CreatedAt, &u.UpdatedAt)
		if err != nil {
			return nil, err
		}
		if company.Valid {
			u.Company = company.String
		}
		if phone.Valid {
			u.Phone = phone.String
		}
		users = append(users, u)
	}
	return users, nil
}

func (r *UserRepository) Count(search string) (int, error) {
	query := `SELECT COUNT(*) FROM users WHERE ($1::text = '' OR email ILIKE $2 OR name ILIKE $2)`
	var count int
	err := r.db.QueryRow(query, search, "%"+search+"%").Scan(&count)
	return count, err
}

func (r *UserRepository) UpdateRole(id string, role string) error {
	query := `UPDATE users SET role=$1, updated_at=$2 WHERE id=$3`
	_, err := r.db.Exec(query, role, time.Now(), id)
	return err
}

func (r *UserRepository) Delete(id string) error {
	query := `DELETE FROM users WHERE id=$1`
	_, err := r.db.Exec(query, id)
	return err
}
