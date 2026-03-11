-- Additional indexes for starred_questions (table created in 001)
CREATE INDEX IF NOT EXISTS idx_starred_user_id ON starred_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_starred_question_id ON starred_questions(question_id);
