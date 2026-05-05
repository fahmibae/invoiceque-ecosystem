package consumers

import (
	"encoding/base64"
	"fmt"
	"log"

	"github.com/invoiceque/notification-service/repository"
	"github.com/invoiceque/notification-service/services"
)

type InvoiceItem struct {
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	Price       float64 `json:"price"`
	Total       float64 `json:"total"`
}

type InvoiceEvent struct {
	EventType   string        `json:"event_type"`
	UserID      string        `json:"user_id"`
	InvoiceID   string        `json:"invoice_id"`
	InvoiceNum  string        `json:"invoice_number"`
	ClientName  string        `json:"client_name"`
	ClientEmail string        `json:"client_email"`
	Subtotal    float64       `json:"subtotal"`
	Tax         float64       `json:"tax"`
	Discount    float64       `json:"discount"`
	Total       float64       `json:"total"`
	DueDate     string        `json:"due_date"`
	PaymentLink string        `json:"payment_link"`
	PdfBase64   string        `json:"pdf_base64"`
	Items       []InvoiceItem `json:"items"`
}

type InvoiceConsumer struct {
	emailService *services.EmailService
	repo         *repository.NotificationRepo
}

func NewInvoiceConsumer(emailSvc *services.EmailService, repo *repository.NotificationRepo) *InvoiceConsumer {
	return &InvoiceConsumer{emailService: emailSvc, repo: repo}
}

// ProcessEvent handles an invoice event received via REST API
func (c *InvoiceConsumer) ProcessEvent(event InvoiceEvent) {
	log.Printf("[NOTIFICATION] Processing invoice event: %s for invoice %s", event.EventType, event.InvoiceNum)

	switch event.EventType {
	case "invoice.sent":
		c.handleInvoiceSent(event)
		return

	case "invoice.created":
		subject := "Invoice Baru: " + event.InvoiceNum
		amountStr := formatCurrency(event.Total)

		emailStatus := "not_sent"
		c.saveNotification(event.UserID, "invoice_created", event.ClientEmail, subject,
			fmt.Sprintf("Invoice %s untuk %s sebesar Rp %s telah dibuat", event.InvoiceNum, event.ClientName, amountStr),
			emailStatus)

	case "invoice.paid":
		subject := "Pembayaran Diterima: " + event.InvoiceNum
		amountStr := formatCurrency(event.Total)
		htmlBody := services.TemplateInvoicePaid(event.ClientName, event.InvoiceNum, amountStr)

		emailStatus := "sent"
		err := c.emailService.Send(services.EmailPayload{
			To:       event.ClientEmail,
			Subject:  subject,
			Body:     fmt.Sprintf("Pembayaran invoice %s sebesar Rp %s diterima.", event.InvoiceNum, amountStr),
			HTMLBody: htmlBody,
		})
		if err != nil {
			log.Printf("[NOTIFICATION] Failed to send email: %v", err)
			emailStatus = "failed"
		}

		c.saveNotification(event.UserID, "payment_received", event.ClientEmail, subject,
			fmt.Sprintf("Pembayaran invoice %s dari %s sebesar Rp %s telah diterima", event.InvoiceNum, event.ClientName, amountStr),
			emailStatus)

	case "invoice.overdue":
		subject := "Reminder: Invoice " + event.InvoiceNum + " Jatuh Tempo"
		amountStr := formatCurrency(event.Total)
		htmlBody := services.TemplateInvoiceOverdue(event.ClientName, event.InvoiceNum, amountStr, event.DueDate)

		emailStatus := "sent"
		err := c.emailService.Send(services.EmailPayload{
			To:       event.ClientEmail,
			Subject:  subject,
			Body:     fmt.Sprintf("Invoice %s sebesar Rp %s telah jatuh tempo (%s).", event.InvoiceNum, amountStr, event.DueDate),
			HTMLBody: htmlBody,
		})
		if err != nil {
			log.Printf("[NOTIFICATION] Failed to send email: %v", err)
			emailStatus = "failed"
		}

		c.saveNotification(event.UserID, "invoice_overdue", event.ClientEmail, subject,
			fmt.Sprintf("Invoice %s untuk %s sebesar Rp %s telah jatuh tempo", event.InvoiceNum, event.ClientName, amountStr),
			emailStatus)

	default:
		log.Printf("[NOTIFICATION] Unknown invoice event type: %s", event.EventType)
		return
	}
}

func (c *InvoiceConsumer) handleInvoiceSent(event InvoiceEvent) {
	itemsHTML := formatItemsHTML(event)
	htmlBody := services.TemplateInvoiceSent(event.ClientName, event.InvoiceNum, formatCurrency(event.Total), event.DueDate, event.PaymentLink, itemsHTML)

	var attachments []services.EmailAttachment
	if event.PdfBase64 != "" {
		pdfBytes, err := base64.StdEncoding.DecodeString(event.PdfBase64)
		if err != nil {
			log.Printf("[NOTIFICATION] Failed to decode PDF: %v", err)
		} else {
			attachments = append(attachments, services.EmailAttachment{
				Filename: event.InvoiceNum + ".pdf",
				Data:     pdfBytes,
			})
			log.Printf("[NOTIFICATION] PDF attachment ready: %s (%d bytes)", event.InvoiceNum+".pdf", len(pdfBytes))
		}
	}

	err := c.emailService.SendWithAttachment(services.EmailWithAttachmentPayload{
		To:          event.ClientEmail,
		Subject:     "Invoice " + event.InvoiceNum + " - Tagihan Anda",
		HTMLBody:    htmlBody,
		Attachments: attachments,
	})

	emailStatus := "sent"
	if err != nil {
		log.Printf("[NOTIFICATION] Failed to send invoice email: %v", err)
		emailStatus = "failed"
	} else {
		log.Printf("[NOTIFICATION] ✅ Invoice email sent to %s with PDF attachment", event.ClientEmail)
	}

	c.saveNotification(event.UserID, "invoice_sent", event.ClientEmail,
		"Invoice "+event.InvoiceNum+" - Tagihan Anda",
		fmt.Sprintf("Invoice %s untuk %s sebesar Rp %s telah dikirim via email", event.InvoiceNum, event.ClientName, formatCurrency(event.Total)),
		emailStatus)
}

func (c *InvoiceConsumer) saveNotification(userID, notifType, recipient, subject, message, status string) {
	if c.repo == nil {
		log.Println("[NOTIFICATION] Warning: repo is nil, skipping database save")
		return
	}

	err := c.repo.Insert(repository.Notification{
		UserID:    userID,
		Type:      notifType,
		Recipient: recipient,
		Subject:   subject,
		Message:   message,
		Status:    status,
	})
	if err != nil {
		log.Printf("[NOTIFICATION] Failed to save notification to DB: %v", err)
	} else {
		log.Printf("[NOTIFICATION] ✅ Notification saved to DB: %s -> %s", notifType, recipient)
	}
}

func formatItemsHTML(event InvoiceEvent) string {
	if len(event.Items) == 0 {
		return ""
	}
	rows := ""
	for _, item := range event.Items {
		rows += fmt.Sprintf(`
		<tr>
			<td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">%s</td>
			<td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;text-align:center;">%d</td>
			<td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;text-align:right;">%s</td>
			<td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">%s</td>
		</tr>`, item.Description, item.Quantity, formatCurrency(item.Price), formatCurrency(item.Total))
	}

	return fmt.Sprintf(`
	<table width="100%%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;font-size:14px;">
		<thead>
			<tr style="background:#f9fafb;color:#374151;text-align:left;">
				<th style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">Deskripsi</th>
				<th style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:center;">Qty</th>
				<th style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:right;">Harga</th>
				<th style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:right;">Total</th>
			</tr>
		</thead>
		<tbody>
			%s
		</tbody>
		<tfoot>
			<tr>
				<td colspan="3" style="padding:10px 16px;text-align:right;color:#6b7280;border-top:1px solid #e5e7eb;">Subtotal</td>
				<td style="padding:10px 16px;text-align:right;font-weight:600;border-top:1px solid #e5e7eb;">Rp %s</td>
			</tr>
			<tr>
				<td colspan="3" style="padding:10px 16px;text-align:right;color:#6b7280;">Pajak</td>
				<td style="padding:10px 16px;text-align:right;font-weight:600;">Rp %s</td>
			</tr>
			<tr>
				<td colspan="3" style="padding:10px 16px;text-align:right;color:#6b7280;">Diskon</td>
				<td style="padding:10px 16px;text-align:right;font-weight:600;color:#DC2626;">-Rp %s</td>
			</tr>
			<tr style="background:#f9fafb;">
				<td colspan="3" style="padding:12px 16px;text-align:right;font-weight:700;color:#111827;">Total Tagihan</td>
				<td style="padding:12px 16px;text-align:right;font-weight:800;color:#2563EB;">Rp %s</td>
			</tr>
		</tfoot>
	</table>
	`, rows, formatCurrency(event.Subtotal), formatCurrency(event.Tax), formatCurrency(event.Discount), formatCurrency(event.Total))
}

func formatCurrency(amount float64) string {
	intPart := int64(amount)
	result := ""
	s := ""
	if intPart == 0 {
		return "0"
	}
	for intPart > 0 {
		digit := intPart % 10
		s = string(rune('0'+digit)) + s
		intPart /= 10
	}

	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result += "."
		}
		result += string(c)
	}
	return result
}
