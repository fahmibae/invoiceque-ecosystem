package services

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/smtp"
	"net/textproto"
	"strings"
)

type EmailService struct {
	// SMTP config (fallback)
	smtpHost  string
	smtpPort  string
	smtpUser  string
	smtpPass  string
	fromEmail string
	// Resend config (primary)
	resendAPIKey string
}

func NewEmailService(host, port, user, pass, from, resendAPIKey string) *EmailService {
	svc := &EmailService{
		smtpHost:     host,
		smtpPort:     port,
		smtpUser:     user,
		smtpPass:     pass,
		fromEmail:    from,
		resendAPIKey: resendAPIKey,
	}

	if resendAPIKey != "" {
		log.Println("[EMAIL] ✅ Using Resend API for email delivery")
	} else if host != "" {
		log.Println("[EMAIL] Using SMTP for email delivery")
	} else {
		log.Println("[EMAIL] ⚠️ No email provider configured, emails will be logged only")
	}

	return svc
}

type EmailPayload struct {
	To       string
	Subject  string
	Body     string
	HTMLBody string // Optional: if set, sends HTML email instead of plain text
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

// ─── Resend API types ────────────────────────────────────

type resendEmailRequest struct {
	From        string              `json:"from"`
	To          []string            `json:"to"`
	Subject     string              `json:"subject"`
	Text        string              `json:"text,omitempty"`
	HTML        string              `json:"html,omitempty"`
	Attachments []resendAttachment  `json:"attachments,omitempty"`
}

type resendAttachment struct {
	Filename string `json:"filename"`
	Content  string `json:"content"` // base64 encoded
}

// ─── Send (plain text) ──────────────────────────────────

func (s *EmailService) Send(payload EmailPayload) error {
	log.Printf("[EMAIL] ══════════════════════════════════════")
	log.Printf("[EMAIL] To:      %s", payload.To)
	log.Printf("[EMAIL] Subject: %s", payload.Subject)
	log.Printf("[EMAIL] Body:    %s", payload.Body)
	log.Printf("[EMAIL] ══════════════════════════════════════")

	if payload.To == "" {
		log.Println("[EMAIL] No recipient, skipping send")
		return nil
	}

	// Priority: Resend > SMTP > Log only
	if s.resendAPIKey != "" {
		req := resendEmailRequest{
			From:    s.fromEmail,
			To:      []string{payload.To},
			Subject: payload.Subject,
			Text:    payload.Body,
		}
		if payload.HTMLBody != "" {
			req.HTML = payload.HTMLBody
		}
		return s.sendViaResend(req)
	}

	if s.smtpHost != "" {
		return s.sendViaSMTP(payload)
	}

	log.Println("[EMAIL] No email provider configured, skipping send")
	return nil
}

// ─── SendWithAttachment (HTML + attachments) ────────────

func (s *EmailService) SendWithAttachment(payload EmailWithAttachmentPayload) error {
	log.Printf("[EMAIL] ══════════════════════════════════════")
	log.Printf("[EMAIL] To:      %s", payload.To)
	log.Printf("[EMAIL] Subject: %s", payload.Subject)
	log.Printf("[EMAIL] Attachments: %d", len(payload.Attachments))
	log.Printf("[EMAIL] ══════════════════════════════════════")

	if payload.To == "" {
		log.Println("[EMAIL] No recipient, skipping send")
		return nil
	}

	// Priority: Resend > SMTP > Log only
	if s.resendAPIKey != "" {
		req := resendEmailRequest{
			From:    s.fromEmail,
			To:      []string{payload.To},
			Subject: payload.Subject,
			HTML:    payload.HTMLBody,
		}
		for _, att := range payload.Attachments {
			req.Attachments = append(req.Attachments, resendAttachment{
				Filename: att.Filename,
				Content:  base64.StdEncoding.EncodeToString(att.Data),
			})
		}
		return s.sendViaResend(req)
	}

	if s.smtpHost != "" {
		return s.sendWithAttachmentViaSMTP(payload)
	}

	// Dev mode: just log
	preview := payload.HTMLBody
	if len(preview) > 200 {
		preview = preview[:200] + "..."
	}
	log.Printf("[EMAIL] HTML Body Preview: %s", strings.ReplaceAll(preview, "\n", " "))
	log.Println("[EMAIL] No email provider configured, skipping send")
	return nil
}

// ─── Resend API implementation ──────────────────────────

func (s *EmailService) sendViaResend(emailReq resendEmailRequest) error {
	jsonBody, err := json.Marshal(emailReq)
	if err != nil {
		return fmt.Errorf("failed to marshal Resend request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create Resend request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.resendAPIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to call Resend API: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 400 {
		log.Printf("[EMAIL] Resend API error %d: %s", resp.StatusCode, string(body))
		return fmt.Errorf("Resend API returned status %d: %s", resp.StatusCode, string(body))
	}

	log.Printf("[EMAIL] ✅ Email sent via Resend to %s", strings.Join(emailReq.To, ", "))
	return nil
}

// ─── SMTP implementation (fallback) ─────────────────────

func (s *EmailService) sendViaSMTP(payload EmailPayload) error {
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

func (s *EmailService) sendWithAttachmentViaSMTP(payload EmailWithAttachmentPayload) error {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	headers := fmt.Sprintf("Subject: %s\r\n"+
		"From: %s\r\n"+
		"To: %s\r\n"+
		"MIME-Version: 1.0\r\n"+
		"Content-Type: multipart/mixed; boundary=%s\r\n\r\n",
		payload.Subject, s.fromEmail, payload.To, writer.Boundary())

	htmlHeader := textproto.MIMEHeader{}
	htmlHeader.Set("Content-Type", "text/html; charset=UTF-8")
	htmlPart, _ := writer.CreatePart(htmlHeader)
	htmlPart.Write([]byte(payload.HTMLBody))

	for _, att := range payload.Attachments {
		attHeader := textproto.MIMEHeader{}
		attHeader.Set("Content-Type", "application/pdf")
		attHeader.Set("Content-Transfer-Encoding", "base64")
		attHeader.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", att.Filename))
		attPart, _ := writer.CreatePart(attHeader)
		encoded := base64.StdEncoding.EncodeToString(att.Data)
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

	auth := smtp.PlainAuth("", s.smtpUser, s.smtpPass, s.smtpHost)
	addr := s.smtpHost + ":" + s.smtpPort
	return smtp.SendMail(addr, auth, s.fromEmail, []string{payload.To}, fullMsg)
}
