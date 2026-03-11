import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { differenceInDays, format, parseISO, isValid } from 'date-fns';
import { useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

/**
 * Compact countdown that sits in the header area.
 * Shows a small inline text like "12 days until exam · Wed 25 Mar"
 * or "Set exam date" if none set. Tapping opens a native date picker.
 */
export function CountdownWidget() {
  const colors = useTheme();
  const testDate = useSettingsStore((s) => s.testDate);
  const setTestDate = useSettingsStore((s) => s.setTestDate);
  const [showPicker, setShowPicker] = useState(false);

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate && selectedDate > new Date()) {
      setTestDate(selectedDate.toISOString());
      if (Platform.OS === 'ios') setShowPicker(false);
    }
  };

  const handleConfirmIOS = () => {
    setShowPicker(false);
  };

  // No date set — show "Set exam date" link
  if (!testDate) {
    return (
      <>
        <TouchableOpacity
          style={styles.inlineRow}
          onPress={() => setShowPicker(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.inlineText, { color: colors.primary }]}>Set exam date</Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        )}
      </>
    );
  }

  const target = parseISO(testDate);
  if (!isValid(target)) return null;

  const now = new Date();
  const daysLeft = differenceInDays(target, now);

  // Date has passed
  if (daysLeft < 0) {
    return (
      <TouchableOpacity
        style={styles.inlineRow}
        onPress={() => setShowPicker(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
        <Text style={[styles.inlineText, { color: colors.textSecondary }]}>
          Exam date passed · <Text style={{ color: colors.primary }}>Set new date</Text>
        </Text>
        {showPicker && (
          <DateTimePicker
            value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        )}
      </TouchableOpacity>
    );
  }

  // Active countdown
  const urgencyColor = daysLeft <= 3 ? colors.error : daysLeft <= 7 ? '#f59e0b' : colors.textSecondary;
  const dateStr = format(target, 'EEE d MMM');

  return (
    <>
      <TouchableOpacity
        style={styles.inlineRow}
        onPress={() => setShowPicker(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="calendar-outline" size={14} color={urgencyColor} />
        <Text style={[styles.inlineText, { color: urgencyColor }]}>
          {daysLeft === 0 ? 'Exam today!' : daysLeft === 1 ? '1 day until exam' : `${daysLeft} days until exam`}
        </Text>
        <Text style={[styles.dateHint, { color: colors.textTertiary }]}>· {dateStr}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={target}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  inlineText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateHint: {
    fontSize: 13,
  },
});
