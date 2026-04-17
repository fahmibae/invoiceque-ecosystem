package services

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"log"
	"mime/multipart"
	"net/smtp"
	"net/textproto"
	"strings"
)

type EmailService struct {
	smtpHost  string
	smtpPort  string
	smtpUser  string
	smtpPass  string
	fromEmail string
}

func NewEmailService(host, port, user, pass, from string) *EmailService {
	return &EmailService{
		smtpHost:  host,
		smtpPort:  port,
		smtpUser:  user,
		smtpPass:  pass,
		fromEmail: from,
	}
}

type EmailPayload struct {
	To      string
	Subject string
	Body    string
}

type EmailAttachment struct {
	Filename string
	Data     []byte
}

type EmailWithAttachmentPayload struct {
	To          string
	Subject     string
	HTMLBody    string
	Attachments []EmailAttachment
}

func (s *EmailService) Send(payload EmailPayload) error {
	log.Printf("[EMAIL] ══════════════════════════════════════")
	log.Printf("[EMAIL] To:      %s", payload.To)
	log.Printf("[EMAIL] Subject: %s", payload.Subject)
	log.Printf("[EMAIL] Body:    %s", payload.Body)
	log.Printf("[EMAIL] ══════════════════════════════════════")

	if s.smtpHost == "" {
		log.Println("[EMAIL] SMTP not configured, skipping send")
		return nil
	}

	auth := smtp.PlainAuth("", s.smtpUser, s.smtpPass, s.smtpHost)
	addr := s.smtpHost + ":" + s.smtpPort
	msg := []byte("Subject: " + payload.Subject + "\r\n" +
		"From: " + s.fromEmail + "\r\n" +
		"To: " + payload.To + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
		payload.Body)
	return smtp.SendMail(addr, auth, s.fromEmail, []string{payload.To}, msg)
}

func (s *EmailService) SendWithAttachment(payload EmailWithAttachmentPayload) error {
	log.Printf("[EMAIL] ══════════════════════════════════════")
	log.Printf("[EMAIL] To:      %s", payload.To)
	log.Printf("[EMAIL] Subject: %s", payload.Subject)
	log.Printf("[EMAIL] Attachments: %d", len(payload.Attachments))
	log.Printf("[EMAIL] ══════════════════════════════════════")

	// Build MIME multipart message
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Headers
	headers := fmt.Sprintf("Subject: %s\r\n"+
		"From: %s\r\n"+
		"To: %s\r\n"+
		"MIME-Version: 1.0\r\n"+
		"Content-Type: multipart/mixed; boundary=%s\r\n\r\n",
		payload.Subject, s.fromEmail, payload.To, writer.Boundary())

	// HTML body part
	htmlHeader := textproto.MIMEHeader{}
	htmlHeader.Set("Content-Type", "text/html; charset=UTF-8")
	htmlPart, _ := writer.CreatePart(htmlHeader)
	htmlPart.Write([]byte(payload.HTMLBody))

	// Attachment parts
	for _, att := range payload.Attachments {
		attHeader := textproto.MIMEHeader{}
		attHeader.Set("Content-Type", "application/pdf")
		attHeader.Set("Content-Transfer-Encoding", "base64")
		attHeader.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", att.Filename))
		attPart, _ := writer.CreatePart(attHeader)
		encoded := base64.StdEncoding.EncodeToString(att.Data)
		// Split into 76-char lines for email compatibility
		for i := 0; i < len(encoded); i += 76 {
			end := i + 76
			if end > len(encoded) {
				end = len(encoded)
			}
			attPart.Write([]byte(encoded[i:end] + "\r\n"))
		}
	}

	writer.Close()

	fullMsg := []byte(headers)
	fullMsg = append(fullMsg, buf.Bytes()...)

	if s.smtpHost == "" {
		// Dev mode: just log HTML body preview
		preview := payload.HTMLBody
		if len(preview) > 200 {
			preview = preview[:200] + "..."
		}
		log.Printf("[EMAIL] HTML Body Preview: %s", strings.ReplaceAll(preview, "\n", " "))
		log.Println("[EMAIL] SMTP not configured, skipping actual send")
		return nil
	}

	auth := smtp.PlainAuth("", s.smtpUser, s.smtpPass, s.smtpHost)
	addr := s.smtpHost + ":" + s.smtpPort
	return smtp.SendMail(addr, auth, s.fromEmail, []string{payload.To}, fullMsg)
}
