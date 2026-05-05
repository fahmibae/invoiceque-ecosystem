-- Add reminder_sent column to track whether expiry reminder has been sent
DO $$ BEGIN
    ALTER TABLE subscription_transactions ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
