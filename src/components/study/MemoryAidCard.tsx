import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { MemoryAidCategory } from '@/src/types';
import { REFERENCE_IMAGES } from '@/src/constants/images';

interface MemoryAidCardProps {
  category: MemoryAidCategory;
}

export function MemoryAidCard({ category }: MemoryAidCardProps) {
  const colors = useTheme();

  const renderContent = () => {
    switch (category.type) {
      case 'grid':
        return renderGrid();
      case 'cards':
        return renderCards();
      case 'timeline':
        return renderTimeline();
      case 'comparison':
        return renderComparison();
      case 'chart':
        return renderChart();
      default:
        return renderList();
    }
  };

  const renderGrid = () => (
    <View style={styles.grid}>
      {category.items.map((item, i) => (
        <View key={i} style={[styles.gridItem, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={[styles.gridTitle, { color: colors.text }]}>{item.country}</Text>
          <View style={styles.gridRow}>
            <Ionicons name="location" size={12} color={colors.textSecondary} />
            <Text style={[styles.gridValue, { color: colors.textSecondary }]}>{item.capital}</Text>
          </View>
          <View style={styles.gridRow}>
            <Ionicons name="person" size={12} color={colors.textSecondary} />
            <Text style={[styles.gridValue, { color: colors.textSecondary }]}>{item.saint}</Text>
          </View>
          <View style={styles.gridRow}>
            <Ionicons name="calendar" size={12} color={colors.textSecondary} />
            <Text style={[styles.gridValue, { color: colors.textSecondary }]}>{item.day}</Text>
          </View>
          <View style={styles.gridRow}>
            <Ionicons name="flower" size={12} color={colors.textSecondary} />
            <Text style={[styles.gridValue, { color: colors.textSecondary }]}>{item.flower}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderCards = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.cardsRow}>
        {category.items.map((item, i) => (
          <View
            key={i}
            style={[styles.wifeCard, { backgroundColor: item.color + '15', borderColor: item.color + '40' }]}
          >
            <Text style={[styles.wifeName, { color: colors.text }]}>{item.name}</Text>
            <View style={[styles.fateBadge, { backgroundColor: item.color + '25' }]}>
              <Text style={[styles.fateText, { color: item.color }]}>{item.fate}</Text>
            </View>
            <Text style={[styles.wifeFact, { color: colors.textSecondary }]}>{item.key_fact}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderTimeline = () => (
    <View style={styles.timelineList}>
      {category.items.map((item, i) => (
        <View key={i} style={styles.timelineItem}>
          <View style={[styles.dateBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.dateText, { color: colors.primary }]}>{item.year}</Text>
          </View>
          <Text style={[styles.eventText, { color: colors.text }]}>{item.event}</Text>
        </View>
      ))}
    </View>
  );

  const renderComparison = () => {
    if (category.id === 'wars_of_roses') {
      return (
        <View style={styles.rosesContainer}>
          {category.items.map((item, i) => (
            <View key={i} style={[styles.roseCard, { borderColor: item.color === '#f5f5f5' ? '#d4d4d4' : item.color + '40' }]}>
              <View style={[styles.roseDot, { backgroundColor: item.color === '#f5f5f5' ? '#d4d4d4' : item.color }]} />
              <View style={styles.roseInfo}>
                <Text style={[styles.roseSide, { color: colors.text }]}>{item.side}</Text>
                <Text style={[styles.roseSymbol, { color: colors.textSecondary }]}>{item.symbol}</Text>
                <Text style={[styles.roseOutcome, { color: colors.textSecondary }]}>{item.outcome}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    // Two Elizabeths comparison
    return (
      <View style={styles.comparisonContainer}>
        {category.items.map((item, i) => (
          <View key={i} style={[styles.comparisonCard, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.comparisonName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.comparisonReign, { color: colors.textSecondary }]}>
              {item.reign} ({item.dynasty})
            </Text>
            {item.key_achievements?.map((achievement: string, j: number) => (
              <View key={j} style={styles.achievementRow}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={[styles.achievementText, { color: colors.textSecondary }]}>{achievement}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderChart = () => (
    <View style={styles.chartContainer}>
      {category.items.map((item, i) => (
        <View key={i} style={[styles.chartLevel, { marginLeft: (item.level - 1) * 16 }]}>
          <View style={[styles.chartNode, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.chartDesc, { color: colors.textSecondary }]}>{item.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderList = () => (
    <View>
      {category.items.map((item, i) => (
        <Text key={i} style={[styles.listItem, { color: colors.textSecondary }]}>
          {JSON.stringify(item)}
        </Text>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Ionicons name={category.icon as any} size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>{category.title}</Text>
      </View>
      {category.image && REFERENCE_IMAGES[category.image] && (
        <Image
          source={REFERENCE_IMAGES[category.image]}
          style={styles.aidImage}
          resizeMode="contain"
        />
      )}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  aidImage: { width: '100%', height: 180, borderRadius: 10, marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '600', flex: 1 },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '47%' as any, padding: 12, borderRadius: 10 },
  gridTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  gridRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  gridValue: { fontSize: 12 },

  // Cards (Henry's wives)
  cardsRow: { flexDirection: 'row', gap: 10, paddingRight: 16 },
  wifeCard: { width: 150, padding: 12, borderRadius: 10, borderWidth: 1 },
  wifeName: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  fateBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
  fateText: { fontSize: 11, fontWeight: '600' },
  wifeFact: { fontSize: 11, lineHeight: 16 },

  // Timeline (key dates)
  timelineList: { gap: 8 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, minWidth: 56, alignItems: 'center' },
  dateText: { fontSize: 13, fontWeight: '700' },
  eventText: { flex: 1, fontSize: 13, lineHeight: 20 },

  // Comparison (roses, elizabeths)
  rosesContainer: { gap: 8 },
  roseCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, gap: 10 },
  roseDot: { width: 16, height: 16, borderRadius: 8 },
  roseInfo: { flex: 1 },
  roseSide: { fontSize: 14, fontWeight: '600' },
  roseSymbol: { fontSize: 12 },
  roseOutcome: { fontSize: 12, fontStyle: 'italic' },

  comparisonContainer: { gap: 10 },
  comparisonCard: { padding: 14, borderRadius: 10 },
  comparisonName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  comparisonReign: { fontSize: 12, marginBottom: 8 },
  achievementRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  achievementText: { flex: 1, fontSize: 12, lineHeight: 18 },

  // Chart (government)
  chartContainer: { gap: 8 },
  chartLevel: {},
  chartNode: { padding: 12, borderRadius: 10, borderWidth: 1 },
  chartTitle: { fontSize: 14, fontWeight: '600' },
  chartDesc: { fontSize: 12, marginTop: 2, lineHeight: 18 },

  // Fallback
  listItem: { fontSize: 13, marginBottom: 4 },
});
