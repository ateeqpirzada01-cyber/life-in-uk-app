import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PremiumBadgeProps {
  size?: 'small' | 'large';
  overlay?: boolean;
}

export function PremiumBadge({ size = 'small', overlay = false }: PremiumBadgeProps) {
  const isLarge = size === 'large';
  return (
    <View style={[styles.badge, overlay && styles.overlay, isLarge && styles.badgeLarge]}>
      <Ionicons name="lock-closed" size={isLarge ? 12 : 10} color="#fff" />
      <Text style={[styles.text, isLarge && styles.textLarge]}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  overlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  badgeLarge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  text: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textLarge: {
    fontSize: 11,
  },
});
