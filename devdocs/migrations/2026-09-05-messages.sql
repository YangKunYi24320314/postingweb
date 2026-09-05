CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT messages_not_self_check CHECK (sender_id <> receiver_id),
  CONSTRAINT messages_content_not_blank CHECK (length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_messages_pair_created_at
ON messages (
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at
);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_read
ON messages(receiver_id, read_at);
