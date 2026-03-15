import { Tabs } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';

export default function TabLayout() {
  const colors = useTheme();

  return (
    <Tabs
      screenListeners={({ route, navigation }) => ({
        tabPress: (e) => {
          const state = navigation.getState();
          const targetRoute = state.routes.find((r: any) => r.key === e.target);

          // If this tab's top screen isn't index, fully reset its stack to index.
          // This clears orphaned screens pushed from other tabs (e.g. Home shortcuts).
          const nestedState = targetRoute?.state;
          if (nestedState) {
            const topScreen = nestedState.routes[nestedState.index ?? 0];
            if (topScreen?.name !== 'index') {
              e.preventDefault();
              if (nestedState.key) {
                navigation.dispatch({
                  ...CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'index' }],
                  }),
                  target: nestedState.key,
                });
              }
              navigation.navigate(route.name);
            }
          }
        },
      })}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          height: 85,
          paddingBottom: 28,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
