package scheduler

import (
	"log"
	"time"

	"github.com/invoiceque/subscription-service/messaging"
	"github.com/invoiceque/subscription-service/repository"
)

// StartExpiryReminder runs a background ticker that checks for pending
// transactions about to expire (22+ hours old) and publishes reminder events.
func StartExpiryReminder(repo *repository.SubscriptionRepository, publisher *messaging.Publisher) {
	if publisher == nil {
		log.Println("[SCHEDULER] Publisher not available, expiry reminder disabled")
		return
	}

	ticker := time.NewTicker(15 * time.Minute)
	go func() {
		log.Println("[SCHEDULER] ✅ Expiry reminder scheduler started (every 15 min)")
		for range ticker.C {
			checkAndNotify(repo, publisher)
		}
	}()
}

func checkAndNotify(repo *repository.SubscriptionRepository, publisher *messaging.Publisher) {
	txs, err := repo.GetPendingTransactionsNearExpiry()
	if err != nil {
		log.Printf("[SCHEDULER] Failed to query near-expiry transactions: %v", err)
		return
	}

	if len(txs) == 0 {
		return
	}

	log.Printf("[SCHEDULER] Found %d transactions expiring soon", len(txs))

	for _, tx := range txs {
		// Get plan name
		plan, _ := repo.GetPlanByID(tx.PlanID)
		planName := ""
		if plan != nil {
			planName = plan.DisplayName
		}

		// Publish reminder event
		publisher.PublishCheckoutExpiringSoon(map[string]interface{}{
			"event_type":   "subscription.checkout_expiring_soon",
			"user_id":      tx.UserID,
			"plan_id":      tx.PlanID,
			"plan_name":    planName,
			"amount":       tx.Amount,
			"checkout_url": tx.CheckoutURL,
			"external_id":  tx.ExternalID,
		})

		// Mark reminder as sent to prevent duplicates
		if err := repo.MarkReminderSent(tx.ExternalID); err != nil {
			log.Printf("[SCHEDULER] Failed to mark reminder sent for %s: %v", tx.ExternalID, err)
		} else {
			log.Printf("[SCHEDULER] ✅ Reminder sent for transaction %s (user: %s)", tx.ExternalID, tx.UserID)
		}
	}
}
