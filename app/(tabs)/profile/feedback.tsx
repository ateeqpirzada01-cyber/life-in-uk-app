import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { feedbackService } from '@/src/services/feedbackService';
import { FEEDBACK_TYPES } from '@/src/constants/config';
import { FeedbackEntry } from '@/src/types';

export default function FeedbackScreen() {
  const colors = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [type, setType] = useState<FeedbackEntry['type']>('general');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !message.trim()) {
      Alert.alert('Required', 'Please enter your feedback message.');
      return;
    }

    setSubmitting(true);
    try {
      await feedbackService.submitFeedback(
        user.id,
        type,
        message.trim(),
        rating > 0 ? rating : undefined
      );
      Alert.alert('Thank You!', 'Your feedback has been submitted.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.title, { color: colors.text }]}>Send Feedback</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Help us improve the app. Your feedback goes directly to the team.
          </Text>

          {/* Type selector */}
          <Text style={[styles.label, { color: colors.text }]}>Category</Text>
          <View style={styles.chipRow}>
            {FEEDBACK_TYPES.map((ft) => (
              <TouchableOpacity
                key={ft.key}
                style={[
                  styles.chip,
                  {
                    backgroundColor: type === ft.key ? colors.primary + '15' : colors.surfaceSecondary,
                    borderColor: type === ft.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setType(ft.key as FeedbackEntry['type'])}
              >
                <Ionicons
                  name={ft.icon as any}
                  size={16}
                  color={type === ft.key ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: type === ft.key ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {ft.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message */}
          <Text style={[styles.label, { color: colors.text }]}>Message</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Tell us what's on your mind..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
            value={message}
            onChangeText={setMessage}
            maxLength={1000}
          />
          <Text style={[styles.charCount, { color: colors.textTertiary }]}>
            {message.length}/1000
          </Text>

          {/* Star rating */}
          <Text style={[styles.label, { color: colors.text }]}>
            Rate your experience (optional)
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star === rating ? 0 : star)}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= rating ? '#f59e0b' : colors.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: message.trim() ? colors.primary : colors.surfaceSecondary,
              },
            ]}
            onPress={handleSubmit}
            disabled={submitting || !message.trim()}
          >
            <Text
              style={[
                styles.submitText,
                { color: message.trim() ? '#fff' : colors.textTertiary },
              ]}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
  },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 4, marginBottom: 20 },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: { fontSize: 16, fontWeight: '600' },
});
