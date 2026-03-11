import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { questionService } from '@/src/services/questionService';
import { progressService } from '@/src/services/progressService';
import { Topic, Category } from '@/src/types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/src/constants/config';
import { cardShadowLight } from '@/src/constants/styles';

interface TopicStat {
  topicId: string;
  total: number;
  correct: number;
  accuracy: number;
}

const CATEGORY_ORDER: Category[] = ['history', 'government', 'traditions', 'values', 'everyday'];

const CATEGORY_ICON_MAP: Record<Category, keyof typeof Ionicons.glyphMap> = {
  history: 'time',
  government: 'business',
  traditions: 'color-palette',
  values: 'heart',
  everyday: 'home',
};

export default function StudyScreen() {
  const colors = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsRead, setTopicsRead] = useState<string[]>([]);
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          const allTopics = await questionService.getTopics();
          if (cancelled) return;
          setTopics(allTopics);
          if (user) {
            const [read, stats] = await Promise.all([
              progressService.getTopicsRead(user.id),
              questionService.getTopicStats(user.id),
            ]);
            if (cancelled) return;
            setTopicsRead(read);
            setTopicStats(stats);
          }
        } catch (e) {
          console.warn('Failed to load topics:', e);
        }
      };
      load();
      return () => { cancelled = true; };
    }, [user])
  );

  const getTopicStat = (topicId: string) => topicStats.find(s => s.topicId === topicId);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return '#16a34a';
    if (accuracy >= 50) return '#d97706';
    return '#ef4444';
  };

  const groupedTopics = useMemo(() => CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    color: CATEGORY_COLORS[category],
    icon: CATEGORY_ICON_MAP[category],
    topics: topics.filter((t) => t.category === category),
  })), [topics]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Study</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.warning + '20' }]}
            onPress={() => router.push('/(tabs)/study/reference')}
          >
            <Ionicons name="library" size={18} color={colors.warning} />
            <Text style={[styles.headerButtonText, { color: colors.warning }]}>Reference</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/study/timeline')}
          >
            <Ionicons name="globe" size={18} color="#fff" />
            <Text style={styles.timelineText}>3D Timeline</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {groupedTopics.map(({ category, label, color, icon, topics: categoryTopics }) => (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={[styles.categoryIcon, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <Text style={[styles.categoryTitle, { color: colors.text }]}>{label}</Text>
              <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
                {categoryTopics.filter((t) => topicsRead.includes(t.id)).length}/{categoryTopics.length}
              </Text>
            </View>

            {categoryTopics.map((topic) => {
              const isRead = topicsRead.includes(topic.id);
              const stat = getTopicStat(topic.id);
              const accuracy = stat ? Math.round(stat.accuracy) : -1;
              const borderLeftColor = stat
                ? getAccuracyColor(stat.accuracy)
                : colors.border;

              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[styles.topicCard, {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderLeftColor: stat ? borderLeftColor : colors.border,
                    borderLeftWidth: stat ? 3 : 1,
                  }]}
                  onPress={() => router.push(`/(tabs)/study/${topic.id}`)}
                >
                  <View style={styles.topicContent}>
                    <Text style={[styles.topicTitle, { color: colors.text }]}>{topic.title}</Text>
                    <Text style={[styles.topicSections, { color: colors.textSecondary }]}>
                      {topic.study_content.sections?.length ?? 0} sections
                    </Text>
                    {stat && (
                      <View style={styles.topicProgressRow}>
                        <View style={[styles.topicProgressBar, { backgroundColor: colors.surfaceSecondary }]}>
                          <View
                            style={[styles.topicProgressFill, {
                              backgroundColor: getAccuracyColor(stat.accuracy),
                              width: `${Math.min(100, accuracy)}%`,
                            }]}
                          />
                        </View>
                        <Text style={[styles.topicAccuracy, { color: colors.textSecondary }]}>
                          {accuracy}%
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.topicRight}>
                    {isRead && (
                      <View style={[styles.readBadge, { backgroundColor: colors.success + '20' }]}>
                        <Ionicons name="checkmark" size={14} color={colors.success} />
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '700' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerButtonText: { fontSize: 13, fontWeight: '600' },
  timelineText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  scrollContent: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  categorySection: { marginBottom: 24 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTitle: { fontSize: 18, fontWeight: '600', flex: 1 },
  categoryCount: { fontSize: 13 },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    ...cardShadowLight,
  },
  topicContent: { flex: 1 },
  topicTitle: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  topicSections: { fontSize: 12, marginBottom: 2 },
  topicProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  topicProgressBar: { flex: 1, height: 4, borderRadius: 2 },
  topicProgressFill: { height: '100%', borderRadius: 2 },
  topicAccuracy: { fontSize: 11, width: 28 },
  topicRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
