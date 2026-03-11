import { APP_CONFIG, XP_VALUES } from '@/src/constants/config';

export function calculateMockExamResult(score: number, totalQuestions?: number) {
  const total = totalQuestions ?? APP_CONFIG.MOCK_EXAM_QUESTIONS;
  const percentage = total > 0 ? (score / total) * 100 : 0;
  const passed = percentage >= APP_CONFIG.PASS_THRESHOLD * 100;

  return {
    score,
    total,
    percentage: Math.round(percentage),
    passed,
  };
}

export function calculateQuizXP(
  correctCount: number,
  wrongCount: number,
  isComplete: boolean
): number {
  let xp = 0;
  xp += correctCount * XP_VALUES.correct_answer;
  xp += wrongCount * XP_VALUES.wrong_answer;
  if (isComplete) xp += XP_VALUES.complete_quiz;
  return xp;
}

export function calculateMockExamXP(score: number, isPassed: boolean, isPerfect: boolean): number {
  let xp = XP_VALUES.complete_mock;
  if (isPassed) xp += XP_VALUES.pass_mock;
  if (isPerfect) xp += XP_VALUES.perfect_score;
  return xp;
}

export function calculateLevel(totalXP: number): { level: number; currentXP: number; nextLevelXP: number } {
  // Each level requires progressively more XP: level * 100
  let level = 1;
  let remainingXP = totalXP;

  while (remainingXP >= level * 100) {
    remainingXP -= level * 100;
    level++;
  }

  return {
    level,
    currentXP: remainingXP,
    nextLevelXP: level * 100,
  };
}

export function calculateStreakBonus(streakDay: number): number {
  return Math.min(XP_VALUES.daily_streak_base * streakDay, XP_VALUES.daily_streak_max);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}
