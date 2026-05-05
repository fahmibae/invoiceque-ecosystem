package messaging

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"time"
)

type Publisher struct {
	notificationServiceURL string
	client                 *http.Client
}

func NewPublisher(notificationServiceURL string) *Publisher {
	return &Publisher{
		notificationServiceURL: notificationServiceURL,
		client:                 &http.Client{Timeout: 10 * time.Second},
	}
}

func (p *Publisher) PublishInvoiceCreated(event map[string]interface{}) {
	p.publish("/events/invoice", event)
}

func (p *Publisher) PublishInvoiceSent(event map[string]interface{}) {
	p.publish("/events/invoice", event)
}

func (p *Publisher) PublishInvoicePaid(event map[string]interface{}) {
	p.publish("/events/invoice", event)
}

func (p *Publisher) PublishInvoiceOverdue(event map[string]interface{}) {
	p.publish("/events/invoice", event)
}

func (p *Publisher) publish(endpoint string, event map[string]interface{}) {
	body, err := json.Marshal(event)
	if err != nil {
		log.Printf("[INVOICE] Failed to marshal event: %v", err)
		return
	}

	url := p.notificationServiceURL + endpoint
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		log.Printf("[INVOICE] Failed to create request for event: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		log.Printf("[INVOICE] Failed to publish event %s via REST: %v", event["event_type"], err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Printf("[INVOICE] Notification service returned error %d for event %s", resp.StatusCode, event["event_type"])
	} else {
		log.Printf("[INVOICE] Published event: %s", event["event_type"])
	}
}
