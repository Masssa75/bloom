-- Chat sessions with Moonshot context caching support
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Full conversation history (includes tool results)
  messages JSONB NOT NULL DEFAULT '[]',

  -- Moonshot cache info
  cache_id TEXT,                    -- Moonshot cache ID (e.g., "cache-abc123...")
  cache_expires_at TIMESTAMPTZ,     -- When the cache expires

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by child + user
CREATE INDEX idx_chat_sessions_child_user ON chat_sessions(child_id, user_id);

-- RLS policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can view own sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON chat_sessions FOR DELETE
  USING (auth.uid() = user_id);
