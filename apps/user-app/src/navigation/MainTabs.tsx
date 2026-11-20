import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Easing } from "react-native";
import type { MainTabParamList } from "./types";
import { FloatingNavBar } from "./FloatingNavBar";
import { HomeScreen } from "../presentation/screens/HomeScreen";
import { ChatListScreen } from "../presentation/screens/chat/ChatListScreen";
import { ProfileScreen } from "../presentation/screens/profile/ProfileScreen";
import { BookingsScreen } from "../presentation/screens/bookings/BookingScreens";
import { colors, typography } from "../presentation/theme";
import { useMotionPreference } from "../presentation/motion";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const reducedMotion = useMotionPreference();
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingNavBar {...props} />}
      screenOptions={{
        animation: reducedMotion ? "none" : "shift",
        transitionSpec: {
          animation: "timing",
          config: { duration: reducedMotion ? 0 : 180, easing: Easing.out(Easing.circle) },
        },
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            transform: [{ translateX: current.progress.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: reducedMotion ? [0, 0, 0] : [-8, 0, 8],
            }) }],
          },
        }),
        headerTintColor: colors.primary,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerTitleStyle: typography.headerTitle,
        headerStyle: { backgroundColor: colors.surface },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: "Home", headerShown: false }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatListScreen}
        options={{ title: "Chat" }}
      />
      <Tab.Screen
        name="BookingTab"
        component={BookingsScreen}
        options={{ title: "Booking Saya" }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: "Profil" }}
      />
    </Tab.Navigator>
  );
}
