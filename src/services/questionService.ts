import { getDatabase, safeParse } from '@/src/lib/database';
import { Question, QuestionAttempt, Topic } from '@/src/types';
import { APP_CONFIG } from '@/src/constants/config';
import * as Crypto from 'expo-crypto';

// Fisher-Yates shuffle — avoids ORDER BY RANDOM() full table scans
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const questionService = {
  async getTopics(): Promise<Topic[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM topics ORDER BY display_order');
    return rows.map(parseTopicRow);
  },

  async getTopicsByCategory(category: string): Promise<Topic[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM topics WHERE category = ? ORDER BY display_order',
      [category]
    );
    return rows.map(parseTopicRow);
  },

  async getTopic(id: string): Promise<Topic | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>('SELECT * FROM topics WHERE id = ?', [id]);
    return row ? parseTopicRow(row) : null;
  },

  async getQuestionCountByTopic(topicId: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM questions WHERE topic_id = ?',
      [topicId]
    );
    return result?.count ?? 0;
  },

  async getQuestionsByTopic(topicId: string): Promise<Question[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM questions WHERE topic_id = ?',
      [topicId]
    );
    // Shuffle in-memory instead of ORDER BY RANDOM() (avoids full table scan)
    return shuffleArray(rows.map(parseQuestionRow));
  },

  async getRandomQuestions(count: number, excludeIds?: string[]): Promise<Question[]> {
    const db = await getDatabase();
    if (excludeIds?.length) {
      const placeholders = excludeIds.map(() => '?').join(',');
      const rows = await db.getAllAsync<any>(
        `SELECT * FROM questions WHERE id NOT IN (${placeholders})`,
        [...excludeIds]
      );
      return shuffleArray(rows.map(parseQuestionRow)).slice(0, count);
    }
    const rows = await db.getAllAsync<any>('SELECT * FROM questions');
    return shuffleArray(rows.map(parseQuestionRow)).slice(0, count);
  },

  async getMockExamQuestions(): Promise<Question[]> {
    const db = await getDatabase();
    const questionsPerCategory = Math.ceil(APP_CONFIG.MOCK_EXAM_QUESTIONS / 5);

    // Fetch all questions grouped by category, then shuffle in-memory
    const rows = await db.getAllAsync<any>(
      `SELECT q.*, t.category as _category FROM questions q
       JOIN topics t ON q.topic_id = t.id`
    );

    // Group by category, shuffle each group, take N per category
    const byCategory = new Map<string, any[]>();
    for (const row of rows) {
      const cat = row._category;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(row);
    }

    const selected: any[] = [];
    for (const [, catRows] of byCategory) {
      selected.push(...shuffleArray(catRows).slice(0, questionsPerCategory));
    }

    return shuffleArray(selected).slice(0, APP_CONFIG.MOCK_EXAM_QUESTIONS).map(parseQuestionRow);
  },

  async recordAttempt(
    userId: string,
    questionId: string,
    selectedOptionIds: string[],
    isCorrect: boolean,
    timeSpent: number,
    context: 'quiz' | 'mock_exam' | 'spaced_review' | 'starred'
  ): Promise<QuestionAttempt> {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO question_attempts (id, user_id, question_id, selected_option_ids, is_correct, time_spent, attempt_context, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, userId, questionId, JSON.stringify(selectedOptionIds), isCorrect ? 1 : 0, timeSpent, context, now]
    );

    return {
      id,
      user_id: userId,
      question_id: questionId,
      selected_option_ids: selectedOptionIds,
      is_correct: isCorrect,
      time_spent: timeSpent,
      attempt_context: context,
      created_at: now,
    };
  },

  async getQuestion(id: string): Promise<Question | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>('SELECT * FROM questions WHERE id = ?', [id]);
    return row ? parseQuestionRow(row) : null;
  },

  async getAllQuestions(limit: number = 500): Promise<Question[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM questions LIMIT ?', [limit]);
    return rows.map(parseQuestionRow);
  },

  async getWrongAnswers(userId: string, limit: number = 100): Promise<Question[]> {
    const db = await getDatabase();
    // Get questions answered incorrectly, excluding those answered correctly 3+ times since
    const rows = await db.getAllAsync<any>(
      `SELECT DISTINCT q.* FROM questions q
       INNER JOIN question_attempts qa ON q.id = qa.question_id
       WHERE qa.user_id = ? AND qa.is_correct = 0
       AND q.id NOT IN (
         SELECT question_id FROM question_attempts
         WHERE user_id = ? AND is_correct = 1
         GROUP BY question_id
         HAVING COUNT(*) >= 3
       )
       ORDER BY q.id
       LIMIT ?`,
      [userId, userId, limit]
    );
    return rows.map(parseQuestionRow);
  },

  async getWrongAnswerCount(userId: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(DISTINCT qa.question_id) as count
       FROM question_attempts qa
       WHERE qa.user_id = ? AND qa.is_correct = 0
       AND qa.question_id NOT IN (
         SELECT question_id FROM question_attempts
         WHERE user_id = ? AND is_correct = 1
         GROUP BY question_id
         HAVING COUNT(*) >= 3
       )`,
      [userId, userId]
    );
    return result?.count ?? 0;
  },

  async getQuestionsByCategory(category: string, count?: number): Promise<Question[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT q.* FROM questions q
       JOIN topics t ON q.topic_id = t.id
       WHERE t.category = ?`,
      [category]
    );
    const parsed = shuffleArray(rows.map(parseQuestionRow));
    return count ? parsed.slice(0, count) : parsed;
  },

  async getTopicStats(userId: string): Promise<{ topicId: string; total: number; correct: number; accuracy: number }[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ topic_id: string; total: number; correct: number }>(
      `SELECT q.topic_id, COUNT(*) as total,
              SUM(CASE WHEN qa.is_correct = 1 THEN 1 ELSE 0 END) as correct
       FROM question_attempts qa
       JOIN questions q ON qa.question_id = q.id
       WHERE qa.user_id = ?
       GROUP BY q.topic_id`,
      [userId]
    );
    return rows.map(r => ({
      topicId: r.topic_id,
      total: r.total,
      correct: r.correct,
      accuracy: r.total > 0 ? (r.correct / r.total) * 100 : 0,
    }));
  },
};

function parseTopicRow(row: any): Topic {
  return {
    ...row,
    study_content: safeParse(row.study_content, {}),
  };
}

function parseQuestionRow(row: any): Question {
  return {
    ...row,
    options: safeParse(row.options, []),
    correct_option_ids: safeParse(row.correct_option_ids, []),
  };
}
