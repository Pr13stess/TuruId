import "./global.css";
import { Component, type ErrorInfo, type PropsWithChildren } from "react";
import { View } from "react-native";
import { Text } from "./src/presentation/components/Typography";
import { useFonts } from "expo-font";
import { fontAssets } from "./src/presentation/fonts";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { RepositoryProvider } from "./src/providers/RepositoryProvider";
import { RootNavigator } from "./src/navigation/RootNavigator";
class AppBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* Never log credentials or personal data. */
  }
  render() {
    return this.state.failed ? (
      <View style={{ flex: 1, justifyContent: "center", padding: 28 }}>
        <Text>
          Aplikasi gagal dimulai. Periksa konfigurasi Supabase dan jalankan
          ulang Expo.
        </Text>
      </View>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppBoundary>
        <RepositoryProvider>
          <RootNavigator />
        </RepositoryProvider>
      </AppBoundary>
    </SafeAreaProvider>
  );
}
