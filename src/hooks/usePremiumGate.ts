import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { usePremiumStore } from '@/src/stores/premiumStore';
import { useAuthStore } from '@/src/stores/authStore';
import { subscriptionService } from '@/src/services/subscriptionService';
import { PremiumFeature } from '@/src/types';
import { FREE_TIER_LIMITS } from '@/src/constants/config';

export function usePremiumGate() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isPremium = usePremiumStore((s) => s.isPremium());
  const canStartQuiz = usePremiumStore((s) => s.canStartQuiz());
  const remaining = usePremiumStore((s) => s.remainingQuizzes());
  const [totalMockExams, setTotalMockExams] = useState(0);

  useEffect(() => {
    if (user && !isPremium) {
      subscriptionService.getTotalMockExams(user.id).then(setTotalMockExams);
    }
  }, [user, isPremium]);

  const canAccess = useCallback(
    (feature: PremiumFeature): boolean => {
      if (isPremium) return true;
      return false;
    },
    [isPremium]
  );

  const canStartMockExam = isPremium || totalMockExams < FREE_TIER_LIMITS.TOTAL_MOCK_EXAMS;

  const gatedNavigate = useCallback(
    (feature: PremiumFeature, route: string) => {
      if (isPremium || canAccess(feature)) {
        router.push(route as any);
      } else {
        router.push('/(tabs)/practice/premium' as any);
      }
    },
    [isPremium, canAccess, router]
  );

  return {
    isPremium,
    canAccess,
    canStartQuiz,
    canStartMockExam,
    remainingQuizzes: remaining,
    totalMockExams,
    gatedNavigate,
  };
}
