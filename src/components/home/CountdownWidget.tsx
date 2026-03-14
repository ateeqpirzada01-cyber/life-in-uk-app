import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { differenceInDays, format, parseISO, isValid } from 'date-fns';
import { useState, useRef } from 'react';
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
  const pendingDate = useRef<Date | null>(null);

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (selectedDate && selectedDate > new Date()) {
        setTestDate(selectedDate.toISOString());
      }
      return;
    }
    // iOS: store pending date, user must press Done
    if (selectedDate) {
      pendingDate.current = selectedDate;
    }
  };

  const handleConfirmIOS = () => {
    if (pendingDate.current && pendingDate.current > new Date()) {
      setTestDate(pendingDate.current.toISOString());
    }
    pendingDate.current = null;
    setShowPicker(false);
  };

  const handleCancelIOS = () => {
    pendingDate.current = null;
    setShowPicker(false);
  };

  const openPicker = () => {
    pendingDate.current = null;
    setShowPicker(true);
  };

  const defaultPickerDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const renderPicker = (value: Date) => {
    if (!showPicker) return null;

    if (Platform.OS === 'ios') {
      return (
        <Modal transparent animationType="slide" visible={showPicker}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCancelIOS}>
                  <Text style={[styles.modalButton, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirmIOS}>
                  <Text style={[styles.modalButton, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={value}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            </View>
          </View>
        </Modal>
      );
    }

    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="default"
        minimumDate={new Date()}
        onChange={handleDateChange}
      />
    );
  };

  // No date set — show "Set exam date" link
  if (!testDate) {
    return (
      <>
        <TouchableOpacity
          style={styles.inlineRow}
          onPress={openPicker}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.inlineText, { color: colors.primary }]}>Set exam date</Text>
        </TouchableOpacity>
        {renderPicker(defaultPickerDate)}
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
      <>
        <TouchableOpacity
          style={styles.inlineRow}
          onPress={openPicker}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={[styles.inlineText, { color: colors.textSecondary }]}>
            Exam date passed · <Text style={{ color: colors.primary }}>Set new date</Text>
          </Text>
        </TouchableOpacity>
        {renderPicker(defaultPickerDate)}
      </>
    );
  }

  // Active countdown
  const urgencyColor = daysLeft <= 3 ? colors.error : daysLeft <= 7 ? colors.warning : colors.textSecondary;
  const dateStr = format(target, 'EEE d MMM');

  return (
    <>
      <TouchableOpacity
        style={styles.inlineRow}
        onPress={openPicker}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="calendar-outline" size={14} color={urgencyColor} />
        <Text style={[styles.inlineText, { color: urgencyColor }]}>
          {daysLeft === 0 ? 'Exam today!' : daysLeft === 1 ? '1 day until exam' : `${daysLeft} days until exam`}
        </Text>
        <Text style={[styles.dateHint, { color: colors.textTertiary }]}>· {dateStr}</Text>
      </TouchableOpacity>
      {renderPicker(target)}
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalButton: {
    fontSize: 16,
    fontWeight: '600',
  },
});
