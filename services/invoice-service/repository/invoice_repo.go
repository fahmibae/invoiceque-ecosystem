package repository

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math"
	"strings"

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

	// Always use the same number of params to avoid PgBouncer prepared statement conflicts
	err = r.db.QueryRow(
		"SELECT COUNT(*) FROM invoices WHERE user_id = $1 AND ($2 = '' OR status = $2)",
		userID, status).Scan(&total)
	if err != nil {
		return nil, 0, err
	}
	rows, err = r.db.Query(`
		SELECT id, invoice_number, user_id, client_id, client_name, client_email,
		       subtotal, tax, discount, total, status, payment_type, dp_percentage,
		       dp_amount, amount_paid, amount_remaining, due_date, created_at, paid_at,
		       notes, payment_link, remaining_payment_link, COALESCE(currency,'IDR'), COALESCE(exchange_rate_idr,0)
		FROM invoices WHERE user_id = $1 AND ($2 = '' OR status = $2)
		ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
		userID, status, size, offset)
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

	// Batch-load items for ALL invoices in a single query (fixes N+1)
	if err := r.batchLoadItems(invoices); err != nil {
		log.Printf("[INVOICE] Warning: failed to batch-load items: %v", err)
	}

	return invoices, total, nil
}

// FindByIDAndUserID returns a single invoice by ID and user
func (r *InvoiceRepository) FindByIDAndUserID(id, userID string) (*models.Invoice, error) {
	row := r.db.QueryRow(`
		SELECT id, invoice_number, user_id, client_id, client_name, client_email,
		       subtotal, tax, discount, total, status, payment_type, dp_percentage,
		       dp_amount, amount_paid, amount_remaining, due_date, created_at, paid_at,
		       notes, payment_link, remaining_payment_link, COALESCE(currency,'IDR'), COALESCE(exchange_rate_idr,0)
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
		       notes, payment_link, remaining_payment_link, COALESCE(currency,'IDR'), COALESCE(exchange_rate_idr,0)
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
		    notes, payment_link, remaining_payment_link, currency, exchange_rate_idr)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
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
		    remaining_payment_link = EXCLUDED.remaining_payment_link,
		    currency = EXCLUDED.currency,
		    exchange_rate_idr = EXCLUDED.exchange_rate_idr`,
		inv.ID, inv.Number, inv.UserID, inv.ClientID, inv.ClientName, inv.ClientEmail,
		inv.Subtotal, inv.Tax, inv.Discount, inv.Total, inv.Status, inv.PaymentType,
		inv.DpPercentage, inv.DpAmount, inv.AmountPaid, inv.AmountRemaining,
		inv.DueDate, inv.CreatedAt, inv.PaidAt, inv.Notes, inv.PaymentLink, inv.RemainingPaymentLink,
		inv.Currency, inv.ExchangeRateIDR)
	return err
}

// SaveItems deletes existing items and inserts new ones within a transaction
func (r *InvoiceRepository) SaveItems(invoiceID string, items []models.InvoiceItem) error {
	tx, err := r.db.BeginTx(context.Background(), nil)
	if err != nil {
		return fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	// Delete existing items
	_, err = tx.Exec("DELETE FROM invoice_items WHERE invoice_id = $1", invoiceID)
	if err != nil {
		return err
	}

	// Insert new items
	for _, item := range items {
		_, err := tx.Exec(`
			INSERT INTO invoice_items (id, invoice_id, description, quantity, price, total)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			item.ID, invoiceID, item.Description, item.Quantity, item.Price, item.Total)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

// Delete deletes an invoice and its items within a transaction
func (r *InvoiceRepository) Delete(id string) error {
	tx, err := r.db.BeginTx(context.Background(), nil)
	if err != nil {
		return fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	_, err = tx.Exec("DELETE FROM invoice_items WHERE invoice_id = $1", id)
	if err != nil {
		return err
	}
	_, err = tx.Exec("DELETE FROM invoices WHERE id = $1", id)
	if err != nil {
		return err
	}
	return tx.Commit()
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

// SumTotalRevenueByUserID returns the sum of amount_paid for invoices that have received any payment.
// This includes both fully paid and partially paid (DP) invoices, reflecting actual money received.
func (r *InvoiceRepository) SumTotalRevenueByUserID(userID string) (float64, error) {
	var total sql.NullFloat64
	err := r.db.QueryRow("SELECT COALESCE(SUM(amount_paid), 0) FROM invoices WHERE user_id = $1 AND status IN ('paid', 'partially_paid')", userID).Scan(&total)
	if err != nil {
		return 0, err
	}
	return total.Float64, nil
}

// SumPendingAmountByUserID returns the sum of amount_remaining for sent/overdue/partially_paid invoices.
// Uses amount_remaining so that DP invoices only count their outstanding balance, not the full total.
func (r *InvoiceRepository) SumPendingAmountByUserID(userID string) (float64, error) {
	var total sql.NullFloat64
	err := r.db.QueryRow("SELECT COALESCE(SUM(amount_remaining), 0) FROM invoices WHERE user_id = $1 AND status IN ('sent', 'overdue', 'partially_paid')", userID).Scan(&total)
	if err != nil {
		return 0, err
	}
	return total.Float64, nil
}

// FindLinkableByUserID returns invoices that can still be linked to a payment link.
// Rules:
//   - Status is NOT 'paid' (full payment not yet received), OR
//   - Payment type is 'dp' (down payment) AND amount_remaining > 0 (still has a remaining balance)
func (r *InvoiceRepository) FindLinkableByUserID(userID string) ([]models.Invoice, error) {
	rows, err := r.db.Query(`
		SELECT id, invoice_number, user_id, client_id, client_name, client_email,
		       subtotal, tax, discount, total, status, payment_type, dp_percentage,
		       dp_amount, amount_paid, amount_remaining, due_date, created_at, paid_at,
		       notes, payment_link, remaining_payment_link, COALESCE(currency,'IDR'), COALESCE(exchange_rate_idr,0)
		FROM invoices
		WHERE user_id = $1
		  AND (
		    status != 'paid'
		    OR (payment_type = 'dp' AND amount_remaining > 0)
		  )
		ORDER BY created_at DESC`, userID)
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
	if invoices == nil {
		invoices = []models.Invoice{}
	}
	return invoices, nil
}

// FindPaidInvoicesByUserID returns paid invoices ordered by paid_at DESC
func (r *InvoiceRepository) FindPaidInvoicesByUserID(userID string) ([]models.Invoice, error) {
	rows, err := r.db.Query(`
		SELECT id, invoice_number, user_id, client_id, client_name, client_email,
		       subtotal, tax, discount, total, status, payment_type, dp_percentage,
		       dp_amount, amount_paid, amount_remaining, due_date, created_at, paid_at,
		       notes, payment_link, remaining_payment_link, COALESCE(currency,'IDR'), COALESCE(exchange_rate_idr,0)
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

// batchLoadItems loads items for multiple invoices in a single query (fixes N+1)
func (r *InvoiceRepository) batchLoadItems(invoices []models.Invoice) error {
	if len(invoices) == 0 {
		return nil
	}

	ids := make([]string, len(invoices))
	for i, inv := range invoices {
		ids[i] = inv.ID
	}

	// Build placeholders
	placeholders := make([]string, len(ids))
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	query := fmt.Sprintf(`SELECT id, invoice_id, description, quantity, price, total
		FROM invoice_items WHERE invoice_id IN (%s)`, strings.Join(placeholders, ","))

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return err
	}
	defer rows.Close()

	itemMap := make(map[string][]models.InvoiceItem)
	for rows.Next() {
		var item models.InvoiceItem
		if err := rows.Scan(&item.ID, &item.InvoiceID, &item.Description, &item.Quantity, &item.Price, &item.Total); err != nil {
			return err
		}
		itemMap[item.InvoiceID] = append(itemMap[item.InvoiceID], item)
	}

	for i := range invoices {
		if items, ok := itemMap[invoices[i].ID]; ok {
			invoices[i].Items = items
		} else {
			invoices[i].Items = []models.InvoiceItem{}
		}
	}
	return nil
}

// FindByIDForUpdate returns an invoice locked for update (prevents race conditions in webhooks)
func (r *InvoiceRepository) FindByIDForUpdate(tx *sql.Tx, id string) (*models.Invoice, error) {
	row := tx.QueryRow(`
		SELECT id, invoice_number, user_id, client_id, client_name, client_email,
		       subtotal, tax, discount, total, status, payment_type, dp_percentage,
		       dp_amount, amount_paid, amount_remaining, due_date, created_at, paid_at,
		       notes, payment_link, remaining_payment_link, COALESCE(currency,'IDR'), COALESCE(exchange_rate_idr,0)
		FROM invoices WHERE id = $1 FOR UPDATE`, id)

	inv, err := scanInvoiceRow(row)
	if err != nil {
		return nil, err
	}

	items, err := r.FindItemsByInvoiceID(inv.ID)
	if err != nil {
		return nil, err
	}
	inv.Items = items
	return inv, nil
}

// SaveInTx saves an invoice within an existing transaction
func (r *InvoiceRepository) SaveInTx(tx *sql.Tx, inv *models.Invoice) error {
	_, err := tx.Exec(`
		INSERT INTO invoices (id, invoice_number, user_id, client_id, client_name, client_email,
		    subtotal, tax, discount, total, status, payment_type, dp_percentage,
		    dp_amount, amount_paid, amount_remaining, due_date, created_at, paid_at,
		    notes, payment_link, remaining_payment_link, currency, exchange_rate_idr)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
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
		    remaining_payment_link = EXCLUDED.remaining_payment_link,
		    currency = EXCLUDED.currency,
		    exchange_rate_idr = EXCLUDED.exchange_rate_idr`,
		inv.ID, inv.Number, inv.UserID, inv.ClientID, inv.ClientName, inv.ClientEmail,
		inv.Subtotal, inv.Tax, inv.Discount, inv.Total, inv.Status, inv.PaymentType,
		inv.DpPercentage, inv.DpAmount, inv.AmountPaid, inv.AmountRemaining,
		inv.DueDate, inv.CreatedAt, inv.PaidAt, inv.Notes, inv.PaymentLink, inv.RemainingPaymentLink,
		inv.Currency, inv.ExchangeRateIDR)
	return err
}

// BeginTx starts a database transaction
func (r *InvoiceRepository) BeginTx() (*sql.Tx, error) {
	return r.db.BeginTx(context.Background(), nil)
}

// GetDashboardStatsCombined returns all dashboard stats in a single query
func (r *InvoiceRepository) GetDashboardStatsCombined(userID string) (totalRevenue float64, totalInvoices, paidInvoices, overdueInvoices int64, pendingAmount float64, err error) {
	err = r.db.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN status IN ('paid','partially_paid') THEN amount_paid ELSE 0 END), 0),
			COUNT(*),
			COUNT(CASE WHEN status = 'paid' THEN 1 END),
			COUNT(CASE WHEN status = 'overdue' THEN 1 END),
			COALESCE(SUM(CASE WHEN status IN ('sent','overdue','partially_paid') THEN amount_remaining ELSE 0 END), 0)
		FROM invoices WHERE user_id = $1`, userID,
	).Scan(&totalRevenue, &totalInvoices, &paidInvoices, &overdueInvoices, &pendingAmount)
	return
}

// GetRevenueChartSQL returns monthly revenue aggregated in SQL (replaces in-memory aggregation)
func (r *InvoiceRepository) GetRevenueChartSQL(userID string, months int) (map[string]float64, error) {
	rows, err := r.db.Query(`
		SELECT TO_CHAR(paid_at, 'YYYY-MM') AS month_key,
		       COALESCE(SUM(total), 0) AS revenue
		FROM invoices
		WHERE user_id = $1
		  AND status = 'paid'
		  AND paid_at >= NOW() - ($2 || ' months')::INTERVAL
		GROUP BY month_key
		ORDER BY month_key`, userID, months)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]float64)
	for rows.Next() {
		var key string
		var revenue float64
		if err := rows.Scan(&key, &revenue); err != nil {
			return nil, err
		}
		result[key] = revenue
	}
	return result, nil
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
		       business_address, logo_url, accent_color, footer_text,
		       COALESCE(bank_name,''), COALESCE(bank_account_number,''), COALESCE(bank_account_name,'')
		FROM invoice_settings WHERE user_id = $1`, userID)

	var s models.InvoiceSettings
	var logoURL, accentColor, footerText sql.NullString
	err := row.Scan(&s.UserID, &s.BusinessName, &s.BusinessEmail, &s.BusinessPhone,
		&s.BusinessWebsite, &s.BusinessAddress, &logoURL, &accentColor, &footerText,
		&s.BankName, &s.BankAccountNumber, &s.BankAccountName)
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
		    business_website, business_address, logo_url, accent_color, footer_text,
		    bank_name, bank_account_number, bank_account_name)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		ON CONFLICT (user_id) DO UPDATE SET
		    business_name = EXCLUDED.business_name,
		    business_email = EXCLUDED.business_email,
		    business_phone = EXCLUDED.business_phone,
		    business_website = EXCLUDED.business_website,
		    business_address = EXCLUDED.business_address,
		    logo_url = EXCLUDED.logo_url,
		    accent_color = EXCLUDED.accent_color,
		    footer_text = EXCLUDED.footer_text,
		    bank_name = EXCLUDED.bank_name,
		    bank_account_number = EXCLUDED.bank_account_number,
		    bank_account_name = EXCLUDED.bank_account_name`,
		s.UserID, s.BusinessName, s.BusinessEmail, s.BusinessPhone,
		s.BusinessWebsite, s.BusinessAddress, s.LogoURL, s.AccentColor, s.FooterText,
		s.BankName, s.BankAccountNumber, s.BankAccountName)
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
		&dueDate, &createdAt, &paidAt, &notes, &paymentLink, &remainingPaymentLink, &inv.Currency, &inv.ExchangeRateIDR)
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
		&dueDate, &createdAt, &paidAt, &notes, &paymentLink, &remainingPaymentLink, &inv.Currency, &inv.ExchangeRateIDR)
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

// BulkDeleteByUserID deletes multiple invoices by IDs for a specific user
func (r *InvoiceRepository) BulkDeleteByUserID(ids []string, userID string) (int64, error) {
	if len(ids) == 0 {
		return 0, nil
	}

	// Build placeholders: $1=userID, $2...$N=ids
	args := []interface{}{userID}
	placeholders := ""
	for i, id := range ids {
		if i > 0 {
			placeholders += ","
		}
		placeholders += fmt.Sprintf("$%d", i+2)
		args = append(args, id)
	}

	// Delete items first
	_, err := r.db.Exec(
		fmt.Sprintf("DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE id IN (%s) AND user_id = $1)", placeholders),
		args...)
	if err != nil {
		return 0, err
	}

	// Delete invoices
	result, err := r.db.Exec(
		fmt.Sprintf("DELETE FROM invoices WHERE id IN (%s) AND user_id = $1", placeholders),
		args...)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}
