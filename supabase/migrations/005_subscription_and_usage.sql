-- User subscription table (previously only in SQLite)
CREATE TABLE IF NOT EXISTS user_subscription (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  product_id TEXT,
  purchase_date TIMESTAMPTZ,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  expires_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_subscription ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON user_subscription FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON user_subscription FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON user_subscription FOR UPDATE
  USING (auth.uid() = user_id);

-- Daily usage table (previously only in SQLite)
CREATE TABLE IF NOT EXISTS daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  quiz_count INTEGER NOT NULL DEFAULT 0,
  mock_exam_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);

ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily usage"
  ON daily_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily usage"
  ON daily_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily usage"
  ON daily_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_daily_usage_user_date ON daily_usage(user_id, usage_date DESC);

-- Prevent modification of completed exam scores
CREATE OR REPLACE FUNCTION prevent_completed_exam_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    IF NEW.score != OLD.score OR NEW.passed != OLD.passed THEN
      RAISE EXCEPTION 'Cannot modify completed exam results';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_completed_exams
  BEFORE UPDATE ON exam_sessions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_completed_exam_modification();

-- Add composite indexes for sync performance
CREATE INDEX IF NOT EXISTS idx_attempts_user_synced ON question_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sr_cards_user_review ON spaced_repetition_cards(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_user ON flashcard_progress(user_id, next_review_date);
