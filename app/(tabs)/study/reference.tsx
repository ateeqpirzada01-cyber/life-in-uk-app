import { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { DynastyTree } from '@/src/components/study/DynastyTree';
import { MemoryAidCard } from '@/src/components/study/MemoryAidCard';
import { Dynasty, MemoryAidCategory } from '@/src/types';

const dynastyData: Dynasty[] = require('@/assets/data/dynasty-data.json');
const memoryAids: MemoryAidCategory[] = require('@/assets/data/memory-aids.json');

type TabId = 'kings' | 'dates' | 'memory' | 'government' | 'geography';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'kings', label: 'Kings & Queens', icon: 'shield-half' },
  { id: 'dates', label: 'Key Dates', icon: 'calendar' },
  { id: 'memory', label: 'Memory Aids', icon: 'bulb' },
  { id: 'government', label: 'Government', icon: 'business' },
  { id: 'geography', label: 'Geography', icon: 'map' },
];

export default function ReferenceScreen() {
  const colors = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('kings');
  const tabScrollRef = useRef<ScrollView>(null);

  // Categorize memory aids by tab
  const dateAids = memoryAids.filter((a) => a.type === 'timeline');
  const memoryOnlyAids = memoryAids.filter((a) =>
    ['comparison', 'cards'].includes(a.type) &&
    !['uk_capitals', 'uk_government', 'uk_map'].includes(a.id)
  );
  const governmentAids = memoryAids.filter((a) =>
    a.id === 'uk_government' || a.id === 'government_structure'
  );
  const geographyAids = memoryAids.filter((a) =>
    a.id === 'uk_capitals' || a.id === 'uk_map' || a.type === 'grid'
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'kings':
        return (
          <View>
            <View style={styles.tabContentHeader}>
              <Ionicons name="shield-half" size={28} color={colors.primary} />
              <View style={styles.tabContentHeaderText}>
                <Text style={[styles.tabContentTitle, { color: colors.text }]}>Kings & Queens</Text>
                <Text style={[styles.tabContentDesc, { color: colors.textSecondary }]}>
                  Tap a dynasty to see its monarchs. Starred monarchs are frequently tested.
                </Text>
              </View>
            </View>
            <DynastyTree dynasties={dynastyData} />
          </View>
        );

      case 'dates':
        return (
          <View>
            <View style={styles.tabContentHeader}>
              <Ionicons name="calendar" size={28} color="#ef4444" />
              <View style={styles.tabContentHeaderText}>
                <Text style={[styles.tabContentTitle, { color: colors.text }]}>Key Dates</Text>
                <Text style={[styles.tabContentDesc, { color: colors.textSecondary }]}>
                  Major historical dates you need to know for the test.
                </Text>
              </View>
            </View>
            {dateAids.length > 0 ? (
              dateAids.map((aid) => <MemoryAidCard key={aid.id} category={aid} />)
            ) : (
              // Fallback: show all timeline-type aids
              memoryAids
                .filter((a) => a.id === 'key_dates')
                .map((aid) => <MemoryAidCard key={aid.id} category={aid} />)
            )}
          </View>
        );

      case 'memory':
        return (
          <View>
            <View style={styles.tabContentHeader}>
              <Ionicons name="bulb" size={28} color="#f59e0b" />
              <View style={styles.tabContentHeaderText}>
                <Text style={[styles.tabContentTitle, { color: colors.text }]}>Memory Aids</Text>
                <Text style={[styles.tabContentDesc, { color: colors.textSecondary }]}>
                  Quick-reference cards to help you remember key facts.
                </Text>
              </View>
            </View>
            {memoryOnlyAids.length > 0 ? (
              memoryOnlyAids.map((aid) => <MemoryAidCard key={aid.id} category={aid} />)
            ) : (
              // Fallback: show comparison and card aids
              memoryAids
                .filter((a) => ['comparison', 'cards'].includes(a.type))
                .map((aid) => <MemoryAidCard key={aid.id} category={aid} />)
            )}
          </View>
        );

      case 'government':
        return (
          <View>
            <View style={styles.tabContentHeader}>
              <Ionicons name="business" size={28} color="#3b82f6" />
              <View style={styles.tabContentHeaderText}>
                <Text style={[styles.tabContentTitle, { color: colors.text }]}>Government</Text>
                <Text style={[styles.tabContentDesc, { color: colors.textSecondary }]}>
                  How the UK government is structured and how it works.
                </Text>
              </View>
            </View>
            {governmentAids.length > 0 ? (
              governmentAids.map((aid) => <MemoryAidCard key={aid.id} category={aid} />)
            ) : (
              memoryAids
                .filter((a) => a.id === 'uk_government')
                .map((aid) => <MemoryAidCard key={aid.id} category={aid} />)
            )}
          </View>
        );

      case 'geography':
        return (
          <View>
            <View style={styles.tabContentHeader}>
              <Ionicons name="map" size={28} color="#10b981" />
              <View style={styles.tabContentHeaderText}>
                <Text style={[styles.tabContentTitle, { color: colors.text }]}>Geography</Text>
                <Text style={[styles.tabContentDesc, { color: colors.textSecondary }]}>
                  Countries, capitals, and key places of the United Kingdom.
                </Text>
              </View>
            </View>
            {geographyAids.length > 0 ? (
              geographyAids.map((aid) => <MemoryAidCard key={aid.id} category={aid} />)
            ) : (
              memoryAids
                .filter((a) => a.id === 'uk_capitals' || a.id === 'uk_map')
                .map((aid) => <MemoryAidCard key={aid.id} category={aid} />)
            )}
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Reference' }} />

      {/* Tab bar */}
      <ScrollView
        ref={tabScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? colors.primary : colors.surfaceSecondary,
                },
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={isActive ? '#fff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? '#fff' : colors.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    maxHeight: 52,
    borderBottomWidth: 1,
  },
  tabBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  tabContentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  tabContentHeaderText: {
    flex: 1,
  },
  tabContentTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  tabContentDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
});
