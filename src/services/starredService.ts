import { getDatabase } from '@/src/lib/database';
import { Question } from '@/src/types';
import * as Crypto from 'expo-crypto';

export const starredService = {
  async toggle(userId: string, questionId: string): Promise<boolean> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<any>(
      'SELECT id FROM starred_questions WHERE user_id = ? AND question_id = ?',
      [userId, questionId]
    );

    if (existing) {
      await db.runAsync('DELETE FROM starred_questions WHERE id = ?', [existing.id]);
      return false; // unstarred
    } else {
      await db.runAsync(
        `INSERT INTO starred_questions (id, user_id, question_id, starred_at, synced)
         VALUES (?, ?, ?, datetime('now'), 0)`,
        [Crypto.randomUUID(), userId, questionId]
      );
      return true; // starred
    }
  },

  async isStarred(userId: string, questionId: string): Promise<boolean> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT id FROM starred_questions WHERE user_id = ? AND question_id = ?',
      [userId, questionId]
    );
    return !!row;
  },

  async getStarredQuestions(userId: string): Promise<Question[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT q.* FROM starred_questions sq
       JOIN questions q ON sq.question_id = q.id
       WHERE sq.user_id = ?
       ORDER BY sq.starred_at DESC`,
      [userId]
    );

    return rows.map((row: any) => ({
      ...row,
      options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options,
      correct_option_ids: typeof row.correct_option_ids === 'string' ? JSON.parse(row.correct_option_ids) : row.correct_option_ids,
    }));
  },

  async getStarredCount(userId: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM starred_questions WHERE user_id = ?',
      [userId]
    );
    return result?.count ?? 0;
  },

  async getStarredIds(userId: string): Promise<Set<string>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ question_id: string }>(
      'SELECT question_id FROM starred_questions WHERE user_id = ?',
      [userId]
    );
    return new Set(rows.map((r) => r.question_id));
  },
};
