-- Additional indexes for practice_test_results (table created in 001)
CREATE INDEX IF NOT EXISTS idx_practice_results_user ON practice_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_results_test ON practice_test_results(test_id);
