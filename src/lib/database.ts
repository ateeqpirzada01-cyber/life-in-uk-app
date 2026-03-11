import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Thread-safe singleton — prevents race condition when multiple components
// call getDatabase() concurrently during startup
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return Promise.resolve(db);
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const database = await SQLite.openDatabaseAsync('lifeinuk.db');
    await initializeDatabase(database);
    db = database;
    return database;
  })();

  return dbPromise;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      study_content TEXT NOT NULL DEFAULT '{}',
      display_order INTEGER NOT NULL DEFAULT 0,
      icon TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '',
      synced INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      options TEXT NOT NULL DEFAULT '[]',
      correct_option_ids TEXT NOT NULL DEFAULT '[]',
      explanation TEXT NOT NULL DEFAULT '',
      difficulty TEXT NOT NULL DEFAULT 'medium',
      synced INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (topic_id) REFERENCES topics(id)
    );

    CREATE TABLE IF NOT EXISTS question_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      selected_option_ids TEXT NOT NULL DEFAULT '[]',
      is_correct INTEGER NOT NULL DEFAULT 0,
      time_spent INTEGER NOT NULL DEFAULT 0,
      attempt_context TEXT NOT NULL DEFAULT 'quiz',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS spaced_repetition_cards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval_days INTEGER NOT NULL DEFAULT 1,
      repetitions INTEGER NOT NULL DEFAULT 0,
      next_review_date TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, question_id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS exam_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_ids TEXT NOT NULL DEFAULT '[]',
      answers TEXT NOT NULL DEFAULT '{}',
      score INTEGER NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0,
      time_taken INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS daily_streaks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      questions_answered INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, activity_date)
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL DEFAULT '',
      total_xp INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      exam_readiness_score REAL NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS topics_read (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      read_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, topic_id)
    );

    CREATE TABLE IF NOT EXISTS starred_questions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      starred_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, question_id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      synced INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS flashcard_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      flashcard_id TEXT NOT NULL,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval_days INTEGER NOT NULL DEFAULT 1,
      repetitions INTEGER NOT NULL DEFAULT 0,
      next_review_date TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, flashcard_id),
      FOREIGN KEY (flashcard_id) REFERENCES flashcards(id)
    );

    CREATE TABLE IF NOT EXISTS practice_test_results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      test_id TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      passed INTEGER NOT NULL DEFAULT 0,
      time_taken INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_subscription (
      user_id TEXT PRIMARY KEY,
      is_premium INTEGER NOT NULL DEFAULT 0,
      product_id TEXT,
      purchase_date TEXT,
      platform TEXT,
      expires_at TEXT,
      restored_at TEXT,
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS daily_usage (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      usage_date TEXT NOT NULL,
      quiz_count INTEGER NOT NULL DEFAULT 0,
      mock_exam_count INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, usage_date)
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'general',
      message TEXT NOT NULL DEFAULT '',
      rating INTEGER,
      app_version TEXT NOT NULL DEFAULT '',
      platform TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0
    );

    /* Performance indexes */
    CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_user ON question_attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_question ON question_attempts(question_id);
    CREATE INDEX IF NOT EXISTS idx_sr_cards_user ON spaced_repetition_cards(user_id);
    CREATE INDEX IF NOT EXISTS idx_sr_cards_review ON spaced_repetition_cards(next_review_date);
    CREATE INDEX IF NOT EXISTS idx_streaks_user_date ON daily_streaks(user_id, activity_date);
    CREATE INDEX IF NOT EXISTS idx_exam_user ON exam_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_starred_user ON starred_questions(user_id);
    CREATE INDEX IF NOT EXISTS idx_starred_question ON starred_questions(question_id);
    CREATE INDEX IF NOT EXISTS idx_flashcard_progress_user ON flashcard_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_flashcard_progress_review ON flashcard_progress(next_review_date);
    CREATE INDEX IF NOT EXISTS idx_practice_results_user ON practice_test_results(user_id);
    CREATE INDEX IF NOT EXISTS idx_practice_results_test ON practice_test_results(test_id);
    CREATE INDEX IF NOT EXISTS idx_topics_category ON topics(category);
    CREATE INDEX IF NOT EXISTS idx_topics_read_user ON topics_read(user_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_user_correct ON question_attempts(user_id, is_correct);
    CREATE INDEX IF NOT EXISTS idx_exam_user_status ON exam_sessions(user_id, status);

    /* Sync performance — partial indexes for unsynced rows */
    CREATE INDEX IF NOT EXISTS idx_attempts_unsynced ON question_attempts(user_id) WHERE synced = 0;
    CREATE INDEX IF NOT EXISTS idx_exam_unsynced ON exam_sessions(user_id) WHERE synced = 0;
    CREATE INDEX IF NOT EXISTS idx_sr_cards_unsynced ON spaced_repetition_cards(user_id) WHERE synced = 0;
    CREATE INDEX IF NOT EXISTS idx_streaks_unsynced ON daily_streaks(user_id) WHERE synced = 0;
    CREATE INDEX IF NOT EXISTS idx_achievements_unsynced ON user_achievements(user_id) WHERE synced = 0;
    CREATE INDEX IF NOT EXISTS idx_topics_read_unsynced ON topics_read(user_id) WHERE synced = 0;
    CREATE INDEX IF NOT EXISTS idx_starred_unsynced ON starred_questions(user_id) WHERE synced = 0;
    CREATE INDEX IF NOT EXISTS idx_flashcard_progress_unsynced ON flashcard_progress(user_id) WHERE synced = 0;
    CREATE INDEX IF NOT EXISTS idx_practice_results_unsynced ON practice_test_results(user_id) WHERE synced = 0;
    CREATE INDEX IF NOT EXISTS idx_exam_user_completed ON exam_sessions(user_id, status, completed_at DESC);

    /* Premium/Usage/Feedback indexes */
    CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage(user_id, usage_date);
    CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
    CREATE INDEX IF NOT EXISTS idx_daily_usage_unsynced ON daily_usage(user_id) WHERE synced = 0;
    CREATE INDEX IF NOT EXISTS idx_feedback_unsynced ON feedback(user_id) WHERE synced = 0;
    CREATE INDEX IF NOT EXISTS idx_subscription_unsynced ON user_subscription(user_id) WHERE synced = 0;
  `);
}

// Transaction-batched seeding — 10-50x faster than individual inserts
export async function seedFromBundledData(
  topics: any[],
  questions: any[]
) {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    for (const topic of topics) {
      await database.runAsync(
        `INSERT OR IGNORE INTO topics (id, category, title, study_content, display_order, icon, color, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [topic.id, topic.category, topic.title, JSON.stringify(topic.study_content), topic.display_order, topic.icon, topic.color]
      );
    }

    for (const q of questions) {
      await database.runAsync(
        `INSERT OR IGNORE INTO questions (id, topic_id, question_text, options, correct_option_ids, explanation, difficulty, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [q.id, q.topic_id, q.question_text, JSON.stringify(q.options), JSON.stringify(q.correct_option_ids), q.explanation, q.difficulty]
      );
    }
  });
}

export async function seedFlashcards(flashcards: any[]) {
  const database = await getDatabase();

  await database.withTransactionAsync(async () => {
    for (const fc of flashcards) {
      await database.runAsync(
        `INSERT OR IGNORE INTO flashcards (id, category, front, back, difficulty, synced)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [fc.id, fc.category, fc.front, fc.back, fc.difficulty]
      );
    }
  });
}

// Safe JSON parser — prevents crashes from corrupted SQLite data
export function safeParse<T>(val: unknown, fallback: T): T {
  if (typeof val !== 'string') return (val as T) ?? fallback;
  try { return JSON.parse(val); }
  catch { return fallback; }
}
