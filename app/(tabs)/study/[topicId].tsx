import { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { questionService } from '@/src/services/questionService';
import { progressService } from '@/src/services/progressService';
import { Topic, StudySection } from '@/src/types';
import { CATEGORY_COLORS, XP_VALUES } from '@/src/constants/config';
import { STUDY_IMAGES } from '@/src/constants/images';
import { LoadingScreen } from '@/src/components/ui/LoadingScreen';

export default function TopicDetailScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const colors = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const readMarked = useRef(false);

  useEffect(() => {
    loadTopic();
  }, [topicId]);

  const loadTopic = async () => {
    try {
      if (!topicId) return;
      setLoading(true);
      const [t, count] = await Promise.all([
        questionService.getTopic(topicId),
        questionService.getQuestionCountByTopic(topicId),
      ]);
      setTopic(t);
      setQuestionCount(count);

      // Mark as read (only once per mount)
      if (user && topicId && !readMarked.current) {
        readMarked.current = true;
        progressService.markTopicRead(user.id, topicId).catch(() => {});
        progressService.awardXP(user.id, 'read_topic').catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to load topic:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen message="Loading topic..." />;
  if (!topic) return null;

  const categoryColor = CATEGORY_COLORS[topic.category] ?? colors.primary;

  const renderSection = (section: StudySection, index: number) => {
    switch (section.type) {
      case 'heading':
        return (
          <Text key={index} style={[styles.heading, { color: colors.text }]}>
            {section.content}
          </Text>
        );
      case 'paragraph':
        return (
          <Text key={index} style={[styles.paragraph, { color: colors.textSecondary }]}>
            {section.content}
          </Text>
        );
      case 'key_fact':
        return (
          <View key={index} style={[styles.keyFact, { backgroundColor: categoryColor + '10', borderLeftColor: categoryColor }]}>
            <Ionicons name="bulb" size={16} color={categoryColor} style={styles.keyFactIcon} />
            <Text style={[styles.keyFactText, { color: colors.text }]}>{section.content}</Text>
          </View>
        );
      case 'image': {
        const imageSource = STUDY_IMAGES[section.content];
        if (!imageSource) return null;
        return (
          <View key={index} style={styles.imageContainer}>
            <Image source={imageSource} style={styles.studyImage} resizeMode="contain" />
          </View>
        );
      }
      case 'list':
        return (
          <View key={index} style={styles.listContainer}>
            {section.content ? (
              <Text style={[styles.listTitle, { color: colors.text }]}>{section.content}</Text>
            ) : null}
            {section.items?.map((item, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={[styles.bullet, { color: categoryColor }]}>•</Text>
                <Text style={[styles.listText, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: topic.title }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Topic header */}
        <View style={[styles.topicHeader, { backgroundColor: categoryColor + '15' }]}>
          <Text style={[styles.topicCategory, { color: categoryColor }]}>
            {topic.category.charAt(0).toUpperCase() + topic.category.slice(1)}
          </Text>
          <Text style={[styles.topicTitle, { color: colors.text }]}>{topic.title}</Text>
        </View>

        {/* Study content */}
        <View style={styles.studyContent}>
          {topic.study_content.sections?.map((section, index) => renderSection(section, index))}
        </View>

        {/* Test yourself */}
        {questionCount > 0 && (
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: categoryColor }]}
            onPress={() => router.push({
              pathname: '/(tabs)/practice/quiz',
              params: { topicId: topic.id, topicTitle: topic.title },
            })}
          >
            <Ionicons name="help-circle" size={22} color="#fff" />
            <Text style={styles.testButtonText}>
              Test Yourself ({questionCount} questions)
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  topicHeader: {
    padding: 24,
    paddingTop: 16,
  },
  topicCategory: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  topicTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  studyContent: {
    padding: 20,
    gap: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
  },
  keyFact: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    alignItems: 'flex-start',
  },
  keyFactIcon: { marginRight: 10, marginTop: 2 },
  keyFactText: { flex: 1, fontSize: 14, lineHeight: 22 },
  listContainer: { gap: 6, paddingLeft: 4 },
  listTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  listItem: { flexDirection: 'row', gap: 8 },
  bullet: { fontSize: 16, lineHeight: 22 },
  listText: { flex: 1, fontSize: 15, lineHeight: 22 },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
  },
  studyImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
