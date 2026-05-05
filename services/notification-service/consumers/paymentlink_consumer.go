package consumers

import (
	"fmt"
	"log"

	"github.com/invoiceque/notification-service/repository"
	"github.com/invoiceque/notification-service/services"
)

type PaymentLinkEvent struct {
	EventType     string  `json:"event_type"`
	UserID        string  `json:"user_id"`
	PaymentLinkID string  `json:"payment_link_id"`
	Title         string  `json:"title"`
	Description   string  `json:"description"`
	Amount        float64 `json:"amount"`
	Currency      string  `json:"currency"`
	PaymentURL    string  `json:"payment_url"`
	InvoiceID     string  `json:"invoice_id"`
	ClientName    string  `json:"client_name"`
	ClientEmail   string  `json:"client_email"`
}

type PaymentLinkConsumer struct {
	emailService *services.EmailService
	repo         *repository.NotificationRepo
}

func NewPaymentLinkConsumer(es *services.EmailService, repo *repository.NotificationRepo) *PaymentLinkConsumer {
	return &PaymentLinkConsumer{
		emailService: es,
		repo:         repo,
	}
}

// ProcessEvent handles a paymentlink event received via REST API
func (c *PaymentLinkConsumer) ProcessEvent(event PaymentLinkEvent) {
	log.Printf("[NOTIFICATION] Received paymentlink.created event via REST for link %s", event.PaymentLinkID)

	if event.ClientEmail == "" {
		log.Printf("[NOTIFICATION] No client_email in paymentlink event %s, skipping email", event.PaymentLinkID)
		c.saveNotification(event.UserID, "paymentlink_created", "", "Payment Link Dibuat: "+event.Title,
			fmt.Sprintf("Payment link %s sebesar Rp %s telah dibuat", event.Title, formatCurrency(event.Amount)),
			"not_sent")
		return
	}

	clientName := event.ClientName
	if clientName == "" {
		clientName = "Pelanggan"
	}

	subject := "Tagihan Pembayaran: " + event.Title
	amountStr := formatCurrency(event.Amount)
	htmlBody := services.TemplatePaymentLinkCreated(clientName, event.Title, event.Description, amountStr, event.PaymentURL)

	emailStatus := "sent"
	err := c.emailService.Send(services.EmailPayload{
		To:       event.ClientEmail,
		Subject:  subject,
		Body:     fmt.Sprintf("Anda menerima tagihan pembayaran %s sebesar Rp %s. Bayar di: %s", event.Title, amountStr, event.PaymentURL),
		HTMLBody: htmlBody,
	})
	if err != nil {
		log.Printf("[NOTIFICATION] Failed to send payment link email: %v", err)
		emailStatus = "failed"
	} else {
		log.Printf("[NOTIFICATION] ✅ Payment link email sent to %s", event.ClientEmail)
	}

	c.saveNotification(event.UserID, "paymentlink_created", event.ClientEmail, subject,
		fmt.Sprintf("Payment link %s sebesar Rp %s dikirim ke %s", event.Title, amountStr, event.ClientEmail),
		emailStatus)
}

func (c *PaymentLinkConsumer) saveNotification(userID, nType, recipient, subject, message, emailStatus string) {
	if c.repo == nil {
		return
	}
	if err := c.repo.Insert(repository.Notification{
		UserID:    userID,
		Type:      nType,
		Recipient: recipient,
		Subject:   subject,
		Message:   message,
		Status:    emailStatus,
	}); err != nil {
		log.Printf("[NOTIFICATION] Failed to save notification: %v", err)
	}
}
