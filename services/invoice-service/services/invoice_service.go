package services

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/invoiceque/invoice-service/messaging"
	"github.com/invoiceque/invoice-service/models"
	"github.com/invoiceque/invoice-service/repository"
)

type InvoiceService struct {
	repo           *repository.InvoiceRepository
	publisher      *messaging.Publisher
	pdfGenerator   *PdfGeneratorService
	paymentClient  *PaymentServiceClient
}

func NewInvoiceService(
	repo *repository.InvoiceRepository,
	publisher *messaging.Publisher,
	pdfGen *PdfGeneratorService,
	paymentClient *PaymentServiceClient,
) *InvoiceService {
	return &InvoiceService{
		repo:          repo,
		publisher:     publisher,
		pdfGenerator:  pdfGen,
		paymentClient: paymentClient,
	}
}

func (s *InvoiceService) FindAll(userID, status string, page, size int) ([]models.InvoiceResponse, int64, int, error) {
	invoices, total, err := s.repo.FindByUserID(userID, status, page, size)
	if err != nil {
		return nil, 0, 0, err
	}

	responses := make([]models.InvoiceResponse, len(invoices))
	for i := range invoices {
		responses[i] = models.ToResponse(&invoices[i])
	}

	totalPages := repository.TotalPages(total, size)
	return responses, total, totalPages, nil
}

func (s *InvoiceService) FindByID(id, userID string) (*models.InvoiceResponse, error) {
	inv, err := s.repo.FindByIDAndUserID(id, userID)
	if err != nil {
		return nil, err
	}
	resp := models.ToResponse(inv)
	return &resp, nil
}

func (s *InvoiceService) Create(req models.InvoiceRequest, userID string) (*models.InvoiceResponse, error) {
	invoiceID := generateShortID()
	// Use timestamp-based invoice number to avoid duplicates after deletes
	now := time.Now()
	invoiceNumber := fmt.Sprintf("INV-%s-%s", now.Format("20060102"), invoiceID[:6])

	// Determine payment type
	paymentType := "full"
	if req.PaymentType != "" {
		paymentType = req.PaymentType
	}
	dpPercentage := 0
	if paymentType == "dp" && req.DpPercentage != nil {
		dpPercentage = *req.DpPercentage
	}

	tax := 0.0
	if req.Tax != nil {
		tax = *req.Tax
	}
	discount := 0.0
	if req.Discount != nil {
		discount = *req.Discount
	}
	status := "draft"
	if req.Status != "" {
		status = req.Status
	}

	currency := "IDR"
	if req.Currency != "" {
		currency = req.Currency
	}

	inv := &models.Invoice{
		ID:           invoiceID,
		Number:       invoiceNumber,
		UserID:       userID,
		ClientID:     req.ClientID,
		ClientName:   req.ClientName,
		ClientEmail:  req.ClientEmail,
		Tax:          tax,
		Discount:     discount,
		DueDate:      req.DueDate,
		Notes:        req.Notes,
		Status:       status,
		PaymentType:  paymentType,
		DpPercentage: dpPercentage,
		Currency:     currency,
		CreatedAt:    &now,
	}

	// Calculate items
	subtotal := 0.0
	items := make([]models.InvoiceItem, len(req.Items))
	for i, itemReq := range req.Items {
		itemTotal := itemReq.Price * float64(itemReq.Quantity)
		items[i] = models.InvoiceItem{
			ID:          generateShortID(),
			InvoiceID:   invoiceID,
			Description: itemReq.Description,
			Quantity:    itemReq.Quantity,
			Price:       itemReq.Price,
			Total:       itemTotal,
		}
		subtotal += itemTotal
	}

	inv.Subtotal = subtotal
	total := subtotal + inv.Tax - inv.Discount
	inv.Total = total

	// Calculate DP amounts
	if paymentType == "dp" && dpPercentage > 0 {
		dpAmount := roundTo2(total * float64(dpPercentage) / 100)
		inv.DpAmount = dpAmount
		inv.AmountPaid = 0
		inv.AmountRemaining = total
	} else {
		inv.DpAmount = 0
		inv.AmountPaid = 0
		inv.AmountRemaining = total
	}

	inv.Items = items

	if err := s.repo.Save(inv); err != nil {
		return nil, err
	}
	if err := s.repo.SaveItems(invoiceID, items); err != nil {
		return nil, err
	}

	log.Printf("[INVOICE] Created invoice %s (type: %s, dp: %d%%) for user %s",
		inv.Number, paymentType, dpPercentage, userID)

	// Publish event
	clientEmail := inv.ClientEmail
	dueDate := inv.DueDate

	s.publisher.PublishInvoiceCreated(map[string]interface{}{
		"event_type":     "invoice.created",
		"invoice_id":     inv.ID,
		"invoice_number": inv.Number,
		"user_id":        inv.UserID,
		"client_name":    inv.ClientName,
		"client_email":   clientEmail,
		"subtotal":       inv.Subtotal,
		"tax":            inv.Tax,
		"discount":       inv.Discount,
		"total":          inv.Total,
		"due_date":       dueDate,
		"items":          inv.Items,
		"payment_link":   inv.PaymentLink,
	})

	resp := models.ToResponse(inv)
	return &resp, nil
}

func (s *InvoiceService) Update(id string, req models.InvoiceRequest, userID string) (*models.InvoiceResponse, error) {
	inv, err := s.repo.FindByIDAndUserID(id, userID)
	if err != nil {
		return nil, err
	}

	inv.ClientID = req.ClientID
	inv.ClientName = req.ClientName
	inv.ClientEmail = req.ClientEmail
	inv.DueDate = req.DueDate
	inv.Notes = req.Notes
	if req.Currency != "" {
		inv.Currency = req.Currency
	}
	if req.Tax != nil {
		inv.Tax = *req.Tax
	}
	if req.Discount != nil {
		inv.Discount = *req.Discount
	}

	// Update payment type
	if req.PaymentType != "" {
		inv.PaymentType = req.PaymentType
		if req.DpPercentage != nil {
			inv.DpPercentage = *req.DpPercentage
		} else {
			inv.DpPercentage = 0
		}
	}

	// Update items
	subtotal := 0.0
	items := make([]models.InvoiceItem, len(req.Items))
	for i, itemReq := range req.Items {
		itemTotal := itemReq.Price * float64(itemReq.Quantity)
		items[i] = models.InvoiceItem{
			ID:          generateShortID(),
			InvoiceID:   inv.ID,
			Description: itemReq.Description,
			Quantity:    itemReq.Quantity,
			Price:       itemReq.Price,
			Total:       itemTotal,
		}
		subtotal += itemTotal
	}

	inv.Subtotal = subtotal
	total := subtotal + inv.Tax - inv.Discount
	inv.Total = total

	// Recalculate DP
	if inv.PaymentType == "dp" && inv.DpPercentage > 0 {
		dpAmount := roundTo2(total * float64(inv.DpPercentage) / 100)
		inv.DpAmount = dpAmount
		inv.AmountRemaining = total - inv.AmountPaid
	} else {
		inv.DpAmount = 0
		inv.AmountRemaining = total - inv.AmountPaid
	}

	inv.Items = items

	if err := s.repo.Save(inv); err != nil {
		return nil, err
	}
	if err := s.repo.SaveItems(inv.ID, items); err != nil {
		return nil, err
	}

	log.Printf("[INVOICE] Updated invoice %s", inv.Number)

	resp := models.ToResponse(inv)
	return &resp, nil
}

func (s *InvoiceService) Delete(id, userID string) error {
	inv, err := s.repo.FindByIDAndUserID(id, userID)
	if err != nil {
		return err
	}
	if err := s.repo.Delete(inv.ID); err != nil {
		return err
	}
	log.Printf("[INVOICE] Deleted invoice %s", inv.Number)
	return nil
}

func (s *InvoiceService) SendInvoice(id, userID string) (*models.InvoiceResponse, error) {
	inv, err := s.repo.FindByIDAndUserID(id, userID)
	if err != nil {
		return nil, err
	}

	isDp := inv.PaymentType == "dp"

	// Auto-create payment link
	if inv.PaymentLink == "" {
		var paymentAmount float64
		var paymentTitle string

		if isDp {
			paymentAmount = inv.DpAmount
			paymentTitle = fmt.Sprintf("DP Invoice %s (%d%%)", inv.Number, inv.DpPercentage)
			log.Printf("[INVOICE] Creating DP payment link for %s (Rp %f)", inv.Number, paymentAmount)
		} else {
			paymentAmount = inv.Total
			paymentTitle = fmt.Sprintf("Invoice %s", inv.Number)
			log.Printf("[INVOICE] Creating full payment link for %s (Rp %f)", inv.Number, paymentAmount)
		}

		paymentURL := s.paymentClient.CreatePaymentLink(
			userID, inv.ID, paymentTitle,
			"Pembayaran untuk "+inv.ClientName,
			paymentAmount,
		)
		if paymentURL != "" {
			inv.PaymentLink = paymentURL
		}
	}

	inv.Status = "sent"
	if err := s.repo.Save(inv); err != nil {
		return nil, err
	}
	log.Printf("[INVOICE] Invoice %s marked as sent (type: %s)", inv.Number, inv.PaymentType)

	// Generate PDF and publish event
	pdfBytes, err := s.pdfGenerator.GenerateInvoicePdf(inv)
	if err != nil {
		log.Printf("[INVOICE] Failed to generate PDF for invoice %s: %v", inv.Number, err)
	} else {
		pdfBase64 := base64.StdEncoding.EncodeToString(pdfBytes)

		s.publisher.PublishInvoiceSent(map[string]interface{}{
			"event_type":     "invoice.sent",
			"invoice_id":     inv.ID,
			"invoice_number": inv.Number,
			"user_id":        inv.UserID,
			"client_name":    inv.ClientName,
			"client_email":   inv.ClientEmail,
			"subtotal":       inv.Subtotal,
			"tax":            inv.Tax,
			"discount":       inv.Discount,
			"total":          inv.Total,
			"due_date":       inv.DueDate,
			"items":          inv.Items,
			"payment_link":   inv.PaymentLink,
			"pdf_base64":     pdfBase64,
		})
	}

	resp := models.ToResponse(inv)
	return &resp, nil
}

// MarkAsPaid is called when a payment is completed (via payment webhook).
// Uses SELECT FOR UPDATE to prevent race conditions from concurrent webhook retries.
func (s *InvoiceService) MarkAsPaid(invoiceID string) {
	tx, err := s.repo.BeginTx()
	if err != nil {
		log.Printf("[INVOICE] Failed to begin transaction for invoice %s: %v", invoiceID, err)
		return
	}
	defer tx.Rollback()

	// Lock the row to prevent concurrent webhook retries from corrupting state
	inv, err := s.repo.FindByIDForUpdate(tx, invoiceID)
	if err != nil {
		log.Printf("[INVOICE] Failed to find invoice %s: %v", invoiceID, err)
		return
	}

	// Idempotency: skip if already fully paid
	if inv.Status == "paid" {
		log.Printf("[INVOICE] Invoice %s already paid, skipping", inv.Number)
		return
	}

	isDp := inv.PaymentType == "dp"

	if isDp && inv.Status != "partially_paid" {
		// DP Phase 1: DP payment received
		inv.AmountPaid = inv.DpAmount
		inv.AmountRemaining = inv.Total - inv.DpAmount
		inv.Status = "partially_paid"
		if err := s.repo.SaveInTx(tx, inv); err != nil {
			log.Printf("[INVOICE] Failed to save invoice %s: %v", inv.Number, err)
			return
		}
		if err := tx.Commit(); err != nil {
			log.Printf("[INVOICE] Failed to commit DP phase 1 for %s: %v", inv.Number, err)
			return
		}
		log.Printf("[INVOICE] Invoice %s DP received. Paid: %f, Remaining: %f",
			inv.Number, inv.AmountPaid, inv.AmountRemaining)

		// Auto-create payment link for remaining balance (outside transaction)
		remainingURL := s.paymentClient.CreatePaymentLink(
			inv.UserID, inv.ID,
			"Pelunasan Invoice "+inv.Number,
			"Sisa pembayaran untuk "+inv.ClientName,
			inv.AmountRemaining,
		)
		if remainingURL != "" {
			inv.RemainingPaymentLink = remainingURL
			if err := s.repo.Save(inv); err != nil {
				log.Printf("[INVOICE] Failed to save remaining link: %v", err)
			}
			log.Printf("[INVOICE] Remaining payment link created: %s", remainingURL)
		}

		// Publish partial payment event
		s.publisher.PublishInvoicePaid(map[string]interface{}{
			"event_type":       "invoice.dp_paid",
			"invoice_id":       inv.ID,
			"invoice_number":   inv.Number,
			"user_id":          inv.UserID,
			"client_name":      inv.ClientName,
			"client_email":     inv.ClientEmail,
			"total":            inv.Total,
			"amount_paid":      inv.AmountPaid,
			"amount_remaining": inv.AmountRemaining,
			"payment_link":     remainingURL,
			"due_date":         inv.DueDate,
		})
	} else {
		// Full payment OR DP Phase 2 (final payment)
		inv.AmountPaid = inv.Total
		inv.AmountRemaining = 0
		inv.Status = "paid"
		now := time.Now()
		inv.PaidAt = &now
		inv.ExchangeRateIDR = fetchExchangeRateToIDR(inv.Currency)
		if err := s.repo.SaveInTx(tx, inv); err != nil {
			log.Printf("[INVOICE] Failed to save invoice %s: %v", inv.Number, err)
			return
		}
		if err := tx.Commit(); err != nil {
			log.Printf("[INVOICE] Failed to commit payment for %s: %v", inv.Number, err)
			return
		}
		log.Printf("[INVOICE] Invoice %s fully paid", inv.Number)

		// Publish paid event
		s.publisher.PublishInvoicePaid(map[string]interface{}{
			"event_type":     "invoice.paid",
			"invoice_id":     inv.ID,
			"invoice_number": inv.Number,
			"user_id":        inv.UserID,
			"client_name":    inv.ClientName,
			"client_email":   inv.ClientEmail,
			"total":          inv.Total,
			"due_date":       inv.DueDate,
		})
	}
}

// GetDashboardStats returns dashboard statistics using a single combined SQL query
func (s *InvoiceService) GetDashboardStats(userID string) (*models.DashboardStatsResponse, error) {
	totalRevenue, totalInvoices, paidInvoices, overdueInvoices, pendingAmount, err :=
		s.repo.GetDashboardStatsCombined(userID)
	if err != nil {
		return nil, err
	}

	return &models.DashboardStatsResponse{
		TotalRevenue:       totalRevenue,
		TotalInvoices:      totalInvoices,
		PaidInvoices:       paidInvoices,
		PendingAmount:      pendingAmount,
		OverdueInvoices:    overdueInvoices,
		ActivePaymentLinks: 0, // comes from Payment Service
	}, nil
}

// GetRevenueChart returns revenue chart data for the last N months using SQL aggregation
func (s *InvoiceService) GetRevenueChart(userID string, months int) ([]models.RevenueChartItem, error) {
	revenueByMonth, err := s.repo.GetRevenueChartSQL(userID, months)
	if err != nil {
		return nil, err
	}

	// Indonesian month names
	monthNames := []string{
		"", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
		"Jul", "Agu", "Sep", "Okt", "Nov", "Des",
	}

	// Build result for the last N months
	result := make([]models.RevenueChartItem, 0, months)
	now := time.Now()
	for i := months - 1; i >= 0; i-- {
		date := now.AddDate(0, -i, 0)
		key := fmt.Sprintf("%d-%02d", date.Year(), date.Month())
		monthLabel := monthNames[date.Month()]
		revenue := revenueByMonth[key]
		result = append(result, models.RevenueChartItem{
			Month:   monthLabel,
			Revenue: revenue,
		})
	}

	return result, nil
}

func generateShortID() string {
	// Use crypto/rand for collision-resistant IDs
	b := make([]byte, 4)
	rand.Read(b)
	return strings.ToUpper(hex.EncodeToString(b))
}

// Ensure roundTo2 is available (defined in pdf_generator.go but redeclaring for safety)
func init() {
	_ = math.Round // ensure math is used
}

// Exchange rate cache (1 hour TTL)
var (
	exchangeRateCache     = make(map[string]float64)
	exchangeRateCacheTime time.Time
	exchangeRateMu        sync.RWMutex
)

// fetchExchangeRateToIDR fetches the exchange rate with 1-hour caching.
// Returns 1.0 for IDR. Falls back to 0 if API fails.
func fetchExchangeRateToIDR(currency string) float64 {
	if currency == "" || strings.ToUpper(currency) == "IDR" {
		return 1.0
	}
	cur := strings.ToUpper(currency)

	// Check cache (read lock)
	exchangeRateMu.RLock()
	if time.Since(exchangeRateCacheTime) < time.Hour {
		if rate, ok := exchangeRateCache[cur]; ok {
			exchangeRateMu.RUnlock()
			return rate
		}
	}
	exchangeRateMu.RUnlock()

	// Cache miss — fetch from API
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("https://open.er-api.com/v6/latest/IDR")
	if err != nil {
		log.Printf("[EXCHANGE] Failed to fetch rates: %v", err)
		return 0
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[EXCHANGE] Failed to read response: %v", err)
		return 0
	}
	var data struct {
		Result string             `json:"result"`
		Rates  map[string]float64 `json:"rates"`
	}
	if err := json.Unmarshal(body, &data); err != nil || data.Result != "success" {
		log.Printf("[EXCHANGE] Failed to parse rates: %v", err)
		return 0
	}

	// Update cache (write lock)
	exchangeRateMu.Lock()
	exchangeRateCacheTime = time.Now()
	for k, v := range data.Rates {
		if v > 0 {
			exchangeRateCache[k] = 1.0 / v
		}
	}
	exchangeRateMu.Unlock()

	rate, ok := data.Rates[cur]
	if !ok || rate <= 0 {
		log.Printf("[EXCHANGE] Rate not found for %s", currency)
		return 0
	}
	result := 1.0 / rate
	log.Printf("[EXCHANGE] Locked rate: 1 %s = %.2f IDR", currency, result)
	return result
}
