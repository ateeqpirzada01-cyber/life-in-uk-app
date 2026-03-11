import { create } from 'zustand';
import { SubscriptionStatus, DailyUsage, PremiumFeature } from '@/src/types';
import { FREE_TIER_LIMITS } from '@/src/constants/config';
import { subscriptionService } from '@/src/services/subscriptionService';

interface PremiumState {
  subscription: SubscriptionStatus | null;
  dailyUsage: DailyUsage | null;
  initialized: boolean;
  isRestoring: boolean;

  initialize: (userId: string) => Promise<void>;
  isPremium: () => boolean;
  canAccessFeature: (feature: PremiumFeature) => boolean;
  canStartQuiz: () => boolean;
  canStartMockExam: () => boolean;
  remainingQuizzes: () => number;
  setSubscription: (sub: SubscriptionStatus) => void;
  refreshDailyUsage: (userId: string) => Promise<void>;
  setRestoring: (restoring: boolean) => void;
  reset: () => void;
}

export const usePremiumStore = create<PremiumState>((set, get) => ({
  subscription: null,
  dailyUsage: null,
  initialized: false,
  isRestoring: false,

  initialize: async (userId: string) => {
    try {
      const [sub, usage] = await Promise.all([
        subscriptionService.getSubscription(userId),
        subscriptionService.getDailyUsage(userId),
      ]);
      set({ subscription: sub, dailyUsage: usage, initialized: true });
    } catch (e) {
      console.warn('Failed to initialize premium store:', e);
      set({ initialized: true });
    }
  },

  isPremium: () => {
    const { subscription } = get();
    return subscription?.is_premium === true;
  },

  canAccessFeature: (feature: PremiumFeature) => {
    if (get().isPremium()) return true;
    // Free users cannot access premium-only features
    return false;
  },

  canStartQuiz: () => {
    if (get().isPremium()) return true;
    const { dailyUsage } = get();
    const used = dailyUsage?.quiz_count ?? 0;
    return used < FREE_TIER_LIMITS.DAILY_QUIZZES;
  },

  canStartMockExam: () => {
    if (get().isPremium()) return true;
    const { dailyUsage } = get();
    // Total mock exams across all daily_usage records is tracked via exam_sessions
    // For simplicity, we track total mock_exam_count in daily_usage
    const totalMocks = dailyUsage?.mock_exam_count ?? 0;
    // Free tier: only 1 mock exam total (we check from subscription service at init)
    return false; // Will be resolved via async check in the hook
  },

  remainingQuizzes: () => {
    if (get().isPremium()) return Infinity;
    const { dailyUsage } = get();
    const used = dailyUsage?.quiz_count ?? 0;
    return Math.max(0, FREE_TIER_LIMITS.DAILY_QUIZZES - used);
  },

  setSubscription: (sub: SubscriptionStatus) => {
    set({ subscription: sub });
  },

  refreshDailyUsage: async (userId: string) => {
    const usage = await subscriptionService.getDailyUsage(userId);
    set({ dailyUsage: usage });
  },

  setRestoring: (restoring: boolean) => set({ isRestoring: restoring }),

  reset: () => set({ subscription: null, dailyUsage: null, initialized: false, isRestoring: false }),
}));
