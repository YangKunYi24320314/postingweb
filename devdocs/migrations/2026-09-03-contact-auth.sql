-- Existing installations: run this migration once before enabling contact auth.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_phone_check;

ALTER TABLE users
  ADD CONSTRAINT users_phone_check
  CHECK (phone IS NULL OR phone ~ '^1[3-9][0-9]{9}$');

CREATE TABLE IF NOT EXISTS verification_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(10) NOT NULL,
  target VARCHAR(100) NOT NULL,
  purpose VARCHAR(30) NOT NULL,
  code_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT verification_codes_channel_check CHECK (channel IN ('phone', 'email')),
  CONSTRAINT verification_codes_purpose_check CHECK (purpose IN ('bind', 'password_reset')),
  CONSTRAINT verification_codes_attempts_check CHECK (attempts >= 0 AND attempts <= 5)
);

CREATE INDEX IF NOT EXISTS verification_codes_lookup_idx
  ON verification_codes (user_id, channel, target, purpose, created_at DESC);
