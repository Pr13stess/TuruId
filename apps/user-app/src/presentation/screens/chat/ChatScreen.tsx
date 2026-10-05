import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ScreenProps } from "../../../navigation/types";
import { useRepositories } from "../../../providers/RepositoryProvider";
import { useAuthSession } from "../../hooks/useAuthSession";
import { useResource } from "../../hooks/useResource";
import { Status } from "../../components/Primitives";
import { colors, radius } from "../../theme";
import { dayKey, dayLabel, timeLabel } from "../../format";
import { clientMessageId } from "../../clientId";
import { AddImageIcon, CallIcon, VideoCallIcon } from "../../Icons/Icons";
import type { Message } from "../../../domain/models";


type Row =
  | { kind: "date"; key: string; label: string }
  | { kind: "message"; key: string; message: Message };

export function ChatScreen({ route, navigation }: ScreenProps<"Chat">) {
  const { conversationId, propertyId, propertyName } = route.params;
  const { chat, properties } = useRepositories();
  const { session } = useAuthSession();
  const insets = useSafeAreaInsets();
  const myId = session?.user.id ?? null;
  
  const loader = useCallback(
    () => chat.listMessages(conversationId),
    [chat, conversationId],
  );
  const state = useResource(loader);

  const metaLoader = useCallback(
    () => properties.get(propertyId),
    [properties, propertyId],
  );
  const meta = useResource(metaLoader);
  const ownerName = meta.data?.owner_name ?? "";
  const avatarUri = meta.data?.images?.[0] ?? null;

  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const listRef = useRef<FlatList<Row>>(null);

  const baseIds = useMemo(
    () => new Set((state.data ?? []).map((m) => m.client_message_id)),
    [state.data],
  );
  const messages = useMemo(
    () => [...(state.data ?? []), ...liveMessages],
    [state.data, liveMessages],
  );

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastDay = "";
    for (const message of messages) {
      const day = dayKey(message.created_at);
      if (day !== lastDay) {
        out.push({
          kind: "date",
          key: `date-${day}`,
          label: dayLabel(message.created_at),
        });
        lastDay = day;
      }
      out.push({ kind: "message", key: message.client_message_id, message });
    }
    return out;
  }, [messages]);

  const addLive = useCallback(
    (message: Message) =>
      setLiveMessages((prev) =>
        baseIds.has(message.client_message_id) ||
        prev.some((m) => m.client_message_id === message.client_message_id)
          ? prev
          : [...prev, message],
      ),
    [baseIds],
  );

  useEffect(
    () => chat.subscribeMessages(conversationId, addLive),
    [chat, conversationId, addLive],
  );


  useEffect(() => {
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(
      ios ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardOpen(true),
    );
    const hide = Keyboard.addListener(
      ios ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardOpen(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const scrollToEnd = useCallback(
    () => listRef.current?.scrollToEnd({ animated: false }),
    [],
  );

  const comingSoon = () =>
    Alert.alert(
      "Segera hadir",
      "Panggilan suara dan video akan tersedia pada tahap berikutnya.",
    );

  const sendText = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const message = await chat.sendText(
        conversationId,
        text,
        clientMessageId(),
      );
      addLive(message);
      setDraft("");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Pesan gagal dikirim.");
    } finally {
      setSending(false);
    }
  };

  const sendImage = async () => {
    if (sending) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSendError("Izin galeri diperlukan untuk mengirim gambar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });
    if (result.canceled || !result.assets[0]) return;
    setSending(true);
    setSendError(null);
    try {
      const message = await chat.sendImage(
        conversationId,
        result.assets[0].uri,
        clientMessageId(),
      );
      addLive(message);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Gambar gagal dikirim.");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      {/* Header: kiri = kembali, foto, nama; kanan = call dan video call */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.iconButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        {avatarUri && !avatarFailed ? (
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatar}
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={22} color={colors.muted} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {propertyName}
          </Text>
          {!!ownerName && (
            <Text numberOfLines={1} style={styles.headerSub}>
              {ownerName}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Panggilan suara"
            onPress={comingSoon}
            hitSlop={8}
            style={styles.iconButton}
          >
            <CallIcon color={colors.primary} size={22} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Panggilan video"
            onPress={comingSoon}
            hitSlop={8}
            style={styles.iconButton}
          >
            <VideoCallIcon color={colors.primary} size={22} />
          </Pressable>
        </View>
      </View>

      {state.loading || state.error ? (
        <View style={styles.flex}>
          <Status
            loading={state.loading}
            error={state.error}
            onRetry={state.retry}
          />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          style={styles.flex}
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
          renderItem={({ item }) =>
            item.kind === "date" ? (
              <View style={styles.dateWrap}>
                <Text style={styles.dateChip}>{item.label}</Text>
              </View>
            ) : (
              <Bubble
                item={item.message}
                mine={item.message.sender_id === myId}
              />
            )
          }
        />
      )}

      {sendError && <Text style={styles.error}>{sendError}</Text>}

      <View
        style={[
          styles.composer,
          { paddingBottom: keyboardOpen ? 12 : 12 + insets.bottom },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kirim gambar"
          onPress={sendImage}
          disabled={sending}
          style={styles.attach}
        >
          <AddImageIcon color={colors.primary} size={24} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Tulis pesan…"
          placeholderTextColor={colors.muted}
          multiline
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kirim pesan"
          onPress={sendText}
          disabled={sending || !draft.trim()}
          style={[
            styles.send,
            (sending || !draft.trim()) && { opacity: 0.5 },
          ]}
        >
          {sending ? (
            <ActivityIndicator color={colors.surface} size="small" />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ item, mine }: { item: Message; mine: boolean }) {
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      <View style={[styles.bubble, mine && styles.bubbleMine]}>
        {item.message_type === "IMAGE" && item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.bubbleImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
            {item.text_content}
          </Text>
        )}
        <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
          {timeLabel(item.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: colors.soft,   
  },
  avatarPlaceholder: {
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: colors.line,
  },
  avatarFallback: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: colors.surface, fontSize: 16, fontWeight: "700" },
  headerText: { flex: 1 },
  headerTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  headerSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  list: { padding: 16, gap: 8 },
  dateWrap: { alignItems: "center", marginVertical: 8 },
  dateChip: {
    backgroundColor: colors.soft,
    color: colors.muted,
    fontSize: 11,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  bubbleRow: { flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "78%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: 10,
    gap: 4,
  },
  bubbleMine: { backgroundColor: colors.primary, borderColor: colors.primary },
  bubbleText: { color: colors.ink, fontSize: 14 },
  bubbleTextMine: { color: colors.surface },
  bubbleTime: { color: colors.muted, fontSize: 10, alignSelf: "flex-end" },
  bubbleTimeMine: { color: colors.selected },
  bubbleImage: {
    width: 200,
    height: 200,
    borderRadius: radius.card - 4,
    backgroundColor: colors.soft,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  attach: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.soft,
    borderRadius: radius.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.ink,
    fontSize: 14,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendIcon: { color: colors.surface, fontSize: 16 },
  
});