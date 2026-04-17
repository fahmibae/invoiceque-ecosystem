package services

import (
	"bytes"
	"fmt"
	"html/template"
	"log"
	"math"
	"os/exec"
	"strings"
	"time"

	"github.com/invoiceque/invoice-service/models"
	"github.com/invoiceque/invoice-service/repository"
)

// PdfGeneratorService generates PDF invoices using HTML template + wkhtmltopdf
type PdfGeneratorService struct {
	settingsRepo *repository.SettingsRepository
	tmpl         *template.Template
}

func NewPdfGeneratorService(settingsRepo *repository.SettingsRepository) *PdfGeneratorService {
	funcMap := template.FuncMap{
		"formatCurrency": func(amount float64) string {
			return FormatCurrencyIDR(amount)
		},
		"gt": func(a, b float64) bool {
			return a > b
		},
		"eq": func(a, b string) bool {
			return a == b
		},
		"ne": func(a, b string) bool {
			return a != b
		},
		"notEmpty": func(s string) bool {
			return s != ""
		},
		"orBool": func(a, b bool) bool {
			return a || b
		},
	}

	tmpl := template.Must(template.New("invoice_template.html").Funcs(funcMap).ParseFiles("templates/invoice_template.html"))

	return &PdfGeneratorService{
		settingsRepo: settingsRepo,
		tmpl:         tmpl,
	}
}

type pdfTemplateData struct {
	InvoiceNumber   string
	ClientName      string
	ClientEmail     string
	CreatedAt       string
	DueDate         string
	Status          string
	PaymentLink     string
	Notes           string
	BusinessName    string
	BusinessEmail   string
	BusinessPhone   string
	BusinessAddress string
	BusinessWebsite string
	LogoURL         string
	AccentColor     string
	FooterText      string
	Items           []pdfItemData

	SubtotalFormatted        string
	TaxFormatted             string
	DiscountValue            float64
	DiscountFormatted        string
	TotalFormatted           string
	PaymentType              string
	IsDp                     bool
	DpPercentage             int
	DpAmountFormatted        string
	AmountPaidFormatted      string
	AmountRemainingFormatted string
	RemainingPaymentLink     string
}

type pdfItemData struct {
	Description    string
	Quantity       int
	PriceFormatted string
	TotalFormatted string
}

func (s *PdfGeneratorService) GenerateInvoicePdf(invoice *models.Invoice) ([]byte, error) {
	// Load tenant settings
	settings, err := s.settingsRepo.FindByUserID(invoice.UserID)
	if err != nil {
		log.Printf("[PDF] Warning: failed to load settings: %v", err)
		settings = &models.InvoiceSettings{
			UserID:      invoice.UserID,
			AccentColor: "#DC2626",
			FooterText:  "Terima kasih atas kepercayaan Anda 🙏",
		}
	}

	// Format dates
	createdAtStr := "-"
	if invoice.CreatedAt != nil {
		createdAtStr = formatDateID(*invoice.CreatedAt)
	}
	dueDateStr := invoice.DueDate
	if dueDateStr == "" {
		dueDateStr = "-"
	}

	// Business name
	bizName := settings.BusinessName
	if bizName == "" {
		bizName = "InvoiceQue"
	}

	// Accent color
	accent := settings.AccentColor
	if accent == "" {
		accent = "#DC2626"
	}

	// Footer text
	footerText := settings.FooterText
	if footerText == "" {
		footerText = "Terima kasih atas kepercayaan Anda 🙏"
	}

	// Format items
	items := make([]pdfItemData, len(invoice.Items))
	for i, item := range invoice.Items {
		items[i] = pdfItemData{
			Description:    item.Description,
			Quantity:       item.Quantity,
			PriceFormatted: FormatCurrencyIDR(item.Price),
			TotalFormatted: FormatCurrencyIDR(item.Total),
		}
	}

	clientEmail := invoice.ClientEmail
	if clientEmail == "" {
		clientEmail = "-"
	}

	data := pdfTemplateData{
		InvoiceNumber:   invoice.Number,
		ClientName:      invoice.ClientName,
		ClientEmail:     clientEmail,
		CreatedAt:       createdAtStr,
		DueDate:         dueDateStr,
		Status:          invoice.Status,
		PaymentLink:     invoice.PaymentLink,
		Notes:           invoice.Notes,
		BusinessName:    bizName,
		BusinessEmail:   settings.BusinessEmail,
		BusinessPhone:   settings.BusinessPhone,
		BusinessAddress: settings.BusinessAddress,
		BusinessWebsite: settings.BusinessWebsite,
		LogoURL:         settings.LogoURL,
		AccentColor:     accent,
		FooterText:      footerText,
		Items:           items,

		SubtotalFormatted:        FormatCurrencyIDR(invoice.Subtotal),
		TaxFormatted:             FormatCurrencyIDR(invoice.Tax),
		DiscountValue:            invoice.Discount,
		DiscountFormatted:        FormatCurrencyIDR(invoice.Discount),
		TotalFormatted:           FormatCurrencyIDR(invoice.Total),
		PaymentType:              coalesce(invoice.PaymentType, "full"),
		IsDp:                     invoice.PaymentType == "dp",
		DpPercentage:             invoice.DpPercentage,
		DpAmountFormatted:        FormatCurrencyIDR(invoice.DpAmount),
		AmountPaidFormatted:      FormatCurrencyIDR(invoice.AmountPaid),
		AmountRemainingFormatted: FormatCurrencyIDR(invoice.AmountRemaining),
		RemainingPaymentLink:     invoice.RemainingPaymentLink,
	}

	var buf bytes.Buffer
	if err := s.tmpl.Execute(&buf, data); err != nil {
		return nil, fmt.Errorf("failed to render template: %w", err)
	}

	htmlContent := buf.String()

	// Convert HTML to PDF using wkhtmltopdf
	pdfBytes, err := htmlToPdf(htmlContent)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	log.Printf("[PDF] Generated PDF for invoice %s (%d bytes)", invoice.Number, len(pdfBytes))
	return pdfBytes, nil
}

func htmlToPdf(html string) ([]byte, error) {
	cmd := exec.Command("wkhtmltopdf", "--quiet", "--page-size", "A4",
		"--margin-top", "10mm", "--margin-bottom", "10mm",
		"--margin-left", "10mm", "--margin-right", "10mm",
		"-", "-")
	cmd.Stdin = strings.NewReader(html)
	var out bytes.Buffer
	cmd.Stdout = &out
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		// If wkhtmltopdf is not available, return HTML as-is (for dev environments)
		log.Printf("[PDF] wkhtmltopdf not available (%v: %s), returning HTML as fallback", err, stderr.String())
		return []byte(html), nil
	}

	return out.Bytes(), nil
}

func formatDateID(t time.Time) string {
	months := []string{
		"", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
		"Jul", "Agu", "Sep", "Okt", "Nov", "Des",
	}
	return fmt.Sprintf("%02d %s %d", t.Day(), months[t.Month()], t.Year())
}

func coalesce(s, fallback string) string {
	if s == "" {
		return fallback
	}
	return s
}

func roundTo2(f float64) float64 {
	return math.Round(f*100) / 100
}
