package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

// PaymentServiceClient is an HTTP client for inter-service communication with the Payment Service.
type PaymentServiceClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewPaymentServiceClient(baseURL string) *PaymentServiceClient {
	return &PaymentServiceClient{
		baseURL:    baseURL,
		httpClient: &http.Client{},
	}
}

// CreatePaymentLink creates a payment link via the Payment Service.
func (c *PaymentServiceClient) CreatePaymentLink(userID, invoiceID, title, description string, amount float64) string {
	body := map[string]interface{}{
		"title":       title,
		"description": description,
		"amount":      amount,
		"currency":    "IDR",
		"invoice_id":  invoiceID,
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		log.Printf("[PAYMENT-CLIENT] Failed to marshal request: %v", err)
		return ""
	}

	req, err := http.NewRequest("POST", c.baseURL+"/payments", bytes.NewBuffer(jsonBody))
	if err != nil {
		log.Printf("[PAYMENT-CLIENT] Failed to create request: %v", err)
		return ""
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", userID)

	log.Printf("[PAYMENT-CLIENT] Creating payment link for invoice %s (user: %s)", invoiceID, userID)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		log.Printf("[PAYMENT-CLIENT] Failed to create payment link: %v", err)
		return ""
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == 201 || resp.StatusCode == 200 {
		var result map[string]interface{}
		if err := json.Unmarshal(respBody, &result); err != nil {
			log.Printf("[PAYMENT-CLIENT] Failed to parse response: %v", err)
			return ""
		}
		paymentURL, _ := result["url"].(string)
		log.Printf("[PAYMENT-CLIENT] Payment link created: %s", paymentURL)
		return paymentURL
	}

	log.Printf("[PAYMENT-CLIENT] Payment service returned status %d: %s", resp.StatusCode, string(respBody))
	return ""
}

// FormatCurrencyIDR formats a float64 as Indonesian Rupiah string
func FormatCurrencyIDR(amount float64) string {
	intPart := int64(amount)
	if intPart == 0 {
		return "Rp 0"
	}

	s := fmt.Sprintf("%d", intPart)
	result := ""
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result += "."
		}
		result += string(c)
	}
	return "Rp " + result
}
