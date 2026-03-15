import { getDatabase } from '@/src/lib/database';
import { Flashcard } from '@/src/types';
import * as Crypto from 'expo-crypto';
import { format, addDays } from 'date-fns';

export const flashcardService = {
  async getDueFlashcards(userId: string, limit: number = 20): Promise<Flashcard[]> {
    const db = await getDatabase();
    const today = format(new Date(), 'yyyy-MM-dd');

    // Get flashcards that are due for review
    const dueRows = await db.getAllAsync<any>(
      `SELECT f.* FROM flashcard_progress fp
       JOIN flashcards f ON fp.flashcard_id = f.id
       WHERE fp.user_id = ? AND fp.next_review_date <= ?
       ORDER BY fp.next_review_date ASC
       LIMIT ?`,
      [userId, today, limit]
    );

    // If not enough due cards, add unseen flashcards
    const remaining = limit - dueRows.length;
    let unseenRows: any[] = [];
    if (remaining > 0) {
      const allUnseen = await db.getAllAsync<any>(
        `SELECT f.* FROM flashcards f
         LEFT JOIN flashcard_progress fp ON f.id = fp.flashcard_id AND fp.user_id = ?
         WHERE fp.id IS NULL`,
        [userId]
      );
      // Shuffle in-memory instead of ORDER BY RANDOM()
      for (let i = allUnseen.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allUnseen[i], allUnseen[j]] = [allUnseen[j], allUnseen[i]];
      }
      unseenRows = allUnseen.slice(0, remaining);
    }

    return [...dueRows, ...unseenRows].map(parseFlashcardRow);
  },

  async getDueCount(userId: string): Promise<number> {
    const db = await getDatabase();
    const today = format(new Date(), 'yyyy-MM-dd');

    // Single query: count due + unseen flashcards
    const result = await db.getFirstAsync<{ due: number; unseen: number }>(
      `SELECT
         (SELECT COUNT(*) FROM flashcard_progress WHERE user_id = ? AND next_review_date <= ?) as due,
         (SELECT COUNT(*) FROM flashcards WHERE id NOT IN (
           SELECT flashcard_id FROM flashcard_progress WHERE user_id = ?
         )) as unseen`,
      [userId, today, userId]
    );

    return (result?.due ?? 0) + (result?.unseen ?? 0);
  },

  async processAnswer(
    userId: string,
    flashcardId: string,
    quality: number // 0-5 scale: 0=complete fail, 3=correct with difficulty, 5=perfect
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date();
    const existing = await db.getFirstAsync<any>(
      'SELECT * FROM flashcard_progress WHERE user_id = ? AND flashcard_id = ?',
      [userId, flashcardId]
    );

    if (existing) {
      const updated = calculateSM2(
        existing.ease_factor,
        existing.interval_days,
        existing.repetitions,
        quality
      );

      await db.runAsync(
        `UPDATE flashcard_progress
         SET ease_factor = ?, interval_days = ?, repetitions = ?, next_review_date = ?, updated_at = ?, synced = 0
         WHERE id = ?`,
        [updated.easeFactor, updated.interval, updated.repetitions, updated.nextReview, now.toISOString(), existing.id]
      );
    } else {
      const updated = calculateSM2(2.5, 0, 0, quality);

      await db.runAsync(
        `INSERT INTO flashcard_progress (id, user_id, flashcard_id, ease_factor, interval_days, repetitions, next_review_date, updated_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [Crypto.randomUUID(), userId, flashcardId, updated.easeFactor, updated.interval, updated.repetitions, updated.nextReview, now.toISOString()]
      );
    }
  },
};

function calculateSM2(
  easeFactor: number,
  interval: number,
  repetitions: number,
  quality: number
): { easeFactor: number; interval: number; repetitions: number; nextReview: string } {
  const now = new Date();

  if (quality < 3) {
    // Failed — reset
    return {
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      interval: 1,
      repetitions: 0,
      nextReview: format(addDays(now, 1), 'yyyy-MM-dd'),
    };
  }

  const newRepetitions = repetitions + 1;
  let newInterval: number;

  if (newRepetitions === 1) {
    newInterval = 1;
  } else if (newRepetitions === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(interval * easeFactor);
  }

  const newEaseFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReview: format(addDays(now, newInterval), 'yyyy-MM-dd'),
  };
}

function parseFlashcardRow(row: any): Flashcard {
  return {
    id: row.id,
    category: row.category,
    front: row.front,
    back: row.back,
    difficulty: row.difficulty,
  };
}
