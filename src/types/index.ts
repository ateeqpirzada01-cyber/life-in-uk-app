// ==================== Database Types ====================

export type Category = 'history' | 'government' | 'traditions' | 'values' | 'everyday';

export interface Profile {
  id: string;
  display_name: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  exam_readiness_score: number;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  category: Category;
  title: string;
  study_content: StudyContent;
  display_order: number;
  icon: string;
  color: string;
}

export interface StudyContent {
  sections: StudySection[];
}

export interface StudySection {
  type: 'heading' | 'paragraph' | 'key_fact' | 'image' | 'list';
  content: string;
  items?: string[];
}

export interface Question {
  id: string;
  topic_id: string;
  question_text: string;
  options: QuestionOption[];
  correct_option_ids: string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  handbook_ref?: string;
  frequently_tested?: boolean;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionAttempt {
  id: string;
  user_id: string;
  question_id: string;
  selected_option_ids: string[];
  is_correct: boolean;
  time_spent: number;
  attempt_context: 'quiz' | 'mock_exam' | 'spaced_review' | 'starred' | 'daily_challenge';
  created_at: string;
}

export interface SpacedRepetitionCard {
  id: string;
  user_id: string;
  question_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
  updated_at: string;
}

export interface ExamSession {
  id: string;
  user_id: string;
  question_ids: string[];
  answers: Record<string, string[]>;
  score: number;
  passed: boolean;
  time_taken: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
  completed_at: string | null;
}

export interface DailyStreak {
  id: string;
  user_id: string;
  activity_date: string;
  xp_earned: number;
  questions_answered: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  condition_type: string;
  condition_value: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

// ==================== App Types ====================

export interface QuizState {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string[]>;
  isComplete: boolean;
}

export interface MockExamState {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string[]>;
  flaggedQuestions: Set<number>;
  timeRemaining: number;
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface CategoryStats {
  category: Category;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
}

export interface TimelineEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  image: string;
  category: Category;
  key_facts: string[];
}

export interface StarredQuestion {
  id: string;
  user_id: string;
  question_id: string;
  starred_at: string;
}

// ==================== Dynasty & Memory Aid Types ====================

export interface Monarch {
  id: string;
  name: string;
  reign: string;
  key_fact: string;
  notable: boolean;
}

export interface Dynasty {
  id: string;
  name: string;
  period: string;
  color: string;
  image?: string;
  monarchs: Monarch[];
}

export interface MemoryAidItem {
  [key: string]: any;
}

export interface MemoryAidCategory {
  id: string;
  title: string;
  type: 'grid' | 'cards' | 'timeline' | 'comparison' | 'list' | 'chart';
  icon: string;
  image?: string;
  items: MemoryAidItem[];
}

// ==================== Flashcard Types ====================

export interface Flashcard {
  id: string;
  category: Category;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface FlashcardProgress {
  id: string;
  user_id: string;
  flashcard_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
  updated_at: string;
}

// ==================== Practice Test Types ====================

export interface PracticeSet {
  id: string;
  title: string;
  description: string;
  tests: PracticeTest[];
}

export interface PracticeTest {
  id: string;
  title: string;
  description: string;
  question_ids: string[];
}

export interface PracticeTestResult {
  id: string;
  user_id: string;
  test_id: string;
  score: number;
  passed: boolean;
  time_taken: number;
  completed_at: string;
}

export interface XPAction {
  type: 'correct_answer' | 'wrong_answer' | 'complete_quiz' | 'complete_mock' | 'pass_mock' | 'perfect_score' | 'read_topic' | 'daily_streak';
  xp: number;
}

// ==================== Premium / Monetization Types ====================

export type PremiumFeature =
  | 'unlimited_quizzes'
  | 'unlimited_mocks'
  | 'practice_tests'
  | 'spaced_repetition'
  | 'flashcards'
  | 'starred_questions'
  | 'wrong_answers'
  | 'full_stats';

export interface SubscriptionStatus {
  user_id: string;
  is_premium: boolean;
  product_id: string | null;
  purchase_date: string | null;
  platform: 'ios' | 'android' | null;
  expires_at: string | null;
  restored_at: string | null;
  synced: number;
}

export interface DailyUsage {
  id: string;
  user_id: string;
  usage_date: string;
  quiz_count: number;
  mock_exam_count: number;
  synced: number;
}

export interface FeedbackEntry {
  id: string;
  user_id: string;
  type: 'bug' | 'feature' | 'content' | 'general';
  message: string;
  rating: number | null;
  app_version: string;
  platform: string;
  created_at: string;
  synced: number;
}
