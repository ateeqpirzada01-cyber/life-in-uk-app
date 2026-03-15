import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabase';
import { getDatabase } from '@/src/lib/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return; // Prevent double initialization
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
        initialized: true,
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
      });
      // Store subscription for cleanup if needed
      (useAuthStore as any)._authSubscription = subscription;
    } catch {
      set({ isLoading: false, initialized: true });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ isLoading: false });
    return { error: error?.message ?? null };
  },

  signUp: async (email, password, displayName) => {
    set({ isLoading: true });
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (!error && data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        display_name: displayName,
      });
    }

    set({ isLoading: false });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    // Clean up auth state change subscription
    (useAuthStore as any)._authSubscription?.unsubscribe();
    (useAuthStore as any)._authSubscription = null;
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  },

  deleteAccount: async () => {
    const user = get().user;
    if (!user) return { error: 'Not signed in' };

    try {
      // Delete from Supabase (tables that exist in Supabase with RLS)
      const supabaseTables = [
        'question_attempts',
        'exam_sessions',
        'spaced_repetition_cards',
        'daily_streaks',
        'user_achievements',
        'topics_read',
        'starred_questions',
        'flashcard_progress',
        'practice_test_results',
        'feedback',
      ];

      for (const table of supabaseTables) {
        await supabase.from(table).delete().eq('user_id', user.id);
      }

      // Profile uses 'id' column, not 'user_id'
      await supabase.from('profiles').delete().eq('id', user.id);

      // Also clean up local SQLite data
      const db = await getDatabase();
      const localTables = [
        'question_attempts', 'exam_sessions', 'spaced_repetition_cards',
        'daily_streaks', 'user_achievements', 'topics_read',
        'starred_questions', 'flashcard_progress', 'practice_test_results',
        'user_subscription', 'daily_usage', 'feedback',
      ];
      for (const table of localTables) {
        await db.runAsync(`DELETE FROM ${table} WHERE user_id = ?`, [user.id]);
      }
      await db.runAsync('DELETE FROM user_profile WHERE id = ?', [user.id]);

      // Clean up auth subscription
      (useAuthStore as any)._authSubscription?.unsubscribe();
      (useAuthStore as any)._authSubscription = null;

      await supabase.auth.signOut();
      set({ session: null, user: null });
      return { error: null };
    } catch (e: any) {
      return { error: e.message ?? 'Failed to delete account' };
    }
  },
}));
