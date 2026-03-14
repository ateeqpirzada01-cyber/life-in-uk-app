import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { usePremiumStore } from '@/src/stores/premiumStore';
import { iap } from '@/src/lib/iap';
import { subscriptionService } from '@/src/services/subscriptionService';
import { PREMIUM_FEATURES, PREMIUM_CONFIG } from '@/src/constants/config';
import { Platform } from 'react-native';
import { cardShadow } from '@/src/constants/styles';

const FREE_FEATURES = [
  { label: 'All 21 Study Topics', included: true },
  { label: 'Timeline & Reference', included: true },
  { label: '3 Quizzes/Day', included: true },
  { label: '1 Mock Exam Total', included: true },
];

const PRO_FEATURES = Object.values(PREMIUM_FEATURES).map((f) => ({
  label: f.label,
  icon: f.icon,
}));

export default function PremiumScreen() {
  const colors = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setSubscription = usePremiumStore((s) => s.setSubscription);
  const isPremium = usePremiumStore((s) => s.isPremium());
  const isRestoring = usePremiumStore((s) => s.isRestoring);
  const setRestoring = usePremiumStore((s) => s.setRestoring);
  const insets = useSafeAreaInsets();
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (!user) return;
    setPurchasing(true);
    try {
      const result = await iap.purchasePremium();
      if (result.success) {
        const sub = {
          user_id: user.id,
          is_premium: true,
          product_id: PREMIUM_CONFIG.PRODUCT_ID,
          purchase_date: new Date().toISOString(),
          platform: Platform.OS as 'ios' | 'android',
          expires_at: null,
          restored_at: null,
        };
        await subscriptionService.saveSubscription(sub);
        setSubscription({ ...sub, synced: 0 });
        Alert.alert('Welcome to Premium!', 'All features are now unlocked.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (e) {
      Alert.alert('Purchase Failed', 'Please try again later.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (!user) return;
    setRestoring(true);
    try {
      const result = await iap.restorePurchases();
      if (result.success) {
        const sub = {
          user_id: user.id,
          is_premium: true,
          product_id: PREMIUM_CONFIG.PRODUCT_ID,
          purchase_date: null,
          platform: Platform.OS as 'ios' | 'android',
          expires_at: null,
          restored_at: new Date().toISOString(),
        };
        await subscriptionService.saveSubscription(sub);
        setSubscription({ ...sub, synced: 0 });
        Alert.alert('Purchases Restored', 'Premium has been restored.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found for this account.');
      }
    } catch {
      Alert.alert('Restore Failed', 'Please try again later.');
    } finally {
      setRestoring(false);
    }
  };

  if (isPremium) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={[styles.closeButton, { top: insets.top + 12 }]} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.crownSection}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            <Text style={[styles.title, { color: colors.text }]}>You're Premium!</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              All features are unlocked.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={[styles.closeButton, { top: insets.top + 12 }]} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color={colors.text} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Crown header */}
        <View style={styles.crownSection}>
          <View style={[styles.crownCircle, { backgroundColor: '#f59e0b' + '20' }]}>
            <Text style={styles.crownEmoji}>👑</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Unlock Premium</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            One-time purchase. No subscriptions. Study without limits.
          </Text>
        </View>

        {/* Feature comparison */}
        <View style={[styles.comparisonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.comparisonTitle, { color: colors.textSecondary }]}>FREE</Text>
          {FREE_FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Ionicons
                name={f.included ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={f.included ? colors.success : colors.error}
              />
              <Text style={[styles.featureText, { color: colors.text }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.comparisonCard, styles.proCard, { backgroundColor: colors.card, borderColor: '#f59e0b' }]}>
          <View style={styles.proHeader}>
            <Text style={[styles.comparisonTitle, { color: '#f59e0b' }]}>PREMIUM</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>Best Value</Text>
            </View>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={[styles.featureText, { color: colors.text }]}>Everything in Free</Text>
          </View>
          {PRO_FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.featureText, { color: colors.text }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Purchase button */}
        <TouchableOpacity
          style={[styles.purchaseButton, { backgroundColor: '#f59e0b' }]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-open" size={20} color="#fff" />
              <Text style={styles.purchaseText}>Unlock Premium</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isRestoring}
        >
          {isRestoring ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={[styles.restoreText, { color: colors.primary }]}>Restore Purchases</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    padding: 4,
  },
  scrollContent: { padding: 24, paddingTop: 40, paddingBottom: 60 },
  crownSection: { alignItems: 'center', marginBottom: 28 },
  crownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  crownEmoji: { fontSize: 40 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  comparisonCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...cardShadow,
  },
  proCard: { borderWidth: 2 },
  proHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  comparisonTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  proBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 12,
  },
  proBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  featureText: { fontSize: 14 },
  purchaseButton: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  purchaseText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  restoreText: { fontSize: 14, fontWeight: '600' },
  doneButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
