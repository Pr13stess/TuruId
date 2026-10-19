import { type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme";
import { Dock, IconButton } from "./UI";

export function OwnerChatListLayout({ children, onHistory }: { children: ReactNode; onHistory: () => void }) {
  return <SafeAreaView style={s.root}>
    <View style={s.header}>
      <View style={{ width: 44 }} />
      <Text style={s.title}>Chat</Text>
      <IconButton name="more" color={colors.primary} label="Tampilkan atau tutup riwayat panggilan" onPress={onHistory} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      {children}
    </ScrollView>
    <Dock active="ChatList" role="owner" />
  </SafeAreaView>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, paddingHorizontal: 16, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "700", color: colors.primary },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },
});
