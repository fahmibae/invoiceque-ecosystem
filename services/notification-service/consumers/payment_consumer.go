package consumers

import (
	"encoding/json"
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/invoiceque/notification-service/services"
)

type PaymentEvent struct {
	EventType    string  `json:"event_type"`
	PaymentID    string  `json:"payment_id"`
	InvoiceID    string  `json:"invoice_id"`
	Amount       float64 `json:"amount"`
	ClientName   string  `json:"client_name"`
	ClientEmail  string  `json:"client_email"`
	PaymentTitle string  `json:"payment_title"`
}

type PaymentConsumer struct {
	emailService *services.EmailService
}

func NewPaymentConsumer(emailSvc *services.EmailService) *PaymentConsumer {
	return &PaymentConsumer{emailService: emailSvc}
}

func (c *PaymentConsumer) Start(conn *amqp.Connection) error {
	ch, err := conn.Channel()
	if err != nil {
		return err
	}

	msgs, err := ch.Consume(
		"notification.payment", // queue
		"notif-payment",        // consumer tag
		false,                  // auto-ack
		false,                  // exclusive
		false,                  // no-local
		false,                  // no-wait
		nil,                    // args
	)
	if err != nil {
		return err
	}

	go func() {
		for msg := range msgs {
			c.handleMessage(msg)
		}
	}()

	log.Println("[NOTIFICATION] Payment consumer started, listening on queue: notification.payment")
	return nil
}

func (c *PaymentConsumer) handleMessage(msg amqp.Delivery) {
	var event PaymentEvent
	if err := json.Unmarshal(msg.Body, &event); err != nil {
		log.Printf("[NOTIFICATION] Failed to parse payment event: %v", err)
		msg.Nack(false, false)
		return
	}

	log.Printf("[NOTIFICATION] Received payment event: %s for payment %s", event.EventType, event.PaymentID)

	var subject, body string

	switch event.EventType {
	case "payment.completed":
		subject = "Pembayaran Berhasil: " + event.PaymentTitle
		body = "Halo " + event.ClientName + ",\n\n" +
			"Pembayaran Anda untuk \"" + event.PaymentTitle + "\" telah berhasil diproses.\n" +
			"Jumlah: Rp " + formatCurrency(event.Amount) + "\n\n" +
			"Terima kasih,\nInvoiceQue"

	case "payment.failed":
		subject = "Pembayaran Gagal: " + event.PaymentTitle
		body = "Halo " + event.ClientName + ",\n\n" +
			"Pembayaran Anda untuk \"" + event.PaymentTitle + "\" gagal diproses.\n" +
			"Jumlah: Rp " + formatCurrency(event.Amount) + "\n\n" +
			"Silakan coba lagi atau hubungi penyedia layanan.\n\n" +
			"Terima kasih,\nInvoiceQue"

	default:
		log.Printf("[NOTIFICATION] Unknown payment event type: %s", event.EventType)
		msg.Ack(false)
		return
	}

	err := c.emailService.Send(services.EmailPayload{
		To:      event.ClientEmail,
		Subject: subject,
		Body:    body,
	})

	if err != nil {
		log.Printf("[NOTIFICATION] Failed to send email: %v", err)
		msg.Nack(false, true)
		return
	}

	msg.Ack(false)
}
