package repository

import (
	"database/sql"
	"time"

	"github.com/invoiceque/client-service/models"
)

type ClientRepository struct {
	db *sql.DB
}

func NewClientRepository(db *sql.DB) *ClientRepository {
	return &ClientRepository{db: db}
}

func (r *ClientRepository) Create(client *models.Client) error {
	query := `INSERT INTO clients (id, user_id, name, email, phone, company, address, city, total_invoices, total_spent, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`
	_, err := r.db.Exec(query,
		client.ID, client.UserID, client.Name, client.Email,
		client.Phone, client.Company, client.Address, client.City,
		client.TotalInvoices, client.TotalSpent,
		client.CreatedAt, client.UpdatedAt,
	)
	return err
}

func (r *ClientRepository) FindAll(userID string, search string, page, perPage int) ([]models.Client, int, error) {
	offset := (page - 1) * perPage
	var clients []models.Client
	var total int

	// Count query
	countQuery := `SELECT COUNT(*) FROM clients WHERE user_id = $1`
	args := []interface{}{userID}

	if search != "" {
		countQuery += ` AND (name ILIKE $2 OR email ILIKE $2 OR company ILIKE $2)`
		args = append(args, "%"+search+"%")
	}

	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Data query
	dataQuery := `SELECT id, user_id, name, email, phone, company, address, city, total_invoices, total_spent, created_at, updated_at 
		FROM clients WHERE user_id = $1`

	if search != "" {
		dataQuery += ` AND (name ILIKE $2 OR email ILIKE $2 OR company ILIKE $2)`
		dataQuery += ` ORDER BY created_at DESC LIMIT $3 OFFSET $4`
		args = append(args, perPage, offset)
	} else {
		dataQuery += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`
		args = append(args, perPage, offset)
	}

	rows, err := r.db.Query(dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	for rows.Next() {
		var c models.Client
		err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.Email, &c.Phone,
			&c.Company, &c.Address, &c.City,
			&c.TotalInvoices, &c.TotalSpent,
			&c.CreatedAt, &c.UpdatedAt)
		if err != nil {
			return nil, 0, err
		}
		clients = append(clients, c)
	}

	return clients, total, nil
}

func (r *ClientRepository) FindByID(id, userID string) (*models.Client, error) {
	c := &models.Client{}
	query := `SELECT id, user_id, name, email, phone, company, address, city, total_invoices, total_spent, created_at, updated_at 
		FROM clients WHERE id = $1 AND user_id = $2`
	err := r.db.QueryRow(query, id, userID).Scan(
		&c.ID, &c.UserID, &c.Name, &c.Email, &c.Phone,
		&c.Company, &c.Address, &c.City,
		&c.TotalInvoices, &c.TotalSpent,
		&c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *ClientRepository) Update(client *models.Client) error {
	query := `UPDATE clients SET name=$1, email=$2, phone=$3, company=$4, address=$5, city=$6, updated_at=$7 
		WHERE id=$8 AND user_id=$9`
	_, err := r.db.Exec(query,
		client.Name, client.Email, client.Phone,
		client.Company, client.Address, client.City,
		time.Now(), client.ID, client.UserID)
	return err
}

func (r *ClientRepository) Delete(id, userID string) error {
	query := `DELETE FROM clients WHERE id = $1 AND user_id = $2`
	_, err := r.db.Exec(query, id, userID)
	return err
}
