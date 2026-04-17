package messaging

import (
	"encoding/json"
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

const ExchangeName = "invoiceque.events"

type Publisher struct {
	channel *amqp.Channel
}

func NewPublisher(conn *amqp.Connection) (*Publisher, error) {
	ch, err := conn.Channel()
	if err != nil {
		return nil, err
	}

	// Declare exchange (matches Java TopicExchange)
	err = ch.ExchangeDeclare(
		ExchangeName,
		"topic",
		true,  // durable
		false, // auto-deleted
		false, // internal
		false, // no-wait
		nil,
	)
	if err != nil {
		return nil, err
	}

	return &Publisher{channel: ch}, nil
}

func (p *Publisher) PublishInvoiceCreated(event map[string]interface{}) {
	p.publish("invoice.created", event)
}

func (p *Publisher) PublishInvoiceSent(event map[string]interface{}) {
	p.publish("invoice.sent", event)
}

func (p *Publisher) PublishInvoicePaid(event map[string]interface{}) {
	p.publish("invoice.paid", event)
}

func (p *Publisher) PublishInvoiceOverdue(event map[string]interface{}) {
	p.publish("invoice.overdue", event)
}

func (p *Publisher) publish(routingKey string, event map[string]interface{}) {
	body, err := json.Marshal(event)
	if err != nil {
		log.Printf("[INVOICE] Failed to marshal event: %v", err)
		return
	}

	err = p.channel.Publish(
		ExchangeName,
		routingKey,
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)
	if err != nil {
		log.Printf("[INVOICE] Failed to publish event %s: %v", routingKey, err)
	} else {
		log.Printf("[INVOICE] Published event: %s", routingKey)
	}
}
