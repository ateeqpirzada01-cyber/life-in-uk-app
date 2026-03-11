import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { Dynasty } from '@/src/types';
import { DYNASTY_IMAGES } from '@/src/constants/images';

interface DynastyTreeProps {
  dynasties: Dynasty[];
}

export function DynastyTree({ dynasties }: DynastyTreeProps) {
  const colors = useTheme();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <View style={styles.container}>
      {dynasties.map((dynasty) => {
        const isOpen = expanded.has(dynasty.id);
        return (
          <View key={dynasty.id} style={styles.dynastyBlock}>
            <TouchableOpacity
              style={[styles.dynastyHeader, { backgroundColor: dynasty.color + '20', borderColor: dynasty.color + '40' }]}
              onPress={() => toggle(dynasty.id)}
            >
              {dynasty.image && DYNASTY_IMAGES[dynasty.image] ? (
                <Image
                  source={DYNASTY_IMAGES[dynasty.image]}
                  style={styles.dynastyShield}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.dynastyDot, { backgroundColor: dynasty.color }]} />
              )}
              <View style={styles.dynastyInfo}>
                <Text style={[styles.dynastyName, { color: colors.text }]}>{dynasty.name}</Text>
                <Text style={[styles.dynastyPeriod, { color: colors.textSecondary }]}>{dynasty.period}</Text>
              </View>
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {isOpen && (
              <View style={styles.monarchsList}>
                {dynasty.monarchs.map((monarch, index) => (
                  <View key={monarch.id} style={styles.monarchRow}>
                    <View style={styles.timelineConnector}>
                      <View style={[styles.timelineLine, { backgroundColor: dynasty.color + '40' }]} />
                      <View
                        style={[
                          styles.timelineDot,
                          {
                            backgroundColor: monarch.notable ? dynasty.color : colors.surfaceSecondary,
                            borderColor: dynasty.color,
                          },
                        ]}
                      />
                      {index < dynasty.monarchs.length - 1 && (
                        <View style={[styles.timelineLineBottom, { backgroundColor: dynasty.color + '40' }]} />
                      )}
                    </View>
                    <View
                      style={[
                        styles.monarchCard,
                        {
                          backgroundColor: monarch.notable ? dynasty.color + '10' : colors.card,
                          borderColor: monarch.notable ? dynasty.color + '30' : colors.border,
                        },
                      ]}
                    >
                      <View style={styles.monarchHeader}>
                        <Text style={[styles.monarchName, { color: colors.text }]}>{monarch.name}</Text>
                        {monarch.notable && (
                          <Ionicons name="star" size={14} color={dynasty.color} />
                        )}
                      </View>
                      <Text style={[styles.monarchReign, { color: colors.textSecondary }]}>{monarch.reign}</Text>
                      <Text style={[styles.monarchFact, { color: colors.textSecondary }]}>{monarch.key_fact}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  dynastyBlock: { marginBottom: 4 },
  dynastyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  dynastyDot: { width: 12, height: 12, borderRadius: 6 },
  dynastyShield: { width: 36, height: 36, borderRadius: 4 },
  dynastyInfo: { flex: 1 },
  dynastyName: { fontSize: 16, fontWeight: '600' },
  dynastyPeriod: { fontSize: 12, marginTop: 2 },
  monarchsList: { paddingLeft: 8, paddingTop: 8 },
  monarchRow: { flexDirection: 'row', minHeight: 80 },
  timelineConnector: { width: 32, alignItems: 'center' },
  timelineLine: { width: 2, height: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  timelineLineBottom: { width: 2, flex: 1 },
  monarchCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 8,
    marginBottom: 8,
  },
  monarchHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monarchName: { fontSize: 14, fontWeight: '600', flex: 1 },
  monarchReign: { fontSize: 12, marginTop: 2 },
  monarchFact: { fontSize: 12, marginTop: 4, lineHeight: 18 },
});
