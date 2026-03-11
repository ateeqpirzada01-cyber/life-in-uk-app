import { getDatabase } from '@/src/lib/database';
import { FeedbackEntry } from '@/src/types';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';

export const feedbackService = {
  async submitFeedback(
    userId: string,
    type: FeedbackEntry['type'],
    message: string,
    rating?: number
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO feedback (id, user_id, type, message, rating, app_version, platform, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)`,
      [
        Crypto.randomUUID(),
        userId,
        type,
        message,
        rating ?? null,
        Constants.expoConfig?.version ?? '1.0.0',
        Platform.OS,
      ]
    );
  },

  async getUserFeedback(userId: string): Promise<FeedbackEntry[]> {
    const db = await getDatabase();
    return db.getAllAsync<FeedbackEntry>(
      'SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
  },

  async shouldPromptRating(userId: string): Promise<boolean> {
    const db = await getDatabase();

    // Check if we already prompted (stored as a feedback entry with type 'rating_prompt')
    const prompted = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM feedback WHERE user_id = ? AND type = 'rating_prompt'",
      [userId]
    );
    if (prompted && prompted.count > 0) return false;

    // Check if user has passed at least one mock exam
    const passed = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM exam_sessions WHERE user_id = ? AND status = 'completed' AND passed = 1",
      [userId]
    );
    return (passed?.count ?? 0) >= 1;
  },

  async markRatingPrompted(userId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO feedback (id, user_id, type, message, rating, app_version, platform, created_at, synced)
       VALUES (?, ?, 'rating_prompt', 'prompted', NULL, ?, ?, datetime('now'), 0)`,
      [
        Crypto.randomUUID(),
        userId,
        Constants.expoConfig?.version ?? '1.0.0',
        Platform.OS,
      ]
    );
  },
};
