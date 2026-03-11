/**
 * Validates all question JSON files for structure, duplicates, and coverage.
 * Run with: npx tsx scripts/validate-questions.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface Question {
  id: string;
  topic_id: string;
  question_text: string;
  options: { id: string; text: string }[];
  correct_option_ids: string[];
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const DATA_DIR = path.join(__dirname, '..', 'assets', 'data');

const QUESTION_FILES = [
  'questions.json',
  'questions-history.json',
  'questions-government.json',
  'questions-traditions.json',
  'questions-values.json',
  'questions-everyday.json',
];

const VALID_TOPICS = [
  'topic_history_1', 'topic_history_2', 'topic_history_3', 'topic_history_4', 'topic_history_5',
  'topic_government_1', 'topic_government_2', 'topic_government_3', 'topic_government_4',
  'topic_traditions_1', 'topic_traditions_2', 'topic_traditions_3', 'topic_traditions_4',
  'topic_values_1', 'topic_values_2', 'topic_values_3', 'topic_values_4',
  'topic_everyday_1', 'topic_everyday_2', 'topic_everyday_3', 'topic_everyday_4',
];

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

let errors = 0;
let warnings = 0;
const allIds = new Set<string>();
const allQuestions: Question[] = [];

function error(msg: string) {
  console.error(`  ERROR: ${msg}`);
  errors++;
}

function warn(msg: string) {
  console.warn(`  WARN: ${msg}`);
  warnings++;
}

for (const file of QUESTION_FILES) {
  const filePath = path.join(DATA_DIR, file);
  console.log(`\nValidating ${file}...`);

  if (!fs.existsSync(filePath)) {
    error(`File not found: ${filePath}`);
    continue;
  }

  let questions: Question[];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    questions = JSON.parse(raw);
  } catch (e) {
    error(`Invalid JSON in ${file}: ${e}`);
    continue;
  }

  if (!Array.isArray(questions)) {
    error(`${file} is not an array`);
    continue;
  }

  console.log(`  Found ${questions.length} questions`);

  for (const q of questions) {
    // Check required fields
    if (!q.id) { error(`Missing id`); continue; }
    if (!q.topic_id) { error(`${q.id}: Missing topic_id`); }
    if (!q.question_text) { error(`${q.id}: Missing question_text`); }
    if (!q.explanation) { warn(`${q.id}: Missing explanation`); }

    // Check duplicate IDs
    if (allIds.has(q.id)) {
      error(`Duplicate ID: ${q.id}`);
    }
    allIds.add(q.id);

    // Check topic_id validity
    if (!VALID_TOPICS.includes(q.topic_id)) {
      error(`${q.id}: Invalid topic_id "${q.topic_id}"`);
    }

    // Check options
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      error(`${q.id}: Must have exactly 4 options (has ${q.options?.length ?? 0})`);
    } else {
      const optionIds = q.options.map(o => o.id);
      const expectedIds = ['a', 'b', 'c', 'd'];
      if (JSON.stringify(optionIds.sort()) !== JSON.stringify(expectedIds)) {
        error(`${q.id}: Option IDs must be a, b, c, d (got ${optionIds.join(', ')})`);
      }
    }

    // Check correct_option_ids
    if (!Array.isArray(q.correct_option_ids) || q.correct_option_ids.length === 0) {
      error(`${q.id}: Must have at least one correct_option_id`);
    } else {
      for (const id of q.correct_option_ids) {
        if (!['a', 'b', 'c', 'd'].includes(id)) {
          error(`${q.id}: Invalid correct_option_id "${id}"`);
        }
      }
    }

    // Check difficulty
    if (!VALID_DIFFICULTIES.includes(q.difficulty)) {
      error(`${q.id}: Invalid difficulty "${q.difficulty}" (must be easy/medium/hard)`);
    }

    allQuestions.push(q);
  }
}

// Summary statistics
console.log('\n=== SUMMARY ===');
console.log(`Total questions: ${allQuestions.length}`);

const byCategory: Record<string, number> = {};
const byDifficulty: Record<string, number> = {};
const byTopic: Record<string, number> = {};

for (const q of allQuestions) {
  const cat = q.topic_id?.split('_')[1] ?? 'unknown';
  byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] ?? 0) + 1;
  byTopic[q.topic_id] = (byTopic[q.topic_id] ?? 0) + 1;
}

console.log('\nBy category:');
for (const [cat, count] of Object.entries(byCategory).sort()) {
  console.log(`  ${cat}: ${count}`);
}

console.log('\nBy difficulty:');
for (const [diff, count] of Object.entries(byDifficulty).sort()) {
  console.log(`  ${diff}: ${count}`);
}

console.log('\nBy topic:');
for (const [topic, count] of Object.entries(byTopic).sort()) {
  console.log(`  ${topic}: ${count}`);
}

console.log(`\n${errors} errors, ${warnings} warnings`);
process.exit(errors > 0 ? 1 : 0);
