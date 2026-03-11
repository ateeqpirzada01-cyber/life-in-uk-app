import { getDatabase } from '@/src/lib/database';
import { supabase } from '@/src/lib/supabase';
import { monitoring } from '@/src/lib/monitoring';

const BATCH_SIZE = 50;
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 2000];

let isSyncing = false;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertWithRetry(
  table: string,
  rows: any[]
): Promise<boolean> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { error } = await supabase.from(table).upsert(rows);
    if (!error) return true;

    if (attempt < MAX_RETRIES) {
      await delay(RETRY_DELAYS[attempt]);
    } else {
      monitoring.captureException(
        new Error(`Sync failed for ${table} after ${MAX_RETRIES + 1} attempts: ${error.message}`),
        { table, rowCount: rows.length }
      );
    }
  }
  return false;
}

async function syncBatch(
  table: string,
  rows: any[],
  transform?: (row: any) => any
): Promise<string[]> {
  const transformed = transform ? rows.map(transform) : rows;
  const batches = chunk(transformed, BATCH_SIZE);
  const originalBatches = chunk(rows, BATCH_SIZE);
  const syncedIds: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    const success = await upsertWithRetry(table, batches[i]);
    if (success) {
      syncedIds.push(...originalBatches[i].map((r: any) => r.id));
    }
  }

  return syncedIds;
}

const ALLOWED_SYNC_TABLES = new Set([
  'question_attempts', 'exam_sessions', 'spaced_repetition_cards',
  'daily_streaks', 'user_profile', 'user_achievements', 'topics_read',
  'starred_questions', 'flashcard_progress', 'practice_test_results',
  'user_subscription', 'daily_usage', 'feedback',
]);

async function markSynced(table: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!ALLOWED_SYNC_TABLES.has(table)) {
    throw new Error(`Invalid sync table: ${table}`);
  }
  const db = await getDatabase();
  const batches = chunk(ids, BATCH_SIZE);
  for (const batch of batches) {
    await db.runAsync(
      `UPDATE ${table} SET synced = 1 WHERE id IN (${batch.map(() => '?').join(',')})`,
      batch
    );
  }
}

export const syncService = {
  async syncAll(userId: string): Promise<void> {
    if (isSyncing) return;
    isSyncing = true;

    try {
      const results = await Promise.allSettled([
        this.syncAttempts(userId),
        this.syncExamSessions(userId),
        this.syncSRCards(userId),
        this.syncStreaks(userId),
        this.syncProfile(userId),
        this.syncAchievements(userId),
        this.syncTopicsRead(userId),
        this.syncStarred(userId),
        this.syncFlashcardProgress(userId),
        this.syncPracticeTestResults(userId),
        this.syncSubscription(userId),
        this.syncDailyUsage(userId),
        this.syncFeedback(userId),
      ]);

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        monitoring.captureMessage(`Sync: ${failures.length}/13 operations failed`, 'warning');
      }
    } finally {
      isSyncing = false;
    }
  },

  async syncAttempts(userId: string): Promise<void> {
    const db = await getDatabase();
    const unsynced = await db.getAllAsync<any>(
      'SELECT * FROM question_attempts WHERE synced = 0 AND user_id = ?',
      [userId]
    );
    if (unsynced.length === 0) return;

    const syncedIds = await syncBatch('question_attempts', unsynced, (row) => ({
      id: row.id,
      user_id: row.user_id,
      question_id: row.question_id,
      selected_option_ids: JSON.parse(row.selected_option_ids),
      is_correct: row.is_correct === 1,
      time_spent: row.time_spent,
      attempt_context: row.attempt_context,
      created_at: row.created_at,
    }));

    await markSynced('question_attempts', syncedIds);
  },

  async syncExamSessions(userId: string): Promise<void> {
    const db = await getDatabase();
    const unsynced = await db.getAllAsync<any>(
      'SELECT * FROM exam_sessions WHERE synced = 0 AND user_id = ?',
      [userId]
    );
    if (unsynced.length === 0) return;

    const syncedIds = await syncBatch('exam_sessions', unsynced, (row) => ({
      id: row.id,
      user_id: row.user_id,
      question_ids: JSON.parse(row.question_ids),
      answers: JSON.parse(row.answers),
      score: row.score,
      passed: row.passed === 1,
      time_taken: row.time_taken,
      status: row.status,
      created_at: row.created_at,
      completed_at: row.completed_at,
    }));

    await markSynced('exam_sessions', syncedIds);
  },

  async syncSRCards(userId: string): Promise<void> {
    const db = await getDatabase();
    const unsynced = await db.getAllAsync<any>(
      'SELECT * FROM spaced_repetition_cards WHERE synced = 0 AND user_id = ?',
      [userId]
    );
    if (unsynced.length === 0) return;

    const syncedIds = await syncBatch('spaced_repetition_cards', unsynced);
    await markSynced('spaced_repetition_cards', syncedIds);
  },

  async syncStreaks(userId: string): Promise<void> {
    const db = await getDatabase();
    const unsynced = await db.getAllAsync<any>(
      'SELECT * FROM daily_streaks WHERE synced = 0 AND user_id = ?',
      [userId]
    );
    if (unsynced.length === 0) return;

    const syncedIds = await syncBatch('daily_streaks', unsynced);
    await markSynced('daily_streaks', syncedIds);
  },

  async syncProfile(userId: string): Promise<void> {
    const db = await getDatabase();
    const profile = await db.getFirstAsync<any>(
      'SELECT * FROM user_profile WHERE id = ? AND synced = 0',
      [userId]
    );
    if (!profile) return;

    const row = {
      id: profile.id,
      display_name: profile.display_name,
      total_xp: profile.total_xp,
      current_streak: profile.current_streak,
      longest_streak: profile.longest_streak,
      exam_readiness_score: profile.exam_readiness_score,
    };

    const success = await upsertWithRetry('profiles', [row]);
    if (success) {
      await db.runAsync('UPDATE user_profile SET synced = 1 WHERE id = ?', [userId]);
    }
  },

  async syncAchievements(userId: string): Promise<void> {
    const db = await getDatabase();
    const unsynced = await db.getAllAsync<any>(
      'SELECT * FROM user_achievements WHERE synced = 0 AND user_id = ?',
      [userId]
    );
    if (unsynced.length === 0) return;

    const syncedIds = await syncBatch('user_achievements', unsynced);
    await markSynced('user_achievements', syncedIds);
  },

  async syncTopicsRead(userId: string): Promise<void> {
    const db = await getDatabase();
    const unsynced = await db.getAllAsync<any>(
      'SELECT * FROM topics_read WHERE synced = 0 AND user_id = ?',
      [userId]
    );
    if (unsynced.length === 0) return;

    const syncedIds = await syncBatch('topics_read', unsynced);
    await markSynced('topics_read', syncedIds);
  },

  async syncStarred(userId: string): Promise<void> {
    const db = await getDatabase();
    const unsynced = await db.getAllAsync<any>(
      'SELECT * FROM starred_questions WHERE synced = 0 AND user_id = ?',
      [userId]
    );
    if (unsynced.length === 0) return;

    const syncedIds = await syncBatch('starred_questions', unsynced);
    await markSynced('starred_questions', syncedIds);
  },

  async syncFlashcardProgress(userId: string): Promise<void> {
    const db = await getDatabase();
    const unsynced = await db.getAllAsync<any>(
      'SELECT * FROM flashcard_progress WHERE synced = 0 AND user_id = ?',
      [userId]
    );
    if (unsynced.length === 0) return;

    const syncedIds = await syncBatch('flashcard_progress', unsynced);
    await markSynced('flashcard_progress', syncedIds);
  },

  async syncPracticeTestResults(userId: string): Promise<void> {
    const db = await getDatabase();
    const unsynced = await db.getAllAsync<any>(
      'SELECT * FROM practice_test_results WHERE synced = 0 AND user_id = ?',
      [userId]
    );
    if (unsynced.length === 0) return;

    const syncedIds = await syncBatch('practice_test_results', unsynced, (row) => ({
      ...row,
      passed: row.passed === 1,
    }));

    await markSynced('practice_test_results', syncedIds);
  },

  async syncSubscription(userId: string): Promise<void> {
    const db = await getDatabase();
    const sub = await db.getFirstAsync<any>(
      'SELECT * FROM user_subscription WHERE user_id = ? AND synced = 0',
      [userId]
    );
    if (!sub) return;

    const row = { ...sub, is_premium: sub.is_premium === 1 };
    const success = await upsertWithRetry('user_subscription', [row]);
    if (success) {
      await db.runAsync(
        'UPDATE user_subscription SET synced = 1 WHERE user_id = ?',
        [userId]
      );
    }
  },

  async syncDailyUsage(userId: string): Promise<void> {
    const db = await getDatabase();
    const unsynced = await db.getAllAsync<any>(
      'SELECT * FROM daily_usage WHERE synced = 0 AND user_id = ?',
      [userId]
    );
    if (unsynced.length === 0) return;

    const syncedIds = await syncBatch('daily_usage', unsynced);
    await markSynced('daily_usage', syncedIds);
  },

  async syncFeedback(userId: string): Promise<void> {
    const db = await getDatabase();
    const unsynced = await db.getAllAsync<any>(
      'SELECT * FROM feedback WHERE synced = 0 AND user_id = ?',
      [userId]
    );
    if (unsynced.length === 0) return;

    const syncedIds = await syncBatch('feedback', unsynced);
    await markSynced('feedback', syncedIds);
  },
};
