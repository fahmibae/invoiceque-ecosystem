import json
from datetime import UTC, datetime
from typing import Any

import numpy as np
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool


class VisionStorage:
    def __init__(self, db_url: str) -> None:
        if not db_url:
            raise RuntimeError(
                "COMPUTER_VISION_DB_URL, DATABASE_URL, or AUTH_DB_URL must be set"
            )
        self._pool = ConnectionPool(
            conninfo=db_url,
            min_size=1,
            max_size=5,
            check=ConnectionPool.check_connection,
            kwargs={"row_factory": dict_row},
        )
        self._migrate()

    def _migrate(self) -> None:
        with self._pool.connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS face_enrollments (
                    user_id VARCHAR(64) PRIMARY KEY,
                    email TEXT,
                    embedding JSONB NOT NULL,
                    quality JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS kyc_records (
                    user_id VARCHAR(64) PRIMARY KEY,
                    email TEXT,
                    verification_type TEXT,
                    status TEXT NOT NULL,
                    checks JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            conn.execute(
                """
                ALTER TABLE kyc_records
                ADD COLUMN IF NOT EXISTS verification_type TEXT
                """
            )
            conn.execute(
                """
                ALTER TABLE face_enrollments
                ALTER COLUMN user_id TYPE VARCHAR(64)
                """
            )
            conn.execute(
                """
                ALTER TABLE kyc_records
                ALTER COLUMN user_id TYPE VARCHAR(64)
                """
            )
            conn.execute(
                """
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
                """
            )
            conn.execute(
                """
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
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_kyc_records_status
                ON kyc_records(status)
                """
            )
            conn.commit()

    def save_face_enrollment(
        self,
        user_id: str,
        email: str | None,
        embedding: np.ndarray,
        quality: dict[str, Any],
    ) -> None:
        payload = json.dumps(embedding.astype(float).tolist())
        quality_payload = json.dumps(quality)
        with self._pool.connection() as conn:
            conn.execute(
                """
                INSERT INTO face_enrollments
                    (user_id, email, embedding, quality, created_at, updated_at)
                VALUES (%s, %s, %s::jsonb, %s::jsonb, NOW(), NOW())
                ON CONFLICT(user_id) DO UPDATE SET
                    email=EXCLUDED.email,
                    embedding=EXCLUDED.embedding,
                    quality=EXCLUDED.quality,
                    updated_at=NOW()
                """,
                (user_id, email, payload, quality_payload),
            )
            conn.commit()

    def get_face_enrollment(self, user_id: str) -> dict[str, Any] | None:
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                SELECT user_id, email, embedding, quality,
                       created_at::text AS created_at,
                       updated_at::text AS updated_at
                FROM face_enrollments
                WHERE user_id = %s
                """,
                (user_id,),
            ).fetchone()
        if row is None:
            return None

        embedding = row["embedding"]
        if isinstance(embedding, str):
            embedding = json.loads(embedding)

        return {
            "user_id": row["user_id"],
            "email": row["email"],
            "embedding": np.array(embedding, dtype=np.float32),
            "quality": row["quality"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def list_face_enrollments(self) -> list[dict[str, Any]]:
        with self._pool.connection() as conn:
            rows = conn.execute(
                """
                SELECT user_id, email, embedding, quality,
                       created_at::text AS created_at,
                       updated_at::text AS updated_at
                FROM face_enrollments
                """
            ).fetchall()

        enrollments: list[dict[str, Any]] = []
        for row in rows:
            embedding = row["embedding"]
            if isinstance(embedding, str):
                embedding = json.loads(embedding)

            enrollments.append(
                {
                    "user_id": row["user_id"],
                    "email": row["email"],
                    "embedding": np.array(embedding, dtype=np.float32),
                    "quality": row["quality"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                }
            )
        return enrollments

    def save_kyc_record(
        self,
        user_id: str,
        email: str | None,
        verification_type: str,
        status: str,
        checks: dict[str, Any],
    ) -> None:
        checks_payload = json.dumps(checks)
        with self._pool.connection() as conn:
            conn.execute(
                """
                INSERT INTO kyc_records
                    (user_id, email, verification_type, status, checks, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s::jsonb, NOW(), NOW())
                ON CONFLICT(user_id) DO UPDATE SET
                    email=EXCLUDED.email,
                    verification_type=EXCLUDED.verification_type,
                    status=EXCLUDED.status,
                    checks=EXCLUDED.checks,
                    updated_at=NOW()
                """,
                (user_id, email, verification_type, status, checks_payload),
            )
            conn.commit()

    def get_kyc_record(self, user_id: str) -> dict[str, Any] | None:
        with self._pool.connection() as conn:
            row = conn.execute(
                """
                SELECT user_id, email, verification_type, status, checks,
                       created_at::text AS created_at,
                       updated_at::text AS updated_at
                FROM kyc_records
                WHERE user_id = %s
                """,
                (user_id,),
            ).fetchone()
        if row is None:
            return None
        return {
            "user_id": row["user_id"],
            "email": row["email"],
            "verification_type": row["verification_type"],
            "status": row["status"],
            "checks": row["checks"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def health(self) -> dict[str, Any]:
        with self._pool.connection() as conn:
            row = conn.execute("SELECT NOW()::text AS now").fetchone()
        return {"database": "neon", "connected": True, "server_time": row["now"]}

    def close(self) -> None:
        self._pool.close()


def now_iso() -> str:
    return datetime.now(UTC).isoformat()
