package consumers

import (
	"fmt"
	"log"

	"github.com/invoiceque/notification-service/repository"
	"github.com/invoiceque/notification-service/services"
)

type SubscriptionEvent struct {
	EventType   string  `json:"event_type"`
	UserID      string  `json:"user_id"`
	UserEmail   string  `json:"user_email"`
	PlanID      string  `json:"plan_id"`
	PlanName    string  `json:"plan_name"`
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	CheckoutURL string  `json:"checkout_url"`
	ExternalID  string  `json:"external_id"`
	IsResend    bool    `json:"is_resend"`
}

type SubscriptionConsumer struct {
	emailService *services.EmailService
	repo         *repository.NotificationRepo
	userLookup   *services.UserLookupService
}

func NewSubscriptionConsumer(emailSvc *services.EmailService, repo *repository.NotificationRepo, userLookup *services.UserLookupService) *SubscriptionConsumer {
	return &SubscriptionConsumer{emailService: emailSvc, repo: repo, userLookup: userLookup}
}

// ProcessEvent handles a subscription event received via REST API
func (c *SubscriptionConsumer) ProcessEvent(event SubscriptionEvent) {
	log.Printf("[NOTIFICATION] Processing subscription event: %s for user %s", event.EventType, event.UserID)

	switch event.EventType {
	case "subscription.checkout_created":
		c.handleCheckoutCreated(event)
	case "subscription.paid":
		c.handleSubscriptionPaid(event)
	case "subscription.expired":
		c.handleSubscriptionExpired(event)
	case "subscription.checkout_expiring_soon":
		c.handleCheckoutExpiringSoon(event)
	default:
		log.Printf("[NOTIFICATION] Unknown subscription event type: %s", event.EventType)
	}
}

func (c *SubscriptionConsumer) handleCheckoutCreated(event SubscriptionEvent) {
	amountStr := formatCurrency(event.Amount)

	// Resolve user email: use event email or look up
	userEmail := event.UserEmail
	userName := "Pelanggan"
	if c.userLookup != nil && event.UserID != "" {
		userInfo, err := c.userLookup.GetUserByID(event.UserID)
		if err == nil && userInfo.Email != "" {
			userEmail = userInfo.Email
			if userInfo.Name != "" {
				userName = userInfo.Name
			}
		}
	}

	if userEmail == "" {
		log.Printf("[NOTIFICATION] No email for user %s, skipping checkout notification", event.UserID)
		return
	}

	subjectPrefix := "🛒 Link Pembayaran Langganan"
	if event.IsResend {
		subjectPrefix = "🔄 Link Pembayaran Baru"
	}
	subject := fmt.Sprintf("%s: Paket %s", subjectPrefix, event.PlanName)

	htmlBody := services.TemplateSubscriptionCheckout(userName, event.PlanName, amountStr, event.CheckoutURL, event.IsResend)

	emailStatus := "sent"
	err := c.emailService.Send(services.EmailPayload{
		To:       userEmail,
		Subject:  subject,
		Body:     fmt.Sprintf("Silakan selesaikan pembayaran langganan Paket %s sebesar Rp %s. Klik link: %s", event.PlanName, amountStr, event.CheckoutURL),
		HTMLBody: htmlBody,
	})
	if err != nil {
		log.Printf("[NOTIFICATION] Failed to send checkout email to %s: %v", userEmail, err)
		emailStatus = "failed"
	} else {
		log.Printf("[NOTIFICATION] ✅ Checkout email sent to %s", userEmail)
	}

	notifType := "subscription_checkout"
	if event.IsResend {
		notifType = "subscription_checkout_resend"
	}
	notifMessage := fmt.Sprintf("Link pembayaran Paket %s sebesar Rp %s telah dikirim", event.PlanName, amountStr)
	c.saveNotification(event.UserID, notifType, userEmail, subject, notifMessage, emailStatus)
}

func (c *SubscriptionConsumer) handleSubscriptionPaid(event SubscriptionEvent) {
	amountStr := formatCurrency(event.Amount)

	// Look up user info
	userEmail := ""
	userName := "Pelanggan"
	if c.userLookup != nil && event.UserID != "" {
		userInfo, err := c.userLookup.GetUserByID(event.UserID)
		if err == nil && userInfo.Email != "" {
			userEmail = userInfo.Email
			if userInfo.Name != "" {
				userName = userInfo.Name
			}
		}
	}

	if userEmail == "" {
		log.Printf("[NOTIFICATION] No email for user %s, skipping paid notification", event.UserID)
		return
	}

	subject := fmt.Sprintf("✅ Langganan Aktif: Paket %s", event.PlanName)
	htmlBody := services.TemplateSubscriptionActivated(userName, event.PlanName, amountStr)

	emailStatus := "sent"
	err := c.emailService.Send(services.EmailPayload{
		To:       userEmail,
		Subject:  subject,
		Body:     fmt.Sprintf("Langganan Paket %s Anda telah aktif! Terima kasih atas pembayaran Rp %s.", event.PlanName, amountStr),
		HTMLBody: htmlBody,
	})
	if err != nil {
		log.Printf("[NOTIFICATION] Failed to send subscription activated email to %s: %v", userEmail, err)
		emailStatus = "failed"
	} else {
		log.Printf("[NOTIFICATION] ✅ Subscription activated email sent to %s", userEmail)
	}

	notifMessage := fmt.Sprintf("Langganan Paket %s berhasil diaktifkan (Rp %s)", event.PlanName, amountStr)
	c.saveNotification(event.UserID, "subscription_activated", userEmail, subject, notifMessage, emailStatus)
}

func (c *SubscriptionConsumer) handleSubscriptionExpired(event SubscriptionEvent) {
	amountStr := formatCurrency(event.Amount)

	// Look up user info
	userEmail := ""
	userName := "Pelanggan"
	if c.userLookup != nil && event.UserID != "" {
		userInfo, err := c.userLookup.GetUserByID(event.UserID)
		if err == nil && userInfo.Email != "" {
			userEmail = userInfo.Email
			if userInfo.Name != "" {
				userName = userInfo.Name
			}
		}
	}

	if userEmail == "" {
		log.Printf("[NOTIFICATION] No email for user %s, skipping expired notification", event.UserID)
		return
	}

	subject := fmt.Sprintf("⚠️ Pembayaran Expired: Paket %s", event.PlanName)
	htmlBody := services.TemplateSubscriptionExpired(userName, event.PlanName, amountStr)

	emailStatus := "sent"
	err := c.emailService.Send(services.EmailPayload{
		To:       userEmail,
		Subject:  subject,
		Body:     fmt.Sprintf("Link pembayaran Paket %s sebesar Rp %s telah kedaluwarsa. Silakan hubungi admin untuk mendapatkan link baru.", event.PlanName, amountStr),
		HTMLBody: htmlBody,
	})
	if err != nil {
		log.Printf("[NOTIFICATION] Failed to send expired email to %s: %v", userEmail, err)
		emailStatus = "failed"
	} else {
		log.Printf("[NOTIFICATION] ✅ Subscription expired email sent to %s", userEmail)
	}

	notifMessage := fmt.Sprintf("Link pembayaran Paket %s (Rp %s) telah kedaluwarsa", event.PlanName, amountStr)
	c.saveNotification(event.UserID, "subscription_expired", userEmail, subject, notifMessage, emailStatus)
}

func (c *SubscriptionConsumer) handleCheckoutExpiringSoon(event SubscriptionEvent) {
	amountStr := formatCurrency(event.Amount)

	// Look up user info
	userEmail := event.UserEmail
	userName := "Pelanggan"
	if c.userLookup != nil && event.UserID != "" {
		userInfo, err := c.userLookup.GetUserByID(event.UserID)
		if err == nil && userInfo.Email != "" {
			userEmail = userInfo.Email
			if userInfo.Name != "" {
				userName = userInfo.Name
			}
		}
	}

	if userEmail == "" {
		log.Printf("[NOTIFICATION] No email for user %s, skipping expiring soon notification", event.UserID)
		return
	}

	subject := fmt.Sprintf("⏰ Segera Bayar: Paket %s (2 jam lagi expire!)", event.PlanName)
	htmlBody := services.TemplateSubscriptionExpiringSoon(userName, event.PlanName, amountStr, event.CheckoutURL)

	emailStatus := "sent"
	err := c.emailService.Send(services.EmailPayload{
		To:       userEmail,
		Subject:  subject,
		Body:     fmt.Sprintf("Link pembayaran Paket %s sebesar Rp %s akan expire dalam 2 jam. Segera bayar: %s", event.PlanName, amountStr, event.CheckoutURL),
		HTMLBody: htmlBody,
	})
	if err != nil {
		log.Printf("[NOTIFICATION] Failed to send expiring soon email to %s: %v", userEmail, err)
		emailStatus = "failed"
	} else {
		log.Printf("[NOTIFICATION] ✅ Expiring soon reminder sent to %s", userEmail)
	}

	notifMessage := fmt.Sprintf("Reminder: Link pembayaran Paket %s (Rp %s) akan expire dalam 2 jam", event.PlanName, amountStr)
	c.saveNotification(event.UserID, "subscription_expiring_soon", userEmail, subject, notifMessage, emailStatus)
}

func (c *SubscriptionConsumer) saveNotification(userID, notifType, recipient, subject, message, status string) {
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
