package consumers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/invoiceque/notification-service/services"
)

type InvoiceEvent struct {
	EventType   string  `json:"event_type"`
	InvoiceID   string  `json:"invoice_id"`
	InvoiceNum  string  `json:"invoice_number"`
	ClientName  string  `json:"client_name"`
	ClientEmail string  `json:"client_email"`
	Total       float64 `json:"total"`
	DueDate     string  `json:"due_date"`
	PaymentLink string  `json:"payment_link"`
	PdfBase64   string  `json:"pdf_base64"`
}

type InvoiceConsumer struct {
	emailService *services.EmailService
}

func NewInvoiceConsumer(emailSvc *services.EmailService) *InvoiceConsumer {
	return &InvoiceConsumer{emailService: emailSvc}
}

func (c *InvoiceConsumer) Start(conn *amqp.Connection) error {
	ch, err := conn.Channel()
	if err != nil {
		return err
	}

	msgs, err := ch.Consume(
		"notification.invoice", // queue
		"notif-invoice",        // consumer tag
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

	log.Println("[NOTIFICATION] Invoice consumer started, listening on queue: notification.invoice")
	return nil
}

func (c *InvoiceConsumer) handleMessage(msg amqp.Delivery) {
	var event InvoiceEvent
	if err := json.Unmarshal(msg.Body, &event); err != nil {
		log.Printf("[NOTIFICATION] Failed to parse invoice event: %v", err)
		msg.Nack(false, false)
		return
	}

	log.Printf("[NOTIFICATION] Received invoice event: %s for invoice %s", event.EventType, event.InvoiceNum)

	switch event.EventType {
	case "invoice.sent":
		c.handleInvoiceSent(event, msg)
		return

	case "invoice.created":
		subject := "Invoice Baru: " + event.InvoiceNum
		body := "Halo " + event.ClientName + ",\n\n" +
			"Invoice baru telah dibuat dengan nomor " + event.InvoiceNum + ".\n" +
			"Total: Rp " + formatCurrency(event.Total) + "\n" +
			"Jatuh tempo: " + event.DueDate + "\n\n" +
			"Terima kasih,\nInvoiceQue"

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

	case "invoice.paid":
		subject := "Pembayaran Diterima: " + event.InvoiceNum
		body := "Halo " + event.ClientName + ",\n\n" +
			"Pembayaran untuk invoice " + event.InvoiceNum + " telah diterima.\n" +
			"Total: Rp " + formatCurrency(event.Total) + "\n\n" +
			"Terima kasih,\nInvoiceQue"

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

	case "invoice.overdue":
		subject := "Reminder: Invoice " + event.InvoiceNum + " Jatuh Tempo"
		body := "Halo " + event.ClientName + ",\n\n" +
			"Invoice " + event.InvoiceNum + " telah melewati jatuh tempo.\n" +
			"Total: Rp " + formatCurrency(event.Total) + "\n" +
			"Jatuh tempo: " + event.DueDate + "\n\n" +
			"Mohon segera lakukan pembayaran.\n\n" +
			"Terima kasih,\nInvoiceQue"

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

	default:
		log.Printf("[NOTIFICATION] Unknown invoice event type: %s", event.EventType)
		msg.Ack(false)
		return
	}

	msg.Ack(false)
}

func (c *InvoiceConsumer) handleInvoiceSent(event InvoiceEvent, msg amqp.Delivery) {
	// Build professional HTML email
	paymentBtn := ""
	if event.PaymentLink != "" {
		paymentBtn = fmt.Sprintf(`
			<div style="text-align:center;margin:24px 0;">
				<a href="%s" style="display:inline-block;background:linear-gradient(135deg,#DC2626,#EF4444);color:white;padding:14px 40px;border-radius:8px;font-weight:700;font-size:16px;text-decoration:none;">
					💳 Bayar Sekarang
				</a>
				<p style="margin-top:8px;font-size:12px;color:#888;">
					Atau klik link: <a href="%s" style="color:#DC2626;">%s</a>
				</p>
			</div>`, event.PaymentLink, event.PaymentLink, event.PaymentLink)
	}

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
	<div style="background:linear-gradient(135deg,#DC2626,#EF4444);padding:30px;text-align:center;">
		<div style="display:inline-block;background:white;border-radius:12px;padding:8px 16px;">
			<span style="font-weight:800;font-size:20px;color:#DC2626;">IQ</span>
		</div>
		<h1 style="color:white;margin:16px 0 4px;font-size:24px;">Invoice %s</h1>
		<p style="color:rgba(255,255,255,0.9);margin:0;font-size:14px;">Tagihan dari InvoiceQue</p>
	</div>
	<div style="padding:30px;">
		<p style="font-size:16px;color:#333;">Halo <strong>%s</strong>,</p>
		<p style="color:#555;line-height:1.6;">
			Anda menerima invoice baru. Berikut ringkasan tagihannya:
		</p>
		<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;">
			<table style="width:100%%;font-size:14px;">
				<tr><td style="color:#888;padding:4px 0;">No. Invoice</td><td style="text-align:right;font-weight:600;">%s</td></tr>
				<tr><td style="color:#888;padding:4px 0;">Total</td><td style="text-align:right;font-weight:700;color:#DC2626;font-size:18px;">Rp %s</td></tr>
				<tr><td style="color:#888;padding:4px 0;">Jatuh Tempo</td><td style="text-align:right;font-weight:600;">%s</td></tr>
			</table>
		</div>
		%s
		<p style="color:#888;font-size:13px;margin-top:20px;">
			📎 Invoice lengkap terlampir dalam format PDF.
		</p>
	</div>
	<div style="background:#f8f9fa;padding:20px;text-align:center;font-size:12px;color:#888;">
		<p>Terima kasih atas kepercayaan Anda 🙏</p>
		<p style="margin-top:4px;">Powered by <strong style="color:#DC2626;">InvoiceQue</strong></p>
	</div>
</div>
</body>
</html>`,
		event.InvoiceNum, event.ClientName,
		event.InvoiceNum, formatCurrency(event.Total), event.DueDate,
		paymentBtn)

	// Decode PDF attachment
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

	if err != nil {
		log.Printf("[NOTIFICATION] Failed to send invoice email: %v", err)
		msg.Nack(false, true)
		return
	}

	log.Printf("[NOTIFICATION] ✅ Invoice email sent to %s with PDF attachment", event.ClientEmail)
	msg.Ack(false)
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
