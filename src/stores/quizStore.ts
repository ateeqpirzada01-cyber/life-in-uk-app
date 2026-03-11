import { create } from 'zustand';
import { Question } from '@/src/types';

interface QuizState {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string[]>;
  isComplete: boolean;
  topicId: string | null;
  context: 'quiz' | 'spaced_review';

  startQuiz: (questions: Question[], topicId?: string, context?: 'quiz' | 'spaced_review') => void;
  answerQuestion: (questionId: string, selectedOptionIds: string[]) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  skipQuestion: () => void;
  completeQuiz: () => void;
  reset: () => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  questions: [],
  currentIndex: 0,
  answers: {},
  isComplete: false,
  topicId: null,
  context: 'quiz',

  startQuiz: (questions, topicId, context = 'quiz') => {
    set({
      questions,
      currentIndex: 0,
      answers: {},
      isComplete: false,
      topicId: topicId ?? null,
      context,
    });
  },

  answerQuestion: (questionId, selectedOptionIds) => {
    set((state) => ({
      answers: { ...state.answers, [questionId]: selectedOptionIds },
    }));
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get();
    if (currentIndex < questions.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  previousQuestion: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },

  skipQuestion: () => {
    const { currentIndex, questions } = get();
    if (currentIndex < questions.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  completeQuiz: () => {
    set({ isComplete: true });
  },

  reset: () => {
    set({
      questions: [],
      currentIndex: 0,
      answers: {},
      isComplete: false,
      topicId: null,
      context: 'quiz',
    });
  },
}));
