CREATE TABLE IF NOT EXISTS face_enrollments (
    user_id VARCHAR(64) PRIMARY KEY,
    email TEXT,
    embedding JSONB NOT NULL,
    quality JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kyc_records (
    user_id VARCHAR(64) PRIMARY KEY,
    email TEXT,
    verification_type TEXT,
    status TEXT NOT NULL,
    checks JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS verification_type TEXT;

ALTER TABLE face_enrollments
ALTER COLUMN user_id TYPE VARCHAR(64);

ALTER TABLE kyc_records
ALTER COLUMN user_id TYPE VARCHAR(64);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_face_enrollments_user'
    ) THEN
        ALTER TABLE face_enrollments
        ADD CONSTRAINT fk_face_enrollments_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_kyc_records_user'
    ) THEN
        ALTER TABLE kyc_records
        ADD CONSTRAINT fk_kyc_records_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_kyc_records_status
ON kyc_records(status);
