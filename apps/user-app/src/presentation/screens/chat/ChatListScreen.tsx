import { useCallback } from "react";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { callEventDisplay } from "../../../domain/callEventDisplay";
import { orderChats } from "../../../domain/chatOrder";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../components/Typography";
import { SafeAreaView } from "react-native-safe-area-context";
import type { TabScreenProps } from "../../../navigation/types";
import { useRepositories } from "../../../providers/RepositoryProvider";
import { useResource } from "../../hooks/useResource";
import { Status } from "../../components/Primitives";
import { Avatar } from "../../components/ProfileUi";
import { colors } from "../../theme";
import { timeLabel } from "../../format";
import type { Conversation } from "../../../domain/models";
export function ChatListScreen({ navigation }: TabScreenProps<"ChatTab">) {
  const { chat } = useRepositories();
  const loader = useCallback(() => chat.listConversations(), [chat]);
  const focused = useIsFocused();
  const state = useResource(loader, focused ? 5000 : 0);
  const reload = state.retry;
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <FlatList
        data={orderChats(state.data ?? [])}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !state.loading ? (
            <Status
              loading={state.loading}
              error={state.error}
              empty="Belum ada percakapan. Mulai chat dari halaman detail kos."
              onRetry={state.retry}
            />
          ) : null
        }
        refreshing={state.loading}
        onRefresh={state.retry}
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            onPress={() =>
              navigation.navigate("Chat", {
              conversationId: item.id,
              propertyId: item.property_id,
              propertyName: item.property_name,
            })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}
function ConversationRow({
  item,
  onPress,
}: {
  item: Conversation;
  onPress: () => void;
}) {
  const { properties } = useRepositories();
  const loadOwner = useCallback(() => properties.get(item.property_id), [properties, item.property_id]);
  const owner = useResource(loadOwner);
  const call = item.last_message?.message_type === "CALL_EVENT"
    ? callEventDisplay(item.last_message.text_content?.replace(/\s*\(demo\)\s*$/i, "") ?? null)
    : null;
  const preview = call
    ? (call.title === "Panggilan" ? "Riwayat panggilan" : `${call.title} · ${call.detail}`)
    : item.last_message
    ? item.last_message.message_type === "IMAGE"
      ? "📷 Gambar"
      : (item.last_message.text_content ?? "")
    : "Belum ada pesan";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <Avatar
        key={item.property_id}
        uri={owner.data?.owner_avatar_url ?? null}
        name={owner.data?.owner_name ?? item.property_name}
        size={44}
      />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.property_name}
        </Text>
        <View className="flex-row items-center gap-[5px]">
          {call && <Ionicons name={call.video ? "videocam-outline" : "call-outline"} size={14}
            color={call.unsuccessful ? colors.danger : colors.muted} accessible={false} />}
          <Text className="flex-1" style={styles.preview} numberOfLines={1}>
            {preview}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Text style={styles.time}>{timeLabel(item.updated_at)}</Text>
        {!!item.unread && <Text accessibilityLabel={`${item.unread} pesan belum dibaca`} style={styles.unread}>{item.unread > 99 ? "99+" : item.unread}</Text>}
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 120, gap: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  body: { flex: 1, gap: 2 },
  name: { fontWeight: "700", color: colors.ink, fontSize: 15 },
  preview: { color: colors.muted, fontSize: 13 },
  time: { color: colors.muted, fontSize: 11 },
  unread: { backgroundColor: colors.primary, color: "white", borderRadius: 12, minWidth: 24, textAlign: "center", paddingHorizontal: 6, paddingVertical: 3, fontSize: 11 },
});
