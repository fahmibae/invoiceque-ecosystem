package repository

import (
	"database/sql"
	"fmt"
	"log"
	"math"

	"github.com/invoiceque/invoice-service/models"
)

type InvoiceRepository struct {
	db *sql.DB
}

func NewInvoiceRepository(db *sql.DB) *InvoiceRepository {
	return &InvoiceRepository{db: db}
}

// FindByUserID returns paginated invoices for a user, optionally filtered by status
func (r *InvoiceRepository) FindByUserID(userID, status string, page, size int) ([]models.Invoice, int64, error) {
	var total int64
	var rows *sql.Rows
	var err error

	offset := page * size

	if status != "" {
		err = r.db.QueryRow("SELECT COUNT(*) FROM invoices WHERE user_id = $1 AND status = $2", userID, status).Scan(&total)
		if err != nil {
			return nil, 0, err
		}
		rows, err = r.db.Query(`
			SELECT id, invoice_number, user_id, client_id, client_name, client_email,
			       subtotal, tax, discount, total, status, payment_type, dp_percentage,
			       dp_amount, amount_paid, amount_remaining, due_date, created_at, paid_at,
			       notes, payment_link, remaining_payment_link
			FROM invoices WHERE user_id = $1 AND status = $2
			ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
			userID, status, size, offset)
	} else {
		err = r.db.QueryRow("SELECT COUNT(*) FROM invoices WHERE user_id = $1", userID).Scan(&total)
		if err != nil {
			return nil, 0, err
		}
		rows, err = r.db.Query(`
			SELECT id, invoice_number, user_id, client_id, client_name, client_email,
			       subtotal, tax, discount, total, status, payment_type, dp_percentage,
			       dp_amount, amount_paid, amount_remaining, due_date, created_at, paid_at,
			       notes, payment_link, remaining_payment_link
			FROM invoices WHERE user_id = $1
			ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
			userID, size, offset)
	}
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var invoices []models.Invoice
	for rows.Next() {
		inv, err := scanInvoice(rows)
		if err != nil {
			return nil, 0, err
		}
		invoices = append(invoices, *inv)
	}

	// Load items for each invoice
	for i := range invoices {
		items, err := r.FindItemsByInvoiceID(invoices[i].ID)
		if err != nil {
			log.Printf("[INVOICE] Warning: failed to load items for invoice %s: %v", invoices[i].ID, err)
		}
		invoices[i].Items = items
	}

	return invoices, total, nil
}

// FindByIDAndUserID returns a single invoice by ID and user
func (r *InvoiceRepository) FindByIDAndUserID(id, userID string) (*models.Invoice, error) {
	row := r.db.QueryRow(`
		SELECT id, invoice_number, user_id, client_id, client_name, client_email,
		       subtotal, tax, discount, total, status, payment_type, dp_percentage,
		       dp_amount, amount_paid, amount_remaining, due_date, created_at, paid_at,
		       notes, payment_link, remaining_payment_link
		FROM invoices WHERE id = $1 AND user_id = $2`, id, userID)

	inv, err := scanInvoiceRow(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("invoice not found")
		}
		return nil, err
	}

	items, err := r.FindItemsByInvoiceID(inv.ID)
	if err != nil {
		return nil, err
	}
	inv.Items = items

	return inv, nil
}

// FindByID returns a single invoice by ID (no user filter)
func (r *InvoiceRepository) FindByID(id string) (*models.Invoice, error) {
	row := r.db.QueryRow(`
		SELECT id, invoice_number, user_id, client_id, client_name, client_email,
		       subtotal, tax, discount, total, status, payment_type, dp_percentage,
		       dp_amount, amount_paid, amount_remaining, due_date, created_at, paid_at,
		       notes, payment_link, remaining_payment_link
		FROM invoices WHERE id = $1`, id)

	inv, err := scanInvoiceRow(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("invoice not found: %s", id)
		}
		return nil, err
	}

	items, err := r.FindItemsByInvoiceID(inv.ID)
	if err != nil {
		return nil, err
	}
	inv.Items = items

	return inv, nil
}

// Save inserts or updates an invoice
func (r *InvoiceRepository) Save(inv *models.Invoice) error {
	_, err := r.db.Exec(`
		INSERT INTO invoices (id, invoice_number, user_id, client_id, client_name, client_email,
		    subtotal, tax, discount, total, status, payment_type, dp_percentage,
		    dp_amount, amount_paid, amount_remaining, due_date, created_at, paid_at,
		    notes, payment_link, remaining_payment_link)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
		ON CONFLICT (id) DO UPDATE SET
		    invoice_number = EXCLUDED.invoice_number,
		    client_id = EXCLUDED.client_id,
		    client_name = EXCLUDED.client_name,
		    client_email = EXCLUDED.client_email,
		    subtotal = EXCLUDED.subtotal,
		    tax = EXCLUDED.tax,
		    discount = EXCLUDED.discount,
		    total = EXCLUDED.total,
		    status = EXCLUDED.status,
		    payment_type = EXCLUDED.payment_type,
		    dp_percentage = EXCLUDED.dp_percentage,
		    dp_amount = EXCLUDED.dp_amount,
		    amount_paid = EXCLUDED.amount_paid,
		    amount_remaining = EXCLUDED.amount_remaining,
		    due_date = EXCLUDED.due_date,
		    paid_at = EXCLUDED.paid_at,
		    notes = EXCLUDED.notes,
		    payment_link = EXCLUDED.payment_link,
		    remaining_payment_link = EXCLUDED.remaining_payment_link`,
		inv.ID, inv.Number, inv.UserID, inv.ClientID, inv.ClientName, inv.ClientEmail,
		inv.Subtotal, inv.Tax, inv.Discount, inv.Total, inv.Status, inv.PaymentType,
		inv.DpPercentage, inv.DpAmount, inv.AmountPaid, inv.AmountRemaining,
		inv.DueDate, inv.CreatedAt, inv.PaidAt, inv.Notes, inv.PaymentLink, inv.RemainingPaymentLink)
	return err
}

// SaveItems deletes existing items and inserts new ones (matching JPA orphanRemoval behavior)
func (r *InvoiceRepository) SaveItems(invoiceID string, items []models.InvoiceItem) error {
	// Delete existing items
	_, err := r.db.Exec("DELETE FROM invoice_items WHERE invoice_id = $1", invoiceID)
	if err != nil {
		return err
	}

	// Insert new items
	for _, item := range items {
		_, err := r.db.Exec(`
			INSERT INTO invoice_items (id, invoice_id, description, quantity, price, total)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			item.ID, invoiceID, item.Description, item.Quantity, item.Price, item.Total)
		if err != nil {
			return err
		}
	}
	return nil
}

// Delete deletes an invoice and its items (CASCADE)
func (r *InvoiceRepository) Delete(id string) error {
	_, err := r.db.Exec("DELETE FROM invoices WHERE id = $1", id)
	return err
}

// FindItemsByInvoiceID returns items for an invoice
func (r *InvoiceRepository) FindItemsByInvoiceID(invoiceID string) ([]models.InvoiceItem, error) {
	rows, err := r.db.Query(`
		SELECT id, invoice_id, description, quantity, price, total
		FROM invoice_items WHERE invoice_id = $1`, invoiceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.InvoiceItem
	for rows.Next() {
		var item models.InvoiceItem
		if err := rows.Scan(&item.ID, &item.InvoiceID, &item.Description, &item.Quantity, &item.Price, &item.Total); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if items == nil {
		items = []models.InvoiceItem{}
	}
	return items, nil
}

// CountByUserID returns the count of invoices for a user
func (r *InvoiceRepository) CountByUserID(userID string) (int64, error) {
	var count int64
	err := r.db.QueryRow("SELECT COUNT(*) FROM invoices WHERE user_id = $1", userID).Scan(&count)
	return count, err
}

// CountByUserIDAndStatus returns the count of invoices for a user with a specific status
func (r *InvoiceRepository) CountByUserIDAndStatus(userID, status string) (int64, error) {
	var count int64
	err := r.db.QueryRow("SELECT COUNT(*) FROM invoices WHERE user_id = $1 AND status = $2", userID, status).Scan(&count)
	return count, err
}

// SumTotalRevenueByUserID returns the sum of totals for paid invoices
func (r *InvoiceRepository) SumTotalRevenueByUserID(userID string) (float64, error) {
	var total sql.NullFloat64
	err := r.db.QueryRow("SELECT COALESCE(SUM(total), 0) FROM invoices WHERE user_id = $1 AND status = 'paid'", userID).Scan(&total)
	if err != nil {
		return 0, err
	}
	return total.Float64, nil
}

// SumPendingAmountByUserID returns the sum of totals for sent/overdue invoices
func (r *InvoiceRepository) SumPendingAmountByUserID(userID string) (float64, error) {
	var total sql.NullFloat64
	err := r.db.QueryRow("SELECT COALESCE(SUM(total), 0) FROM invoices WHERE user_id = $1 AND status IN ('sent', 'overdue')", userID).Scan(&total)
	if err != nil {
		return 0, err
	}
	return total.Float64, nil
}

// FindPaidInvoicesByUserID returns paid invoices ordered by paid_at DESC
func (r *InvoiceRepository) FindPaidInvoicesByUserID(userID string) ([]models.Invoice, error) {
	rows, err := r.db.Query(`
		SELECT id, invoice_number, user_id, client_id, client_name, client_email,
		       subtotal, tax, discount, total, status, payment_type, dp_percentage,
		       dp_amount, amount_paid, amount_remaining, due_date, created_at, paid_at,
		       notes, payment_link, remaining_payment_link
		FROM invoices WHERE user_id = $1 AND status = 'paid'
		ORDER BY paid_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invoices []models.Invoice
	for rows.Next() {
		inv, err := scanInvoice(rows)
		if err != nil {
			return nil, err
		}
		invoices = append(invoices, *inv)
	}
	return invoices, nil
}

// TotalPages calculates total pages
func TotalPages(total int64, size int) int {
	return int(math.Ceil(float64(total) / float64(size)))
}

// -- Settings Repository --

type SettingsRepository struct {
	db *sql.DB
}

func NewSettingsRepository(db *sql.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

func (r *SettingsRepository) FindByUserID(userID string) (*models.InvoiceSettings, error) {
	row := r.db.QueryRow(`
		SELECT user_id, business_name, business_email, business_phone, business_website,
		       business_address, logo_url, accent_color, footer_text
		FROM invoice_settings WHERE user_id = $1`, userID)

	var s models.InvoiceSettings
	var logoURL, accentColor, footerText sql.NullString
	err := row.Scan(&s.UserID, &s.BusinessName, &s.BusinessEmail, &s.BusinessPhone,
		&s.BusinessWebsite, &s.BusinessAddress, &logoURL, &accentColor, &footerText)
	if err != nil {
		if err == sql.ErrNoRows {
			return &models.InvoiceSettings{
				UserID:      userID,
				AccentColor: "#DC2626",
				FooterText:  "Terima kasih atas kepercayaan Anda 🙏",
			}, nil
		}
		return nil, err
	}
	s.LogoURL = logoURL.String
	s.AccentColor = accentColor.String
	if s.AccentColor == "" {
		s.AccentColor = "#DC2626"
	}
	s.FooterText = footerText.String
	if s.FooterText == "" {
		s.FooterText = "Terima kasih atas kepercayaan Anda 🙏"
	}
	return &s, nil
}

func (r *SettingsRepository) Upsert(s *models.InvoiceSettings) error {
	_, err := r.db.Exec(`
		INSERT INTO invoice_settings (user_id, business_name, business_email, business_phone,
		    business_website, business_address, logo_url, accent_color, footer_text)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		ON CONFLICT (user_id) DO UPDATE SET
		    business_name = EXCLUDED.business_name,
		    business_email = EXCLUDED.business_email,
		    business_phone = EXCLUDED.business_phone,
		    business_website = EXCLUDED.business_website,
		    business_address = EXCLUDED.business_address,
		    logo_url = EXCLUDED.logo_url,
		    accent_color = EXCLUDED.accent_color,
		    footer_text = EXCLUDED.footer_text`,
		s.UserID, s.BusinessName, s.BusinessEmail, s.BusinessPhone,
		s.BusinessWebsite, s.BusinessAddress, s.LogoURL, s.AccentColor, s.FooterText)
	return err
}

// -- Scan helpers --

func scanInvoice(rows *sql.Rows) (*models.Invoice, error) {
	var inv models.Invoice
	var dueDate, notes, paymentLink, remainingPaymentLink sql.NullString
	var createdAt sql.NullTime
	var paidAt sql.NullTime

	err := rows.Scan(
		&inv.ID, &inv.Number, &inv.UserID, &inv.ClientID, &inv.ClientName, &inv.ClientEmail,
		&inv.Subtotal, &inv.Tax, &inv.Discount, &inv.Total, &inv.Status, &inv.PaymentType,
		&inv.DpPercentage, &inv.DpAmount, &inv.AmountPaid, &inv.AmountRemaining,
		&dueDate, &createdAt, &paidAt, &notes, &paymentLink, &remainingPaymentLink)
	if err != nil {
		return nil, err
	}

	inv.DueDate = dueDate.String
	inv.Notes = notes.String
	inv.PaymentLink = paymentLink.String
	inv.RemainingPaymentLink = remainingPaymentLink.String
	if createdAt.Valid {
		t := createdAt.Time
		inv.CreatedAt = &t
	}
	if paidAt.Valid {
		t := paidAt.Time
		inv.PaidAt = &t
	}
	if inv.Items == nil {
		inv.Items = []models.InvoiceItem{}
	}

	return &inv, nil
}

func scanInvoiceRow(row *sql.Row) (*models.Invoice, error) {
	var inv models.Invoice
	var dueDate, notes, paymentLink, remainingPaymentLink sql.NullString
	var createdAt sql.NullTime
	var paidAt sql.NullTime

	err := row.Scan(
		&inv.ID, &inv.Number, &inv.UserID, &inv.ClientID, &inv.ClientName, &inv.ClientEmail,
		&inv.Subtotal, &inv.Tax, &inv.Discount, &inv.Total, &inv.Status, &inv.PaymentType,
		&inv.DpPercentage, &inv.DpAmount, &inv.AmountPaid, &inv.AmountRemaining,
		&dueDate, &createdAt, &paidAt, &notes, &paymentLink, &remainingPaymentLink)
	if err != nil {
		return nil, err
	}

	inv.DueDate = dueDate.String
	inv.Notes = notes.String
	inv.PaymentLink = paymentLink.String
	inv.RemainingPaymentLink = remainingPaymentLink.String
	if createdAt.Valid {
		t := createdAt.Time
		inv.CreatedAt = &t
	}
	if paidAt.Valid {
		t := paidAt.Time
		inv.PaidAt = &t
	}
	if inv.Items == nil {
		inv.Items = []models.InvoiceItem{}
	}


	return &inv, nil
}
