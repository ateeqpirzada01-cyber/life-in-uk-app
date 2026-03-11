import { create } from 'zustand';
import { CategoryStats, Profile } from '@/src/types';

interface ProgressState {
  profile: Profile | null;
  categoryStats: CategoryStats[];
  topicsRead: string[];
  totalQuestionsAnswered: number;
  totalCorrect: number;
  mockExamsPassed: number;
  recentMockScores: number[];

  setProfile: (profile: Profile) => void;
  updateXP: (amount: number) => void;
  setCategoryStats: (stats: CategoryStats[]) => void;
  setTopicsRead: (topicIds: string[]) => void;
  addTopicRead: (topicId: string) => void;
  setStats: (stats: { totalAnswered: number; totalCorrect: number; mocksPassed: number; recentScores: number[] }) => void;
  updateStreak: (current: number, longest: number) => void;
  setReadinessScore: (score: number) => void;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  profile: null,
  categoryStats: [],
  topicsRead: [],
  totalQuestionsAnswered: 0,
  totalCorrect: 0,
  mockExamsPassed: 0,
  recentMockScores: [],

  setProfile: (profile) => set({ profile }),

  updateXP: (amount) => {
    const { profile } = get();
    if (profile) {
      set({
        profile: { ...profile, total_xp: profile.total_xp + amount },
      });
    }
  },

  setCategoryStats: (stats) => set({ categoryStats: stats }),

  setTopicsRead: (topicIds) => set({ topicsRead: topicIds }),

  addTopicRead: (topicId) => {
    const { topicsRead } = get();
    if (!topicsRead.includes(topicId)) {
      set({ topicsRead: [...topicsRead, topicId] });
    }
  },

  setStats: ({ totalAnswered, totalCorrect, mocksPassed, recentScores }) => {
    set({
      totalQuestionsAnswered: totalAnswered,
      totalCorrect: totalCorrect,
      mockExamsPassed: mocksPassed,
      recentMockScores: recentScores,
    });
  },

  updateStreak: (current, longest) => {
    const { profile } = get();
    if (profile) {
      set({
        profile: { ...profile, current_streak: current, longest_streak: longest },
      });
    }
  },

  setReadinessScore: (score) => {
    const { profile } = get();
    if (profile) {
      set({
        profile: { ...profile, exam_readiness_score: score },
      });
    }
  },
}));
