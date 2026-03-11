import { getDatabase } from '@/src/lib/database';
import { SpacedRepetitionCard, Question } from '@/src/types';
import * as Crypto from 'expo-crypto';
import { format, addDays } from 'date-fns';

// SM-2 Algorithm implementation
export const spacedRepetitionService = {
  async processAnswer(
    userId: string,
    questionId: string,
    isCorrect: boolean
  ): Promise<void> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<any>(
      'SELECT * FROM spaced_repetition_cards WHERE user_id = ? AND question_id = ?',
      [userId, questionId]
    );

    const now = new Date();

    if (existing) {
      const card = parseCardRow(existing);
      const updated = calculateNextReview(card, isCorrect);

      await db.runAsync(
        `UPDATE spaced_repetition_cards
         SET ease_factor = ?, interval_days = ?, repetitions = ?, next_review_date = ?, updated_at = ?, synced = 0
         WHERE id = ?`,
        [updated.ease_factor ?? card.ease_factor, updated.interval_days ?? card.interval_days, updated.repetitions ?? card.repetitions, updated.next_review_date ?? card.next_review_date, now.toISOString(), card.id]
      );
    } else {
      const nextReview = isCorrect
        ? format(addDays(now, 1), 'yyyy-MM-dd')
        : format(now, 'yyyy-MM-dd'); // Review again today if wrong

      await db.runAsync(
        `INSERT INTO spaced_repetition_cards (id, user_id, question_id, ease_factor, interval_days, repetitions, next_review_date, updated_at, synced)
         VALUES (?, ?, ?, 2.5, ?, ?, ?, ?, 0)`,
        [Crypto.randomUUID(), userId, questionId, isCorrect ? 1 : 0, isCorrect ? 1 : 0, nextReview, now.toISOString()]
      );
    }
  },

  async getDueCards(userId: string, limit: number = 20): Promise<Question[]> {
    const db = await getDatabase();
    const today = format(new Date(), 'yyyy-MM-dd');

    const rows = await db.getAllAsync<any>(
      `SELECT q.* FROM spaced_repetition_cards sr
       JOIN questions q ON sr.question_id = q.id
       WHERE sr.user_id = ? AND sr.next_review_date <= ?
       ORDER BY sr.next_review_date ASC
       LIMIT ?`,
      [userId, today, limit]
    );

    return rows.map((row: any) => ({
      ...row,
      options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      correct_option_ids: typeof row.correct_option_ids === 'string' ? JSON.parse(row.correct_option_ids) : row.correct_option_ids,
    }));
  },

  async getDueCount(userId: string): Promise<number> {
    const db = await getDatabase();
    const today = format(new Date(), 'yyyy-MM-dd');

    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM spaced_repetition_cards
       WHERE user_id = ? AND next_review_date <= ?`,
      [userId, today]
    );

    return result?.count ?? 0;
  },

  async getCardStats(userId: string): Promise<{ total: number; due: number; mature: number }> {
    const db = await getDatabase();
    const today = format(new Date(), 'yyyy-MM-dd');

    const result = await db.getFirstAsync<{ total: number; due: number; mature: number }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN next_review_date <= ? THEN 1 ELSE 0 END) as due,
        SUM(CASE WHEN interval_days >= 21 THEN 1 ELSE 0 END) as mature
       FROM spaced_repetition_cards WHERE user_id = ?`,
      [today, userId]
    );

    return {
      total: result?.total ?? 0,
      due: result?.due ?? 0,
      mature: result?.mature ?? 0,
    };
  },
};

function calculateNextReview(
  card: SpacedRepetitionCard,
  isCorrect: boolean
): Partial<SpacedRepetitionCard> {
  if (!isCorrect) {
    // Reset on incorrect
    return {
      ease_factor: Math.max(1.3, card.ease_factor - 0.2),
      interval_days: 1,
      repetitions: 0,
      next_review_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    };
  }

  const repetitions = card.repetitions + 1;
  let interval: number;

  if (repetitions === 1) {
    interval = 1;
  } else if (repetitions === 2) {
    interval = 6;
  } else {
    interval = Math.round(card.interval_days * card.ease_factor);
  }

  const easeFactor = Math.max(1.3, card.ease_factor + 0.1 - 0.08 + 0.02);

  return {
    ease_factor: easeFactor,
    interval_days: interval,
    repetitions,
    next_review_date: format(addDays(new Date(), interval), 'yyyy-MM-dd'),
  };
}

function parseCardRow(row: any): SpacedRepetitionCard {
  return {
    id: row.id,
    user_id: row.user_id,
    question_id: row.question_id,
    ease_factor: row.ease_factor,
    interval_days: row.interval_days,
    repetitions: row.repetitions,
    next_review_date: row.next_review_date,
    updated_at: row.updated_at,
  };
}
