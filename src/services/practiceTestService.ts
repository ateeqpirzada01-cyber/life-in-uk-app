import { getDatabase, safeParse } from '@/src/lib/database';
import { PracticeTest, PracticeSet, PracticeTestResult, Question } from '@/src/types';
import * as Crypto from 'expo-crypto';

const practiceData = require('@/assets/data/practice-tests.json');

// Support both old flat array and new sets structure
const practiceSets: PracticeSet[] = practiceData.practice_sets || [];
const flatTests: PracticeTest[] = Array.isArray(practiceData) ? practiceData : [];

// Build a flat list of all tests (from sets or flat)
const allTests: PracticeTest[] = practiceSets.length > 0
  ? practiceSets.flatMap((s) => s.tests)
  : flatTests;

export const practiceTestService = {
  getSets(): PracticeSet[] {
    return practiceSets;
  },

  getTests(): PracticeTest[] {
    return allTests;
  },

  getTest(testId: string): PracticeTest | undefined {
    return allTests.find((t) => t.id === testId);
  },

  async getTestQuestions(testId: string): Promise<Question[]> {
    const test = allTests.find((t) => t.id === testId);
    if (!test) return [];

    const db = await getDatabase();
    const placeholders = test.question_ids.map(() => '?').join(',');
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM questions WHERE id IN (${placeholders})`,
      test.question_ids
    );

    // Preserve the order from the test definition
    const questionMap = new Map(rows.map((r) => [r.id, r]));
    return test.question_ids
      .map((id) => questionMap.get(id))
      .filter(Boolean)
      .map((row: any) => ({
        ...row,
        options: safeParse(row.options, []),
        correct_option_ids: safeParse(row.correct_option_ids, []),
      }));
  },

  async getBestResult(userId: string, testId: string): Promise<PracticeTestResult | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM practice_test_results
       WHERE user_id = ? AND test_id = ?
       ORDER BY score DESC
       LIMIT 1`,
      [userId, testId]
    );

    if (!row) return null;
    return {
      ...row,
      passed: row.passed === 1,
    };
  },

  async getBestResults(userId: string, testIds: string[]): Promise<Record<string, PracticeTestResult>> {
    if (testIds.length === 0) return {};
    const db = await getDatabase();
    const placeholders = testIds.map(() => '?').join(',');
    // For each test_id, pick the row with the highest score using a window function
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY test_id ORDER BY score DESC) AS rn
         FROM practice_test_results
         WHERE user_id = ? AND test_id IN (${placeholders})
       ) WHERE rn = 1`,
      [userId, ...testIds]
    );
    const results: Record<string, PracticeTestResult> = {};
    for (const row of rows) {
      results[row.test_id] = { ...row, passed: row.passed === 1 };
      delete (results[row.test_id] as any).rn;
    }
    return results;
  },

  async getAllResults(userId: string): Promise<PracticeTestResult[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM practice_test_results WHERE user_id = ? ORDER BY completed_at DESC',
      [userId]
    );
    return rows.map((row) => ({
      ...row,
      passed: row.passed === 1,
    }));
  },

  async getPassedCount(userId: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(DISTINCT test_id) as count FROM practice_test_results
       WHERE user_id = ? AND passed = 1`,
      [userId]
    );
    return result?.count ?? 0;
  },

  async saveResult(
    userId: string,
    testId: string,
    score: number,
    passed: boolean,
    timeTaken: number
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO practice_test_results (id, user_id, test_id, score, passed, time_taken, completed_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 0)`,
      [Crypto.randomUUID(), userId, testId, score, passed ? 1 : 0, timeTaken]
    );
  },
};
