-- Additional indexes for flashcard_progress (tables created in 001)
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_user ON flashcard_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_review ON flashcard_progress(next_review_date);
