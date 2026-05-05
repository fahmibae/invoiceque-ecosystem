package consumers

import (
	"fmt"
	"log"

	"github.com/invoiceque/notification-service/repository"
	"github.com/invoiceque/notification-service/services"
)

type PaymentEvent struct {
	EventType    string  `json:"event_type"`
	UserID       string  `json:"user_id"`
	PaymentID    string  `json:"payment_id"`
	InvoiceID    string  `json:"invoice_id"`
	Amount       float64 `json:"amount"`
	ClientName   string  `json:"client_name"`
	ClientEmail  string  `json:"client_email"`
	PaymentTitle string  `json:"payment_title"`
}

type PaymentConsumer struct {
	emailService *services.EmailService
	repo         *repository.NotificationRepo
	userLookup   *services.UserLookupService
}

func NewPaymentConsumer(emailSvc *services.EmailService, repo *repository.NotificationRepo, userLookup *services.UserLookupService) *PaymentConsumer {
	return &PaymentConsumer{emailService: emailSvc, repo: repo, userLookup: userLookup}
}

// ProcessEvent handles a payment event received via REST API
func (c *PaymentConsumer) ProcessEvent(event PaymentEvent) {
	log.Printf("[NOTIFICATION] Processing payment event: %s for payment %s", event.EventType, event.PaymentID)

	switch event.EventType {
	case "payment.completed":
		c.handlePaymentCompleted(event)
	case "payment.failed":
		c.handlePaymentFailed(event)
	default:
		log.Printf("[NOTIFICATION] Unknown payment event type: %s", event.EventType)
	}
}

func (c *PaymentConsumer) handlePaymentCompleted(event PaymentEvent) {
	amountStr := formatCurrency(event.Amount)

	clientSubject := "Pembayaran Berhasil: " + event.PaymentTitle
	clientHTML := services.TemplatePaymentCompletedClient(event.ClientName, event.PaymentTitle, amountStr)

	emailStatus := "sent"
	err := c.emailService.Send(services.EmailPayload{
		To:       event.ClientEmail,
		Subject:  clientSubject,
		Body:     fmt.Sprintf("Pembayaran Anda untuk \"%s\" sebesar Rp %s berhasil.", event.PaymentTitle, amountStr),
		HTMLBody: clientHTML,
	})
	if err != nil {
		log.Printf("[NOTIFICATION] Failed to send email to client %s: %v", event.ClientEmail, err)
		emailStatus = "failed"
	}

	notifMessage := fmt.Sprintf("Pembayaran \"%s\" dari %s sebesar Rp %s berhasil diterima", event.PaymentTitle, event.ClientName, amountStr)
	c.saveNotification(event.UserID, "payment_received", event.ClientEmail, clientSubject, notifMessage, emailStatus)

	if c.userLookup != nil {
		userInfo, err := c.userLookup.GetUserByID(event.UserID)
		if err != nil {
			log.Printf("[NOTIFICATION] Could not look up user %s: %v", event.UserID, err)
		} else if userInfo.Email != "" {
			ownerSubject := "💰 Pembayaran Diterima: " + event.PaymentTitle
			ownerHTML := services.TemplatePaymentCompletedOwner(userInfo.Name, event.ClientName, event.PaymentTitle, amountStr)

			ownerEmailStatus := "sent"
			err = c.emailService.Send(services.EmailPayload{
				To:       userInfo.Email,
				Subject:  ownerSubject,
				Body:     fmt.Sprintf("Pembayaran \"%s\" dari %s sebesar Rp %s diterima.", event.PaymentTitle, event.ClientName, amountStr),
				HTMLBody: ownerHTML,
			})
			if err != nil {
				log.Printf("[NOTIFICATION] Failed to send email to owner %s: %v", userInfo.Email, err)
				ownerEmailStatus = "failed"
			} else {
				log.Printf("[NOTIFICATION] ✅ Payment notification sent to owner %s", userInfo.Email)
			}

			c.saveNotification(event.UserID, "payment_received", userInfo.Email, ownerSubject,
				fmt.Sprintf("Pembayaran \"%s\" dari %s sebesar Rp %s berhasil diterima", event.PaymentTitle, event.ClientName, amountStr),
				ownerEmailStatus)
		}
	}
}

func (c *PaymentConsumer) handlePaymentFailed(event PaymentEvent) {
	amountStr := formatCurrency(event.Amount)

	subject := "Pembayaran Gagal: " + event.PaymentTitle
	failedHTML := services.TemplatePaymentFailed(event.ClientName, event.PaymentTitle, amountStr)

	emailStatus := "sent"
	err := c.emailService.Send(services.EmailPayload{
		To:       event.ClientEmail,
		Subject:  subject,
		Body:     fmt.Sprintf("Pembayaran \"%s\" sebesar Rp %s gagal.", event.PaymentTitle, amountStr),
		HTMLBody: failedHTML,
	})
	if err != nil {
		log.Printf("[NOTIFICATION] Failed to send email: %v", err)
		emailStatus = "failed"
	}

	notifMessage := fmt.Sprintf("Pembayaran \"%s\" dari %s sebesar Rp %s gagal diproses", event.PaymentTitle, event.ClientName, amountStr)
	c.saveNotification(event.UserID, "payment_failed", event.ClientEmail, subject, notifMessage, emailStatus)
}

func (c *PaymentConsumer) saveNotification(userID, notifType, recipient, subject, message, status string) {
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
