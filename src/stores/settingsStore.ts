import { create } from 'zustand';

interface SettingsState {
  darkMode: boolean;
  notificationsEnabled: boolean;
  hapticFeedback: boolean;
  dailyReminderTime: string;
  testDate: string | null;

  toggleDarkMode: () => void;
  toggleNotifications: () => void;
  toggleHapticFeedback: () => void;
  setDailyReminderTime: (time: string) => void;
  setTestDate: (date: string | null) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  darkMode: false,
  notificationsEnabled: true,
  hapticFeedback: true,
  dailyReminderTime: '09:00',
  testDate: null,

  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
  toggleHapticFeedback: () => set((state) => ({ hapticFeedback: !state.hapticFeedback })),
  setDailyReminderTime: (time) => set({ dailyReminderTime: time }),
  setTestDate: (date) => set({ testDate: date }),
}));
