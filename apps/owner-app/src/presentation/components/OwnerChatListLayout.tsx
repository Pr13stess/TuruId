import { type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Typography";
import { colors } from "../theme";
import { Dock, IconButton } from "./UI";

export function OwnerChatListLayout({ children, onHistory }: { children: ReactNode; onHistory: () => void }) {
  const insets = useSafeAreaInsets();
  return <SafeAreaView style={s.root}>
    <View pointerEvents="none" className="absolute left-0 right-0 top-0 bg-surface" style={{ height: insets.top }} />
    <View style={s.body}>
    <View className="min-h-16 flex-row items-center bg-surface px-4 py-2 border-b border-line">
      <View className="w-12" />
      <Text className="flex-1 px-3 text-center text-header font-bold text-primary">Chat</Text>
      <View className="w-12 items-center"><IconButton name="more" color={colors.primary} label="Tampilkan atau tutup riwayat panggilan" onPress={onHistory} /></View>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      {children}
    </ScrollView>
    <Dock active="ChatList" role="owner" />
    </View>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  // Match Page: absolute Dock is anchored inside the safe-area content bounds.
  body: { flex: 1 },
  header: { height: 64, paddingHorizontal: 16, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "700", color: colors.primary },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },
});
