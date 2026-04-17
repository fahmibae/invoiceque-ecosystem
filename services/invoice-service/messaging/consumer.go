package messaging

import (
	"encoding/json"
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

const PaymentUpdateQueue = "invoice.payment-update"

type PaymentEventConsumer struct {
	markAsPaid func(invoiceID string)
}

func NewPaymentEventConsumer(markAsPaidFn func(string)) *PaymentEventConsumer {
	return &PaymentEventConsumer{markAsPaid: markAsPaidFn}
}

func (c *PaymentEventConsumer) Start(conn *amqp.Connection) error {
	ch, err := conn.Channel()
	if err != nil {
		return err
	}

	// Declare queue (matches Java Queue)
	_, err = ch.QueueDeclare(
		PaymentUpdateQueue,
		true,  // durable
		false, // auto-delete
		false, // exclusive
		false, // no-wait
		nil,
	)
	if err != nil {
		return err
	}

	// Bind queue to exchange with routing key "payment.completed"
	err = ch.QueueBind(
		PaymentUpdateQueue,
		"payment.completed",
		ExchangeName,
		false,
		nil,
	)
	if err != nil {
		return err
	}

	msgs, err := ch.Consume(
		PaymentUpdateQueue,
		"invoice-payment-consumer",
		false, // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,
	)
	if err != nil {
		return err
	}

	go func() {
		for msg := range msgs {
			c.handleMessage(msg)
		}
	}()

	log.Printf("[INVOICE] Payment consumer started, listening on queue: %s", PaymentUpdateQueue)
	return nil
}

func (c *PaymentEventConsumer) handleMessage(msg amqp.Delivery) {
	var event map[string]interface{}
	if err := json.Unmarshal(msg.Body, &event); err != nil {
		log.Printf("[INVOICE] Failed to parse payment event: %v", err)
		msg.Nack(false, false)
		return
	}

	log.Printf("[INVOICE] Received payment.completed event: %v", event)

	invoiceID, ok := event["invoice_id"].(string)
	if !ok || invoiceID == "" {
		log.Println("[INVOICE] Payment event without invoice_id, skipping")
		msg.Ack(false)
		return
	}

	func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[INVOICE] Panic while processing payment event for invoice %s: %v", invoiceID, r)
				msg.Nack(false, true)
			}
		}()
		c.markAsPaid(invoiceID)
		log.Printf("[INVOICE] Successfully updated invoice %s to paid", invoiceID)
		msg.Ack(false)
	}()
}
