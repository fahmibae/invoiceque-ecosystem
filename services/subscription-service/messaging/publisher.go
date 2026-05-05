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

// PublishCheckoutCreated — when user creates a checkout (Xendit invoice)
func (p *Publisher) PublishCheckoutCreated(event map[string]interface{}) {
	p.publish("/events/subscription", event)
}

// PublishSubscriptionPaid — when subscription payment is confirmed
func (p *Publisher) PublishSubscriptionPaid(event map[string]interface{}) {
	p.publish("/events/subscription", event)
}

// PublishSubscriptionExpired — when checkout invoice expires
func (p *Publisher) PublishSubscriptionExpired(event map[string]interface{}) {
	p.publish("/events/subscription", event)
}

// PublishCheckoutExpiringSoon — reminder 2 hours before checkout expires
func (p *Publisher) PublishCheckoutExpiringSoon(event map[string]interface{}) {
	p.publish("/events/subscription", event)
}

func (p *Publisher) publish(endpoint string, event map[string]interface{}) {
	body, err := json.Marshal(event)
	if err != nil {
		log.Printf("[SUBSCRIPTION] Failed to marshal event: %v", err)
		return
	}

	url := p.notificationServiceURL + endpoint
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		log.Printf("[SUBSCRIPTION] Failed to create request for event: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		log.Printf("[SUBSCRIPTION] Failed to publish event %s via REST: %v", event["event_type"], err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Printf("[SUBSCRIPTION] Notification service returned error %d for event %s", resp.StatusCode, event["event_type"])
	} else {
		log.Printf("[SUBSCRIPTION] Published event: %s", event["event_type"])
	}
}
