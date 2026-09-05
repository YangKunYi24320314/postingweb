CREATE TABLE IF NOT EXISTS friendships (
  id BIGSERIAL PRIMARY KEY,
  requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT friendships_status_check CHECK (status IN ('pending', 'accepted', 'rejected')),
  CONSTRAINT friendships_not_self_check CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_unique
ON friendships (
  LEAST(requester_id, addressee_id),
  GREATEST(requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester_status
ON friendships(requester_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee_status
ON friendships(addressee_id, status);
