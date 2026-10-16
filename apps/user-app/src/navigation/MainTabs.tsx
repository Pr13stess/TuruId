import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { MainTabParamList } from "./types";
import { FloatingNavBar } from "./FloatingNavBar";
import { HomeScreen } from "../presentation/screens/HomeScreen";
import { ChatListScreen } from "../presentation/screens/chat/ChatListScreen";
import { ProfileScreen } from "../presentation/screens/profile/ProfileScreen";
import { BookingsScreen } from "../presentation/screens/bookings/BookingScreens";
import { colors } from "../presentation/theme";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingNavBar {...props} />}
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 16, fontWeight: "700" },
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
