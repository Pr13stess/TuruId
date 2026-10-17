import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { MainTabs } from "./MainTabs";
import { BookingDetailScreen } from "../presentation/screens/bookings/BookingScreens";
import { useAuthSession } from "../presentation/hooks/useAuthSession";
import { LoginScreen } from "../presentation/screens/LoginScreen";
import { RegisterScreen } from "../presentation/screens/RegisterScreen";
import { PropertyDetailScreen } from "../presentation/screens/PropertyDetailScreen";
import { RoomSelectionScreen } from "../presentation/screens/RoomSelectionScreen";
import { PlanSelectionScreen } from "../presentation/screens/PlanSelectionScreen";
import { CheckoutScreen } from "../presentation/screens/CheckoutScreen";
import { ChatScreen } from "../presentation/screens/chat/ChatScreen";
import { NoteScreen } from "../presentation/screens/notes/NoteScreen";
import { NotesScreen } from "../presentation/screens/notes/NotesScreen";
import { FavoritesScreen } from '../presentation/screens/profile/FavoritesScreen';
import { NotificationsScreen } from '../presentation/screens/profile/NotificationsScreen';
import { PaymentHistoryScreen } from '../presentation/screens/profile/PaymentHistoryScreen';
import { EditProfileScreen } from "../presentation/screens/profile/EditProfileScreen";
import { ChangePasswordScreen } from "../presentation/screens/profile/ChangePasswordScreen";
import { PolicyScreen } from "../presentation/screens/profile/PolicyScreen";
import { InfoScreen } from "../presentation/screens/profile/InfoScreen";
import { ComingSoonScreen } from "../presentation/screens/profile/PlaceholderScreen";
import { colors } from "../presentation/theme";
const Stack = createNativeStackNavigator<RootStackParamList>();
function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
export function RootNavigator() {
  const { loading, session } = useAuthSession();
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerTitleStyle: { fontSize: 16, fontWeight: "700" },
          contentStyle: { backgroundColor: "#fff" },
        }}
      >
        {loading ? (
          <Stack.Screen
            name="Login"
            options={{ headerShown: false }}
            component={LoadingScreen}
          />
        ) : !session ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PropertyDetail"
              component={PropertyDetailScreen}
              options={{ title: "Detail kos" }}
            />
            <Stack.Screen
              name="RoomSelection"
              component={RoomSelectionScreen}
              options={{ title: "Pilih tipe kamar" }}
            />
            <Stack.Screen
              name="PlanSelection"
              component={PlanSelectionScreen}
              options={{ title: "Pilih paket sewa" }}
            />
            <Stack.Screen
              name="Checkout"
              component={CheckoutScreen}
              options={{ title: "Checkout" }}
            />
            <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: "Detail booking" }} />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Note"
              component={NoteScreen}
              options={{ title: "Catatan" }}
            />
            <Stack.Screen name="Notes" component={NotesScreen} options={{ title: 'Catatan Saya' }} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favorit' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifikasi' }} />
            <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ title: 'Riwayat pembayaran' }} />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ title: "Ubah profil" }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ title: "Ubah password" }}
            />
            <Stack.Screen
              name="Policy"
              component={PolicyScreen}
              options={{ title: "Kebijakan" }}
            />
            <Stack.Screen
              name="Info"
              component={InfoScreen}
              options={{ title: "Informasi" }}
            />
            <Stack.Screen
              name="ComingSoon"
              component={ComingSoonScreen}
              options={({ route }) => ({ title: route.params.title })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
