export const APP_CONFIG = {
  MOCK_EXAM_QUESTIONS: 24,
  MOCK_EXAM_TIME_MINUTES: 45,
  PASS_THRESHOLD: 0.75, // 75% to pass (18/24)
  SYNC_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  MAX_STREAK_BONUS_DAYS: 10,
};

export const XP_VALUES = {
  correct_answer: 10,
  wrong_answer: 2,
  complete_quiz: 20,
  complete_mock: 50,
  pass_mock: 100,
  perfect_score: 200,
  read_topic: 15,
  daily_streak_base: 5,
  daily_streak_max: 50,
  daily_challenge: 50,
} as const;

export const READINESS_WEIGHTS = {
  mockExamScores: 0.4,
  categoryCoverage: 0.25,
  minCategoryAccuracy: 0.25,
  srCardHealth: 0.1,
} as const;

export const CATEGORY_LABELS: Record<string, string> = {
  history: 'History',
  government: 'Government & Law',
  traditions: 'Traditions & Culture',
  values: 'Values & Principles',
  everyday: 'Everyday Life',
};

export const CATEGORY_COLORS: Record<string, string> = {
  history: '#ef4444',
  government: '#3b82f6',
  traditions: '#f59e0b',
  values: '#10b981',
  everyday: '#8b5cf6',
};

export const CATEGORY_ICONS: Record<string, string> = {
  history: 'book',
  government: 'landmark',
  traditions: 'party-popper',
  values: 'scale',
  everyday: 'home',
};

// ==================== Premium / Monetization ====================

export const FREE_TIER_LIMITS = {
  DAILY_QUIZZES: 3,
  TOTAL_MOCK_EXAMS: 1,
} as const;

export const PREMIUM_CONFIG = {
  PRODUCT_ID: 'lifeinuk_premium',
} as const;

export const PREMIUM_FEATURES = {
  unlimited_quizzes: { label: 'Unlimited Quizzes', icon: 'help-circle' },
  unlimited_mocks: { label: 'Unlimited Mock Exams', icon: 'timer' },
  practice_tests: { label: '100 Practice Tests', icon: 'document-text' },
  spaced_repetition: { label: 'Spaced Repetition', icon: 'refresh' },
  flashcards: { label: 'Flashcards', icon: 'copy' },
  starred_questions: { label: 'Starred Questions', icon: 'star' },
  wrong_answers: { label: 'Wrong Answers Review', icon: 'close-circle' },
  full_stats: { label: 'Full Statistics', icon: 'analytics' },
} as const;

export const FEEDBACK_TYPES = [
  { key: 'bug', label: 'Bug Report', icon: 'bug' },
  { key: 'feature', label: 'Feature Request', icon: 'bulb' },
  { key: 'content', label: 'Content Issue', icon: 'document-text' },
  { key: 'general', label: 'General', icon: 'chatbubble' },
] as const;
